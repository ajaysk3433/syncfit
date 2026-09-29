import express from "express";
import gymController from "./gym.controller.js";
import { authenticate, authorizeRoles } from "../core/middlewares/auth.middleware.js";

const router = express.Router();

// Primary Gym QR Code Access (For front desk display, wall poster, turnstile display)
router.get(
    "/qr",
    gymController.getGymQr
);

// Regenerate default / active Gym QR Code
router.post(
    "/qr/regenerate",
    authenticate,
    authorizeRoles("ADMIN", "MANAGER"),
    gymController.regenerateGymQr
);

// List all Gym locations
router.get(
    "/",
    authenticate,
    gymController.listGyms
);

// Create new Gym facility location
router.post(
    "/",
    authenticate,
    authorizeRoles("ADMIN"),
    gymController.createGym
);

// Get specific Gym facility details
router.get(
    "/:id",
    authenticate,
    gymController.getGymById
);

// Update Gym facility details
router.patch(
    "/:id",
    authenticate,
    authorizeRoles("ADMIN", "MANAGER"),
    gymController.updateGym
);

// Regenerate QR Code for a specific Gym facility
router.post(
    "/:id/qr/regenerate",
    authenticate,
    authorizeRoles("ADMIN", "MANAGER"),
    gymController.regenerateGymQr
);

export default router;
