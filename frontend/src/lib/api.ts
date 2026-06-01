import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

const isProduction = import.meta.env.MODE === 'production'
const api = axios.create({
  baseURL: (isProduction ? '/api' : import.meta.env.VITE_API_URL) || '/api',
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const res = await axios.post(
          `${(isProduction ? '/api' : import.meta.env.VITE_API_URL) || '/api'}/auth/refresh`,
          {},
          { withCredentials: true }
        )
        const newAccessToken = res.data.accessToken
        useAuthStore.getState().setAuth(useAuthStore.getState().user!, newAccessToken)
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch {
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
