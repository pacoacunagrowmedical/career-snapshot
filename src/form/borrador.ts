import type { Calificacion, CodigoSalida, ContactoJefe, Empleo, PeriodoFreelance, Prestaciones, Solicitud, Universidad } from '../types'
import { indiceMes, mesDeFecha } from '../lib/fechas'
import { mesCompleto } from './campos'

// Estado del formulario mientras el candidato lo llena (permite campos vacíos).

export interface EmpleoBorrador {
  empresa: string
  puestoInicial: string
  puestoFinal: string
  mismoPuesto: boolean
  ascensos: number | null
  inicio: string
  fin: string
  actual: boolean
  sueldoInicial: number
  sueldoFinal: number
  prestaciones: Prestaciones | null
  jefeNombre: string
  jefePuesto: string
  calificacion: { general: Calificacion | null; resultados: Calificacion | null; trato: Calificacion | null }
  logro: string
  disfrutabaMas: string
  disfrutabaMenos: string
  razonSalida: CodigoSalida | null
  razonDetalle: string
  contactoJefe: ContactoJefe | null
}

export interface Borrador {
  puestoId: string
  fuente: string
  fuenteDetalle: string
  nombre: string
  fechaNacimiento: string
  pais: string
  direccion: string
  email: string
  telefono: string
  moneda: string
  sueldoEsperado: number
  empleos: EmpleoBorrador[]
  hizoFreelance: boolean | null
  freelance: PeriodoFreelance[]
  universidad: Universidad
  fortalezas: string
  debilidades: string
  objetivos: string
  avisoPrivacidad: boolean
}

export const empleoVacio = (): EmpleoBorrador => ({
  empresa: '', puestoInicial: '', puestoFinal: '', mismoPuesto: false, ascensos: null, inicio: '', fin: '', actual: false,
  sueldoInicial: 0, sueldoFinal: 0, prestaciones: null, jefeNombre: '', jefePuesto: '',
  calificacion: { general: null, resultados: null, trato: null },
  logro: '', disfrutabaMas: '', disfrutabaMenos: '', razonSalida: null, razonDetalle: '', contactoJefe: null,
})

export const freelanceVacio = (): PeriodoFreelance => ({ actividad: '', inicio: '', fin: null, actual: false, descripcion: '' })

export const borradorVacio = (): Borrador => ({
  puestoId: '', fuente: '', fuenteDetalle: '', nombre: '', fechaNacimiento: '', pais: 'México', direccion: '',
  email: '', telefono: '', moneda: 'MXN', sueldoEsperado: 0,
  empleos: [empleoVacio()],
  hizoFreelance: null, freelance: [],
  universidad: {
    asistio: true, nombre: '', carrera: '', termino: null, materiasMas: '', materiasMenos: '',
    financiamiento: [], financiamientoOtro: '', trabajaba: null, destacar: '',
  },
  fortalezas: '', debilidades: '', objetivos: '', avisoPrivacidad: false,
})

export type Errores = Record<string, string>

const OBLIG = 'Este campo es obligatorio'
const vacio = (s: string) => !s.trim()
const esMexico = (pais: string) => /^m[eé]xico$/i.test(pais.trim())
const mesFuturo = (m: string) => indiceMes(m) > indiceMes(mesDeFecha(new Date()))

/** Teléfono mexicano a 10 dígitos: acepta +52, 52 o 521 al inicio. */
export function telefonoMx(t: string): string {
  const d = t.replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('52')) return d.slice(2)
  if (d.length === 13 && d.startsWith('521')) return d.slice(3)
  return d
}

const monedaDe = (b: Borrador) => (esMexico(b.pais) ? 'MXN' : b.moneda)

// Rangos razonables de sueldo MENSUAL neto por moneda. Fuera de ellos se pide confirmar (no se bloquea).
const RANGOS: Record<string, [number, number]> = { MXN: [1000, 150000], USD: [100, 25000], EUR: [100, 25000] }

function revisarSueldo(n: number, moneda: string): string | null {
  const r = RANGOS[moneda]
  if (!r || !(n > 0)) return null
  if (n > r[1]) return 'Es una cantidad muy alta para un sueldo mensual. Recuerda que es mensual y neto, no anual ni bruto. Si es correcta, da Siguiente de nuevo.'
  if (n < r[0]) return 'Parece muy baja. Escribe la cantidad completa (por ejemplo 15,000 y no 15). Si es correcta, da Siguiente de nuevo.'
  return null
}

