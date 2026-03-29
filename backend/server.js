import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import multer from "multer";
import { connectDB } from "./config/database.js";
import { config } from "./config/index.js";


// Import routes
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import motorRoutes from "./routes/motor.js";
import sensorRoutes from "./routes/sensors.js";
import weatherRoutes from "./routes/weather.js";
import deviceRoutes from "./routes/device.js";
import diseaseRoutes from "./routes/disease.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = config.port;

// Middleware
// Temporary fix: Allow all origins for debugging
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Add response time middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "Server running",
    timestamp: new Date(),
    port: PORT,
    environment: config.nodeEnv,
    version: "2.0.0-modular",
    uptime: process.uptime()
  });
});

// Root endpoint for Render health checks
app.get("/", (req, res) => {
  res.json({ 
    message: "AgroAI Backend API is running!",
    status: "healthy",
    timestamp: new Date(),
    endpoints: {
      health: "/api/health",
      test: "/api/test",
      sensors: "/api/sensors/latest",
      auth: "/api/auth/login"
    }
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
app.use("/api", diseaseRoutes);

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

// Keep-alive mechanism to prevent Render from sleeping
if (config.nodeEnv === 'production') {
  const keepAlive = () => {
    const https = require('https');
    const options = {
      host: 'agroai-o0vm.onrender.com', // Updated with correct backend URL
      path: '/api/health',
      method: 'GET'
    };
    
    const req = https.request(options, (res) => {
      console.log(`Keep-alive ping: ${res.statusCode}`);
    });
    
    req.on('error', (err) => {
      console.log('Keep-alive ping failed:', err.message);
    });
    
    req.end();
  };
  
  // Ping every 14 minutes (Render sleeps after 15 minutes of inactivity)
  setInterval(keepAlive, 14 * 60 * 1000);
  console.log('🔄 Keep-alive mechanism activated (pings every 14 minutes)');
}

export default app;
