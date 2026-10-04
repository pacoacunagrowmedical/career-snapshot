import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Analisis } from '../lib/analisis'
import type { Candidato, Etiqueta } from '../types'
import { ETAPAS } from '../lib/catalogos'
import { fechaCorta } from '../lib/fechas'
import { ListaEtiquetas } from './Etiquetas'

/** Vista tipo Trello: una columna por etapa. Las tarjetas se arrastran entre columnas para cambiar de etapa. */
export function Tablero(props: {
  filas: { c: Candidato; a: Analisis }[]
  etiquetas: Etiqueta[]
  onMover: (c: Candidato, etapa: string) => void
}) {
  const [arrastrando, setArrastrando] = useState<string | null>(null)
  const [sobre, setSobre] = useState<string | null>(null)

  return (
    <div className="tablero">
      {ETAPAS.map((et) => {
        const enEtapa = props.filas.filter((f) => f.c.etapa === et.id)
        return (
          <section
            key={et.id}
            className={`columna${sobre === et.id ? ' sobre' : ''}`}
            onDragOver={(e) => {
              if (!arrastrando) return
              e.preventDefault()
              setSobre(et.id)
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setSobre(null)
            }}
            onDrop={(e) => {
              e.preventDefault()
              const f = props.filas.find((x) => x.c.id === arrastrando)
              if (f) props.onMover(f.c, et.id)
              setArrastrando(null)
              setSobre(null)
            }}
          >
            <header>
              <span>{et.nombre}</span>
              <span className="muted">{enEtapa.length}</span>
            </header>
            <div className="tarjetas">
              {enEtapa.map(({ c, a }) => {
                const rojas = a.banderas.filter((b) => b.nivel === 'rojo').length
                const amarillas = a.banderas.filter((b) => b.nivel === 'amarillo').length
                return (
                  <Link
                    key={c.id}
                    to={`/panel/candidato/${c.id}`}
                    className={`tarjeta${arrastrando === c.id ? ' arrastrando' : ''}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', c.id)
                      setArrastrando(c.id)
                    }}
                    onDragEnd={() => {
                      setArrastrando(null)
                      setSobre(null)
                    }}
                  >
                    <ListaEtiquetas ids={c.etiquetas} todas={props.etiquetas} chico />
                    <div className="nombre">{c.nombre}</div>
                    <div className="muted small">{c.puestoNombre}</div>
                    <div className="meta">
                      <span>{fechaCorta(c.creado)}</span>
                      {rojas > 0 && <span title="Banderas rojas"><span className="dot dot-rojo" style={{ display: 'inline-block', marginRight: 3 }} />{rojas}</span>}
                      {amarillas > 0 && <span title="Banderas amarillas"><span className="dot dot-amarillo" style={{ display: 'inline-block', marginRight: 3 }} />{amarillas}</span>}
                      {c.numNotas > 0 && <span title="Notas">💬 {c.numNotas}</span>}
                    </div>
                  </Link>
                )
              })}
              {!enEtapa.length && <div className="muted small" style={{ padding: '4px 6px' }}>Arrastra candidatos aquí</div>}
            </div>
          </section>
        )
      })}
    </div>
  )
}
