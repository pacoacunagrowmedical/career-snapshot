// Fechas de carrera con precisión de mes: "AAAA-MM".
export type Mes = string

export type Calificacion = 1 | 2 | 3 | 4 | 5 | 'I'

export type CodigoSalida = 'M' | 'N' | 'B' | 'P' | 'LM' | 'L' | 'D' | 'O' | 'T'

export type Prestaciones = 'sin' | 'ley' | 'superiores'

export type ContactoJefe = 'si' | 'no_este' | 'nunca'

export interface Empleo {
  empresa: string
  puestoInicial: string
  puestoFinal: string // igual a puestoInicial si no cambió
  ascensos: number
  inicio: Mes
  fin: Mes | null // null = trabajo actual
  actual: boolean
  sueldoInicial: number // mensual neto
  sueldoFinal: number
  prestaciones: Prestaciones
  jefeNombre: string
  jefePuesto: string
  // null = sin dato (p. ej. solicitudes importadas del formulario anterior, que solo tenía una calificación)
  calificacion: { general: Calificacion | null; resultados: Calificacion | null; trato: Calificacion | null }
  logro: string
  disfrutabaMas: string
  disfrutabaMenos: string
  razonSalida: CodigoSalida
  razonDetalle: string
  contactoJefe: ContactoJefe
}

export interface PeriodoFreelance {
  actividad: string
  inicio: Mes
  fin: Mes | null
  actual: boolean
  descripcion: string
}

export interface Universidad {
  asistio: boolean
  nombre: string
  carrera: string
  termino: boolean | null
  materiasMas: string
  materiasMenos: string
  financiamiento: string[]
  financiamientoOtro: string
  trabajaba: boolean | null
  destacar: string
}

export interface Solicitud {
  puestoId: string
  puestoNombre: string
  fuente: string
  fuenteDetalle: string
  nombre: string
  fechaNacimiento: string // AAAA-MM-DD
  pais: string
  direccion: string
  email: string
  telefono: string
  moneda: string
  sueldoEsperado: number
  empleos: Empleo[] // del más reciente al más antiguo
  freelance: PeriodoFreelance[]
  universidad: Universidad
  fortalezas: string
  debilidades: string
  objetivos: string
  avisoPrivacidad: boolean
  posibleBot?: boolean // lo marcó el filtro contra bots; se guarda igual para no perder candidatos reales
  origen?: 'formulario-anterior' // importada del Google Form v3.2
  claveImportacion?: string // evita importar dos veces la misma respuesta
}

export interface Candidato extends Solicitud {
  id: string
  creado: Date
}

export interface Puesto {
  id: string
  nombre: string
  activo: boolean
  orden: number
  sueldoOfrecido: number | null // mensual neto MXN; solo visible en el panel
}
