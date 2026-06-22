import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { Tokens } from '../types';

const BASE_URL = 'http://127.0.0.1:8000/api/';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (error: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const getTokens = (): Tokens | null => {
  const access = localStorage.getItem('gymnisfit_access');
  const refresh = localStorage.getItem('gymnisfit_refresh');
  if (!access || !refresh) return null;
  return { access, refresh };
};

export const setTokens = (tokens: Tokens) => {
  localStorage.setItem('gymnisfit_access', tokens.access);
  localStorage.setItem('gymnisfit_refresh', tokens.refresh);
};

export const clearTokens = () => {
  localStorage.removeItem('gymnisfit_access');
  localStorage.removeItem('gymnisfit_refresh');
};

export const logout = async () => {
  const tokens = getTokens();
  if (tokens?.refresh) {
    try {
      await axios.post(`${BASE_URL}auth/logout/`, { refresh: tokens.refresh });
    } catch {
      // ignorar error: igual limpiamos local
    }
  }
  clearTokens();
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const tokens = getTokens();
    if (tokens?.access && config.headers) {
      config.headers.Authorization = `Bearer ${tokens.access}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const tokens = getTokens();
    if (!tokens?.refresh) {
      clearTokens();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const response = await axios.post(`${BASE_URL}auth/refresh/`, {
        refresh: tokens.refresh,
      });
      const newAccess = response.data.access as string;
      const newRefresh = response.data.refresh as string | undefined;
      setTokens({
        access: newAccess,
        refresh: newRefresh || tokens.refresh,
      });
      processQueue(null, newAccess);
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      }
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearTokens();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
