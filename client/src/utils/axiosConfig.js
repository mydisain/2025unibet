import axios from 'axios';

// Always use the production URL for backend requests
// This ensures consistent behavior regardless of environment
console.log('Configuring axios to use production backend URL');

// Get API URL from environment variables or use default
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://unibet-2025-api.onrender.com';

// Create Axios instance with production URL
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false, // Don't send cookies with cross-origin requests
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// For local development (uncomment when needed):
// const axiosInstance = axios.create({
//   baseURL: 'http://localhost:5000', // Local development server
// });

// Log the baseURL for debugging
console.log('Axios baseURL:', axiosInstance.defaults.baseURL);

// Request interceptor for API calls
axiosInstance.interceptors.request.use(
  (config) => {
    const userInfo = localStorage.getItem('userInfo')
      ? JSON.parse(localStorage.getItem('userInfo'))
      : null;
    
    if (userInfo && userInfo.token) {
      config.headers.Authorization = `Bearer ${userInfo.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 (Unauthorized) or 403 (Forbidden) errors
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.error('Authentication error:', error.response.data);
      // You could redirect to login page or dispatch a logout action here
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
