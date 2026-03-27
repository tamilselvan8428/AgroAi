import { callMLModel } from "../utils/api.js";
import { config } from "../config/index.js";

export const predictDisease = async (req, res) => {
  try {
    console.log("🔍 Disease prediction request received");
    
    // Check if image file is present
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided"
      });
    }

    const imageData = req.file.buffer;
    console.log("📸 Image received via multer:", req.file.originalname);
    console.log("📸 Image size:", req.file.size, "bytes");
    console.log("📸 Image mimetype:", req.file.mimetype);

    if (!imageData) {
      return res.status(400).json({
        success: false,
        message: "Invalid image data format"
      });
    }

    // Temporary: Return fallback immediately for testing
    console.log("🔄 Using immediate fallback for testing");
    const fallbackResult = {
      success: true,
      disease: "Sample Analysis",
      confidence: 75,
      symptoms: ["Sample symptoms for testing"],
      treatment: ["Sample treatment for testing"],
      prevention: ["Sample prevention for testing"],
      severity: "Medium",
      fallback: true,
      note: "Immediate fallback for testing - ML model integration pending"
    };
    
    return res.json(fallbackResult);

    console.log("🧠 Sending to ML model:", config.mlModel.url);
    
    try {
      // Call the crop disease prediction model
      const response = await callMLModel({
        image: imageData
      });

      console.log("✅ ML model response:", response);

      // Format the response
      const result = {
        success: true,
        disease: response.disease || response.class || "Unknown",
        confidence: response.confidence || response.probability || 0,
        symptoms: response.symptoms || [],
        treatment: response.treatment || [],
        prevention: response.prevention || [],
        severity: response.severity || "Medium",
        raw_response: response
      };

      console.log("🎯 Formatted result:", result);
      res.json(result);
    } catch (mlError) {
      console.error("❌ ML Model Error:", mlError.message);
      
      // Check if it's a 403 error or other API access issue
      if (mlError.message.includes('403') || mlError.message.includes('Access forbidden') || mlError.message.includes('API access denied')) {
        console.log("🔄 ML Model not accessible, using fallback mode");
        
        // Fallback response when ML model is not accessible
        const fallbackResult = {
          success: true,
          disease: "Analysis Unavailable",
          confidence: 0,
          symptoms: ["ML model service is currently unavailable"],
          treatment: ["Try again later", "Contact support if issue persists"],
          prevention: ["Check internet connection", "Verify ML model status"],
          severity: "Medium",
          fallback: true,
          note: "ML model returned 403 Forbidden - using fallback response"
        };
        
        return res.json(fallbackResult);
      }
      
      // For other errors, return the error
      res.status(500).json({
        success: false,
        message: "Failed to predict disease",
        error: mlError.message
      });
    }
  } catch (error) {
    console.error("❌ Disease prediction error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to predict disease",
      error: error.message
    });
  }
};
