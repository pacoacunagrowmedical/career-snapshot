import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import type { Store } from '../data/store'
import type { Candidato } from '../types'
import { analizarSeguro as analizar } from '../lib/analisis'
import { ETAPAS, FUENTES, etiquetaFuente } from '../lib/catalogos'
import { candidatosACsv, descargar } from '../lib/csv'
import { duracion, fechaCorta } from '../lib/fechas'
import { dinero } from '../lib/formato'
import { ConfirmarBorrado } from './ConfirmarBorrado'
import { ListaEtiquetas, SelectorEtiquetas } from './Etiquetas'
import { Tablero } from './Tablero'
import { moverAEtapa } from './seguimiento'
import { useDatos, useFiltros } from './datos'

const CLAVE_VISTA = 'snapshot-vista'
const vistaGuardada = (): 'lista' | 'tablero' => {
  try {
    return localStorage.getItem(CLAVE_VISTA) === 'tablero' ? 'tablero' : 'lista'
  } catch {
    return 'lista'
  }
}

export function CandidatosPage() {
  const s = useOutletContext<Store>()
  const { candidatos, puestos, etiquetas, error: errorCarga, recargar: cargar, aplicar, setEtiquetas } = useDatos()
  const f = useFiltros()
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [borrar, setBorrar] = useState<Candidato[] | null>(null)
  const [errorAccion, setError] = useState('')
  const error = errorCarga || errorAccion
  const [vista, setVista] = useState(vistaGuardada)

  const sueldos = useMemo(() => new Map(puestos.map((p) => [p.id, p.sueldoOfrecido])), [puestos])

  const filas = useMemo(
    () => (candidatos ? f.filtrar(candidatos).map((c) => ({ c, a: analizar(c, sueldos.get(c.puestoId) ?? null) })) : []),
    [candidatos, f.filtrar, sueldos],
  )

  const mover = async (cs: Candidato[], destino: string, orden?: number) => {
    aplicar(cs.map((c) => c.id), (c) => ({ ...c, etapa: destino, ...(orden !== undefined ? { orden } : {}) }))
    try {
      await moverAEtapa(s, cs, destino, orden)
    } catch (e) {
      setError(`No se pudo mover: ${(e as Error).message}`)
      cargar()
    }
  }

  const marcarEtiqueta = async (cs: Candidato[], etiquetaId: string, marcar: boolean) => {
    const nuevas = new Map(cs.map((c) => [c.id, marcar ? [...new Set([...c.etiquetas, etiquetaId])] : c.etiquetas.filter((x) => x !== etiquetaId)]))
    aplicar([...nuevas.keys()], (c) => ({ ...c, etiquetas: nuevas.get(c.id)! }))
    await Promise.all([...nuevas].map(([id, ets]) => s.actualizarCandidatos([id], { etiquetas: ets })))
  }

  const cambiarVista = (v: 'lista' | 'tablero') => {
    setVista(v)
    try {
      localStorage.setItem(CLAVE_VISTA, v)
    } catch {
      /* sin almacenamiento */
    }
  }

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
        <div className="vista-toggle" role="group" aria-label="Vista">
          <button className={vista === 'lista' ? 'activo' : ''} onClick={() => cambiarVista('lista')}>☰ Lista</button>
          <button className={vista === 'tablero' ? 'activo' : ''} onClick={() => cambiarVista('tablero')}>▥ Tablero</button>
        </div>
        <div className="spacer" />
        <a className="btn btn-sm" href="/" target="_blank" rel="noreferrer">Ver formulario ↗</a>
        <button className="btn btn-sm" onClick={() => exportar(filas.map((f) => f.c))} disabled={!filas.length}>Exportar CSV</button>
      </div>

      <div className="filtros">
        <input className="input" placeholder="Buscar por nombre, correo o empresa" value={f.valor('q')} onChange={(e) => f.set('q', e.target.value)} />
        <select className="select" value={f.valor('puesto')} onChange={(e) => f.set('puesto', e.target.value)}>
          <option value="">Todos los puestos</option>
          {puestos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <select className="select" value={f.valor('fuente')} onChange={(e) => f.set('fuente', e.target.value)}>
          <option value="">Todas las fuentes</option>
          {FUENTES.map((f) => <option key={f.valor} value={f.valor}>{f.etiqueta}</option>)}
        </select>
        <select className="select" value={f.valor('etapa')} onChange={(e) => f.set('etapa', e.target.value)}>
          <option value="">Todas las etapas</option>
          {ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <select className="select" value={f.valor('etiqueta')} onChange={(e) => f.set('etiqueta', e.target.value)}>
          <option value="">Todas las etiquetas</option>
          {etiquetas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
      </div>

      {vista === 'tablero' && candidatos.length > 0 ? (
        <Tablero s={s} filas={filas} etiquetas={etiquetas} consulta={f.consulta} onMover={(c, destino, orden) => mover([c], destino, orden)} />
      ) : !filas.length ? (
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
                <th>Etapa</th>
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
                      <Link className="nombre" to={`/panel/candidato/${c.id}${f.consulta}`}>{c.nombre}</Link>
                      <div className="muted small">
                        {c.origen === 'formulario-anterior' ? 'Formulario anterior' : etiquetaFuente(c.fuente)}
                        {c.pais && c.pais !== 'México' ? ` · ${c.pais}` : ''}
                        {c.numNotas > 0 && ` · 💬 ${c.numNotas}`}
                      </div>
                      <div style={{ marginTop: 4 }}><ListaEtiquetas ids={c.etiquetas} todas={etiquetas} chico /></div>
                    </td>
                    <td>
                      <select className="select select-sm" style={{ maxWidth: 190 }} value={c.etapa} onChange={(e) => mover([c], e.target.value)} aria-label={`Etapa de ${c.nombre}`}>
                        {ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                      </select>
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
          <select
            className="select select-sm"
            value=""
            onChange={(e) => e.target.value && mover(visiblesSel.map((f) => f.c), e.target.value)}
            aria-label="Mover seleccionados a otra etapa"
          >
            <option value="">Mover a…</option>
            {ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
          <SelectorEtiquetas
            s={s}
            todas={etiquetas}
            seleccion={etiquetas.filter((e) => visiblesSel.every((f) => f.c.etiquetas.includes(e.id))).map((e) => e.id)}
            parcial={etiquetas.filter((e) => visiblesSel.some((f) => f.c.etiquetas.includes(e.id))).map((e) => e.id)}
            onCambiar={(id, marcar) => marcarEtiqueta(visiblesSel.map((f) => f.c), id, marcar)}
            onEtiquetasCambiadas={setEtiquetas}
            arriba
          />
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
