import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Eye, EyeOff, Wallet, ArrowRight } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: ''
  });
  const [error, setError] = useState('');
  
  const { login } = useContext(AuthContext);
  const { t } = useTranslation();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : { email: formData.email, name: formData.name, password: formData.password };

      const response = await axios.post(`${API}${endpoint}`, payload);
      login(response.data.access_token, response.data.user);
    } catch (err) {
      // Log completo para depuración en consola
      console.error('Error en registro/login:', err);

      // Muestra el mensaje del backend si existe, o el status, o el mensaje genérico
      if (err.response) {
        if (err.response.data?.detail) {
          setError(`Error: ${err.response.data.detail}`);
        } else if (err.response.data) {
          setError(`Error: ${JSON.stringify(err.response.data)}`);
        } else {
          setError(`Error HTTP ${err.response.status}: ${err.response.statusText}`);
        }
      } else if (err.message) {
        setError(`Error: ${err.message}`);
      } else {
        setError(t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Language switcher in top-right */}
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 glass rounded-full mb-4 floating">
            <Wallet className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">{t('brand.name')}</h1>
          <p className="text-slate-400">{t('brand.tagline')}</p>
        </div>

        {/* Auth Form */}
        <div className="glass p-8 rounded-2xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-white mb-2">
              {isLogin ? t('auth.welcomeBack') : t('auth.createAccount')}
            </h2>
            <p className="text-slate-400">
              {isLogin ? t('auth.signInAccount') : t('auth.startTracking')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('auth.fullName')}
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 glass-input"
                  placeholder={t('auth.enterFullName')}
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('auth.emailAddress')}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 glass-input"
                placeholder={t('auth.enterEmail')}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pr-12 glass-input"
                  placeholder={t('auth.enterPassword')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 glass-button flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-400"></div>
              ) : (
                <>
                  <span>{isLogin ? t('auth.signIn') : t('auth.signUp')}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-cyan-400 hover:text-cyan-300 font-medium text-sm"
            >
              {isLogin ? t('auth.noAccount') : t('auth.haveAccount')}
            </button>
          </div>
        </div>

        {/* Features Preview */}
        <div className="mt-8 text-center">
          <div className="grid grid-cols-3 gap-4 text-xs text-slate-400">
            <div className="glass-card p-3 rounded-lg">
              <div className="w-8 h-8 mx-auto mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                <Wallet size={16} className="text-white" />
              </div>
              <div>{t('features.personalExpenses')}</div>
            </div>
            <div className="glass-card p-3 rounded-lg">
              <div className="w-8 h-8 mx-auto mb-2 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
              <div>{t('features.sharedTracking')}</div>
            </div>
            <div className="glass-card p-3 rounded-lg">
              <div className="w-8 h-8 mx-auto mb-2 bg-gradient-to-r from-green-400 to-teal-500 rounded-full flex items-center justify-center">
                <div className="w-4 h-2 bg-white rounded"></div>
              </div>
              <div>{t('features.smartAnalytics')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;