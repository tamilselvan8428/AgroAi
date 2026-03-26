import { fetchFromThingSpeak } from "../utils/api.js";
import { config } from "../config/index.js";

export const getLatestSensors = async (req, res) => {
  try {
    // Get latest data point
    const feeds = await fetchFromThingSpeak(`channels/${config.thingspeak.channelId}/feeds.json`, { results: 1 });
    
    if (feeds.feeds && feeds.feeds.length > 0) {
      const latestFeed = feeds.feeds[feeds.feeds.length - 1];
      
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
};

export const getSensorHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const results = Math.min(limit, 8000); // ThingSpeak limit
    
    const feeds = await fetchFromThingSpeak(`channels/${config.thingspeak.channelId}/feeds.json`, { results });
    
    if (feeds.feeds && feeds.feeds.length > 0) {
      const sensorData = feeds.feeds.map(feed => ({
        timestamp: feed.created_at,
        entryId: feed.entry_id,
        temperature: parseFloat(feed.field1) || null,
        soilMoisture: parseFloat(feed.field2) || null,
        motorStatus: feed.field3 === '1' ? 'running' : 'stopped',
        humidity: parseFloat(feed.field4) || null
      })).reverse(); // Reverse to show oldest first
      
      res.json({
        success: true,
        data: sensorData,
        count: sensorData.length,
        channel: config.thingspeak.channelId,
        timestamp: new Date()
      });
    } else {
      res.json({
        success: false,
        message: "No sensor history available",
        data: []
      });
    }
  } catch (error) {
    console.error("Failed to fetch sensor history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sensor history",
      error: error.message,
      data: []
    });
  }
};
