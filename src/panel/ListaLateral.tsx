import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { Analisis } from '../lib/analisis'
import type { Candidato, Etiqueta, Puesto } from '../types'
import { ETAPAS, etapa } from '../lib/catalogos'
import { fechaCorta } from '../lib/fechas'
import { ListaEtiquetas } from './Etiquetas'
import type { useFiltros } from './datos'

/** Columna izquierda del perfil: los candidatos de la selección actual para saltar de uno a otro sin volver a la lista. */
export function ListaLateral(props: {
  filas: { c: Candidato; a: Analisis }[]
  actual: string
  puestos: Puesto[]
  etiquetas: Etiqueta[]
  filtros: ReturnType<typeof useFiltros>
  onOcultar: () => void
}) {
  const f = props.filtros
  const lista = useRef<HTMLDivElement>(null)

  // Mantener visible al candidato actual al navegar con las flechas.
  useEffect(() => {
    lista.current?.querySelector('.lateral-item.activo')?.scrollIntoView({ block: 'nearest' })
  }, [props.actual])

  return (
    <aside className="lateral no-print">
      <div className="lateral-cabeza">
        <div className="row" style={{ gap: 6 }}>
          <b className="small">{props.filas.length} {props.filas.length === 1 ? 'candidato' : 'candidatos'}</b>
          {f.activos > 0 && <button className="link-btn small" onClick={f.limpiar}>Quitar filtros</button>}
          <div className="spacer" />
          <button className="btn btn-sm btn-ghost" onClick={props.onOcultar} title="Ocultar lista">⟨⟨</button>
        </div>
        <input className="input input-sm" placeholder="Buscar" value={f.valor('q')} onChange={(e) => f.set('q', e.target.value)} />
        <select className="select select-sm" value={f.valor('puesto')} onChange={(e) => f.set('puesto', e.target.value)}>
          <option value="">Todos los puestos</option>
          {props.puestos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
          <select className="select select-sm" style={{ flex: 1, minWidth: 0 }} value={f.valor('etapa')} onChange={(e) => f.set('etapa', e.target.value)}>
            <option value="">Todas las etapas</option>
            {ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
          <select className="select select-sm" style={{ flex: 1, minWidth: 0 }} value={f.valor('etiqueta')} onChange={(e) => f.set('etiqueta', e.target.value)}>
            <option value="">Etiquetas</option>
            {props.etiquetas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>
      </div>
      <div className="lateral-lista" ref={lista}>
        {props.filas.map(({ c, a }) => {
          const rojas = a.banderas.filter((b) => b.nivel === 'rojo').length
          const amarillas = a.banderas.filter((b) => b.nivel === 'amarillo').length
          return (
            <Link key={c.id} to={`/panel/candidato/${c.id}${f.consulta}`} className={`lateral-item${c.id === props.actual ? ' activo' : ''}`}>
              <div className="nombre">{c.nombre}</div>
              <div className="muted small">{c.puestoNombre}</div>
              <div className="muted small">{etapa(c.etapa).nombre} · {fechaCorta(c.creado)}</div>
              <div className="row" style={{ gap: 8, marginTop: 4 }}>
                <ListaEtiquetas ids={c.etiquetas} todas={props.etiquetas} chico />
                {rojas > 0 && <span className="small"><span className="dot-lateral dot-rojo" />{rojas}</span>}
                {amarillas > 0 && <span className="small"><span className="dot-lateral dot-amarillo" />{amarillas}</span>}
                {c.numNotas > 0 && <span className="small muted">💬 {c.numNotas}</span>}
              </div>
            </Link>
          )
        })}
        {!props.filas.length && <p className="muted small" style={{ padding: 12 }}>Ningún candidato coincide con los filtros.</p>}
      </div>
    </aside>
  )
}
