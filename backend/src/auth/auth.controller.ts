import type { Request, Response, NextFunction } from "express";
import authService, { AuthService } from "./auth.service.js";
import { withSpan } from "../core/telemetry/tracer.js";
import type { Span } from "@opentelemetry/api";
import { logger } from "../core/logs/logs.js";
class AuthController {
    private readonly authService: AuthService;

    constructor(authService: AuthService) {
        this.authService = authService;
    }

    signUp = async (req: Request, res: Response, next: NextFunction) => {
        try {


            const result = await withSpan(
                "signUp controller",
                async (_span: Span) => {
                    logger.info(`creating new user ${req.body.email}`);
                    return await this.authService.signUp(req.body);
                }
            );

            return res.status(201).json({
                success: true,
                message: "User registered successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    getMe = async (req: any, res: Response, next: NextFunction) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "User not authenticated",
                });
            }

            const user = req.user;
            const activeAttendance = await (await import("../attendance/attendance.repository.js")).default.findActiveAttendanceByUserId(user.id);
            const activeMembership = await (await import("../membership-plans/plans.repository.js")).default.findActiveMembershipByUserId(user.id);

            // Resolve gym facility details
            let gym: any = null;
            const prisma = (await import("../core/configs/prisma.js")).default;
            if (user.gymId) {
                gym = await prisma.gym.findUnique({ where: { id: user.gymId } });
            }
            if (!gym && activeAttendance?.gym) {
                gym = activeAttendance.gym;
            }
            if (!gym) {
                const gymService = (await import("../gym/gym.service.js")).default;
                gym = await gymService.getOrCreateDefaultGym();
            }

            return res.status(200).json({
                success: true,
                data: {
                    user: {
                        ...user,
                        gymId: gym ? gym.id : user.gymId,
                        gymCode: gym ? gym.code : null,
                    },
                    gym,
                    activeAttendance,
                    activeMembership,
                },
            });
        } catch (error) {
            next(error);
        }
    };
}

export default new AuthController(authService);