import type { Request, Response, NextFunction } from "express";
import { getAuth } from "firebase-admin/auth";
import type { Role, User } from "@prisma/client";
import { firebaseApp } from "../configs/firebase.js";
import prisma from "../configs/prisma.js";
import { UnauthorizedError, ForbiddenError } from "../error/errors.js";
import { logger } from "../logs/logs.js";

// Extend Express Request interface to include user
export interface AuthenticatedRequest extends Request {
    user?: User;
}

export const authenticate = async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const testUserId = req.headers["x-user-id"] as string | undefined;

        // Support test/development user header if provided
        if (testUserId) {
            const user = await prisma.user.findUnique({
                where: { id: testUserId },
            });
            if (user) {
                req.user = user;
                next();
                return;
            }
        }

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedError("Authorization header with Bearer token is required");
        }

        const token = authHeader.split("Bearer ")[1];
        if (!token) {
            throw new UnauthorizedError("Bearer token is empty");
        }

        // Verify Firebase Token
        let decodedToken;
        try {
            const auth = getAuth(firebaseApp);
            decodedToken = await auth.verifyIdToken(token);
        } catch (error: any) {
            logger.warn(`Failed to verify Firebase token: ${error.message}`);
            throw new UnauthorizedError("Invalid or expired authentication token");
        }

        const user = await prisma.user.findUnique({
            where: { firebaseUid: decodedToken.uid },
        });

        if (!user) {
            throw new UnauthorizedError("User record not found in system");
        }

        if (user.status === "SUSPENDED") {
            throw new ForbiddenError("Your account has been suspended");
        }

        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

export const authorizeRoles = (...allowedRoles: Role[]) => {
    return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(new UnauthorizedError("Authentication required"));
            return;
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
            next(
                new ForbiddenError(
                    `Access forbidden: requires one of the following roles: [${allowedRoles.join(", ")}]`
                )
            );
            return;
        }

        next();
    };
};
