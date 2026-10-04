import { ASPECTOS_CALIFICACION, CALIFICACIONES, CONTACTO_JEFE, PRESTACIONES, RAZONES_SALIDA } from '../lib/catalogos'
import { Campo, DineroInput, MesInput, Opciones } from './campos'
import type { EmpleoBorrador, Errores } from './borrador'

const ASCENSOS = [0, 1, 2, 3, 4, 5]

export function EmpleoCampos(props: {
  j: EmpleoBorrador
  i: number
  errores: Errores
  avisos: Errores
  onChange: (j: EmpleoBorrador) => void
}) {
  const { j, i } = props
  const err = (k: string) => props.errores[`empleos.${i}.${k}`]
  const avi = (k: string) => props.avisos[`empleos.${i}.${k}`]
  const set = <K extends keyof EmpleoBorrador>(k: K, v: EmpleoBorrador[K]) => props.onChange({ ...j, [k]: v })

  return (
    <div className="stack">
      <Campo label="Nombre de la empresa" req ayuda="Solo empleos formales. Si fue freelance o por tu cuenta, no lo agregues aquí: va en el siguiente paso." error={err('empresa')}>
        {(id) => <input id={id} className="input" value={j.empresa} onChange={(e) => set('empresa', e.target.value)} />}
      </Campo>

      <label className="check">
        <input type="checkbox" checked={j.actual} onChange={(e) => props.onChange({ ...j, actual: e.target.checked, fin: '', razonSalida: e.target.checked ? 'N' : null })} />
        <span>Trabajo aquí actualmente</span>
      </label>

      <div className="grid-2">
        <Campo label="Puesto al entrar" req error={err('puestoInicial')}>
          {(id) => <input id={id} className="input" value={j.puestoInicial} onChange={(e) => set('puestoInicial', e.target.value)} />}
        </Campo>
        <Campo label={j.actual ? 'Puesto actual' : 'Puesto al salir'} req={!j.mismoPuesto} error={err('puestoFinal')}>
          {(id) => (
            <input
              id={id}
              className="input"
              value={j.mismoPuesto ? j.puestoInicial : j.puestoFinal}
              disabled={j.mismoPuesto}
              onChange={(e) => set('puestoFinal', e.target.value)}
            />
          )}
        </Campo>
      </div>
      <label className="check" style={{ marginTop: -6 }}>
        <input type="checkbox" checked={j.mismoPuesto} onChange={(e) => set('mismoPuesto', e.target.checked)} />
        <span className="small">Fue el mismo puesto todo el tiempo</span>
      </label>

      <Opciones
        label="¿Cuántos ascensos tuviste en esta empresa?"
        req
        horizontal
        error={err('ascensos')}
        valor={j.ascensos}
        opciones={ASCENSOS.map((n) => ({ valor: n, etiqueta: n === 5 ? '5 o más' : String(n) }))}
        onChange={(v) => set('ascensos', v)}
      />

      <div className="grid-2">
        <Campo label="Fecha de entrada" req ayuda="Si no la recuerdas con exactitud, pon un aproximado." error={err('inicio')}>
          {(id) => <MesInput id={id} valor={j.inicio} onChange={(v) => set('inicio', v)} />}
        </Campo>
        {!j.actual && (
          <Campo label="Fecha de salida" req ayuda="Aproximada si no la recuerdas." error={err('fin')} aviso={avi('fin')}>
            {(id) => <MesInput id={id} valor={j.fin} onChange={(v) => set('fin', v)} />}
          </Campo>
        )}
      </div>

      <div className="grid-2">
        <Campo label="¿Cuánto ganabas al mes cuando entraste?" req ayuda="Sueldo mensual neto (después de impuestos)." error={err('sueldoInicial')} aviso={avi('sueldoInicial')}>
          {(id) => <DineroInput id={id} valor={j.sueldoInicial} onChange={(v) => set('sueldoInicial', v)} />}
        </Campo>
        <Campo label={j.actual ? '¿Cuánto ganas al mes actualmente?' : '¿Cuánto ganabas al mes cuando saliste?'} req ayuda="Sueldo mensual neto." error={err('sueldoFinal')} aviso={avi('sueldoFinal')}>
          {(id) => <DineroInput id={id} valor={j.sueldoFinal} onChange={(v) => set('sueldoFinal', v)} />}
        </Campo>
      </div>

      <Opciones
        label="¿Qué prestaciones tenías en este trabajo?"
        req
        error={err('prestaciones')}
        valor={j.prestaciones}
        opciones={PRESTACIONES.map((p) => ({ valor: p.valor, etiqueta: p.etiqueta }))}
        onChange={(v) => set('prestaciones', v)}
      />

      <hr className="separador" />

      <div className="grid-2">
        <Campo label="Nombre y apellido de tu jefe directo" req error={err('jefeNombre')}>
          {(id) => <input id={id} className="input" value={j.jefeNombre} onChange={(e) => set('jefeNombre', e.target.value)} />}
        </Campo>
        <Campo label="Puesto de tu jefe directo" req error={err('jefePuesto')}>
          {(id) => <input id={id} className="input" value={j.jefePuesto} onChange={(e) => set('jefePuesto', e.target.value)} />}
        </Campo>
      </div>

      <div className="aviso">
        Responde con honestidad: es posible que hablemos con tu jefe para confirmar estas calificaciones. Si de verdad no hay
        nadie que pueda opinar sobre tu trabajo en esta empresa, elige <b>“Imposible de dar”</b>.
      </div>

      {ASPECTOS_CALIFICACION.map((a) => (
        <fieldset key={a.clave} className={`campo${err('calificacion.' + a.clave) ? ' con-error' : ''}`} style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 550, padding: 0, marginBottom: 6 }}>
            {a.pregunta}
            <span className="req">*</span>
          </legend>
          <div className="escala" role="radiogroup">
            {CALIFICACIONES.map((c) => (
              <button
                type="button"
                key={String(c.valor)}
                role="radio"
                aria-checked={j.calificacion[a.clave] === c.valor}
                className={j.calificacion[a.clave] === c.valor ? 'activa' : ''}
                onClick={() => set('calificacion', { ...j.calificacion, [a.clave]: c.valor })}
              >
                <b>{c.valor === 'I' ? '—' : c.valor}</b>
                {c.etiqueta}
              </button>
            ))}
          </div>
          {err('calificacion.' + a.clave) && <div className="error">{err('calificacion.' + a.clave)}</div>}
        </fieldset>
      ))}

      <hr className="separador" />

      <Campo label="¿Qué logro importante tuviste en este empleo?" req error={err('logro')}>
        {(id) => <textarea id={id} className="textarea" value={j.logro} onChange={(e) => set('logro', e.target.value)} />}
      </Campo>
      <Campo label="¿Qué es lo que más disfrutabas de este trabajo?" req error={err('disfrutabaMas')}>
        {(id) => <textarea id={id} className="textarea" value={j.disfrutabaMas} onChange={(e) => set('disfrutabaMas', e.target.value)} />}
      </Campo>
      <Campo label="¿Qué es lo que menos disfrutabas de este trabajo?" req error={err('disfrutabaMenos')}>
        {(id) => <textarea id={id} className="textarea" value={j.disfrutabaMenos} onChange={(e) => set('disfrutabaMenos', e.target.value)} />}
      </Campo>

      {!j.actual && (
        <>
          <Opciones
            label="¿Por qué saliste de este trabajo?"
            req
            error={err('razonSalida')}
            valor={j.razonSalida}
            opciones={RAZONES_SALIDA.filter((r) => r.codigo !== 'N').map((r) => ({ valor: r.codigo, etiqueta: r.etiqueta, ayuda: r.ayuda }))}
            onChange={(v) => set('razonSalida', v)}
          />
          <Campo
            label="Cuéntanos brevemente qué pasó"
            req={j.razonSalida === 'O' || j.razonSalida === 'T'}
            error={err('razonDetalle')}
          >
            {(id) => <textarea id={id} className="textarea" style={{ minHeight: 70 }} value={j.razonDetalle} onChange={(e) => set('razonDetalle', e.target.value)} />}
          </Campo>
        </>
      )}

      <Opciones
        label="Es posible que, antes de una oferta de trabajo, te pidamos programar una llamada de referencia con este jefe. ¿Podemos hablar con él o ella?"
        req
        error={err('contactoJefe')}
        valor={j.contactoJefe}
        opciones={CONTACTO_JEFE.map((c) => ({ valor: c.valor, etiqueta: c.etiqueta }))}
        onChange={(v) => set('contactoJefe', v)}
      />
    </div>
  )
}
