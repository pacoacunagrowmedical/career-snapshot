import { describe, expect, it } from 'vitest'
import { avisosPaso, borradorVacio, empleoVacio, telefonoMx, validarPaso } from './borrador'
import { normalizarCandidato } from '../data/normalizar'
import { analizarSeguro } from '../lib/analisis'

describe('teléfono mexicano', () => {
  it('acepta +52, 52 y 521 y lo deja en 10 dígitos', () => {
    expect(telefonoMx('+52 55 1234 5678')).toBe('5512345678')
    expect(telefonoMx('521 55 1234 5678')).toBe('5512345678')
    expect(telefonoMx('55-1234-5678')).toBe('5512345678')
  })
  it('no marca error con +52', () => {
    const b = { ...borradorVacio(), nombre: 'Ana López', fechaNacimiento: '1990-01-01', email: 'a@b.com', telefono: '+52 55 1234 5678', sueldoEsperado: 20000 }
    expect(validarPaso(1, b).telefono).toBeUndefined()
  })
})

describe('avisos de sueldo', () => {
  const conEmpleo = (sueldoInicial: number, sueldoFinal: number) => ({
    ...borradorVacio(),
    empleos: [{ ...empleoVacio(), sueldoInicial, sueldoFinal, fin: '2020-01' }],
  })
  it('avisa si parece anual o incompleto', () => {
    expect(avisosPaso(2, conEmpleo(240000, 250000))['empleos.0.sueldoInicial']).toMatch(/muy alta/)
    expect(avisosPaso(2, conEmpleo(15, 18))['empleos.0.sueldoInicial']).toMatch(/muy baja/)
  })
  it('avisa saltos de más del triple', () => {
    expect(avisosPaso(2, conEmpleo(5000, 20000))['empleos.0.sueldoFinal']).toMatch(/triple/)
  })
  it('no avisa con sueldos normales', () => {
    expect(avisosPaso(2, conEmpleo(15000, 21000))).toEqual({})
  })
})

describe('datos dañados', () => {
  it('normaliza un registro incompleto sin tronar el análisis', () => {
    const c = normalizarCandidato('x', { nombre: 'Bot', empleos: [{ empresa: 'X', inicio: '2020-01', razonSalida: 'ZZ', calificacion: { general: 9 } }, 'basura'] }, new Date())
    const a = analizarSeguro(c, null)
    expect(c.empleos).toHaveLength(2)
    expect(a).toBeTruthy()
  })
})
