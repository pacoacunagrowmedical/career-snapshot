import type { Candidato, Empleo, PeriodoFreelance, Universidad } from '../types'

// Convierte lo que venga de la base de datos en un Candidato completo. Las reglas de Firestore validan lo básico,
// pero no cada empleo; si alguien escribe directo a la base de datos, un campo faltante no debe tumbar el panel.

const txt = (v: unknown) => (typeof v === 'string' ? v : v === null || v === undefined ? '' : String(v))
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0)
const bool = (v: unknown) => v === true
const mes = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}$/.test(v) ? v : '')
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

function empleo(raw: unknown): Empleo {
  const e = obj(raw)
  const cal = obj(e.calificacion)
  const actual = bool(e.actual)
  return {
    empresa: txt(e.empresa) || 'Empresa sin nombre',
    puestoInicial: txt(e.puestoInicial),
    puestoFinal: txt(e.puestoFinal) || txt(e.puestoInicial),
    ascensos: num(e.ascensos),
    inicio: mes(e.inicio),
    fin: actual ? null : mes(e.fin) || null,
    actual,
    sueldoInicial: num(e.sueldoInicial),
    sueldoFinal: num(e.sueldoFinal),
    prestaciones: txt(e.prestaciones) as Empleo['prestaciones'],
    jefeNombre: txt(e.jefeNombre),
    jefePuesto: txt(e.jefePuesto),
    calificacion: {
      general: (cal.general ?? null) as Empleo['calificacion']['general'],
      resultados: (cal.resultados ?? null) as Empleo['calificacion']['resultados'],
      trato: (cal.trato ?? null) as Empleo['calificacion']['trato'],
    },
    logro: txt(e.logro),
    disfrutabaMas: txt(e.disfrutabaMas),
    disfrutabaMenos: txt(e.disfrutabaMenos),
    razonSalida: (txt(e.razonSalida) || (actual ? 'N' : 'O')) as Empleo['razonSalida'],
    razonDetalle: txt(e.razonDetalle),
    contactoJefe: txt(e.contactoJefe) as Empleo['contactoJefe'],
  }
}

function freelance(raw: unknown): PeriodoFreelance {
  const f = obj(raw)
  const actual = bool(f.actual)
  return { actividad: txt(f.actividad), inicio: mes(f.inicio), fin: actual ? null : mes(f.fin) || null, actual, descripcion: txt(f.descripcion) }
}

function universidad(raw: unknown): Universidad {
  const u = obj(raw)
  return {
    asistio: bool(u.asistio),
    nombre: txt(u.nombre),
    carrera: txt(u.carrera),
    termino: typeof u.termino === 'boolean' ? u.termino : null,
    materiasMas: txt(u.materiasMas),
    materiasMenos: txt(u.materiasMenos),
    financiamiento: lista(u.financiamiento).map(txt),
    financiamientoOtro: txt(u.financiamientoOtro),
    trabajaba: typeof u.trabajaba === 'boolean' ? u.trabajaba : null,
    destacar: txt(u.destacar),
  }
}

export function normalizarCandidato(id: string, raw: Record<string, unknown>, creado: Date): Candidato {
  return {
    id,
    creado,
    puestoId: txt(raw.puestoId),
    puestoNombre: txt(raw.puestoNombre) || 'Puesto sin nombre',
    fuente: txt(raw.fuente),
    fuenteDetalle: txt(raw.fuenteDetalle),
    nombre: txt(raw.nombre) || 'Sin nombre',
    fechaNacimiento: txt(raw.fechaNacimiento),
    pais: txt(raw.pais),
    direccion: txt(raw.direccion),
    email: txt(raw.email),
    telefono: txt(raw.telefono),
    moneda: txt(raw.moneda) || 'MXN',
    sueldoEsperado: num(raw.sueldoEsperado),
    empleos: lista(raw.empleos).map(empleo),
    freelance: lista(raw.freelance).map(freelance),
    universidad: universidad(raw.universidad),
    fortalezas: txt(raw.fortalezas),
    debilidades: txt(raw.debilidades),
    objetivos: txt(raw.objetivos),
    avisoPrivacidad: bool(raw.avisoPrivacidad),
    posibleBot: bool(raw.posibleBot),
    origen: raw.origen === 'formulario-anterior' ? 'formulario-anterior' : undefined,
    claveImportacion: txt(raw.claveImportacion) || undefined,
  }
}
