import { useMemo, useRef, useState, type ReactNode } from 'react'
import type { Analisis, TramoEmpleo } from '../lib/analisis'
import { ASPECTOS_CALIFICACION, CALIFICACIONES, MESES, RAZONES_SALIDA, calificacion, razon, type Semaforo } from '../lib/catalogos'
import { duracion, mesCorto, mesDeIndice } from '../lib/fechas'
import { dinero, dineroCorto } from '../lib/formato'

/** Color del empleo n (1 = más antiguo). Orden fijo de la paleta categórica; con más de 8 empleos se repite, pero cada barra lleva su número. */
export const colorEmpleo = (n: number) => `var(--serie-${((n - 1) % 8) + 1})`
/** Tinta legible sobre el color del empleo (aqua, amarillo y rosa son claros). */
const tintaEmpleo = (n: number) => ([3, 4, 5].includes(((n - 1) % 8) + 1) ? '#10201b' : '#fff')

const SEM: Record<Semaforo, string> = { verde: 'var(--verde)', amarillo: 'var(--amarillo)', rojo: 'var(--rojo)', gris: 'var(--gris)' }
const TEXTO_SEM: Record<Semaforo, string> = { verde: '#fff', amarillo: '#10201b', rojo: '#fff', gris: '#fff' }

const W = 1000
const IZQ = 150 // ancho de etiquetas de filas
const DER = 16
const ALTO_GRAF = 300
const ARRIBA = 16
const FILA = 30
const GAP = 4

interface Props {
  a: Analisis
  moneda: string
  sueldoEsperado: number
  sueldoOfrecido: number | null
}

function ticksY(max: number): number[] {
  const crudo = max / 4
  const pot = 10 ** Math.floor(Math.log10(crudo))
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= crudo) ?? crudo
  const res: number[] = []
  for (let v = 0; res.length < 2 || res[res.length - 1] < max; v += paso) res.push(v)
  return res
}

