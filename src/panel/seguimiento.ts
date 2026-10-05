import type { Store } from '../data/store'
import type { Candidato } from '../types'
import { etapa } from '../lib/catalogos'

/** Posición efectiva en el tablero: la elegida a mano o, si no hay, por fecha (los más recientes arriba). */
export const ordenDe = (c: Candidato) => c.orden ?? -c.creado.getTime()

/**
 * Mueve candidatos a otra etapa y deja constancia en sus notas (quién y cuándo).
 * `orden` (opcional) fija su posición dentro de la columna; si la etapa no cambia, solo se reacomoda sin nota.
 */
export async function moverAEtapa(s: Store, candidatos: Candidato[], destino: string, orden?: number) {
  if (orden !== undefined) {
    const mismos = candidatos.filter((c) => c.etapa === destino)
    if (mismos.length) await s.actualizarCandidatos(mismos.map((c) => c.id), { orden })
  }
  const mover = candidatos.filter((c) => c.etapa !== destino)
  if (!mover.length) return
  await s.actualizarCandidatos(mover.map((c) => c.id), orden !== undefined ? { etapa: destino, orden } : { etapa: destino })
  await Promise.all(
    mover.map((c) => s.agregarNota(c.id, `Movió de «${etapa(c.etapa).nombre}» a «${etapa(destino).nombre}»`, 'cambio')),
  )
}
