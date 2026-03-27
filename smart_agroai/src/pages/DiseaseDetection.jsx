import React, { useState, useRef } from "react";
import { motion } from "motion/react";
import { Upload, Image as ImageIcon, Bug, CheckCircle2, AlertCircle, Loader2, X, Info } from "lucide-react";
import { cn } from "../lib/utils";
import api from "../lib/api";

const DiseaseDetection = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

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

  const detectDisease = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError(null);
    
    // Immediate mock response for testing (bypass backend)
    console.log("🔄 Using immediate mock response for testing");
    const mockResult = {
      success: true,
      disease: "Sample Leaf Analysis",
      confidence: 85,
      symptoms: ["Yellow spots on leaves", "Slight leaf curling", "Minor discoloration"],
      treatment: ["Remove affected leaves", "Apply organic fungicide", "Improve air circulation"],
      prevention: ["Water plants in morning", "Ensure proper spacing", "Monitor humidity levels"],
      severity: "Low",
      fallback: true,
      note: "Mock response for testing - backend deployment pending"
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
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Disease Detection</h1>
          <p className="text-slate-500 font-medium mt-1 text-sm sm:text-base">AI-powered crop health diagnostics via image analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
        {/* Upload Section */}
        <div className="bg-white p-4 sm:p-6 lg:p-8 xl:p-10 rounded-[20px] sm:rounded-[30px] lg:rounded-[40px] shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[400px] sm:min-h-[500px] relative">
          {!previewUrl ? (
            <div 
              onClick={() => fileInputRef.current.click()}
              className="w-full h-full border-2 sm:border-4 border-dashed border-slate-100 rounded-[16px] sm:rounded-[24px] lg:rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:border-green-200 hover:bg-green-50/30 transition-all group p-4 sm:p-6"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-50 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1 sm:mb-2 text-center">Upload Leaf Image</h3>
              <p className="text-slate-500 text-xs sm:text-sm text-center max-w-xs">
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
            <div className="w-full h-full flex flex-col items-center space-y-3 sm:space-y-4">
              <div className="relative w-full aspect-video rounded-[16px] sm:rounded-[24px] lg:rounded-[32px] overflow-hidden shadow-xl sm:shadow-2xl">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={clearImage}
                  className="absolute top-2 sm:top-4 right-2 sm:right-4 p-1.5 sm:p-2 bg-black/50 backdrop-blur-md text-white rounded-full hover:bg-red-500 transition-colors"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                
                {/* Analysis indicator */}
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-white text-center">
                      <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin mx-auto mb-1 sm:mb-2" />
                      <p className="text-xs sm:text-sm">Analyzing leaf health...</p>
                    </div>
                  </div>
                )}
              </div>
              
              {!loading && (
                <button
                  onClick={detectDisease}
                  disabled={loading}
                  className="w-full py-3 sm:py-4 lg:py-5 bg-slate-900 text-white rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base lg:text-lg shadow-xl hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-70"
                >
                  {loading ? <Loader2 className="w-4 h-4 sm:w-6 sm:h-6 animate-spin" /> : <Bug className="w-4 h-4 sm:w-6 sm:h-6" />}
                  {loading ? "Analyzing..." : "Analyze Health"}
                </button>
              )}
            </div>
          )}
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

              <div className="p-4 sm:p-6 lg:p-8 xl:p-10 space-y-6 sm:space-y-8 lg:space-y-10">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 sm:mb-4">Observed Symptoms</h4>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {result.symptoms.map((symptom, i) => (
                      <span key={i} className="px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-bold border border-slate-100">
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 sm:mb-4">Recommended Treatment</h4>
                    <ul className="space-y-2 sm:space-y-3">
                      {result.treatment.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 sm:gap-3 text-slate-600 font-medium text-sm sm:text-base">
                          <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-500 mt-1.5 sm:mt-2"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 sm:mb-4">Prevention Tips</h4>
                    <ul className="space-y-2 sm:space-y-3">
                      {result.prevention.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 sm:gap-3 text-slate-600 font-medium text-sm sm:text-base">
                          <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-blue-500 mt-1.5 sm:mt-2"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
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
