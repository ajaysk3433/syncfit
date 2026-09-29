import type { Request, Response, NextFunction } from "express";
import gymService, { GymService } from "./gym.service.js";
import { withSpan } from "../core/telemetry/tracer.js";

export class GymController {
    constructor(private readonly gymService: GymService) {}

    getGymQr = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const gymId = req.query.gymId as string | undefined;
            const code = req.query.code as string | undefined;

            const result = await withSpan("GymController.getGymQr", async () => {
                return await this.gymService.getGymQr(gymId, code);
            });

            return res.status(200).json({
                success: true,
                message: "Gym QR code retrieved successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    regenerateGymQr = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const gymId = (req.params.id as string | undefined) || (req.body?.gymId as string | undefined);

            const result = await withSpan("GymController.regenerateGymQr", async () => {
                return await this.gymService.regenerateGymQr(gymId);
            });

            return res.status(200).json({
                success: true,
                message: "Gym QR code regenerated successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    listGyms = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await withSpan("GymController.listGyms", async () => {
                return await this.gymService.listGyms();
            });

            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    getGymById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await withSpan("GymController.getGymById", async () => {
                return await this.gymService.getGymById(req.params.id as string);
            });

            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    createGym = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await withSpan("GymController.createGym", async () => {
                return await this.gymService.createGym(req.body);
            });

            return res.status(201).json({
                success: true,
                message: "Gym created successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    updateGym = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await withSpan("GymController.updateGym", async () => {
                return await this.gymService.updateGym(req.params.id as string, req.body);
            });

            return res.status(200).json({
                success: true,
                message: "Gym updated successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };
}

export default new GymController(gymService);
