import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Droplets, 
  Thermometer, 
  Wind, 
  Power, 
  CloudSun, 
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Wifi,
  WifiOff
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import axios from "axios";
import { cn } from "../lib/utils";
import WeatherWidget from "../components/WeatherWidget";
import MotorControl from "../components/MotorControl";
import api from "../lib/api";

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [deviceOnline, setDeviceOnline] = useState(false);
  const [lastDataTime, setLastDataTime] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    
    try {
      // Use backend API instead of direct ThingSpeak call
      const res = await api.get("/api/sensors/latest");
      
      if (res.data.success && res.data.data) {
        const sensorData = res.data.data;
        
        // Only log ThingSpeak data when received
        console.log("🌱 ThingSpeak Data Received:");
        console.log("   Temperature:", sensorData.temperature, "°C");
        console.log("   Soil Moisture:", sensorData.soilMoisture, "%");
        console.log("   Humidity:", sensorData.humidity, "%");
        console.log("   Motor Status:", sensorData.motorStatus);
        console.log("   Device Online:", sensorData.deviceStatus.online);
        console.log("   Last Update:", sensorData.deviceStatus.lastUpdate);
        
        // Create a single-item array for chart compatibility
        const feedArray = [{
          created_at: sensorData.timestamp,
          entry_id: sensorData.entryId,
          field1: sensorData.temperature,      // ✅ Fixed: field1 = temperature
          field2: sensorData.soilMoisture,    // ✅ Fixed: field2 = soil moisture
          field3: sensorData.motorStatus,
          field4: sensorData.humidity
        }];
        
        setData(feedArray);
        
        // Use backend's device status determination
        setDeviceOnline(sensorData.deviceStatus.online);
        setLastDataTime(new Date(sensorData.deviceStatus.lastUpdate));
        
        // Show appropriate message based on device status
        if (sensorData.deviceStatus.online) {
          setError(null);
        } else {
          setError(`Device offline - showing last data from ${sensorData.deviceStatus.minutesAgo} minutes ago`);
        }
      } else {
        setData([]);
        setDeviceOnline(false);
        setLastDataTime(null);
        setError(res.data.message || "No sensor data available");
      }
      
      setLastUpdate(new Date());
    } catch (err) {
      setError("Failed to fetch sensor data. Please check your connection.");
      setDeviceOnline(false);
      setLastDataTime(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const latest = data[data.length - 1] || {};
  const motorOn = latest.field3 === "1";

  const stats = [
    {
      label: "Device Status",
      value: deviceOnline ? "Online" : "Offline",
      icon: deviceOnline ? Wifi : WifiOff,
      color: deviceOnline ? "text-green-600" : "text-red-600",
      bg: deviceOnline ? "bg-green-50" : "bg-red-50",
      trend: deviceOnline ? "Connected" : "No Signal",
      status: deviceOnline ? "Active" : "Inactive",
    },
    {
      label: "Soil Moisture",
      value: `${latest.field1 || 0}%`,
      icon: Droplets,
      color: "text-blue-600",
      bg: "bg-blue-50",
      trend: "+2.5%",
      status: parseFloat(latest.field1) < 30 ? "Critical" : "Optimal",
    },
    {
      label: "Temperature",
      value: `${latest.field2 || 0}°C`,
      icon: Thermometer,
      color: "text-orange-600",
      bg: "bg-orange-50",
      trend: "-0.8%",
      status: parseFloat(latest.field2) > 35 ? "High" : "Normal",
    },
    {
      label: "Humidity",
      value: `${latest.field4 || 0}%`,
      icon: Wind,
      color: "text-cyan-600",
      bg: "bg-cyan-50",
      trend: "+1.2%",
      status: "Stable",
    },
    {
      label: "Motor Status",
      value: motorOn ? "Running" : "Standby",
      icon: Power,
      color: motorOn ? "text-green-600" : "text-slate-400",
      bg: motorOn ? "bg-green-50" : "bg-slate-50",
      status: motorOn ? "Active" : "Inactive",
    },
  ];

  const chartData = data.map(feed => ({
    time: new Date(feed.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    moisture: parseFloat(feed.field1),
    temp: parseFloat(feed.field2),
    humidity: parseFloat(feed.field4),
    motor: feed.field3 === "1" ? 1 : 0,
  }));

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Farm Overview</h1>
          <p className="text-slate-500 font-medium mt-1 text-sm sm:text-base">Real-time monitoring from IoT sensors</p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Last Sync</p>
            <p className="text-xs sm:text-sm font-bold text-slate-600">{lastUpdate?.toLocaleTimeString() || "Never"}</p>
          </div>
          <button 
            onClick={fetchData}
            className="p-2 sm:p-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className={cn("w-4 h-4 sm:w-5 sm:h-5 text-slate-600", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {(!deviceOnline && !loading) && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-center gap-4 text-orange-700 shadow-sm"
        >
          <div className="bg-orange-100 p-2 rounded-full">
            <WifiOff className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold">Device Offline</p>
            <p className="text-sm opacity-90">
              {lastDataTime ? `Last data received: ${lastDataTime.toLocaleString()}` : "No data received yet"}
            </p>
            {error && (
              <p className="text-xs opacity-75 mt-1">
                {error}
              </p>
            )}
          </div>
          {data.length > 0 && (
            <div className="text-right">
              <p className="text-xs font-bold opacity-75">Last Known Values</p>
              <p className="text-xs">🌡️ {latest.field1 || '--'}°C</p>
              <p className="text-xs">💧 {latest.field2 || '--'}%</p>
            </div>
          )}
        </motion.div>
      )}
      {parseFloat(latest.field1) < 30 && deviceOnline && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-4 text-red-700 shadow-sm"
        >
          <div className="bg-red-100 p-2 rounded-full">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold">Critical Alert: Low Soil Moisture</p>
            <p className="text-sm opacity-90">Moisture level is below 30%. Automated irrigation system is recommended.</p>
          </div>
          <button className="ml-auto px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors">
            Start Motor
          </button>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={cn(stat.bg, "p-3 rounded-2xl")}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <span className={cn(
                "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                stat.status === "Critical" ? "bg-red-100 text-red-600" : 
                stat.status === "Optimal" || stat.status === "Active" ? "bg-green-100 text-green-600" : 
                "bg-slate-100 text-slate-600"
              )}>
                {stat.status}
              </span>
            </div>
            <p className="text-slate-500 text-sm font-bold">{stat.label}</p>
            <div className="flex items-end gap-2 mt-1">
              <h3 className="text-2xl font-extrabold text-slate-900">{stat.value}</h3>
              {stat.trend && (
                <span className={cn(
                  "text-xs font-bold mb-1 flex items-center gap-0.5",
                  stat.trend.startsWith("+") ? "text-green-500" : "text-red-500"
                )}>
                  <TrendingUp className={cn("w-3 h-3", stat.trend.startsWith("-") && "rotate-180")} />
                  {stat.trend}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-900">Environmental Trends</h3>
            <div className="flex gap-4">
              {/* Chart controls would go here */}
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="time" 
                  stroke="#94a3b8"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#94a3b8"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px'
                  }}
                />
                <defs>
                  <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="moisture" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorMoisture)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="temp" 
                  stroke="#f97316" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorTemp)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Motor Control Widget */}
        <MotorControl />
      </div>

      {/* Weather Widget */}
      <div className="mt-8">
        <WeatherWidget />
      </div>
    </div>
  );
};

export default Dashboard;
