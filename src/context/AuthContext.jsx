import { createContext, useContext, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  const persist = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  // Returns the logged-in user on success, or { requires2FA: true, challenge }
  // when the account has an authenticator app enabled — the caller (Login page)
  // is responsible for prompting for the 6-digit code and calling verifyTwoFactor.
  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.requires2FA) return { requires2FA: true, challenge: data.challenge };
      return persist(data);
    } finally {
      setLoading(false);
    }
  };

  const verifyTwoFactor = async (challenge, code) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/2fa/verify-login', { challenge, code });
      return persist(data);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, phone) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { name, email, password, phone });
      return persist(data);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (partial) => {
    setUser(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, verifyTwoFactor, register, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
