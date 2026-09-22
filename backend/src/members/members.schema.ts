import { z } from "zod";

export const createMemberSchema = z.object({
    body: z.object({
        email: z.string().trim().email("Invalid email address format"),
        password: z.string().min(6, "Password must be at least 6 characters long"),
        name: z.string().trim().min(1, "Name is required"),
        phone: z.string().trim().optional(),
        role: z.enum(["ADMIN", "MANAGER", "FRONT_DESK", "TRAINER", "MAINTENANCE", "MEMBER"]).default("MEMBER"),
        memberTier: z.enum(["STANDARD", "PREMIUM", "VIP"]).default("STANDARD"),
        avatarUrl: z.string().url("Invalid avatar URL format").optional().or(z.literal("")),
        dateOfBirth: z.string().optional(),
        gender: z.string().trim().optional(),
        address: z.string().trim().optional(),
        city: z.string().trim().optional(),
        emergencyContactName: z.string().trim().optional(),
        emergencyContactPhone: z.string().trim().optional(),
        emergencyContactRelation: z.string().trim().optional(),
        healthNotes: z.string().trim().optional(),
        fitnessGoals: z.array(z.string()).default([]),
        preferences: z.string().trim().optional(),
        referralCodeUsed: z.string().trim().optional(),
        barcode: z.string().trim().optional(),
        planId: z.string().uuid("Invalid plan ID format").optional(),
    }),
});

export const updateMemberProfileSchema = z.object({
    params: z.object({
        id: z.string().uuid("Invalid member ID format"),
    }),
    body: z.object({
        name: z.string().trim().min(1).optional(),
        phone: z.string().trim().optional(),
        avatarUrl: z.string().url("Invalid avatar URL format").optional().or(z.literal("")),
        dateOfBirth: z.string().optional(),
        gender: z.string().trim().optional(),
        address: z.string().trim().optional(),
        city: z.string().trim().optional(),
        emergencyContactName: z.string().trim().optional(),
        emergencyContactPhone: z.string().trim().optional(),
        emergencyContactRelation: z.string().trim().optional(),
        healthNotes: z.string().trim().optional(),
        fitnessGoals: z.array(z.string()).optional(),
        preferences: z.string().trim().optional(),
        barcode: z.string().trim().optional(),
        notes: z.string().trim().optional(),
    }),
});

export const updateMemberStatusSchema = z.object({
    params: z.object({
        id: z.string().uuid("Invalid member ID format"),
    }),
    body: z.object({
        status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"]),
        notes: z.string().trim().optional(),
    }),
});

export const getMemberByIdSchema = z.object({
    params: z.object({
        id: z.string().uuid("Invalid member ID format"),
    }),
});

export const listMembersSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).default(1),
        limit: z.string().regex(/^\d+$/).transform(Number).default(10),
        search: z.string().trim().optional(),
        tier: z.enum(["STANDARD", "PREMIUM", "VIP"]).optional(),
        status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"]).optional(),
        role: z.enum(["ADMIN", "MANAGER", "FRONT_DESK", "TRAINER", "MAINTENANCE", "MEMBER"]).optional(),
        hasActiveMembership: z.enum(["true", "false"]).optional(),
    }),
});

export type CreateMemberInput = z.input<typeof createMemberSchema>["body"];
export type UpdateMemberProfileInput = z.input<typeof updateMemberProfileSchema>["body"];
export type UpdateMemberStatusInput = z.input<typeof updateMemberStatusSchema>["body"];
export type ListMembersQuery = z.input<typeof listMembersSchema>["query"];
