import type { Request, Response, NextFunction } from "express";
import plansService, { PlansService } from "./plans.service.js";
import { withSpan } from "../core/telemetry/tracer.js";
import type { MemberTier } from "@prisma/client";

class PlansController {
    constructor(private readonly plansService: PlansService) {}

    createPlan = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await withSpan("PlansController.createPlan", async () => {
                return await this.plansService.createPlan(req.body);
            });
            return res.status(201).json({
                success: true,
                message: "Membership plan created successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    listPlans = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await withSpan("PlansController.listPlans", async () => {
                const filters: { tier?: MemberTier; isActive?: boolean; search?: string } = {};
                if (req.query.tier) filters.tier = req.query.tier as MemberTier;
                if (req.query.isActive !== undefined) filters.isActive = req.query.isActive === "true";
                if (req.query.search) filters.search = req.query.search as string;
                return await this.plansService.listPlans(filters);
            });
            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    getPlanById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const result = await withSpan("PlansController.getPlanById", async () => {
                return await this.plansService.getPlanById(id);
            });
            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    updatePlan = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const result = await withSpan("PlansController.updatePlan", async () => {
                return await this.plansService.updatePlan(id, req.body);
            });
            return res.status(200).json({
                success: true,
                message: "Membership plan updated successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    assignMembership = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.params.id as string;
            const result = await withSpan("PlansController.assignMembership", async () => {
                return await this.plansService.assignMembership(userId, req.body);
            });
            return res.status(201).json({
                success: true,
                message: "Membership assigned successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    pauseMembership = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.params.id as string;
            const result = await withSpan("PlansController.pauseMembership", async () => {
                return await this.plansService.pauseMembership(userId, req.body?.notes);
            });
            return res.status(200).json({
                success: true,
                message: "Membership paused successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    resumeMembership = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.params.id as string;
            const result = await withSpan("PlansController.resumeMembership", async () => {
                return await this.plansService.resumeMembership(userId, req.body?.notes);
            });
            return res.status(200).json({
                success: true,
                message: "Membership resumed successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    cancelMembership = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.params.id as string;
            const result = await withSpan("PlansController.cancelMembership", async () => {
                return await this.plansService.cancelMembership(userId, req.body.cancellationReason, req.body.notes);
            });
            return res.status(200).json({
                success: true,
                message: "Membership cancelled successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    renewMembership = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.params.id as string;
            const result = await withSpan("PlansController.renewMembership", async () => {
                return await this.plansService.renewMembership(userId, req.body?.planId, req.body?.autoRenew, req.body?.notes);
            });
            return res.status(200).json({
                success: true,
                message: "Membership renewed successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    upgradeMembership = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.params.id as string;
            const result = await withSpan("PlansController.upgradeMembership", async () => {
                return await this.plansService.upgradeMembership(userId, req.body.newPlanId, req.body.notes);
            });
            return res.status(200).json({
                success: true,
                message: "Membership upgraded successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    getMemberMemberships = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.params.id as string;
            const result = await withSpan("PlansController.getMemberMemberships", async () => {
                return await this.plansService.getMemberMemberships(userId);
            });
            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };
}

export default new PlansController(plansService);
