import type { Calificacion, CodigoSalida, ContactoJefe, Empleo, Prestaciones, Solicitud } from '../types'
import { leerDinero } from '../lib/formato'
import { telefonoMx } from '../form/borrador'

// Convierte el CSV de respuestas del Google Form "Solicitud de empleo en Grow Medical - v3.2" al formato de la app.

export interface Importado extends Solicitud {
  creado: Date
}

export interface ResultadoImportacion {
  registros: { solicitud: Importado; avisos: string[] }[]
  errores: string[] // problemas que impiden leer el archivo
}

/**
 * Convierte los bytes del archivo a texto. Google Sheets descarga en UTF-8, pero si el archivo se abrió y se volvió a
 * guardar en Excel o Numbers suele quedar en Windows-1252 (Latin-1) y los acentos salen como "�". Se intenta UTF-8
 * estricto y, si falla, Windows-1252.
 */
export function decodificar(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

/** Lector de CSV que respeta comillas, comas y saltos de línea dentro de los campos. */
export function leerCsv(texto: string): string[][] {
  const filas: string[][] = []
  let fila: string[] = []
  let campo = ''
  let comillas = false
  const t = texto.replace(/^﻿/, '')
  const sep = separador(t)
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]
    if (comillas) {
      if (ch === '"' && t[i + 1] === '"') {
        campo += '"'
        i++
      } else if (ch === '"') comillas = false
      else campo += ch
    } else if (ch === '"') comillas = true
    else if (ch === sep) {
      fila.push(campo)
      campo = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++
      fila.push(campo)
      filas.push(fila)
      fila = []
      campo = ''
    } else campo += ch
  }
  if (campo || fila.length) {
    fila.push(campo)
    filas.push(fila)
  }
  return filas.filter((f) => f.some((c) => c.trim()))
}

/** "dd/mm/aa" o "dd/mm/aaaa" (con hora opcional) → Date. Años de 2 dígitos: hasta el año actual son 20xx, después 19xx. */
/**
 * Google Sheets separa con comas; Excel en español guarda con punto y coma. Se elige el separador que más aparece
 * en la primera línea (fuera de comillas).
 */
function separador(t: string): string {
  let comillas = false
  const cuenta: Record<string, number> = { ',': 0, ';': 0, '\t': 0 }
  for (const ch of t) {
    if (ch === '"') comillas = !comillas
    else if (!comillas && (ch === '\n' || ch === '\r')) break
    else if (!comillas && ch in cuenta) cuenta[ch]++
  }
  return Object.entries(cuenta).sort((a, b) => b[1] - a[1])[0][0]
}

export function leerFecha(s: string): Date | null {
  // Excel a veces la deja como "2026-10-03 12:31:00"
  const iso = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (iso) {
    const d = new Date(+iso[1], +iso[2] - 1, +iso[3], +(iso[4] ?? 0), +(iso[5] ?? 0), +(iso[6] ?? 0))
    return Number.isNaN(d.getTime()) ? null : d
  }
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (!m) return null
  let anio = Number(m[3])
  if (m[3].length === 2) anio += anio <= new Date().getFullYear() % 100 ? 2000 : 1900
  const d = new Date(anio, Number(m[2]) - 1, Number(m[1]), Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0))
  return Number.isNaN(d.getTime()) ? null : d
}

const aMes = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : '')
const aDia = (d: Date | null) => (d ? `${aMes(d)}-${String(d.getDate()).padStart(2, '0')}` : '')

/** Calificación de 1 a 10 → escala de 1 a 5. */
export function calificacionDe10(s: string): Calificacion | null {
  const n = Number(s.trim())
  if (!s.trim() || !Number.isFinite(n)) return null
  if (n >= 9) return 5
  if (n >= 7) return 4
  if (n >= 5) return 3
  if (n >= 3) return 2
  return 1
}

function razonDe(s: string): { codigo: CodigoSalida; detalle: string } {
  const t = s.trim()
  if (/^por decisi[oó]n propia/i.test(t)) return { codigo: 'M', detalle: '' }
  if (/^acuerdo mutuo/i.test(t)) return { codigo: 'D', detalle: '' }
  if (/^decisi[oó]n de la empresa/i.test(t)) return { codigo: 'T', detalle: '' }
  if (/^no dej[eé] este empleo/i.test(t)) return { codigo: 'N', detalle: '' }
  return { codigo: 'O', detalle: t } // "Otros: ..." trae el texto que escribió el candidato
}

function prestacionesDe(s: string): Prestaciones {
  if (/^sin/i.test(s.trim())) return 'sin'
  if (/superiores/i.test(s)) return 'superiores'
  return 'ley'
}

