import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, User, Bot, Loader2, Globe, Sparkles, Trash2, Droplets, Thermometer, Wind, History, MessageSquarePlus, X, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "../lib/utils";
import api from "../lib/api";

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sensorData, setSensorData] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState({ online: false, lastUpdate: null, minutesAgo: 0 });
  const [chatHistory, setChatHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [recognition, setRecognition] = useState(null);
  const [synthesis, setSynthesis] = useState(null);
  const [detectedLanguage, setDetectedLanguage] = useState('en-US');
  const [currentVoice, setCurrentVoice] = useState(null);
  const [tamilTTSAvailable, setTamilTTSAvailable] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    loadChatHistory();
    initializeSpeechRecognition();
    // Start 10-second interval fetching
    fetchDeviceStatus();
    const interval = setInterval(fetchDeviceStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
    fetchDeviceStatus();
  }, [messages]);

  // Initialize Speech Recognition
  const initializeSpeechRecognition = () => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US'; // Default to English, will auto-detect
      recognitionInstance.maxAlternatives = 3;

      recognitionInstance.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setInput(finalTranscript.trim());
          setIsListening(false);
        } else if (interimTranscript) {
          console.log('Interim result:', interimTranscript);
        }
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }

    // Initialize Speech Synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSynthesis(window.speechSynthesis);
      
      // Load voices immediately and also listen for voice changes
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log('Available TTS voices loaded:', voices.length);
        console.log('Voice list:', voices.map(v => `${v.name} (${v.lang}) - ${v.localService ? 'Local' : 'Remote'}`));
        
        // Check for Tamil voices specifically
        const tamilVoices = voices.filter(v => 
          v.lang.includes('ta') || 
          v.lang.includes('Tamil') ||
          v.name.toLowerCase().includes('tamil')
        );
        console.log(`Tamil voices found: ${tamilVoices.length}`, tamilVoices.map(v => v.name));
        setTamilTTSAvailable(tamilVoices.length > 0); // Browser TTS available
        
        // Note: Google TTS is always available as fallback for regional languages
      };
      
      // Load voices immediately
      loadVoices();
      
      // Also listen for the onvoiceschanged event (some browsers load voices asynchronously)
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  };

  const loadChatHistory = async () => {
    try {
      const response = await api.get("/api/chat/history");
      
      // Handle new modular backend response structure
      const historyData = response.data.success ? response.data.data : response.data.history;
      
      if (historyData && historyData.length > 0) {
        setChatHistory(historyData);
        // Load the most recent conversation
        loadConversation(historyData[0]);
      } else {
        // Start new conversation if no history
        startNewConversation();
      }
    } catch (err) {
      console.log("Failed to load chat history:", err);
      startNewConversation();
    }
  };

  const loadConversation = (conversation) => {
    if (conversation && conversation.message && conversation.response) {
      setMessages([
        {
          role: "user",
          content: conversation.message,
          timestamp: new Date(conversation.timestamp),
        },
        {
          role: "bot",
          content: conversation.response,
          timestamp: new Date(conversation.timestamp),
        },
      ]);
    } else {
      startNewConversation();
    }
  };

  const startNewConversation = () => {
    setMessages([
      {
        role: "bot",
        content: "🌱 Hello! I'm your AI Farming Assistant. I can help you with crop management, soil health, irrigation, and answer questions about your farm's sensor data. Ask me anything about your crops in any language!",
        timestamp: new Date(),
      },
    ]);
  };

  const fetchDeviceStatus = async () => {
    try {
      console.log("🔄 Fetching device status from ThingSpeak...");
      
      // Use the sensors/latest endpoint which returns ThingSpeak data with status
      const response = await api.get("/api/sensors/latest");
      
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        setSensorData(data);
        
        // Extract device status from the response
        if (data.deviceStatus) {
          setDeviceStatus({
            online: data.deviceStatus.online,
            lastUpdate: data.deviceStatus.lastUpdate,
            minutesAgo: data.deviceStatus.minutesAgo,
            status: data.deviceStatus.status
          });
        }
        
        console.log("✅ Device status updated:", {
          online: data.deviceStatus?.online,
          lastUpdate: data.deviceStatus?.lastUpdate,
          minutesAgo: data.deviceStatus?.minutesAgo,
          sensorData: {
            temperature: data.temperature,
            moisture: data.soilMoisture,
            humidity: data.humidity
          }
        });
      } else {
        console.log("❌ No sensor data available");
        setSensorData(null);
        setDeviceStatus({
          online: false,
          lastUpdate: null,
          minutesAgo: 0,
          status: "No data available"
        });
      }
    } catch (err) {
      console.error("❌ Failed to fetch device status:", err);
      setSensorData(null);
      setDeviceStatus({
        online: false,
        lastUpdate: null,
        minutesAgo: 0,
        status: "Connection failed"
      });
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await api.post("/api/chat", { message: input });
      
      const botMessage = {
        role: "bot",
        content: response.data.response,
        timestamp: new Date(),
      };

      // Update sensor data if available
      if (response.data.sensorData) {
        setSensorData(response.data.sensorData);
      }

      setMessages((prev) => [...prev, botMessage]);
      
      // Note: Backend automatically saves conversations, no need to reload history
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: "🌱 I apologize, but I'm having trouble connecting right now. Please try again in a moment, or feel free to ask me another farming question!",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Voice control functions
  const startListening = () => {
    if (!recognition) {
      console.error('Speech recognition not supported');
      return;
    }

    setIsListening(true);
    recognition.start();
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  };

const speakText = (text) => {
  if (!synthesis) return;

  synthesis.cancel();

  const detectedLang = detectLanguage(text);
  setDetectedLanguage(detectedLang);
  
  console.log('Speaking text in language:', detectedLang);

  // Try browser's built-in TTS first for all languages
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = detectedLang;
  utterance.rate = 0.9;

  const voices = synthesis.getVoices();
  console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));

  // Try to find exact language match
  const match = voices.find(v => v.lang === detectedLang);
  // Try to find language family match (e.g., ta for Tamil)
  const familyMatch = voices.find(v => v.lang.startsWith(detectedLang.split('-')[0]));
  // Fallback to English
  const fallback = voices.find(v => v.lang.includes("en"));

  utterance.voice = match || familyMatch || fallback;
  
  console.log('Selected voice:', utterance.voice?.name, utterance.voice?.lang);

  setCurrentVoice(utterance.voice?.name);

  utterance.onstart = () => setIsSpeaking(true);
  utterance.onend = () => setIsSpeaking(false);
  utterance.onerror = (error) => {
    console.error('Browser TTS error:', error);
    
    // If browser TTS fails for Indian languages, try Google TTS
    if (["ta-IN", "hi-IN", "te-IN", "bn-IN"].includes(detectedLang)) {
      console.log('Falling back to Google TTS for', detectedLang);
      speakWithGoogleTTS(text, detectedLang);
    } else {
      setIsSpeaking(false);
    }
  };

  synthesis.speak(utterance);
};

  // Speak message function for click handler
  const speakMessage = (text) => {
    if (!speechEnabled) {
      console.log('Speech is disabled');
      return;
    }
    
    // Detect language from the message content
    const detectedLang = detectLanguage(text);
    setDetectedLanguage(detectedLang);
    
    // Test Tamil voice availability
    if (detectedLang === 'ta-IN') {
      const voices = synthesis.getVoices();
      const tamilVoices = voices.filter(v => v.lang.includes('ta'));
      console.log('Tamil voices available:', tamilVoices.length, tamilVoices.map(v => `${v.name} (${v.lang})`));
      
      // If no Tamil voices, try Google TTS directly
      if (tamilVoices.length === 0) {
        console.log('No Tamil voices found, using Google TTS directly');
        speakWithGoogleTTS(text, detectedLang);
        return;
      }
    }
    
    // Use the existing speakText function
    speakText(text, detectedLang);
  };

  // Google TTS fallback for regional languages
  const speakWithGoogleTTS = (text, language) => {
    console.log(`Using Google TTS for ${language}:`, text);
    console.log('Text length:', text.length);
    console.log('Tamil characters detected:', /[\u0B80-\u0BFF]/.test(text));
    
    // Map language codes to Google TTS language codes
    const languageMap = {
      'ta-IN': 'ta',
      'hi-IN': 'hi', 
      'te-IN': 'te',
      'bn-IN': 'bn',
      'ml-IN': 'ml',
      'gu-IN': 'gu',
      'kn-IN': 'kn',
      'pa-IN': 'pa'
    };
    
    const googleLang = languageMap[language] || 'en';
    console.log('Google language code:', googleLang);
    
    // Try different Google TTS URL formats
    const testUrls = [
      `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.substring(0, 50))}&tl=${googleLang}&client=tw-ob`,
      `https://translate.google.com/translate_tts?ie=UTF-8&tl=${googleLang}&q=${encodeURIComponent(text.substring(0, 50))}`,
      `https://translate.google.com/translate_tts?client=gtx&ie=UTF-8&tl=${googleLang}&q=${encodeURIComponent(text.substring(0, 50))}`
    ];
    
    // Test each URL format
    let urlIndex = 0;
    
    const testNextUrl = () => {
      if (urlIndex >= testUrls.length) {
        console.log('All Google TTS URLs failed, falling back to English TTS');
        fallbackToEnglish();
        return;
      }
      
      const testUrl = testUrls[urlIndex];
      console.log(`Testing URL ${urlIndex + 1}:`, testUrl);
      
      const audio = new Audio();
      audio.src = testUrl;
      
      audio.oncanplay = () => {
        console.log(`URL ${urlIndex + 1} can play, using this format`);
        // If this URL works, use it for the full text
        speakFullTextWithFormat(testUrl.split('&q=')[0] + '&q=');
      };
      
      audio.onerror = (error) => {
        console.error(`URL ${urlIndex + 1} failed:`, error);
        urlIndex++;
        testNextUrl();
      };
      
      // Try to load the audio
      audio.load();
    };
    
    const speakFullTextWithFormat = (baseUrl) => {
      console.log('Using working URL format for full text:', baseUrl);
      
      // Break text into smaller chunks
      const chunkSize = 50; // Smaller chunks for better reliability
      const chunks = [];
      
      for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.substring(i, i + chunkSize));
      }
      
      console.log('Number of chunks:', chunks.length);
      
      // Speak chunks sequentially
      let currentChunk = 0;
      
      const speakNextChunk = () => {
        if (currentChunk >= chunks.length) {
          setIsSpeaking(false);
          return;
        }
        
        const chunk = chunks[currentChunk];
        const ttsUrl = baseUrl + encodeURIComponent(chunk);
        console.log('Playing chunk', currentChunk, ':', ttsUrl);
        
        const audio = new Audio();
        audio.src = ttsUrl;
        
        audio.onplay = () => {
          setIsSpeaking(true);
          setCurrentVoice(`Google TTS (${googleLang})`);
        };
        
        audio.onended = () => {
          currentChunk++;
          speakNextChunk();
        };
        
        audio.onerror = (error) => {
          console.error('Chunk playback failed:', error);
          currentChunk++;
          speakNextChunk();
        };
        
        audio.play().catch(error => {
          console.error('Audio play failed:', error);
          currentChunk++;
          speakNextChunk();
        });
      };
      
      speakNextChunk();
    };
    
    const fallbackToEnglish = () => {
      console.log('Falling back to English TTS');
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      
      const voices = synthesis.getVoices();
      const englishVoice = voices.find(voice => voice.lang.startsWith('en'));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
      
      utterance.onstart = () => {
        setIsSpeaking(true);
        setCurrentVoice('English fallback');
      };
      
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      synthesis.speak(utterance);
    };
    
    testNextUrl();
  };

  // Language detection function
  const detectLanguage = (text) => {
    console.log('Detecting language for text:', text.substring(0, 50) + '...');
    
    // Simple language detection based on character patterns
    const hindiPattern = /[\u0900-\u097F]/;
    const bengaliPattern = /[\u0980-\u09FF]/;
    const tamilPattern = /[\u0B80-\u0BFF]/;
    const teluguPattern = /[\u0C00-\u0C7F]/;
    const marathiPattern = /[\u0900-\u097F]/;
    const gujaratiPattern = /[\u0A80-\u0AFF]/;
    const kannadaPattern = /[\u0C80-\u0CFF]/;
    const malayalamPattern = /[\u0D00-\u0D7F]/;
    const punjabiPattern = /[\u0A00-\u0A7F]/;
    
    console.log('Tamil pattern test:', tamilPattern.test(text));
    console.log('Hindi pattern test:', hindiPattern.test(text));
    
    // Check for Indian languages
    if (hindiPattern.test(text) || marathiPattern.test(text)) {
      console.log('Detected Hindi/Marathi');
      return 'hi-IN'; // Hindi/Marathi
    } else if (bengaliPattern.test(text)) {
      console.log('Detected Bengali');
      return 'bn-IN'; // Bengali
    } else if (tamilPattern.test(text)) {
      console.log('Detected Tamil');
      return 'ta-IN'; // Tamil
    } else if (teluguPattern.test(text)) {
      console.log('Detected Telugu');
      return 'te-IN'; // Telugu
    } else if (gujaratiPattern.test(text)) {
      console.log('Detected Gujarati');
      return 'gu-IN'; // Gujarati
    } else if (kannadaPattern.test(text)) {
      console.log('Detected Kannada');
      return 'kn-IN'; // Kannada
    } else if (malayalamPattern.test(text)) {
      console.log('Detected Malayalam');
      return 'ml-IN'; // Malayalam
    } else if (punjabiPattern.test(text)) {
      console.log('Detected Punjabi');
      return 'pa-IN'; // Punjabi
    }
    
    // Check for other languages
    const spanishPattern = /[ñáéíóúü]/i;
    const frenchPattern = /[àâäéèêëïîôöùûüÿç]/i;
    const germanPattern = /[äöüß]/i;
    const arabicPattern = /[\u0600-\u06FF]/;
    const chinesePattern = /[\u4e00-\u9fff]/;
    const japanesePattern = /[\u3040-\u309f\u30a0-\u30ff]/;
    const russianPattern = /[\u0400-\u04FF]/;
    
    if (spanishPattern.test(text)) {
      return 'es-ES'; // Spanish
    } else if (frenchPattern.test(text)) {
      return 'fr-FR'; // French
    } else if (germanPattern.test(text)) {
      return 'de-DE'; // German
    } else if (arabicPattern.test(text)) {
      return 'ar-SA'; // Arabic
    } else if (chinesePattern.test(text)) {
      return 'zh-CN'; // Chinese
    } else if (japanesePattern.test(text)) {
      return 'ja-JP'; // Japanese
    } else if (russianPattern.test(text)) {
      return 'ru-RU'; // Russian
    }
    
    // Default to English
    console.log('Defaulting to English');
    return 'en-US';
  };

  const stopSpeaking = () => {
    if (synthesis) {
      synthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleSpeech = () => {
    setSpeechEnabled(!speechEnabled);
    if (isSpeaking) {
      stopSpeaking();
    }
  };

  const clearChat = () => {
    startNewConversation();
  };

  return (
    <div className="h-screen flex bg-white overflow-hidden flex-col lg:flex-row">
      {/* History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: showHistory ? 320 : 0, opacity: showHistory ? 1 : 0 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-r border-slate-100 bg-slate-50/30 flex flex-col w-full lg:w-[320px] absolute lg:relative h-full lg:h-auto z-10 lg:z-0"
          >
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Chat History
                </h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <button
                onClick={startNewConversation}
                className="w-full p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
              >
                <MessageSquarePlus className="w-4 h-4" />
                New Chat
              </button>
              {chatHistory.map((chat, index) => (
                <button
                  key={index}
                  onClick={() => loadConversation(chat)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="font-medium text-slate-900 text-sm truncate">
                    {chat.message}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {new Date(chat.timestamp).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Chat Header */}
        <div className="p-3 sm:p-4 lg:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-wrap gap-3 sm:gap-4 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 flex-1 min-w-0">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 sm:p-2 hover:bg-slate-200 rounded-xl transition-colors"
              title="Toggle Chat History"
            >
              <History className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
            </button>
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-green-600 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg shadow-green-600/20 flex-shrink-0">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5 lg:w-7 lg:h-7 text-white" />
            </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 flex items-center gap-2 truncate">
              Farmer Assistant
              <Sparkles className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-green-500 flex-shrink-0" />
            </h2>
            <div className="flex items-center gap-2">
              <span className={cn(
                "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full",
                deviceStatus.online ? "bg-green-500 animate-pulse" : "bg-red-500"
              )}></span>
              <span className="text-[8px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
                {deviceStatus.online ? "Online" : `Offline (${deviceStatus.minutesAgo}m ago)`}
              </span>
            </div>
            {sensorData && (
              <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 mt-1 text-[8px] sm:text-xs text-slate-500 flex-wrap">
                <div className="flex items-center gap-1">
                  <Droplets className="w-2 h-2 sm:w-3 sm:h-3 text-blue-500" />
                  <span>{sensorData.temperature}°C</span>
                </div>
                <div className="flex items-center gap-1">
                  <Thermometer className="w-2 h-2 sm:w-3 sm:h-3 text-orange-500" />
                  <span>{sensorData.moisture}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Wind className="w-2 h-2 sm:w-3 sm:h-3 text-cyan-500" />
                  <span>{sensorData.humidity}%</span>
                </div>
              </div>
            )}
            {!sensorData && (
              <div className="mt-1 text-[8px] sm:text-xs text-red-500">
                <span className="hidden sm:inline">{deviceStatus.status || "No sensor data available - device may be offline"}</span>
                <span className="sm:hidden">No sensor data</span>
              </div>
            )}
          </div>
        </div>
        <button 
          onClick={clearChat}
          className="p-2 sm:p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
          title="Clear Chat"
        >
          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Messages Area - WhatsApp Style Bubbles */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6 scrollbar-hide">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3",
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              {/* Avatar */}
              <div className={cn(
                "w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm",
                msg.role === "user" ? "bg-[#dcf8c6] order-2" : "bg-green-100 order-1"
              )}>
                {msg.role === "user" ? <User className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-[#128c7e]" /> : <Bot className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />}
              </div>

              {/* Message Bubble */}
              <div className={cn(
                "max-w-[70%] sm:max-w-[75%] lg:max-w-[80%] break-words",
                msg.role === "user" ? "order-1" : "order-2"
              )}>
                <div className={cn(
                  "px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl sm:rounded-3xl shadow-sm",
                  msg.role === "user" 
                    ? "bg-[#dcf8c6] text-[#111b21] rounded-br-sm" 
                    : "bg-white text-slate-800 rounded-bl-sm border border-slate-200"
                )}>
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-p:leading-normal">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                  
                  {/* Speech Button for Bot Messages */}
                  {msg.role === "bot" && (
                    <button
                      onClick={() => speakMessage(msg.content)}
                      className="mt-1 p-1.5 rounded-lg bg-[#e8f6f3] hover:bg-[#d1e7dd] text-[#128c7e] transition-all flex items-center gap-1"
                      title="Click to speak this message"
                    >
                      <Volume2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  )}
                </div>
                
                {/* Timestamp */}
                <p className={cn(
                  "text-[10px] sm:text-[11px] text-slate-500 mt-1 px-1",
                  msg.role === "user" ? "text-right" : "text-left"
                )}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Loading Indicator */}
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 sm:gap-3 mr-auto"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full bg-green-100 flex items-center justify-center shadow-sm">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />
            </div>
            <div className="bg-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - WhatsApp Style (Fixed at Bottom) */}
      <div className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 bg-slate-50/50 border-t border-slate-100 flex-shrink-0">
        <form onSubmit={handleSend} className="flex items-end gap-2 sm:gap-3">
          {/* Voice Input Button */}
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            disabled={!recognition}
            className={cn(
              "p-2.5 sm:p-3 rounded-full transition-all flex-shrink-0",
              isListening 
                ? "bg-red-500 text-white hover:bg-red-600 animate-pulse" 
                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
            )}
            title={recognition ? (isListening ? "Stop listening" : "Start voice input") : "Voice recognition not supported"}
          >
            {isListening ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          {/* Text Input Field */}
          <div className="flex-1 relative max-w-[600px]">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message"
              className="w-full bg-white rounded-[20px] sm:rounded-[25px] py-2.5 sm:py-3 px-4 sm:px-5 pr-12 sm:pr-14 focus:outline-none focus:ring-0 text-slate-900 placeholder-slate-400 text-sm sm:text-base border border-slate-200 shadow-sm"
            />
            
            {/* Speech Toggle Button - REMOVED */}
            <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {/* Speech Toggle Button REMOVED */}
            </div>
          </div>

          {/* Send/Record Button */}
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className={cn(
              "p-2.5 sm:p-3 rounded-full transition-all flex-shrink-0",
              input.trim() && !loading
                ? "bg-green-600 text-white hover:bg-green-700" 
                : "bg-slate-200 text-slate-600"
            )}
            title={input.trim() ? "Send message" : "Voice input"}
          >
            {input.trim() && !loading ? (
              <Send className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </button>
        </form>

        {/* Voice Status Indicator */}
        {speechEnabled && (
          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-500 mt-2 px-2">
            <div className={cn(
              "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full",
              tamilTTSAvailable ? "bg-green-600" : "bg-blue-500"
            )} />
            <span className="hidden sm:inline">
              {tamilTTSAvailable ? "Native Tamil TTS" : "Google TTS for Tamil"}
            </span>
            <span className="sm:hidden">
              {tamilTTSAvailable ? "Tamil" : "Google"}
            </span>
            {isSpeaking && currentVoice && (
              <span className="text-slate-500 hidden sm:inline">
                ({currentVoice})
              </span>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default Chatbot;
