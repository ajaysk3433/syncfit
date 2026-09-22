import type { Request, Response } from "express";
import authService, { AuthService } from "./auth.service.js";
import { withSpan } from "../core/telemetry/tracer.js";
import type { Span } from "@opentelemetry/api";
import { logger } from "../core/logs/logs.js";

class AuthController {
    private readonly authService: AuthService;

    constructor(authService: AuthService) {
        this.authService = authService;
    }

    signUp = async (req: Request, res: Response) => {
        const result = await withSpan(
            "signUp controller",
            async (span: Span) => {
                logger.info(`creating new user ${req.body.email} `  )
                return await this.authService.signUp(req.body);
            }
        );

        return res.json(result);
    };
}

export default new AuthController(authService);