const defaultApiBaseUrl = '/api'

export function getApiUrl(path: string, apiBaseUrl: string): string {
  const normalizedBaseUrl = apiBaseUrl.trim() || defaultApiBaseUrl
  const baseUrl = normalizedBaseUrl.replace(/\/+$/, '')
  const apiPath = path.startsWith('/') ? path : `/${path}`

  return `${baseUrl}${apiPath}`
}

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''
