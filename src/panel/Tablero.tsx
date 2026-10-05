import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Analisis } from '../lib/analisis'
import type { Candidato, Etiqueta } from '../types'
import { ETAPAS } from '../lib/catalogos'
import { fechaCorta } from '../lib/fechas'
import { ListaEtiquetas } from './Etiquetas'
import { ordenDe } from './seguimiento'

/**
 * Vista tipo Trello: una columna por etapa. Las tarjetas se arrastran entre columnas para cambiar de etapa y
 * dentro de una columna para acomodarlas en el orden que se quiera (el orden se guarda en la base de datos).
 */
export function Tablero(props: {
  filas: { c: Candidato; a: Analisis }[]
  etiquetas: Etiqueta[]
  consulta: string // filtros activos, para que el perfil muestre la misma selección
  onMover: (c: Candidato, etapa: string, orden: number) => void
}) {
  const [arrastrando, setArrastrando] = useState<string | null>(null)
  // Dónde caería la tarjeta: columna e índice dentro de ella.
  const [destino, setDestino] = useState<{ etapa: string; indice: number } | null>(null)

  const columnas = ETAPAS.map((et) => ({
    et,
    filas: props.filas.filter((f) => f.c.etapa === et.id).sort((x, y) => ordenDe(x.c) - ordenDe(y.c)),
  }))

  const soltar = () => {
    const f = props.filas.find((x) => x.c.id === arrastrando)
    if (f && destino) {
      // Vecinos en la columna destino, sin contar la propia tarjeta.
      const lista = columnas.find((col) => col.et.id === destino.etapa)!.filas.map((x) => x.c)
      const origen = lista.findIndex((c) => c.id === f.c.id)
      let i = destino.indice
      if (origen >= 0 && origen < i) i--
      const resto = lista.filter((c) => c.id !== f.c.id)
      const antes = resto[i - 1]
      const despues = resto[i]
      const orden =
        antes && despues ? (ordenDe(antes) + ordenDe(despues)) / 2
        : antes ? ordenDe(antes) + 1000
        : despues ? ordenDe(despues) - 1000
        : 0
      const sinCambio = origen >= 0 && origen === i
      if (!sinCambio) props.onMover(f.c, destino.etapa, orden)
    }
    setArrastrando(null)
    setDestino(null)
  }

  const linea = <div className="linea-destino" aria-hidden />

  return (
    <div className="tablero">
      {columnas.map(({ et, filas }) => (
        <section
          key={et.id}
          className={`columna${destino?.etapa === et.id ? ' sobre' : ''}`}
          onDragOver={(e) => {
            if (!arrastrando) return
            e.preventDefault()
            // Sobre el espacio libre de la columna: al final.
            if ((e.target as Element).closest?.('.tarjeta') === null) setDestino({ etapa: et.id, indice: filas.length })
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDestino(null)
          }}
          onDrop={(e) => {
            e.preventDefault()
            soltar()
          }}
        >
          <header>
            <span>{et.nombre}</span>
            <span className="muted">{filas.length}</span>
          </header>
          <div className="tarjetas">
            {filas.map(({ c, a }, i) => {
              const rojas = a.banderas.filter((b) => b.nivel === 'rojo').length
              const amarillas = a.banderas.filter((b) => b.nivel === 'amarillo').length
              return (
                <Fragment key={c.id}>
                  {destino?.etapa === et.id && destino.indice === i && linea}
                  <Link
                    to={`/panel/candidato/${c.id}${props.consulta}`}
                    className={`tarjeta${arrastrando === c.id ? ' arrastrando' : ''}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', c.id)
                      setArrastrando(c.id)
                    }}
                    onDragOver={(e) => {
                      if (!arrastrando) return
                      e.preventDefault()
                      const r = e.currentTarget.getBoundingClientRect()
                      const indice = e.clientY < r.top + r.height / 2 ? i : i + 1
                      if (destino?.etapa !== et.id || destino.indice !== indice) setDestino({ etapa: et.id, indice })
                    }}
                    onDragEnd={() => {
                      setArrastrando(null)
                      setDestino(null)
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
                </Fragment>
              )
            })}
            {destino?.etapa === et.id && destino.indice === filas.length && linea}
            {!filas.length && <div className="muted small" style={{ padding: '4px 6px' }}>Arrastra candidatos aquí</div>}
          </div>
        </section>
      ))}
    </div>
  )
}
