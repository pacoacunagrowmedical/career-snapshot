import { useEffect, useRef, useState } from 'react'
import { store } from '../data/store'
import { FINANCIAMIENTO, FUENTES, MONEDAS } from '../lib/catalogos'
import { mesCorto } from '../lib/fechas'
import { Campo, MesInput, Opciones, mesCompleto } from './campos'
import { EmpleoCampos } from './EmpleoCampos'
import {
  PASOS, aSolicitud, borradorVacio, empleoVacio, esMexico, freelanceVacio, validarPaso,
  type Borrador, type Errores,
} from './borrador'
import { DineroInput } from './campos'

const CLAVE_BORRADOR = 'snapshot-borrador-v1'
const PAISES = ['México', 'Colombia', 'Argentina', 'Chile', 'Perú', 'Venezuela', 'Ecuador', 'Guatemala', 'Estados Unidos', 'España']
const SEGUNDOS_MINIMOS = 60 // nadie llena este formulario en menos de un minuto

function cargarBorrador(): { b: Borrador; paso: number } {
  try {
    const raw = localStorage.getItem(CLAVE_BORRADOR)
    if (raw) return { ...JSON.parse(raw) }
  } catch {
    /* sin almacenamiento */
  }
  return { b: borradorVacio(), paso: 0 }
}

