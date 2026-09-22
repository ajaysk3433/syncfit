import type { MembershipPlan, Membership, MemberTier } from "@prisma/client";
import plansRepository, { PlansRepository } from "./plans.repository.js";
import prisma from "../core/configs/prisma.js";
import { withSpan } from "../core/telemetry/tracer.js";
import { logger } from "../core/logs/logs.js";
import {
    BadRequestError,
    NotFoundError,
} from "../core/error/errors.js";
import type {
    CreatePlanInput,
    UpdatePlanInput,
    AssignMembershipInput,
} from "./plans.schema.js";

export class PlansService {
    constructor(private readonly plansRepository: PlansRepository) {}

    async createPlan(input: CreatePlanInput): Promise<MembershipPlan> {
        return withSpan("PlansService.createPlan", async () => {
            logger.info(`Creating membership plan: ${input.name} (${input.tier})`);
            return await this.plansRepository.createPlan({
                name: input.name,
                tier: (input.tier as MemberTier) || "STANDARD",
                ...(input.description !== undefined ? { description: input.description } : {}),
                price: input.price,
                durationDays: input.durationDays,
                features: input.features || [],
                isActive: input.isActive ?? true,
            });
        });
    }

    async listPlans(filters?: { tier?: MemberTier; isActive?: boolean; search?: string }): Promise<MembershipPlan[]> {
        return withSpan("PlansService.listPlans", async () => {
            const where: any = {};
            if (filters?.tier) where.tier = filters.tier;
            if (filters?.isActive !== undefined) where.isActive = filters.isActive;
            if (filters?.search) {
                where.name = { contains: filters.search, mode: "insensitive" };
            }
            return await this.plansRepository.findAllPlans(Object.keys(where).length > 0 ? where : undefined);
        });
    }

    async getPlanById(id: string): Promise<MembershipPlan> {
        return withSpan("PlansService.getPlanById", async () => {
            const plan = await this.plansRepository.findPlanById(id);
            if (!plan) {
                throw new NotFoundError("Membership plan not found");
            }
            return plan;
        });
    }

    async updatePlan(id: string, input: UpdatePlanInput): Promise<MembershipPlan> {
        return withSpan("PlansService.updatePlan", async () => {
            await this.getPlanById(id);
            return await this.plansRepository.updatePlan(id, {
                ...(input.name !== undefined ? { name: input.name } : {}),
                ...(input.tier !== undefined ? { tier: input.tier as MemberTier } : {}),
                ...(input.description !== undefined ? { description: input.description } : {}),
                ...(input.price !== undefined ? { price: input.price } : {}),
                ...(input.durationDays !== undefined ? { durationDays: input.durationDays } : {}),
                ...(input.features !== undefined ? { features: input.features } : {}),
                ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
            });
        });
    }

