import type { PrismaClient, Gym, Prisma } from "@prisma/client";
import prisma from "../core/configs/prisma.js";
import { withSpan } from "../core/telemetry/tracer.js";

export class GymRepository {
    constructor(private readonly db: PrismaClient) {}

    async create(data: Prisma.GymCreateInput): Promise<Gym> {
        return withSpan("GymRepository.create", async () => {
            return await this.db.gym.create({ data });
        });
    }

    async findById(id: string): Promise<Gym | null> {
        return withSpan("GymRepository.findById", async () => {
            return await this.db.gym.findUnique({ where: { id } });
        });
    }

    async findByCode(code: string): Promise<Gym | null> {
        return withSpan("GymRepository.findByCode", async () => {
            return await this.db.gym.findUnique({ where: { code } });
        });
    }

    async findByQrCodeKey(qrCodeKey: string): Promise<Gym | null> {
        return withSpan("GymRepository.findByQrCodeKey", async () => {
            return await this.db.gym.findUnique({ where: { qrCodeKey } });
        });
    }

    async findFirstActive(): Promise<Gym | null> {
        return withSpan("GymRepository.findFirstActive", async () => {
            return await this.db.gym.findFirst({
                where: { isActive: true },
                orderBy: { createdAt: "asc" },
            });
        });
    }

    async listAll(): Promise<Gym[]> {
        return withSpan("GymRepository.listAll", async () => {
            return await this.db.gym.findMany({
                orderBy: { createdAt: "asc" },
            });
        });
    }

    async update(id: string, data: Prisma.GymUpdateInput): Promise<Gym> {
        return withSpan("GymRepository.update", async () => {
            return await this.db.gym.update({
                where: { id },
                data,
            });
        });
    }

    async regenerateQrCode(id: string, newQrCodeKey: string): Promise<Gym> {
        return withSpan("GymRepository.regenerateQrCode", async () => {
            return await this.db.gym.update({
                where: { id },
                data: { qrCodeKey: newQrCodeKey },
            });
        });
    }

    async count(): Promise<number> {
        return withSpan("GymRepository.count", async () => {
            return await this.db.gym.count();
        });
    }
}

export default new GymRepository(prisma);
