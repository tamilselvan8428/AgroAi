import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Sprout, Bug, MessageSquare, LogOut, Leaf } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

const Sidebar = () => {
  const { logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", path: "/app/dashboard", icon: LayoutDashboard },
    { name: "Crop Prediction", path: "/app/crop-prediction", icon: Sprout },
    { name: "Disease Detection", path: "/app/disease-detection", icon: Bug },
    { name: "Chatbot", path: "/app/chatbot", icon: MessageSquare },
  ];

  return (
    <aside className="fixed left-0 top-0 w-64 h-screen bg-slate-900 text-white flex flex-col shadow-2xl z-30 transition-all duration-300">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <NavLink to="/app/dashboard" className="flex items-center gap-3 group">
          <div className="bg-green-600 p-2 rounded-xl group-hover:scale-110 transition-transform duration-200 shadow-lg shadow-green-900/20">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
            AgroAI
          </span>
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={
                cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative",
                  isActive 
                    ? "bg-green-600 text-white shadow-lg shadow-green-900/40 translate-x-1" 
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                )
              }
            >
              <item.icon className={cn(
                "w-5 h-5 transition-transform duration-200 group-hover:scale-110",
                isActive ? "text-white" : "text-green-500/70 group-hover:text-green-400"
              )} />
              <span className="font-semibold text-sm">{item.name}</span>
              {isActive && (
                <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-slate-800/60">
        <button
          onClick={logout}
          className="flex items-center gap-3 p-3 w-full rounded-xl text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-all duration-300 group"
        >
          <div className="p-2 rounded-lg bg-slate-800 group-hover:bg-red-900/40 transition-colors">
            <LogOut className="w-5 h-5" />
          </div>
          <span className="font-semibold text-sm">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

