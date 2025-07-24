import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: unknown) => void; reject: (error: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle both 401 (Unauthorized) and 403 (Forbidden) for invalid tokens
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          const response = await api.post('/auth/refresh', { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = response.data;
          
          localStorage.setItem('access_token', accessToken);
          if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken);
          }
          
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          processQueue(null, accessToken);
          
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          // Clear all auth data thoroughly
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          delete api.defaults.headers.common['Authorization'];
          window.location.href = '/login';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        // Clear all auth data thoroughly
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth service
export const authService = {
  register: (userData: { name: string; email: string; password: string; trainName: string }) =>
    api.post('/auth/register', userData),
  
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  
  getProfile: () => api.get('/auth/me'),
};

// Game service
export const gameService = {
  getProgress: () => api.get('/game/status'),
  
  submitAnswer: (content: string) =>
    api.post('/game/answer', { content }),
  
  getAnswers: () => api.get('/game/answers'),

  getLeaderboard: () => api.get('/game/leaderboard'),
};

// Admin service
export const adminService = {
  getAllUsers: () => api.get('/admin/users'),
  
  getPendingAnswers: () => api.get('/admin/pending-answers'),
  
  reviewAnswer: (answerId: number, status: 'approved' | 'rejected', feedback?: string) =>
    api.put(`/admin/answer/${answerId}/review`, { 
      status: status.toUpperCase(), 
      feedback 
    }),
  
  getGameStats: () => api.get('/admin/stats'),
};
