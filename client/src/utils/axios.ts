import axios from 'axios';
import { logger } from '@/utils/logger';

const TOKEN_KEY = 'jidian_campus_token';

const axiosInstance = axios.create({
  baseURL: (import.meta as any).env.VITE_API_BASE_URL || '',
  timeout: 15000,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    logger.error('请求拦截器错误', String(error));
    return Promise.reject(error);
  },
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
