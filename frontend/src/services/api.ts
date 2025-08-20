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

    // Don't intercept auth endpoints (login, register, refresh)
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || 
                          originalRequest.url?.includes('/auth/register') ||
                          originalRequest.url?.includes('/auth/refresh');

    // Handle both 401 (Unauthorized) and 403 (Forbidden) for invalid tokens
    // But skip auth endpoints to prevent interference with login errors
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry && !isAuthEndpoint) {
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
  // User cohort status
  checkCohortStatus: () => api.get('/auth/cohort-status'),

  getCohortInfo: () => api.get('/game/cohort-info'), // New endpoint for theme info

  getProgress: () => api.get(`/game/progress?_t=${Date.now()}`), // Add cache busting
  
  getCohortHistory: () => api.get('/game/cohort-history'),
  
  submitAnswer: (link: string, notes: string = '', questionId?: string, file?: File | null) => {
    console.log('submitAnswer called with:', { link, notes: notes?.length, questionId, hasFile: !!file });
    
    // Validate that we have valid IDs
    const validQuestionId = questionId && questionId !== 'NaN' && questionId !== 'undefined' ? questionId : undefined;
    
    console.log('Valid IDs:', { validQuestionId });
    
    // Always use FormData for consistency
    const formData = new FormData();
    formData.append('link', link);
    formData.append('notes', notes);
    
    if (validQuestionId) {
      formData.append('questionId', validQuestionId);
      console.log('Added questionId to FormData:', validQuestionId);
    }
    
    if (file) {
      formData.append('attachment', file);
      console.log('Added file to FormData:', file.name);
    }
    
    return api.post('/game/answer', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  requestResubmission: (answerId: string) => 
    api.post(`/game/answer/${answerId}/request-resubmission`),
  
  getAnswers: () => api.get('/game/answers'),

  getLeaderboard: () => api.get('/game/leaderboard'),

  getModules: () => api.get(`/game/modules?_t=${Date.now()}`), // Add cache busting

  getModuleDetails: (moduleNumber: number) => api.get(`/game/modules/${moduleNumber}`),

  // Mini questions
  getContentProgress: (questionId: string) => api.get(`/game/questions/${questionId}/content-progress`),
  
  submitMiniAnswer: (data: { miniQuestionId: string; linkUrl: string; notes?: string }) =>
    api.post('/game/mini-answer', data),
};

// Admin service
export const adminService = {
  getAllUsers: () => api.get('/admin/users'),
  
  getPendingAnswers: (cohortId?: string) => {
    const params = cohortId ? `?cohortId=${cohortId}` : '';
    return api.get(`/admin/pending-answers${params}`);
  },
  
  reviewAnswer: (answerId: number, status: 'approved' | 'rejected', feedback?: string) =>
    api.put(`/admin/answer/${answerId}/review`, { 
      status: status.toUpperCase(), 
      feedback 
    }),

  // New grading system methods
  gradeAnswer: (answerId: number, grade: string, feedback: string) =>
    api.put(`/admin/answer/${answerId}/review`, { 
      grade, 
      feedback 
    }),

  handleResubmissionRequest: (answerId: number, approve: boolean) =>
    api.put(`/admin/answer/${answerId}/resubmission-request`, { 
      approve 
    }),

  // Mini-answer resubmission requests
  requestMiniAnswerResubmission: (miniAnswerId: string, userId: number) =>
    api.post(`/admin/mini-answer/${miniAnswerId}/request-resubmission`, { userId }),
  
  getGameStats: (cohortId?: string) => {
    const params = cohortId ? `?cohortId=${cohortId}` : '';
    return api.get(`/admin/stats${params}`);
  },

  // Module management (mapped to questions for compatibility)
  getAllModules: (cohortId?: string) => {
    const params = cohortId ? `?cohortId=${cohortId}` : '';
    return api.get(`/admin/modules${params}`);
  },
  
  createModule: (moduleData: {
    moduleNumber: number;
    title: string;
    description: string;
    cohortId: string;
  }) => {
    // Use the real module creation endpoint
    return api.post('/admin/modules', moduleData);
  },
  
  updateModule: (moduleId: string, moduleData: {
    moduleNumber?: number;
    title?: string;
    description?: string;
    isActive?: boolean;
    isReleased?: boolean;
  }) => api.put(`/admin/modules/${moduleId}`, moduleData), // This route exists and works
  
  deleteModule: (moduleId: string) => {
    // Extract module number from moduleId (format: "module-X")
    const moduleNumber = parseInt(moduleId.replace('module-', ''));
    if (isNaN(moduleNumber)) {
      return Promise.reject(new Error('Invalid module ID format'));
    }
    // Cannot delete modules directly, would need to delete all questions in that module
    return Promise.reject(new Error('Module deletion not supported. Delete individual questions instead.'));
  },
  
  getModuleTopics: (moduleId: string) => {
    // Extract module number and get questions for that module
    const moduleNumber = parseInt(moduleId.replace('module-', ''));
    if (isNaN(moduleNumber)) {
      return Promise.reject(new Error('Invalid module ID format'));
    }
    interface Question {
      id: string | number;
      moduleNumber?: number;
      topicNumber?: number;
      questionNumber?: number;
      title: string;
      content?: string;
      description?: string;
      deadline?: string;
      points?: number;
      bonusPoints?: number;
      isReleased?: boolean;
    }

    return api.get('/admin/questions').then(response => {
      const questions: Question[] = response.data.questions || [];
      const moduleQuestions = questions.filter((q: Question) => (q.moduleNumber || 1) === moduleNumber);
      return { data: { topics: moduleQuestions.map((q: Question) => ({
        id: q.id,
        topicNumber: q.topicNumber || q.questionNumber,
        title: q.title,
        content: q.content,
        description: q.description,
        deadline: q.deadline,
        points: q.points,
        bonusPoints: q.bonusPoints,
        isReleased: q.isReleased,
        module: {
          id: `module-${moduleNumber}`,
          moduleNumber: moduleNumber,
          title: `Adventure ${moduleNumber}`
        }
      })) }};
    });
  },
  
  // Topic management (mapped to questions for compatibility)
  createTopic: (moduleId: string, topicData: {
    topicNumber: number;
    title: string;
    content: string;
    description: string;
    deadline: string;
    points: number;
    bonusPoints: number;
    contents?: Array<{
      title: string;
      material: string;
      miniQuestions: Array<{
        title: string;
        question: string;
        description?: string;
        resourceUrl?: string;
        releaseDate?: string;
      }>;
    }>;
  }) => {
    // Use the real topic creation endpoint
    return api.post(`/admin/modules/${moduleId}/topics`, topicData);
  },
  
  updateTopic: (topicId: string, topicData: {
    topicNumber?: number;
    title?: string;
    content?: string;
    description?: string;
    deadline?: string;
    points?: number;
    bonusPoints?: number;
    isReleased?: boolean;
    contents?: Array<{
      material: string;
      question: string;
      resourceUrl?: string;
      releaseDate?: string;
    }>;
  }) => {
    // Map topic update to question update using the new endpoint
    return api.put(`/admin/questions/${topicId}`, {
      topicNumber: topicData.topicNumber,
      title: topicData.title,
      content: topicData.content,
      description: topicData.description,
      deadline: topicData.deadline,
      points: topicData.points,
      bonusPoints: topicData.bonusPoints,
      isReleased: topicData.isReleased,
      contents: topicData.contents
    });
  },
  
  getTopicAnswers: (topicId: string) => api.get(`/admin/questions/${topicId}/answers`),
  
  releaseTopic: (topicId: string) => api.post(`/admin/questions/${topicId}/release`),
  
  deleteTopic: (topicId: string) => api.delete(`/admin/questions/${topicId}`),

  // Question management (legacy)
  getAllQuestions: (cohortId?: string) => {
    const params = cohortId ? { cohortId } : {};
    return api.get('/admin/questions', { params });
  },
  
  getQuestionAnswers: (questionId: number) => api.get(`/admin/questions/${questionId}/answers`),
  
  createQuestion: (questionData: {
    questionNumber: number;
    title: string;
    description: string;
    deadline: string;
    points: number;
    bonusPoints: number;
    contents?: Array<{
      title: string;
      material: string;
      miniQuestions: Array<{
        title: string;
        question: string;
        description?: string;
      }>;
    }>;
  }) => api.post('/admin/questions', questionData),

  updateQuestion: (questionId: string, questionData: {
    questionNumber?: number;
    title?: string;
    content?: string;
    description?: string;
    deadline?: string;
    points?: number;
    bonusPoints?: number;
    isReleased?: boolean;
    isActive?: boolean;
    moduleNumber?: number;
    topicNumber?: number;
    contents?: Array<{
      title: string;
      material: string;
      miniQuestions: Array<{
        title: string;
        question: string;
        description?: string;
      }>;
    }>;
  }) => api.put(`/admin/questions/${questionId}`, questionData),
  
  releaseQuestion: (questionId: number) => api.post(`/admin/questions/${questionId}/release`),
  
  deleteQuestion: (questionId: number) => api.delete(`/admin/questions/${questionId}`),

  // Content Management APIs
  getQuestionContents: (questionId: string) => api.get(`/admin/questions/${questionId}/contents`),
  
  createContent: (questionId: string, contentData: {
    title: string;
    material: string;
    miniQuestions?: Array<{
      title: string;
      question: string;
      description?: string;
    }>;
  }) => api.post(`/admin/questions/${questionId}/contents`, contentData),
  
  updateContent: (contentId: string, contentData: {
    title?: string;
    material?: string;
    isActive?: boolean;
  }) => api.put(`/admin/contents/${contentId}`, contentData),
  
  deleteContent: (contentId: string) => api.delete(`/admin/contents/${contentId}`),
  
  // Mini-Question Management APIs
  createMiniQuestion: (contentId: string, miniQuestionData: {
    title: string;
    question: string;
    description?: string;
  }) => api.post(`/admin/contents/${contentId}/mini-questions`, miniQuestionData),
  
  updateMiniQuestion: (miniQuestionId: string, miniQuestionData: {
    title?: string;
    question?: string;
    description?: string;
    isActive?: boolean;
  }) => api.put(`/admin/mini-questions/${miniQuestionId}`, miniQuestionData),
  
  deleteMiniQuestion: (miniQuestionId: string) => api.delete(`/admin/mini-questions/${miniQuestionId}`),
  
  getMiniAnswers: (miniQuestionId: string) => api.get(`/admin/mini-questions/${miniQuestionId}/answers`),

  // Get all mini-answers for admin dashboard
  getAllMiniAnswers: (cohortId?: string) => {
    const params = cohortId ? { cohortId } : {};
    return api.get('/admin/mini-answers', { params });
  },

  // Cohort management
  getAllCohorts: () => api.get('/admin/cohorts'),
  
  getCohortUsers: (cohortId: string, status?: string) => {
    const params = status ? { status } : {};
    return api.get(`/admin/cohort/${cohortId}/users`, { params });
  },
  
  getUsersWithCohorts: () => api.get('/admin/users-with-cohorts'),

  // Graduate user from cohort
  graduateUser: (userId: string, cohortId: string) => 
    api.post('/admin/graduate-user', { userId, cohortId }),

  // Theme management
  updateCohort: (cohortId: string, cohortData: {
    name?: string;
    description?: string;
    defaultTheme?: string;
  }) => api.patch(`/admin/cohorts/${cohortId}`, cohortData),

  updateModuleTheme: (moduleId: string, theme: string) => 
    api.patch(`/admin/modules/${moduleId}/theme`, { theme }),
};

// Game API for content and mini-questions
export const contentService = {
  submitMiniAnswer: (miniQuestionData: {
    miniQuestionId: string;
    linkUrl: string;
    notes?: string;
  }) => api.post('/game/mini-answer', miniQuestionData),
  
  getMiniAnswers: (questionId: string) => api.get(`/game/questions/${questionId}/mini-answers`),
  
  getContentProgress: (questionId: string) => api.get(`/game/questions/${questionId}/content-progress`),
};
