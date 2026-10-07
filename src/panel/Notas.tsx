import { useEffect, useState } from 'react'
import type { Store } from '../data/store'
import type { Nota } from '../types'
import { TextoConEnlaces } from '../lib/enlaces'
import { olvidarNotas } from './VistaPreviaNotas'

const fechaHora = (d: Date) =>
  d.toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export function Notas({ s, candidatoId, recargar, onCambioNumero }: {
  s: Store
  candidatoId: string
  recargar: number
  onCambioNumero?: (delta: number) => void // para que el contador 💬 del tablero y la lista se actualice al instante
}) {
  const [notas, setNotas] = useState<Nota[] | null>(null)
  const [texto, setTexto] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [editando, setEditando] = useState<{ id: string; texto: string } | null>(null)
  const [error, setError] = useState('')
  const yo = s.usuarioActual()?.email

  const cargar = () => {
    olvidarNotas(candidatoId)
    return s.notas(candidatoId).then(setNotas).catch((e: Error) => setError(e.message))
  }
  useEffect(() => {
    cargar()
  }, [s, candidatoId, recargar])

  const agregar = async () => {
    if (!texto.trim()) return
    setGuardando(true)
    setError('')
    try {
      await s.agregarNota(candidatoId, texto.trim())
      onCambioNumero?.(1)
      setTexto('')
      await cargar()
    } catch (e) {
      setError(`No se pudo guardar la nota: ${(e as Error).message}`)
    } finally {
      setGuardando(false)
    }
  }

  const guardarEdicion = async () => {
    if (!editando || !editando.texto.trim()) return
    await s.editarNota(candidatoId, editando.id, editando.texto.trim())
    setEditando(null)
    await cargar()
  }

  const borrar = async (n: Nota) => {
    if (!confirm('¿Borrar esta nota?')) return
    await s.borrarNota(candidatoId, n.id)
    onCambioNumero?.(-1)
    await cargar()
  }

  return (
    <section className="card stack no-print-notas" style={{ marginBottom: 20 }}>
      <h2>Notas y seguimiento</h2>
      <div className="stack-sm">
        <textarea
          className="textarea"
          style={{ minHeight: 76 }}
          placeholder="Escribe una nota. Puedes pegar links (por ejemplo, la grabación de la entrevista o un documento)."
          value={texto}
          maxLength={10000}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && agregar()}
        />
        <div className="row">
          <span className="muted small">⌘ + Enter para guardar</span>
          <div className="spacer" />
          <button className="btn btn-primary btn-sm" disabled={!texto.trim() || guardando} onClick={agregar}>
            {guardando ? 'Guardando…' : 'Agregar nota'}
          </button>
        </div>
      </div>
      {error && <div className="aviso aviso-amarillo small">{error}</div>}

      {notas === null ? (
        <p className="muted small">Cargando notas…</p>
      ) : !notas.length ? (
        <p className="muted small">Aún no hay notas para este candidato.</p>
      ) : (
        <ol className="notas">
          {notas.map((n) =>
            n.tipo === 'cambio' ? (
              <li key={n.id} className="nota-cambio">
                <span className="punto" aria-hidden />
                <span><b>{n.autorNombre}</b> {n.texto.charAt(0).toLowerCase() + n.texto.slice(1)}</span>
                <span className="muted small"> · {fechaHora(n.creado)}</span>
              </li>
            ) : (
              <li key={n.id} className="nota">
                <div className="row" style={{ gap: 8 }}>
                  <b className="small">{n.autorNombre}</b>
                  <span className="muted small">
                    {fechaHora(n.creado)}
                    {n.editado && ` · editada ${fechaHora(n.editado)}`}
                  </span>
                  <div className="spacer" />
                  {n.autorEmail === yo && editando?.id !== n.id && (
                    <>
                      <button className="link-btn small" onClick={() => setEditando({ id: n.id, texto: n.texto })}>Editar</button>
                      <button className="link-btn small" style={{ color: 'var(--rojo)' }} onClick={() => borrar(n)}>Borrar</button>
                    </>
                  )}
                </div>
                {editando?.id === n.id ? (
                  <div className="stack-sm" style={{ marginTop: 6 }}>
                    <textarea className="textarea" value={editando.texto} maxLength={10000} onChange={(e) => setEditando({ ...editando, texto: e.target.value })} />
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm" onClick={() => setEditando(null)}>Cancelar</button>
                      <button className="btn btn-sm btn-primary" disabled={!editando.texto.trim()} onClick={guardarEdicion}>Guardar</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 4 }}><TextoConEnlaces texto={n.texto} /></div>
                )}
              </li>
            ),
          )}
        </ol>
      )}
    </section>
  )
}
