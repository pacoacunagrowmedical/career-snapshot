import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Store } from '../data/store'
import type { Candidato, Etiqueta, Puesto } from '../types'

// Datos del panel compartidos entre la lista, el tablero y el perfil, para que un cambio en una vista
// (etapa, etiquetas) se vea al instante en las demás sin volver a cargar.

interface DatosPanel {
  candidatos: Candidato[] | null
  puestos: Puesto[]
  etiquetas: Etiqueta[]
  error: string
  recargar: () => Promise<void>
  aplicar: (ids: string[], cambio: (c: Candidato) => Candidato) => void
  setEtiquetas: (e: Etiqueta[]) => void
}

const Ctx = createContext<DatosPanel | null>(null)

export function ProveedorDatos({ s, children }: { s: Store; children: ReactNode }) {
  const [candidatos, setCandidatos] = useState<Candidato[] | null>(null)
  const [puestos, setPuestos] = useState<Puesto[]>([])
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([])
  const [error, setError] = useState('')

  const recargar = useCallback(
    () =>
      Promise.all([s.candidatos(), s.puestos(), s.etiquetas()])
        .then(([c, p, e]) => {
          setCandidatos(c)
          setPuestos(p)
          setEtiquetas(e)
          setError('')
        })
        .catch((e: Error) => setError(e.message)),
    [s],
  )

  useEffect(() => {
    recargar()
  }, [recargar])

  const aplicar = useCallback(
    (ids: string[], cambio: (c: Candidato) => Candidato) =>
      setCandidatos((cs) => cs && cs.map((c) => (ids.includes(c.id) ? cambio(c) : c))),
    [],
  )

  return <Ctx.Provider value={{ candidatos, puestos, etiquetas, error, recargar, aplicar, setEtiquetas }}>{children}</Ctx.Provider>
}

export function useDatos() {
  const d = useContext(Ctx)
  if (!d) throw new Error('useDatos fuera de ProveedorDatos')
  return d
}

// ——— Filtros ———
// Viven en la dirección de la página (?puesto=…&etapa=…) para que se conserven al ir de la lista a un perfil
// y de regreso, y para poder compartir un link con la misma selección.

const CLAVES = ['q', 'puesto', 'fuente', 'etapa', 'etiqueta'] as const
type Clave = (typeof CLAVES)[number]

export function useFiltros() {
  const [params, setParams] = useSearchParams()
  const valor = (k: Clave) => params.get(k) ?? ''

  const set = (k: Clave, v: string) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        if (v) n.set(k, v)
        else n.delete(k)
        return n
      },
      { replace: true },
    )

  const filtrar = useCallback(
    (cs: Candidato[]) => {
      const q = (params.get('q') ?? '').trim().toLowerCase()
      const puesto = params.get('puesto')
      const fuente = params.get('fuente')
      const etapa = params.get('etapa')
      const etiqueta = params.get('etiqueta')
      return cs
        .filter((c) => (!puesto || c.puestoId === puesto) && (!fuente || c.fuente === fuente))
        .filter((c) => (!etapa || c.etapa === etapa) && (!etiqueta || c.etiquetas.includes(etiqueta)))
        .filter((c) => !q || `${c.nombre} ${c.email} ${c.empleos.map((e) => e.empresa).join(' ')}`.toLowerCase().includes(q))
    },
    [params],
  )

  const consulta = useMemo(() => {
    const n = new URLSearchParams()
    for (const k of CLAVES) if (params.get(k)) n.set(k, params.get(k)!)
    const s = n.toString()
    return s ? `?${s}` : ''
  }, [params])

  const activos = CLAVES.filter((k) => params.get(k)).length

  return { valor, set, filtrar, consulta, activos, limpiar: () => setParams({}, { replace: true }) }
}
