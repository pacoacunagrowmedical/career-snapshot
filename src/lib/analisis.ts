import type { Candidato, Empleo, PeriodoFreelance } from '../types'
import { indiceMes, duracion, mesCorto, mesDeIndice } from './fechas'
import { ASPECTOS_CALIFICACION, calificacion, razon } from './catalogos'
import { dinero } from './formato'

/** Un periodo en la línea de tiempo. `desde` y `hasta` son índices de mes; `hasta` es exclusivo (fin del último mes). */
export interface Tramo {
  desde: number
  hasta: number
  meses: number
}

export interface TramoEmpleo extends Tramo {
  numero: number // 1 = el más antiguo
  empleo: Empleo
}

export interface Hueco extends Tramo {
  actual: boolean // desempleo vigente al momento de aplicar
  mesesFreelance: number
}

export interface Traslape {
  a: TramoEmpleo
  b: TramoEmpleo
  meses: number
}

export interface Bandera {
  nivel: 'rojo' | 'amarillo' | 'verde'
  texto: string
}

export interface Analisis {
  referencia: number // momento de la solicitud, en índice de mes fraccional
  empleos: TramoEmpleo[] // cronológico
  freelance: (Tramo & { periodo: PeriodoFreelance })[]
  huecos: Hueco[]
  traslapes: Traslape[]
  inicioCarrera: number | null
  mesesCarrera: number
  mesesEmpleado: number
  mesesSinEmpleo: number
  mesesFreelance: number
  duracionPromedio: number
  ascensos: number
  empleosConAscenso: number
  sueldoPrimero: number | null
  sueldoUltimo: number | null
  crecimientoSueldo: number | null // fracción: 0.5 = +50 %
  referenciasVerificables: number
  resumen: string
  banderas: Bandera[]
}

const TOLERANCIA = 1 // meses: un cambio de empleo dentro del mismo mes no es hueco ni traslape

function tramoDe(inicio: string, fin: string | null, actual: boolean, referencia: number): Tramo | null {
  if (!inicio) return null
  const desde = indiceMes(inicio)
  let hasta = actual || !fin ? referencia : indiceMes(fin) + 1
  if (hasta < desde) hasta = desde
  return { desde, hasta, meses: hasta - desde }
}

function fusionar(tramos: Tramo[]): Tramo[] {
  const orden = [...tramos].sort((x, y) => x.desde - y.desde)
  const res: Tramo[] = []
  for (const t of orden) {
    const ult = res[res.length - 1]
    if (ult && t.desde <= ult.hasta + 0.0001) {
      ult.hasta = Math.max(ult.hasta, t.hasta)
      ult.meses = ult.hasta - ult.desde
    } else {
      res.push({ ...t })
    }
  }
  return res
}

function interseccion(a: Tramo, b: Tramo): number {
  return Math.max(0, Math.min(a.hasta, b.hasta) - Math.max(a.desde, b.desde))
}