function contactoDe(s: string): ContactoJefe {
  const t = s.trim().toLowerCase()
  if (t.startsWith('nunca')) return 'nunca'
  if (t.startsWith('no')) return 'no_este'
  return 'si'
}

const FINANCIAMIENTO_VIEJO: Record<string, string> = {
  'me los pagaron mis padres/tutores': 'Me los pagaron mis padres/tutores',
  'me los pagué yo mismo, trabajando': 'Me los pagué yo mismo, trabajando',
  'los pagué con mis ahorros': 'Los pagué con mis ahorros',
  'pedí un préstamo': 'Pedí un préstamo',
  'fui becado': 'Fui becado',
}

// Posición de cada bloque de empleo en el CSV v3.2. El primero tiene además la columna "¿Es este tu trabajo actual?".
const BLOQUES = [
  { empresa: 8, puesto: 9, actual: 10, asc: 11, inicio: 12, fin: 13, s1: 14, s2: 15, prest: 16, jefe: 17, jefePuesto: 18, calif: 19, logro: 20, mas: 21, menos: 22, razon: 23, contacto: 24 },
  ...[25, 41, 57, 73].map((b) => ({
    empresa: b, puesto: b + 1, actual: -1, asc: b + 2, inicio: b + 3, fin: b + 4, s1: b + 5, s2: b + 6, prest: b + 7,
    jefe: b + 8, jefePuesto: b + 9, calif: b + 10, logro: b + 11, mas: b + 12, menos: b + 13, razon: b + 14, contacto: b + 15,
  })),
]

const ENCABEZADOS_ESPERADOS: [number, RegExp][] = [
  [0, /marca temporal/i], [1, /posici[oó]n/i], [2, /nombre completo/i], [6, /correo/i], [8, /nombre de la empresa/i],
  [25, /nombre de la empresa/i], [89, /universidad/i], [97, /fortalezas/i], [99, /objetivos/i],
]

const dosDig = (n: number) => String(n).padStart(2, '0')

/**
 * Clave para no importar dos veces la misma respuesta: fecha y hora (al minuto) + correo. Se arma con la fecha ya
 * interpretada para que coincida aunque Excel haya reescrito el formato ("03/10/26 12:31" vs "03/10/2026 12:31:00").
 */
function claveDe(fecha: Date | null, email: string): string {
  const f = fecha
    ? `${fecha.getFullYear()}-${dosDig(fecha.getMonth() + 1)}-${dosDig(fecha.getDate())} ${dosDig(fecha.getHours())}:${dosDig(fecha.getMinutes())}`
    : 'sin-fecha'
  return `${f}|${email.trim().toLowerCase()}`
}

/** Normaliza claves guardadas antes con el texto original de la fecha ("03/10/26 12:31|correo"). */
export function normalizarClave(clave: string): string {
  const i = clave.lastIndexOf('|')
  if (i < 0) return clave
  const fecha = clave.slice(0, i)
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(fecha) ? clave : claveDe(leerFecha(fecha), clave.slice(i + 1))
}

export function convertirCsv(texto: string): ResultadoImportacion {
  return convertirFilas(leerCsv(texto))
}

/** Lee un .xlsx (Excel o "Descargar como Microsoft Excel" de Google Sheets) y lo convierte a filas de texto. */
export async function filasDeXlsx(archivo: File): Promise<string[][]> {
  const { readSheet } = await import('read-excel-file/browser')
  const filas = await readSheet(archivo)
  return filas.map((fila) => fila.map(celdaATexto))
}

