import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Thermometer,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // 🔹 Mock Data Generator
  const generateData = () => {
    const now = new Date();

    return Array.from({ length: 6 }, (_, i) => ({
      time: new Date(now - i * 60000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      temperature: Math.floor(25 + Math.random() * 10),
    })).reverse();
  };

  const fetchData = () => {
    setLoading(true);

    setTimeout(() => {
      const newData = generateData();
      setData(newData);
      setLastUpdate(new Date());
      setLoading(false);
    }, 800);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const latest = data[data.length - 1] || {};

  const stats = [
    {
      label: "Temperature",
      value: `${latest.temperature || 0}°C`,
      icon: Thermometer,
      color: "text-orange-600",
      bg: "bg-orange-50",
      trend: "+1.2%",
      status: "Normal",
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-slate-400">Last Sync</p>
            <p className="text-sm text-slate-600">
              {lastUpdate?.toLocaleTimeString() || "Never"}
            </p>
          </div>

          <button
            onClick={fetchData}
            className="p-3 bg-white border rounded-xl"
          >
            <RefreshCw
              className={`w-5 h-5 ${
                loading ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl shadow"
          >
            <div className="flex justify-between mb-3">
              <div className={`${stat.bg} p-3 rounded-xl`}>
                <stat.icon className={stat.color} />
              </div>
              <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
                {stat.status}
              </span>
            </div>

            <p className="text-slate-500">{stat.label}</p>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold">
                {stat.value}
              </h3>
              <span className="text-green-500 text-sm flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {stat.trend}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white p-8 rounded-2xl shadow">
        <h3 className="text-xl font-bold mb-6">
          Temperature Trend
        </h3>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />

              <Area
                type="monotone"
                dataKey="temperature"
                stroke="#f97316"
                fill="#f97316"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;