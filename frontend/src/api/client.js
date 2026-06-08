import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 60000,
})

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh on 401
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = useAuthStore.getState().refreshToken
      if (!refreshToken) {
        useAuthStore.getState().logout()
        if (!originalRequest.url.includes('/login')) window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const res = await axios.post('/api/v1/auth/refresh', { refresh_token: refreshToken })
        const { access_token, refresh_token } = res.data
        useAuthStore.getState().setTokens(access_token, refresh_token)
        processQueue(null, access_token)
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        return api(originalRequest)
      } catch (err) {
        processQueue(err, null)
        useAuthStore.getState().logout()
        if (!originalRequest.url.includes('/login')) window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api

// ─── API Functions ─────────────────────────────────────────────────────────

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken }),
}

export const patientsAPI = {
  list: (params) => api.get('/patients/', { params }),
  create: (data) => api.post('/patients/', data),
  get: (id) => api.get(`/patients/${id}`),
  update: (id, data) => api.put(`/patients/${id}`, data),
  delete: (id) => api.delete(`/patients/${id}`),
  studies: (id) => api.get(`/patients/${id}/studies`),
}

export const studiesAPI = {
  upload: (formData) => api.post('/studies/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000,
  }),
  get: (id) => api.get(`/studies/${id}`),
  status: (id) => api.get(`/studies/${id}/status`),
  segment: (id) => api.post(`/studies/${id}/segment`),
  image: (id) => `/api/v1/studies/${id}/image`,
}

export const resultsAPI = {
  get: (id) => api.get(`/results/${id}`),
  byStudy: (studyId) => api.get(`/results/by-study/${studyId}`),
  validate: (id, data) => api.put(`/results/${id}/validate`, data),
  overlay: (id) => `/api/v1/results/${id}/overlay`,
  mask: (id) => `/api/v1/results/${id}/mask`,
  pdf: (id, lang = 'uz') => `/api/v1/results/${id}/report/pdf?lang=${lang}`,
  downloadPdf: (id, lang = 'uz') => api.get(`/results/${id}/report/pdf?lang=${lang}`, { responseType: 'blob' }),
}

export const adminAPI = {
  stats: () => api.get('/admin/stats'),
  logs: (params) => api.get('/admin/logs', { params }),
}

export const usersAPI = {
  list: (params) => api.get('/users/', { params }),
  create: (data) => api.post('/users/', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
}
