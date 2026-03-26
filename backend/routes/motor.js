import express from "express";
import { controlMotor, getMotorStatus, debugThingSpeak } from "../controllers/motorController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/motor/control", authenticateToken, controlMotor);
router.get("/motor/status", authenticateToken, getMotorStatus);
router.get("/debug/thingspeak", debugThingSpeak);

export default router;
