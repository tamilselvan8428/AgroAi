import express from "express";
import { getDeviceStatus } from "../controllers/deviceController.js";

const router = express.Router();

router.post("/device/status", getDeviceStatus);

export default router;
