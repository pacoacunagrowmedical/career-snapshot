import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Store } from '../data/store'
import type { Candidato, Nota } from '../types'
import { TextoConEnlaces } from '../lib/enlaces'

// Notas ya cargadas, por candidato y número de notas (si cambia el número, se vuelven a pedir).
const cache = new Map<string, Nota[]>()
const MAX = 5

/** Descarta la copia guardada de las notas de un candidato (tras agregar, editar o borrar una). */
export function olvidarNotas(candidatoId: string) {
  for (const k of [...cache.keys()]) if (k.startsWith(`${candidatoId}:`)) cache.delete(k)
}
const ANCHO = Math.min(340, window.innerWidth - 16)

const fechaHora = (d: Date) => d.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Recuadro flotante con las notas más recientes de un candidato (vista de tablero). */
export function VistaPreviaNotas(props: {
  s: Store
  c: Candidato
  ancla: DOMRect
  enlace: string
  onEntrar: () => void
  onSalir: () => void
}) {
  const clave = `${props.c.id}:${props.c.numNotas}`
  const [notas, setNotas] = useState<Nota[] | null>(cache.get(clave) ?? null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (cache.has(clave)) return setNotas(cache.get(clave)!)
    let vivo = true
    props.s
      .notas(props.c.id)
      .then((ns) => {
        const soloNotas = ns.filter((n) => n.tipo === 'nota')
        cache.set(clave, soloNotas)
        if (vivo) setNotas(soloNotas)
      })
      .catch(() => vivo && setError(true))
    return () => {
      vivo = false
    }
  }, [clave])

  // A la derecha de la tarjeta si cabe; si no, a la izquierda. Sin salirse de la pantalla por abajo.
  const derecha = props.ancla.right + 8 + ANCHO < window.innerWidth
  const ideal = derecha ? props.ancla.right + 8 : props.ancla.left - 8 - ANCHO
  const left = Math.min(Math.max(8, ideal), window.innerWidth - ANCHO - 8)
  const top = Math.max(8, Math.min(props.ancla.top, window.innerHeight - 340))

  return (
    <div className="vista-notas" style={{ left, top, width: ANCHO }} onMouseEnter={props.onEntrar} onMouseLeave={props.onSalir} role="tooltip">
      <div className="row" style={{ gap: 6, marginBottom: 8 }}>
        <b className="small">💬 Notas · {props.c.nombre}</b>
      </div>
      {error ? (
        <p className="muted small">No se pudieron cargar las notas.</p>
      ) : notas === null ? (
        <p className="muted small">Cargando…</p>
      ) : (
        <div className="stack-sm" style={{ gap: 8 }}>
          {notas.slice(0, MAX).map((n) => (
            <div key={n.id} className="vista-nota">
              <div className="muted" style={{ fontSize: '0.72rem', marginBottom: 2 }}>
                <b style={{ color: 'var(--text)' }}>{n.autorNombre}</b> · {fechaHora(n.creado)}
              </div>
              <div className="vista-nota-texto"><TextoConEnlaces texto={n.texto} /></div>
            </div>
          ))}
          {!notas.length && <p className="muted small">Sin notas.</p>}
        </div>
      )}
      <div style={{ marginTop: 8, fontSize: '0.8rem' }}>
        <Link to={props.enlace}>
          {notas && notas.length > MAX ? `Ver las ${notas.length} notas en el perfil →` : 'Abrir perfil →'}
        </Link>
      </div>
    </div>
  )
}
