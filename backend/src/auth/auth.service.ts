import type { App } from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import crypto from "node:crypto";
import type { Role, MemberTier, User } from "@prisma/client";
import { firebaseApp } from "../core/configs/firebase.js";
import prisma from "../core/configs/prisma.js";
import authRepository, { AuthRepository } from "./auth.repository.js";
import { withSpan } from "../core/telemetry/tracer.js";
import { logger } from "../core/logs/logs.js";
import {
    BadRequestError,
    ConflictError,
} from "../core/error/errors.js";

export interface SignUpInput {
    email: string;
    password: string;
    name?: string;
    phone?: string;
    role?: Role;
    memberTier?: MemberTier;
    avatarUrl?: string;
    gymName?: string;
    gymAddress?: string;
    gymCity?: string;
}

export interface SignUpResult {
    user: User;
    firebaseUid: string;
    gym?: any;
}

export class AuthService {
    constructor(
        private readonly firebaseApp: App,
        private readonly authRepository: AuthRepository
    ) { }

    signUp = async (userData: SignUpInput): Promise<SignUpResult> => {
        return withSpan("AuthService.signUp", async () => {

            // Check if user already exists in DB
            const existingUser = await this.authRepository.findByEmail(
                userData.email
            );
            if (existingUser) {
                throw new ConflictError("User with this email already exists");
            }

            const auth = getAuth(this.firebaseApp);

            // Step 1: Create user in Firebase Auth
            let firebaseUser;
            try {
                firebaseUser = await auth.createUser({
                    email: userData.email,
                    password: userData.password,
                    ...(userData.name ? { displayName: userData.name } : {}),
                });
            } catch (fbError: any) {
                if (fbError.code === "auth/email-already-exists") {
                    throw new ConflictError("Email already in use in Firebase Auth");
                }
                throw new BadRequestError(
                    fbError.message || "Failed to create user in Firebase Auth"
                );
            }

            // Step 2: Store user in Postgres via Prisma
            try {
                const effectiveRole = userData.role || (userData.gymName ? "ADMIN" : "MEMBER");

                const user = await this.authRepository.createUser({
                    firebaseUid: firebaseUser.uid,
                    email: userData.email,
                    rawEmail: userData.email,
                    ...(userData.name ? { name: userData.name } : {}),
                    ...(userData.phone ? { phone: userData.phone } : {}),
                    role: effectiveRole,
                    ...(userData.memberTier ? { memberTier: userData.memberTier } : {}),
                    ...(userData.avatarUrl ? { avatarUrl: userData.avatarUrl } : {}),
                });

                logger.info(
                    `User successfully registered and saved to DB: ${user.id} (${user.email})`
                );

                // Step 3: If registering as Gym Owner / ADMIN or gymName specified, create Gym facility with unique alphanumeric Gym ID
                let createdGym = null;
                if (effectiveRole === "ADMIN" || effectiveRole === "MANAGER" || userData.gymName) {
                    const rawName = userData.gymName || (userData.name ? `${userData.name}'s Gym` : "SyncFit Club");
                    const prefix = rawName.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase() || "GYM";
                    const randomSuffix = crypto.randomBytes(2).toString("hex").toUpperCase();
                    const gymCode = `${prefix}-${randomSuffix}`;
                    const qrCodeKey = `gym_qr_${crypto.randomUUID()}`;

                    createdGym = await prisma.gym.create({
                        data: {
                            name: rawName,
                            code: gymCode,
                            address: userData.gymAddress || null,
                            city: userData.gymCity || null,
                            qrCodeKey,
                            isActive: true,
                            maxCapacity: 150,
                        },
                    });

                    // Associate user with provisioned gym
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { gymId: createdGym.id },
                    });

                    logger.info(`Provisioned new gym facility ${createdGym.name} with Alphanumeric Gym ID: ${createdGym.code}`);
                }

                return {
                    user: {
                        ...user,
                        gymId: createdGym ? createdGym.id : null,
                        gym: createdGym,
                    },
                    firebaseUid: firebaseUser.uid,
                    ...(createdGym ? { gym: createdGym } : {}),
                };
            } catch (dbError: any) {
                logger.error(
                    `Failed to persist user in database. Rolling back Firebase user ${firebaseUser.uid}`,
                    { error: dbError }
                );
                // Rollback Firebase user creation to keep data in sync
                try {
                    await auth.deleteUser(firebaseUser.uid);
                } catch (rollbackError) {
                    logger.error(
                        `Rollback failed for Firebase user ${firebaseUser.uid}`,
                        { error: rollbackError }
                    );
                }
                throw dbError;
            }
        });
    };
}

export default new AuthService(firebaseApp, authRepository);