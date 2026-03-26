import express from "express";
import { signup, login, testAuth } from "../controllers/authController.js";

const router = express.Router();

router.post("/auth/signup", signup);
router.post("/auth/login", login);
router.get("/auth/test", testAuth);

export default router;
