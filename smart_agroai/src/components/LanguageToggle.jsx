import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from 'react-i18next';

const LanguageToggle = ({ className = "" }) => {
  const { toggleLanguage, isTamil, isEnglish } = useLanguage();
  const { t } = useTranslation();

  return (
    <button
      onClick={toggleLanguage}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-all ${className}`}
      title={t('navigation.toggleLanguage')}
    >
      <Globe className="w-4 h-4 text-slate-600" />
      <span className="text-sm font-medium text-slate-700">
        {isTamil ? 'தமிழ்' : 'English'}
      </span>
    </button>
  );
};

export default LanguageToggle;
