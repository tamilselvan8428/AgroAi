import { fetchFromThingSpeak } from "../utils/api.js";
import { config } from "../config/index.js";

export const getDeviceStatus = async (req, res) => {
  try {
    let deviceOnline = false;
    let sensorData = null;
    
    try {
      const feeds = await fetchFromThingSpeak(`channels/${config.thingspeak.channelId}/feeds.json`, { results: 1 });
      
      if (feeds.feeds && feeds.feeds.length > 0) {
        const latestFeed = feeds.feeds[feeds.feeds.length - 1];
        
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
      success: true,
      online: deviceOnline,
      sensorData: sensorData,
      message: deviceOnline ? "Device is online and transmitting data" : "Device is offline or not transmitting valid data",
      timestamp: new Date()
    });

  } catch (error) {
    console.error("Device status error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to check device status",
      error: error.message 
    });
  }
};
