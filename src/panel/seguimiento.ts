import type { Store } from '../data/store'
import type { Candidato } from '../types'
import { etapa } from '../lib/catalogos'

/** Mueve candidatos a otra etapa y deja constancia en sus notas (quién y cuándo). */
export async function moverAEtapa(s: Store, candidatos: Candidato[], destino: string) {
  const mover = candidatos.filter((c) => c.etapa !== destino)
  if (!mover.length) return
  await s.actualizarCandidatos(mover.map((c) => c.id), { etapa: destino })
  await Promise.all(
    mover.map((c) => s.agregarNota(c.id, `Movió de «${etapa(c.etapa).nombre}» a «${etapa(destino).nombre}»`, 'cambio')),
  )
}
