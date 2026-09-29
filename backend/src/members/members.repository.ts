import type { PrismaClient, User, MemberProfile, MemberDocument, Prisma } from "@prisma/client";
import prisma from "../core/configs/prisma.js";
import { withSpan } from "../core/telemetry/tracer.js";

export class MembersRepository {
    constructor(private readonly db: PrismaClient) {}

    async createUserWithProfile(
        userData: Prisma.UserCreateInput,
        profileData: Omit<Prisma.MemberProfileCreateInput, "user">
    ): Promise<User & { profile: MemberProfile | null }> {
        return withSpan("MembersRepository.createUserWithProfile", async () => {
            return await this.db.$transaction(async (tx) => {
                const user = await tx.user.create({
                    data: userData,
                });

                const profile = await tx.memberProfile.create({
                    data: {
                        ...profileData,
                        user: { connect: { id: user.id } },
                    },
                });

                return {
                    ...user,
                    profile,
                };
            });
        });
    }

    async findMemberById(id: string): Promise<any | null> {
        return withSpan("MembersRepository.findMemberById", async () => {
            return await this.db.user.findUnique({
                where: { id },
                include: {
                    profile: {
                        include: {
                            referredBy: { select: { id: true, name: true, email: true } },
                            primaryMember: {
                                include: {
                                    user: { select: { id: true, name: true, email: true } },
                                },
                            },
                            dependents: {
                                include: {
                                    user: { select: { id: true, name: true, email: true, phone: true } },
                                },
                            },
                        },
                    },
                    memberships: {
                        include: { plan: true },
                        orderBy: { createdAt: "desc" },
                    },
                    documents: {
                        orderBy: { createdAt: "desc" },
                    },
                    referralsGiven: {
                        include: {
                            user: { select: { id: true, name: true, email: true, createdAt: true } },
                        },
                    },
                    _count: {
                        select: {
                            attendances: true,
                            documents: true,
                        },
                    },
                },
            });
        });
    }

    async findByEmail(email: string): Promise<User | null> {
        return withSpan("MembersRepository.findByEmail", async () => {
            return await this.db.user.findFirst({
                where: {
                    OR: [
                        { email },
                        { rawEmail: email },
                    ],
                },
                include: { profile: true },
            });
        });
    }

    async findByPhone(phone: string): Promise<User | null> {
        return withSpan("MembersRepository.findByPhone", async () => {
            return await this.db.user.findFirst({
                where: { phone },
                include: { profile: true },
            });
        });
    }

    async findByReferralCode(referralCode: string): Promise<(MemberProfile & { user: User }) | null> {
        return withSpan("MembersRepository.findByReferralCode", async () => {
            return await this.db.memberProfile.findUnique({
                where: { referralCode },
                include: { user: true },
            });
        });
    }

    async findByQrCodeKey(qrCodeKey: string): Promise<(MemberProfile & { user: User }) | null> {
        return withSpan("MembersRepository.findByQrCodeKey", async () => {
            return await this.db.memberProfile.findUnique({
                where: { qrCodeKey },
                include: { user: true },
            });
        });
    }

    async findByBarcode(barcode: string): Promise<(MemberProfile & { user: User }) | null> {
        return withSpan("MembersRepository.findByBarcode", async () => {
            return await this.db.memberProfile.findUnique({
                where: { barcode },
                include: { user: true },
            });
        });
    }

    async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
        return withSpan("MembersRepository.updateUser", async () => {
            return await this.db.user.update({
                where: { id },
                data,
            });
        });
    }

    async updateProfile(userId: string, data: Prisma.MemberProfileUpdateInput): Promise<MemberProfile> {
        return withSpan("MembersRepository.updateProfile", async () => {
            return await this.db.memberProfile.update({
                where: { userId },
                data,
            });
        });
    }

    async listMembers(where: Prisma.UserWhereInput, skip: number, take: number): Promise<any[]> {
        return withSpan("MembersRepository.listMembers", async () => {
            return await this.db.user.findMany({
                where,
                skip,
                take,
                include: {
                    profile: true,
                    memberships: {
                        where: { status: "ACTIVE" },
                        include: { plan: true },
                        take: 1,
                        orderBy: { endDate: "desc" },
                    },
                    _count: {
                        select: { attendances: true },
                    },
                },
                orderBy: { createdAt: "desc" },
            });
        });
    }

    async countMembers(where: Prisma.UserWhereInput): Promise<number> {
        return withSpan("MembersRepository.countMembers", async () => {
            return await this.db.user.count({ where });
        });
    }

    async createDocument(data: Prisma.MemberDocumentCreateInput): Promise<MemberDocument> {
        return withSpan("MembersRepository.createDocument", async () => {
            return await this.db.memberDocument.create({
                data,
            });
        });
    }

    async findDocumentsByUserId(userId: string): Promise<MemberDocument[]> {
        return withSpan("MembersRepository.findDocumentsByUserId", async () => {
            return await this.db.memberDocument.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
            });
        });
    }

    async findDocumentById(id: string): Promise<MemberDocument | null> {
        return withSpan("MembersRepository.findDocumentById", async () => {
            return await this.db.memberDocument.findUnique({
                where: { id },
            });
        });
    }

    async updateDocument(id: string, data: Prisma.MemberDocumentUpdateInput): Promise<MemberDocument> {
        return withSpan("MembersRepository.updateDocument", async () => {
            return await this.db.memberDocument.update({
                where: { id },
                data,
            });
        });
    }

    async regenerateQrCode(userId: string, newQrCodeKey: string): Promise<MemberProfile> {
        return withSpan("MembersRepository.regenerateQrCode", async () => {
            return await this.db.memberProfile.update({
                where: { userId },
                data: { qrCodeKey: newQrCodeKey },
            });
        });
    }

    async deleteUser(id: string): Promise<User> {
        return withSpan("MembersRepository.deleteUser", async () => {
            return await this.db.user.delete({
                where: { id },
            });
        });
    }
}

export default new MembersRepository(prisma);