/** Avisos de datos sospechosos. No bloquean: el candidato puede confirmar y seguir. */
export function avisosPaso(paso: number, b: Borrador): Errores {
  const a: Errores = {}
  const moneda = monedaDe(b)
  if (paso === 1) {
    const s = revisarSueldo(b.sueldoEsperado, moneda)
    if (s) a.sueldoEsperado = s
  }
  if (paso === 2) {
    if (b.empleos.length === 1) {
      a.unicoEmpleo = 'Solo agregaste un empleo. Si has tenido más, usa el botón “Agregar otro empleo”. Si este es tu único empleo, da Siguiente de nuevo.'
    }
    const mesActual = mesDeFecha(new Date())
    b.empleos.forEach((j, i) => {
      const p = `empleos.${i}.`
      const si = revisarSueldo(j.sueldoInicial, moneda)
      const sf = revisarSueldo(j.sueldoFinal, moneda)
      if (si) a[p + 'sueldoInicial'] = si
      if (sf) a[p + 'sueldoFinal'] = sf
      else if (j.sueldoInicial > 0 && j.sueldoFinal > j.sueldoInicial * 3) {
        a[p + 'sueldoFinal'] = 'Es más del triple de tu sueldo al entrar. Revisa que ambas cantidades sean mensuales y netas. Si es correcto, da Siguiente de nuevo.'
      } else if (j.sueldoFinal > 0 && j.sueldoFinal * 3 < j.sueldoInicial) {
        a[p + 'sueldoFinal'] = 'Es menos de la tercera parte de tu sueldo al entrar. Revisa las cantidades. Si es correcto, da Siguiente de nuevo.'
      }
      if (!j.actual && j.fin === mesActual) {
        a[p + 'fin'] = 'Si todavía trabajas aquí, marca “Trabajo aquí actualmente” arriba. Si ya saliste este mes, da Siguiente de nuevo.'
      }
    })
  }
  return a
}

export const PASOS = ['Inicio', 'Tus datos', 'Empleos', 'Freelance', 'Universidad', 'Fortalezas', 'Objetivos'] as const

export function validarPaso(paso: number, b: Borrador): Errores {
  const e: Errores = {}
  if (paso === 0) {
    if (!b.puestoId) e.puestoId = 'Elige el puesto al que aplicas'
    if (!b.fuente) e.fuente = 'Elige una opción'
    if ((b.fuente === 'referido' || b.fuente === 'otro') && vacio(b.fuenteDetalle)) e.fuenteDetalle = OBLIG
  }
  if (paso === 1) {
    if (b.nombre.trim().split(/\s+/).length < 2) e.nombre = 'Escribe tu nombre completo (nombre y apellidos)'
    if (!b.fechaNacimiento) e.fechaNacimiento = OBLIG
    if (vacio(b.pais)) e.pais = OBLIG
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email.trim())) e.email = 'Escribe un correo válido'
    const digitos = esMexico(b.pais) ? telefonoMx(b.telefono) : b.telefono.replace(/\D/g, '')
    if (esMexico(b.pais) ? digitos.length !== 10 : digitos.length < 7 || digitos.length > 15) {
      e.telefono = esMexico(b.pais) ? 'Escribe 10 dígitos, sin lada internacional' : 'Escribe un teléfono válido'
    }
    if (!esMexico(b.pais) && !b.moneda) e.moneda = OBLIG
    if (!(b.sueldoEsperado > 0)) e.sueldoEsperado = 'Escribe una cantidad'
  }
  if (paso === 2) {
    if (!b.empleos.length) e.empleos = 'Agrega al menos tu empleo actual o más reciente'
    b.empleos.forEach((j, i) => Object.assign(e, validarEmpleo(j, `empleos.${i}.`)))
  }
  if (paso === 3) {
    if (b.hizoFreelance === null) e.hizoFreelance = 'Elige una opción'
    if (b.hizoFreelance) {
      b.freelance.forEach((f, i) => {
        const p = `freelance.${i}.`
        if (vacio(f.actividad)) e[p + 'actividad'] = OBLIG
        if (!mesCompleto(f.inicio)) e[p + 'inicio'] = 'Elige mes y año'
        if (!f.actual && !mesCompleto(f.fin ?? '')) e[p + 'fin'] = 'Elige mes y año'
        else if (!f.actual && f.fin && mesCompleto(f.inicio) && indiceMes(f.fin) < indiceMes(f.inicio)) e[p + 'fin'] = 'La fecha de fin es anterior al inicio'
      })
    }
  }
  if (paso === 4) {
    const u = b.universidad
    if (u.asistio) {
      if (vacio(u.nombre)) e['universidad.nombre'] = OBLIG
      if (vacio(u.carrera)) e['universidad.carrera'] = OBLIG
      if (u.termino === null) e['universidad.termino'] = 'Elige una opción'
      if (u.trabajaba === null) e['universidad.trabajaba'] = 'Elige una opción'
    }
  }
  if (paso === 5) {
    if (vacio(b.fortalezas)) e.fortalezas = OBLIG
    if (vacio(b.debilidades)) e.debilidades = OBLIG
  }
  if (paso === 6) {
    if (vacio(b.objetivos)) e.objetivos = OBLIG
    if (!b.avisoPrivacidad) e.avisoPrivacidad = 'Necesitamos tu consentimiento para procesar tu solicitud'
  }
  return e
}

