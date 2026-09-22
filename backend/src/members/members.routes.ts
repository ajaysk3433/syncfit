import express from "express";
import membersController from "./members.controller.js";
import { memberMembershipsRouter } from "../membership-plans/plans.routes.js";
import { validate } from "../core/middlewares/validate.middleware.js";
import { authenticate, authorizeRoles } from "../core/middlewares/auth.middleware.js";
import {
    createMemberSchema,
    updateMemberProfileSchema,
    updateMemberStatusSchema,
    getMemberByIdSchema,
    listMembersSchema,
    addDependentSchema,
    addDocumentSchema,
    signDocumentSchema,
} from "./members.schema.js";

const router = express.Router();

// Register new member (open or staff)
router.post(
    "/",
    validate(createMemberSchema),
    membersController.createMember
);

// List members with filters & pagination
router.get(
    "/",
    authenticate,
    authorizeRoles("ADMIN", "MANAGER", "FRONT_DESK", "TRAINER"),
    validate(listMembersSchema),
    membersController.listMembers
);

// Get member details
router.get(
    "/:id",
    authenticate,
    validate(getMemberByIdSchema),
    membersController.getMemberById
);

// Update member profile
router.patch(
    "/:id",
    authenticate,
    validate(updateMemberProfileSchema),
    membersController.updateMemberProfile
);

// Update member status (Admin/Manager only)
router.patch(
    "/:id/status",
    authenticate,
    authorizeRoles("ADMIN", "MANAGER"),
    validate(updateMemberStatusSchema),
    membersController.updateMemberStatus
);

// QR Access Codes
router.get(
    "/:id/access-qr",
    authenticate,
    validate(getMemberByIdSchema),
    membersController.getMemberAccessQr
);

router.post(
    "/:id/access-qr/regenerate",
    authenticate,
    validate(getMemberByIdSchema),
    membersController.regenerateMemberAccessQr
);

// Dependents
router.post(
    "/:id/dependents",
    authenticate,
    validate(addDependentSchema),
    membersController.addDependent
);

router.get(
    "/:id/dependents",
    authenticate,
    validate(getMemberByIdSchema),
    membersController.getDependents
);

// Referrals
router.get(
    "/:id/referrals",
    authenticate,
    validate(getMemberByIdSchema),
    membersController.getReferrals
);

// Documents & Waivers
router.post(
    "/:id/documents",
    authenticate,
    validate(addDocumentSchema),
    membersController.addDocument
);

router.get(
    "/:id/documents",
    authenticate,
    validate(getMemberByIdSchema),
    membersController.getDocuments
);

router.patch(
    "/:id/documents/:docId/sign",
    authenticate,
    validate(signDocumentSchema),
    membersController.signDocument
);

// Mount membership lifecycle routes under /v1/members/:id/memberships
router.use("/:id/memberships", memberMembershipsRouter);

export default router;
