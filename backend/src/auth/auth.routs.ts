import express from "express";
import AuthController from "./auth.controller.js";
import { validate } from "../core/middlewares/validate.middleware.js";
import { signUpSchema } from "./auth.schema.js";

const router = express.Router();

router.post("/signup", validate(signUpSchema), AuthController.signUp);

export default router;