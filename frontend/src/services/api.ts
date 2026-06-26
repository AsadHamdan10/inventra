import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

console.log("API URL =", import.meta.env.VITE_API_URL);
console.log("BASE URL =", BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor — attach access token ─────────────────
api.interceptors.request.use(
  (config) => {
    // Token is set via store.setAuth — already on defaults
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor — handle 401, refresh token ─────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Endpoints that can legitimately return 401 as part of their own response
    // (wrong credentials, expired refresh token) must never trigger the
    // refresh-and-retry flow below — that flow is only for "access token expired
    // mid-session" on protected routes. Letting login/register hit it causes the
    // refresh call to fail too, which redirects to /login via a full page reload
    // and wipes out the component's loading/error state before it can ever resolve.
    const authEndpoints = ['/auth/login', '/auth/register', '/auth/refresh'];
    const isAuthEndpoint = authEndpoints.some((path) => originalRequest?.url?.includes(path));

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await api.post('/auth/refresh');
        const { accessToken } = response.data;

        // Update store
        const { useAuthStore } = await import('../store/authStore');
        useAuthStore.getState().setToken(accessToken);

        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        const { useAuthStore } = await import('../store/authStore');
        useAuthStore.getState().logout();
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;