/** Las fechas de Excel llegan como Date en UTC con la hora "de pared"; se reescriben como "dd/mm/aaaa hh:mm". */
export function celdaATexto(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) {
    const d = new Date(Math.round(v.getTime() / 60000) * 60000) // Excel guarda la hora como fracción: 12:31 llega como 12:30:59.999
    const fecha = `${dosDig(d.getUTCDate())}/${dosDig(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
    return d.getUTCHours() || d.getUTCMinutes() ? `${fecha} ${dosDig(d.getUTCHours())}:${dosDig(d.getUTCMinutes())}` : fecha
  }
  return String(v)
}

export function convertirFilas(filas: string[][]): ResultadoImportacion {
  if (filas.length < 2) return { registros: [], errores: ['El archivo no tiene respuestas.'] }
  const h = filas[0]
  const faltan = ENCABEZADOS_ESPERADOS.filter(([i, re]) => !re.test(h[i] ?? ''))
  if (h.length < 100 || faltan.length) {
    return {
      registros: [],
      errores: ['Este archivo no tiene el formato del formulario "Solicitud de empleo en Grow Medical - v3.2". Descarga el CSV desde la hoja de respuestas del formulario.'],
    }
  }

  const registros = filas.slice(1).map((r) => {
    const c = (i: number) => (i >= 0 ? (r[i] ?? '').trim() : '')
    const avisos: string[] = []
    const creado = leerFecha(c(0))
    if (!creado) avisos.push('Sin fecha de respuesta válida; se usó la fecha de hoy')

    const empleos: Empleo[] = []
    BLOQUES.forEach((k, idx) => {
      if (!c(k.empresa)) return
      const actual = idx === 0 && /^s[ií]/i.test(c(k.actual))
      const razon = actual ? { codigo: 'N' as CodigoSalida, detalle: '' } : razonDe(c(k.razon))
      const inicio = aMes(leerFecha(c(k.inicio)))
      const fin = actual ? null : aMes(leerFecha(c(k.fin))) || null
      const s1 = leerDinero(c(k.s1))
      const s2 = leerDinero(c(k.s2))
      if (!inicio) avisos.push(`${c(k.empresa)}: sin fecha de entrada`)
      if (!c(k.s1) && !c(k.s2)) avisos.push(`${c(k.empresa)}: sin sueldo reportado`)
      else if (!Number.isFinite(s1) || !Number.isFinite(s2)) {
        avisos.push(`${c(k.empresa)}: sueldo no reconocido ("${c(k.s1) || 'vacío'}" / "${c(k.s2) || 'vacío'}")`)
      }
      empleos.push({
        empresa: c(k.empresa),
        puestoInicial: c(k.puesto),
        puestoFinal: c(k.puesto),
        ascensos: Number.parseInt(c(k.asc), 10) || 0,
        inicio,
        fin,
        actual,
        sueldoInicial: Number.isFinite(s1) ? s1 : 0,
        sueldoFinal: Number.isFinite(s2) ? s2 : 0,
        prestaciones: prestacionesDe(c(k.prest)),
        jefeNombre: c(k.jefe),
        jefePuesto: c(k.jefePuesto),
        calificacion: { general: calificacionDe10(c(k.calif)), resultados: null, trato: null },
        logro: c(k.logro),
        disfrutabaMas: c(k.mas),
        disfrutabaMenos: c(k.menos),
        razonSalida: razon.codigo,
        razonDetalle: razon.detalle,
        contactoJefe: contactoDe(c(k.contacto)),
      })
    })

    const pais = /^m[eé]xico$/i.test(c(4)) ? 'México' : c(4)
    const financiamiento: string[] = []
    let financiamientoOtro = ''
    for (const parte of c(94).split(/\.,\s*|\.$/).map((x) => x.trim()).filter(Boolean)) {
      const conocido = FINANCIAMIENTO_VIEJO[parte.toLowerCase()]
      if (conocido) financiamiento.push(conocido)
      else financiamientoOtro = financiamientoOtro ? `${financiamientoOtro}; ${parte}` : parte
    }
    const proyecto = c(100)
    const tieneProyecto = proyecto && !/^no\.?$/i.test(proyecto)

    const solicitud: Importado = {
      creado: creado ?? new Date(),
      origen: 'formulario-anterior',
      claveImportacion: claveDe(creado, c(6)),
      puestoId: '',
      puestoNombre: c(1),
      fuente: '',
      fuenteDetalle: '',
      nombre: c(2).replace(/\s+/g, ' '),
      fechaNacimiento: aDia(leerFecha(c(3))),
      pais,
      direccion: c(5),
      email: c(6).toLowerCase(),
      telefono: pais === 'México' ? telefonoMx(c(7)) : c(7).replace(/[^\d+]/g, ''),
      moneda: 'MXN',
      sueldoEsperado: 0,
      empleos,
      // El formulario anterior solo preguntaba por proyectos actuales, sin fechas.
      freelance: tieneProyecto ? [{ actividad: 'Proyecto freelance o negocio propio', inicio: '', fin: null, actual: true, descripcion: proyecto }] : [],
      universidad: {
        asistio: !!c(89),
        nombre: c(89),
        carrera: c(90),
        termino: c(91) ? /^s[ií]/i.test(c(91)) : null,
        materiasMas: c(92),
        materiasMenos: c(93),
        financiamiento,
        financiamientoOtro,
        trabajaba: c(95) ? /^s[ií]/i.test(c(95)) : null,
        destacar: c(96),
      },
      fortalezas: c(97),
      debilidades: c(98),
      objetivos: c(99),
      avisoPrivacidad: false,
    }
    if (!solicitud.nombre) avisos.push('Sin nombre')
    if (!empleos.length) avisos.push('Sin empleos')
    return { solicitud, avisos }
  })

  return { registros, errores: [] }
}
