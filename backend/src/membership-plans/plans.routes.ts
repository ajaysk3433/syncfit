import express from "express";
import plansController from "./plans.controller.js";
import { validate } from "../core/middlewares/validate.middleware.js";
import { authenticate, authorizeRoles } from "../core/middlewares/auth.middleware.js";
import {
    createPlanSchema,
    updatePlanSchema,
    getPlanByIdSchema,
    listPlansSchema,
    assignMembershipSchema,
    pauseMembershipSchema,
    resumeMembershipSchema,
    cancelMembershipSchema,
    renewMembershipSchema,
    upgradeMembershipSchema,
} from "./plans.schema.js";

const router = express.Router();

// Membership Plans CRUD
router.post(
    "/",
    authenticate,
    authorizeRoles("ADMIN", "MANAGER"),
    //validate(createPlanSchema),
    plansController.createPlan
);

router.get(
    "/",
    //validate(listPlansSchema),
    plansController.listPlans
);

router.get(
    "/:id",
    //validate(getPlanByIdSchema),
    plansController.getPlanById
);

router.patch(
    "/:id",
    authenticate,
    authorizeRoles("ADMIN", "MANAGER"),
    //validate(updatePlanSchema),
    plansController.updatePlan
);

export default router;

// Helper router for member subscription endpoints that will be mounted under /v1/members/:id/memberships
export const memberMembershipsRouter = express.Router({ mergeParams: true });

memberMembershipsRouter.post(
    "/",
    authenticate,
    authorizeRoles("ADMIN", "MANAGER", "FRONT_DESK"),
    //validate(assignMembershipSchema),
    plansController.assignMembership
);

memberMembershipsRouter.get(
    "/",
    authenticate,
    plansController.getMemberMemberships
);

memberMembershipsRouter.post(
    "/pause",
    authenticate,
    authorizeRoles("ADMIN", "MANAGER", "FRONT_DESK"),
    //validate(pauseMembershipSchema),
    plansController.pauseMembership
);

memberMembershipsRouter.post(
    "/resume",
    authenticate,
    authorizeRoles("ADMIN", "MANAGER", "FRONT_DESK"),
    //validate(resumeMembershipSchema),
    plansController.resumeMembership
);

memberMembershipsRouter.post(
    "/cancel",
    authenticate,
    authorizeRoles("ADMIN", "MANAGER", "FRONT_DESK"),
    validate(cancelMembershipSchema),
    plansController.cancelMembership
);

memberMembershipsRouter.post(
    "/renew",
    authenticate,
    authorizeRoles("ADMIN", "MANAGER", "FRONT_DESK"),
    //validate(renewMembershipSchema),
    plansController.renewMembership
);

memberMembershipsRouter.post(
    "/upgrade",
    authenticate,
    authorizeRoles("ADMIN", "MANAGER", "FRONT_DESK"),
    //validate(upgradeMembershipSchema),
    plansController.upgradeMembership
);
