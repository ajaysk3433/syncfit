import type { CheckInMethod, AttendanceStatus } from "@prisma/client";
import attendanceRepository, { AttendanceRepository } from "./attendance.repository.js";
import membersRepository, { MembersRepository } from "../members/members.repository.js";
import plansRepository, { PlansRepository } from "../membership-plans/plans.repository.js";
import gymService, { GymService } from "../gym/gym.service.js";
import prisma from "../core/configs/prisma.js";
import { withSpan } from "../core/telemetry/tracer.js";
import { logger } from "../core/logs/logs.js";
import {
    BadRequestError,
    ForbiddenError,
    NotFoundError,
} from "../core/error/errors.js";
import type {
    MemberScanInput,
    CheckInInput,
    CheckOutInput,
    AutoCheckoutInput,
    ListAttendanceQuery,
} from "./attendance.schema.js";

export class AttendanceService {
    constructor(
        private readonly attendanceRepository: AttendanceRepository,
        private readonly membersRepository: MembersRepository,
        private readonly plansRepository: PlansRepository,
        private readonly gymService: GymService
    ) {}

    /**
     * Primary endpoint for Member Phone App scanning the Gym QR Code
     * Performs automated check-in or check-out based on current member presence.
     */
    async scanMemberQr(input: MemberScanInput, authenticatedUserId?: string): Promise<any> {
        return withSpan("AttendanceService.scanMemberQr", async () => {
            const memberId = input.memberId || authenticatedUserId;
            if (!memberId) {
                throw new BadRequestError("Member identification required. Please authenticate in your phone app or provide memberId.");
            }

            const user = await this.membersRepository.findMemberById(memberId);
            if (!user) {
                throw new NotFoundError("Member not found in system");
            }

            // Step 1: Validate Gym QR code scanned by the member
            const gymQrToken = input.gymQrCode || input.qrCodeKey;
            if (!gymQrToken) {
                throw new BadRequestError("Gym QR code token is required");
            }

            const gym = await this.gymService.validateGymQr(gymQrToken);

            // Step 2: Account Status Validation
            if (user.status === "SUSPENDED" || user.status === "INACTIVE") {
                await this.attendanceRepository.createAttendance({
                    user: { connect: { id: user.id } },
                    gym: { connect: { id: gym.id } },
                    status: "DENIED",
                    denialReason: `ACCOUNT_${user.status}`,
                    method: "QR_CODE",
                    location: gym.name,
                    ...(input.notes ? { notes: input.notes } : {}),
                });
                logger.warn(`QR scan denied for member ${user.id}: Account status is ${user.status}`);
                throw new ForbiddenError(`Access denied: Member account is ${user.status.toLowerCase()}`);
            }

            // Step 3: Membership Plan Validation
            let activeMembership = await this.plansRepository.findActiveMembershipByUserId(user.id);
            if (!activeMembership && user.role === "MEMBER") {
                if (user.status === "ACTIVE") {
                    let plans = await this.plansRepository.findAllPlans({ isActive: true });
                    let defaultPlan = plans[0];
                    if (!defaultPlan) {
                        defaultPlan = await this.plansRepository.createPlan({
                            name: "All-Access Standard Pass",
                            tier: "STANDARD",
                            price: 49.99,
                            durationDays: 365,
                            features: ["Gym floor", "Cardio zone", "Locker room", "Free weights"],
                            isActive: true,
                        });
                    }
                    const now = new Date();
                    const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
                    activeMembership = (await this.plansRepository.createMembership({
                        user: { connect: { id: user.id } },
                        plan: { connect: { id: defaultPlan.id } },
                        startDate: now,
                        endDate: oneYearLater,
                        status: "ACTIVE",
                        autoRenew: true,
                        notes: "Auto-provisioned facility access pass on QR scan",
                    })) as any;
                } else {
                    await this.attendanceRepository.createAttendance({
                        user: { connect: { id: user.id } },
                        gym: { connect: { id: gym.id } },
                        status: "DENIED",
                        denialReason: "NO_ACTIVE_MEMBERSHIP",
                        method: "QR_CODE",
                        location: gym.name,
                        ...(input.notes ? { notes: input.notes } : {}),
                    });
                    logger.warn(`QR scan denied for member ${user.id}: No active membership plan`);
                    throw new ForbiddenError("Access denied: You do not have an active membership plan to access the facility");
                }
            }

            // Step 4: Check if already checked in to decide Check-In vs Check-Out
            const existingActive = await this.attendanceRepository.findActiveAttendanceByUserId(user.id);
            const requestedAction = input.action || "AUTO";

            // If action is CHECK_OUT, or AUTO when already checked in -> Member is CHECKING OUT
            if (requestedAction === "CHECK_OUT" || (requestedAction === "AUTO" && existingActive)) {
                if (!existingActive) {
                    throw new BadRequestError("No active check-in session found to check out");
                }

                const checkOutTime = new Date();
                const durationMinutes = Math.max(
                    1,
                    Math.round((checkOutTime.getTime() - existingActive.checkInTime.getTime()) / (1000 * 60))
                );

                const updated = await this.attendanceRepository.updateAttendance(existingActive.id, {
                    status: "CHECKED_OUT",
                    checkOutTime,
                    durationMinutes,
                    notes: input.notes
                        ? `${existingActive.notes || ""}\n[Member Phone App Check-Out]: ${input.notes}`.trim()
                        : existingActive.notes,
                });

                logger.info(`Member ${user.id} (${user.name}) scanned Gym QR and checked OUT from ${gym.name}. Duration: ${durationMinutes} mins`);

                return {
                    action: "CHECKED_OUT",
                    message: `Check-out successful! Thank you for working out at ${gym.name}.`,
                    attendanceId: updated.id,
                    checkInTime: updated.checkInTime,
                    checkOutTime: updated.checkOutTime,
                    durationMinutes,
                    status: updated.status,
                    method: "QR_CODE",
                    gym: {
                        id: gym.id,
                        name: gym.name,
                        code: gym.code,
                        location: gym.city ? `${gym.name} (${gym.city})` : gym.name,
                    },
                    member: {
                        id: user.id,
                        name: user.name,
                        tier: user.memberTier,
                    },
                };
            }

            // If requestedAction is explicitly CHECK_IN and member is already checked in
            if (requestedAction === "CHECK_IN" && existingActive) {
                logger.info(`Member ${user.id} scanned Gym QR but is already checked in`);
                return {
                    action: "ALREADY_CHECKED_IN",
                    alreadyCheckedIn: true,
                    message: `Member is already checked in at ${existingActive.location || gym.name}`,
                    attendance: existingActive,
                    gym: {
                        id: gym.id,
                        name: gym.name,
                        code: gym.code,
                    },
                };
            }

            // Otherwise -> Member is CHECKING IN
            const attendance = await this.attendanceRepository.createAttendance({
                user: { connect: { id: user.id } },
                gym: { connect: { id: gym.id } },
                status: "CHECKED_IN",
                checkInTime: new Date(),
                method: "QR_CODE",
                location: gym.name,
                ...(input.notes ? { notes: `[Member Phone App Check-In]: ${input.notes}` } : {}),
            });

            logger.info(`Member ${user.id} (${user.name}) scanned Gym QR and checked IN at ${gym.name}`);

            const remainingDays = activeMembership
                ? Math.max(0, Math.ceil((activeMembership.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                : null;

            return {
                action: "CHECKED_IN",
                message: `Check-in successful! Welcome to ${gym.name}.`,
                attendanceId: attendance.id,
                checkInTime: attendance.checkInTime,
                status: attendance.status,
                method: attendance.method,
                gym: {
                    id: gym.id,
                    name: gym.name,
                    code: gym.code,
                    location: gym.city ? `${gym.name} (${gym.city})` : gym.name,
                },
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

    async checkIn(input: CheckInInput, checkedInByStaffId?: string, authenticatedUserId?: string): Promise<any> {
        return withSpan("AttendanceService.checkIn", async () => {
            // Step 1: Resolve User & Gym
            let user: any = null;
            let gym: any = null;

            const effectiveMemberId = input.memberId || authenticatedUserId;

            // Check if gymQrCode or qrCodeKey corresponds to Gym
            const qrKey = input.gymQrCode || input.qrCodeKey;
            if (qrKey) {
                try {
                    gym = await this.gymService.validateGymQr(qrKey);
                } catch {
                    // Not a gym QR; could be legacy member QR code
                    if (!effectiveMemberId && input.qrCodeKey) {
                        const profile = await this.membersRepository.findByQrCodeKey(input.qrCodeKey);
                        if (profile?.user) {
                            user = await this.membersRepository.findMemberById(profile.user.id);
                        }
                    }
                }
            }

            if (!gym && input.gymId) {
                gym = await this.gymService.getGymById(input.gymId);
            }

            if (effectiveMemberId && !user) {
                user = await this.membersRepository.findMemberById(effectiveMemberId);
            } else if (input.barcode && !user) {
                const profile = await this.membersRepository.findByBarcode(input.barcode);
                if (profile?.user) {
                    user = await this.membersRepository.findMemberById(profile.user.id);
                }
            } else if (input.email && !user) {
                const found = await this.membersRepository.findByEmail(input.email);
                if (found) {
                    user = await this.membersRepository.findMemberById(found.id);
                }
            } else if (input.phone && !user) {
                const found = await this.membersRepository.findByPhone(input.phone);
                if (found) {
                    user = await this.membersRepository.findMemberById(found.id);
                }
            }

            if (!user) {
                throw new NotFoundError("Member not found with provided identifier");
            }

            const checkInMethod: CheckInMethod = gym ? "QR_CODE" : ((input.method as CheckInMethod) || "MANUAL");
            const checkInLocation: string = gym ? gym.name : (input.location || "Main Gym");

            // Step 2: Account Status Validation
            if (user.status === "SUSPENDED" || user.status === "INACTIVE") {
                if (!input.overrideRestrictions) {
                    await this.attendanceRepository.createAttendance({
                        user: { connect: { id: user.id } },
                        ...(gym ? { gym: { connect: { id: gym.id } } } : {}),
                        status: "DENIED",
                        denialReason: `ACCOUNT_${user.status}`,
                        method: checkInMethod,
                        location: checkInLocation,
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
                    ...(gym ? { gym: { connect: { id: gym.id } } } : {}),
                    status: "DENIED",
                    denialReason: "NO_ACTIVE_MEMBERSHIP",
                    method: checkInMethod,
                    location: checkInLocation,
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
                ...(gym ? { gym: { connect: { id: gym.id } } } : {}),
                status: "CHECKED_IN",
                checkInTime: new Date(),
                method: checkInMethod,
                location: checkInLocation,
                ...(input.notes !== undefined ? { notes: input.notes } : {}),
                ...(checkedInByStaffId !== undefined ? { checkedInBy: checkedInByStaffId } : {}),
            });

            logger.info(`Member ${user.id} (${user.name}) successfully checked in at ${checkInLocation}`);

            const remainingDays = activeMembership
                ? Math.max(0, Math.ceil((activeMembership.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                : null;

            return {
                attendanceId: attendance.id,
                checkInTime: attendance.checkInTime,
                status: attendance.status,
                location: attendance.location,
                gym: gym ? { id: gym.id, name: gym.name, code: gym.code } : null,
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

    async checkOut(input: CheckOutInput, authenticatedUserId?: string): Promise<any> {
        return withSpan("AttendanceService.checkOut", async () => {
            let activeAttendance: any = null;

            const effectiveMemberId = input.memberId || authenticatedUserId;

            if (input.attendanceId) {
                activeAttendance = await this.attendanceRepository.findAttendanceById(input.attendanceId);
            } else if (effectiveMemberId) {
                activeAttendance = await this.attendanceRepository.findActiveAttendanceByUserId(effectiveMemberId);
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
                gym: updated.gym ? { id: updated.gym.id, name: updated.gym.name } : null,
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

export default new AttendanceService(attendanceRepository, membersRepository, plansRepository, gymService);