export function SnapshotChart({ a, moneda, sueldoEsperado, sueldoOfrecido }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<{ x: number; px: number; py: number } | null>(null)

  const g = useMemo(() => {
    const desde = Math.floor(Math.min(a.inicioCarrera ?? a.referencia - 12, ...a.freelance.map((f) => f.desde)))
    const hasta = Math.ceil(a.referencia) + 1
    const span = Math.max(12, hasta - desde)
    const x = (m: number) => IZQ + ((m - desde) / span) * (W - IZQ - DER)

    const mostrarOfrecido = sueldoOfrecido && moneda === 'MXN' ? sueldoOfrecido : null
    const maxDato = Math.max(1, ...a.empleos.flatMap((t) => [t.empleo.sueldoInicial, t.empleo.sueldoFinal]), sueldoEsperado || 0, mostrarOfrecido || 0)
    const ticks = ticksY(maxDato * 1.08)
    const maxY = ticks[ticks.length - 1]
    const y = (v: number) => ARRIBA + ALTO_GRAF - (v / maxY) * ALTO_GRAF

    // Marcas del eje X: años (o semestres si la carrera es corta).
    const marcas: { m: number; etiqueta: string }[] = []
    const anioIni = Math.ceil(desde / 12)
    const anioFin = Math.floor(hasta / 12)
    const cadaAnios = Math.max(1, Math.ceil((anioFin - anioIni + 1) / 12))
    if (span <= 36) {
      for (let m = Math.ceil(desde / 6) * 6; m <= hasta; m += 6) marcas.push({ m, etiqueta: `${MESES[m % 12]} ${String(Math.floor(m / 12)).slice(2)}` })
    } else {
      for (let an = anioIni; an <= anioFin; an += cadaAnios) marcas.push({ m: an * 12, etiqueta: String(an) })
    }
    return { desde, hasta, x, y, ticks, maxY, marcas, mostrarOfrecido }
  }, [a, moneda, sueldoEsperado, sueldoOfrecido])

  const { x, y } = g
  const base = ARRIBA + ALTO_GRAF

  // Filas alineadas debajo de la gráfica.
  const filas: { etiqueta: string; render: (top: number) => ReactNode }[] = [
    {
      etiqueta: 'Empleo #',
      render: (top) => a.empleos.map((t) => (
        <text key={t.numero} x={(x(t.desde) + x(t.hasta)) / 2} y={top + FILA / 2 + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--text)">{t.numero}</text>
      )),
    },
    {
      etiqueta: 'Empleador',
      render: (top) => a.empleos.map((t) => <Celda key={t.numero} t={t} top={top} x={x} fill={colorEmpleo(t.numero)} texto={t.empleo.empresa} tinta={tintaEmpleo(t.numero)} />),
    },
    {
      etiqueta: 'Razón de salida',
      render: (top) => a.empleos.map((t) => {
        const r = razon(t.empleo.razonSalida)
        return <Celda key={t.numero} t={t} top={top} x={x} fill={SEM[r.semaforo]} texto={r.codigo} tinta={TEXTO_SEM[r.semaforo]} negrita />
      }),
    },
    ...ASPECTOS_CALIFICACION.map((asp) => ({
      etiqueta: asp.etiqueta,
      render: (top: number) => a.empleos.map((t) => {
        const c = calificacion(t.empleo.calificacion[asp.clave])
        return <Celda key={t.numero} t={t} top={top} x={x} fill={SEM[c.semaforo]} texto={String(c.valor)} tinta={TEXTO_SEM[c.semaforo]} negrita />
      }),
    })),
    {
      etiqueta: 'Sin empleo',
      render: (top) => a.huecos.map((h, i) => {
        const w = x(h.hasta) - x(h.desde)
        return (
          <g key={i}>
            <rect x={x(h.desde) + 1} y={top + 3} width={Math.max(2, w - 2)} height={FILA - 6} rx={4} fill="var(--rojo-wash)" stroke="var(--rojo)" strokeWidth={1} strokeDasharray={h.actual ? '4 3' : undefined} />
            {w > 46 && <text x={x(h.desde) + w / 2} y={top + FILA / 2 + 4} textAnchor="middle" fontSize={11} fill="var(--text)">{duracion(h.meses).replace(' años', 'a').replace(' año', 'a').replace(' meses', 'm').replace(' mes', 'm')}</text>}
          </g>
        )
      }),
    },
    {
      etiqueta: 'Freelance',
      render: (top) => a.freelance.map((f, i) => {
        const w = x(f.hasta) - x(f.desde)
        return (
          <g key={i}>
            <rect x={x(f.desde) + 1} y={top + 3} width={Math.max(2, w - 2)} height={FILA - 6} rx={4} fill="url(#rayado)" stroke="var(--gris)" />
            {w > 70 && <text x={x(f.desde) + w / 2} y={top + FILA / 2 + 4} textAnchor="middle" fontSize={11} fill="var(--text)">{recortar(f.periodo.actividad, w / 7)}</text>}
          </g>
        )
      }),
    },
  ]

  const topFilas = base + 34
  const altoTotal = topFilas + filas.length * (FILA + GAP) + 4

  // Tooltip: empleo(s) bajo el cursor.
  const enCursor = hover ? a.empleos.filter((t) => hover.x >= t.desde && hover.x < t.hasta) : []
  const huecoCursor = hover ? a.huecos.find((h) => hover.x >= h.desde && hover.x < h.hasta) : undefined
  const freeCursor = hover ? a.freelance.filter((f) => hover.x >= f.desde && hover.x < f.hasta) : []

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const r = svg.getBoundingClientRect()
    const sx = ((e.clientX - r.left) / r.width) * W
    if (sx < IZQ || sx > W - DER) return setHover(null)
    const m = g.desde + ((sx - IZQ) / (W - IZQ - DER)) * (g.hasta - g.desde)
    setHover({ x: m, px: e.clientX, py: e.clientY })
  }

  const sueldoEn = (t: TramoEmpleo, m: number) => {
    const f = t.meses ? Math.min(1, Math.max(0, (m - t.desde) / t.meses)) : 0
    return t.empleo.sueldoInicial + (t.empleo.sueldoFinal - t.empleo.sueldoInicial) * f
  }

  return (
    <div style={{ position: 'relative' }}>
      <div className="snapshot-scroll">
      <svg
        ref={svgRef}
        className="snapshot-svg"
        viewBox={`0 0 ${W} ${altoTotal}`}
        role="img"
        aria-label="Sueldo mensual a lo largo de la carrera, con empleos, razones de salida y calificaciones alineados en el tiempo"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <pattern id="rayado" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--gris-wash)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--gris)" strokeWidth="2" />
          </pattern>
        </defs>

        {/* Rejilla y eje Y */}
        {g.ticks.map((v) => (
          <g key={v}>
            <line x1={IZQ} x2={W - DER} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={1} />
            <text x={IZQ - 10} y={y(v) + 4} textAnchor="end" fontSize={12} fill="var(--text-2)" className="tabular">{dineroCorto(v)}</text>
          </g>
        ))}
        <text x={0} y={ARRIBA + 4} fontSize={12} fontWeight={600} fill="var(--text-2)">Sueldo mensual</text>
        <text x={0} y={ARRIBA + 20} fontSize={11} fill="var(--text-3)">neto, {moneda}</text>

        {/* Huecos sin empleo: franja tenue en la gráfica */}
        {a.huecos.map((h, i) => (
          <rect key={i} x={x(h.desde)} y={ARRIBA} width={Math.max(0, x(h.hasta) - x(h.desde))} height={ALTO_GRAF} fill="var(--rojo)" opacity={0.06} />
        ))}

        {/* Áreas de sueldo por empleo */}
        {a.empleos.map((t) => {
          const x0 = x(t.desde)
          const x1 = Math.max(x0 + 2, x(t.hasta))
          const y0 = y(t.empleo.sueldoInicial)
          const y1 = y(t.empleo.sueldoFinal)
          const c = colorEmpleo(t.numero)
          return (
            <g key={t.numero}>
              <path d={`M${x0},${base} L${x0},${y0} L${x1},${y1} L${x1},${base} Z`} fill={c} opacity={0.22} />
              <path d={`M${x0},${base} L${x0},${y0} L${x1},${y1} L${x1},${base}`} fill="none" stroke={c} strokeWidth={2} strokeLinejoin="round" />
              <circle cx={x1} cy={y1} r={4} fill={c} stroke="var(--surface)" strokeWidth={2} />
            </g>
          )
        })}

        {/* Líneas de referencia */}
        {sueldoEsperado > 0 && (
          <LineaRef y={y(sueldoEsperado)} etiqueta={`Espera ${dineroCorto(sueldoEsperado)}`} color="var(--text)" lado="izq" />
        )}
        {g.mostrarOfrecido && (
          <LineaRef y={y(g.mostrarOfrecido)} etiqueta={`Ofrecemos ${dineroCorto(g.mostrarOfrecido)}`} color="var(--brand)" punteada lado="der" />
        )}

        {/* Eje X */}
        <line x1={IZQ} x2={W - DER} y1={base} y2={base} stroke="var(--border-strong)" />
        {g.marcas.map((mk) => (
          <g key={mk.m}>
            <line x1={x(mk.m)} x2={x(mk.m)} y1={base} y2={base + 5} stroke="var(--border-strong)" />
            <text x={x(mk.m)} y={base + 20} textAnchor="middle" fontSize={12} fill="var(--text-2)">{mk.etiqueta}</text>
          </g>
        ))}

        {/* Filas alineadas */}
        {filas.map((f, i) => {
          const top = topFilas + i * (FILA + GAP)
          return (
            <g key={f.etiqueta}>
              <text x={0} y={top + FILA / 2 + 4} fontSize={12} fill="var(--text-2)">{f.etiqueta}</text>
              {i > 0 && <line x1={IZQ} x2={W - DER} y1={top - GAP / 2} y2={top - GAP / 2} stroke="var(--border)" strokeWidth={0.5} />}
              {f.render(top)}
            </g>
          )
        })}

        {/* Cursor */}
        {hover && (
          <line x1={x(hover.x)} x2={x(hover.x)} y1={ARRIBA} y2={altoTotal - 4} stroke="var(--text-3)" strokeWidth={1} pointerEvents="none" />
        )}
      </svg>
      </div>

      {hover && (enCursor.length > 0 || huecoCursor || freeCursor.length > 0) && (
        <div
          className="tooltip"
          style={{
            left: Math.min(hover.px + 14, window.innerWidth - 300),
            top: hover.py + 14,
          }}
        >
          <div className="muted small" style={{ marginBottom: 6 }}>{mesCorto(mesDeIndice(Math.floor(hover.x)))}</div>
          {enCursor.map((t) => (
            <div key={t.numero} style={{ marginBottom: 6 }}>
              <div className="t-row">
                <span className="t-key" style={{ background: colorEmpleo(t.numero) }} />
                <span className="t-val tabular">{dinero(Math.round(sueldoEn(t, hover.x) / 100) * 100, moneda)}</span>
              </div>
              <div>{t.empleo.empresa}</div>
              <div className="muted small">{t.empleo.puestoFinal} · {duracion(t.meses)}</div>
            </div>
          ))}
          {huecoCursor && !enCursor.length && (
            <div><b>Sin empleo</b> · {duracion(huecoCursor.meses)}{huecoCursor.actual ? ' (al aplicar)' : ''}</div>
          )}
          {freeCursor.map((f, i) => (
            <div key={i} className="muted small">Freelance: {f.periodo.actividad}</div>
          ))}
        </div>
      )}

      <div className="leyendas">
        <div className="leyenda">
          <h4>Líneas</h4>
          <ul>
            {sueldoEsperado > 0 && <li><span className="linea-key" style={{ borderColor: 'var(--text)' }} /> Sueldo que espera: {dinero(sueldoEsperado, moneda)}</li>}
            {g.mostrarOfrecido ? (
              <li><span className="linea-key" style={{ borderColor: 'var(--brand)', borderTopStyle: 'dashed' }} /> Sueldo que ofrecemos: {dinero(g.mostrarOfrecido)}</li>
            ) : sueldoOfrecido && moneda !== 'MXN' ? (
              <li className="muted">Sueldo ofrecido ({dinero(sueldoOfrecido)}) no se dibuja: el candidato reportó en {moneda}</li>
            ) : null}
            <li><span className="swatch" style={{ background: 'var(--rojo-wash)', border: '1px solid var(--rojo)' }} /> Sin empleo (punteado = vigente al aplicar)</li>
            <li><span className="swatch" style={{ background: 'url(#rayado)', backgroundImage: 'repeating-linear-gradient(45deg, var(--gris) 0 2px, var(--gris-wash) 2px 6px)' }} /> Freelance (cuenta como sin empleo)</li>
          </ul>
        </div>
        <div className="leyenda">
          <h4>Razón de salida</h4>
          <ul>
            {RAZONES_SALIDA.map((r) => (
              <li key={r.codigo}><span className={`codigo sem-${r.semaforo}`}>{r.codigo}</span> {r.etiqueta}</li>
            ))}
          </ul>
        </div>
        <div className="leyenda">
          <h4>Calificación del jefe</h4>
          <ul>
            {CALIFICACIONES.map((c) => (
              <li key={String(c.valor)}><span className={`codigo sem-${c.semaforo}`}>{c.valor}</span> {c.etiqueta}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function LineaRef({ y, etiqueta, color, punteada, lado }: { y: number; etiqueta: string; color: string; punteada?: boolean; lado: 'izq' | 'der' }) {
  const ancho = etiqueta.length * 7 + 14
  const x0 = lado === 'izq' ? IZQ + 6 : W - DER - ancho - 6
  return (
    <g>
      <line x1={IZQ} x2={W - DER} y1={y} y2={y} stroke={color} strokeWidth={2} strokeDasharray={punteada ? '6 4' : undefined} />
      <rect x={x0} y={y - 9} width={ancho} height={18} rx={4} fill={color} />
      <text x={x0 + ancho / 2} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="#fff">{etiqueta}</text>
    </g>
  )
}

function Celda(props: { t: TramoEmpleo; top: number; x: (m: number) => number; fill: string; texto: string; tinta: string; negrita?: boolean }) {
  const x0 = props.x(props.t.desde) + 1
  const w = Math.max(2, props.x(props.t.hasta) - props.x(props.t.desde) - 2)
  const cabe = props.negrita ? w > 18 : w > 40
  return (
    <g>
      <rect x={x0} y={props.top} width={w} height={FILA} rx={4} fill={props.fill} />
      {cabe && (
        <text x={x0 + w / 2} y={props.top + FILA / 2 + 4} textAnchor="middle" fontSize={props.negrita ? 13 : 12} fontWeight={props.negrita ? 700 : 500} fill={props.tinta}>
          {recortar(props.texto, w / 7.2)}
        </text>
      )}
    </g>
  )
}

function recortar(s: string, max: number): string {
  const n = Math.floor(max)
  return s.length <= n ? s : `${s.slice(0, Math.max(1, n - 1))}…`
}
