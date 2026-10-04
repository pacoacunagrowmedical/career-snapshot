import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import type { Store } from '../data/store'
import type { Candidato, Puesto } from '../types'
import { analizarSeguro as analizar } from '../lib/analisis'
import { FUENTES, etiquetaFuente } from '../lib/catalogos'
import { candidatosACsv, descargar } from '../lib/csv'
import { duracion, fechaCorta } from '../lib/fechas'
import { dinero } from '../lib/formato'
import { ConfirmarBorrado } from './ConfirmarBorrado'

export function CandidatosPage() {
  const s = useOutletContext<Store>()
  const [candidatos, setCandidatos] = useState<Candidato[] | null>(null)
  const [puestos, setPuestos] = useState<Puesto[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [puesto, setPuesto] = useState('')
  const [fuente, setFuente] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [borrar, setBorrar] = useState<Candidato[] | null>(null)
  const [error, setError] = useState('')

  const cargar = () =>
    Promise.all([s.candidatos(), s.puestos()])
      .then(([c, p]) => {
        setCandidatos(c)
        setPuestos(p)
      })
      .catch((e: Error) => setError(e.message))

  useEffect(() => {
    cargar()
  }, [s])

  const sueldos = useMemo(() => new Map(puestos.map((p) => [p.id, p.sueldoOfrecido])), [puestos])

  const filas = useMemo(() => {
    if (!candidatos) return []
    const q = busqueda.trim().toLowerCase()
    return candidatos
      .filter((c) => (!puesto || c.puestoId === puesto) && (!fuente || c.fuente === fuente))
      .filter((c) => !q || `${c.nombre} ${c.email} ${c.empleos.map((e) => e.empresa).join(' ')}`.toLowerCase().includes(q))
      .map((c) => ({ c, a: analizar(c, sueldos.get(c.puestoId) ?? null) }))
  }, [candidatos, busqueda, puesto, fuente, sueldos])

  const visiblesSel = filas.filter((f) => sel.has(f.c.id))
  const todos = filas.length > 0 && visiblesSel.length === filas.length

  const exportar = (cs: Candidato[]) => descargar(`candidatos-${new Date().toISOString().slice(0, 10)}.csv`, candidatosACsv(cs, sueldos))

  if (error) return <div className="aviso aviso-amarillo">No se pudieron cargar los candidatos: {error}</div>
  if (!candidatos) return <p className="muted">Cargando candidatos…</p>

  return (
    <div>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1>Candidatos</h1>
        <span className="muted">{filas.length} de {candidatos.length}</span>
        <div className="spacer" />
        <a className="btn btn-sm" href="/" target="_blank" rel="noreferrer">Ver formulario ↗</a>
        <button className="btn btn-sm" onClick={() => exportar(filas.map((f) => f.c))} disabled={!filas.length}>Exportar CSV</button>
      </div>

      <div className="filtros">
        <input className="input" placeholder="Buscar por nombre, correo o empresa" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <select className="select" value={puesto} onChange={(e) => setPuesto(e.target.value)}>
          <option value="">Todos los puestos</option>
          {puestos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <select className="select" value={fuente} onChange={(e) => setFuente(e.target.value)}>
          <option value="">Todas las fuentes</option>
          {FUENTES.map((f) => <option key={f.valor} value={f.valor}>{f.etiqueta}</option>)}
        </select>
      </div>

      {!filas.length ? (
        <div className="tabla-wrap vacio">{candidatos.length ? 'Ningún candidato coincide con los filtros.' : 'Aún no hay solicitudes. Comparte la liga del formulario para empezar a recibirlas.'}</div>
      ) : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todos"
                    checked={todos}
                    onChange={() => setSel(todos ? new Set() : new Set(filas.map((f) => f.c.id)))}
                  />
                </th>
                <th>Candidato</th>
                <th>Puesto</th>
                <th>Aplicó</th>
                <th>Trayectoria</th>
                <th className="num-col">Último sueldo</th>
                <th className="num-col">Espera</th>
                <th>Banderas</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ c, a }) => {
                const rojas = a.banderas.filter((b) => b.nivel === 'rojo')
                const amarillas = a.banderas.filter((b) => b.nivel === 'amarillo')
                const verdes = a.banderas.filter((b) => b.nivel === 'verde')
                const ofrecido = sueldos.get(c.puestoId)
                return (
                  <tr key={c.id} className={sel.has(c.id) ? 'sel' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar a ${c.nombre}`}
                        checked={sel.has(c.id)}
                        onChange={() => {
                          const n = new Set(sel)
                          if (n.has(c.id)) n.delete(c.id)
                          else n.add(c.id)
                          setSel(n)
                        }}
                      />
                    </td>
                    <td>
                      <Link className="nombre" to={`/panel/candidato/${c.id}`}>{c.nombre}</Link>
                      <div className="muted small">
                        {c.origen === 'formulario-anterior' ? 'Formulario anterior' : etiquetaFuente(c.fuente)}
                        {c.pais && c.pais !== 'México' ? ` · ${c.pais}` : ''}
                      </div>
                    </td>
                    <td>{c.puestoNombre}</td>
                    <td className="tabular" style={{ whiteSpace: 'nowrap' }}>{fechaCorta(c.creado)}</td>
                    <td>
                      {a.resumen}
                      {a.empleos.length > 0 && <div className="muted small">Promedio {duracion(a.duracionPromedio)} por empleo</div>}
                    </td>
                    <td className="num-col">{dinero(a.sueldoUltimo, c.moneda)}</td>
                    <td className="num-col">
                      {dinero(c.sueldoEsperado, c.moneda)}
                      {ofrecido && c.moneda === 'MXN' && <div className="muted small">Ofrecemos {dinero(ofrecido)}</div>}
                    </td>
                    <td>
                      <div className="chips">
                        {rojas.length > 0 && <span className="chip" title={rojas.map((b) => b.texto).join('\n')}><span className="dot dot-rojo" />{rojas.length} {rojas.length === 1 ? 'roja' : 'rojas'}</span>}
                        {amarillas.length > 0 && <span className="chip" title={amarillas.map((b) => b.texto).join('\n')}><span className="dot dot-amarillo" />{amarillas.length} {amarillas.length === 1 ? 'amarilla' : 'amarillas'}</span>}
                        {verdes.length > 0 && <span className="chip" title={verdes.map((b) => b.texto).join('\n')}><span className="dot dot-verde" />{verdes.length} {verdes.length === 1 ? 'verde' : 'verdes'}</span>}
                      </div>
                      {rojas[0] && <div className="small muted" style={{ marginTop: 4, maxWidth: 280 }}>{rojas[0].texto}</div>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {visiblesSel.length > 0 && (
        <div className="barra-seleccion">
          <b>{visiblesSel.length} {visiblesSel.length === 1 ? 'seleccionado' : 'seleccionados'}</b>
          <button className="btn btn-sm btn-ghost" style={{ color: '#fff' }} onClick={() => setSel(new Set())}>Quitar selección</button>
          <div className="spacer" />
          <button className="btn btn-sm" onClick={() => exportar(visiblesSel.map((f) => f.c))}>Exportar CSV</button>
          <button className="btn btn-sm btn-danger" onClick={() => setBorrar(visiblesSel.map((f) => f.c))}>Eliminar…</button>
        </div>
      )}

      {borrar && (
        <ConfirmarBorrado
          nombres={borrar.map((c) => `${c.nombre} · ${c.puestoNombre} · ${fechaCorta(c.creado)}`)}
          onCancelar={() => setBorrar(null)}
          onExportar={() => exportar(borrar)}
          onConfirmar={async () => {
            await s.borrarCandidatos(borrar.map((c) => c.id))
            setBorrar(null)
            setSel(new Set())
            await cargar()
          }}
        />
      )}
    </div>
  )
}
