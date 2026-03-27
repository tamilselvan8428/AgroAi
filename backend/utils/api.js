import axios from "axios";
import { config } from "../config/index.js";

export const fetchFromThingSpeak = async (endpoint, params = {}) => {
  try {
    console.log("🌐 Fetching from ThingSpeak:", endpoint, params);
    const response = await axios.get(`https://api.thingspeak.com/${endpoint}`, {
      params: {
        api_key: config.thingspeak.readApiKey,
        ...params
      },
      timeout: 10000 // Increased from 5 to 10 seconds
    });
    console.log("✅ ThingSpeak response received");
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
  const urls = [config.mlModel.url, ...(config.mlModel.fallbackUrls || [])];
  let lastError = null;
  
  for (const url of urls) {
    try {
      console.log("🤖 Trying ML model URL:", url);
      console.log("🤖 Calling ML Model with data:", Object.keys(inputData));
      
      let response;
      
      if (inputData.image) {
        // Handle image data - convert to FormData
        const FormData = (await import('form-data')).default;
        const formData = new FormData();
        
        // If image is a buffer, append it directly
        if (Buffer.isBuffer(inputData.image)) {
          formData.append('image', inputData.image, 'image.jpg');
        } else {
          // If image is base64 or string, append as string
          formData.append('image', inputData.image);
        }
        
        response = await axios.post(url, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000 // 30 second timeout
        });
      } else {
        // Handle regular JSON data
        response = await axios.post(url, inputData, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });
      }
      
      console.log("✅ ML model response received from:", url);
      return response.data;
    } catch (error) {
      console.error(`❌ ML Model API error (${url}):`, error.message);
      lastError = error;
      
      // Log specific error details for debugging
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || error.response.statusText;
        
        if (status === 403) {
          console.error(`🚫 403 Forbidden from ${url} - Host not allowed or access denied`);
        } else if (status === 429) {
          console.error(`⏱️ 429 Rate Limited from ${url} - Too many requests`);
        } else if (status === 500) {
          console.error(`💥 500 Server Error from ${url} - ML model down`);
        } else {
          console.error(`❌ API error (${status}) from ${url}: ${message}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        console.error(`⏰ Request timeout from ${url} - ML model took too long`);
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.error(`🔌 Cannot connect to ${url} - check URL and network`);
      }
      
      // Try next URL
      continue;
    }
  }
  
  // All URLs failed, throw the last error
  if (lastError) {
    if (lastError.response?.status === 403) {
      throw new Error(`Access forbidden: ML model host not allowed. Check Vite config allowedHosts.`);
    } else {
      throw lastError;
    }
  } else {
    throw new Error('No ML model URLs available');
  }
};
