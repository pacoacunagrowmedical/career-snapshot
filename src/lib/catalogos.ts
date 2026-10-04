import type { Calificacion, CodigoSalida, ContactoJefe, Prestaciones } from '../types'

export type Semaforo = 'verde' | 'amarillo' | 'rojo' | 'gris'

// El código es lo que se guarda en la base de datos; `corto` es lo que se lee en el snapshot.
// B, P y LM ya no se ofrecen (no aplican o se prestaban a confusión), pero se conservan para leer datos viejos.
export interface RazonSalida { codigo: CodigoSalida; etiqueta: string; corto: string; frase: string; ayuda: string; semaforo: Semaforo; legado?: boolean }

export const RAZONES_SALIDA: RazonSalida[] = [
  { codigo: 'M', etiqueta: 'Renuncié (decisión propia)', corto: 'Renuncia', frase: 'Renuncia', ayuda: 'Me fui por mi cuenta: mejor oferta, cambio de rumbo, etc.', semaforo: 'verde' },
  { codigo: 'N', etiqueta: 'Sigo trabajando aquí', corto: 'Actual', frase: 'Sigue', ayuda: '', semaforo: 'verde' },
  { codigo: 'L', etiqueta: 'Recorte de personal', corto: 'Recorte', frase: 'Recorte de personal', ayuda: 'Eliminaron mi puesto o hubo despidos masivos', semaforo: 'amarillo' },
  { codigo: 'D', etiqueta: 'Acuerdo mutuo', corto: 'Acuerdo', frase: 'Salida por acuerdo mutuo', ayuda: 'La empresa y yo acordamos terminar la relación', semaforo: 'amarillo' },
  { codigo: 'O', etiqueta: 'Otras circunstancias', corto: 'Otra', frase: 'Salida por otras circunstancias', ayuda: 'Mudanza, salud, cierre de la empresa, etc.', semaforo: 'amarillo' },
  { codigo: 'T', etiqueta: 'Me despidieron', corto: 'Despido', frase: 'Despido', ayuda: 'La empresa decidió terminar mi relación laboral', semaforo: 'rojo' },
  { codigo: 'B', etiqueta: 'Liquidación', corto: 'Liquidación', frase: 'Salida con liquidación', ayuda: '', semaforo: 'amarillo', legado: true },
  { codigo: 'P', etiqueta: 'Ascenso o transferencia', corto: 'Ascenso', frase: 'Ascenso', ayuda: '', semaforo: 'verde', legado: true },
  { codigo: 'LM', etiqueta: 'Movimiento lateral', corto: 'Lateral', frase: 'Movimiento lateral', ayuda: '', semaforo: 'verde', legado: true },
]

export const CALIFICACIONES: { valor: Calificacion; etiqueta: string; corto: string; semaforo: Semaforo }[] = [
  { valor: 5, etiqueta: 'Excelente', corto: 'Excelente', semaforo: 'verde' },
  { valor: 4, etiqueta: 'Muy bueno', corto: 'Muy bueno', semaforo: 'verde' },
  { valor: 3, etiqueta: 'Bueno', corto: 'Bueno', semaforo: 'amarillo' },
  { valor: 2, etiqueta: 'Regular', corto: 'Regular', semaforo: 'rojo' },
  { valor: 1, etiqueta: 'Malo', corto: 'Malo', semaforo: 'rojo' },
  { valor: 'I', etiqueta: 'Imposible de dar', corto: 'Imposible', semaforo: 'gris' },
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

// Si llega un valor desconocido (dato corrupto o enviado fuera del formulario) se muestra en gris en vez de romper la vista.
export function razon(codigo: CodigoSalida) {
  return RAZONES_SALIDA.find((r) => r.codigo === codigo) ?? { codigo: '?' as CodigoSalida, etiqueta: 'Sin dato', corto: 'Sin dato', frase: 'Salida sin dato', ayuda: '', semaforo: 'gris' as Semaforo }
}

export function calificacion(valor: Calificacion) {
  return CALIFICACIONES.find((c) => c.valor === valor) ?? { valor: '?' as unknown as Calificacion, etiqueta: 'Sin dato', corto: 'Sin dato', semaforo: 'gris' as Semaforo }
}

export function etiquetaFuente(valor: string) {
  return FUENTES.find((f) => f.valor === valor)?.etiqueta ?? valor
}
