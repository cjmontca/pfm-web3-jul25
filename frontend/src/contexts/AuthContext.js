import React, { createContext, useContext, useEffect } from 'react';
import { useAuthStore } from '../services/authStore';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const {
    user,
    token,
    isAuthenticated,
    loading,
    login,
    logout,
    updateUser,
    setLoading,
    clearAuth
  } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      setLoading(true);
      authAPI.getProfile()
        .then(response => {
          updateUser(response.data.data);
        })
        .catch(() => {
          clearAuth();
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [token, user, updateUser, clearAuth, setLoading]);

  const handleLogin = async (credentials) => {
    setLoading(true);
    try {
      const response = await authAPI.login(credentials);
      const { user: userData, tokens } = response.data.data;
      login(userData, tokens.accessToken);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || 'Login failed'
      };
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.warn('Logout API call failed:', error);
    }
    logout();
  };

  const handleRegister = async (userData) => {
    setLoading(true);
    try {
      const response = await authAPI.register(userData);
      const { user: newUser, tokens } = response.data.data;
      login(newUser, tokens.accessToken);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || 'Registration failed'
      };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated,
    loading,
    login: handleLogin,
    logout: handleLogout,
    register: handleRegister,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};