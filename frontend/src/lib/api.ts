import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

const isProduction = import.meta.env.MODE === 'production'
const baseURL = (isProduction ? '/api' : import.meta.env.VITE_API_URL) || '/api'

const api = axios.create({
  baseURL,
  withCredentials: true,
})

let csrfToken: string | null = null

// Fetch CSRF token on startup
async function fetchCsrfToken() {
  try {
    const res = await axios.get(`${baseURL}/csrf-token`, { withCredentials: true })
    csrfToken = res.data.csrfToken
    // Also check for token in response header
    const headerToken = res.headers['x-csrf-token']
    if (headerToken) {
      csrfToken = headerToken
    }
  } catch (err) {
    console.error('Failed to fetch CSRF token', err)
  }
}

// Fetch CSRF token immediately
fetchCsrfToken()

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Add CSRF token for state-changing requests
  const method = config.method?.toUpperCase()
  if (csrfToken && method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    config.headers['x-csrf-token'] = csrfToken
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
