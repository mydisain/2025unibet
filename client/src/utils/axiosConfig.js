import axios from 'axios';

// Always use the production URL for backend requests
// This ensures consistent behavior regardless of environment
console.log('Configuring axios to always use production backend URL');

// Create Axios instance with explicit production URL
const axiosInstance = axios.create({
  baseURL: 'https://two025unibet-kardikeskus.onrender.com', // Production backend URL on Render.com
});

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
