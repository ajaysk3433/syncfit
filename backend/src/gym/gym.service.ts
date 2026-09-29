import crypto from "node:crypto";
import gymRepository, { GymRepository } from "./gym.repository.js";
import { withSpan } from "../core/telemetry/tracer.js";
import { logger } from "../core/logs/logs.js";
import { NotFoundError, ConflictError, ForbiddenError } from "../core/error/errors.js";
import type { CreateGymInput, UpdateGymInput } from "./gym.schema.js";

export class GymService {
    constructor(private readonly gymRepository: GymRepository) {}

    async getOrCreateDefaultGym(): Promise<any> {
        let gym = await this.gymRepository.findFirstActive();
        if (!gym) {
            gym = await this.gymRepository.create({
                name: "SyncFit Flagship Gym",
                code: "SYNCLINK-MAIN",
                address: "100 Fitness Boulevard",
                city: "Metropolis",
                maxCapacity: 150,
                isActive: true,
                qrCodeKey: `gym_qr_${crypto.randomUUID()}`,
            });
            logger.info(`Bootstrapped initial default Gym: ${gym.name} (${gym.code})`);
        }
        return gym;
    }

    async getGymQr(gymId?: string, code?: string): Promise<any> {
        return withSpan("GymService.getGymQr", async () => {
            let gym = null;
            if (gymId) {
                gym = await this.gymRepository.findById(gymId);
            } else if (code) {
                gym = await this.gymRepository.findByCode(code.toUpperCase());
            } else {
                gym = await this.getOrCreateDefaultGym();
            }

            if (!gym) {
                throw new NotFoundError("Gym facility not found");
            }

            if (!gym.isActive) {
                throw new ForbiddenError("This gym facility is currently inactive");
            }

            // Standardized QR payload readable by mobile app cameras
            const qrPayload = JSON.stringify({
                type: "SYNCLINK_GYM_ACCESS",
                gymId: gym.id,
                qrCodeKey: gym.qrCodeKey,
                name: gym.name,
                code: gym.code,
            });

            return {
                gymId: gym.id,
                name: gym.name,
                code: gym.code,
                address: gym.address,
                city: gym.city,
                qrCodeKey: gym.qrCodeKey,
                qrPayload,
                displayLocation: gym.city ? `${gym.name} (${gym.city})` : gym.name,
                maxCapacity: gym.maxCapacity,
                updatedAt: gym.updatedAt,
            };
        });
    }

    async getGymByCode(code: string): Promise<any> {
        return withSpan("GymService.getGymByCode", async () => {
            return await this.gymRepository.findByCode(code.toUpperCase());
        });
    }

    async regenerateGymQr(gymId?: string): Promise<any> {
        return withSpan("GymService.regenerateGymQr", async () => {
            let targetGym = null;
            if (gymId) {
                targetGym = await this.gymRepository.findById(gymId);
            } else {
                targetGym = await this.getOrCreateDefaultGym();
            }

            if (!targetGym) {
                throw new NotFoundError("Gym facility not found to regenerate QR code");
            }

            const newQrCodeKey = `gym_qr_${crypto.randomUUID()}`;
            const updatedGym = await this.gymRepository.regenerateQrCode(targetGym.id, newQrCodeKey);

            logger.info(`Regenerated QR code key for Gym ${updatedGym.id} (${updatedGym.name})`);

            const qrPayload = JSON.stringify({
                type: "SYNCLINK_GYM_ACCESS",
                gymId: updatedGym.id,
                qrCodeKey: updatedGym.qrCodeKey,
                name: updatedGym.name,
                code: updatedGym.code,
            });

            return {
                gymId: updatedGym.id,
                name: updatedGym.name,
                code: updatedGym.code,
                qrCodeKey: updatedGym.qrCodeKey,
                qrPayload,
                message: "Gym QR code regenerated successfully",
                updatedAt: updatedGym.updatedAt,
            };
        });
    }

    async validateGymQr(qrCodeInput: string): Promise<any> {
        return withSpan("GymService.validateGymQr", async () => {
            let extractedKey = qrCodeInput.trim();

            // Support parsing JSON string from mobile QR scanner if passed directly
            if (extractedKey.startsWith("{") && extractedKey.endsWith("}")) {
                try {
                    const parsed = JSON.parse(extractedKey);
                    if (parsed.qrCodeKey) {
                        extractedKey = parsed.qrCodeKey;
                    }
                } catch {
                    // keep raw input
                }
            }

            const gym = await this.gymRepository.findByQrCodeKey(extractedKey);
            if (!gym) {
                throw new NotFoundError("Invalid Gym QR code. No active gym facility matches this QR token.");
            }

            if (!gym.isActive) {
                throw new ForbiddenError(`Gym facility "${gym.name}" is currently inactive or temporarily closed.`);
            }

            return gym;
        });
    }

    async createGym(input: CreateGymInput): Promise<any> {
        return withSpan("GymService.createGym", async () => {
            const existingCode = await this.gymRepository.findByCode(input.code);
            if (existingCode) {
                throw new ConflictError(`Gym with code ${input.code} already exists`);
            }

            const qrCodeKey = `gym_qr_${crypto.randomUUID()}`;
            const gym = await this.gymRepository.create({
                name: input.name,
                code: input.code,
                ...(input.address !== undefined ? { address: input.address } : {}),
                ...(input.city !== undefined ? { city: input.city } : {}),
                ...(input.phone !== undefined ? { phone: input.phone } : {}),
                maxCapacity: input.maxCapacity ?? 150,
                qrCodeKey,
                isActive: true,
            });

            logger.info(`Created new Gym facility: ${gym.id} (${gym.name})`);
            return gym;
        });
    }

    async updateGym(id: string, input: UpdateGymInput): Promise<any> {
        return withSpan("GymService.updateGym", async () => {
            const existing = await this.gymRepository.findById(id);
            if (!existing) {
                throw new NotFoundError("Gym facility not found");
            }

            if (input.code && input.code !== existing.code) {
                const codeConflict = await this.gymRepository.findByCode(input.code);
                if (codeConflict) {
                    throw new ConflictError(`Gym with code ${input.code} already exists`);
                }
            }

            const updateData: any = {};
            if (input.name !== undefined) updateData.name = input.name;
            if (input.code !== undefined) updateData.code = input.code;
            if (input.address !== undefined) updateData.address = input.address;
            if (input.city !== undefined) updateData.city = input.city;
            if (input.phone !== undefined) updateData.phone = input.phone;
            if (input.maxCapacity !== undefined) updateData.maxCapacity = input.maxCapacity;
            if (input.isActive !== undefined) updateData.isActive = input.isActive;

            return await this.gymRepository.update(id, updateData);
        });
    }

    async getGymById(id: string): Promise<any> {
        return withSpan("GymService.getGymById", async () => {
            const gym = await this.gymRepository.findById(id);
            if (!gym) {
                throw new NotFoundError("Gym facility not found");
            }
            return gym;
        });
    }

    async listGyms(): Promise<any[]> {
        return withSpan("GymService.listGyms", async () => {
            return await this.gymRepository.listAll();
        });
    }
}

export default new GymService(gymRepository);
