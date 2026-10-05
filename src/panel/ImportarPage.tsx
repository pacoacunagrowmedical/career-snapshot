import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import type { Store } from '../data/store'
import type { Puesto } from '../types'
import { convertirCsv, decodificar, type Importado } from '../importar/formularioAnterior'
import { fechaCorta } from '../lib/fechas'
import { useDatos } from './datos'

interface Fila {
  solicitud: Importado
  avisos: string[]
  duplicado: boolean
  puestoNuevo: boolean
}

const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'puesto'

export function ImportarPage() {
  const s = useOutletContext<Store>()
  const { recargar } = useDatos()
  const [archivo, setArchivo] = useState('')
  const [filas, setFilas] = useState<Fila[] | null>(null)
  const [puestos, setPuestos] = useState<Puesto[]>([])
  const [error, setError] = useState('')
  const [importando, setImportando] = useState(false)
  const [hecho, setHecho] = useState<number | null>(null)

  const leer = async (f: File) => {
    setError('')
    setHecho(null)
    setFilas(null)
    setArchivo(f.name)
    try {
      const r = convertirCsv(decodificar(await f.arrayBuffer()))
      if (r.errores.length) return setError(r.errores.join(' '))
      const [existentes, ps] = await Promise.all([s.candidatos(), s.puestos()])
      const claves = new Set(existentes.map((c) => c.claveImportacion).filter(Boolean))
      const nombres = new Set(ps.map((p) => p.nombre.trim().toLowerCase()))
      setPuestos(ps)
      setFilas(
        r.registros.map(({ solicitud, avisos }) => ({
          solicitud,
          avisos,
          duplicado: claves.has(solicitud.claveImportacion),
          puestoNuevo: !!solicitud.puestoNombre && !nombres.has(solicitud.puestoNombre.trim().toLowerCase()),
        })),
      )
    } catch (e) {
      setError(`No se pudo leer el archivo: ${(e as Error).message}`)
    }
  }

  const nuevas = filas?.filter((f) => !f.duplicado) ?? []

  const importar = async () => {
    setImportando(true)
    setError('')
    try {
      // Puestos que ya no existen en el panel se crean ocultos (no aparecen en el formulario) para poder filtrar por ellos.
      const porNombre = new Map(puestos.map((p) => [p.nombre.trim().toLowerCase(), p.id]))
      for (const nombre of new Set(nuevas.filter((f) => f.puestoNuevo).map((f) => f.solicitud.puestoNombre.trim()))) {
        const id = `anterior-${slug(nombre)}`
        await s.guardarPuesto({ id, nombre, activo: false, orden: 100 + porNombre.size, sueldoOfrecido: null })
        porNombre.set(nombre.toLowerCase(), id)
      }
      await s.importarCandidatos(
        nuevas.map((f) => ({ ...f.solicitud, puestoId: porNombre.get(f.solicitud.puestoNombre.trim().toLowerCase()) ?? '' })),
      )
      setHecho(nuevas.length)
      recargar()
      setFilas(null)
    } catch (e) {
      setError(`La importación falló: ${(e as Error).message}. No se marcó nada como importado; puedes intentarlo de nuevo.`)
    } finally {
      setImportando(false)
    }
  }

  return (
    <div style={{ maxWidth: 980 }}>
      <h1 style={{ marginBottom: 6 }}>Importar del formulario anterior</h1>
      <p className="muted" style={{ marginBottom: 16 }}>
        Sube el CSV de respuestas de Google Forms (“Solicitud de empleo en Grow Medical - v3.2”). Puedes subir el mismo archivo
        cada vez que lleguen respuestas nuevas: las que ya se importaron se omiten.
      </p>

      <div className="card stack" style={{ marginBottom: 16 }}>
        <ol className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
          <li>Abre la hoja de respuestas del formulario en Google Sheets.</li>
          <li><b>Archivo → Descargar → Valores separados por comas (.csv)</b>.</li>
          <li>Selecciona aquí ese archivo, revisa la vista previa y confirma.</li>
        </ol>
        <label className="btn btn-agregar" style={{ cursor: 'pointer' }}>
          <span className="mas">↑</span>
          <span>
            {archivo ? `Archivo: ${archivo}` : 'Elegir archivo CSV'}
            <small>El archivo se procesa en tu navegador; solo se guardan los candidatos que confirmes</small>
          </span>
          <input type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && leer(e.target.files[0])} />
        </label>
        <div className="aviso small">
          El formulario anterior no preguntaba: cómo se enteró de la vacante, sueldo esperado, calificaciones de resultados y trato
          con la gente, puesto inicial y fechas de freelance. Esos datos aparecerán como <b>“Sin dato”</b>. La calificación del jefe
          (1 a 10) se convierte a la escala de 1 a 5: 9–10 → 5, 7–8 → 4, 5–6 → 3, 3–4 → 2, 1–2 → 1.
        </div>
      </div>

      {error && <div className="aviso aviso-amarillo" style={{ marginBottom: 16 }}>{error}</div>}

      {hecho !== null && (
        <div className="aviso" style={{ marginBottom: 16 }}>
          ✓ Se importaron <b>{hecho}</b> {hecho === 1 ? 'candidato' : 'candidatos'}. <Link to="/panel">Ver candidatos</Link>
        </div>
      )}

      {filas && (
        <>
          <div className="row" style={{ marginBottom: 10 }}>
            <b>{filas.length} respuestas en el archivo</b>
            <span className="muted">· {nuevas.length} nuevas · {filas.length - nuevas.length} ya importadas</span>
            <div className="spacer" />
            <button className="btn btn-primary" disabled={!nuevas.length || importando} onClick={importar}>
              {importando ? 'Importando…' : nuevas.length ? `Importar ${nuevas.length} ${nuevas.length === 1 ? 'candidato' : 'candidatos'}` : 'Nada nuevo que importar'}
            </button>
          </div>
          <div className="tabla-wrap">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Candidato</th>
                  <th>Puesto</th>
                  <th>Respondió</th>
                  <th className="num-col">Empleos</th>
                  <th>Estado</th>
                  <th>Revisar</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={i} style={f.duplicado ? { opacity: 0.55 } : undefined}>
                    <td><b>{f.solicitud.nombre || 'Sin nombre'}</b><div className="muted small">{f.solicitud.email}</div></td>
                    <td>
                      {f.solicitud.puestoNombre}
                      {f.puestoNuevo && <div className="muted small">Se creará como puesto oculto</div>}
                    </td>
                    <td className="tabular" style={{ whiteSpace: 'nowrap' }}>{fechaCorta(f.solicitud.creado)}</td>
                    <td className="num-col">{f.solicitud.empleos.length}</td>
                    <td>
                      <span className="chip">
                        <span className={`dot ${f.duplicado ? '' : 'dot-verde'}`} style={f.duplicado ? { background: 'var(--gris)' } : undefined} />
                        {f.duplicado ? 'Ya importado' : 'Nuevo'}
                      </span>
                    </td>
                    <td className="small">{f.avisos.length ? f.avisos.join(' · ') : <span className="muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
