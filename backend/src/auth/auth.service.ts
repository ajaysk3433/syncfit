import type { App } from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import type { Role, MemberTier, User } from "@prisma/client";
import { firebaseApp } from "../core/configs/firebase.js";
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
}

export interface SignUpResult {
    user: User;
    firebaseUid: string;
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
                const user = await this.authRepository.createUser({
                    firebaseUid: firebaseUser.uid,
                    email: userData.email,
                    ...(userData.name ? { name: userData.name } : {}),
                    ...(userData.phone ? { phone: userData.phone } : {}),
                    ...(userData.role ? { role: userData.role } : {}),
                    ...(userData.memberTier ? { memberTier: userData.memberTier } : {}),
                    ...(userData.avatarUrl ? { avatarUrl: userData.avatarUrl } : {}),
                });

                logger.info(
                    `User successfully registered and saved to DB: ${user.id} (${user.email})`
                );
                return {
                    user,
                    firebaseUid: firebaseUser.uid,
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