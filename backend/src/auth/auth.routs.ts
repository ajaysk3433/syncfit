import express from "express";
const router = express.Router()
import AuthController from "./auth.controller.js";

router.post("/signup", AuthController.signUp )


export default router