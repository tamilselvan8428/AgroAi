import express from "express";
import { getLatestSensors, getSensorHistory } from "../controllers/sensorController.js";
import { config } from "../config/index.js";
import { fetchFromThingSpeak } from "../utils/api.js";

const router = express.Router();

router.get("/sensors/latest", getLatestSensors);
router.get("/sensors/history", getSensorHistory);

// Debug endpoint to test ThingSpeak connection
router.get("/sensors/debug", async (req, res) => {
  try {
    console.log("🔍 Debug: Testing ThingSpeak connection...");
    console.log("🔍 Channel ID:", config.thingspeak.channelId);
    console.log("🔍 Read API Key:", config.thingspeak.readApiKey);
    
    const feeds = await fetchFromThingSpeak(`channels/${config.thingspeak.channelId}/feeds.json`, { results: 1 });
    
    res.json({
      success: true,
      message: "ThingSpeak connection successful",
      config: {
        channelId: config.thingspeak.channelId,
        hasReadKey: !!config.thingspeak.readApiKey
      },
      data: feeds
    });
  } catch (error) {
    console.error("❌ Debug: ThingSpeak connection failed:", error);
    res.status(500).json({
      success: false,
      message: "ThingSpeak connection failed",
      error: error.message,
      config: {
        channelId: config.thingspeak.channelId,
        hasReadKey: !!config.thingspeak.readApiKey
      }
    });
  }
});

export default router;
