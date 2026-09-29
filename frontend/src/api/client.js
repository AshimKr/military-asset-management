import axios from 'axios';

const explicitApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
const apiOrigin = (import.meta.env.VITE_API_ORIGIN || 'http://localhost:4000').replace(/\/$/, '');

export const api = axios.create({
  baseURL: explicitApiUrl || `${apiOrigin}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  },
);
