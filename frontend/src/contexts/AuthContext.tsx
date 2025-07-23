import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { toast } from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  fullName: string;
  trainName?: string;
  currentStep: number;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  refreshAuth: () => Promise<boolean>;
}

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  trainName?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Clear all auth data
  const clearAuth = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    delete api.defaults.headers.common['Authorization'];
  };

  // Set auth data
  const setAuth = (userData: User, accessToken: string, refreshToken?: string) => {
    setUser(userData);
    setToken(accessToken);
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  };

  // Refresh authentication
  const refreshAuth = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        clearAuth();
        return false;
      }

      const response = await api.post('/auth/refresh', { refreshToken });
      const { user: userData, accessToken, refreshToken: newRefreshToken } = response.data;
      
      setAuth(userData, accessToken, newRefreshToken);
      return true;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      clearAuth();
      return false;
    }
  };

  // Verify existing token
  const verifyToken = async (accessToken: string): Promise<boolean> => {
    try {
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      const response = await api.get('/auth/me');
      setUser(response.data);
      setToken(accessToken);
      return true;
    } catch (error) {
      console.error('Failed to verify token:', error);
      // Try to refresh token if verification fails
      return await refreshAuth();
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('access_token');
      if (storedToken) {
        const isValid = await verifyToken(storedToken);
        if (!isValid) {
          clearAuth();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: userData, token: userToken, refreshToken } = response.data;

      setAuth(userData, userToken, refreshToken);
      toast.success(`Welcome back, ${userData.fullName}!`);
      return true;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      return false;
    }
  };
  const register = async (data: RegisterData): Promise<boolean> => {
    try {
      const response = await api.post('/auth/register', data);
      const { user: userData, token: userToken, refreshToken } = response.data;

      setAuth(userData, userToken, refreshToken);
      toast.success(`Welcome to Train at Trails, ${userData.fullName}!`);
      return true;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Registration failed';
      toast.error(message);
      return false;
    }
  };

  const logout = () => {
    clearAuth();
    toast.success('Logged out successfully');
  };

  const updateProfile = async (data: Partial<User>): Promise<boolean> => {
    try {
      const response = await api.put('/auth/profile', data);
      setUser(response.data.user);
      toast.success('Profile updated successfully');
      return true;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Profile update failed';
      toast.error(message);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateProfile,
    refreshAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
