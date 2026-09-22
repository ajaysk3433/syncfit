import { z } from "zod";

export const signUpSchema = z.object({
    body: z.object({
        email: z
            .string()
            .min(1, "Email is required")
            .email("Invalid email address format"),
        password: z
            .string()
            .min(6, "Password must be at least 6 characters long"),
        name: z.string().trim().min(1).optional(),
        phone: z.string().trim().optional(),
        role: z.enum(["ADMIN", "MANAGER", "FRONT_DESK", "TRAINER", "MAINTENANCE", "MEMBER"]).optional(),
        memberTier: z.enum(["STANDARD", "PREMIUM", "VIP"]).optional(),
        avatarUrl: z.string().url("Invalid avatar URL format").optional().or(z.literal("")),
    }),
});

export type SignUpSchema = z.infer<typeof signUpSchema>;
