import React, { createContext, useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setCurrentLanguage(lng);
    localStorage.setItem('language', lng);
  };

  const toggleLanguage = () => {
    const newLang = currentLanguage === 'en' ? 'ta' : 'en';
    changeLanguage(newLang);
  };

  return (
    <LanguageContext.Provider value={{
      currentLanguage,
      changeLanguage,
      toggleLanguage,
      isTamil: currentLanguage === 'ta',
      isEnglish: currentLanguage === 'en'
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