    async assignMembership(userId: string, input: AssignMembershipInput): Promise<Membership> {
        return withSpan("PlansService.assignMembership", async () => {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
                throw new NotFoundError("Member user not found");
            }

            const plan = await this.plansRepository.findPlanById(input.planId);
            if (!plan) {
                throw new NotFoundError("Membership plan not found");
            }
            if (!plan.isActive) {
                throw new BadRequestError("Cannot assign an inactive membership plan");
            }

            const startDate = input.startDate ? new Date(input.startDate) : new Date();
            const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

            // Update user's member tier in User record
            await prisma.user.update({
                where: { id: userId },
                data: { memberTier: plan.tier },
            });

            logger.info(`Assigned plan '${plan.name}' to member ${userId}, valid until ${endDate.toISOString()}`);

            return await this.plansRepository.createMembership({
                user: { connect: { id: userId } },
                plan: { connect: { id: plan.id } },
                startDate,
                endDate,
                status: "ACTIVE",
                autoRenew: input.autoRenew ?? true,
                ...(input.notes !== undefined ? { notes: input.notes } : {}),
            });
        });
    }

    async pauseMembership(userId: string, notes?: string): Promise<Membership> {
        return withSpan("PlansService.pauseMembership", async () => {
            const activeMembership = await this.plansRepository.findActiveMembershipByUserId(userId);
            if (!activeMembership) {
                throw new BadRequestError("No active membership found to pause");
            }

            logger.info(`Pausing membership ${activeMembership.id} for user ${userId}`);

            return await this.plansRepository.updateMembership(activeMembership.id, {
                status: "PAUSED",
                pausedAt: new Date(),
                notes: notes ? `${activeMembership.notes || ""}\n[Paused]: ${notes}`.trim() : activeMembership.notes,
            });
        });
    }

    async resumeMembership(userId: string, notes?: string): Promise<Membership> {
        return withSpan("PlansService.resumeMembership", async () => {
            const pausedMembership = await prisma.membership.findFirst({
                where: { userId, status: "PAUSED" },
                include: { plan: true },
                orderBy: { updatedAt: "desc" },
            });

            if (!pausedMembership) {
                throw new BadRequestError("No paused membership found to resume");
            }

            // Extend end date by the duration it was paused
            const pausedAt = pausedMembership.pausedAt || pausedMembership.updatedAt;
            const pauseDurationMs = Math.max(0, Date.now() - pausedAt.getTime());
            const extendedEndDate = new Date(pausedMembership.endDate.getTime() + pauseDurationMs);

            logger.info(`Resuming membership ${pausedMembership.id} for user ${userId}. Extended endDate to ${extendedEndDate.toISOString()}`);

            return await this.plansRepository.updateMembership(pausedMembership.id, {
                status: "ACTIVE",
                resumedAt: new Date(),
                endDate: extendedEndDate,
                notes: notes ? `${pausedMembership.notes || ""}\n[Resumed]: ${notes}`.trim() : pausedMembership.notes,
            });
        });
    }

    async cancelMembership(userId: string, reason: string, notes?: string): Promise<Membership> {
        return withSpan("PlansService.cancelMembership", async () => {
            const membership = await prisma.membership.findFirst({
                where: {
                    userId,
                    status: { in: ["ACTIVE", "PAUSED"] },
                },
                include: { plan: true },
                orderBy: { createdAt: "desc" },
            });

            if (!membership) {
                throw new BadRequestError("No active or paused membership found to cancel");
            }

            logger.info(`Cancelling membership ${membership.id} for user ${userId}. Reason: ${reason}`);

            return await this.plansRepository.updateMembership(membership.id, {
                status: "CANCELLED",
                cancelledAt: new Date(),
                cancellationReason: reason,
                autoRenew: false,
                notes: notes ? `${membership.notes || ""}\n[Cancelled]: ${notes}`.trim() : membership.notes,
            });
        });
    }

    async renewMembership(userId: string, planId?: string, autoRenew?: boolean, notes?: string): Promise<Membership> {
        return withSpan("PlansService.renewMembership", async () => {
            const latestMembership = await this.plansRepository.findLatestMembershipByUserId(userId);
            const targetPlanId = planId || latestMembership?.planId;

            if (!targetPlanId) {
                throw new BadRequestError("No previous membership or planId provided for renewal");
            }

            const plan = await this.plansRepository.findPlanById(targetPlanId);
            if (!plan || !plan.isActive) {
                throw new NotFoundError("Membership plan not found or inactive");
            }

            // If active and end date in the future, start from end date; otherwise start today
            const now = new Date();
            const currentActive = await this.plansRepository.findActiveMembershipByUserId(userId);
            const startDate = (currentActive && currentActive.endDate > now) ? currentActive.endDate : now;
            const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

            // Update user tier
            await prisma.user.update({
                where: { id: userId },
                data: { memberTier: plan.tier },
            });

            logger.info(`Renewed membership for user ${userId} with plan ${plan.name} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

            return await this.plansRepository.createMembership({
                user: { connect: { id: userId } },
                plan: { connect: { id: plan.id } },
                startDate,
                endDate,
                status: "ACTIVE",
                autoRenew: autoRenew ?? true,
                ...(notes ? { notes: `[Renewed]: ${notes}` } : {}),
            });
        });
    }

    async upgradeMembership(userId: string, newPlanId: string, notes?: string): Promise<Membership> {
        return withSpan("PlansService.upgradeMembership", async () => {
            const newPlan = await this.plansRepository.findPlanById(newPlanId);
            if (!newPlan || !newPlan.isActive) {
                throw new NotFoundError("Target membership plan not found or inactive");
            }

            const currentActive = await this.plansRepository.findActiveMembershipByUserId(userId);
            if (currentActive) {
                // Cancel existing membership
                await this.plansRepository.updateMembership(currentActive.id, {
                    status: "CANCELLED",
                    cancellationReason: `Upgraded to ${newPlan.name}`,
                    cancelledAt: new Date(),
                });
            }

            const startDate = new Date();
            const endDate = new Date(startDate.getTime() + newPlan.durationDays * 24 * 60 * 60 * 1000);

            await prisma.user.update({
                where: { id: userId },
                data: { memberTier: newPlan.tier },
            });

            logger.info(`Upgraded user ${userId} to plan ${newPlan.name} (${newPlan.tier})`);

            return await this.plansRepository.createMembership({
                user: { connect: { id: userId } },
                plan: { connect: { id: newPlan.id } },
                startDate,
                endDate,
                status: "ACTIVE",
                autoRenew: true,
                ...(notes ? { notes: `[Upgraded to ${newPlan.name}]: ${notes}` } : {}),
            });
        });
    }

    async getMemberMemberships(userId: string): Promise<Membership[]> {
        return withSpan("PlansService.getMemberMemberships", async () => {
            return await this.plansRepository.findMembershipsByUserId(userId);
        });
    }
}

export default new PlansService(plansRepository);
