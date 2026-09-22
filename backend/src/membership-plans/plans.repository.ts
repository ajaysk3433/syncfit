import type { PrismaClient, MembershipPlan, Membership, Prisma } from "@prisma/client";
import prisma from "../core/configs/prisma.js";
import { withSpan } from "../core/telemetry/tracer.js";

export class PlansRepository {
    constructor(private readonly db: PrismaClient) {}

    async createPlan(data: Prisma.MembershipPlanCreateInput): Promise<MembershipPlan> {
        return withSpan("PlansRepository.createPlan", async () => {
            return await this.db.membershipPlan.create({
                data,
            });
        });
    }

    async findPlanById(id: string): Promise<MembershipPlan | null> {
        return withSpan("PlansRepository.findPlanById", async () => {
            return await this.db.membershipPlan.findUnique({
                where: { id },
            });
        });
    }

    async findAllPlans(where?: Prisma.MembershipPlanWhereInput): Promise<MembershipPlan[]> {
        return withSpan("PlansRepository.findAllPlans", async () => {
            return await this.db.membershipPlan.findMany({
                ...(where !== undefined ? { where } : {}),
                orderBy: { price: "asc" },
            });
        });
    }

    async updatePlan(id: string, data: Prisma.MembershipPlanUpdateInput): Promise<MembershipPlan> {
        return withSpan("PlansRepository.updatePlan", async () => {
            return await this.db.membershipPlan.update({
                where: { id },
                data,
            });
        });
    }

    async createMembership(data: Prisma.MembershipCreateInput): Promise<Membership> {
        return withSpan("PlansRepository.createMembership", async () => {
            return await this.db.membership.create({
                data,
                include: { plan: true },
            });
        });
    }

    async findActiveMembershipByUserId(userId: string): Promise<(Membership & { plan: MembershipPlan }) | null> {
        return withSpan("PlansRepository.findActiveMembershipByUserId", async () => {
            return await this.db.membership.findFirst({
                where: {
                    userId,
                    status: "ACTIVE",
                    endDate: { gte: new Date() },
                },
                include: { plan: true },
                orderBy: { endDate: "desc" },
            });
        });
    }

    async findLatestMembershipByUserId(userId: string): Promise<(Membership & { plan: MembershipPlan }) | null> {
        return withSpan("PlansRepository.findLatestMembershipByUserId", async () => {
            return await this.db.membership.findFirst({
                where: { userId },
                include: { plan: true },
                orderBy: { createdAt: "desc" },
            });
        });
    }

    async findMembershipsByUserId(userId: string): Promise<(Membership & { plan: MembershipPlan })[]> {
        return withSpan("PlansRepository.findMembershipsByUserId", async () => {
            return await this.db.membership.findMany({
                where: { userId },
                include: { plan: true },
                orderBy: { createdAt: "desc" },
            });
        });
    }

    async updateMembership(id: string, data: Prisma.MembershipUpdateInput): Promise<Membership> {
        return withSpan("PlansRepository.updateMembership", async () => {
            return await this.db.membership.update({
                where: { id },
                data,
                include: { plan: true },
            });
        });
    }

    async expireOldMemberships(): Promise<number> {
        return withSpan("PlansRepository.expireOldMemberships", async () => {
            const result = await this.db.membership.updateMany({
                where: {
                    status: "ACTIVE",
                    endDate: { lt: new Date() },
                },
                data: {
                    status: "EXPIRED",
                },
            });
            return result.count;
        });
    }
}

export default new PlansRepository(prisma);
