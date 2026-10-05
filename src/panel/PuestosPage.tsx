import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { Store } from '../data/store'
import type { Puesto } from '../types'
import { DineroInput } from '../form/campos'
import { dinero } from '../lib/formato'
import { useDatos } from './datos'

type Edicion = Omit<Puesto, 'id'> & { id?: string }

export function PuestosPage() {
  const s = useOutletContext<Store>()
  const { recargar } = useDatos()
  const [puestos, setPuestos] = useState<Puesto[] | null>(null)
  const [edicion, setEdicion] = useState<Edicion | null>(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = () => {
    recargar()
    return s.puestos().then(setPuestos)
  }
  useEffect(() => {
    cargar()
  }, [s])

  const guardar = async () => {
    if (!edicion || !edicion.nombre.trim()) return
    setGuardando(true)
    try {
      await s.guardarPuesto({ ...edicion, nombre: edicion.nombre.trim() })
      setEdicion(null)
      await cargar()
    } finally {
      setGuardando(false)
    }
  }

  const alternar = async (p: Puesto) => {
    await s.guardarPuesto({ ...p, activo: !p.activo })
    await cargar()
  }

  if (!puestos) return <p className="muted">Cargando…</p>

  return (
    <div style={{ maxWidth: 820 }}>
      <div className="row" style={{ marginBottom: 6 }}>
        <h1>Puestos</h1>
        <div className="spacer" />
        <button className="btn btn-primary btn-sm" onClick={() => setEdicion({ nombre: '', activo: true, orden: puestos.length + 1, sueldoOfrecido: null })}>
          + Agregar puesto
        </button>
      </div>
      <p className="muted" style={{ marginBottom: 16 }}>
        Los puestos activos aparecen en el formulario. El sueldo ofrecido es privado: solo se ve aquí y como línea de referencia en el snapshot.
      </p>

      {edicion && (
        <div className="card stack" style={{ marginBottom: 16 }}>
          <h3>{edicion.id ? 'Editar puesto' : 'Nuevo puesto'}</h3>
          <div className="grid-2">
            <div className="campo">
              <label htmlFor="p-nombre">Nombre del puesto</label>
              <input id="p-nombre" className="input" autoFocus value={edicion.nombre} onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })} />
            </div>
            <div className="campo">
              <label htmlFor="p-sueldo">Sueldo mensual neto ofrecido (MXN)</label>
              <DineroInput id="p-sueldo" valor={edicion.sueldoOfrecido ?? 0} onChange={(v) => setEdicion({ ...edicion, sueldoOfrecido: v || null })} />
            </div>
          </div>
          <div className="row">
            <label className="check">
              <input type="checkbox" checked={edicion.activo} onChange={(e) => setEdicion({ ...edicion, activo: e.target.checked })} />
              <span>Activo (visible en el formulario)</span>
            </label>
            <div className="campo" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <label htmlFor="p-orden" className="small muted">Orden</label>
              <input id="p-orden" type="number" className="input" style={{ width: 80 }} value={edicion.orden} onChange={(e) => setEdicion({ ...edicion, orden: Number(e.target.value) })} />
            </div>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setEdicion(null)}>Cancelar</button>
            <button className="btn btn-primary" disabled={!edicion.nombre.trim() || guardando} onClick={guardar}>Guardar</button>
          </div>
        </div>
      )}

      <div className="tabla-wrap">
        <table className="tabla">
          <thead>
            <tr>
              <th>Puesto</th>
              <th className="num-col">Sueldo ofrecido</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {puestos.map((p) => (
              <tr key={p.id}>
                <td><b>{p.nombre}</b></td>
                <td className="num-col">{p.sueldoOfrecido ? dinero(p.sueldoOfrecido) : <span className="muted">Sin definir</span>}</td>
                <td>
                  <span className="chip"><span className={`dot ${p.activo ? 'dot-verde' : ''}`} style={p.activo ? undefined : { background: 'var(--gris)' }} />{p.activo ? 'Activo' : 'Oculto'}</span>
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => alternar(p)}>{p.activo ? 'Ocultar' : 'Activar'}</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setEdicion(p)}>Editar</button>
                  <button
                    className="btn btn-sm btn-ghost"
                    style={{ color: 'var(--rojo)' }}
                    onClick={async () => {
                      if (!confirm(`¿Eliminar el puesto "${p.nombre}"? Los candidatos que aplicaron conservan el nombre del puesto.`)) return
                      await s.borrarPuesto(p.id)
                      await cargar()
                    }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
