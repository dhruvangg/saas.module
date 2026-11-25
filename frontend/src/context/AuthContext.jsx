import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const { data } = await api.get('/auth/me');
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
    } catch (err) {
      console.error('Failed to load user profile:', err);
      setUser(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const handleAuthResponse = (tokenData) => {
    localStorage.setItem('access_token', tokenData.access_token);
    if (tokenData.refresh_token) {
      localStorage.setItem('refresh_token', tokenData.refresh_token);
    }
    setUser(tokenData.user);
    localStorage.setItem('user', JSON.stringify(tokenData.user));
    return tokenData.user;
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    return handleAuthResponse(data);
  };

  const loginWithGoogle = async (credential) => {
    const { data } = await api.post('/auth/google', { credential });
    return handleAuthResponse(data);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.is_superuser) return true;
    if (!user.permissions || !Array.isArray(user.permissions)) return false;

    if (user.permissions.includes('*')) return true;
    if (user.permissions.includes(permission)) return true;

    // Check wildcard resource (e.g. 'user:*' matches 'user:read')
    const [resource] = permission.split(':');
    if (resource && user.permissions.includes(`${resource}:*`)) return true;

    return false;
  };

  const hasAnyPermission = (permissions = []) => {
    if (!permissions.length) return true;
    return permissions.some((p) => hasPermission(p));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithGoogle,
        logout,
        hasPermission,
        hasAnyPermission,
        refreshProfile: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
