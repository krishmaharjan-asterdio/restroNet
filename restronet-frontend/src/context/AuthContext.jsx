import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Rehydrate state on reload
    const storedUser = localStorage.getItem('user');
    const storedAdmin = localStorage.getItem('admin');
    
    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedAdmin) setAdmin(JSON.parse(storedAdmin));
    
    setLoading(false);
  }, []);

  const loginUser = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const registerUser = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const logoutUser = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const loginAdmin = async (email, password) => {
    const res = await api.post('/admin/auth/login', { email, password });
    localStorage.setItem('adminToken', res.data.token);
    localStorage.setItem('admin', JSON.stringify(res.data.admin));
    setAdmin(res.data.admin);
    return res.data;
  };

  const logoutAdmin = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, admin, loading, 
      loginUser, registerUser, logoutUser,
      loginAdmin, logoutAdmin,
      setUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
