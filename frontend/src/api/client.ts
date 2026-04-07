import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? window.location.origin

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail ?? error.message ?? 'Unknown error'
    console.error('[API Error]', message)
    return Promise.reject(new Error(message))
  }
)
