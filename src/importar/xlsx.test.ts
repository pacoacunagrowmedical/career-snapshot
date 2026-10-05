// @vitest-environment node
import { describe, expect, it } from 'vitest'
import writeExcelFile from 'write-excel-file/node'
import { readSheet } from 'read-excel-file/node'
import { celdaATexto, convertirFilas, leerCsv } from './formularioAnterior'
import ejemplo from './ejemplo-formulario-anterior.csv?raw'

describe('importar desde .xlsx (datos ficticios)', () => {
  it('lee un Excel con fechas, números y acentos igual que el CSV', async () => {
    const filasCsv = leerCsv(ejemplo)
    // Simula lo que hace Excel: la marca temporal como fecha real, sueldos y calificaciones como números.
    const datos = filasCsv.map((fila, i) =>
      fila.map((v, col) => {
        if (i > 0 && col === 0) {
          const [d, m, y, h, min] = v.match(/\d+/g)!.map(Number)
          return { value: new Date(Date.UTC(2000 + y, m - 1, d, h, min)), format: 'dd/mm/yyyy hh:mm' }
        }
        if (i > 0 && /^\d+$/.test(v)) return Number(v)
        return v || null
      }),
    )
    const buffer = await writeExcelFile(datos as never).toBuffer()
    const filas = (await readSheet(buffer)).map((f) => f.map(celdaATexto))
    const r = convertirFilas(filas)
    expect(r.errores).toEqual([])
    expect(r.registros).toHaveLength(2)
    const ana = r.registros[0].solicitud
    expect(ana.nombre).toBe('Ana Ficticia Pérez')
    expect(ana.claveImportacion).toBe('2026-10-03 12:31|ana@example.com')
    expect(ana.empleos[0].sueldoFinal).toBe(20000)
    expect(ana.empleos[0].calificacion.general).toBe(4)
  })
})
