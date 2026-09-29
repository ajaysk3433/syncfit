import { z } from "zod";

export const createGymSchema = z.object({
    body: z.object({
        name: z.string().min(2, "Gym name must be at least 2 characters").trim(),
        code: z.string().min(2, "Gym code must be at least 2 characters").trim().toUpperCase(),
        address: z.string().trim().optional(),
        city: z.string().trim().optional(),
        phone: z.string().trim().optional(),
        maxCapacity: z.number().int().positive().default(150),
    }),
});

export const updateGymSchema = z.object({
    params: z.object({
        id: z.string().uuid("Invalid gym ID format"),
    }),
    body: z.object({
        name: z.string().min(2).trim().optional(),
        code: z.string().min(2).trim().toUpperCase().optional(),
        address: z.string().trim().optional(),
        city: z.string().trim().optional(),
        phone: z.string().trim().optional(),
        maxCapacity: z.number().int().positive().optional(),
        isActive: z.boolean().optional(),
    }),
});

export const getGymQrSchema = z.object({
    query: z.object({
        gymId: z.string().uuid().optional(),
        code: z.string().optional(),
    }),
});

export const gymIdParamSchema = z.object({
    params: z.object({
        id: z.string().uuid("Invalid gym ID format"),
    }),
});

export type CreateGymInput = z.infer<typeof createGymSchema>["body"];
export type UpdateGymInput = z.infer<typeof updateGymSchema>["body"];
