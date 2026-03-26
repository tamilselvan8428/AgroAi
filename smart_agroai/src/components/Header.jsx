import React from "react";
import { Bell, User, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Header = () => {
  const { user } = useAuth();

  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
      <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 w-96">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search sensor data, crops..."
          className="bg-transparent border-none focus:ring-0 text-slate-600 placeholder:text-slate-400 w-full"
        />
      </div>
      <div className="flex items-center gap-6">
        <button className="relative p-2 rounded-full hover:bg-slate-100 transition-colors">
          <Bell className="w-6 h-6 text-slate-600" />
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
        </button>
        <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-900">{user?.name || "Farmer User"}</p>
            <p className="text-xs text-slate-500 font-medium">{user?.email || "user@smartfarm.com"}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center border-2 border-green-500 shadow-sm">
            <User className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
