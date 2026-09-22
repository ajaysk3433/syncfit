import { z } from "zod";

export const checkInSchema = z.object({
    body: z.object({
        memberId: z.string().uuid("Invalid member ID format").optional(),
        qrCodeKey: z.string().optional(),
        barcode: z.string().optional(),
        email: z.string().email("Invalid email address format").optional(),
        phone: z.string().optional(),
        method: z.enum(["QR_CODE", "BARCODE", "MANUAL", "CARD", "BIOMETRIC", "PIN"]).default("MANUAL"),
        location: z.string().trim().default("Main Gym"),
        notes: z.string().trim().optional(),
        overrideRestrictions: z.boolean().default(false),
    }).refine(
        (data) => data.memberId || data.qrCodeKey || data.barcode || data.email || data.phone,
        { message: "At least one identifier (memberId, qrCodeKey, barcode, email, or phone) is required" }
    ),
});

export const checkOutSchema = z.object({
    body: z.object({
        memberId: z.string().uuid("Invalid member ID format").optional(),
        attendanceId: z.string().uuid("Invalid attendance ID format").optional(),
        notes: z.string().trim().optional(),
    }).refine(
        (data) => data.memberId || data.attendanceId,
        { message: "Either memberId or attendanceId is required for check-out" }
    ),
});

export const autoCheckoutSchema = z.object({
    body: z.object({
        maxDurationHours: z.number().min(1).max(24).default(4),
    }),
});

export const listAttendanceSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).default(1),
        limit: z.string().regex(/^\d+$/).transform(Number).default(20),
        memberId: z.string().uuid().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        status: z.enum(["CHECKED_IN", "CHECKED_OUT", "AUTO_CHECKED_OUT", "DENIED"]).optional(),
        method: z.enum(["QR_CODE", "BARCODE", "MANUAL", "CARD", "BIOMETRIC", "PIN"]).optional(),
        location: z.string().optional(),
    }),
});

export const getMemberAttendanceSchema = z.object({
    params: z.object({
        id: z.string().uuid("Invalid member ID format"),
    }),
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).default(1),
        limit: z.string().regex(/^\d+$/).transform(Number).default(20),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
    }),
});

export const createVisitorPassSchema = z.object({
    body: z.object({
        visitorName: z.string().trim().min(1, "Visitor name is required"),
        visitorEmail: z.string().email().optional().or(z.literal("")),
        visitorPhone: z.string().trim().optional(),
        hostMemberId: z.string().uuid("Invalid host member ID format").optional(),
        passType: z.enum(["DAY_PASS", "GUEST_PASS", "TRIAL_PASS", "EVENT_PASS"]).default("DAY_PASS"),
        validDays: z.number().int().min(1).max(30).default(1),
        notes: z.string().trim().optional(),
    }),
});

export const listVisitorPassesSchema = z.object({
    query: z.object({
        status: z.enum(["ACTIVE", "USED", "EXPIRED", "REVOKED"]).optional(),
        passType: z.enum(["DAY_PASS", "GUEST_PASS", "TRIAL_PASS", "EVENT_PASS"]).optional(),
        search: z.string().optional(),
    }),
});

export const checkInVisitorPassSchema = z.object({
    body: z.object({
        passCode: z.string().trim().min(1, "Pass code is required"),
        location: z.string().trim().default("Main Gym"),
        notes: z.string().trim().optional(),
    }),
});

export type CheckInInput = z.input<typeof checkInSchema>["body"];
export type CheckOutInput = z.input<typeof checkOutSchema>["body"];
export type AutoCheckoutInput = z.input<typeof autoCheckoutSchema>["body"];
export type ListAttendanceQuery = z.input<typeof listAttendanceSchema>["query"];
export type CreateVisitorPassInput = z.input<typeof createVisitorPassSchema>["body"];
export type CheckInVisitorPassInput = z.input<typeof checkInVisitorPassSchema>["body"];
