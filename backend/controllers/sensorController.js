import { fetchFromThingSpeak } from "../utils/api.js";
import { config } from "../config/index.js";

export const getLatestSensors = async (req, res) => {
  try {
    console.log("🔍 Fetching latest sensor data from ThingSpeak...");
    
    // Get latest data point
    const feeds = await fetchFromThingSpeak(`channels/${config.thingspeak.channelId}/feeds.json`, { results: 1 });
    
    console.log("📊 Raw ThingSpeak response:", JSON.stringify(feeds, null, 2));
    
    if (feeds.feeds && feeds.feeds.length > 0) {
      const latestFeed = feeds.feeds[feeds.feeds.length - 1];
      
      console.log("📋 Latest feed data:", latestFeed);
      
      // Check if device is online (last update within 10 minutes)
      const lastUpdateTime = new Date(latestFeed.created_at);
      const now = new Date();
      const timeDiff = (now - lastUpdateTime) / (1000 * 60); // minutes
      
      // More lenient online detection - show data if it's less than 30 minutes old
      const isOnline = timeDiff <= 30 && // Increased from 2 to 30 minutes
                        latestFeed.field1 !== null && // Check if fields have actual data
                        latestFeed.field2 !== null &&
                        latestFeed.created_at !== null;
      
      // Parse numeric values properly - ALWAYS return the data regardless of online status
      const sensorData = {
        temperature: parseFloat(latestFeed.field1) || null,        // field1 = temperature
        soilMoisture: parseFloat(latestFeed.field2) || null,      // field2 = soil moisture
        humidity: parseFloat(latestFeed.field4) || null,
        motorStatus: latestFeed.field3 || null,
        timestamp: latestFeed.created_at,
        entryId: latestFeed.entry_id,
        deviceStatus: {
          online: isOnline,
          lastUpdate: latestFeed.created_at,
          minutesAgo: Math.round(timeDiff),
          status: isOnline ? "Online" : `Offline (${Math.round(timeDiff)} minutes ago)`
        }
      };
      
      console.log("✅ Processed sensor data:", sensorData);
      
      // Always return success with data, even if device is offline
      res.json({ 
        success: true,
        data: sensorData,
        timestamp: new Date(),
        message: isOnline ? "Device online and data current" : `Device offline, showing last data from ${Math.round(timeDiff)} minutes ago`
      });
    } else {
      console.log("❌ No feeds found in ThingSpeak response");
      res.json({ 
        success: false,
        message: "No sensor data available - ThingSpeak channel has no data",
        data: {
          deviceStatus: {
            online: false,
            lastUpdate: null,
            minutesAgo: null,
            status: "No Data"
          }
        }
      });
    }
  } catch (error) {
    console.error("❌ Failed to fetch latest sensor data:", error);
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
