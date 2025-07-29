import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const authData = localStorage.getItem('wine-traceability-auth');
    if (authData) {
      const { token } = JSON.parse(authData).state;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('wine-traceability-auth');
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (error.response?.data?.error) {
      toast.error(error.response.data.error);
    } else if (error.message) {
      toast.error(error.message);
    }
    return Promise.reject(error);
  }
);

// Authentication APIs
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (userData) => api.put('/auth/profile', userData),
  changePassword: (passwordData) => api.put('/auth/change-password', passwordData),
  logout: () => api.post('/auth/logout'),
};

// Vineyard APIs
export const vineyardAPI = {
  registerBatch: (batchData) => api.post('/vineyard/register-batch', batchData),
  getWines: (params) => api.get('/vineyard/wines', { params }),
  getWineDetails: (wineId) => api.get(`/vineyard/wine/${wineId}`),
  certifyWine: (wineId, certData) => api.post(`/vineyard/wine/${wineId}/certify`, certData),
  transferWine: (wineId, transferData) => api.post(`/vineyard/wine/${wineId}/transfer`, transferData),
  getDashboardStats: () => api.get('/vineyard/dashboard-stats'),
  getHarvestHistory: (params) => api.get('/vineyard/harvest-history', { params }),
  performQualityCheck: (checkData) => api.post('/vineyard/quality-check', checkData),
};

// Winery APIs
export const wineryAPI = {
  processWine: (processData) => api.post('/winery/process-wine', processData),
  getWines: () => api.get('/winery/wines'),
  getWineDetails: (wineId) => api.get(`/winery/wine/${wineId}`),
  ageWine: (wineId, ageData) => api.post(`/winery/wine/${wineId}/age`, ageData),
  bottleWine: (wineId, bottleData) => api.post(`/winery/wine/${wineId}/bottle`, bottleData),
  transferWine: (wineId, transferData) => api.post(`/winery/wine/${wineId}/transfer`, transferData),
  getDashboardStats: () => api.get('/winery/dashboard-stats'),
};

// Distributor APIs
export const distributorAPI = {
  getWines: () => api.get('/distributor/wines'),
  receiveWine: (wineId, receiptData) => api.post(`/distributor/wine/${wineId}/receive`, receiptData),
  transferWine: (wineId, transferData) => api.post(`/distributor/wine/${wineId}/transfer`, transferData),
  getDashboardStats: () => api.get('/distributor/dashboard-stats'),
  getInventory: () => api.get('/distributor/inventory'),
};

// Consumer APIs
export const consumerAPI = {
  traceByQR: (qrCode) => api.get(`/consumer/trace/${qrCode}`),
  verifyWine: (wineId) => api.get(`/consumer/wine/${wineId}/verify`),
  getWineHistory: (wineId) => api.get(`/consumer/wine/${wineId}/history`),
  getWineCertificates: (wineId) => api.get(`/consumer/wine/${wineId}/certificates`),
};

// Certificate APIs
export const certificateAPI = {
  issue: (certData) => api.post('/certificates/issue', certData),
  verify: (certificateId) => api.get(`/certificates/verify/${certificateId}`),
  getByWine: (wineId) => api.get(`/certificates/wine/${wineId}`),
  updateStatus: (certificateId, statusData) => api.put(`/certificates/${certificateId}/status`, statusData),
};

// Transfer APIs
export const transferAPI = {
  initiate: (transferData) => api.post('/transfers/initiate', transferData),
  accept: (transferId, acceptData) => api.post(`/transfers/${transferId}/accept`, acceptData),
  updateStatus: (transferId, statusData) => api.put(`/transfers/${transferId}/status`, statusData),
  getByWine: (wineId) => api.get(`/transfers/wine/${wineId}`),
  getByOrganization: (orgId) => api.get(`/transfers/organization/${orgId}`),
};

// Admin APIs
export const adminAPI = {
  getSystemOverview: () => api.get('/admin/overview'),
  getAllOrganizations: () => api.get('/admin/organizations'),
  getAllWines: () => api.get('/admin/wines'),
  transferWineBetweenOrgs: (transferData) => api.post('/admin/transfer', transferData),
  createWineBatch: (wineData) => api.post('/admin/wine/create', wineData),
};

// General APIs
export const generalAPI = {
  getNetworkStatus: () => api.get('/network-status'),
  getHealth: () => api.get('/health'),
};

export default api;