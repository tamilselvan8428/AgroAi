import express from "express";
import { getLatestSensors, getSensorHistory } from "../controllers/sensorController.js";

const router = express.Router();

router.get("/sensors/latest", getLatestSensors);
router.get("/sensors/history", getSensorHistory);

export default router;
