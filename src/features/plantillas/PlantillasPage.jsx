import { useEffect, useState } from 'react'
import { getErrorMessage, oficiosApi } from '../oficios/oficiosApi'
import { useAuth } from '../../auth/useAuth'

const EMPTY_PLANTILLA = {
  prefijoFolio: '',
  encabezado: '',
  textosLegales: '',
  asuntoPredeterminado: '',
  firmanteNombre: '',
  firmanteCargo: '',
  lemaAnual: '',
}

const EMPTY_DESTINATARIO = {
  titularNombre: '',
  titularCargo: '',
  atencionNombre: '',
  atencionCargo: '',
  correos: '',
}

export default function PlantillasPage() {
  const { permisos = [] } = useAuth()
  const puedeEditar = permisos.length === 0 || permisos.includes('PLANTILLAS:EDITAR')

  const [dependencias, setDependencias] = useState([])
  const [selectedDepId, setSelectedDepId] = useState(null)

  const [destForm, setDestForm] = useState(EMPTY_DESTINATARIO)
  const [form, setForm] = useState(EMPTY_PLANTILLA)
  const [actualizadoEn, setActualizadoEn] = useState(null)
  const [folioInfo, setFolioInfo] = useState(null)

  const [loadingDeps, setLoadingDeps] = useState(true)
  const [loadingPlantilla, setLoadingPlantilla] = useState(false)
  const [savingDest, setSavingDest] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // 1. Cargar dependencias con id, titular, atención y correos
  useEffect(() => {
    setLoadingDeps(true)
    oficiosApi
      .dependenciasPlantillas()
      .then((list) => {
        const deps = Array.isArray(list) ? list : []
        setDependencias(deps)
        if (deps.length > 0) {
          setSelectedDepId(deps[0].id)
        }
      })
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar las dependencias.')))
      .finally(() => setLoadingDeps(false))
  }, [])

  // 2. Sincronizar formulario de destinatario y cargar plantilla + folio
  useEffect(() => {
    if (!selectedDepId) return
    let cancelled = false

    const dep = dependencias.find((d) => d.id === selectedDepId)
    if (dep) {
      setDestForm({
        titularNombre: dep.titularNombre ?? '',
        titularCargo: dep.titularCargo ?? '',
        atencionNombre: dep.atencionNombre ?? '',
        atencionCargo: dep.atencionCargo ?? '',
        correos: dep.correos ?? '',
      })
    }

    setLoadingPlantilla(true)
    setError('')
    setNotice('')

    Promise.all([
      oficiosApi.obtenerPlantilla(selectedDepId).catch((err) => {
        if (err?.response?.status === 404 || err?.status === 404) return null
        throw err
      }),
      oficiosApi.estadoFolio(selectedDepId).catch(() => null),
    ])
      .then(([plantilla, folio]) => {
        if (cancelled) return
        if (plantilla) {
          setForm({
            prefijoFolio: plantilla.prefijoFolio ?? '',
            encabezado: plantilla.encabezado ?? '',
            textosLegales: plantilla.textosLegales ?? '',
            asuntoPredeterminado: plantilla.asuntoPredeterminado ?? '',
            firmanteNombre: plantilla.firmanteNombre ?? '',
            firmanteCargo: plantilla.firmanteCargo ?? '',
            lemaAnual: plantilla.lemaAnual ?? '',
          })
          setActualizadoEn(plantilla.actualizadoEn ?? null)
        } else {
          setForm(EMPTY_PLANTILLA)
          setActualizadoEn(null)
        }
        setFolioInfo(folio)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getErrorMessage(err, 'No se pudo cargar la plantilla de la dependencia.'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPlantilla(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedDepId, dependencias])

  const handleDestChange = (field) => (e) => {
    setDestForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleGuardarDestinatario = async (e) => {
    e.preventDefault()
    if (!selectedDepId) return

    setError('')
    setNotice('')

    if (!destForm.titularNombre.trim() || !destForm.titularCargo.trim()) {
      setError('El nombre y cargo del titular de la dependencia son obligatorios.')
      return
    }

    setSavingDest(true)
    try {
      const updated = await oficiosApi.guardarDestinatario(selectedDepId, {
        titularNombre: destForm.titularNombre.trim(),
        titularCargo: destForm.titularCargo.trim(),
        atencionNombre: destForm.atencionNombre.trim() || null,
        atencionCargo: destForm.atencionCargo.trim() || null,
        correos: destForm.correos.trim() || null,
      })

      setDependencias((prev) =>
        prev.map((d) => (d.id === selectedDepId ? { ...d, ...updated } : d))
      )
      setNotice('Titular y correos de la dependencia actualizados correctamente.')
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar la información de la dependencia.'))
    } finally {
      setSavingDest(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedDepId) return

    setError('')
    setNotice('')

    const prefijo = form.prefijoFolio.trim()
    if (!/^[A-Za-z0-9]{2,10}$/.test(prefijo)) {
      setError('El prefijo del folio debe tener entre 2 y 10 caracteres alfanuméricos (sin espacios ni guiones).')
      return
    }

    setSaving(true)
    try {
      const payload = {
        prefijoFolio: prefijo.toUpperCase(),
        encabezado: form.encabezado.trim() || null,
        textosLegales: form.textosLegales.trim() || null,
        asuntoPredeterminado: form.asuntoPredeterminado.trim() || null,
        firmanteNombre: form.firmanteNombre.trim() || null,
        firmanteCargo: form.firmanteCargo.trim() || null,
        lemaAnual: form.lemaAnual.trim() || null,
      }

      const updated = await oficiosApi.guardarPlantilla(selectedDepId, payload)
      setActualizadoEn(updated?.actualizadoEn ?? new Date().toISOString())
      setForm((prev) => ({ ...prev, prefijoFolio: updated?.prefijoFolio ?? payload.prefijoFolio }))

      const folio = await oficiosApi.estadoFolio(selectedDepId).catch(() => null)
      if (folio) setFolioInfo(folio)

      setNotice('Plantilla, folio y datos del Director guardados correctamente.')
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar la plantilla.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Plantillas y Folios</h2>
        <p className="text-sm text-slate-500">
          Configuración de destinatarios, correos predeterminados, firmante del oficio y secuencia de folios.
        </p>
      </div>

      {/* Selector de dependencia */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Seleccionar dependencia">
        {loadingDeps ? (
          <div className="h-9 w-64 animate-pulse rounded-full bg-slate-200" />
        ) : (
          dependencias.map((d) => (
            <button
              key={d.id ?? d.codigo}
              type="button"
              onClick={() => setSelectedDepId(d.id)}
              aria-pressed={selectedDepId === d.id}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedDepId === d.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 ring-1 ring-slate-300 hover:bg-slate-100'
              }`}
            >
              {d.nombre}
            </button>
          ))
        )}
      </div>

      {notice && (
        <div role="status" className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tarjeta de estado de folios */}
      {folioInfo && !loadingPlantilla && (
        <div className="grid grid-cols-1 gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">Año activo</p>
            <p className="mt-1 text-lg font-semibold text-slate-800">{folioInfo.anio}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">Último consecutivo usado</p>
            <p className="mt-1 text-lg font-semibold text-slate-800">{folioInfo.ultimoConsecutivo}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">Próximo folio a asignar</p>
            <p className="mt-1 font-mono text-lg font-semibold text-indigo-600">
              {folioInfo.proximoFolio || '—'}
            </p>
          </div>
        </div>
      )}

      {/* Formulario A: Destinatario (Titular de la dependencia / Arquitecta) y Correos */}
      <form
        onSubmit={handleGuardarDestinatario}
        className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
      >
        <div>
          <h3 className="text-base font-semibold text-slate-800">
            Titular de la dependencia (Destinatario del PDF) y correos
          </h3>
          <p className="text-xs text-slate-500">
            Datos del destinatario que aparece en el encabezado del oficio y correos predeterminados para envío.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Nombre del titular <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={160}
              disabled={!puedeEditar}
              value={destForm.titularNombre}
              onChange={handleDestChange('titularNombre')}
              placeholder="Ej. Arq. Verónica Osorio Gándara"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Cargo del titular <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={200}
              disabled={!puedeEditar}
              value={destForm.titularCargo}
              onChange={handleDestChange('titularCargo')}
              placeholder="Ej. Directora General de Ordenamiento Territorial"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Con atención a (opcional)
            </label>
            <input
              type="text"
              maxLength={160}
              disabled={!puedeEditar}
              value={destForm.atencionNombre}
              onChange={handleDestChange('atencionNombre')}
              placeholder="Ej. CMDTE. Salvador Castañeda Hermosillo"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Cargo de atención (opcional)
            </label>
            <input
              type="text"
              maxLength={200}
              disabled={!puedeEditar}
              value={destForm.atencionCargo}
              onChange={handleDestChange('atencionCargo')}
              placeholder="Ej. Director de Protección Civil y Bomberos"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Correos destinatarios predeterminados (separados por coma)
            </label>
            <input
              type="text"
              maxLength={500}
              disabled={!puedeEditar}
              value={destForm.correos}
              onChange={handleDestChange('correos')}
              placeholder="correo1@tonala.gob.mx, correo2@tonala.gob.mx"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
            />
          </div>
        </div>

        {puedeEditar && (
          <div className="flex justify-end border-t border-slate-200 pt-4">
            <button
              type="submit"
              disabled={savingDest || !selectedDepId}
              className="rounded-md bg-slate-800 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-900 disabled:opacity-50"
            >
              {savingDest ? 'Guardando...' : 'Guardar destinatario y correos'}
            </button>
          </div>
        )}
      </form>

      {/* Formulario B: Firmante (Director) y plantilla del oficio */}
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
      >
        {loadingPlantilla ? (
          <div className="space-y-4">
            <div className="h-10 animate-pulse rounded bg-slate-200" />
            <div className="h-10 animate-pulse rounded bg-slate-200" />
            <div className="h-24 animate-pulse rounded bg-slate-200" />
          </div>
        ) : (
          <>
            <div>
              <h3 className="text-base font-semibold text-slate-800">
                Firmante del oficio (Director)
              </h3>
              <p className="text-xs text-slate-500">
                Nombre y cargo que aparecen al calce en la firma del PDF generado.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Nombre del firmante
                  </label>
                  <input
                    type="text"
                    maxLength={160}
                    disabled={!puedeEditar}
                    value={form.firmanteNombre}
                    onChange={handleChange('firmanteNombre')}
                    placeholder="Ej. Mario Alberto Reyna Bustos"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Cargo del firmante
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    disabled={!puedeEditar}
                    value={form.firmanteCargo}
                    onChange={handleChange('firmanteCargo')}
                    placeholder="Ej. Director de Padrón y Licencias"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-200" />

            <div>
              <h3 className="text-base font-semibold text-slate-800">Folio y estructura del oficio</h3>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Prefijo de folio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    disabled={!puedeEditar}
                    value={form.prefijoFolio}
                    onChange={handleChange('prefijoFolio')}
                    placeholder="Ej. DPL o PC"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm uppercase text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    2 a 10 caracteres alfanuméricos sin espacios.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Asunto predeterminado
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    disabled={!puedeEditar}
                    value={form.asuntoPredeterminado}
                    onChange={handleChange('asuntoPredeterminado')}
                    placeholder="Ej. Se solicita verificación URGENTE"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Encabezado institucional
                  </label>
                  <input
                    type="text"
                    maxLength={300}
                    disabled={!puedeEditar}
                    value={form.encabezado}
                    onChange={handleChange('encabezado')}
                    placeholder="Ej. DIRECCIÓN DE PADRÓN Y LICENCIAS"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Lema anual
                  </label>
                  <input
                    type="text"
                    maxLength={250}
                    disabled={!puedeEditar}
                    value={form.lemaAnual}
                    onChange={handleChange('lemaAnual')}
                    placeholder="Ej. 2026, Año de Margarita Maza Parada"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700">
                  Textos legales / fundamento
                </label>
                <textarea
                  rows={5}
                  maxLength={10000}
                  disabled={!puedeEditar}
                  value={form.textosLegales}
                  onChange={handleChange('textosLegales')}
                  placeholder="Fundamento reglamentario y cierre legal del oficio..."
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
              <span className="text-xs text-slate-400">
                {actualizadoEn
                  ? `Última actualización: ${new Date(actualizadoEn).toLocaleString('es-MX')}`
                  : 'Sin cambios registrados aún'}
              </span>

              {puedeEditar && (
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar plantilla y firmante'}
                </button>
              )}
            </div>
          </>
        )}
      </form>
    </section>
  )
}