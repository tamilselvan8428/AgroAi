import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { connectDB } from "./config/database.js";
import { config } from "./config/index.js";

// Import routes
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import motorRoutes from "./routes/motor.js";
import sensorRoutes from "./routes/sensors.js";
import weatherRoutes from "./routes/weather.js";
import deviceRoutes from "./routes/device.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = config.port;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "Server running",
    timestamp: new Date(),
    port: PORT,
    environment: config.nodeEnv,
    version: "2.0.0-modular"
  });
});

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({ 
    message: "API is working!",
    timestamp: new Date(),
    config: {
      port: PORT,
      nodeEnv: config.nodeEnv,
      hasGeminiKey: !!config.geminiApiKey,
      hasMongoDB: !!config.mongodbUri
    }
  });
});

// Use routes
app.use("/api", authRoutes);
app.use("/api", chatRoutes);
app.use("/api", motorRoutes);
app.use("/api", sensorRoutes);
app.use("/api", weatherRoutes);
app.use("/api", deviceRoutes);

// Connect to database
connectDB();

// Vite middleware for development
if (config.nodeEnv !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Smart Farming Backend API Server running on port ${PORT}`);
  console.log(`📡 Environment: ${config.nodeEnv}`);
  console.log(`🔐 JWT Secret configured: ${config.jwtSecret ? "Yes" : "No (using fallback)"}`);
  console.log(`🤖 Gemini AI configured: ${config.geminiApiKey ? "Yes" : "No"}`);
  console.log(`🗄️ MongoDB configured: ${config.mongodbUri ? "Yes" : "No (Mock mode)"}`);
  console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
  console.log(`📊 ThingSpeak Channel: ${config.thingspeak.channelId}`);
  console.log(`🧠 ML Model URL: ${config.mlModel.url}`);
});

export default app;
