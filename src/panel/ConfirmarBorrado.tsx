import { useEffect, useState } from 'react'

const PALABRA = 'ELIMINAR'

export function ConfirmarBorrado(props: {
  nombres: string[]
  onCancelar: () => void
  onConfirmar: () => Promise<void>
  onExportar: () => void
}) {
  const [texto, setTexto] = useState('')
  const [borrando, setBorrando] = useState(false)
  const n = props.nombres.length

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && !borrando && props.onCancelar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [borrando, props])

  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-labelledby="titulo-borrar">
      <div className="modal stack">
        <h2 id="titulo-borrar">
          Eliminar {n === 1 ? 'a 1 candidato' : `${n} candidatos`}
        </h2>
        <p>
          Vas a eliminar {n === 1 ? 'este registro' : <>estos <b>{n} registros</b></>} de forma <b>permanente</b>. Esta acción no se puede deshacer.
        </p>
        <ul>
          {props.nombres.map((nm, i) => <li key={i}>{nm}</li>)}
        </ul>
        <div className="aviso small">
          ¿Quieres un respaldo primero?{' '}
          <button className="btn btn-sm" style={{ marginLeft: 6 }} onClick={props.onExportar}>Exportar a CSV</button>
        </div>
        <div className="campo">
          <label htmlFor="confirmar-borrado">Escribe <b>{PALABRA}</b> para confirmar</label>
          <input
            id="confirmar-borrado"
            className="input"
            autoFocus
            autoComplete="off"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" disabled={borrando} onClick={props.onCancelar}>Cancelar</button>
          <button
            className="btn btn-danger"
            disabled={texto.trim().toUpperCase() !== PALABRA || borrando}
            onClick={async () => {
              setBorrando(true)
              try {
                await props.onConfirmar()
              } finally {
                setBorrando(false)
              }
            }}
          >
            {borrando ? 'Eliminando…' : `Eliminar ${n === 1 ? 'registro' : `${n} registros`}`}
          </button>
        </div>
      </div>
    </div>
  )
}
