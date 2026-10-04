import type { Candidato } from '../types'
import { analizarSeguro as analizar } from './analisis'
import { etiquetaFuente } from './catalogos'

const celda = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v)
  // Evita inyección de fórmulas al abrir en Excel/Sheets.
  const seguro = /^[=+\-@]/.test(s) ? `'${s}` : s
  return /[",\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro
}

/** Una fila por empleo (formato "largo"), más fácil de graficar en una hoja de cálculo. */
export function candidatosACsv(cs: Candidato[], sueldos: Map<string, number | null>): string {
  const cab = [
    'Fecha solicitud', 'Nombre', 'Email', 'Teléfono', 'País', 'Puesto', 'Fuente', 'Moneda', 'Sueldo esperado',
    'Resumen', 'Empleo #', 'Empresa', 'Puesto inicial', 'Puesto final', 'Ascensos', 'Entrada', 'Salida',
    'Sueldo inicial', 'Sueldo final', 'Razón de salida', 'Calif. general', 'Calif. resultados', 'Calif. trato', 'Contactar jefe',
  ]
  const filas = [cab.map(celda).join(',')]
  for (const c of cs) {
    const a = analizar(c, sueldos.get(c.puestoId) ?? null)
    const comun = [c.creado.toISOString().slice(0, 10), c.nombre, c.email, c.telefono, c.pais, c.puestoNombre, etiquetaFuente(c.fuente), c.moneda, c.sueldoEsperado, a.resumen]
    if (!c.empleos.length) filas.push(comun.map(celda).join(','))
    for (const t of a.empleos) {
      const e = t.empleo
      filas.push([...comun, t.numero, e.empresa, e.puestoInicial, e.puestoFinal, e.ascensos, e.inicio, e.actual ? 'Actual' : e.fin,
        e.sueldoInicial, e.sueldoFinal, e.razonSalida, e.calificacion.general, e.calificacion.resultados, e.calificacion.trato, e.contactoJefe,
      ].map(celda).join(','))
    }
  }
  return '﻿' + filas.join('\n')
}

export function descargar(nombre: string, contenido: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}
