import crypto from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { firebaseApp } from "./firebase.js";
import prisma from "./prisma.js";
import { logger } from "../logs/logs.js";

/**
 * Ensures the default Admin user exists in both Firebase Auth and PostgreSQL.
 * Configuration options can be set via environment variables:
 * - ADMIN_EMAIL (or ADMIN_USERNAME)
 * - ADMIN_PASSWORD
 * - ADMIN_NAME
 */
export async function bootstrapAdminUser(): Promise<void> {
    const rawUsername = process.env.ADMIN_EMAIL || process.env.ADMIN_USERNAME || "admin@syncfit.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin123456!";
    const adminName = process.env.ADMIN_NAME || "System Administrator";

    // Ensure valid email format
    const adminEmail = rawUsername.includes("@") ? rawUsername : `${rawUsername}@syncfit.com`;

    try {
        const auth = getAuth(firebaseApp);
        let firebaseUid: string;

        try {
            const existingFbUser = await auth.getUserByEmail(adminEmail);
            firebaseUid = existingFbUser.uid;

            // Update password / name in Firebase if defined in env
            if (process.env.ADMIN_PASSWORD) {
                await auth.updateUser(firebaseUid, {
                    password: adminPassword,
                    displayName: adminName,
                });
            }
        } catch (error: any) {
            if (error.code === "auth/user-not-found") {
                const newFbUser = await auth.createUser({
                    email: adminEmail,
                    password: adminPassword,
                    displayName: adminName,
                });
                firebaseUid = newFbUser.uid;
                logger.info(`Created default admin in Firebase Auth: ${adminEmail} (UID: ${firebaseUid})`);
            } else {
                throw error;
            }
        }

        // Check if user exists in PostgreSQL database
        const existingDbUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: adminEmail },
                    { firebaseUid },
                ],
            },
        });

        if (!existingDbUser) {
            const adminUser = await prisma.user.create({
                data: {
                    firebaseUid,
                    email: adminEmail,
                    name: adminName,
                    role: "ADMIN",
                    status: "ACTIVE",
                    memberTier: "VIP",
                },
            });
            logger.info(`Default admin user seeded in database: ${adminUser.id} (${adminEmail}) with role ADMIN`);
        } else {
            if (existingDbUser.role !== "ADMIN" || existingDbUser.status !== "ACTIVE" || existingDbUser.firebaseUid !== firebaseUid) {
                await prisma.user.update({
                    where: { id: existingDbUser.id },
                    data: {
                        firebaseUid,
                        role: "ADMIN",
                        status: "ACTIVE",
                    },
                });
                logger.info(`Updated existing user ${adminEmail} to role ADMIN`);
            }
        }
    } catch (error: any) {
        logger.error(`Failed to bootstrap default admin user: ${error.message}`, { error });
    }
}

/**
 * Ensures a default Gym facility with an active QR code exists in the database.
 */
export async function bootstrapDefaultGym(): Promise<void> {
    try {
        const existingGym = await prisma.gym.findFirst({
            where: { isActive: true },
        });

        if (!existingGym) {
            const defaultGym = await prisma.gym.create({
                data: {
                    name: "SyncFit Flagship Gym",
                    code: "SYNCLINK-MAIN",
                    address: "100 Fitness Boulevard",
                    city: "Metropolis",
                    maxCapacity: 150,
                    isActive: true,
                    qrCodeKey: `gym_qr_${crypto.randomUUID()}`,
                },
            });
            logger.info(`Bootstrapped default gym facility: ${defaultGym.name} (${defaultGym.code}) - QR Key: ${defaultGym.qrCodeKey}`);
        } else {
            logger.info(`Active gym facility: ${existingGym.name} (${existingGym.code}) - QR Key: ${existingGym.qrCodeKey}`);
        }
    } catch (error: any) {
        logger.error(`Failed to bootstrap default gym: ${error.message}`, { error });
    }
}
