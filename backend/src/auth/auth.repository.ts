import type { PrismaClient, User, Prisma } from "@prisma/client";
import prisma from "../core/configs/prisma.js";
import { withSpan } from "../core/telemetry/tracer.js";

export class AuthRepository {
    constructor(private readonly db: PrismaClient) {}

    async createUser(data: Prisma.UserCreateInput): Promise<User> {
        return withSpan("AuthRepository.createUser", async () => {
            return await this.db.user.create({
                data,
            });
        });
    }

    async findByEmail(email: string): Promise<User | null> {
        return withSpan("AuthRepository.findByEmail", async () => {
            return await this.db.user.findUnique({
                where: { email },
            });
        });
    }

    async findByFirebaseUid(firebaseUid: string): Promise<User | null> {
        return withSpan("AuthRepository.findByFirebaseUid", async () => {
            return await this.db.user.findUnique({
                where: { firebaseUid },
            });
        });
    }

    async findById(id: string): Promise<User | null> {
        return withSpan("AuthRepository.findById", async () => {
            return await this.db.user.findUnique({
                where: { id },
            });
        });
    }
}

export default new AuthRepository(prisma);
