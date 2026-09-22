import axios from 'axios';

const formatApiBaseUrl = (rawUrl) => {
  let url = (rawUrl || 'http://localhost:5000/api/v1').trim().replace(/\/+$/, '');
  if (!url.endsWith('/api/v1')) {
    if (url.endsWith('/api')) {
      url = `${url}/v1`;
    } else {
      url = `${url}/api/v1`;
    }
  }
  return url;
};

const API_BASE_URL = formatApiBaseUrl(import.meta.env.VITE_API_URL);

// Create configured Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: inject JWT Bearer token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bhd_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Let browser set multipart/form-data with proper boundary for FormData
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle automatic refresh or standardized error unpacking
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('bhd_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          if (res.data?.success) {
            const { accessToken: newAccess, refreshToken: newRefresh } = res.data.data;
            localStorage.setItem('bhd_access_token', newAccess);
            if (newRefresh) localStorage.setItem('bhd_refresh_token', newRefresh);
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
            return axios(originalRequest);
          }
        } catch (refreshErr) {
          localStorage.removeItem('bhd_access_token');
          localStorage.removeItem('bhd_refresh_token');
          window.location.href = '/login';
        }
      }
    }
    const message = error.response?.data?.message || error.message || 'API request failed';
    return Promise.reject({ ...error.response?.data, message });
  }
);

/* ==========================================================================
   1. AUTHENTICATION APIS
   ========================================================================== */
export const authApi = {
  /**
   * Log in user with email and password
   * @param {{ email: string, password: string }} credentials
   * @returns {Promise<{ success: boolean, data: { user: Object, accessToken: string, refreshToken: string } }>}
   */
  login: (credentials) => apiClient.post('/auth/login', credentials),

  /**
   * Refresh JWT access token
   * @param {string} refreshToken
   */
  refresh: (refreshToken) => apiClient.post('/auth/refresh', { refreshToken }),

  /**
   * Log out currently authenticated session
   */
  logout: () => apiClient.post('/auth/logout'),

  /**
   * Get current authenticated user profile
   */
  getMe: () => apiClient.get('/auth/me'),
};

/* ==========================================================================
   2. USERS MANAGEMENT APIS (Admin Scoped)
   ========================================================================== */
export const usersApi = {
  /**
   * List users with optional role and jurisdiction filters
   * @param {{ page?: number, limit?: number, role?: string, district?: string }} [params]
   */
  getUsers: (params) => apiClient.get('/users', { params }),

  /**
   * Get single user by ID
   * @param {string} id
   */
  getUserById: (id) => apiClient.get(`/users/${id}`),

  /**
   * Provision new user
   * @param {{ name: string, email: string, password: string, role: string, jurisdiction?: Object }} data
   */
  createUser: (data) => apiClient.post('/users', data),

  /**
   * Update user details or role
   * @param {string} id
   * @param {Object} data
   */
  updateUser: (id, data) => apiClient.patch(`/users/${id}`, data),

  /**
   * Soft-delete/deactivate user
   * @param {string} id
   */
  deleteUser: (id) => apiClient.delete(`/users/${id}`),
};

/* ==========================================================================
   3. DOCUMENTS & UPLOADS APIS
   ========================================================================== */
export const documentsApi = {
  /**
   * Upload single scanned document / PDF
   * @param {FormData} formData - includes 'file', 'district', 'tehsil', 'village', 'languageHint'
   */
  uploadSingle: (formData) => apiClient.post('/documents/upload', formData),

  /**
   * Bulk upload multiple scanned records
   * @param {FormData} formData - includes 'files', 'district', etc.
   */
  uploadBulk: (formData) => apiClient.post('/documents/bulk-upload', formData),

  /**
   * List uploaded documents
   * @param {{ page?: number, limit?: number, status?: string }} [params]
   */
  getDocuments: (params) => apiClient.get('/documents', { params }),

  /**
   * Get document metadata by ID
   * @param {string} id
   */
  getDocumentById: (id) => apiClient.get(`/documents/${id}`),

  /**
   * Get raw document file URL
   * @param {string} id
   */
  getFileUrl: (id) => `${API_BASE_URL}/documents/${id}/file`,
};

/* ==========================================================================
   4. LAND RECORDS & VERIFICATION APIS
   ========================================================================== */
export const recordsApi = {
  /**
   * List land records with filtering and pagination
   * @param {{ page?: number, limit?: number, status?: string, district?: string, tehsil?: string, village?: string, surveyNumber?: string, ownerName?: string, confidenceMin?: number }} [params]
   */
  getRecords: (params) => apiClient.get('/records', { params }),

  /**
   * Get full structured land record by ID
   * @param {string} id
   */
  getRecordById: (id) => apiClient.get(`/records/${id}`),

  /**
   * Verifier correction with optimistic concurrency control
   * @param {string} id
   * @param {{ version: number, surveyNumber?: string, khasraNumber?: string, khataNumber?: string, plotArea?: Object, landownerDetails?: Array, location?: Object, landClassification?: string, status?: string }} updates
   */
  updateRecord: (id, updates) => apiClient.patch(`/records/${id}`, updates),

  /**
   * Approve record to VALIDATED status
   * @param {string} id
   */
  approveRecord: (id) => apiClient.post(`/records/${id}/approve`),

  /**
   * Reject record with reason
   * @param {string} id
   * @param {{ reason: string }} [data]
   */
  rejectRecord: (id, data) => apiClient.post(`/records/${id}/reject`, data),

  /**
   * Publish validated record to open public registry
   * @param {string} id
   */
  publishRecord: (id) => apiClient.post(`/records/${id}/publish`),

  /**
   * Get duplicate detection analysis for record
   * @param {string} id
   */
  getDuplicates: (id) => apiClient.get(`/records/${id}/duplicates`),

  /**
   * Get full immutable audit trail for record
   * @param {string} id
   */
  getRecordAudit: (id) => apiClient.get(`/records/${id}/audit`),

  /**
   * Export records in CSV or JSON format
   * @param {{ format?: 'csv' | 'json', district?: string, status?: string }} [params]
   */
  exportRecords: (params) => apiClient.get('/records/export', { params }),
};

