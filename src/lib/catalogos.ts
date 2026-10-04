import type { Calificacion, CodigoSalida, ContactoJefe, Prestaciones } from '../types'

export type Semaforo = 'verde' | 'amarillo' | 'rojo' | 'gris'

export const RAZONES_SALIDA: { codigo: CodigoSalida; etiqueta: string; ayuda: string; semaforo: Semaforo }[] = [
  { codigo: 'M', etiqueta: 'Decisión propia', ayuda: 'Renuncié por mi cuenta (mejor oferta, cambio de rumbo, etc.)', semaforo: 'verde' },
  { codigo: 'N', etiqueta: 'No he dejado este empleo', ayuda: 'Sigo trabajando aquí', semaforo: 'verde' },
  { codigo: 'B', etiqueta: 'Liquidación voluntaria', ayuda: 'La empresa ofreció un paquete de salida y lo acepté', semaforo: 'verde' },
  { codigo: 'P', etiqueta: 'Ascenso o transferencia', ayuda: 'Me promovieron o transfirieron a otra empresa del mismo grupo', semaforo: 'verde' },
  { codigo: 'LM', etiqueta: 'Movimiento lateral', ayuda: 'Me cambié a un puesto equivalente en otra empresa del grupo', semaforo: 'verde' },
  { codigo: 'L', etiqueta: 'Recorte de personal', ayuda: 'Eliminaron mi puesto o hubo despidos masivos', semaforo: 'amarillo' },
  { codigo: 'D', etiqueta: 'Acuerdo mutuo', ayuda: 'La empresa y yo acordamos terminar la relación', semaforo: 'amarillo' },
  { codigo: 'O', etiqueta: 'Otras circunstancias', ayuda: 'Mudanza, salud, cierre de la empresa, etc.', semaforo: 'amarillo' },
  { codigo: 'T', etiqueta: 'Despido', ayuda: 'La empresa decidió terminar mi contrato', semaforo: 'rojo' },
]

export const CALIFICACIONES: { valor: Calificacion; etiqueta: string; semaforo: Semaforo }[] = [
  { valor: 5, etiqueta: 'Excelente', semaforo: 'verde' },
  { valor: 4, etiqueta: 'Muy bueno', semaforo: 'verde' },
  { valor: 3, etiqueta: 'Bueno', semaforo: 'amarillo' },
  { valor: 2, etiqueta: 'Regular', semaforo: 'rojo' },
  { valor: 1, etiqueta: 'Malo', semaforo: 'rojo' },
  { valor: 'I', etiqueta: 'Imposible de dar', semaforo: 'gris' },
]

export const ASPECTOS_CALIFICACION = [
  { clave: 'general', etiqueta: 'Calificación general', pregunta: '¿Qué calificación general crees que te daría tu jefe directo?' },
  { clave: 'resultados', etiqueta: 'Obtener resultados', pregunta: '¿Cómo te calificaría en obtener resultados?' },
  { clave: 'trato', etiqueta: 'Trato con la gente', pregunta: '¿Cómo te calificaría en trato con la gente (compañeros, jefes, clientes)?' },
] as const

export const PRESTACIONES: { valor: Prestaciones; etiqueta: string }[] = [
  { valor: 'sin', etiqueta: 'Sin prestaciones de ley' },
  { valor: 'ley', etiqueta: 'Solo las prestaciones de ley' },
  { valor: 'superiores', etiqueta: 'Prestaciones superiores a las de ley' },
]

export const CONTACTO_JEFE: { valor: ContactoJefe; etiqueta: string }[] = [
  { valor: 'si', etiqueta: 'Sí' },
  { valor: 'no_este', etiqueta: 'No en este empleo' },
  { valor: 'nunca', etiqueta: 'Nunca' },
]

export const FUENTES = [
  { valor: 'web', etiqueta: 'Sitio web / Google', detalle: null },
  { valor: 'linkedin', etiqueta: 'LinkedIn', detalle: null },
  { valor: 'indeed', etiqueta: 'Indeed', detalle: null },
  { valor: 'occ', etiqueta: 'OCC Mundial', detalle: null },
  { valor: 'referido', etiqueta: 'Recomendación de alguien', detalle: '¿Quién te recomendó?' },
  { valor: 'otro', etiqueta: 'Otro', detalle: '¿Dónde?' },
] as const

export const FINANCIAMIENTO = [
  'Me los pagaron mis padres/tutores',
  'Me los pagué yo mismo, trabajando',
  'Los pagué con mis ahorros',
  'Pedí un préstamo',
  'Fui becado',
]

export const MONEDAS = ['MXN', 'USD', 'EUR', 'COP', 'ARS', 'CLP', 'PEN', 'GTQ', 'Otra']

export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
export const MESES_LARGOS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function razon(codigo: CodigoSalida) {
  return RAZONES_SALIDA.find((r) => r.codigo === codigo)!
}

export function calificacion(valor: Calificacion) {
  return CALIFICACIONES.find((c) => c.valor === valor)!
}

export function etiquetaFuente(valor: string) {
  return FUENTES.find((f) => f.valor === valor)?.etiqueta ?? valor
}
