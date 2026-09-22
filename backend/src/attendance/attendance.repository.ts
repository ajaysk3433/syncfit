import type { PrismaClient, Attendance, Prisma } from "@prisma/client";
import prisma from "../core/configs/prisma.js";
import { withSpan } from "../core/telemetry/tracer.js";

export class AttendanceRepository {
    constructor(private readonly db: PrismaClient) {}

    async createAttendance(data: Prisma.AttendanceCreateInput): Promise<Attendance> {
        return withSpan("AttendanceRepository.createAttendance", async () => {
            return await this.db.attendance.create({
                data,
                include: {
                    user: {
                        include: { profile: true },
                    },
                },
            });
        });
    }

    async findAttendanceById(id: string): Promise<any | null> {
        return withSpan("AttendanceRepository.findAttendanceById", async () => {
            return await this.db.attendance.findUnique({
                where: { id },
                include: {
                    user: {
                        include: { profile: true },
                    },
                },
            });
        });
    }

    async findActiveAttendanceByUserId(userId: string): Promise<Attendance | null> {
        return withSpan("AttendanceRepository.findActiveAttendanceByUserId", async () => {
            return await this.db.attendance.findFirst({
                where: {
                    userId,
                    status: "CHECKED_IN",
                    checkOutTime: null,
                },
                orderBy: { checkInTime: "desc" },
            });
        });
    }

    async updateAttendance(id: string, data: Prisma.AttendanceUpdateInput): Promise<Attendance> {
        return withSpan("AttendanceRepository.updateAttendance", async () => {
            return await this.db.attendance.update({
                where: { id },
                data,
                include: {
                    user: {
                        include: { profile: true },
                    },
                },
            });
        });
    }

    async listAttendance(where: Prisma.AttendanceWhereInput, skip: number, take: number): Promise<any[]> {
        return withSpan("AttendanceRepository.listAttendance", async () => {
            return await this.db.attendance.findMany({
                where,
                skip,
                take,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            memberTier: true,
                            status: true,
                            avatarUrl: true,
                        },
                    },
                },
                orderBy: { checkInTime: "desc" },
            });
        });
    }

    async countAttendance(where: Prisma.AttendanceWhereInput): Promise<number> {
        return withSpan("AttendanceRepository.countAttendance", async () => {
            return await this.db.attendance.count({ where });
        });
    }

    async countCurrentOccupancy(): Promise<number> {
        return withSpan("AttendanceRepository.countCurrentOccupancy", async () => {
            // Count active check-ins within last 24 hours
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return await this.db.attendance.count({
                where: {
                    status: "CHECKED_IN",
                    checkOutTime: null,
                    checkInTime: { gte: dayAgo },
                },
            });
        });
    }

    async listActiveOccupants(): Promise<any[]> {
        return withSpan("AttendanceRepository.listActiveOccupants", async () => {
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return await this.db.attendance.findMany({
                where: {
                    status: "CHECKED_IN",
                    checkOutTime: null,
                    checkInTime: { gte: dayAgo },
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            memberTier: true,
                            avatarUrl: true,
                            profile: {
                                select: { qrCodeKey: true, barcode: true },
                            },
                        },
                    },
                },
                orderBy: { checkInTime: "desc" },
            });
        });
    }

    async findStaleActiveAttendances(thresholdDate: Date): Promise<Attendance[]> {
        return withSpan("AttendanceRepository.findStaleActiveAttendances", async () => {
            return await this.db.attendance.findMany({
                where: {
                    status: "CHECKED_IN",
                    checkOutTime: null,
                    checkInTime: { lte: thresholdDate },
                },
            });
        });
    }

    async getRawAttendanceRecordsForAnalytics(sinceDate: Date): Promise<Attendance[]> {
        return withSpan("AttendanceRepository.getRawAttendanceRecordsForAnalytics", async () => {
            return await this.db.attendance.findMany({
                where: {
                    checkInTime: { gte: sinceDate },
                    status: { in: ["CHECKED_IN", "CHECKED_OUT", "AUTO_CHECKED_OUT"] },
                },
                select: {
                    id: true,
                    userId: true,
                    checkInTime: true,
                    checkOutTime: true,
                    durationMinutes: true,
                    status: true,
                    method: true,
                    location: true,
                    createdAt: true,
                    updatedAt: true,
                    denialReason: true,
                    notes: true,
                    checkedInBy: true,
                },
            });
        });
    }
}

export default new AttendanceRepository(prisma);
