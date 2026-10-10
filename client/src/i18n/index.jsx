import React, { createContext, useContext, useState, useEffect } from 'react';
import { am } from './am.js';
import { en } from './en.js';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('dv_lang') || 'am';
  });

  const setLanguage = (lang) => {
    setLanguageState(lang);
    localStorage.setItem('dv_lang', lang);
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const dictionary = language === 'en' ? en : am;

  const t = (key) => {
    return dictionary[key] || en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dictionary }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
