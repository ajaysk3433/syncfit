import { z } from "zod";

export const createPlanSchema = z.object({
    body: z.object({
        name: z.string().trim().min(1, "Plan name is required"),
        tier: z.enum(["STANDARD", "PREMIUM", "VIP"]).default("STANDARD"),
        description: z.string().trim().optional(),
        price: z.number().min(0, "Price must be non-negative"),
        durationDays: z.number().int().min(1, "Duration in days must be at least 1"),
        features: z.array(z.string()).default([]),
        isActive: z.boolean().default(true),
    }),
});

export const updatePlanSchema = z.object({
    params: z.object({
        id: z.string().uuid("Invalid plan ID format"),
    }),
    body: z.object({
        name: z.string().trim().min(1).optional(),
        tier: z.enum(["STANDARD", "PREMIUM", "VIP"]).optional(),
        description: z.string().trim().optional(),
        price: z.number().min(0).optional(),
        durationDays: z.number().int().min(1).optional(),
        features: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
    }),
});

export const getPlanByIdSchema = z.object({
    params: z.object({
        id: z.string().uuid("Invalid plan ID format"),
    }),
});

export const listPlansSchema = z.object({
    query: z.object({
        tier: z.enum(["STANDARD", "PREMIUM", "VIP"]).optional(),
        isActive: z.enum(["true", "false"]).optional(),
        search: z.string().trim().optional(),
    }),
});

export const assignMembershipSchema = z.object({
    params: z.object({
        id: z.string().uuid("Invalid member ID format"),
    }),
    body: z.object({
        planId: z.string().uuid("Invalid plan ID format"),
        startDate: z.string().datetime().optional(),
        autoRenew: z.boolean().default(true),
        notes: z.string().trim().optional(),
    }),
});

export const pauseMembershipSchema = z.object({
    params: z.object({
        id: z.string().uuid("Invalid member ID format"),
    }),
    body: z.object({
        notes: z.string().trim().optional(),
    }),
});

export const resumeMembershipSchema = z.object({
    params: z.object({
        id: z.string().uuid("Invalid member ID format"),
    }),
    body: z.object({
        notes: z.string().trim().optional(),
    }),
});

export const cancelMembershipSchema = z.object({
    params: z.object({
        id: z.string().uuid("Invalid member ID format"),
    }),
    body: z.object({
        cancellationReason: z.string().trim().min(1, "Cancellation reason is required"),
        notes: z.string().trim().optional(),
    }),
});

export const renewMembershipSchema = z.object({
    params: z.object({
        id: z.string().uuid("Invalid member ID format"),
    }),
    body: z.object({
        planId: z.string().uuid("Invalid plan ID format").optional(),
        autoRenew: z.boolean().optional(),
        notes: z.string().trim().optional(),
    }),
});

export const upgradeMembershipSchema = z.object({
    params: z.object({
        id: z.string().uuid("Invalid member ID format"),
    }),
    body: z.object({
        newPlanId: z.string().uuid("Invalid plan ID format"),
        notes: z.string().trim().optional(),
    }),
});

export type CreatePlanInput = z.input<typeof createPlanSchema>["body"];
export type UpdatePlanInput = z.input<typeof updatePlanSchema>["body"];
export type AssignMembershipInput = z.input<typeof assignMembershipSchema>["body"];
export type CancelMembershipInput = z.input<typeof cancelMembershipSchema>["body"];
export type RenewMembershipInput = z.input<typeof renewMembershipSchema>["body"];
export type UpgradeMembershipInput = z.input<typeof upgradeMembershipSchema>["body"];
