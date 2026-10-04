import { useId, useState, type ReactNode } from 'react'
import { MESES_LARGOS } from '../lib/catalogos'
import { leerDinero } from '../lib/formato'

export function Campo(props: { label: ReactNode; ayuda?: ReactNode; error?: string; req?: boolean; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className={`campo${props.error ? ' con-error' : ''}`}>
      <label htmlFor={id}>
        {props.label}
        {props.req && <span className="req">*</span>}
      </label>
      {props.ayuda && <div className="ayuda">{props.ayuda}</div>}
      {props.children(id)}
      {props.error && <div className="error" role="alert">{props.error}</div>}
    </div>
  )
}

/** Grupo de opciones (radio). Para grupos, la etiqueta no es un <label> asociado a un único input. */
export function Opciones<T extends string | number | boolean>(props: {
  label: ReactNode
  ayuda?: ReactNode
  error?: string
  req?: boolean
  valor: T | null | undefined
  opciones: { valor: T; etiqueta: ReactNode; ayuda?: ReactNode }[]
  onChange: (v: T) => void
  horizontal?: boolean
}) {
  const nombre = useId()
  return (
    <fieldset className={`campo${props.error ? ' con-error' : ''}`} style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="label" style={{ fontWeight: 550, padding: 0, marginBottom: 6 }}>
        {props.label}
        {props.req && <span className="req">*</span>}
      </legend>
      {props.ayuda && <div className="ayuda">{props.ayuda}</div>}
      <div className={`opciones${props.horizontal ? ' horizontal' : ''}`}>
        {props.opciones.map((o) => (
          <label key={String(o.valor)} className={`opcion${props.valor === o.valor ? ' activa' : ''}`}>
            <input type="radio" name={nombre} checked={props.valor === o.valor} onChange={() => props.onChange(o.valor)} />
            <span>
              {o.etiqueta}
              {o.ayuda && <small>{o.ayuda}</small>}
            </span>
          </label>
        ))}
      </div>
      {props.error && <div className="error" role="alert">{props.error}</div>}
    </fieldset>
  )
}

const ANIO_ACTUAL = new Date().getFullYear()
const ANIOS = Array.from({ length: ANIO_ACTUAL - 1969 }, (_, i) => ANIO_ACTUAL - i)

/** Selector de mes y año → "AAAA-MM". */
export function MesInput(props: { id?: string; valor: string; onChange: (v: string) => void }) {
  const [a, m] = props.valor ? props.valor.split('-') : ['', '']
  const set = (anio: string, mes: string) => props.onChange(anio || mes ? `${anio}-${mes}` : '')
  return (
    <div className="mes-input">
      <select id={props.id} className="select" value={m ?? ''} onChange={(e) => set(a ?? '', e.target.value)} aria-label="Mes">
        <option value="">Mes</option>
        {MESES_LARGOS.map((nombre, i) => (
          <option key={nombre} value={String(i + 1).padStart(2, '0')}>{nombre}</option>
        ))}
      </select>
      <select className="select" value={a ?? ''} onChange={(e) => set(e.target.value, m ?? '')} aria-label="Año">
        <option value="">Año</option>
        {ANIOS.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )
}

/** Mes completo = "AAAA-MM" con ambas partes. */
export const mesCompleto = (v: string) => /^\d{4}-\d{2}$/.test(v)

/** Entrada de dinero que acepta "15,000" o "15k" y guarda un número. */
export function DineroInput(props: { id?: string; valor: number; onChange: (v: number) => void; placeholder?: string }) {
  const [texto, setTexto] = useState(props.valor ? props.valor.toLocaleString('es-MX') : '')
  return (
    <div className="input-prefijo">
      <span>$</span>
      <input
        id={props.id}
        className="input tabular"
        inputMode="decimal"
        placeholder={props.placeholder ?? '0'}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          const n = leerDinero(e.target.value)
          props.onChange(Number.isFinite(n) ? n : 0)
        }}
        onBlur={() => props.valor && setTexto(props.valor.toLocaleString('es-MX'))}
      />
    </div>
  )
}
