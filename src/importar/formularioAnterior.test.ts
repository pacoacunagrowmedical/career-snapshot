import { describe, expect, it } from 'vitest'
import { calificacionDe10, convertirCsv, leerCsv } from './formularioAnterior'
import ejemplo from './ejemplo-formulario-anterior.csv?raw'

describe('importar del formulario anterior (datos ficticios)', () => {
  const r = convertirCsv(ejemplo)
  const [ana, beto] = r.registros.map((x) => x.solicitud)

  it('lee las dos respuestas sin errores', () => {
    expect(r.errores).toEqual([])
    expect(r.registros).toHaveLength(2)
  })

  it('convierte fechas, país, teléfono y sueldos', () => {
    expect(ana.creado.getFullYear()).toBe(2026)
    expect(ana.fechaNacimiento).toBe('1999-08-09')
    expect(ana.pais).toBe('México')
    expect(ana.telefono).toBe('5511112222')
    expect(ana.email).toBe('ana@example.com')
    expect(ana.nombre).toBe('Ana Ficticia Pérez')
    expect(ana.empleos[0]).toMatchObject({ inicio: '2023-01', fin: null, actual: true, sueldoInicial: 15000, razonSalida: 'N', ascensos: 2 })
    expect(ana.empleos[1]).toMatchObject({ inicio: '2019-01', fin: '2022-11', sueldoInicial: 6000, sueldoFinal: 0, ascensos: 3, razonSalida: 'O', contactoJefe: 'no_este' })
    expect(ana.empleos[1].razonDetalle).toMatch(/presencial/)
  })

  it('convierte la calificación de 1–10 y deja sin dato las que no existían', () => {
    expect(ana.empleos[0].calificacion).toEqual({ general: 4, resultados: null, trato: null })
    expect(ana.empleos[1].calificacion.general).toBe(5)
    expect([10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => calificacionDe10(String(n)))).toEqual([5, 5, 4, 4, 3, 3, 2, 2, 1, 1])
  })

  it('mapea razones, universidad y proyecto freelance', () => {
    expect(beto.empleos[0]).toMatchObject({ razonSalida: 'T', contactoJefe: 'nunca', actual: false })
    expect(ana.universidad).toMatchObject({ asistio: true, termino: false, trabajaba: true, financiamiento: ['Me los pagaron mis padres/tutores', 'Fui becado'] })
    expect(ana.freelance).toHaveLength(1)
    expect(beto.freelance).toHaveLength(0)
    expect(beto.universidad.asistio).toBe(false)
  })

  it('avisa del sueldo no reconocido y genera clave para no duplicar', () => {
    expect(r.registros[0].avisos.join()).toMatch(/sueldo no reconocido/)
    expect(ana.claveImportacion).toBe('03/10/26 12:31|ana@example.com')
    expect(ana.origen).toBe('formulario-anterior')
  })

  it('rechaza un CSV de otro formato', () => {
    expect(convertirCsv('a,b\n1,2').errores.length).toBe(1)
    expect(leerCsv('"x,y","con ""comillas"""\n')).toEqual([['x,y', 'con "comillas"']])
  })
})
