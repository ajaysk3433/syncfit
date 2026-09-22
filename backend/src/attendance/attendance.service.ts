import type { CheckInMethod, AttendanceStatus } from "@prisma/client";
import attendanceRepository, { AttendanceRepository } from "./attendance.repository.js";
import membersRepository, { MembersRepository } from "../members/members.repository.js";
import plansRepository, { PlansRepository } from "../membership-plans/plans.repository.js";
import prisma from "../core/configs/prisma.js";
import { withSpan } from "../core/telemetry/tracer.js";
import { logger } from "../core/logs/logs.js";
import {
    BadRequestError,
    ForbiddenError,
    NotFoundError,
} from "../core/error/errors.js";
import type {
    CheckInInput,
    CheckOutInput,
    AutoCheckoutInput,
    ListAttendanceQuery,
} from "./attendance.schema.js";

export class AttendanceService {
    constructor(
        private readonly attendanceRepository: AttendanceRepository,
        private readonly membersRepository: MembersRepository,
        private readonly plansRepository: PlansRepository
    ) {}

    async checkIn(input: CheckInInput, checkedInByStaffId?: string): Promise<any> {
        return withSpan("AttendanceService.checkIn", async () => {
            // Step 1: Resolve User
            let user: any = null;

            if (input.memberId) {
                user = await this.membersRepository.findMemberById(input.memberId);
            } else if (input.qrCodeKey) {
                const profile = await this.membersRepository.findByQrCodeKey(input.qrCodeKey);
                if (profile?.user) {
                    user = await this.membersRepository.findMemberById(profile.user.id);
                }
            } else if (input.barcode) {
                const profile = await this.membersRepository.findByBarcode(input.barcode);
                if (profile?.user) {
                    user = await this.membersRepository.findMemberById(profile.user.id);
                }
            } else if (input.email) {
                const found = await this.membersRepository.findByEmail(input.email);
                if (found) {
                    user = await this.membersRepository.findMemberById(found.id);
                }
            } else if (input.phone) {
                const found = await this.membersRepository.findByPhone(input.phone);
                if (found) {
                    user = await this.membersRepository.findMemberById(found.id);
                }
            }

            if (!user) {
                throw new NotFoundError("Member not found with provided identifier");
            }

            // Step 2: Account Status Validation
            if (user.status === "SUSPENDED" || user.status === "INACTIVE") {
                if (!input.overrideRestrictions) {
                    await this.attendanceRepository.createAttendance({
                        user: { connect: { id: user.id } },
                        status: "DENIED",
                        denialReason: `ACCOUNT_${user.status}`,
                        method: (input.method as CheckInMethod) || "MANUAL",
                        ...(input.location !== undefined ? { location: input.location } : {}),
                        ...(input.notes !== undefined ? { notes: input.notes } : {}),
                        ...(checkedInByStaffId !== undefined ? { checkedInBy: checkedInByStaffId } : {}),
                    });
                    logger.warn(`Check-in denied for member ${user.id}: Account status is ${user.status}`);
                    throw new ForbiddenError(`Check-in denied: Member account is ${user.status.toLowerCase()}`);
                }
            }

            // Step 3: Active Membership Validation
            const activeMembership = await this.plansRepository.findActiveMembershipByUserId(user.id);
            if (!activeMembership && !input.overrideRestrictions && user.role === "MEMBER") {
                await this.attendanceRepository.createAttendance({
                    user: { connect: { id: user.id } },
                    status: "DENIED",
                    denialReason: "NO_ACTIVE_MEMBERSHIP",
                    method: (input.method as CheckInMethod) || "MANUAL",
                    ...(input.location !== undefined ? { location: input.location } : {}),
                    ...(input.notes !== undefined ? { notes: input.notes } : {}),
                    ...(checkedInByStaffId !== undefined ? { checkedInBy: checkedInByStaffId } : {}),
                });
                logger.warn(`Check-in denied for member ${user.id}: No active or unexpired membership`);
                throw new ForbiddenError("Check-in denied: Member does not have an active membership plan");
            }

            // Step 4: Check if already checked in
            const existingActive = await this.attendanceRepository.findActiveAttendanceByUserId(user.id);
            if (existingActive) {
                logger.info(`Member ${user.id} already has an open check-in session from ${existingActive.checkInTime.toISOString()}`);
                return {
                    alreadyCheckedIn: true,
                    attendance: existingActive,
                    message: "Member is already checked in",
                };
            }

            // Step 5: Record Check-In
            const attendance = await this.attendanceRepository.createAttendance({
                user: { connect: { id: user.id } },
                status: "CHECKED_IN",
                checkInTime: new Date(),
                method: (input.method as CheckInMethod) || "MANUAL",
                ...(input.location !== undefined ? { location: input.location } : {}),
                ...(input.notes !== undefined ? { notes: input.notes } : {}),
                ...(checkedInByStaffId !== undefined ? { checkedInBy: checkedInByStaffId } : {}),
            });

            logger.info(`Member ${user.id} (${user.name}) successfully checked in at ${input.location || "Main Gym"}`);

            const remainingDays = activeMembership
                ? Math.max(0, Math.ceil((activeMembership.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                : null;

            return {
                attendanceId: attendance.id,
                checkInTime: attendance.checkInTime,
                status: attendance.status,
                location: attendance.location,
                method: attendance.method,
                member: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    avatarUrl: user.avatarUrl,
                    tier: user.memberTier,
                    status: user.status,
                },
                membership: activeMembership
                    ? {
                          id: activeMembership.id,
                          planName: activeMembership.plan.name,
                          tier: activeMembership.plan.tier,
                          endDate: activeMembership.endDate,
                          remainingDays,
                      }
                    : null,
            };
        });
    }

    async checkOut(input: CheckOutInput): Promise<any> {
        return withSpan("AttendanceService.checkOut", async () => {
            let activeAttendance: any = null;

            if (input.attendanceId) {
                activeAttendance = await this.attendanceRepository.findAttendanceById(input.attendanceId);
            } else if (input.memberId) {
                activeAttendance = await this.attendanceRepository.findActiveAttendanceByUserId(input.memberId);
            }

            if (!activeAttendance) {
                throw new NotFoundError("No active check-in session found to check out");
            }

            if (activeAttendance.checkOutTime !== null || activeAttendance.status !== "CHECKED_IN") {
                throw new BadRequestError("This attendance session has already been checked out");
            }

            const checkOutTime = new Date();
            const durationMinutes = Math.max(
                1,
                Math.round((checkOutTime.getTime() - activeAttendance.checkInTime.getTime()) / (1000 * 60))
            );

            const updated = await this.attendanceRepository.updateAttendance(activeAttendance.id, {
                status: "CHECKED_OUT",
                checkOutTime,
                durationMinutes,
                notes: input.notes
                    ? `${activeAttendance.notes || ""}\n[Check-out]: ${input.notes}`.trim()
                    : activeAttendance.notes,
            });

            logger.info(`Member ${updated.userId} checked out. Duration: ${durationMinutes} minutes`);

            return {
                attendanceId: updated.id,
                checkInTime: updated.checkInTime,
                checkOutTime: updated.checkOutTime,
                durationMinutes: updated.durationMinutes,
                status: updated.status,
                member: {
                    id: updated.userId,
                    name: (updated as any).user?.name,
                },
            };
        });
    }

    async autoCheckout(input: AutoCheckoutInput): Promise<{ autoCheckedOutCount: number }> {
        return withSpan("AttendanceService.autoCheckout", async () => {
            const maxDurationHours = input.maxDurationHours || 4;
            const thresholdDate = new Date(Date.now() - maxDurationHours * 60 * 60 * 1000);

            const staleAttendances = await this.attendanceRepository.findStaleActiveAttendances(thresholdDate);
            logger.info(`Found ${staleAttendances.length} stale check-ins older than ${maxDurationHours} hours`);

            let count = 0;
            for (const att of staleAttendances) {
                const checkOutTime = new Date(att.checkInTime.getTime() + maxDurationHours * 60 * 60 * 1000);
                await this.attendanceRepository.updateAttendance(att.id, {
                    status: "AUTO_CHECKED_OUT",
                    checkOutTime,
                    durationMinutes: maxDurationHours * 60,
                    notes: `${att.notes || ""}\n[Auto Check-out after ${maxDurationHours}h]`.trim(),
                });
                count++;
            }

            return { autoCheckedOutCount: count };
        });
    }

    async getOccupancy(maxCapacity: number = 150): Promise<any> {
        return withSpan("AttendanceService.getOccupancy", async () => {
            const currentCount = await this.attendanceRepository.countCurrentOccupancy();
            const occupants = await this.attendanceRepository.listActiveOccupants();

            const occupancyPercentage = Math.min(100, Math.round((currentCount / maxCapacity) * 100));
            const isNearCapacity = occupancyPercentage >= 80;
            const isAtCapacity = currentCount >= maxCapacity;

            const activeList = occupants.map((item) => {
                const elapsedMinutes = Math.round((Date.now() - item.checkInTime.getTime()) / (1000 * 60));
                return {
                    attendanceId: item.id,
                    userId: item.userId,
                    name: item.user?.name,
                    email: item.user?.email,
                    tier: item.user?.memberTier,
                    avatarUrl: item.user?.avatarUrl,
                    checkInTime: item.checkInTime,
                    elapsedMinutes,
                    location: item.location,
                    method: item.method,
                };
            });

            return {
                currentCount,
                maxCapacity,
                occupancyPercentage,
                isNearCapacity,
                isAtCapacity,
                activeOccupants: activeList,
            };
        });
    }

    async listAttendance(query: ListAttendanceQuery): Promise<any> {
        return withSpan("AttendanceService.listAttendance", async () => {
            const page = typeof query.page === "number" ? query.page : (Number(query.page) || 1);
            const limit = typeof query.limit === "number" ? query.limit : (Number(query.limit) || 20);
            const skip = (page - 1) * limit;

            const where: any = {};
            if (query.memberId) where.userId = query.memberId;
            if (query.status) where.status = query.status as AttendanceStatus;
            if (query.method) where.method = query.method as CheckInMethod;
            if (query.location) where.location = { contains: query.location, mode: "insensitive" };

            if (query.startDate || query.endDate) {
                where.checkInTime = {};
                if (query.startDate) where.checkInTime.gte = new Date(query.startDate);
                if (query.endDate) where.checkInTime.lte = new Date(query.endDate);
            }

            const [records, total] = await Promise.all([
                this.attendanceRepository.listAttendance(where, skip, limit),
                this.attendanceRepository.countAttendance(where),
            ]);

            return {
                attendanceLogs: records,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            };
        });
    }

    async getMemberAttendanceHistory(userId: string, page: number = 1, limit: number = 20, startDate?: string, endDate?: string): Promise<any> {
        return withSpan("AttendanceService.getMemberAttendanceHistory", async () => {
            const skip = (page - 1) * limit;
            const where: any = { userId };

            if (startDate || endDate) {
                where.checkInTime = {};
                if (startDate) where.checkInTime.gte = new Date(startDate);
                if (endDate) where.checkInTime.lte = new Date(endDate);
            }

            const [records, total] = await Promise.all([
                this.attendanceRepository.listAttendance(where, skip, limit),
                this.attendanceRepository.countAttendance(where),
            ]);

            // Summary stats for this member
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const visitsThisMonth = await prisma.attendance.count({
                where: {
                    userId,
                    checkInTime: { gte: startOfMonth },
                    status: { in: ["CHECKED_IN", "CHECKED_OUT", "AUTO_CHECKED_OUT"] },
                },
            });

            const completedVisits = await prisma.attendance.findMany({
                where: {
                    userId,
                    durationMinutes: { not: null },
                },
                select: { durationMinutes: true },
            });

            const totalMinutes = completedVisits.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
            const averageDurationMinutes = completedVisits.length > 0 ? Math.round(totalMinutes / completedVisits.length) : 0;

            return {
                summary: {
                    totalVisitsAllTime: total,
                    visitsThisMonth,
                    averageDurationMinutes,
                },
                attendanceLogs: records,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            };
        });
    }

    async getOverviewStats(): Promise<any> {
        return withSpan("AttendanceService.getOverviewStats", async () => {
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const [todayCount, weekCount, monthCount, currentOccupancy] = await Promise.all([
                prisma.attendance.count({
                    where: {
                        checkInTime: { gte: startOfToday },
                        status: { in: ["CHECKED_IN", "CHECKED_OUT", "AUTO_CHECKED_OUT"] },
                    },
                }),
                prisma.attendance.count({
                    where: {
                        checkInTime: { gte: startOfWeek },
                        status: { in: ["CHECKED_IN", "CHECKED_OUT", "AUTO_CHECKED_OUT"] },
                    },
                }),
                prisma.attendance.count({
                    where: {
                        checkInTime: { gte: startOfMonth },
                        status: { in: ["CHECKED_IN", "CHECKED_OUT", "AUTO_CHECKED_OUT"] },
                    },
                }),
                this.attendanceRepository.countCurrentOccupancy(),
            ]);

            // Unique visitors this month
            const uniqueMonthVisitors = await prisma.attendance.groupBy({
                by: ["userId"],
                where: {
                    checkInTime: { gte: startOfMonth },
                    status: { in: ["CHECKED_IN", "CHECKED_OUT", "AUTO_CHECKED_OUT"] },
                },
            });

            // Average visit duration for the month
            const monthRecords = await prisma.attendance.findMany({
                where: {
                    checkInTime: { gte: startOfMonth },
                    durationMinutes: { not: null },
                },
                select: { durationMinutes: true },
            });

            const totalDuration = monthRecords.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
            const avgDurationMinutes = monthRecords.length > 0 ? Math.round(totalDuration / monthRecords.length) : 0;

            return {
                currentOccupancy,
                visitsToday: todayCount,
                visitsThisWeek: weekCount,
                visitsThisMonth: monthCount,
                uniqueVisitorsThisMonth: uniqueMonthVisitors.length,
                averageDurationMinutes: avgDurationMinutes,
            };
        });
    }

    async getPeakHoursAnalytics(): Promise<any> {
        return withSpan("AttendanceService.getPeakHoursAnalytics", async () => {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const records = await this.attendanceRepository.getRawAttendanceRecordsForAnalytics(thirtyDaysAgo);

            // Matrix: 7 days (0-6) x 24 hours (0-23)
            const daysMap: Record<number, string> = {
                0: "Sunday",
                1: "Monday",
                2: "Tuesday",
                3: "Wednesday",
                4: "Thursday",
                5: "Friday",
                6: "Saturday",
            };

            const hourlyCount: Record<number, number> = {};
            for (let i = 0; i < 24; i++) hourlyCount[i] = 0;

            const dayOfWeekCount: Record<string, number> = {
                Sunday: 0,
                Monday: 0,
                Tuesday: 0,
                Wednesday: 0,
                Thursday: 0,
                Friday: 0,
                Saturday: 0,
            };

            const heatmap: { day: string; hour: number; count: number }[] = [];

            for (let d = 0; d < 7; d++) {
                for (let h = 0; h < 24; h++) {
                    heatmap.push({ day: daysMap[d]!, hour: h, count: 0 });
                }
            }

            for (const r of records) {
                const date = new Date(r.checkInTime);
                const hour = date.getHours();
                const day = daysMap[date.getDay()]!;

                hourlyCount[hour] = (hourlyCount[hour] || 0) + 1;
                dayOfWeekCount[day] = (dayOfWeekCount[day] || 0) + 1;

                const cell = heatmap.find((item) => item.day === day && item.hour === hour);
                if (cell) cell.count += 1;
            }

            // Sort peak hours
            const peakHoursRanked = Object.entries(hourlyCount)
                .map(([hour, count]) => ({
                    hour: parseInt(hour),
                    label: `${parseInt(hour).toString().padStart(2, "0")}:00 - ${(parseInt(hour) + 1).toString().padStart(2, "0")}:00`,
                    visits: count,
                }))
                .sort((a, b) => b.visits - a.visits);

            return {
                topPeakHours: peakHoursRanked.slice(0, 5),
                dayOfWeekDistribution: dayOfWeekCount,
                heatmap,
            };
        });
    }

    async getMemberFrequencyAnalytics(): Promise<any> {
        return withSpan("AttendanceService.getMemberFrequencyAnalytics", async () => {
            const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

            // Active members in the gym
            const activeUsers = await prisma.user.findMany({
                where: {
                    status: "ACTIVE",
                    role: "MEMBER",
                    memberships: {
                        some: {
                            status: "ACTIVE",
                            endDate: { gte: new Date() },
                        },
                    },
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    memberTier: true,
                    attendances: {
                        where: { checkInTime: { gte: thirtyDaysAgo } },
                        select: { checkInTime: true },
                        orderBy: { checkInTime: "desc" },
                    },
                },
            });

            const atRisk14Days: any[] = [];
            const atRisk30Days: any[] = [];
            const topActive: any[] = [];

            let lowFrequency = 0; // 1-4 visits/mo
            let mediumFrequency = 0; // 5-12 visits/mo
            let highFrequency = 0; // 13+ visits/mo

            for (const user of activeUsers) {
                const visits30 = user.attendances.length;
                const recentVisits14 = user.attendances.filter(
                    (a) => new Date(a.checkInTime) >= fourteenDaysAgo
                ).length;
                const lastVisit = user.attendances[0]?.checkInTime || null;

                if (visits30 === 0) {
                    atRisk30Days.push({
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        tier: user.memberTier,
                        lastVisit: null,
                        daysSinceLastVisit: "30+ days",
                    });
                } else if (recentVisits14 === 0) {
                    const daysSince = lastVisit
                        ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24))
                        : 30;
                    atRisk14Days.push({
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        tier: user.memberTier,
                        lastVisit,
                        daysSinceLastVisit: `${daysSince} days`,
                    });
                }

                if (visits30 >= 12) highFrequency++;
                else if (visits30 >= 5) mediumFrequency++;
                else if (visits30 >= 1) lowFrequency++;

                topActive.push({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    tier: user.memberTier,
                    visitsLast30Days: visits30,
                    lastVisit,
                });
            }

            topActive.sort((a, b) => b.visitsLast30Days - a.visitsLast30Days);

            return {
                totalActiveMembers: activeUsers.length,
                churnRisk: {
                    noVisitsIn14DaysCount: atRisk14Days.length,
                    noVisitsIn30DaysCount: atRisk30Days.length,
                    atRiskMembers14Days: atRisk14Days.slice(0, 15),
                    atRiskMembers30Days: atRisk30Days.slice(0, 15),
                },
                frequencyDistribution: {
                    inactiveOrZero: atRisk30Days.length,
                    lowFrequency_1_to_4_per_month: lowFrequency,
                    mediumFrequency_5_to_12_per_month: mediumFrequency,
                    highFrequency_13_plus_per_month: highFrequency,
                },
                topActiveMembers: topActive.slice(0, 10),
            };
        });
    }
}

export default new AttendanceService(attendanceRepository, membersRepository, plansRepository);
