import { MESES, MESES_LARGOS } from './catalogos'
import type { Mes } from '../types'

/** Índice absoluto del mes: año*12 + (mes-1). Facilita restar fechas. */
export function indiceMes(mes: Mes): number {
  const [a, m] = mes.split('-').map(Number)
  return a * 12 + (m - 1)
}

export function mesDeIndice(i: number): Mes {
  const a = Math.floor(i / 12)
  const m = (i % 12) + 1
  return `${a}-${String(m).padStart(2, '0')}`
}

export function mesDeFecha(d: Date): Mes {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** "Feb 2022" */
export function mesCorto(mes: Mes | null | undefined): string {
  if (!mes || !/^\d{4}-\d{2}$/.test(mes)) return '?'
  const [a, m] = mes.split('-').map(Number)
  return `${MESES[m - 1]} ${a}`
}

/** "Febrero de 2022" */
export function mesLargo(mes: Mes): string {
  const [a, m] = mes.split('-').map(Number)
  return `${MESES_LARGOS[m - 1]} de ${a}`
}

/** 52 → "4 años 4 meses" */
export function duracion(meses: number): string {
  const total = Math.max(0, Math.round(meses))
  const a = Math.floor(total / 12)
  const m = total % 12
  const partes: string[] = []
  if (a) partes.push(`${a} ${a === 1 ? 'año' : 'años'}`)
  if (m || !a) partes.push(`${m} ${m === 1 ? 'mes' : 'meses'}`)
  return partes.join(' ')
}

/** 52 → "4.3 años" */
export function anios(meses: number): string {
  return `${(meses / 12).toFixed(1)} años`
}

export function edad(fechaNacimiento: string, referencia: Date): number | null {
  if (!fechaNacimiento) return null
  const [a, m, d] = fechaNacimiento.split('-').map(Number)
  let e = referencia.getFullYear() - a
  if (referencia.getMonth() + 1 < m || (referencia.getMonth() + 1 === m && referencia.getDate() < d)) e--
  return e
}

export function fechaCorta(d: Date): string {
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}