export function FormularioPage() {
  const inicial = useRef(cargarBorrador())
  const [b, setB] = useState<Borrador>(inicial.current.b)
  const [paso, setPaso] = useState(inicial.current.paso)
  const [errores, setErrores] = useState<Errores>({})
  const [puestos, setPuestos] = useState<{ id: string; nombre: string }[] | null>(null)
  const [abierto, setAbierto] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState('')
  const [trampa, setTrampa] = useState('')
  const inicioMs = useRef(Date.now())
  const arriba = useRef<HTMLDivElement>(null)

  useEffect(() => {
    store().then((s) => s.puestosActivos()).then(setPuestos).catch(() => setPuestos([]))
  }, [])

  useEffect(() => {
    if (enviado) return
    try {
      localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ b, paso }))
    } catch {
      /* sin almacenamiento */
    }
  }, [b, paso, enviado])

  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setB((x) => ({ ...x, [k]: v }))
  const setU = <K extends keyof Borrador['universidad']>(k: K, v: Borrador['universidad'][K]) =>
    setB((x) => ({ ...x, universidad: { ...x.universidad, [k]: v } }))

  const irA = (p: number) => {
    setPaso(p)
    setErrores({})
    requestAnimationFrame(() => arriba.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const siguiente = () => {
    const e = validarPaso(paso, b)
    setErrores(e)
    if (Object.keys(e).length) {
      const conError = Object.keys(e).find((k) => k.startsWith('empleos.'))
      if (conError) setAbierto(Number(conError.split('.')[1]))
      requestAnimationFrame(() => document.querySelector('.con-error, .error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      return
    }
    if (paso < PASOS.length - 1) irA(paso + 1)
    else enviar()
  }

  const enviar = async () => {
    setErrorEnvio('')
    // Protección contra bots: campo oculto y tiempo mínimo de llenado. Al bot se le muestra éxito y no se guarda nada.
    const borradorRecuperado = !!inicial.current.b.nombre
    const demasiadoRapido = !borradorRecuperado && (Date.now() - inicioMs.current) / 1000 < SEGUNDOS_MINIMOS
    if (trampa || demasiadoRapido) {
      setEnviado(true)
      return
    }
    setEnviando(true)
    try {
      const puesto = puestos?.find((p) => p.id === b.puestoId)
      await (await store()).enviarSolicitud(aSolicitud(b, puesto?.nombre ?? ''))
      try {
        localStorage.removeItem(CLAVE_BORRADOR)
      } catch {
        /* sin almacenamiento */
      }
      setEnviado(true)
      window.scrollTo({ top: 0 })
    } catch (err) {
      console.error(err)
      setErrorEnvio('No pudimos enviar tu solicitud. Revisa tu conexión e inténtalo de nuevo. Tus respuestas siguen guardadas.')
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <div className="form-shell">
        <div className="card stack" style={{ textAlign: 'center', padding: 40 }}>
          <div className="logo" style={{ margin: '0 auto', width: 48, height: 48, fontSize: 22 }}>✓</div>
          <h1>¡Gracias por aplicar!</h1>
          <p className="muted">Recibimos tu solicitud para trabajar en Grow Medical. Si tu perfil avanza en el proceso, te contactaremos por correo o teléfono.</p>
        </div>
      </div>
    )
  }

  const err = (k: string) => errores[k]
  const ultimo = paso === PASOS.length - 1

  return (
    <div className="form-shell" ref={arriba}>
      <div className="form-header">
        <div className="logo">G</div>
        <div>
          <h1 style={{ fontSize: '1.3rem' }}>Solicitud de empleo en Grow Medical</h1>
          <div className="muted small">Paso {paso + 1} de {PASOS.length}: {PASOS[paso]}</div>
        </div>
      </div>
      <div className="progreso" aria-hidden>
        {PASOS.map((p, i) => <div key={p} className={i <= paso ? 'hecho' : ''} />)}
      </div>

      <div className="card stack">
        {/* Campo trampa para bots: invisible para personas. */}
        <div className="trampa" aria-hidden>
          <label>Sitio web <input tabIndex={-1} autoComplete="off" value={trampa} onChange={(e) => setTrampa(e.target.value)} /></label>
        </div>

        {paso === 0 && (
          <>
            <div className="stack-sm">
              <h2>¡Gracias por tu interés!</h2>
              <p className="muted">
                Este formulario nos ayuda a conocer tu trayectoria. Toma aproximadamente 15 minutos. Tus respuestas se guardan en este
                navegador mientras avanzas, así que puedes cerrar y regresar después.
              </p>
            </div>
            <div className="aviso">
              <b>¿Has hecho trabajo freelance o independiente?</b> No lo cuentes como empleo; hay una sección especial para eso
              más adelante.
            </div>
            {puestos === null ? (
              <p className="muted">Cargando puestos…</p>
            ) : (
              <Opciones
                label="¿Para qué posición estás aplicando?"
                req
                error={err('puestoId')}
                valor={b.puestoId}
                opciones={puestos.map((p) => ({ valor: p.id, etiqueta: p.nombre }))}
                onChange={(v) => set('puestoId', v)}
              />
            )}
            <Opciones
              label="¿Cómo te enteraste de esta vacante?"
              req
              error={err('fuente')}
              valor={b.fuente}
              opciones={FUENTES.map((f) => ({ valor: f.valor as string, etiqueta: f.etiqueta }))}
              onChange={(v) => setB((x) => ({ ...x, fuente: v, fuenteDetalle: '' }))}
            />
            {FUENTES.find((f) => f.valor === b.fuente)?.detalle && (
              <Campo label={FUENTES.find((f) => f.valor === b.fuente)!.detalle} req error={err('fuenteDetalle')}>
                {(id) => <input id={id} className="input" value={b.fuenteDetalle} onChange={(e) => set('fuenteDetalle', e.target.value)} />}
              </Campo>
            )}
          </>
        )}

        {paso === 1 && (
          <>
            <h2>Información personal y de contacto</h2>
            <Campo label="Nombre completo" req error={err('nombre')}>
              {(id) => <input id={id} className="input" autoComplete="name" value={b.nombre} onChange={(e) => set('nombre', e.target.value)} />}
            </Campo>
            <div className="grid-2">
              <Campo label="Fecha de nacimiento" req error={err('fechaNacimiento')}>
                {(id) => <input id={id} type="date" className="input" value={b.fechaNacimiento} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set('fechaNacimiento', e.target.value)} />}
              </Campo>
              <Campo label="¿En qué país vives?" req error={err('pais')}>
                {(id) => (
                  <>
                    <input id={id} className="input" list="paises" autoComplete="country-name" value={b.pais} onChange={(e) => set('pais', e.target.value)} />
                    <datalist id="paises">{PAISES.map((p) => <option key={p} value={p} />)}</datalist>
                  </>
                )}
              </Campo>
            </div>
            <Campo label="Dirección completa" ayuda="Calle, número, colonia, ciudad.">
              {(id) => <input id={id} className="input" autoComplete="street-address" value={b.direccion} onChange={(e) => set('direccion', e.target.value)} />}
            </Campo>
            <div className="grid-2">
              <Campo label="Correo electrónico" req error={err('email')}>
                {(id) => <input id={id} type="email" className="input" autoComplete="email" value={b.email} onChange={(e) => set('email', e.target.value)} />}
              </Campo>
              <Campo label="Teléfono celular" req ayuda={esMexico(b.pais) ? '10 dígitos.' : 'Incluye la lada de tu país.'} error={err('telefono')}>
                {(id) => <input id={id} type="tel" className="input tabular" autoComplete="tel" value={b.telefono} onChange={(e) => set('telefono', e.target.value)} />}
              </Campo>
            </div>
            <hr className="separador" />
            {!esMexico(b.pais) && (
              <Campo label="¿En qué moneda nos vas a dar tus sueldos?" req ayuda="Usa la misma moneda en todo el formulario." error={err('moneda')}>
                {(id) => (
                  <select id={id} className="select" value={b.moneda} onChange={(e) => set('moneda', e.target.value)}>
                    {MONEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                )}
              </Campo>
            )}
            <Campo
              label="¿Cuánto esperas ganar al mes en este puesto?"
              req
              ayuda={`Sueldo mensual neto (después de impuestos)${esMexico(b.pais) ? ', en pesos mexicanos' : ''}. A lo largo del formulario todos los sueldos son mensuales y netos.`}
              error={err('sueldoEsperado')}
            >
              {(id) => <DineroInput id={id} valor={b.sueldoEsperado} onChange={(v) => set('sueldoEsperado', v)} />}
            </Campo>
          </>
        )}

        {paso === 2 && (
          <>
            <div className="stack-sm">
              <h2>Tus empleos</h2>
              <p className="muted">
                Empieza por tu empleo actual o el más reciente y agrega los anteriores, hasta 5 o más si los tienes. Llena todas las
                preguntas de cada empleo. No incluyas trabajo freelance; eso va en el siguiente paso.
              </p>
            </div>
            {err('empleos') && <div className="error">{err('empleos')}</div>}
            {b.empleos.map((j, i) => {
              const conError = Object.keys(errores).some((k) => k.startsWith(`empleos.${i}.`))
              const titulo = i === 0 ? 'Empleo actual o más reciente' : `Empleo anterior ${i}`
              return (
                <section key={i} className="empleo-card" style={conError ? { borderColor: 'var(--rojo)' } : undefined}>
                  <header>
                    <span className="num">{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3>{j.empresa || titulo}</h3>
                      {abierto !== i && (
                        <div className="muted small">
                          {j.puestoInicial || 'Sin puesto'}
                          {mesCompleto(j.inicio) ? ` · ${mesCorto(j.inicio)} – ${j.actual ? 'actual' : mesCompleto(j.fin) ? mesCorto(j.fin) : '?'}` : ''}
                          {conError && <span style={{ color: 'var(--rojo)' }}> · Faltan datos</span>}
                        </div>
                      )}
                    </div>
                    {abierto !== i && <button type="button" className="btn btn-sm" onClick={() => setAbierto(i)}>Editar</button>}
                    {b.empleos.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => {
                          if (!confirm(`¿Quitar ${j.empresa || 'este empleo'}?`)) return
                          set('empleos', b.empleos.filter((_, k) => k !== i))
                          setAbierto(Math.max(0, i - 1))
                        }}
                      >
                        Quitar
                      </button>
                    )}
                  </header>
                  {abierto === i && (
                    <EmpleoCampos
                      j={j}
                      i={i}
                      errores={errores}
                      onChange={(nuevo) => set('empleos', b.empleos.map((x, k) => (k === i ? nuevo : x)))}
                    />
                  )}
                </section>
              )
            })}
            <button
              type="button"
              className="btn"
              onClick={() => {
                set('empleos', [...b.empleos, empleoVacio()])
                setAbierto(b.empleos.length)
              }}
            >
              + Agregar empleo anterior
            </button>
          </>
        )}

        {paso === 3 && (
          <>
            <div className="stack-sm">
              <h2>Trabajo freelance o negocio propio</h2>
              <p className="muted">Proyectos independientes, por tu cuenta o un negocio personal, ya sea actual o pasado.</p>
            </div>
            <Opciones
              label="¿Has trabajado como freelance, independiente o en un negocio propio?"
              req
              horizontal
              error={err('hizoFreelance')}
              valor={b.hizoFreelance}
              opciones={[{ valor: true, etiqueta: 'Sí' }, { valor: false, etiqueta: 'No' }]}
              onChange={(v) => setB((x) => ({ ...x, hizoFreelance: v, freelance: v && !x.freelance.length ? [freelanceVacio()] : x.freelance }))}
            />
            {b.hizoFreelance && (
              <>
                {b.freelance.map((f, i) => {
                  const e = (k: string) => errores[`freelance.${i}.${k}`]
                  const setF = (nuevo: Partial<typeof f>) => set('freelance', b.freelance.map((x, k) => (k === i ? { ...x, ...nuevo } : x)))
                  return (
                    <section key={i} className="empleo-card stack">
                      <header style={{ marginBottom: 0 }}>
                        <span className="num">{i + 1}</span>
                        <h3 style={{ flex: 1 }}>Periodo freelance</h3>
                        {b.freelance.length > 1 && (
                          <button type="button" className="btn btn-sm btn-ghost" onClick={() => set('freelance', b.freelance.filter((_, k) => k !== i))}>Quitar</button>
                        )}
                      </header>
                      <Campo label="¿Qué hacías?" req ayuda="Ej. Diseño de sitios WordPress, community management, tienda en línea." error={e('actividad')}>
                        {(id) => <input id={id} className="input" value={f.actividad} onChange={(ev) => setF({ actividad: ev.target.value })} />}
                      </Campo>
                      <label className="check">
                        <input type="checkbox" checked={f.actual} onChange={(ev) => setF({ actual: ev.target.checked, fin: null })} />
                        <span>Lo sigo haciendo actualmente</span>
                      </label>
                      <div className="grid-2">
                        <Campo label="Desde" req error={e('inicio')}>
                          {(id) => <MesInput id={id} valor={f.inicio} onChange={(v) => setF({ inicio: v })} />}
                        </Campo>
                        {!f.actual && (
                          <Campo label="Hasta" req error={e('fin')}>
                            {(id) => <MesInput id={id} valor={f.fin ?? ''} onChange={(v) => setF({ fin: v })} />}
                          </Campo>
                        )}
                      </div>
                      <Campo label="Explica en detalle lo que haces o hacías" ayuda="Tipo de clientes, cuántos, ingresos aproximados, etc.">
                        {(id) => <textarea id={id} className="textarea" value={f.descripcion} onChange={(ev) => setF({ descripcion: ev.target.value })} />}
                      </Campo>
                    </section>
                  )
                })}
                <button type="button" className="btn" onClick={() => set('freelance', [...b.freelance, freelanceVacio()])}>+ Agregar otro periodo</button>
              </>
            )}
          </>
        )}

        {paso === 4 && (
          <>
            <div className="stack-sm">
              <h2>Años universitarios</h2>
              <p className="muted">Si no terminaste la universidad, llena esta sección de cualquier manera.</p>
            </div>
            <Opciones
              label="¿Estudiaste en la universidad?"
              req
              horizontal
              valor={b.universidad.asistio}
              opciones={[{ valor: true, etiqueta: 'Sí' }, { valor: false, etiqueta: 'No' }]}
              onChange={(v) => setU('asistio', v)}
            />
            {b.universidad.asistio && (
              <>
                <div className="grid-2">
                  <Campo label="¿En qué universidad estudiaste?" req error={err('universidad.nombre')}>
                    {(id) => <input id={id} className="input" value={b.universidad.nombre} onChange={(e) => setU('nombre', e.target.value)} />}
                  </Campo>
                  <Campo label="¿Qué carrera estudiaste?" req error={err('universidad.carrera')}>
                    {(id) => <input id={id} className="input" value={b.universidad.carrera} onChange={(e) => setU('carrera', e.target.value)} />}
                  </Campo>
                </div>
                <Opciones
                  label="¿Terminaste tus estudios universitarios?"
                  req
                  horizontal
                  error={err('universidad.termino')}
                  valor={b.universidad.termino}
                  opciones={[{ valor: true, etiqueta: 'Sí' }, { valor: false, etiqueta: 'Los dejé truncos' }]}
                  onChange={(v) => setU('termino', v)}
                />
                <div className="grid-2">
                  <Campo label="¿Qué materias disfrutabas más?">
                    {(id) => <input id={id} className="input" value={b.universidad.materiasMas} onChange={(e) => setU('materiasMas', e.target.value)} />}
                  </Campo>
                  <Campo label="¿Qué materias disfrutabas menos?">
                    {(id) => <input id={id} className="input" value={b.universidad.materiasMenos} onChange={(e) => setU('materiasMenos', e.target.value)} />}
                  </Campo>
                </div>
                <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend style={{ fontWeight: 550, padding: 0, marginBottom: 6 }}>¿Cómo financiaste tus estudios? <span className="muted small">(Selecciona todas las que apliquen)</span></legend>
                  <div className="opciones">
                    {FINANCIAMIENTO.map((f) => {
                      const sel = b.universidad.financiamiento.includes(f)
                      return (
                        <label key={f} className={`opcion${sel ? ' activa' : ''}`}>
                          <input
                            type="checkbox"
                            checked={sel}
                            onChange={() => setU('financiamiento', sel ? b.universidad.financiamiento.filter((x) => x !== f) : [...b.universidad.financiamiento, f])}
                          />
                          <span>{f}</span>
                        </label>
                      )
                    })}
                  </div>
                  <input className="input" placeholder="Otro (opcional)" value={b.universidad.financiamientoOtro} onChange={(e) => setU('financiamientoOtro', e.target.value)} />
                </fieldset>
                <Opciones
                  label="¿Trabajaste mientras estudiabas?"
                  req
                  horizontal
                  error={err('universidad.trabajaba')}
                  valor={b.universidad.trabajaba}
                  opciones={[{ valor: true, etiqueta: 'Sí' }, { valor: false, etiqueta: 'No' }]}
                  onChange={(v) => setU('trabajaba', v)}
                />
                <Campo label="¿Algo que quieras destacar de tu periodo universitario?" ayuda="Actividades extracurriculares, premios, cursos adicionales, clubes, etc.">
                  {(id) => <textarea id={id} className="textarea" value={b.universidad.destacar} onChange={(e) => setU('destacar', e.target.value)} />}
                </Campo>
              </>
            )}
          </>
        )}

        {paso === 5 && (
          <>
            <h2>Fortalezas y debilidades</h2>
            <Campo label="¿Qué habilidades y fortalezas tienes que te ayudarán a tener éxito en el puesto al que aplicas en Grow Medical?" req error={err('fortalezas')}>
              {(id) => <textarea id={id} className="textarea" value={b.fortalezas} onChange={(e) => set('fortalezas', e.target.value)} />}
            </Campo>
            <Campo label="¿Cuáles son tus debilidades o áreas de oportunidad?" req error={err('debilidades')}>
              {(id) => <textarea id={id} className="textarea" value={b.debilidades} onChange={(e) => set('debilidades', e.target.value)} />}
            </Campo>
          </>
        )}

        {paso === 6 && (
          <>
            <div className="stack-sm">
              <h2>Objetivos de carrera y cierre</h2>
              <p className="muted">Ya casi terminamos. Te recomendamos regresar a los pasos anteriores para revisar que todo esté correcto.</p>
            </div>
            <Campo label="¿Cuáles son tus objetivos profesionales?" req error={err('objetivos')}>
              {(id) => <textarea id={id} className="textarea" value={b.objetivos} onChange={(e) => set('objetivos', e.target.value)} />}
            </Campo>
            <div className={`campo${err('avisoPrivacidad') ? ' con-error' : ''}`}>
              <label className="check">
                <input type="checkbox" checked={b.avisoPrivacidad} onChange={(e) => set('avisoPrivacidad', e.target.checked)} />
                <span className="small">
                  Acepto que Grow Medical use los datos de esta solicitud únicamente para evaluar mi candidatura y, en su caso,
                  contactar a las referencias que autoricé, conforme a su <a href="/aviso-de-privacidad" target="_blank">aviso de privacidad</a>.
                </span>
              </label>
              {err('avisoPrivacidad') && <div className="error">{err('avisoPrivacidad')}</div>}
            </div>
          </>
        )}

        {errorEnvio && <div className="aviso aviso-amarillo">{errorEnvio}</div>}

        <div className="paso-nav">
          {paso > 0 ? <button type="button" className="btn" onClick={() => irA(paso - 1)}>Anterior</button> : <span />}
          <button type="button" className="btn btn-primary" disabled={enviando} onClick={siguiente}>
            {ultimo ? (enviando ? 'Enviando…' : 'Enviar solicitud') : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  )
}
