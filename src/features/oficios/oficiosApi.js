import httpClient from '../../api/httpClient'

// Soporta tanto VITE_API_URL=http://localhost:8080/api como .../api/v1
const BASE = httpClient.defaults.baseURL?.replace(/\/+$/, '').endsWith('/v1')
  ? '/oficios'
  : '/v1/oficios'

export const oficiosApi = {
  dependencias: async () => {
    const { data } = await httpClient.get(`${BASE}/dependencias`)
    return data
  },

  elegibles: async (dependencia) => {
    const { data } = await httpClient.get(`${BASE}/elegibles`, {
      params: { dependencia },
    })
    return data
  },

  listar: async ({ dependencia, page = 0, size = 20 } = {}) => {
    const params = { page, size }
    if (dependencia) params.dependencia = dependencia
    const { data } = await httpClient.get(BASE, { params })
    return data
  },

  consultar: async (id) => {
    const { data } = await httpClient.get(`${BASE}/${id}`)
    return data
  },

  descargarPdf: async (id, folioFallback = `oficio-${id}.pdf`) => {
    const response = await httpClient.get(`${BASE}/${id}/pdf`, {
      responseType: 'blob',
      timeout: 30000,
    })

    const disposition = response.headers?.['content-disposition'] || ''
    const match = disposition.match(/filename="?([^"]+)"?/i)
    const filename = match?.[1] || `${folioFallback}.pdf`

    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => window.URL.revokeObjectURL(url), 10000)
  },

  previsualizar: async (payload, indice = 0) => {
    const { data } = await httpClient.post(`${BASE}/previsualizar`, payload, {
      params: { indice },
    })
    return data
  },

  generar: async (payload) => {
    const { data } = await httpClient.post(BASE, payload, {
      timeout: 30000,
    })
    return data
  },

  enviar: async (id, destinatarios = null) => {
    const body = destinatarios && destinatarios.length > 0 ? { destinatarios } : undefined
    const { data } = await httpClient.post(`${BASE}/${id}/enviar`, body, {
      timeout: 30000,
    })
    return data
  },

  registrarAcuse: async (id, { numero, fecha }) => {
    const { data } = await httpClient.patch(`${BASE}/${id}/acuse`, {
      numero: numero.trim(),
      fecha,
    })
    return data
  },
}

export function getErrorMessage(err, fallback = 'Ocurrió un error inesperado.') {
  const status = err.response?.status
  if (status === 403) return 'No tienes permiso para realizar esta acción.'
  if (!err.response) return 'No se pudo conectar con el servidor.'
  const body = err.response.data
  if (Array.isArray(body?.errors) && body.errors.length > 0) {
    return body.errors.join(' · ')
  }
  return body?.message ?? body?.detail ?? body?.error ?? fallback
}