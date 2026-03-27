import React from "react";
import { User, Menu, Sprout } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import LanguageToggle from "./LanguageToggle";
import { useTranslation } from "react-i18next";

const Header = ({ onMenuClick }) => {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <header className="h-20 lg:h-24 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shadow-sm">
      {/* Mobile Menu Button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-3 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Menu className="w-7 h-7 text-slate-600" />
      </button>

      {/* AgroAI Branding - Centered */}
      <div className="flex-1 flex items-center justify-center lg:justify-start">
        <div className="flex items-center gap-3 group">
          <div className="bg-green-600 p-2 rounded-xl group-hover:rotate-12 transition-transform duration-300">
            <Sprout className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <span className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
            {t('landing.title')}
          </span>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4 lg:gap-6">
        {/* Language Toggle */}
        <LanguageToggle />
        
        {/* User Info */}
        <div className="flex items-center gap-3 lg:gap-4 pl-5 lg:pl-8 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-base lg:text-lg font-bold text-slate-900">{user?.name || "Farmer User"}</p>
            <p className="text-xs sm:text-sm text-slate-500 font-medium hidden lg:block">{user?.email || "user@smartfarm.com"}</p>
          </div>
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-green-100 flex items-center justify-center border-2 border-green-500 shadow-sm">
            <User className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
