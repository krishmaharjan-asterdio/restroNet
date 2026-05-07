import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the auth token to headers
api.interceptors.request.use(
  (config) => {
    // Check both user and admin tokens depending on the route, 
    // or just use whatever token is in localStorage.
    const token = localStorage.getItem('token');
    const adminToken = localStorage.getItem('adminToken');
    
    // Determine context based on the current browser URL
    const isAdminContext = window.location.pathname.startsWith('/admin');
    
    if (isAdminContext && adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    } else if (!isAdminContext && token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (adminToken) {
      // Fallback
      config.headers.Authorization = `Bearer ${adminToken}`;
    } else if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Optional: Handle token expiration globally (e.g., clear storage and redirect)
      if (error.response.data.message === 'Token expired. Please log in again.') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
