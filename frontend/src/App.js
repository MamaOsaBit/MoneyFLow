import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import './i18n';  // Importa la configuración de internacionalización
import { useTranslation } from 'react-i18next';

// Importa los componentes principales de la app
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AddExpense from './components/AddExpense';
import ExpenseList from './components/ExpenseList';
import SharedExpenses from './components/SharedExpenses';
import Navigation from './components/Navigation';

// URL del backend, configurable por variables de entorno
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Contexto para manejar la autenticación globalmente
const AuthContext = React.createContext();

// Componente para proteger rutas privadas
const ProtectedRoute = ({ children }) => {
  const { user } = React.useContext(AuthContext);
  // Si el usuario está autenticado, muestra el contenido; si no, redirige a login
  return user ? children : <Navigate to="/login" />;
};

function App() {
  const [user, setUser] = useState(null); // Estado del usuario autenticado
  const [loading, setLoading] = useState(true); // Estado de carga inicial
  const { i18n } = useTranslation(); // Hook para cambiar el idioma

  // Al cargar la app, verifica si hay un token guardado y obtiene el usuario
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verifica el token obteniendo la info del usuario
      axios.get(`${API}/users/me`)
        .then(response => {
          setUser(response.data);
          // Cambia el idioma si el usuario tiene preferencia
          if (response.data.language && response.data.language !== i18n.language) {
            i18n.changeLanguage(response.data.language);
          }
        })
        .catch(() => {
          // Si el token es inválido, lo elimina
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [i18n]);

  // Función para iniciar sesión y guardar el token
  const login = (token, userInfo) => {
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userInfo);
    // Cambia el idioma si el usuario tiene preferencia
    if (userInfo.language && userInfo.language !== i18n.language) {
      i18n.changeLanguage(userInfo.language);
    }
  };

  // Función para cerrar sesión
  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  // Muestra un spinner mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  // Estructura principal de la app con rutas protegidas
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <Router>
        <div className="App min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
          {user && <Navigation />} {/* Muestra la barra de navegación si está autenticado */}
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/add-expense" element={
              <ProtectedRoute>
                <AddExpense />
              </ProtectedRoute>
            } />
            <Route path="/expenses" element={
              <ProtectedRoute>
                <ExpenseList />
              </ProtectedRoute>
            } />
            <Route path="/shared" element={
              <ProtectedRoute>
                <SharedExpenses />
              </ProtectedRoute>
            } />
            <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
          </Routes>
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

// Exporta el contexto para usarlo en otros componentes
export { AuthContext };
export default App;