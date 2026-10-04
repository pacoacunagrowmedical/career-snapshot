import { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import type { Store } from '../data/store'
import type { Candidato, Puesto } from '../types'
import { analizarSeguro as analizar } from '../lib/analisis'
import { CONTACTO_JEFE, PRESTACIONES, calificacion, etiquetaFuente, razon } from '../lib/catalogos'
import { candidatosACsv, descargar } from '../lib/csv'
import { duracion, edad, fechaCorta, mesCorto } from '../lib/fechas'
import { dinero, porcentaje } from '../lib/formato'
import { SnapshotChart, colorEmpleo } from '../snapshot/SnapshotChart'
import { ConfirmarBorrado } from './ConfirmarBorrado'

export function PerfilPage() {
  const s = useOutletContext<Store>()
  const { id } = useParams()
  const navegar = useNavigate()
  const [c, setC] = useState<Candidato | null | undefined>(undefined)
  const [puestos, setPuestos] = useState<Puesto[]>([])
  const [borrar, setBorrar] = useState(false)

  useEffect(() => {
    Promise.all([s.candidato(id!), s.puestos()]).then(([cand, p]) => {
      setC(cand)
      setPuestos(p)
    })
  }, [s, id])

  if (c === undefined) return <p className="muted">Cargando…</p>
  if (c === null) return <div className="vacio">Este candidato no existe o fue eliminado. <Link to="/panel">Volver a la lista</Link></div>

  const ofrecido = puestos.find((p) => p.id === c.puestoId)?.sueldoOfrecido ?? null
  const a = analizar(c, ofrecido)
  const anios = edad(c.fechaNacimiento, c.creado)
  const cronologicoDesc = [...a.empleos].reverse()

  return (
    <div>
      <div className="row no-print" style={{ marginBottom: 12 }}>
        <Link to="/panel" className="btn btn-sm btn-ghost">← Candidatos</Link>
        <div className="spacer" />
        <button className="btn btn-sm" onClick={() => window.print()}>Imprimir / PDF</button>
        <button className="btn btn-sm" style={{ color: 'var(--rojo)' }} onClick={() => setBorrar(true)}>Eliminar</button>
      </div>

      <div className="perfil-head">
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1>{c.nombre}</h1>
          <div style={{ marginTop: 2 }}>Aplica a <b>{c.puestoNombre}</b> · {fechaCorta(c.creado)}</div>
          {c.origen === 'formulario-anterior' && (
            <div className="aviso small" style={{ marginTop: 8 }}>
              Importado del formulario anterior. No incluye fuente, sueldo esperado ni las calificaciones de resultados y trato con la gente
              (aparecen como “Sin dato”). La calificación del jefe se convirtió de la escala 1–10 a 1–5.
            </div>
          )}
          <div className="datos">
            <span>{c.email}</span>
            <span className="tabular">{c.telefono}</span>
            {anios !== null && <span>{anios} años</span>}
            <span>{c.pais}</span>
            <span>Llegó por: {etiquetaFuente(c.fuente)}{c.fuenteDetalle ? ` (${c.fuenteDetalle})` : ''}</span>
          </div>
        </div>
      </div>

      <div className="kpis">
        <Kpi lbl="Trayectoria" val={a.resumen} sub={a.inicioCarrera !== null ? `desde ${mesCorto(cronologicoDesc[cronologicoDesc.length - 1].empleo.inicio)}` : undefined} chico />
        <Kpi lbl="Promedio por empleo" val={a.empleos.length ? duracion(a.duracionPromedio) : '—'} chico />
        <Kpi
          lbl="Tiempo sin empleo"
          val={duracion(a.mesesSinEmpleo)}
          sub={a.mesesCarrera ? `${Math.round((a.mesesSinEmpleo / a.mesesCarrera) * 100)} % de su carrera${a.mesesFreelance >= 1 ? ` · ${duracion(a.mesesFreelance)} freelance` : ''}` : undefined}
          chico
        />
        <Kpi lbl="Ascensos" val={String(a.ascensos)} sub={`en ${a.empleosConAscenso} de ${a.empleos.length} empleos`} />
        <Kpi
          lbl="Crecimiento de sueldo"
          val={a.crecimientoSueldo === null ? '—' : porcentaje(a.crecimientoSueldo)}
          sub={a.sueldoPrimero && a.sueldoUltimo ? `${dinero(a.sueldoPrimero, c.moneda)} → ${dinero(a.sueldoUltimo, c.moneda)}` : undefined}
        />
        <Kpi lbl="Referencias verificables" val={`${a.referenciasVerificables} de ${a.empleos.length}`} sub="jefe contactable y calificable" />
      </div>

      <section className="card snapshot-card" style={{ marginBottom: 20 }}>
        <div className="snapshot-titulo">
          <h2>Snapshot de carrera</h2>
          <span className="muted small">
            {c.sueldoEsperado > 0 ? `Espera ${dinero(c.sueldoEsperado, c.moneda)} al mes` : 'Sueldo esperado: sin dato'}
            {ofrecido ? ` · Ofrecemos ${dinero(ofrecido)}` : ''}
          </span>
        </div>
        {a.empleos.length || a.freelance.length ? (
          <SnapshotChart a={a} moneda={c.moneda} sueldoEsperado={c.sueldoEsperado} sueldoOfrecido={ofrecido} />
        ) : (
          <div className="vacio">Sin empleos registrados.</div>
        )}
      </section>

      <div className="dos-col" style={{ marginBottom: 20 }}>
        <section className="card stack-sm">
          <h2 style={{ marginBottom: 8 }}>Banderas</h2>
          {a.banderas.length ? (
            <div className="banderas">
              {a.banderas.map((b, i) => (
                <div key={i} className={`bandera bandera-${b.nivel}`}>
                  <span className="ico" aria-hidden>{b.nivel === 'verde' ? '✓' : '!'}</span>
                  <span><span className="sr-only">{b.nivel === 'rojo' ? 'Alerta: ' : b.nivel === 'amarillo' ? 'Revisar: ' : 'Positivo: '}</span>{b.texto}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Sin banderas.</p>
          )}
        </section>

        <section className="card">
          <h2 style={{ marginBottom: 12 }}>Empleos</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="tabla">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Empresa / puesto</th>
                  <th>Periodo</th>
                  <th className="num-col">Sueldo</th>
                  <th className="num-col">Asc.</th>
                </tr>
              </thead>
              <tbody>
                {cronologicoDesc.map((t) => (
                  <tr key={t.numero}>
                    <td><span className="swatch" style={{ display: 'inline-block', background: colorEmpleo(t.numero), verticalAlign: 'middle', marginRight: 6 }} />{t.numero}</td>
                    <td>
                      <b>{t.empleo.empresa}</b>
                      <div className="muted small">
                        {t.empleo.puestoInicial === t.empleo.puestoFinal ? t.empleo.puestoFinal : `${t.empleo.puestoInicial} → ${t.empleo.puestoFinal}`}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {mesCorto(t.empleo.inicio)} – {t.empleo.actual ? 'actual' : mesCorto(t.empleo.fin!)}
                      <div className="muted small">{duracion(t.meses)}</div>
                    </td>
                    <td className="num-col">
                      {dinero(t.empleo.sueldoInicial, c.moneda)} → {dinero(t.empleo.sueldoFinal, c.moneda)}
                      {t.empleo.sueldoInicial > 0 && <div className="muted small">{porcentaje(t.empleo.sueldoFinal / t.empleo.sueldoInicial - 1)}</div>}
                    </td>
                    <td className="num-col">{t.empleo.ascensos >= 5 ? '5+' : t.empleo.ascensos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="card respuestas" style={{ marginBottom: 20 }}>
        <h2>Respuestas por empleo</h2>
        {cronologicoDesc.map((t) => {
          const e = t.empleo
          const r = razon(e.razonSalida)
          return (
            <div key={t.numero} className="empleo-detalle">
              <header>
                <span className="swatch" style={{ background: colorEmpleo(t.numero) }} />
                <h3>{t.numero}. {e.empresa}</h3>
                <span className="muted small">{mesCorto(e.inicio)} – {e.actual ? 'actual' : mesCorto(e.fin!)}</span>
              </header>
              <dl>
                <dt>Jefe directo</dt>
                <dd>{e.jefeNombre} · {e.jefePuesto}</dd>
                <dt>¿Podemos contactarlo?</dt>
                <dd>{CONTACTO_JEFE.find((x) => x.valor === e.contactoJefe)?.etiqueta}</dd>
                <dt>Calificación que le daría</dt>
                <dd>
                  <span className="row" style={{ gap: 10 }}>
                    {(['general', 'resultados', 'trato'] as const).map((k) => {
                      const cal = calificacion(e.calificacion[k])
                      return (
                        <span key={k} className="row" style={{ gap: 4 }}>
                          <span className={`codigo sem-${cal.semaforo}`}>{cal.corto}</span>
                          <span className="small">{k === 'general' ? 'General' : k === 'resultados' ? 'Resultados' : 'Trato'}</span>
                        </span>
                      )
                    })}
                  </span>
                </dd>
                <dt>Razón de salida</dt>
                <dd>
                  <span className={`codigo sem-${r.semaforo}`}>{r.corto}</span>
                  {e.razonDetalle && <div className="muted">“{e.razonDetalle}”</div>}
                </dd>
                <dt>Prestaciones</dt>
                <dd>{PRESTACIONES.find((p) => p.valor === e.prestaciones)?.etiqueta}</dd>
                <dt>Logro importante</dt>
                <dd>{e.logro || '—'}</dd>
                <dt>Lo que más disfrutaba</dt>
                <dd>{e.disfrutabaMas || '—'}</dd>
                <dt>Lo que menos disfrutaba</dt>
                <dd>{e.disfrutabaMenos || '—'}</dd>
              </dl>
            </div>
          )
        })}
      </section>

      <div className="dos-col">
        <section className="card respuestas stack">
          <h2>Freelance y universidad</h2>
          <dl>
            <dt>Freelance / negocio propio</dt>
            <dd>
              {c.freelance.length
                ? c.freelance.map((f, i) => (
                    <div key={i} style={{ marginBottom: 6 }}>
                      <b>{f.actividad}</b>
                      {f.inicio && <> · {mesCorto(f.inicio)} – {f.actual ? 'actual' : f.fin ? mesCorto(f.fin) : '?'}</>}
                      {f.descripcion && <div className="muted">{f.descripcion}</div>}
                    </div>
                  ))
                : 'No'}
            </dd>
            {c.universidad.asistio ? (
              <>
                <dt>Universidad</dt>
                <dd>{c.universidad.nombre}</dd>
                <dt>Carrera</dt>
                <dd>{c.universidad.carrera} · {c.universidad.termino ? 'Terminada' : 'Trunca'}</dd>
                <dt>Materias favoritas</dt>
                <dd>{c.universidad.materiasMas || '—'}</dd>
                <dt>Materias menos favoritas</dt>
                <dd>{c.universidad.materiasMenos || '—'}</dd>
                <dt>Financiamiento</dt>
                <dd>{[...c.universidad.financiamiento, c.universidad.financiamientoOtro].filter(Boolean).join(' · ') || '—'}</dd>
                <dt>¿Trabajaba mientras estudiaba?</dt>
                <dd>{c.universidad.trabajaba ? 'Sí' : 'No'}</dd>
                <dt>A destacar</dt>
                <dd>{c.universidad.destacar || '—'}</dd>
              </>
            ) : (
              <>
                <dt>Universidad</dt>
                <dd>No estudió en la universidad</dd>
              </>
            )}
          </dl>
        </section>
        <section className="card respuestas stack">
          <h2>Fortalezas y objetivos</h2>
          <dl>
            <dt>Fortalezas</dt>
            <dd>{c.fortalezas}</dd>
            <dt>Debilidades / áreas de oportunidad</dt>
            <dd>{c.debilidades}</dd>
            <dt>Objetivos profesionales</dt>
            <dd>{c.objetivos}</dd>
            <dt>Dirección</dt>
            <dd>{c.direccion || '—'}</dd>
          </dl>
        </section>
      </div>

      {borrar && (
        <ConfirmarBorrado
          nombres={[`${c.nombre} · ${c.puestoNombre} · ${fechaCorta(c.creado)}`]}
          onCancelar={() => setBorrar(false)}
          onExportar={() => descargar(`${c.nombre}.csv`, candidatosACsv([c], new Map([[c.puestoId, ofrecido]])))}
          onConfirmar={async () => {
            await s.borrarCandidatos([c.id])
            navegar('/panel')
          }}
        />
      )}
    </div>
  )
}

function Kpi(props: { lbl: string; val: string; sub?: string; chico?: boolean }) {
  return (
    <div className="kpi">
      <div className="lbl">{props.lbl}</div>
      <div className="val" style={props.chico ? { fontSize: '1.05rem', lineHeight: 1.35 } : undefined}>{props.val}</div>
      {props.sub && <div className="sub">{props.sub}</div>}
    </div>
  )
}
