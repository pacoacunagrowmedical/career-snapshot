import { describe, expect, it } from 'vitest'
import { analizar } from './analisis'
import { CANDIDATOS_DEMO } from '../data/demoSeed'

const daniela = CANDIDATOS_DEMO.find((c) => c.id === 'demo-daniela')!
const luis = CANDIDATOS_DEMO.find((c) => c.id === 'demo-luis')!
const mariana = CANDIDATOS_DEMO.find((c) => c.id === 'demo-mariana')!

describe('analizar', () => {
  it('ordena los empleos del más antiguo al más reciente', () => {
    const a = analizar(daniela, 20000)
    expect(a.empleos.map((t) => t.empleo.empresa)).toEqual(['Hospital San Rafael', 'Instituto Tecnológico del Norte', 'MediAgenda'])
  })

  it('trata el traslape como traslape, no como desempleo negativo', () => {
    const a = analizar(daniela, 20000)
    expect(a.traslapes).toHaveLength(1)
    expect(a.traslapes[0].meses).toBe(3) // feb–abr 2022
    expect(a.huecos.every((h) => h.meses > 0)).toBe(true)
  })

  it('detecta el hueco entre empleos y el desempleo vigente al aplicar', () => {
    const a = analizar(daniela, 20000)
    const pasado = a.huecos.find((h) => !h.actual)!
    expect(pasado.meses).toBe(11) // jun 2015 – abr 2016
    const actual = a.huecos.find((h) => h.actual)!
    expect(actual.meses).toBeGreaterThan(2)
    expect(actual.meses).toBeLessThan(3)
  })

  it('marca despido, caída de sueldo y expectativa arriba de la oferta', () => {
    const textos = analizar(daniela, 18000).banderas.map((b) => b.texto)
    expect(textos.some((t) => t.startsWith('Despido en Instituto'))).toBe(true)
    expect(textos.some((t) => t.startsWith('Bajó de sueldo'))).toBe(true)
    expect(textos.some((t) => t.startsWith('Espera $22,000'))).toBe(true)
  })

  it('cuenta el freelance como tiempo sin empleo y lo reporta aparte', () => {
    const a = analizar(luis, null)
    expect(a.mesesFreelance).toBeGreaterThan(0)
    expect(a.huecos.some((h) => h.mesesFreelance > 0)).toBe(true)
    expect(a.banderas.some((b) => b.nivel === 'rojo' && b.texto.includes('Nunca permitiría'))).toBe(true)
  })

  it('un empleo actual no genera desempleo vigente', () => {
    const a = analizar(mariana, 28000)
    expect(a.huecos.some((h) => h.actual)).toBe(false)
    expect(a.banderas.some((b) => b.nivel === 'verde')).toBe(true)
  })

  it('no truena con un empleo sin fechas', () => {
    const roto = { ...mariana, empleos: [{ ...mariana.empleos[0], inicio: '' }] }
    const a = analizar(roto, null)
    expect(a.empleos).toHaveLength(0)
    expect(a.banderas.some((b) => b.texto.includes('sin fecha de entrada'))).toBe(true)
  })
})
