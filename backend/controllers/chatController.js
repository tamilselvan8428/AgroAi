import mongoose from "mongoose";
import { genAI } from "../config/index.js";
import { fetchFromThingSpeak } from "../utils/api.js";
import { config } from "../config/index.js";

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

export const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.userId;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    // Fetch ThingSpeak data for context
    let sensorData = null;
    try {
      const feeds = await fetchFromThingSpeak(`channels/${config.thingspeak.channelId}/feeds.json`, { results: 1 });
      if (feeds.feeds && feeds.feeds.length > 0) {
        const latestFeed = feeds.feeds[feeds.feeds.length - 1];
        
        // Validate sensor data (check for reasonable ranges)
        const temperature = parseFloat(latestFeed.field1);  // field1 = soil temperature
        const moisture = parseFloat(latestFeed.field2);     // field2 = soil moisture
        const humidity = latestFeed.field4 ? parseFloat(latestFeed.field4) : null; // field4 = humidity (handle null)
        const motorStatus = latestFeed.field3;              // field3 = motor status
        
        console.log("Chat Controller - Raw sensor fields:", {
          field1: latestFeed.field1,
          field2: latestFeed.field2,
          field3: latestFeed.field3,
          field4: latestFeed.field4
        });
        
        console.log("Chat Controller - Parsed sensor values:", {
          temperature,
          moisture,
          humidity,
          motorStatus
        });
        
        // Check if sensor values are within reasonable ranges (allow null for humidity)
        const validMoisture = !isNaN(moisture) && moisture >= 0 && moisture <= 100;
        const validTemperature = !isNaN(temperature) && temperature >= -50 && temperature <= 80; // Reasonable temp range
        const validHumidity = humidity === null || (!isNaN(humidity) && humidity >= 0 && humidity <= 100); // Allow null humidity
        
        console.log("Chat Controller - Validation results:", {
          validMoisture,
          validTemperature,
          validHumidity
        });
        
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
    if (!genAI) {
      return res.status(500).json({ message: "AI service not configured" });
    }

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
    - Soil Temperature: ${sensorData.field1 || 'N/A'}°C
    - Soil Moisture: ${sensorData.field2 || 'N/A'}%
    - Humidity: ${sensorData.field4 || 'N/A'}%
    - Motor Status: ${sensorData.field3 === "1" ? 'Running' : 'Standby'}
    - Last Updated: ${sensorData.created_at || 'N/A'}
    ` : 'Sensor data is currently unavailable or showing invalid readings. Please provide general farming advice without specific sensor data.'}

    Important Rules:
    1. Answer ONLY crop and farming-related questions
    2. Weather questions (even with misspellings like "wheather" or "whether") ARE farming-related
    3. Device status questions ARE farming-related
    4. If asked about non-farming topics, politely decline and redirect to farming
    5. Respond in the same language as the user's question
    6. For TAMIL language responses: Use clear, simple Tamil that farmers can easily understand. Avoid complex technical terms. Use common farming vocabulary in Tamil.
    7. Use sensor data only if it's valid and available
    8. If sensor data shows invalid values (like extreme temperatures), acknowledge the sensor issue and provide general advice
    9. Provide practical, actionable advice
    10. Be encouraging and supportive to farmers
    11. Keep responses concise but comprehensive
    12. For regional languages (Tamil, Telugu, Hindi, etc.): Use simple, everyday language that local farmers understand

    Language Guidelines:
    - Tamil: Use simple terms like "நிலம்" (soil), "நீர்" (water), "பயிர்" (crop), "விதை" (seed)
    - Keep sentences short and clear
    - Use farming examples that are relevant to Indian agriculture

    If someone asks non-farming questions, respond with: "I'm designed to help only with farming and crop-related questions. I'd be happy to assist you with any agricultural topics instead!"

    If sensor data is invalid or unavailable, say: "I'm currently having trouble reading your farm sensors. Let me provide general farming advice instead."`;

    // Generate response
    const result = await model.generateContent([
      { text: systemInstruction },
      { text: message }
    ]);

    const response = result.response.text();
    
    // Log conversation to database (if MongoDB is available)
    if (config.mongodbUri) {
      try {
        await Chat.create({
          userId: userId,
          message: message,
          response: response,
          timestamp: new Date(),
          language: 'auto', // Could add language detection here
          category: 'farming'
        });
      } catch (logError) {
        console.error("Failed to log conversation:", logError.message);
        // Continue even if logging fails
      }
    }

    res.json({ response });

  } catch (error) {
    console.error("Chat API error:", error.message);
    res.status(500).json({ 
      message: "Failed to process chat message",
      error: error.message 
    });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    if (!config.mongodbUri) {
      // Mock response
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: page,
          limit: limit,
          total: 0,
          pages: 0
        }
      });
    }

    const chats = await Chat.find({ userId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .select('message response timestamp language category');

    const total = await Chat.countDocuments({ userId });

    res.json({
      success: true,
      data: chats,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Chat history error:", error.message);
    res.status(500).json({ 
      message: "Failed to fetch chat history",
      error: error.message 
    });
  }
};
