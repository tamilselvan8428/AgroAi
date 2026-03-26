import express from "express";
import { sendMessage, getChatHistory } from "../controllers/chatController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/chat", authenticateToken, sendMessage);
router.get("/chat/history", authenticateToken, getChatHistory);

export default router;
