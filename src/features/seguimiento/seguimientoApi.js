import httpClient from '../../api/httpClient'

// Soporta VITE_API_URL=http://localhost:8080/api y .../api/v1 (igual que oficiosApi)
const BASE = httpClient.defaults.baseURL?.replace(/\/+$/, '').endsWith('/v1')
  ? '/seguimientos'
  : '/v1/seguimientos'

export const SEMAFOROS = ['VERDE', 'AMARILLO', 'ROJO', 'MORADO']
export const DICTAMENES = [
  { value: 'FAVORABLE', label: 'Favorable' },
  { value: 'CONDICIONADO', label: 'Condicionado' },
  { value: 'NO_FAVORABLE', label: 'No favorable' },
]

/* ---------- Formatos ---------- */
export const formatFecha = (f) => {
  if (!f) return '—'
  const iso = String(f).length === 10 ? `${f}T00:00:00` : f
  return new Date(iso).toLocaleDateString('es-MX', { dateStyle: 'medium' })
}

export const formatFechaHora = (f) =>
  f ? new Date(f).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

/* ---------- Normalizadores ----------
   Único lugar que conoce los nombres exactos de los campos del JSON.
   Si algún nombre difiere del DTO real, se ajusta aquí y nada más. */
const pick = (obj, ...keys) => {
  for (const k of keys) if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k]
  return undefined
}

const normalizeRespuesta = (r) => ({
  id: r.id,
  fecha: pick(r, 'fechaRegistro', 'registradoEn', 'fecha', 'creadoEn'),
  usuario: pick(r, 'registradoPor', 'usuario', 'creadoPor'),
  observaciones: r.observaciones,
  nombreArchivo: pick(r, 'nombreArchivo', 'archivoNombre', 'nombreOriginal'),
})

const normalizeSolicitud = (s) => {
  if (s !== null && typeof s === 'object') {
    const id = pick(s, 'id', 'solicitudId')
    return { id, folio: pick(s, 'folio', 'folioSolicitud') ?? `#${id}` }
  }
  return { id: s, folio: String(s) }
}

export const normalizeExpediente = (e = {}) => ({
  id: e.id,
  folioOficio: pick(e, 'folioOficio', 'oficioFolio', 'folio'),
  dependenciaId: pick(e, 'dependenciaId', 'dependencia'),
  dependenciaNombre: pick(e, 'dependenciaNombre', 'nombreDependencia', 'dependencia'),
  solicitudes: (pick(e, 'solicitudes', 'solicitudesVinculadas', 'solicitudIds') ?? []).map(
    normalizeSolicitud
  ),
  asunto: e.asunto,
  fechaInicio: pick(e, 'fechaInicioConteo', 'fechaInicio', 'inicioConteo'),
  diasHabiles: pick(e, 'diasHabiles', 'diasHabilesTranscurridos'),
  semaforo: e.semaforo,
  cerrado: !!pick(e, 'cerrado', 'cerrada'),
  dictamen: pick(e, 'dictamenFinal', 'dictamen'),
  observacionesCierre: pick(e, 'observacionesCierre', 'observacionesFinales'),
  fechaCierre: pick(e, 'fechaCierre', 'cerradoEn'),
  respuestas: (e.respuestas ?? []).map(normalizeRespuesta),
})

const normalizeResumen = (r = {}) => {
  const dependencias = (pick(r, 'dependencias', 'porDependencia') ?? []).map((d) => ({
    id: pick(d, 'dependenciaId', 'id', 'codigo'),
    nombre: pick(d, 'dependenciaNombre', 'nombre'),
    activos: pick(d, 'activos', 'totalActivos', 'total') ?? 0,
    semaforos: pick(d, 'semaforos', 'conteoSemaforo', 'porSemaforo'),
  }))
  const semaforos = pick(r, 'semaforos', 'global', 'conteoGlobal', 'porSemaforo') ?? {}
  const sumaSemaforos = SEMAFOROS.reduce((acc, s) => acc + (semaforos[s] ?? 0), 0)
  return {
    dependencias,
    semaforos,
    totalActivos: pick(r, 'totalActivos', 'activos') ?? sumaSemaforos,
  }
}

