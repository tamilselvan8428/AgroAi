import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || "secret",
  geminiApiKey: process.env.GEMINI_API_KEY,
  mongodbUri: process.env.MONGODB_URI,
  nodeEnv: process.env.NODE_ENV || "development",
  thingspeak: {
    channelId: "3314379",
    readApiKey: "JRDAPKYRYFI67DZB",
    writeApiKey: "K3H52YQQRAIKCS59"
  },
  mlModel: {
    url: "https://crop-disease-70gb.onrender.com/predict"
  }
};

// Initialize Gemini AI
export const genAI = config.geminiApiKey ? new GoogleGenerativeAI(config.geminiApiKey) : null;

// Global rate limiting for motor control
global.lastMotorControlTime = null;
