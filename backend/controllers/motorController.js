import { updateThingSpeakField, fetchFromThingSpeak } from "../utils/api.js";
import { config } from "../config/index.js";

export const controlMotor = async (req, res) => {
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
    
    console.log(`Motor control: ${action} -> field3=${fieldValue}`);
    
    try {
      const response = await updateThingSpeakField(3, fieldValue);
      
      console.log(`ThingSpeak response data: ${response}`);
      
      if (response > 0) {
        console.log(`ThingSpeak updated successfully. Entry ID: ${response}`);
        
        res.json({ 
          success: true,
          message: `Motor turned ${action} successfully`,
          motorStatus: action === 'on' ? 'running' : 'stopped',
          timestamp: new Date(),
          thingSpeakResponse: response,
          note: `Control signal sent to ThingSpeak successfully. Entry ID: ${response}`
        });
      } else {
        // ThingSpeak returned 0, which means the update failed
        console.error(`ThingSpeak update failed. Response: ${response}`);
        throw new Error(`ThingSpeak update failed. Response: ${response}. Possible causes: invalid API key, rate limit exceeded, or channel not found.`);
      }
    } catch (thingspeakError) {
      console.error("ThingSpeak update failed:", thingspeakError.message);
      console.error("ThingSpeak error details:", {
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
};

export const getMotorStatus = async (req, res) => {
  try {
    const feeds = await fetchFromThingSpeak(`channels/${config.thingspeak.channelId}/feeds.json`, { results: 1 });
    
    if (feeds.feeds && feeds.feeds.length > 0) {
      const latestFeed = feeds.feeds[feeds.feeds.length - 1];
      const motorStatus = latestFeed.field3;
      
      console.log(`Motor status check: field3=${motorStatus}, status=${motorStatus === '1' ? 'running' : 'stopped'}`);
      
      res.json({
        success: true,
        motorStatus: motorStatus === '1' ? 'running' : 'stopped',
        motorValue: motorStatus,
        timestamp: latestFeed.created_at,
        entryId: latestFeed.entry_id
      });
    } else {
      res.json({
        success: false,
        message: "No motor status data available",
        motorStatus: "unknown"
      });
    }
  } catch (error) {
    console.error("Motor status check error:", error.message);
    res.status(500).json({ 
      message: "Failed to get motor status",
      error: error.message 
    });
  }
};

export const debugThingSpeak = async (req, res) => {
  try {
    // Get last 5 data points for analysis
    const feeds = await fetchFromThingSpeak(`channels/${config.thingspeak.channelId}/feeds.json`, { results: 5 });
    
    const now = new Date();
    const analysis = feeds.feeds.map((feed, index) => {
      const feedTime = new Date(feed.created_at);
      const timeDiff = (now - feedTime) / (1000 * 60); // minutes
      
      return {
        index: index + 1,
        timestamp: feed.created_at,
        minutesAgo: Math.round(timeDiff),
        field1: feed.field1, // Soil moisture
        field2: feed.field2, // Temperature
        field3: feed.field3, // Motor status
        field4: feed.field4, // Humidity
        motorStatus: feed.field3 === '1' ? 'RUNNING' : 'STOPPED'
      };
    });
    
    res.json({
      success: true,
      channelId: config.thingspeak.channelId,
      totalFeeds: feeds.feeds.length,
      analysis: analysis,
      lastUpdate: feeds.feeds[feeds.feeds.length - 1]?.created_at,
      currentTime: now.toISOString()
    });
  } catch (error) {
    console.error("ThingSpeak debug error:", error.message);
    res.status(500).json({ 
      message: "Failed to debug ThingSpeak",
      error: error.message 
    });
  }
};
