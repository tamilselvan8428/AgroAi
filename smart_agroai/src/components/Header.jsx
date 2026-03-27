import React from "react";
import { Bell, User, Menu, Sprout } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Header = ({ onMenuClick }) => {
  const { user } = useAuth();

  return (
    <header className="h-16 lg:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shadow-sm">
      {/* Mobile Menu Button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Menu className="w-6 h-6 text-slate-600" />
      </button>

      {/* AgroAI Branding - Centered */}
      <div className="flex-1 flex items-center justify-center lg:justify-start">
        <div className="flex items-center gap-2 group">
          <div className="bg-green-600 p-1.5 rounded-xl group-hover:rotate-12 transition-transform duration-300">
            <Sprout className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Agro<span className="text-green-600">Ai</span></span>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4 lg:gap-6">
        {/* Notifications */}
        <button className="relative p-2 rounded-full hover:bg-slate-100 transition-colors">
          <Bell className="w-5 h-5 lg:w-6 lg:h-6 text-slate-600" />
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
        </button>

        {/* User Info */}
        <div className="flex items-center gap-2 lg:gap-3 pl-4 lg:pl-6 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-900">{user?.name || "Farmer User"}</p>
            <p className="text-xs text-slate-500 font-medium hidden lg:block">{user?.email || "user@smartfarm.com"}</p>
          </div>
          <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-green-100 flex items-center justify-center border-2 border-green-500 shadow-sm">
            <User className="w-4 h-4 lg:w-6 lg:h-6 text-green-600" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
