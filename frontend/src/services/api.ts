import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// API Types
export interface RegisterContentRequest {
  file: File;
  metadata: {
    title?: string;
    description?: string;
    author?: string;
    tags?: string[];
  };
  privacySettings: {
    isPublic: boolean;
    encrypted: boolean;
  };
  aiDetection: boolean;
}

export interface RegisterContentResponse {
  contentId: string;
  contentHash: string;
  walrusUrl: string;
  suiObjectId: string;
  transactionDigest: string;
  certificate: {
    id: string;
    url: string;
  };
  aiDetectionResults?: {
    isAiGenerated: boolean;
    confidence: number;
    model?: string;
  };
}

export interface VerifyContentRequest {
  contentHash?: string;
  url?: string;
  file?: File;
}

export interface VerifyContentResponse {
  verified: boolean;
  content: {
    id: string;
    hash: string;
    metadata: Record<string, unknown>;
    registrationDate: string;
    lastModified: string;
  };
  provenance: {
    chain: Array<{
      timestamp: string;
      action: string;
      actor: string;
      verified: boolean;
    }>;
  };
  consensus: {
    verified: boolean;
    confidence: number;
    validators: number;
  };
  aiDetection?: {
    isAiGenerated: boolean;
    confidence: number;
    model?: string;
  };
}

export interface DashboardStats {
  totalRegistrations: number;
  totalVerifications: number;
  trustScore: number;
  recentActivity: Array<{
    id: string;
    type: 'register' | 'verify';
    contentHash: string;
    timestamp: string;
    status: 'success' | 'pending' | 'failed';
  }>;
}

// API Methods
export const contentApi = {
  register: async (data: RegisterContentRequest): Promise<RegisterContentResponse> => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('metadata', JSON.stringify(data.metadata));
    formData.append('privacySettings', JSON.stringify(data.privacySettings));
    formData.append('aiDetection', String(data.aiDetection));

    const response = await api.post('/api/content/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  verify: async (data: VerifyContentRequest): Promise<VerifyContentResponse> => {
    if (data.file) {
      const formData = new FormData();
      formData.append('file', data.file);
      const response = await api.post('/api/content/verify', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    }

    const response = await api.post('/api/content/verify', {
      contentHash: data.contentHash,
      url: data.url,
    });
    return response.data;
  },

  getById: async (contentId: string) => {
    const response = await api.get(`/api/content/${contentId}`);
    return response.data;
  },

  getByHash: async (contentHash: string) => {
    const response = await api.get(`/api/content/hash/${contentHash}`);
    return response.data;
  },

  downloadCertificate: async (contentId: string): Promise<Blob> => {
    const response = await api.get(`/api/content/${contentId}/certificate`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/api/dashboard/stats');
    return response.data;
  },

  getUserContent: async (page = 1, limit = 10) => {
    const response = await api.get('/api/dashboard/content', {
      params: { page, limit },
    });
    return response.data;
  },

  getVerificationHistory: async (page = 1, limit = 10) => {
    const response = await api.get('/api/dashboard/verifications', {
      params: { page, limit },
    });
    return response.data;
  },
};

export const aiApi = {
  detectContent: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/ai/detect', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  analyzePatterns: async (contentId: string) => {
    const response = await api.get(`/api/ai/analyze/${contentId}`);
    return response.data;
  },
};

export default api;
