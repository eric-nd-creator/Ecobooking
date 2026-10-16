import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    const status = err.response?.status;

    if (status === 401) {
      const wasLoggedIn = !!localStorage.getItem('token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (wasLoggedIn && !err.config?.url?.includes('/auth/login')) {
        toast.error('Your session expired — please sign in again.');
        window.location.href = '/login';
      }
    } else if (status === 403) {
      toast.error(err.response?.data?.message || "You don't have permission to do that.");
    } else if (status >= 500) {
      toast.error('Something went wrong on our end. Please try again.');
    } else if (!err.response) {
      toast.error('Cannot reach the server. Check your connection and try again.');
    }

    return Promise.reject(err);
  }
);

export default api;
