import type { Request, Response, NextFunction } from "express";
import attendanceService, { AttendanceService } from "./attendance.service.js";
import { withSpan } from "../core/telemetry/tracer.js";
import type { AuthenticatedRequest } from "../core/middlewares/auth.middleware.js";

class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) {}

    checkIn = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const staffId = req.user?.id;
            const result = await withSpan("AttendanceController.checkIn", async () => {
                return await this.attendanceService.checkIn(req.body, staffId);
            });
            return res.status(200).json({
                success: true,
                message: result.message || "Check-in successful",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    checkOut = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await withSpan("AttendanceController.checkOut", async () => {
                return await this.attendanceService.checkOut(req.body);
            });
            return res.status(200).json({
                success: true,
                message: "Check-out successful",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    autoCheckout = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await withSpan("AttendanceController.autoCheckout", async () => {
                return await this.attendanceService.autoCheckout(req.body);
            });
            return res.status(200).json({
                success: true,
                message: `Successfully processed auto check-out for ${result.autoCheckedOutCount} sessions`,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    getOccupancy = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const maxCap = req.query.maxCapacity ? parseInt(req.query.maxCapacity as string) : 150;
            const result = await withSpan("AttendanceController.getOccupancy", async () => {
                return await this.attendanceService.getOccupancy(maxCap);
            });
            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    listAttendance = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await withSpan("AttendanceController.listAttendance", async () => {
                return await this.attendanceService.listAttendance(req.query as any);
            });
            return res.status(200).json({
                success: true,
                data: result.attendanceLogs,
                pagination: result.pagination,
            });
        } catch (error) {
            next(error);
        }
    };

    getMemberAttendanceHistory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.params.id as string;
            const page = req.query.page ? parseInt(req.query.page as string) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
            const startDate = req.query.startDate as string | undefined;
            const endDate = req.query.endDate as string | undefined;

            const result = await withSpan("AttendanceController.getMemberAttendanceHistory", async () => {
                return await this.attendanceService.getMemberAttendanceHistory(userId, page, limit, startDate, endDate);
            });

            return res.status(200).json({
                success: true,
                summary: result.summary,
                data: result.attendanceLogs,
                pagination: result.pagination,
            });
        } catch (error) {
            next(error);
        }
    };

    getOverviewStats = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await withSpan("AttendanceController.getOverviewStats", async () => {
                return await this.attendanceService.getOverviewStats();
            });
            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    getPeakHoursAnalytics = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await withSpan("AttendanceController.getPeakHoursAnalytics", async () => {
                return await this.attendanceService.getPeakHoursAnalytics();
            });
            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    getMemberFrequencyAnalytics = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await withSpan("AttendanceController.getMemberFrequencyAnalytics", async () => {
                return await this.attendanceService.getMemberFrequencyAnalytics();
            });
            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    createVisitorPass = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await withSpan("AttendanceController.createVisitorPass", async () => {
                return await this.attendanceService.createVisitorPass(req.body);
            });
            return res.status(201).json({
                success: true,
                message: "Visitor pass issued successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    listVisitorPasses = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await withSpan("AttendanceController.listVisitorPasses", async () => {
                return await this.attendanceService.listVisitorPasses(req.query as any);
            });
            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    checkInVisitorPass = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await withSpan("AttendanceController.checkInVisitorPass", async () => {
                return await this.attendanceService.checkInVisitorPass(req.body);
            });
            return res.status(200).json({
                success: true,
                message: result.message,
                data: result.visitorPass,
            });
        } catch (error) {
            next(error);
        }
    };
}

export default new AttendanceController(attendanceService);
