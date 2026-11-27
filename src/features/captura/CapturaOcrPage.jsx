import { useEffect, useState } from 'react'
import DatosExtraidos from '../solicitudes/DatosExtraidos'
import EstadoBadge from '../solicitudes/EstadoBadge'
import RevisionForm from '../solicitudes/RevisionForm'
import { getErrorMessage, solicitudesApi } from '../solicitudes/solicitudesApi'

const MAX_MB = 10

export default function CapturaOcrPage() {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [revisada, setRevisada] = useState(null)
  const [inputKey, setInputKey] = useState(0)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    setError('')
    if (!selected) return
    if (!selected.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen (JPG, PNG, etc.).')
      return
    }
    if (selected.size > MAX_MB * 1024 * 1024) {
      setError(`La imagen supera el límite de ${MAX_MB} MB.`)
      return
    }
    setFile(selected)
  }

  const handleUpload = async () => {
    setError('')
    setUploading(true)
    try {
      setResult(await solicitudesApi.ingestar(file))
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo procesar la imagen.'))
    } finally {
      setUploading(false)
    }
  }

  const reset = () => {
    setFile(null)
    setResult(null)
    setRevisada(null)
    setError('')
    setInputKey((k) => k + 1)
  }

  const estadoActual = revisada?.estadoRevision ?? result?.estadoRevision
  const advertencias = result?.advertencias ?? []

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Captura y OCR</h2>
        <p className="text-sm text-slate-500">
          Carga la imagen de una solicitud. Los datos extraídos no se consideran confirmados hasta que
          una persona los revise.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Columna izquierda: carga y vista previa */}
        <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <label
            htmlFor="archivo"
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 hover:border-indigo-400 hover:bg-indigo-50/40"
          >
            <span className="font-medium text-slate-700">
              {file ? 'Cambiar imagen' : 'Selecciona la imagen de la solicitud'}
            </span>
            <span className="mt-1 text-xs">Formatos de imagen · máx. {MAX_MB} MB</span>
            <input
              key={inputKey}
              id="archivo"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading || !!result}
              className="sr-only"
            />
          </label>

          {previewUrl && (
            <div className="space-y-2">
              <img
                src={previewUrl}
                alt="Vista previa de la solicitud"
                className="max-h-[28rem] w-full rounded-lg border border-slate-200 object-contain"
              />
              <p className="truncate text-xs text-slate-400">{file?.name}</p>
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            {!result && (
              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex-1 rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? 'Procesando OCR...' : 'Subir y extraer datos'}
              </button>
            )}
            {(result || file) && (
              <button
                type="button"
                onClick={reset}
                disabled={uploading}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                {result ? 'Nueva captura' : 'Quitar'}
              </button>
            )}
          </div>
        </div>

        {/* Columna derecha: resultado y revisión */}
        <div className="space-y-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          {!result ? (
            <div className="flex h-full min-h-48 items-center justify-center text-center text-sm text-slate-400">
              {uploading
                ? 'Analizando la imagen, esto puede tardar unos segundos...'
                : 'Aquí aparecerán los datos extraídos para su revisión.'}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-800">
                  Solicitud #{result.solicitudId}
                </h3>
                <EstadoBadge estado={estadoActual} />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-slate-500">Establecimiento:</span>
                <span className="font-medium text-slate-800">{result.establecimiento ?? '—'}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    result.establecimientoCreado
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {result.establecimientoCreado ? 'Nuevo registro' : 'Ya existía'}
                </span>
              </div>

              {advertencias.length > 0 && (
                <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-medium text-amber-800">Advertencias del OCR</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-amber-700">
                    {advertencias.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-800">Datos extraídos</h4>
                <DatosExtraidos
                  datos={result.datosExtraidos}
                  solicitudId={result.solicitudId}
                  editable={!revisada}
                  onSaved={(actualizada, payload) =>
                    setResult((prev) => ({
                      ...prev,
                      establecimiento: actualizada?.establecimiento ?? prev.establecimiento,
                      datosExtraidos: actualizada?.datosExtraidos ?? {
                        ...prev.datosExtraidos,
                        ...payload,
                      },
                    }))
                  }
                />
              </div>

              {revisada ? (
                <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
                  Revisión registrada: <strong>{revisada.estadoRevision}</strong>.
                </div>
              ) : (
                <RevisionForm solicitudId={result.solicitudId} onDone={setRevisada} />
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}