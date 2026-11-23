import httpClient from '../../api/httpClient'

export const MAX_OBSERVACIONES = 500

export const solicitudesApi = {
  // OCR puede tardar: se amplía el timeout (el global es de 15 s).
  // No fijes Content-Type a mano: el navegador agrega el boundary del multipart.
  ingestar: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await httpClient.post('/solicitudes/ingesta', formData, {
      timeout: 120000,
    })
    return data
  },

  listar: async ({ estadoRevision, page = 0, size = 20 }) => {
    const params = { page, size }
    if (estadoRevision) params.estadoRevision = estadoRevision
    const { data } = await httpClient.get('/solicitudes', { params })
    return data
  },

  revisar: async (id, { estado, observaciones }) => {
    const { data } = await httpClient.patch(`/solicitudes/${id}/revisar`, {
      estado,
      observaciones: observaciones?.trim() || null,
    })
    return data
  },
}

// Adapta la respuesta paginada sin depender de la forma exacta de PageResponse
export function normalizePage(data) {
  const content = data?.content ?? data?.items ?? data?.data ?? (Array.isArray(data) ? data : [])
  const totalElements = data?.totalElements ?? data?.total ?? content.length
  const size = data?.size ?? data?.pageSize ?? 20
  const totalPages = data?.totalPages ?? Math.max(1, Math.ceil(totalElements / size))
  const page = data?.number ?? data?.page ?? 0
  return { content, totalElements, totalPages, page }
}

export function getErrorMessage(err, fallback = 'Ocurrió un error inesperado.') {
  const status = err.response?.status
  if (status === 403) return 'No tienes permiso para realizar esta acción.'
  if (status === 413) return 'El archivo es demasiado grande para el servidor.'
  if (!err.response) return 'No se pudo conectar con el servidor.'
  const body = err.response.data
  return body?.message ?? body?.detail ?? body?.error ?? fallback
}