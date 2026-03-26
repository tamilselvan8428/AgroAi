import axios from "axios";
import { config } from "../config/index.js";

export const fetchFromThingSpeak = async (endpoint, params = {}) => {
  try {
    const response = await axios.get(`https://api.thingspeak.com/${endpoint}`, {
      params: {
        api_key: config.thingspeak.readApiKey,
        ...params
      },
      timeout: 5000 // 5 second timeout
    });
    return response.data;
  } catch (error) {
    console.error("ThingSpeak API error:", error.message);
    
    // Return mock data when ThingSpeak is unavailable
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.log("ThingSpeak unavailable, returning mock data");
      return {
        feeds: [
          {
            created_at: new Date().toISOString(),
            entry_id: 1,
            field1: "25", // temperature
            field2: "60", // soil moisture  
            field3: "0",  // motor status
            field4: "45"  // humidity
          }
        ]
      };
    }
    
    throw error;
  }
};

export const updateThingSpeakField = async (field, value) => {
  try {
    const updateUrl = `https://api.thingspeak.com/update?api_key=${config.thingspeak.writeApiKey}&field${field}=${value}`;
    const response = await axios.get(updateUrl, { timeout: 5000 }); // 5 second timeout
    return response.data;
  } catch (error) {
    console.error("ThingSpeak update error:", error.message);
    
    // Return mock success when ThingSpeak is unavailable
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.log("ThingSpeak unavailable, returning mock success");
      return Math.floor(Math.random() * 1000) + 1; // Mock entry ID
    }
    
    throw error;
  }
};

export const callMLModel = async (inputData) => {
  try {
    const response = await axios.post(config.mlModel.url, inputData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error("ML Model API error:", error.message);
    throw error;
  }
};
