import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, process.env.JWT_SECRET || "secret", (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn("⚠️ MONGODB_URI is not set in environment variables.");
  console.warn("⚠️ Falling back to mock authentication mode. Database features will be limited.");
  console.warn("👉 To fix this, add MONGODB_URI to your Secrets in the AI Studio Settings.");
} else {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch(err => {
      console.error("❌ MongoDB connection error:", err.message);
      console.error("👉 Ensure your MongoDB Atlas IP Whitelist allows access from all IPs (0.0.0.0/0) for this environment.");
    });
}

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);

// Chat Schema for conversation logging
const chatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  response: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  language: { type: String },
  category: { type: String, default: 'farming' }
});

const Chat = mongoose.model("Chat", chatSchema);

// Mock Users for demonstration if DB is not connected
const mockUsers = [];

// Auth Routes
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!MONGODB_URI) {
      // Mock Signup
      const existing = mockUsers.find(u => u.email === email);
      if (existing) return res.status(400).json({ message: "User already exists (Mock)" });
      const newUser = { email, password, name, _id: Date.now().toString() };
      mockUsers.push(newUser);
      const token = "mock-token-" + newUser._id;
      return res.status(201).json({ token, user: { email, name } });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, name });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || "secret", { expiresIn: "7d" });
    res.status(201).json({ token, user: { email, name } });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Error creating user" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!MONGODB_URI) {
      // Mock Login
      const user = mockUsers.find(u => u.email === email && u.password === password);
      if (!user) return res.status(400).json({ message: "Invalid credentials (Mock Mode)" });
      const token = "mock-token-" + user._id;
      return res.json({ token, user: { email: user.email, name: user.name } });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || "secret", { expiresIn: "7d" });
    res.json({ token, user: { email: user.email, name: user.name } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Error logging in" });
  }
});

// Chatbot API Endpoint
app.post("/api/chat", authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.userId;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    // Fetch ThingSpeak data for context
    let sensorData = null;
    try {
      const axios = (await import('axios')).default;
      const CHANNEL_ID = "3314379";
      const READ_API_KEY = "JRDAPKYRYFI67DZB";
      const response = await axios.get(`https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?api_key=${READ_API_KEY}&results=1`);
      const feeds = response.data.feeds;
      if (feeds && feeds.length > 0) {
        const latestFeed = feeds[feeds.length - 1];
        
        // Validate sensor data (check for reasonable ranges)
        const moisture = parseFloat(latestFeed.field1);
        const temperature = parseFloat(latestFeed.field2);
        const humidity = parseFloat(latestFeed.field3);
        
        // Check if sensor values are within reasonable ranges
        const validMoisture = moisture >= 0 && moisture <= 100;
        const validTemperature = temperature >= -50 && temperature <= 80; // Reasonable temp range
        const validHumidity = humidity >= 0 && humidity <= 100;
        
        if (validMoisture && validTemperature && validHumidity) {
          sensorData = latestFeed;
        } else {
          console.log("Invalid sensor data detected - using null values");
        }
      }
    } catch (sensorError) {
      console.log("Sensor data fetch failed:", sensorError.message);
    }

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // System instruction with sensor data context
    const systemInstruction = `You are an expert AI Farming Assistant. You ONLY answer questions related to:
    - Crop management and cultivation
    - Soil health and analysis
    - Irrigation and water management
    - Pest control and disease management
    - Fertilizers and nutrients
    - Weather and farming conditions (including: weather, whether, wheather, climate, temperature, rain, humidity, seasons)
    - Smart farming technology and IoT sensors
    - Agricultural techniques and best practices
    - Farm equipment and machinery
    - Harvesting and post-harvest management
    - Device status and connectivity issues
    - Sensor maintenance and troubleshooting

    Current Sensor Data:
    ${sensorData ? `
    - Soil Moisture: ${sensorData.field1 || 'N/A'}%
    - Temperature: ${sensorData.field2 || 'N/A'}°C
    - Humidity: ${sensorData.field3 || 'N/A'}%
    - Motor Status: ${sensorData.field4 === "1" ? 'Running' : 'Standby'}
    - Last Updated: ${sensorData.created_at || 'N/A'}
    ` : 'Sensor data is currently unavailable or showing invalid readings. Please provide general farming advice without specific sensor data.'}

    Important Rules:
    1. Answer ONLY crop and farming-related questions
    2. Weather questions (even with misspellings like "wheather" or "whether") ARE farming-related
    3. Device status questions ARE farming-related
    4. If asked about non-farming topics, politely decline and redirect to farming
    5. Respond in the same language as the user's question
    6. Use sensor data only if it's valid and available
    7. If sensor data shows invalid values (like extreme temperatures), acknowledge the sensor issue and provide general advice
    8. Provide practical, actionable advice
    9. Be encouraging and supportive to farmers
    10. Keep responses concise but comprehensive

    If someone asks non-farming questions, respond with: "I'm designed to help only with farming and crop-related questions. I'd be happy to assist you with any agricultural topics instead!"

    If sensor data is invalid or unavailable, say: "I'm currently having trouble reading your farm sensors. Let me provide general farming advice instead."`;

    // Generate response
    const result = await model.generateContent([
      { text: systemInstruction },
      { text: message }
    ]);

    const response = result.response.text();
    
    // Log conversation to database (if MongoDB is available)
    if (MONGODB_URI) {
      try {
        await Chat.create({
          userId: userId,
          message: message,
          response: response,
          timestamp: new Date(),
          category: 'farming'
        });
      } catch (logError) {
        console.log("Failed to log conversation:", logError.message);
      }
    }

    res.json({ 
      response: response,
      sensorData: sensorData ? {
        moisture: sensorData.field1,
        temperature: sensorData.field2,
        humidity: sensorData.field3,
        motorStatus: sensorData.field4 === "1" ? 'Running' : 'Standby'
      } : null
    });

  } catch (error) {
    console.error("Chatbot error:", error);
    res.status(500).json({ 
      message: "Failed to process chat request",
      error: error.message 
    });
  }
});

// Middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({ 
    message: "Backend is working!",
    timestamp: new Date(),
    endpoints: [
      "GET /api/sensors/latest",
      "GET /api/debug/thingspeak",
      "GET /api/motor/status", 
      "POST /api/motor/control"
    ]
  });
});

// Motor Control Endpoint
app.post("/api/motor/control", authenticateToken, async (req, res) => {
  try {
    const { action } = req.body; // 'on' or 'off'
    
    console.log(`Motor control request: ${action} from user:`, req.user?.userId || 'unknown');
    
    if (!action || !['on', 'off'].includes(action)) {
      console.log(`Invalid action received: ${action}`);
      return res.status(400).json({ 
        message: "Invalid action. Use 'on' or 'off'" 
      });
    }

    // Rate limiting - wait 15 seconds between motor control requests
    const now = Date.now();
    if (global.lastMotorControlTime && (now - global.lastMotorControlTime) < 15000) {
      const waitTime = Math.ceil((15000 - (now - global.lastMotorControlTime)) / 1000);
      console.log(`Rate limited: User must wait ${waitTime} seconds`);
      return res.status(429).json({ 
        message: `Please wait ${waitTime} seconds before controlling the motor again`,
        waitTime: waitTime
      });
    }
    
    global.lastMotorControlTime = now;

    // Update ThingSpeak field3
    const fieldValue = action === 'on' ? '1' : '0';
    const updateUrl = `https://api.thingspeak.com/update?api_key=K3H52YQQRAIKCS59&field3=${fieldValue}`;
    
    console.log(`Motor control: ${action} -> field3=${fieldValue}`);
    console.log(`ThingSpeak URL: ${updateUrl}`);
    
    try {
      const axios = (await import('axios')).default;
      const response = await axios.get(updateUrl);
      
      console.log(`ThingSpeak response status: ${response.status}`);
      console.log(`ThingSpeak response data: ${response.data}`);
      
      if (response.status === 200) {
        // ThingSpeak returns the entry ID (positive number) or 0 if failed
        if (response.data > 0) {
          console.log(`ThingSpeak updated successfully. Entry ID: ${response.data}`);
          
          res.json({ 
            success: true,
            message: `Motor turned ${action} successfully`,
            motorStatus: action === 'on' ? 'running' : 'stopped',
            timestamp: new Date(),
            thingSpeakResponse: response.data,
            note: `Control signal sent to ThingSpeak successfully. Entry ID: ${response.data}`
          });
        } else {
          // ThingSpeak returned 0, which means the update failed
          console.error(`ThingSpeak update failed. Response: ${response.data}`);
          throw new Error(`ThingSpeak update failed. Response: ${response.data}. Possible causes: invalid API key, rate limit exceeded, or channel not found.`);
        }
      } else {
        throw new Error(`ThingSpeak returned status ${response.status}: ${response.statusText}`);
      }
    } catch (thingspeakError) {
      console.error("ThingSpeak update failed:", thingspeakError.message);
      console.error("ThingSpeak error details:", {
        url: updateUrl,
        action: action,
        fieldValue: fieldValue,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to update ThingSpeak: ${thingspeakError.message}`);
    }

  } catch (error) {
    console.error("Motor control error:", error.message);
    console.error("Full error object:", error);
    res.status(500).json({ 
      message: "Failed to control motor",
      error: error.message 
    });
  }
});

// Debug endpoint to check ThingSpeak data
app.get("/api/debug/thingspeak", async (req, res) => {
  try {
    const axios = (await import('axios')).default;
    const CHANNEL_ID = "3314379";
    const READ_API_KEY = "JRDAPKYRYFI67DZB";
    
    // Get last 5 data points for analysis
    const response = await axios.get(`https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?api_key=${READ_API_KEY}&results=5`);
    const feeds = response.data.feeds;
    
    const now = new Date();
    const analysis = feeds.map((feed, index) => {
      const feedTime = new Date(feed.created_at);
      const timeDiff = (now - feedTime) / (1000 * 60); // minutes
      
      return {
        entryId: feed.entry_id,
        timestamp: feed.created_at,
        minutesAgo: Math.round(timeDiff),
        field1: feed.field1,
        field2: feed.field2,
        field3: feed.field3,
        field4: feed.field4,
        hasData: feed.field1 !== null && feed.field2 !== null,
        isRecent: timeDiff <= 2
      };
    });
    
    const latest = feeds[feeds.length - 1];
    const latestTime = new Date(latest.created_at);
    const latestTimeDiff = (now - latestTime) / (1000 * 60);
    
    res.json({
      success: true,
      currentTime: now.toISOString(),
      latestData: {
        timestamp: latest.created_at,
        minutesAgo: Math.round(latestTimeDiff),
        isOnline: latestTimeDiff <= 2 && latest.field1 !== null && latest.field2 !== null
      },
      analysis: analysis,
      totalFeeds: feeds.length
    });
    
  } catch (error) {
    console.error("Debug endpoint error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get Latest Sensor Values Endpoint
app.get("/api/sensors/latest", async (req, res) => {
  try {
    const axios = (await import('axios')).default;
    const CHANNEL_ID = "3314379";
    const READ_API_KEY = "JRDAPKYRYFI67DZB";
    
    // Get latest data point
    const response = await axios.get(`https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?api_key=${READ_API_KEY}&results=1`);
    const feeds = response.data.feeds;
    
    if (feeds && feeds.length > 0) {
      const latestFeed = feeds[feeds.length - 1];
      
      // Check if device is online (last update within 2 minutes)
      const lastUpdateTime = new Date(latestFeed.created_at);
      const now = new Date();
      const timeDiff = (now - lastUpdateTime) / (1000 * 60); // minutes
      
      // More strict online detection
      const isOnline = timeDiff <= 2 && // Reduced from 5 to 2 minutes
                        latestFeed.field1 !== null && // Check if fields have actual data
                        latestFeed.field2 !== null &&
                        latestFeed.created_at !== null;
      
      const sensorData = {
        temperature: latestFeed.field1 || null,        // Changed from field2 to field1 (soil temperature)
        soilMoisture: latestFeed.field2 || null,      // Changed from field1 to field2 (soil moisture)
        humidity: latestFeed.field4 || null,
        motorStatus: latestFeed.field3 || null,
        timestamp: latestFeed.created_at,
        entryId: latestFeed.entry_id,
        deviceStatus: {
          online: isOnline,
          lastUpdate: latestFeed.created_at,
          minutesAgo: Math.round(timeDiff),
          status: isOnline ? "Online" : "Offline"
        }
      };
      
      console.log("Latest sensor data:", sensorData);
      
      res.json({ 
        success: true,
        data: sensorData,
        timestamp: new Date()
      });
    } else {
      res.json({ 
        success: false,
        message: "No sensor data available",
        data: {
          deviceStatus: {
            online: false,
            lastUpdate: null,
            minutesAgo: null,
            status: "Offline"
          }
        }
      });
    }
  } catch (error) {
    console.error("Failed to fetch latest sensor data:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch sensor data",
      error: error.message,
      data: {
        deviceStatus: {
          online: false,
          lastUpdate: null,
          minutesAgo: null,
          status: "Connection Error"
        }
      }
    });
  }
});

// Get Motor Status Endpoint
app.get("/api/motor/status", authenticateToken, async (req, res) => {
  try {
    // Get latest ThingSpeak data to check motor status
    let motorStatus = 'unknown';
    let lastUpdate = null;
    
    try {
      const axios = (await import('axios')).default;
      const CHANNEL_ID = "3314379";
      const READ_API_KEY = "JRDAPKYRYFI67DZB";
      const response = await axios.get(`https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?api_key=${READ_API_KEY}&results=1`);
      const feeds = response.data.feeds;
      
      if (feeds && feeds.length > 0) {
        const latestFeed = feeds[feeds.length - 1];
        const field3Value = latestFeed.field3;
        
        // Check field3 value (1 = running, 0 = stopped)
        if (field3Value === "1") {
          motorStatus = 'running';
        } else if (field3Value === "0") {
          motorStatus = 'stopped';
        } else {
          motorStatus = 'unknown';
        }
        
        lastUpdate = latestFeed.created_at;
        
        console.log(`Motor status check: field3=${field3Value}, status=${motorStatus}`);
      } else {
        console.log("No ThingSpeak data available for motor status");
      }
    } catch (error) {
      console.log("Failed to get motor status from ThingSpeak:", error.message);
    }

    res.json({ 
      motorStatus: motorStatus,
      lastUpdate: lastUpdate,
      timestamp: new Date(),
      source: 'thingspeak'
    });

  } catch (error) {
    console.error("Motor status error:", error);
    res.status(500).json({ 
      message: "Failed to get motor status",
      error: error.message 
    });
  }
});

// Weather API Endpoint
app.post("/api/weather", authenticateToken, async (req, res) => {
  try {
    const { location } = req.body;
    
    // Default to India coordinates if no location provided
    const lat = location?.lat || 20.5937; // India center
    const lon = location?.lon || 78.9629;
    
    // Using OpenWeatherMap API (you'll need to add API key to .env)
    const weatherApiKey = process.env.WEATHER_API_KEY;
    if (!weatherApiKey) {
      return res.status(400).json({ 
        message: "Weather API key not configured",
        error: "Please add WEATHER_API_KEY to your .env file"
      });
    }

    const axios = (await import('axios')).default;
    
    // Get current weather
    const weatherResponse = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric`
    );
    
    // Get 5-day forecast
    const forecastResponse = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric`
    );

    const current = weatherResponse.data;
    const forecast = forecastResponse.data;

    // Process forecast data (get one forecast per day)
    const dailyForecasts = forecast.list.filter((item, index) => index % 8 === 0).slice(0, 5);

    res.json({
      location: {
        name: current.name,
        country: current.sys.country,
        lat: current.coord.lat,
        lon: current.coord.lon
      },
      current: {
        temperature: Math.round(current.main.temp),
        feelsLike: Math.round(current.main.feels_like),
        humidity: current.main.humidity,
        pressure: current.main.pressure,
        windSpeed: current.wind.speed,
        windDirection: current.wind.deg,
        visibility: current.visibility / 1000, // Convert to km
        uvIndex: current.uvi || 0,
        condition: current.weather[0].main,
        description: current.weather[0].description,
        icon: current.weather[0].icon,
        sunrise: new Date(current.sys.sunrise * 1000),
        sunset: new Date(current.sys.sunset * 1000)
      },
      forecast: dailyForecasts.map(item => ({
        date: new Date(item.dt * 1000),
        temperature: {
          min: Math.round(item.main.temp_min),
          max: Math.round(item.main.temp_max)
        },
        humidity: item.main.humidity,
        condition: item.weather[0].main,
        description: item.weather[0].description,
        icon: item.weather[0].icon,
        windSpeed: item.wind.speed,
        precipitation: item.pop * 100 // Probability of precipitation
      })),
      farmingAdvice: generateFarmingAdvice(current, dailyForecasts.slice(0, 3))
    });

  } catch (error) {
    console.error("Weather API error:", error);
    res.status(500).json({ 
      message: "Failed to fetch weather data",
      error: error.message 
    });
  }
});

// Generate farming advice based on weather
const generateFarmingAdvice = (current, forecast) => {
  const advice = [];
  
  // Temperature advice
  if (current.main.temp > 35) {
    advice.push("🌡️ High temperature detected. Consider increasing irrigation frequency and providing shade for sensitive crops.");
  } else if (current.main.temp < 10) {
    advice.push("🥶 Low temperature. Protect sensitive plants with covers and consider delaying planting.");
  }
  
  // Humidity advice
  if (current.main.humidity > 80) {
    advice.push("💧 High humidity increases risk of fungal diseases. Ensure proper ventilation and monitor crops closely.");
  } else if (current.main.humidity < 30) {
    advice.push("🏜️ Low humidity levels. Increase irrigation and consider mulching to retain soil moisture.");
  }
  
  // Rain advice
  const rainChance = forecast.reduce((acc, day) => acc + (day.pop * 100), 0) / forecast.length;
  if (rainChance > 60) {
    advice.push("🌧️ High chance of rain expected. Consider postponing irrigation and check drainage systems.");
  } else if (rainChance < 20) {
    advice.push("☀️ Dry weather expected. Plan for additional irrigation and soil moisture conservation.");
  }
  
  // Wind advice
  if (current.wind.speed > 5) {
    advice.push("💨 Strong winds detected. Secure loose items and consider windbreaks for sensitive crops.");
  }
  
  return advice;
};

// Device Status Endpoint (for checking ThingSpeak data without logging)
app.post("/api/device/status", authenticateToken, async (req, res) => {
  try {
    // Fetch ThingSpeak data for device status
    let sensorData = null;
    let deviceOnline = false;
    
    try {
      const axios = (await import('axios')).default;
      const CHANNEL_ID = "3314379";
      const READ_API_KEY = "JRDAPKYRYFI67DZB";
      const response = await axios.get(`https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?api_key=${READ_API_KEY}&results=1`);
      const feeds = response.data.feeds;
      
      if (feeds && feeds.length > 0) {
        const latestFeed = feeds[feeds.length - 1];
        
        // Validate sensor data (check for reasonable ranges)
        const moisture = parseFloat(latestFeed.field1);
        const temperature = parseFloat(latestFeed.field2);
        const humidity = parseFloat(latestFeed.field3);
        
        // Check if sensor values are within reasonable ranges
        const validMoisture = moisture >= 0 && moisture <= 100;
        const validTemperature = temperature >= -50 && temperature <= 80;
        const validHumidity = humidity >= 0 && humidity <= 100;
        
        if (validMoisture && validTemperature && validHumidity) {
          // Check if device is online (last update within 5 minutes)
          const lastUpdateTime = new Date(latestFeed.created_at);
          const now = new Date();
          const timeDiff = (now - lastUpdateTime) / (1000 * 60); // minutes
          
          deviceOnline = timeDiff <= 5; // Online if data updated within 5 minutes
          
          if (deviceOnline) {
            sensorData = {
              moisture: moisture,
              temperature: temperature,
              humidity: humidity,
              motorStatus: latestFeed.field4 === "1" ? 'Running' : 'Standby',
              lastUpdated: latestFeed.created_at
            };
          }
        }
      }
    } catch (sensorError) {
      console.log("Sensor data fetch failed:", sensorError.message);
    }

    res.json({ 
      online: deviceOnline,
      sensorData: sensorData,
      message: deviceOnline ? "Device is online and transmitting data" : "Device is offline or not transmitting valid data"
    });

  } catch (error) {
    console.error("Device status error:", error);
    res.status(500).json({ 
      message: "Failed to check device status",
      error: error.message 
    });
  }
});

// Get chat history for authenticated user
app.get("/api/chat/history", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    if (!MONGODB_URI) {
      return res.json({ history: [], message: "Chat history not available in mock mode" });
    }

    const chats = await Chat.find({ userId })
      .sort({ timestamp: -1 })
      .limit(50)
      .select('message response timestamp');

    res.json({ history: chats });
  } catch (error) {
    console.error("Chat history error:", error);
    res.status(500).json({ message: "Failed to fetch chat history" });
  }
});

// Vite middleware
if (process.env.NODE_ENV !== "production") {
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
