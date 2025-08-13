import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = async (languageCode) => {
    try {
      // Change language in i18n
      await i18n.changeLanguage(languageCode);
      
      // Save language preference to user profile
      const token = localStorage.getItem('token');
      if (token) {
        await axios.put(`${API}/users/me`, {
          language: languageCode
        });
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Error changing language:', error);
      // Still change the language locally even if backend fails
      await i18n.changeLanguage(languageCode);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 glass-button text-sm rounded-lg"
        title={t('common.language')}
      >
        <Globe className="w-4 h-4" />
        <span className="hidden md:inline">{currentLanguage.flag}</span>
        <span className="hidden lg:inline">{currentLanguage.name}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 glass-card rounded-lg shadow-lg z-50 border border-white/10">
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-medium text-slate-400 uppercase tracking-wide border-b border-white/10">
                {t('common.language')}
              </div>
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => changeLanguage(language.code)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-white/5 transition-colors ${
                    i18n.language === language.code ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{language.flag}</span>
                    <span>{language.name}</span>
                  </div>
                  {i18n.language === language.code && (
                    <Check className="w-4 h-4 text-cyan-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;