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
}

export default new AuthController(authService);