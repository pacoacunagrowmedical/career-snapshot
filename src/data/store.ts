import type { Candidato, Etiqueta, Nota, Puesto, Solicitud } from '../types'

export interface Usuario {
  email: string
  nombre: string
  foto?: string
}

/** Todo el acceso a datos pasa por aquí: Firebase en producción, el navegador en modo demo. */
export interface Store {
  demo: boolean
  // Público (formulario)
  puestosActivos(): Promise<Pick<Puesto, 'id' | 'nombre'>[]>
  enviarSolicitud(s: Solicitud): Promise<void>
  // Panel
  observarUsuario(cb: (u: Usuario | null) => void): () => void
  entrar(): Promise<void>
  salir(): Promise<void>
  puestos(): Promise<Puesto[]>
  guardarPuesto(p: Omit<Puesto, 'id'> & { id?: string }): Promise<void>
  borrarPuesto(id: string): Promise<void>
  candidatos(): Promise<Candidato[]>
  candidato(id: string): Promise<Candidato | null>
  borrarCandidatos(ids: string[]): Promise<void>
  importarCandidatos(cs: (Solicitud & { creado: Date })[]): Promise<void>
  // Seguimiento
  actualizarCandidatos(ids: string[], cambios: { etapa?: string; etiquetas?: string[]; orden?: number }): Promise<void>
  etiquetas(): Promise<Etiqueta[]>
  guardarEtiqueta(e: Omit<Etiqueta, 'id'> & { id?: string }): Promise<Etiqueta>
  borrarEtiqueta(id: string): Promise<void>
  notas(candidatoId: string): Promise<Nota[]>
  agregarNota(candidatoId: string, texto: string, tipo?: Nota['tipo']): Promise<void>
  editarNota(candidatoId: string, notaId: string, texto: string): Promise<void>
  borrarNota(candidatoId: string, notaId: string): Promise<void>
  usuarioActual(): Usuario | null
}

// `npm run demo` fuerza el modo demo aunque exista .env (para revisar cambios sin tocar datos reales).
export const firebaseConfigurado = Boolean(import.meta.env.VITE_FIREBASE_API_KEY) && import.meta.env.MODE !== 'demo'
export const DOMINIO_PERMITIDO = (import.meta.env.VITE_ALLOWED_DOMAIN as string | undefined) || 'growmedical.org'

let instancia: Promise<Store> | null = null

export function store(): Promise<Store> {
  instancia ??= firebaseConfigurado
    ? import('./firebaseStore').then((m) => m.crearFirebaseStore())
    : import('./localStore').then((m) => m.crearLocalStore())
  return instancia
}
