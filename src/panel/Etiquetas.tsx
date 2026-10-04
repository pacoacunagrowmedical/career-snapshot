import { useEffect, useRef, useState } from 'react'
import type { Store } from '../data/store'
import type { Etiqueta } from '../types'
import { COLORES_ETIQUETA, colorEtiqueta } from '../lib/catalogos'

export function EtiquetaChip({ e, chico }: { e: Etiqueta; chico?: boolean }) {
  return (
    <span className={`etiqueta${chico ? ' chica' : ''}`} style={{ background: colorEtiqueta(e.color) }} title={e.nombre}>
      {e.nombre}
    </span>
  )
}

export function ListaEtiquetas({ ids, todas, chico }: { ids: string[]; todas: Etiqueta[]; chico?: boolean }) {
  const es = ids.map((id) => todas.find((e) => e.id === id)).filter((e): e is Etiqueta => !!e)
  if (!es.length) return null
  return (
    <div className="etiquetas">
      {es.map((e) => <EtiquetaChip key={e.id} e={e} chico={chico} />)}
    </div>
  )
}

/**
 * Botón con menú para marcar/desmarcar etiquetas, crear nuevas o borrar las que ya no se usan.
 * `seleccion` puede ser parcial (varias personas seleccionadas): las marcadas en algunas se muestran como "—".
 */
export function SelectorEtiquetas(props: {
  s: Store
  todas: Etiqueta[]
  seleccion: string[] // marcadas en todos
  parcial?: string[] // marcadas solo en algunos
  onCambiar: (id: string, marcar: boolean) => void
  onEtiquetasCambiadas: (todas: Etiqueta[]) => void
  etiquetaBoton?: string
  compacto?: boolean
  arriba?: boolean // abrir el menú hacia arriba (barra inferior)
}) {
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [color, setColor] = useState(COLORES_ETIQUETA[0].id)
  const [administrar, setAdministrar] = useState(false)
  const caja = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => caja.current && !caja.current.contains(e.target as Node) && setAbierto(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false)
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', esc)
    }
  }, [abierto])

  const crear = async () => {
    if (!nombre.trim()) return
    const nueva = await props.s.guardarEtiqueta({ nombre: nombre.trim(), color })
    props.onEtiquetasCambiadas([...props.todas, nueva].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    props.onCambiar(nueva.id, true)
    setNombre('')
  }

  const borrar = async (e: Etiqueta) => {
    if (!confirm(`¿Borrar la etiqueta "${e.nombre}"? Se quitará de todos los candidatos que la tengan.`)) return
    await props.s.borrarEtiqueta(e.id)
    props.onEtiquetasCambiadas(props.todas.filter((x) => x.id !== e.id))
  }

  return (
    <div className="selector-etiquetas" ref={caja}>
      <button type="button" className={`btn btn-sm${props.compacto ? ' btn-ghost' : ''}`} onClick={() => setAbierto((x) => !x)} aria-expanded={abierto}>
        {props.etiquetaBoton ?? '🏷 Etiquetas'}
      </button>
      {abierto && (
        <div className={`popover${props.arriba ? ' arriba' : ''}`} role="dialog" aria-label="Etiquetas">
          <div className="row" style={{ marginBottom: 8 }}>
            <b className="small">Etiquetas</b>
            <div className="spacer" />
            {props.todas.length > 0 && (
              <button type="button" className="link-btn small" onClick={() => setAdministrar((x) => !x)}>{administrar ? 'Listo' : 'Administrar'}</button>
            )}
          </div>
          <div className="stack-sm" style={{ gap: 4, maxHeight: 240, overflow: 'auto' }}>
            {props.todas.map((e) => {
              const marcada = props.seleccion.includes(e.id)
              const parcial = !marcada && !!props.parcial?.includes(e.id)
              return (
                <div key={e.id} className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                  {administrar ? (
                    <>
                      <EtiquetaChip e={e} />
                      <div className="spacer" />
                      <button type="button" className="link-btn small" style={{ color: 'var(--rojo)' }} onClick={() => borrar(e)}>Borrar</button>
                    </>
                  ) : (
                    <label className="check" style={{ flex: 1, alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={marcada}
                        ref={(el) => {
                          if (el) el.indeterminate = parcial
                        }}
                        onChange={() => props.onCambiar(e.id, !marcada)}
                      />
                      <EtiquetaChip e={e} />
                    </label>
                  )}
                </div>
              )
            })}
            {!props.todas.length && <p className="muted small">Aún no hay etiquetas. Crea la primera:</p>}
          </div>
          <hr className="separador" style={{ margin: '10px 0' }} />
          <div className="stack-sm" style={{ gap: 6 }}>
            <input
              className="input"
              style={{ minHeight: 34, padding: '6px 10px' }}
              placeholder="Nueva etiqueta"
              value={nombre}
              maxLength={40}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && crear()}
            />
            <div className="colores">
              {COLORES_ETIQUETA.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-label={c.id}
                  className={color === c.id ? 'activo' : ''}
                  style={{ background: c.hex }}
                  onClick={() => setColor(c.id)}
                />
              ))}
            </div>
            <button type="button" className="btn btn-sm btn-primary" disabled={!nombre.trim()} onClick={crear}>Crear etiqueta</button>
          </div>
        </div>
      )}
    </div>
  )
}