export function analizar(c: Candidato, sueldoOfrecido: number | null): Analisis {
  const ref = indiceMes(`${c.creado.getFullYear()}-${String(c.creado.getMonth() + 1).padStart(2, '0')}`) + (c.creado.getDate() - 1) / 30
  const banderas: Bandera[] = []

  const empleos: TramoEmpleo[] = []
  let incompletos = 0
  for (const e of c.empleos) {
    const t = tramoDe(e.inicio, e.fin, e.actual, ref)
    if (!t) {
      incompletos++
      continue
    }
    empleos.push({ ...t, numero: 0, empleo: e })
  }
  empleos.sort((x, y) => x.desde - y.desde || x.hasta - y.hasta)
  empleos.forEach((t, i) => (t.numero = i + 1))

  const freelance = c.freelance
    .map((p) => {
      const t = tramoDe(p.inicio, p.fin, p.actual, ref)
      return t && { ...t, periodo: p }
    })
    .filter((x): x is Tramo & { periodo: PeriodoFreelance } => !!x)
    .sort((x, y) => x.desde - y.desde)

  // Tiempo empleado = unión de empleos (los traslapes no cuentan doble).
  const union = fusionar(empleos)
  const mesesEmpleado = union.reduce((s, t) => s + t.meses, 0)

  const huecos: Hueco[] = []
  for (let i = 1; i < union.length; i++) {
    const desde = union[i - 1].hasta
    const hasta = union[i].desde
    if (hasta - desde >= TOLERANCIA) huecos.push({ desde, hasta, meses: hasta - desde, actual: false, mesesFreelance: 0 })
  }
  const ultimo = union[union.length - 1]
  if (ultimo && ref - ultimo.hasta >= 0.5) {
    huecos.push({ desde: ultimo.hasta, hasta: ref, meses: ref - ultimo.hasta, actual: true, mesesFreelance: 0 })
  }
  for (const h of huecos) h.mesesFreelance = freelance.reduce((s, f) => s + interseccion(h, f), 0)

  const traslapes: Traslape[] = []
  for (let i = 0; i < empleos.length; i++) {
    for (let j = i + 1; j < empleos.length; j++) {
      const m = interseccion(empleos[i], empleos[j])
      if (m > TOLERANCIA) traslapes.push({ a: empleos[i], b: empleos[j], meses: m })
    }
  }

  const inicioCarrera = empleos.length ? empleos[0].desde : null
  const mesesCarrera = inicioCarrera === null ? 0 : ref - inicioCarrera
  const mesesSinEmpleo = huecos.reduce((s, h) => s + h.meses, 0)
  const mesesFreelance = fusionar(freelance).reduce((s, t) => s + t.meses, 0)
  const duracionPromedio = empleos.length ? empleos.reduce((s, t) => s + t.meses, 0) / empleos.length : 0
  const ascensos = empleos.reduce((s, t) => s + (t.empleo.ascensos || 0), 0)
  const empleosConAscenso = empleos.filter((t) => t.empleo.ascensos > 0).length

  const sueldoPrimero = empleos.length ? empleos[0].empleo.sueldoInicial || null : null
  const sueldoUltimo = empleos.length ? empleos[empleos.length - 1].empleo.sueldoFinal || null : null
  const crecimientoSueldo = sueldoPrimero && sueldoUltimo ? sueldoUltimo / sueldoPrimero - 1 : null

  const referenciasVerificables = empleos.filter(
    (t) => t.empleo.contactoJefe === 'si' && t.empleo.calificacion.general !== 'I',
  ).length

  // ——— Banderas ———
  const n = empleos.length
  if (c.posibleBot) banderas.push({ nivel: 'rojo', texto: 'Marcada como posible bot por el filtro automático; revisa si es una persona real' })
  if (incompletos) banderas.push({ nivel: 'amarillo', texto: `${incompletos} empleo(s) sin fecha de entrada; no aparecen en la cronología` })

  const desempleoActual = huecos.find((h) => h.actual)
  if (desempleoActual && desempleoActual.meses >= 1) {
    banderas.push({
      nivel: desempleoActual.meses >= 6 ? 'rojo' : 'amarillo',
      texto: `Sin empleo desde ${mesCorto(mesDeIndice(Math.floor(desempleoActual.desde)))} (${duracion(desempleoActual.meses)} al aplicar${desempleoActual.mesesFreelance >= 1 ? ', haciendo freelance' : ''})`,
    })
  }

  if (n >= 2 && duracionPromedio < 12) banderas.push({ nivel: 'rojo', texto: `Duración promedio por empleo de solo ${duracion(duracionPromedio)}` })
  else if (n >= 2 && duracionPromedio < 24) banderas.push({ nivel: 'amarillo', texto: `Duración promedio por empleo de ${duracion(duracionPromedio)}` })

  const cortos = empleos.filter((t) => !t.empleo.actual && t.meses < 12)
  if (cortos.length && !(n >= 2 && duracionPromedio < 24)) {
    banderas.push({ nivel: 'amarillo', texto: `${cortos.length} empleo(s) de menos de un año: ${cortos.map((t) => t.empleo.empresa).join(', ')}` })
  }

  for (const t of empleos) {
    const r = razon(t.empleo.razonSalida)
    if (r.semaforo === 'rojo') banderas.push({ nivel: 'rojo', texto: `${r.etiqueta} en ${t.empleo.empresa}` })
    else if (r.semaforo === 'amarillo') banderas.push({ nivel: 'amarillo', texto: `${r.etiqueta} en ${t.empleo.empresa}` })
  }

  for (const t of empleos) {
    for (const a of ASPECTOS_CALIFICACION) {
      const v = t.empleo.calificacion[a.clave]
      if (v === 1 || v === 2) {
        banderas.push({ nivel: 'rojo', texto: `Su jefe en ${t.empleo.empresa} le daría ${v} (${calificacion(v).etiqueta.toLowerCase()}) en ${a.etiqueta.toLowerCase()}` })
      }
    }
  }

  const nunca = empleos.filter((t) => t.empleo.contactoJefe === 'nunca')
  if (nunca.length) banderas.push({ nivel: 'rojo', texto: `Nunca permitiría contactar a su jefe en ${nunca.map((t) => t.empleo.empresa).join(', ')}` })

  const imposibles = empleos.filter((t) => Object.values(t.empleo.calificacion).includes('I'))
  if (imposibles.length) banderas.push({ nivel: 'amarillo', texto: `No puede dar la calificación de su jefe en ${imposibles.map((t) => t.empleo.empresa).join(', ')}` })

  if (n && referenciasVerificables < Math.ceil(n / 2)) {
    banderas.push({ nivel: 'amarillo', texto: `Referencias limitadas: ${referenciasVerificables} de ${n} empleos verificables` })
  }

  for (const h of huecos) {
    if (!h.actual && h.meses >= 6) {
      const extra = h.mesesFreelance >= 1 ? `, con ${duracion(h.mesesFreelance)} de freelance` : ''
      banderas.push({ nivel: 'amarillo', texto: `Hueco de ${duracion(h.meses)} sin empleo (${mesCorto(mesDeIndice(Math.floor(h.desde)))} – ${mesCorto(mesDeIndice(Math.ceil(h.hasta) - 1))}${extra})` })
    }
  }

  for (let i = 1; i < empleos.length; i++) {
    const antes = empleos[i - 1].empleo.sueldoFinal
    const despues = empleos[i].empleo.sueldoInicial
    if (antes && despues && despues < antes * 0.9) {
      banderas.push({
        nivel: 'amarillo',
        texto: `Bajó de sueldo al pasar de ${empleos[i - 1].empleo.empresa} a ${empleos[i].empleo.empresa} (${dinero(antes)} → ${dinero(despues)})`,
      })
    }
  }

  if (traslapes.length) {
    for (const t of traslapes) {
      banderas.push({ nivel: 'amarillo', texto: `Tuvo dos empleos a la vez durante ${duracion(t.meses)}: ${t.a.empleo.empresa} y ${t.b.empleo.empresa}` })
    }
  }

  if (sueldoOfrecido && c.sueldoEsperado && c.moneda === 'MXN' && c.sueldoEsperado > sueldoOfrecido * 1.1) {
    banderas.push({
      nivel: 'amarillo',
      texto: `Espera ${dinero(c.sueldoEsperado)}, ${Math.round((c.sueldoEsperado / sueldoOfrecido - 1) * 100)} % arriba de lo que ofrecemos (${dinero(sueldoOfrecido)})`,
    })
  }

  // Positivas
  if (n && empleosConAscenso >= Math.ceil(n / 2)) banderas.push({ nivel: 'verde', texto: `Tuvo ascensos en ${empleosConAscenso} de ${n} empleos (${ascensos} en total)` })
  if (n >= 2 && duracionPromedio >= 36) banderas.push({ nivel: 'verde', texto: `Estable: ${duracion(duracionPromedio)} en promedio por empleo` })
  if (n && empleos.every((t) => t.empleo.calificacion.general === 4 || t.empleo.calificacion.general === 5)) {
    banderas.push({ nivel: 'verde', texto: 'Todos sus jefes le darían 4 o 5 de calificación general' })
  }
  if (crecimientoSueldo !== null && crecimientoSueldo >= 0.5) {
    banderas.push({ nivel: 'verde', texto: `Su sueldo creció ${Math.round(crecimientoSueldo * 100)} % a lo largo de su carrera` })
  }

  const orden = { rojo: 0, amarillo: 1, verde: 2 }
  banderas.sort((x, y) => orden[x.nivel] - orden[y.nivel])

  const empresas = new Set(empleos.map((t) => t.empleo.empresa.trim().toLowerCase())).size
  const resumen = inicioCarrera === null
    ? 'Sin empleos registrados'
    : `${empresas} ${empresas === 1 ? 'empleador' : 'empleadores'} en ${duracion(mesesCarrera)}`

  return {
    referencia: ref,
    empleos,
    freelance,
    huecos,
    traslapes,
    inicioCarrera,
    mesesCarrera,
    mesesEmpleado,
    mesesSinEmpleo,
    mesesFreelance,
    duracionPromedio,
    ascensos,
    empleosConAscenso,
    sueldoPrimero,
    sueldoUltimo,
    crecimientoSueldo,
    referenciasVerificables,
    resumen,
    banderas,
  }
}

/** Igual que analizar(), pero nunca truena: si los datos de un candidato vienen corruptos, devuelve un análisis vacío con aviso. */
export function analizarSeguro(c: Candidato, sueldoOfrecido: number | null): Analisis {
  try {
    return analizar(c, sueldoOfrecido)
  } catch (err) {
    console.error('No se pudo analizar al candidato', c.id, err)
    const vacio = analizar({ ...c, empleos: [], freelance: [] }, null)
    vacio.banderas.unshift({ nivel: 'rojo', texto: 'Los datos de esta solicitud están incompletos o dañados; revisa las respuestas abajo' })
    return vacio
  }
}
