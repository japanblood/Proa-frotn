import axios from 'axios';
import { tokenStorage } from '../auth/tokenStorage'; // <-- ajusta la ruta relativa si es necesario

// 1. Instancia base de Axios
const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  timeout: 15000,
});

// Rutas que NO necesitan token ni disparan redirección de sesión expirada
const PUBLIC_ENDPOINTS = ['/auth/login'];
const isPublic = (url = '') => PUBLIC_ENDPOINTS.some((p) => url.includes(p));

// 2. Interceptor de Peticiones (Request) - Adjunta el Token desde tokenStorage
httpClient.interceptors.request.use((config) => {
  const token = tokenStorage.get();

  if (token && !isPublic(config.url)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 3. Interceptor de Respuestas (Response) - Maneja el 401 (Expiración)
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isPublic(error.config?.url)) {
      tokenStorage.clear();
      window.location.replace('/login?expired=1');
    }
    return Promise.reject(error);
  }
);

export default httpClient;