import type { Request, Response, NextFunction } from "express";
import { ZodError, type ZodSchema } from "zod";
import { ValidationError } from "../error/errors.js";

export const validate = (schema: ZodSchema) => {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            const schemaShape = (schema as any)?.shape;
            const isFullRequestSchema =
                schemaShape &&
                ("body" in schemaShape || "query" in schemaShape || "params" in schemaShape);

            if (isFullRequestSchema) {
                const parsed = (await schema.parseAsync({
                    body: req.body,
                    query: req.query,
                    params: req.params,
                })) as Record<string, any>;
                if (parsed.body !== undefined) req.body = parsed.body;
                if (parsed.query !== undefined) req.query = parsed.query;
                if (parsed.params !== undefined) req.params = parsed.params;
            } else {
                req.body = await schema.parseAsync(req.body);
            }

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const formattedDetails = error.issues.map((issue) => ({
                    field: issue.path
                        .filter((p) => p !== "body" && p !== "query" && p !== "params")
                        .join(".") || issue.path.join("."),
                    message: issue.message,
                }));
                const firstMessage = error.issues[0]?.message || "Validation failed";
                next(new ValidationError(firstMessage, formattedDetails));
                return;
            }
            next(error);
        }
    };
};
