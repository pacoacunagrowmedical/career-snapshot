import type { Candidato, Etiqueta, Nota, Puesto } from '../types'
import { CANDIDATOS_DEMO, ETIQUETAS_DEMO, PUESTOS_DEMO } from './demoSeed'
import type { Store, Usuario } from './store'
import { normalizarCandidato } from './normalizar'

// Modo demo: todo vive en localStorage de este navegador. Sirve para probar sin un proyecto de Firebase.

const CLAVE = 'snapshot-demo-v1'
const CLAVE_SESION = 'snapshot-demo-sesion'

type NotaGuardada = Omit<Nota, 'creado' | 'editado'> & { creado: string; editado: string | null }

interface Datos {
  puestos: Puesto[]
  candidatos: (Record<string, unknown> & { id: string; creado: string })[]
  etiquetas?: Etiqueta[]
  notas?: Record<string, NotaGuardada[]>
}

function leer(): Datos {
  try {
    const raw = localStorage.getItem(CLAVE)
    if (raw) return JSON.parse(raw)
  } catch {
    /* almacenamiento no disponible */
  }
  return {
    puestos: PUESTOS_DEMO,
    candidatos: CANDIDATOS_DEMO.map((c) => ({ ...c, creado: c.creado.toISOString() })),
    etiquetas: ETIQUETAS_DEMO,
    notas: {},
  }
}

function escribir(d: Datos) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(d))
  } catch {
    /* almacenamiento no disponible */
  }
}

const aCandidato = (c: Datos['candidatos'][number]): Candidato =>
  normalizarCandidato(c.id, c as unknown as Record<string, unknown>, new Date(c.creado))

export function crearLocalStore(): Store {
  const oyentes = new Set<(u: Usuario | null) => void>()
  const usuarioDemo: Usuario = { email: 'demo@growmedical.org', nombre: 'Modo demo' }
  const sesion = () => {
    try {
      return sessionStorage.getItem(CLAVE_SESION) === '1'
    } catch {
      return false
    }
  }
  const avisar = () => oyentes.forEach((cb) => cb(sesion() ? usuarioDemo : null))

  return {
    demo: true,

    async puestosActivos() {
      return leer().puestos.filter((p) => p.activo).sort((a, b) => a.orden - b.orden).map(({ id, nombre }) => ({ id, nombre }))
    },

    async enviarSolicitud(s) {
      const d = leer()
      d.candidatos.unshift({ ...s, id: `c-${Date.now()}`, creado: new Date().toISOString() })
      escribir(d)
    },

    observarUsuario(cb) {
      oyentes.add(cb)
      cb(sesion() ? usuarioDemo : null)
      return () => oyentes.delete(cb)
    },

    async entrar() {
      try {
        sessionStorage.setItem(CLAVE_SESION, '1')
      } catch {
        /* sin almacenamiento */
      }
      avisar()
    },

    async salir() {
      try {
        sessionStorage.removeItem(CLAVE_SESION)
      } catch {
        /* sin almacenamiento */
      }
      avisar()
    },

    async puestos() {
      return [...leer().puestos].sort((a, b) => a.orden - b.orden)
    },

    async guardarPuesto(p) {
      const d = leer()
      const id = p.id ?? `p-${Date.now()}`
      const i = d.puestos.findIndex((x) => x.id === id)
      const nuevo = { ...p, id }
      if (i >= 0) d.puestos[i] = nuevo
      else d.puestos.push(nuevo)
      escribir(d)
    },

    async borrarPuesto(id) {
      const d = leer()
      d.puestos = d.puestos.filter((p) => p.id !== id)
      escribir(d)
    },

    async candidatos() {
      return leer().candidatos.map(aCandidato).sort((a, b) => b.creado.getTime() - a.creado.getTime())
    },

    async candidato(id) {
      const c = leer().candidatos.find((x) => x.id === id)
      return c ? aCandidato(c) : null
    },

    async importarCandidatos(cs) {
      const d = leer()
      cs.forEach((c, i) => d.candidatos.push({ ...c, id: `imp-${Date.now()}-${i}`, creado: c.creado.toISOString() }))
      escribir(d)
    },

    async actualizarCandidatos(ids, cambios) {
      const d = leer()
      const set = new Set(ids)
      d.candidatos = d.candidatos.map((c) => (set.has(c.id) ? { ...c, ...cambios } : c))
      escribir(d)
    },

    async etiquetas() {
      return [...(leer().etiquetas ?? ETIQUETAS_DEMO)].sort((a, b) => a.nombre.localeCompare(b.nombre))
    },

    async guardarEtiqueta(e) {
      const d = leer()
      const nueva = { ...e, id: e.id ?? `e-${Date.now()}` }
      const lista = d.etiquetas ?? [...ETIQUETAS_DEMO]
      const i = lista.findIndex((x) => x.id === nueva.id)
      if (i >= 0) lista[i] = nueva
      else lista.push(nueva)
      d.etiquetas = lista
      escribir(d)
      return nueva
    },

    async borrarEtiqueta(id) {
      const d = leer()
      d.etiquetas = (d.etiquetas ?? ETIQUETAS_DEMO).filter((e) => e.id !== id)
      escribir(d)
    },

    async notas(candidatoId) {
      return (leer().notas?.[candidatoId] ?? [])
        .map((n) => ({ ...n, creado: new Date(n.creado), editado: n.editado ? new Date(n.editado) : null }))
        .sort((a, b) => b.creado.getTime() - a.creado.getTime())
    },

    async agregarNota(candidatoId, texto, tipo = 'nota') {
      const d = leer()
      d.notas ??= {}
      ;(d.notas[candidatoId] ??= []).push({
        id: `n-${Date.now()}`, tipo, texto, autorEmail: usuarioDemo.email, autorNombre: usuarioDemo.nombre,
        creado: new Date().toISOString(), editado: null,
      })
      if (tipo === 'nota') d.candidatos = d.candidatos.map((c) => (c.id === candidatoId ? { ...c, numNotas: Number(c.numNotas ?? 0) + 1 } : c))
      escribir(d)
    },

    async editarNota(candidatoId, notaId, texto) {
      const d = leer()
      d.notas![candidatoId] = (d.notas?.[candidatoId] ?? []).map((n) => (n.id === notaId ? { ...n, texto, editado: new Date().toISOString() } : n))
      escribir(d)
    },

    async borrarNota(candidatoId, notaId) {
      const d = leer()
      d.notas![candidatoId] = (d.notas?.[candidatoId] ?? []).filter((n) => n.id !== notaId)
      d.candidatos = d.candidatos.map((c) => (c.id === candidatoId ? { ...c, numNotas: Math.max(0, Number(c.numNotas ?? 0) - 1) } : c))
      escribir(d)
    },

    usuarioActual() {
      return sesion() ? usuarioDemo : null
    },

    async borrarCandidatos(ids) {
      const d = leer()
      const set = new Set(ids)
      d.candidatos = d.candidatos.filter((c) => !set.has(c.id))
      escribir(d)
    },
  }
}
