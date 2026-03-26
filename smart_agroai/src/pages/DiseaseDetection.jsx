import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Upload, Image as ImageIcon, Bug, CheckCircle2, AlertCircle, Loader2, X, Info, Camera, Smartphone } from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { cn } from "../lib/utils";

const DiseaseDetection = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Detect mobile device on component mount
  useEffect(() => {
    const detectMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isMobileDevice = mobileRegex.test(userAgent) || window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
    };

    detectMobile();
    window.addEventListener('resize', detectMobile);
    return () => window.removeEventListener('resize', detectMobile);
  }, []);

  // Cleanup camera stream when component unmounts or camera is closed
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

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
      if (showCamera) {
        stopCamera();
      }
    }
  };

  const startCamera = async () => {
    try {
      // First check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      console.log('Starting camera initialization...');
      
      // Check if we're on HTTPS (required for camera)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        console.warn('Camera requires HTTPS in production');
      }

      // Reset states
      setVideoLoading(true);
      
      // Try to get camera permissions first
      try {
        const permissions = await navigator.permissions.query({ name: 'camera' });
        console.log('Camera permission state:', permissions.state);
      } catch (err) {
        console.log('Permissions API not available, continuing...');
      }

      // Start with basic constraints first, then try advanced ones
      let stream = null;
      const constraints = [
        // Basic fallback first (most compatible)
        { 
          video: true,
          audio: false 
        },
        // Try with reasonable resolution
        {
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          },
          audio: false
        },
        // Try back camera (mobile)
        {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        }
      ];

      for (let i = 0; i < constraints.length; i++) {
        const constraint = constraints[i];
        try {
          console.log(`Trying camera constraint ${i + 1}:`, constraint);
          stream = await navigator.mediaDevices.getUserMedia(constraint);
          console.log(`Camera access successful with constraint ${i + 1}`);
          
          // Log stream details
          const videoTracks = stream.getVideoTracks();
          if (videoTracks.length > 0) {
            const track = videoTracks[0];
            console.log('Video track details:', {
              label: track.label,
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState,
              settings: track.getSettings()
            });
          }
          break;
        } catch (err) {
          console.log(`Constraint ${i + 1} failed:`, err.message, err.name);
          continue;
        }
      }

      if (!stream) {
        throw new Error('Unable to access any camera');
      }
      
      setCameraStream(stream);
      setShowCamera(true);
      
      // Wait for video to be ready
      if (videoRef.current) {
        // Clear any existing srcObject
        videoRef.current.srcObject = null;
        
        // Set new stream
        videoRef.current.srcObject = stream;
        
        // Force video to load
        videoRef.current.load();
        
        // Force hide loading after a reasonable time even if events don't fire
        const loadingTimeout = setTimeout(() => {
          console.log('Force hiding loading indicator');
          setVideoLoading(false);
        }, 3000); // 3 second max wait
        
        // Small delay to ensure stream is bound
        setTimeout(() => {
          // Wait for video to load metadata
          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded:', {
              videoWidth: videoRef.current.videoWidth,
              videoHeight: videoRef.current.videoHeight,
              readyState: videoRef.current.readyState
            });
            
            // Set video dimensions explicitly
            if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
              videoRef.current.style.width = '100%';
              videoRef.current.style.height = '100%';
            }
            
            // Clear loading timeout
            clearTimeout(loadingTimeout);
            
            // Try to play video
            const playPromise = videoRef.current.play();
            
            if (playPromise !== undefined) {
              playPromise.then(() => {
                console.log('Video started playing successfully');
                setVideoLoading(false);
              }).catch(err => {
                console.error('Video play error:', err);
                // Try autoplay with user interaction
                setVideoLoading(false);
                setError('Tap video to start camera');
              });
            } else {
              // Fallback if no play promise
              setTimeout(() => {
                setVideoLoading(false);
              }, 500);
            }
          };

          // Handle video errors
          videoRef.current.onerror = (err) => {
            console.error('Video error:', err);
            clearTimeout(loadingTimeout);
            setError('Camera stream error. Please try again.');
            setVideoLoading(false);
          };

          // Handle video canplay
          videoRef.current.oncanplay = () => {
            console.log('Video can play');
            clearTimeout(loadingTimeout);
            setVideoLoading(false);
          };

          // Handle video playing
          videoRef.current.onplaying = () => {
            console.log('Video is playing');
            clearTimeout(loadingTimeout);
            setVideoLoading(false);
          };

          // Add click handler for autoplay issues
          videoRef.current.onclick = () => {
            if (videoRef.current.paused) {
              videoRef.current.play().then(() => {
                setVideoLoading(false);
              }).catch(err => {
                console.error('Play on click failed:', err);
              });
            }
          };

          // Force a repaint after a short delay
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.style.opacity = '1';
            }
          }, 500);
        }, 100);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setVideoLoading(false);
      
      // Provide specific error messages
      let errorMessage = 'Unable to access camera. ';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage += 'Please grant camera permission and refresh the page.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage += 'Camera is already in use by another application.';
      } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        errorMessage += 'Camera does not support the required settings.';
      } else if (err.message.includes('Camera API not supported')) {
        errorMessage += 'Camera is not supported in this browser. Please use Chrome, Firefox, or Safari.';
      } else {
        errorMessage += 'Please check camera permissions and try again.';
      }
      
      setError(errorMessage);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
    setVideoLoading(true);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob and create file
      canvas.toBlob((blob) => {
        const file = new File([blob], 'leaf-photo.jpg', { type: 'image/jpeg' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result);
          setSelectedImage(file);
          setResult(null);
          setError(null);
        };
        reader.readAsDataURL(file);
      }, 'image/jpeg', 0.9);
      
      stopCamera();
    }
  };

  const detectDisease = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const base64Data = previewUrl.split(",")[1];

      const prompt = `As an expert plant pathologist, analyze this leaf image and identify any diseases. 
      Provide the result in a structured JSON format with:
      - diseaseName: string (e.g., "Tomato Early Blight", "Healthy")
      - confidence: number (0-100)
      - symptoms: string[]
      - treatment: string[]
      - prevention: string[]
      - severity: "Low" | "Medium" | "High"`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { data: base64Data, mimeType: selectedImage.type } }
            ]
          }
        ],
        config: { responseMimeType: "application/json" }
      });

      const detection = JSON.parse(response.text);
      setResult(detection);
    } catch (err) {
      console.error("Detection error:", err);
      setError("Failed to analyze the image. Please try again with a clearer photo.");
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
    if (showCamera) stopCamera();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Disease Detection</h1>
          <p className="text-slate-500 font-medium mt-1">AI-powered crop health diagnostics via image analysis</p>
        </div>
        {isMobile && (
          <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-2 rounded-full">
            <Smartphone className="w-4 h-4" />
            Mobile Mode
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Upload Section */}
        <div className="bg-white p-6 lg:p-10 rounded-[40px] shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[500px] relative">
          {!previewUrl && !showCamera ? (
            <div className="w-full h-full space-y-4">
              {/* Mobile OS Detection - Show Camera Option */}
              {isMobile && (
                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={startCamera}
                    className="w-full h-32 bg-green-50 border-2 border-green-200 rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:bg-green-100 transition-all group"
                  >
                    <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Camera className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Take Photo</h3>
                    <p className="text-slate-500 text-sm text-center px-4">Use camera to capture leaf image</p>
                  </button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-slate-500">or</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Upload Option (Always Available) */}
              <div 
                onClick={() => fileInputRef.current.click()}
                className={`w-full h-32 border-4 border-dashed border-slate-100 rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:border-green-200 hover:bg-green-50/30 transition-all group ${isMobile ? '' : 'h-full'}`}
              >
                <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  {isMobile ? 'Upload from Gallery' : 'Upload Leaf Image'}
                </h3>
                <p className="text-slate-500 text-sm text-center px-4">
                  {isMobile 
                    ? 'Select from photo gallery' 
                    : 'Drag and drop or click to select a photo of the affected plant leaf.'
                  }
                </p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>
          ) : showCamera ? (
            /* Camera View */
            <div className="w-full h-full flex flex-col items-center space-y-4">
              <div className="relative w-full aspect-video rounded-[32px] overflow-hidden shadow-2xl bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover cursor-pointer"
                  style={{ transform: 'scaleX(-1)' }}
                />
                
                {/* Loading indicator */}
                {videoLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-white text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm">Initializing camera...</p>
                    </div>
                  </div>
                )}
                
                {/* Camera status indicator */}
                <div className="absolute top-4 left-4 bg-red-500 w-3 h-3 rounded-full animate-pulse"></div>
                
                {/* Instructions overlay */}
                {!videoLoading && (
                  <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs">
                    Tap video if needed
                  </div>
                )}
                
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                  <button
                    onClick={capturePhoto}
                    className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                  >
                    <div className="w-12 h-12 bg-green-500 rounded-full"></div>
                  </button>
                  <button
                    onClick={stopCamera}
                    className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>
              <p className="text-slate-500 text-sm text-center">Position the leaf in frame and tap to capture</p>
            </div>
          ) : (
            /* Image Preview */
            <div className="w-full h-full flex flex-col items-center space-y-4">
              <div className="relative w-full aspect-video rounded-[32px] overflow-hidden shadow-2xl">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={clearImage}
                  className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md text-white rounded-full hover:bg-red-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={detectDisease}
                disabled={loading}
                className="w-full py-4 lg:py-5 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Bug className="w-6 h-6" />}
                {loading ? "Analyzing Image..." : "Analyze Health"}
              </button>
            </div>
          )}
          
          {/* Hidden canvas for photo capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Result Section */}
        <div className="space-y-8">
          {result ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden"
            >
              <div className={cn(
                "p-10 text-white relative overflow-hidden",
                result.diseaseName === "Healthy" ? "bg-gradient-to-r from-green-600 to-emerald-500" : "bg-gradient-to-r from-red-600 to-orange-500"
              )}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                      {result.diseaseName === "Healthy" ? <CheckCircle2 className="w-8 h-8" /> : <Bug className="w-8 h-8" />}
                    </div>
                    <span className="text-sm font-bold uppercase tracking-widest opacity-80">AI Diagnosis</span>
                  </div>
                  <h2 className="text-4xl font-extrabold mb-4">{result.diseaseName}</h2>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-md border border-white/20">
                      <span className="font-bold">{result.confidence}% Confidence</span>
                    </div>
                    {result.severity && (
                      <div className={cn(
                        "px-4 py-2 rounded-full backdrop-blur-md border border-white/20 font-bold",
                        result.severity === "High" ? "bg-red-500/30" : result.severity === "Medium" ? "bg-orange-500/30" : "bg-green-500/30"
                      )}>
                        Severity: {result.severity}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-10 space-y-10">
                <div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Observed Symptoms</h4>
                  <div className="flex flex-wrap gap-3">
                    {result.symptoms.map((symptom, i) => (
                      <span key={i} className="px-4 py-2 bg-slate-50 text-slate-700 rounded-xl text-sm font-bold border border-slate-100">
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Recommended Treatment</h4>
                    <ul className="space-y-3">
                      {result.treatment.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-slate-600 font-medium">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Prevention Tips</h4>
                    <ul className="space-y-3">
                      {result.prevention.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-slate-600 font-medium">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : error ? (
            <div className="bg-red-50 p-12 rounded-[40px] border border-red-100 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-red-900 mb-2">Analysis Failed</h3>
              <p className="text-red-600">{error}</p>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-[40px] shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center h-full">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
                <Info className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Awaiting Analysis</h3>
              <p className="text-slate-500 max-w-xs">Upload an image of a leaf to get an instant AI-powered health diagnosis and treatment plan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiseaseDetection;