/* ---------- Errores ---------- */
export function getErrorMessage(err, fallback = 'Ocurrió un error inesperado.') {
  const status = err.response?.status
  if (status === 403) return 'No tienes permiso para realizar esta acción.'
  if (!err.response) return 'No se pudo conectar con el servidor.'
  const body = err.response.data
  if (Array.isArray(body?.errors) && body.errors.length > 0) return body.errors.join(' · ')
  return body?.message ?? body?.detail ?? body?.error ?? fallback
}

/* ---------- Archivos ---------- */
const parseFilename = (disposition = '', fallback) => {
  const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1])
    } catch {
      /* cae al siguiente formato */
    }
  }
  const plain = disposition.match(/filename="?([^";]+)"?/i)
  return plain?.[1] || fallback
}

const esVisible = (type = '') => type === 'application/pdf' || type.startsWith('image/')

async function obtenerArchivo(respuestaId, fallbackName) {
  try {
    const response = await httpClient.get(`${BASE}/respuestas/${respuestaId}/archivo`, {
      responseType: 'blob',
      timeout: 60000,
    })
    const type = (response.headers?.['content-type'] || response.data?.type || '').split(';')[0]
    return {
      blob: new Blob([response.data], { type }),
      filename: parseFilename(
        response.headers?.['content-disposition'],
        fallbackName || `respuesta-${respuestaId}`
      ),
      type,
    }
  } catch (err) {
    // Con responseType 'blob' el cuerpo del error también llega como Blob
    if (err.response?.data instanceof Blob) {
      try {
        err.response.data = JSON.parse(await err.response.data.text())
      } catch {
        err.response.data = {}
      }
    }
    throw err
  }
}

export const seguimientoApi = {
  resumen: async () => {
    const { data } = await httpClient.get(`${BASE}/resumen`)
    return normalizeResumen(data)
  },

  listar: async ({ dependenciaId, semaforo, cerrado, q, page = 0, size = 20 } = {}) => {
    const params = { page, size }
    if (dependenciaId) params.dependenciaId = dependenciaId
    if (semaforo) params.semaforo = semaforo
    if (typeof cerrado === 'boolean') params.cerrado = cerrado
    if (q?.trim()) params.q = q.trim()

    const { data } = await httpClient.get(BASE, { params })
    const content = Array.isArray(data) ? data : (data?.content ?? [])
    return {
      content: content.map(normalizeExpediente),
      totalElements: data?.totalElements ?? content.length,
      totalPages: data?.totalPages ?? 1,
      page: data?.page ?? data?.number ?? page,
    }
  },

  // Asume GET /{id} con el expediente completo (incluye respuestas)
  consultar: async (id) => {
    const { data } = await httpClient.get(`${BASE}/${id}`)
    return normalizeExpediente(data)
  },

  // FormData: axios 1.x fija Content-Type multipart con boundary; no se debe forzar manualmente.
  registrarRespuesta: async (id, { archivo, observaciones, cerrar, dictamen }) => {
    const form = new FormData()
    form.append('archivo', archivo)
    if (observaciones?.trim()) form.append('observaciones', observaciones.trim())
    form.append('cerrar', String(!!cerrar))
    if (cerrar && dictamen) form.append('dictamen', dictamen)

    const { data } = await httpClient.post(`${BASE}/${id}/respuestas`, form, { timeout: 60000 })
    return data
  },

  // modo 'ver': abre en pestaña nueva (PDF/imagen); si no se puede visualizar, descarga.
  // `win` es una pestaña abierta de forma síncrona en el clic para evitar el bloqueo de popups.
  abrirArchivo: async (respuestaId, { modo = 'descargar', win = null, fallbackName } = {}) => {
    const { blob, filename, type } = await obtenerArchivo(respuestaId, fallbackName)
    const url = window.URL.createObjectURL(blob)

    if (modo === 'ver' && esVisible(type)) {
      if (win && !win.closed) win.location.href = url
      else window.open(url, '_blank')
    } else {
      win?.close()
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
    }
    setTimeout(() => window.URL.revokeObjectURL(url), 60000)
  },
}
