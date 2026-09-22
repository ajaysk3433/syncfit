import type { Request, Response, NextFunction } from "express";
import membersService, { MembersService } from "./members.service.js";
import { withSpan } from "../core/telemetry/tracer.js";

class MembersController {
    constructor(private readonly membersService: MembersService) {}

    createMember = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await withSpan("MembersController.createMember", async () => {
                return await this.membersService.createMember(req.body);
            });
            return res.status(201).json({
                success: true,
                message: "Member registered successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    listMembers = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await withSpan("MembersController.listMembers", async () => {
                return await this.membersService.listMembers(req.query as any);
            });
            return res.status(200).json({
                success: true,
                data: result.members,
                pagination: result.pagination,
            });
        } catch (error) {
            next(error);
        }
    };

    getMemberById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const result = await withSpan("MembersController.getMemberById", async () => {
                return await this.membersService.getMemberById(id);
            });
            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    updateMemberProfile = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const result = await withSpan("MembersController.updateMemberProfile", async () => {
                return await this.membersService.updateMemberProfile(id, req.body);
            });
            return res.status(200).json({
                success: true,
                message: "Member profile updated successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    updateMemberStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const result = await withSpan("MembersController.updateMemberStatus", async () => {
                return await this.membersService.updateMemberStatus(id, req.body);
            });
            return res.status(200).json({
                success: true,
                message: "Member status updated successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    addDependent = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const result = await withSpan("MembersController.addDependent", async () => {
                return await this.membersService.addDependent(id, req.body);
            });
            return res.status(201).json({
                success: true,
                message: "Dependent added successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    getDependents = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const result = await withSpan("MembersController.getDependents", async () => {
                return await this.membersService.getDependents(id);
            });
            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    getReferrals = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const result = await withSpan("MembersController.getReferrals", async () => {
                return await this.membersService.getReferrals(id);
            });
            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    addDocument = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const result = await withSpan("MembersController.addDocument", async () => {
                return await this.membersService.addDocument(id, req.body);
            });
            return res.status(201).json({
                success: true,
                message: "Document added successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    signDocument = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const docId = req.params.docId as string;
            const result = await withSpan("MembersController.signDocument", async () => {
                return await this.membersService.signDocument(id, docId, req.body);
            });
            return res.status(200).json({
                success: true,
                message: "Document signed successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    getDocuments = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const result = await withSpan("MembersController.getDocuments", async () => {
                return await this.membersService.getDocuments(id);
            });
            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    getMemberAccessQr = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const result = await withSpan("MembersController.getMemberAccessQr", async () => {
                return await this.membersService.getMemberAccessQr(id);
            });
            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    regenerateMemberAccessQr = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const result = await withSpan("MembersController.regenerateMemberAccessQr", async () => {
                return await this.membersService.regenerateMemberAccessQr(id);
            });
            return res.status(200).json({
                success: true,
                message: "QR access code regenerated successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };
}

export default new MembersController(membersService);
