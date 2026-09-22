import express from "express";
import attendanceController from "./attendance.controller.js";
import { validate } from "../core/middlewares/validate.middleware.js";
import { authenticate, authorizeRoles } from "../core/middlewares/auth.middleware.js";
import {
    checkInSchema,
    checkOutSchema,
    autoCheckoutSchema,
    listAttendanceSchema,
    getMemberAttendanceSchema,
} from "./attendance.schema.js";

const router = express.Router();

// Real-Time Occupancy & Active Count
router.get(
    "/occupancy",
    attendanceController.getOccupancy
);

// Analytics
router.get(
    "/analytics/overview",
    authenticate,
    authorizeRoles("ADMIN", "MANAGER"),
    attendanceController.getOverviewStats
);

router.get(
    "/analytics/peak-hours",
    authenticate,
    authorizeRoles("ADMIN", "MANAGER"),
    attendanceController.getPeakHoursAnalytics
);

router.get(
    "/analytics/member-frequency",
    authenticate,
    authorizeRoles("ADMIN", "MANAGER"),
    attendanceController.getMemberFrequencyAnalytics
);

// Check-in & Check-out
router.post(
    "/check-in",
   // validate(checkInSchema),
    attendanceController.checkIn
);

router.post(
    "/check-out",
    //validate(checkOutSchema),
    attendanceController.checkOut
);

router.post(
    "/auto-checkout",
    authenticate,
    authorizeRoles("ADMIN", "MANAGER"),
    //validate(autoCheckoutSchema),
    attendanceController.autoCheckout
);

// Attendance History / Logs
router.get(
    "/members/:id",
    authenticate,
    //validate(getMemberAttendanceSchema),
    attendanceController.getMemberAttendanceHistory
);

router.get(
    "/",
    authenticate,
    authorizeRoles("ADMIN", "MANAGER", "FRONT_DESK"),
    //validate(listAttendanceSchema),
    attendanceController.listAttendance
);

export default router;