/* ==========================================================================
   5. VERIFICATION TASK QUEUE APIS
   ========================================================================== */
export const verificationApi = {
  /**
   * Get verification queue tasks
   * @param {{ page?: number, limit?: number, status?: string, priority?: string, myTasks?: boolean }} [params]
   */
  getQueue: (params) => apiClient.get('/verification/queue', { params }),

  /**
   * Claim an open verification task
   * @param {string} taskId
   */
  claimTask: (taskId) => apiClient.post(`/verification/${taskId}/claim`),

  /**
   * Mark verification task completed
   * @param {string} taskId
   * @param {{ notes?: string }} [data]
   */
  completeTask: (taskId, data) => apiClient.post(`/verification/${taskId}/complete`, data),
};

/* ==========================================================================
   6. DASHBOARD & ANALYTICS APIS
   ========================================================================== */
export const dashboardApi = {
  /**
   * Overall system metrics (total processed, accuracy %, pending verifications, status breakdown)
   */
  getSummary: () => apiClient.get('/dashboard/summary'),

  /**
   * Regional breakdown by state or district
   * @param {'state' | 'district'} [level='district']
   */
  getByRegion: (level = 'district') => apiClient.get('/dashboard/by-region', { params: { level } }),

  /**
   * Extraction error and field-level correction statistics
   */
  getErrorStats: () => apiClient.get('/dashboard/error-stats'),

  /**
   * 30-day processing volume and accuracy trend
   * @param {number} [range=30]
   */
  getTrend: (range = 30) => apiClient.get('/dashboard/trend', { params: { range } }),
};

/* ==========================================================================
   7. GIS & CADASTRAL MAP APIS
   ========================================================================== */
export const gisApi = {
  /**
   * Get GeoJSON FeatureCollection of plot boundaries
   * @param {{ district?: string, tehsil?: string, village?: string, status?: string }} [params]
   */
  getPlots: (params) => apiClient.get('/gis/plots', { params }),

  /**
   * Update or attach GeoJSON polygon boundary to land record
   * @param {string} recordId
   * @param {{ geo: Object }} data
   */
  updatePlotBoundary: (recordId, data) => apiClient.patch(`/gis/records/${recordId}/geo`, data),
};

/* ==========================================================================
   8. ADMIN & CONFIGURATION APIS
   ========================================================================== */
export const adminApi = {
  /**
   * Get dynamic system configuration settings
   */
  getConfig: () => apiClient.get('/admin/config'),

  /**
   * Update system configuration setting
   * @param {{ key: string, value: any, description?: string }} data
   */
  updateConfig: (data) => apiClient.patch('/admin/config', data),

  /**
   * Get global system audit logs
   * @param {{ page?: number, limit?: number, entityType?: string, action?: string }} [params]
   */
  getAuditLogs: (params) => apiClient.get('/admin/audit-logs', { params }),

  /**
   * List external API integration clients
   */
  getApiClients: () => apiClient.get('/admin/api-clients'),

  /**
   * Create new API Client key for LRMS/DILRMP/GIS consumer
   * @param {{ clientName: string, scopes: string[], allowedRegions?: string[] }} data
   */
  createApiClient: (data) => apiClient.post('/admin/api-clients', data),

  /**
   * Update API client status or scopes
   * @param {string} id
   * @param {Object} data
   */
  updateApiClient: (id, data) => apiClient.patch(`/admin/api-clients/${id}`, data),
};

/* ==========================================================================
   9. EXTERNAL INTEGRATION APIS (Direct API-Key client wrapper)
   ========================================================================== */
export const integrationApi = {
  /**
   * Query records using x-api-key header
   * @param {string} apiKey
   * @param {{ district?: string, village?: string }} [params]
   */
  queryRecords: (apiKey, params) =>
    axios.get(`${API_BASE_URL}/integration/records`, {
      headers: { 'x-api-key': apiKey },
      params,
    }).then((r) => r.data),

  /**
   * Query GIS plots using x-api-key header
   * @param {string} apiKey
   * @param {{ district?: string }} [params]
   */
  queryGisPlots: (apiKey, params) =>
    axios.get(`${API_BASE_URL}/integration/gis/plots`, {
      headers: { 'x-api-key': apiKey },
      params,
    }).then((r) => r.data),
};

export default {
  auth: authApi,
  users: usersApi,
  documents: documentsApi,
  records: recordsApi,
  verification: verificationApi,
  dashboard: dashboardApi,
  gis: gisApi,
  admin: adminApi,
  integration: integrationApi,
};
