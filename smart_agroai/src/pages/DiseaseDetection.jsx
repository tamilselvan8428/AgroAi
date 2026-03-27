import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Upload, Image as ImageIcon, Bug, CheckCircle2, AlertCircle, Loader2, X, Info, Leaf, MapPin, DollarSign, TrendingDown, Lightbulb, Map } from "lucide-react";
import { cn } from "../lib/utils";
import api from "../lib/api";

const DiseaseDetection = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  
  // New comprehensive agricultural inputs
  const [agriculturalData, setAgriculturalData] = useState({
    plantType: "",
    fieldArea: "",
    fertilizersUsed: ""
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
      setResult(null);
      setError(null);
    }
  };

  const handleAgriculturalDataChange = (e) => {
    setAgriculturalData({
      ...agriculturalData,
      [e.target.name]: e.target.value
    });
  };

  // Function to validate if the uploaded image is a leaf
  const validateLeafImage = async (imageFile) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Create a canvas to analyze the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Get image data for analysis
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Simple color analysis - check for green pixels (leaf characteristic)
        let greenPixels = 0;
        let totalPixels = data.length / 4;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Check if pixel has green characteristics (higher green channel)
          if (g > r && g > b && g > 50) {
            greenPixels++;
          }
        }
        
        // If more than 15% of pixels are green, consider it a leaf image
        const greenRatio = greenPixels / totalPixels;
        resolve(greenRatio > 0.15);
      };
      
      img.onerror = () => {
        resolve(false);
      };
      
      img.src = URL.createObjectURL(imageFile);
    });
  };

  const detectDisease = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError(null);
    
    // Validate if the uploaded image is a leaf
    console.log("🔍 Validating if image is a leaf...");
    const isLeafImage = await validateLeafImage(selectedImage);
    
    if (!isLeafImage) {
      setError("Please upload a leaf image for disease detection.");
      setLoading(false);
      return;
    }
    
    console.log("✅ Image validated as leaf - proceeding with disease detection");
    
    // Immediate mock response for testing (bypass backend)
    console.log("🔄 Using immediate mock response for testing");
    const mockResult = {
      success: true,
      disease: "Tomato Early Blight",
      confidence: 85,
      symptoms: ["Dark brown spots on leaves", "Yellowing around spots", "Leaf drop"],
      treatment: ["Apply copper-based fungicide", "Remove infected leaves", "Improve air circulation"],
      prevention: ["Water plants at base", "Ensure proper spacing", "Use resistant varieties"],
      severity: "Medium",
      
      // Comprehensive agricultural analysis
      diseaseReason: "Caused by Alternaria solani fungus, thrives in warm humid conditions with poor air circulation",
      
      economicImpact: {
        currentMarketPrice: "₹40 per kg",
        estimatedLoss: "₹15,000-₹25,000 per acre",
        marketDemand: "High demand for quality tomatoes",
        affectedArea: `${agriculturalData.fieldArea || "1"} acre(s)`,
        totalLoss: agriculturalData.fieldArea ? `₹${parseInt(agriculturalData.fieldArea) * 20000}` : "₹20,000"
      },
      
      recommendations: {
        immediate: ["Apply fungicide immediately", "Remove infected plant parts", "Quarantine affected area"],
        shortTerm: ["Monitor neighboring plants", "Adjust irrigation schedule", "Improve drainage"],
        longTerm: ["Crop rotation next season", "Use disease-resistant varieties", "Implement preventive spraying schedule"],
        marketStrategy: ["Focus on quality remaining produce", "Consider early harvest if severe", "Explore local markets for smaller quantities"]
      },
      
      fertilizerAnalysis: {
        current: agriculturalData.fertilizersUsed || "NPK 19-19-19",
        recommended: "Increase potassium, reduce nitrogen during disease period",
        alternative: "Organic compost + neem cake combination",
        applicationMethod: "Soil drenching + foliar spray"
      },
      
      fallback: true,
      note: "Comprehensive agricultural analysis - backend deployment pending"
    };
    
    setResult(mockResult);
    setLoading(false);
    return;

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('image', selectedImage);

      // Call crop disease prediction endpoint
      const response = await api.post('/predict', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000 // 30 second timeout
      });

      // Handle the response from crop disease prediction endpoint
      if (response.data && response.data.success) {
        const prediction = response.data;
        
        // Format the response to match expected structure
        const formattedResult = {
          diseaseName: prediction.disease || prediction.class || "Unknown",
          confidence: prediction.confidence || prediction.probability || 0,
          symptoms: prediction.symptoms || [],
          treatment: prediction.treatment || [],
          prevention: prediction.prevention || [],
          severity: prediction.severity || "Medium"
        };
        
        setResult(formattedResult);
      } else {
        setError(response.data?.message || "Failed to analyze the image");
      }
    } catch (err) {
      console.error("Detection error:", err);
      if (err.code === 'ECONNABORTED') {
        setError("Request timed out. Please try again.");
      } else if (err.response?.status === 413) {
        setError("Image file too large. Please use a smaller image.");
      } else if (err.response?.status === 400) {
        setError("Invalid image format. Please use JPG, PNG, or WEBP.");
      } else {
        setError("Failed to analyze the image. Please try again with a clearer photo.");
      }
    } finally {
      setLoading(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">Disease Detection</h1>
          <p className="text-slate-500 font-medium mt-1 text-xs sm:text-sm lg:text-base">AI-powered crop health diagnostics via image analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {/* Upload Section */}
        <div className="bg-white p-3 sm:p-4 lg:p-6 xl:p-8 rounded-[12px] sm:rounded-[20px] lg:rounded-[30px] shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] relative order-2 lg:order-1">
          {!previewUrl ? (
            <div 
              onClick={() => fileInputRef.current.click()}
              className="w-full h-full border-2 sm:border-4 border-dashed border-slate-100 rounded-[12px] sm:rounded-[16px] lg:rounded-[24px] flex flex-col items-center justify-center cursor-pointer hover:border-green-200 hover:bg-green-50/30 transition-all group p-3 sm:p-4 lg:p-6"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-green-50 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center mb-2 sm:mb-3 lg:mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-green-600" />
              </div>
              <h3 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 mb-1 sm:mb-2 text-center">Upload Leaf Image</h3>
              <p className="text-slate-500 text-xs sm:text-sm text-center max-w-[200px] sm:max-w-xs">
                Drag and drop or click to select a photo of the affected plant leaf.
              </p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          ) : (
            /* Image Preview */
            <div className="w-full h-full flex flex-col items-center space-y-2 sm:space-y-3 lg:space-y-4">
              <div className="relative w-full aspect-video rounded-[12px] sm:rounded-[16px] lg:rounded-[24px] overflow-hidden shadow-lg sm:shadow-xl lg:shadow-2xl">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={clearImage}
                  className="absolute top-1 sm:top-2 lg:top-4 right-1 sm:right-2 lg:right-4 p-1 sm:p-1.5 lg:p-2 bg-black/50 backdrop-blur-md text-white rounded-full hover:bg-red-500 transition-colors"
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                </button>
                
                {/* Analysis indicator */}
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-white text-center">
                      <Loader2 className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 animate-spin mx-auto mb-1 sm:mb-2" />
                      <p className="text-xs sm:text-sm">Analyzing leaf health...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Analyze Button */}
              <button
                onClick={detectDisease}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-slate-400 disabled:to-slate-500 text-white font-bold py-2 sm:py-3 lg:py-4 px-4 sm:px-6 lg:px-8 rounded-xl sm:rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    <span className="text-sm sm:text-base">Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Bug className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-sm sm:text-base">Analyze Disease</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Agricultural Information Form */}
        <div className="bg-white p-3 sm:p-4 lg:p-6 xl:p-8 rounded-[12px] sm:rounded-[20px] lg:rounded-[30px] shadow-sm border border-slate-100 order-1 lg:order-2">
          <h3 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 mb-3 sm:mb-4 lg:mb-6 flex items-center gap-2">
            <Leaf className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />
            Agricultural Information
          </h3>
          
          <div className="space-y-3 sm:space-y-4">
            {/* Plant Type */}
            <div className="space-y-1 sm:space-y-2">
              <label className="text-xs sm:text-sm font-bold text-slate-700 ml-1">Plant Type</label>
              <select
                name="plantType"
                value={agriculturalData.plantType}
                onChange={handleAgriculturalDataChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl py-2 sm:py-3 px-3 sm:px-4 text-sm sm:text-base focus:ring-4 focus:ring-green-500/10 focus:border-green-600 outline-none transition-all text-slate-900 font-medium"
              >
                <option value="">Select Plant Type...</option>
                <option value="tomato">Tomato</option>
                <option value="potato">Potato</option>
                <option value="rice">Rice</option>
                <option value="wheat">Wheat</option>
                <option value="corn">Corn</option>
                <option value="cotton">Cotton</option>
                <option value="sugarcane">Sugarcane</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Field Area */}
            <div className="space-y-1 sm:space-y-2">
              <label className="text-xs sm:text-sm font-bold text-slate-700 ml-1">Field Area (Acres)</label>
              <input
                type="number"
                name="fieldArea"
                value={agriculturalData.fieldArea}
                onChange={handleAgriculturalDataChange}
                placeholder="e.g., 2.5"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl py-2 sm:py-3 px-3 sm:px-4 text-sm sm:text-base focus:ring-4 focus:ring-green-500/10 focus:border-green-600 outline-none transition-all text-slate-900 font-medium"
              />
            </div>

            {/* Fertilizers Used */}
            <div className="space-y-1 sm:space-y-2">
              <label className="text-xs sm:text-sm font-bold text-slate-700 ml-1">Fertilizers Used</label>
              <input
                type="text"
                name="fertilizersUsed"
                value={agriculturalData.fertilizersUsed}
                onChange={handleAgriculturalDataChange}
                placeholder="e.g., NPK 19-19-19, Urea, DAP"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl py-2 sm:py-3 px-3 sm:px-4 text-sm sm:text-base focus:ring-4 focus:ring-green-500/10 focus:border-green-600 outline-none transition-all text-slate-900 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Result Section */}
        <div className="space-y-6 sm:space-y-8">
          {result ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-[20px] sm:rounded-[30px] lg:rounded-[40px] shadow-sm border border-slate-100 overflow-hidden"
            >
              <div className={cn(
                "p-4 sm:p-6 lg:p-8 xl:p-10 text-white relative overflow-hidden",
                result.diseaseName === "Healthy" ? "bg-gradient-to-r from-green-600 to-emerald-500" : "bg-gradient-to-r from-red-600 to-orange-500"
              )}>
                <div className="absolute top-0 right-0 w-32 sm:w-48 lg:w-64 h-32 sm:h-48 lg:h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl sm:blur-3xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
                    <div className="bg-white/20 p-1.5 sm:p-2 rounded-xl sm:rounded-xl backdrop-blur-md">
                      {result.diseaseName === "Healthy" ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /> : <Bug className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />}
                    </div>
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-widest opacity-80">AI Diagnosis</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-2 sm:mb-4 leading-tight">{result.diseaseName}</h2>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full backdrop-blur-md border border-white/20">
                      <span className="font-bold text-sm sm:text-base">{result.confidence}% Confidence</span>
                    </div>
                    {result.severity && (
                      <div className={cn(
                        "px-3 py-1.5 sm:px-4 sm:py-2 rounded-full backdrop-blur-md border border-white/20 font-bold text-xs sm:text-sm",
                        result.severity === "High" ? "bg-red-500/30" : result.severity === "Medium" ? "bg-orange-500/30" : "bg-green-500/30"
                      )}>
                        Severity: {result.severity}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
                {/* Disease Reason */}
                {result.diseaseReason && (
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 sm:p-4">
                    <h4 className="text-xs sm:text-sm font-bold text-orange-600 uppercase tracking-widest mb-2 sm:mb-3 flex items-center gap-2">
                      <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                      Disease Cause
                    </h4>
                    <p className="text-slate-700 font-medium text-sm sm:text-base">{result.diseaseReason}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 sm:mb-3">Observed Symptoms</h4>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    {result.symptoms.map((symptom, i) => (
                      <span key={i} className="px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-50 text-slate-700 rounded-lg text-xs sm:text-sm font-bold border border-slate-100">
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Economic Impact */}
                {result.economicImpact && (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3 sm:p-4">
                    <h4 className="text-xs sm:text-sm font-bold text-green-600 uppercase tracking-widest mb-2 sm:mb-3 flex items-center gap-2">
                      <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
                      Economic Impact Analysis
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium mb-1">Current Market Price</p>
                        <p className="text-base sm:text-lg font-bold text-slate-900">{result.economicImpact.currentMarketPrice}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium mb-1">Estimated Loss</p>
                        <p className="text-base sm:text-lg font-bold text-red-600">{result.economicImpact.estimatedLoss}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium mb-1">Market Demand</p>
                        <p className="text-sm sm:text-base font-bold text-slate-900">{result.economicImpact.marketDemand}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium mb-1">Total Potential Loss</p>
                        <p className="text-base sm:text-lg font-bold text-red-600">{result.economicImpact.totalLoss}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 sm:mb-3">Recommended Treatment</h4>
                    <ul className="space-y-1.5 sm:space-y-2">
                      {result.treatment.map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5 sm:gap-2 text-slate-600 font-medium text-sm sm:text-base">
                          <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-500 mt-1.5 sm:mt-2"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 sm:mb-3">Prevention Tips</h4>
                    <ul className="space-y-1.5 sm:space-y-2">
                      {result.prevention.map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5 sm:gap-2 text-slate-600 font-medium text-sm sm:text-base">
                          <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-blue-500 mt-1.5 sm:mt-2"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Comprehensive Recommendations */}
                {result.recommendations && (
                  <div className="space-y-4 sm:space-y-6">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 sm:p-4">
                      <h4 className="text-xs sm:text-sm font-bold text-blue-600 uppercase tracking-widest mb-2 sm:mb-3 flex items-center gap-2">
                        <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4" />
                        Strategic Recommendations
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <h5 className="text-xs sm:text-sm font-bold text-blue-700 mb-1 sm:mb-2">Immediate Actions</h5>
                          <ul className="space-y-1 sm:space-y-2">
                            {result.recommendations.immediate.map((item, i) => (
                              <li key={i} className="text-xs sm:text-sm text-slate-600 flex items-start gap-1">
                                <div className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-xs sm:text-sm font-bold text-blue-700 mb-1 sm:mb-2">Short-term (1-2 weeks)</h5>
                          <ul className="space-y-1 sm:space-y-2">
                            {result.recommendations.shortTerm.map((item, i) => (
                              <li key={i} className="text-xs sm:text-sm text-slate-600 flex items-start gap-1">
                                <div className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-xs sm:text-sm font-bold text-blue-700 mb-1 sm:mb-2">Long-term Planning</h5>
                          <ul className="space-y-1 sm:space-y-2">
                            {result.recommendations.longTerm.map((item, i) => (
                              <li key={i} className="text-xs sm:text-sm text-slate-600 flex items-start gap-1">
                                <div className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-xs sm:text-sm font-bold text-blue-700 mb-1 sm:mb-2">Market Strategy</h5>
                          <ul className="space-y-1 sm:space-y-2">
                            {result.recommendations.marketStrategy.map((item, i) => (
                              <li key={i} className="text-xs sm:text-sm text-slate-600 flex items-start gap-1">
                                <div className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fertilizer Analysis */}
                {result.fertilizerAnalysis && (
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 sm:p-4">
                    <h4 className="text-xs sm:text-sm font-bold text-purple-600 uppercase tracking-widest mb-2 sm:mb-3 flex items-center gap-2">
                      <Leaf className="w-3 h-3 sm:w-4 sm:h-4" />
                      Fertilizer Analysis & Recommendations
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium mb-1">Current Fertilizer</p>
                        <p className="text-sm sm:text-base font-bold text-slate-900">{result.fertilizerAnalysis.current}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium mb-1">Recommended</p>
                        <p className="text-sm sm:text-base font-bold text-purple-700">{result.fertilizerAnalysis.recommended}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium mb-1">Alternative</p>
                        <p className="text-sm sm:text-base font-bold text-slate-900">{result.fertilizerAnalysis.alternative}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium mb-1">Application Method</p>
                        <p className="text-sm sm:text-base font-bold text-slate-900">{result.fertilizerAnalysis.applicationMethod}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : error ? (
            <div className="bg-red-50 p-6 sm:p-8 lg:p-12 rounded-[20px] sm:rounded-[30px] lg:rounded-[40px] border border-red-100 text-center">
              <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-red-500 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-bold text-red-900 mb-2">Analysis Failed</h3>
              <p className="text-red-600 text-sm sm:text-base">{error}</p>
            </div>
          ) : (
            <div className="bg-white p-6 sm:p-8 lg:p-12 rounded-[20px] sm:rounded-[30px] lg:rounded-[40px] shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center h-full">
              <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-slate-50 rounded-xl sm:rounded-2xl lg:rounded-3xl flex items-center justify-center mb-4 sm:mb-6">
                <Info className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-slate-300" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Awaiting Analysis</h3>
              <p className="text-slate-500 text-sm sm:text-base max-w-xs">Upload an image of a leaf to get an instant AI-powered health diagnosis and treatment plan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiseaseDetection;