function validarEmpleo(j: EmpleoBorrador, p: string): Errores {
  const e: Errores = {}
  if (vacio(j.empresa)) e[p + 'empresa'] = OBLIG
  if (vacio(j.puestoInicial)) e[p + 'puestoInicial'] = OBLIG
  if (!j.mismoPuesto && vacio(j.puestoFinal)) e[p + 'puestoFinal'] = OBLIG
  if (j.ascensos === null) e[p + 'ascensos'] = 'Elige una opción'
  if (!mesCompleto(j.inicio)) e[p + 'inicio'] = 'Elige mes y año'
  else if (mesFuturo(j.inicio)) e[p + 'inicio'] = 'La fecha no puede ser futura'
  if (!j.actual) {
    if (!mesCompleto(j.fin)) e[p + 'fin'] = 'Elige mes y año'
    else if (mesFuturo(j.fin)) e[p + 'fin'] = 'La fecha no puede ser futura'
    else if (mesCompleto(j.inicio) && indiceMes(j.fin) < indiceMes(j.inicio)) e[p + 'fin'] = 'La fecha de salida es anterior a la de entrada'
  }
  if (!(j.sueldoInicial > 0)) e[p + 'sueldoInicial'] = 'Escribe una cantidad'
  if (!(j.sueldoFinal > 0)) e[p + 'sueldoFinal'] = 'Escribe una cantidad'
  if (!j.prestaciones) e[p + 'prestaciones'] = 'Elige una opción'
  if (vacio(j.jefeNombre)) e[p + 'jefeNombre'] = OBLIG
  if (vacio(j.jefePuesto)) e[p + 'jefePuesto'] = OBLIG
  for (const k of ['general', 'resultados', 'trato'] as const) if (j.calificacion[k] === null) e[p + 'calificacion.' + k] = 'Elige una calificación'
  if (vacio(j.logro)) e[p + 'logro'] = OBLIG
  if (vacio(j.disfrutabaMas)) e[p + 'disfrutabaMas'] = OBLIG
  if (vacio(j.disfrutabaMenos)) e[p + 'disfrutabaMenos'] = OBLIG
  if (!j.actual && !j.razonSalida) e[p + 'razonSalida'] = 'Elige una opción'
  if (!j.actual && (j.razonSalida === 'O' || j.razonSalida === 'T') && vacio(j.razonDetalle)) e[p + 'razonDetalle'] = 'Cuéntanos brevemente qué pasó'
  if (!j.contactoJefe) e[p + 'contactoJefe'] = 'Elige una opción'
  return e
}

export function aSolicitud(b: Borrador, puestoNombre: string): Solicitud {
  const empleos: Empleo[] = b.empleos.map((j) => ({
    empresa: j.empresa.trim(),
    puestoInicial: j.puestoInicial.trim(),
    puestoFinal: (j.mismoPuesto ? j.puestoInicial : j.puestoFinal).trim(),
    ascensos: j.ascensos ?? 0,
    inicio: j.inicio,
    fin: j.actual ? null : j.fin,
    actual: j.actual,
    sueldoInicial: j.sueldoInicial,
    sueldoFinal: j.sueldoFinal,
    prestaciones: j.prestaciones!,
    jefeNombre: j.jefeNombre.trim(),
    jefePuesto: j.jefePuesto.trim(),
    calificacion: { general: j.calificacion.general!, resultados: j.calificacion.resultados!, trato: j.calificacion.trato! },
    logro: j.logro.trim(),
    disfrutabaMas: j.disfrutabaMas.trim(),
    disfrutabaMenos: j.disfrutabaMenos.trim(),
    razonSalida: j.actual ? 'N' : j.razonSalida!,
    razonDetalle: j.razonDetalle.trim(),
    contactoJefe: j.contactoJefe!,
  }))
  return {
    puestoId: b.puestoId,
    puestoNombre,
    fuente: b.fuente,
    fuenteDetalle: b.fuenteDetalle.trim(),
    nombre: b.nombre.trim().replace(/\s+/g, ' '),
    fechaNacimiento: b.fechaNacimiento,
    pais: b.pais.trim(),
    direccion: b.direccion.trim(),
    email: b.email.trim().toLowerCase(),
    telefono: esMexico(b.pais) ? telefonoMx(b.telefono) : b.telefono.replace(/[^\d+]/g, ''),
    moneda: esMexico(b.pais) ? 'MXN' : b.moneda,
    sueldoEsperado: b.sueldoEsperado,
    empleos,
    freelance: b.hizoFreelance ? b.freelance.map((f) => ({ ...f, fin: f.actual ? null : f.fin })) : [],
    universidad: b.universidad.asistio
      ? b.universidad
      : { ...borradorVacio().universidad, asistio: false, termino: null, trabajaba: null },
    fortalezas: b.fortalezas.trim(),
    debilidades: b.debilidades.trim(),
    objetivos: b.objetivos.trim(),
    avisoPrivacidad: b.avisoPrivacidad,
  }
}

export { esMexico }
