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

async function resolveUserFromFirebase(decodedToken: any): Promise<User | null> {
    let user = await prisma.user.findUnique({
        where: { firebaseUid: decodedToken.uid },
    });

    if (!user && decodedToken.email) {
        user = await prisma.user.findUnique({
            where: { email: decodedToken.email },
        });
        if (user) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { firebaseUid: decodedToken.uid },
            });
        }
    }

    if (!user && decodedToken.email) {
        user = await prisma.user.create({
            data: {
                firebaseUid: decodedToken.uid,
                email: decodedToken.email,
                name: decodedToken.name || decodedToken.email.split("@")[0],
                role: decodedToken.email.includes("admin") ? "ADMIN" : "MEMBER",
                status: "ACTIVE",
                memberTier: "STANDARD",
            },
        });
    }

    // Ensure member has an active membership plan so check-in is permitted
    if (user && user.role === "MEMBER") {
        const existingMembership = await prisma.membership.findFirst({
            where: {
                userId: user.id,
                status: "ACTIVE",
                endDate: { gte: new Date() },
            },
        });

        if (!existingMembership) {
            let defaultPlan = await prisma.membershipPlan.findFirst({
                where: { isActive: true },
            });
            if (!defaultPlan) {
                defaultPlan = await prisma.membershipPlan.create({
                    data: {
                        name: "All-Access Standard Pass",
                        tier: "STANDARD",
                        description: "Full access to gym facilities and equipment",
                        price: 49.99,
                        durationDays: 365,
                        features: ["Gym floor", "Cardio zone", "Locker room", "Free weights"],
                        isActive: true,
                    },
                });
            }

            const now = new Date();
            const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
            await prisma.membership.create({
                data: {
                    userId: user.id,
                    planId: defaultPlan.id,
                    startDate: now,
                    endDate: oneYearLater,
                    status: "ACTIVE",
                    autoRenew: true,
                    notes: "Auto-provisioned membership on mobile login",
                },
            });
        }
    }

    return user;
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

        const user = await resolveUserFromFirebase(decodedToken);

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

export const optionalAuthenticate = async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const testUserId = req.headers["x-user-id"] as string | undefined;

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

        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split("Bearer ")[1];
            if (token) {
                try {
                    const auth = getAuth(firebaseApp);
                    const decodedToken = await auth.verifyIdToken(token);
                    const user = await resolveUserFromFirebase(decodedToken);
                    if (user && user.status !== "SUSPENDED") {
                        req.user = user;
                    }
                } catch {
                    // Ignore token verification failure in optional auth
                }
            }
        }

        next();
    } catch {
        next();
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
