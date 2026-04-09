import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const { data } = await authAPI.me();
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      return data;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchMe().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const { data } = await authAPI.login(username, password);
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    const me = await fetchMe();
    return me;
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  const can = (permission) => {
    if (!user) return false;
    return user.permissions?.[permission] === true;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, fetchMe, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
