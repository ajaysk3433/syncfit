import type { App } from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import crypto from "crypto";
import type { Role, MemberTier, UserStatus } from "@prisma/client";
import { firebaseApp } from "../core/configs/firebase.js";
import membersRepository, { MembersRepository } from "./members.repository.js";
import plansService, { PlansService } from "../membership-plans/plans.service.js";
import { withSpan } from "../core/telemetry/tracer.js";
import { logger } from "../core/logs/logs.js";
import {
    BadRequestError,
    ConflictError,
    NotFoundError,
} from "../core/error/errors.js";
import type {
    CreateMemberInput,
    UpdateMemberProfileInput,
    UpdateMemberStatusInput,
    ListMembersQuery,
} from "./members.schema.js";

export class MembersService {
    constructor(
        private readonly firebaseApp: App,
        private readonly membersRepository: MembersRepository,
        private readonly plansService: PlansService
    ) {}

    private generateReferralCode(): string {
        return `SF-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    }

    async createMember(input: CreateMemberInput): Promise<any> {
        return withSpan("MembersService.createMember", async () => {
            const rawEmail = input.email.trim().toLowerCase();

            // Resolve gym facility
            const prisma = (await import("../core/configs/prisma.js")).default;
            let gym: any = null;
            if (input.gymCode) {
                gym = await prisma.gym.findUnique({ where: { code: input.gymCode.toUpperCase() } });
            } else if (input.gymId) {
                gym = await prisma.gym.findUnique({ where: { id: input.gymId } });
            }
            if (!gym) {
                const gymService = (await import("../gym/gym.service.js")).default;
                gym = await gymService.getOrCreateDefaultGym();
            }

            const cleanGymCode = gym.code.toLowerCase().replace(/[^a-z0-9]/g, "");
            const scopedEmail = `${cleanGymCode}_${rawEmail}`;

            // Check if member already exists in THIS gym
            const existingMemberInGym = await prisma.user.findFirst({
                where: {
                    gymId: gym.id,
                    OR: [
                        { email: scopedEmail },
                        { email: rawEmail },
                        { rawEmail: rawEmail },
                    ],
                },
            });
            if (existingMemberInGym) {
                throw new ConflictError(`Member with email ${rawEmail} is already registered at ${gym.name} (${gym.code})`);
            }

            // Check referral code if provided
            let referredByUserId: string | undefined;
            if (input.referralCodeUsed) {
                const referrer = await this.membersRepository.findByReferralCode(input.referralCodeUsed);
                if (referrer) {
                    referredByUserId = referrer.userId;
                    logger.info(`Member referred by user ${referrer.userId}`);
                } else {
                    logger.warn(`Referral code ${input.referralCodeUsed} was not found`);
                }
            }

            const auth = getAuth(this.firebaseApp);

            // Step 1: Create user in Firebase Auth using scoped email
            let firebaseUser;
            try {
                firebaseUser = await auth.createUser({
                    email: scopedEmail,
                    password: input.password,
                    displayName: input.name,
                });
            } catch (fbError: any) {
                if (fbError.code === "auth/email-already-exists") {
                    throw new ConflictError(`Member account already exists in Firebase for ${gym.code}`);
                }
                throw new BadRequestError(fbError.message || "Failed to create user in Firebase Auth");
            }

            // Step 2: Store in Postgres with Profile and Gym linkage
            try {
                const referralCode = this.generateReferralCode();
                const user = await this.membersRepository.createUserWithProfile(
                    {
                        firebaseUid: firebaseUser.uid,
                        email: scopedEmail,
                        rawEmail: rawEmail,
                        name: input.name,
                        role: (input.role as Role) || "MEMBER",
                        status: "ACTIVE",
                        memberTier: (input.memberTier as MemberTier) || "STANDARD",
                        gym: { connect: { id: gym.id } },
                        ...(input.phone !== undefined ? { phone: input.phone } : {}),
                        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
                    },
                    {
                        ...(input.dateOfBirth ? { dateOfBirth: new Date(input.dateOfBirth) } : {}),
                        ...(input.gender !== undefined ? { gender: input.gender } : {}),
                        ...(input.address !== undefined ? { address: input.address } : {}),
                        ...(input.city !== undefined ? { city: input.city } : {}),
                        ...(input.emergencyContactName !== undefined ? { emergencyContactName: input.emergencyContactName } : {}),
                        ...(input.emergencyContactPhone !== undefined ? { emergencyContactPhone: input.emergencyContactPhone } : {}),
                        ...(input.emergencyContactRelation !== undefined ? { emergencyContactRelation: input.emergencyContactRelation } : {}),
                        ...(input.healthNotes !== undefined ? { healthNotes: input.healthNotes } : {}),
                        fitnessGoals: input.fitnessGoals || [],
                        ...(input.preferences !== undefined ? { preferences: input.preferences } : {}),
                        referralCode,
                        ...(input.barcode !== undefined ? { barcode: input.barcode } : {}),
                        ...(referredByUserId ? { referredBy: { connect: { id: referredByUserId } } } : {}),
                    }
                );

                logger.info(`Member created successfully in ${gym.name} (${gym.code}): ${user.id} (${rawEmail})`);

                // Step 3: Optional initial membership assignment
                let initialMembership = null;
                if (input.planId) {
                    try {
                        initialMembership = await this.plansService.assignMembership(user.id, {
                            planId: input.planId,
                            autoRenew: true,
                        });
                    } catch (planError: any) {
                        logger.error(`Failed to assign initial plan to member ${user.id}`, { error: planError });
                    }
                }

                return {
                    user,
                    firebaseUid: firebaseUser.uid,
                    membership: initialMembership,
                };
            } catch (dbError: any) {
                logger.error(`Database error during member creation. Rolling back Firebase user ${firebaseUser.uid}`, { error: dbError });
                try {
                    await auth.deleteUser(firebaseUser.uid);
                } catch (rollbackError) {
                    logger.error(`Rollback failed for Firebase user ${firebaseUser.uid}`, { error: rollbackError });
                }
                throw dbError;
            }
        });
    }

    async getMemberById(id: string): Promise<any> {
        return withSpan("MembersService.getMemberById", async () => {
            const member = await this.membersRepository.findMemberById(id);
            if (!member) {
                throw new NotFoundError("Member not found");
            }
            return member;
        });
    }

    async updateMemberProfile(id: string, input: UpdateMemberProfileInput): Promise<any> {
        return withSpan("MembersService.updateMemberProfile", async () => {
            const member = await this.membersRepository.findMemberById(id);
            if (!member) {
                throw new NotFoundError("Member not found");
            }

            // Update user top-level fields
            if (input.name !== undefined || input.phone !== undefined || input.avatarUrl !== undefined) {
                await this.membersRepository.updateUser(id, {
                    ...(input.name !== undefined ? { name: input.name } : {}),
                    ...(input.phone !== undefined ? { phone: input.phone } : {}),
                    ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
                });
            }

            // Update member profile fields
            const profileData: any = {};
            if (input.dateOfBirth !== undefined) profileData.dateOfBirth = new Date(input.dateOfBirth);
            if (input.gender !== undefined) profileData.gender = input.gender;
            if (input.address !== undefined) profileData.address = input.address;
            if (input.city !== undefined) profileData.city = input.city;
            if (input.emergencyContactName !== undefined) profileData.emergencyContactName = input.emergencyContactName;
            if (input.emergencyContactPhone !== undefined) profileData.emergencyContactPhone = input.emergencyContactPhone;
            if (input.emergencyContactRelation !== undefined) profileData.emergencyContactRelation = input.emergencyContactRelation;
            if (input.healthNotes !== undefined) profileData.healthNotes = input.healthNotes;
            if (input.fitnessGoals !== undefined) profileData.fitnessGoals = input.fitnessGoals;
            if (input.preferences !== undefined) profileData.preferences = input.preferences;
            if (input.barcode !== undefined) profileData.barcode = input.barcode;
            if (input.notes !== undefined) profileData.notes = input.notes;

            if (Object.keys(profileData).length > 0) {
                await this.membersRepository.updateProfile(id, profileData);
            }

            return await this.getMemberById(id);
        });
    }

    async updateMemberStatus(id: string, input: UpdateMemberStatusInput): Promise<any> {
        return withSpan("MembersService.updateMemberStatus", async () => {
            const member = await this.membersRepository.findMemberById(id);
            if (!member) {
                throw new NotFoundError("Member not found");
            }

            logger.info(`Updating member status for ${id} to ${input.status}`);

            await this.membersRepository.updateUser(id, {
                status: input.status as UserStatus,
            });

            if (input.notes) {
                await this.membersRepository.updateProfile(id, {
                    notes: member.profile?.notes ? `${member.profile.notes}\n[Status Change]: ${input.notes}` : `[Status Change]: ${input.notes}`,
                });
            }

            return await this.getMemberById(id);
        });
    }

    async getMemberAccessQr(userId: string): Promise<any> {
        return withSpan("MembersService.getMemberAccessQr", async () => {
            const member = await this.membersRepository.findMemberById(userId);
            if (!member || !member.profile) {
                throw new NotFoundError("Member profile not found");
            }

            return {
                memberId: member.id,
                name: member.name,
                tier: member.memberTier,
                status: member.status,
                qrCodeKey: member.profile.qrCodeKey,
                barcode: member.profile.barcode,
            };
        });
    }

    async regenerateMemberAccessQr(userId: string): Promise<any> {
        return withSpan("MembersService.regenerateMemberAccessQr", async () => {
            const member = await this.membersRepository.findMemberById(userId);
            if (!member || !member.profile) {
                throw new NotFoundError("Member profile not found");
            }

            const newQrKey = crypto.randomUUID();
            await this.membersRepository.regenerateQrCode(userId, newQrKey);

            logger.info(`Regenerated QR code key for member ${userId}`);

            return {
                memberId: member.id,
                qrCodeKey: newQrKey,
            };
        });
    }

    async listMembers(query: ListMembersQuery): Promise<any> {
        return withSpan("MembersService.listMembers", async () => {
            const page = typeof query.page === "number" ? query.page : (Number(query.page) || 1);
            const limit = typeof query.limit === "number" ? query.limit : (Number(query.limit) || 10);
            const skip = (page - 1) * limit;

            const where: any = {};

            if (query.role) where.role = query.role;
            if (query.status) where.status = query.status;
            if (query.tier) where.memberTier = query.tier;

            if (query.hasActiveMembership !== undefined) {
                const hasActive = query.hasActiveMembership === "true";
                if (hasActive) {
                    where.memberships = {
                        some: {
                            status: "ACTIVE",
                            endDate: { gte: new Date() },
                        },
                    };
                } else {
                    where.memberships = {
                        none: {
                            status: "ACTIVE",
                            endDate: { gte: new Date() },
                        },
                    };
                }
            }

            if (query.search) {
                where.OR = [
                    { name: { contains: query.search, mode: "insensitive" } },
                    { email: { contains: query.search, mode: "insensitive" } },
                    { phone: { contains: query.search, mode: "insensitive" } },
                    {
                        profile: {
                            OR: [
                                { referralCode: { contains: query.search, mode: "insensitive" } },
                                { barcode: { contains: query.search, mode: "insensitive" } },
                                { city: { contains: query.search, mode: "insensitive" } },
                            ],
                        },
                    },
                ];
            }

            const [members, total] = await Promise.all([
                this.membersRepository.listMembers(where, skip, limit),
                this.membersRepository.countMembers(where),
            ]);

            return {
                members,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            };
        });
    }
}

export default new MembersService(firebaseApp, membersRepository, plansService);
