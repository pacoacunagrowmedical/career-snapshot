import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, increment, orderBy, query,
  serverTimestamp, setDoc, Timestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import type { Candidato, Nota, Solicitud } from '../types'
import { normalizarCandidato } from './normalizar'
import { DOMINIO_PERMITIDO, type Store } from './store'

export function crearFirebaseStore(): Store {
  const env = import.meta.env
  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  })
  if (env.VITE_RECAPTCHA_SITE_KEY) {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(env.VITE_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    })
  }
  const db = getFirestore(app)
  const auth = getAuth(app)

  const dominioValido = (email: string | null) => !!email && email.toLowerCase().endsWith(`@${DOMINIO_PERMITIDO}`)

  return {
    demo: false,

    async puestosActivos() {
      const snap = await getDocs(query(collection(db, 'puestos'), where('activo', '==', true)))
      return snap.docs
        .map((d) => ({ id: d.id, nombre: d.get('nombre') as string, orden: (d.get('orden') as number) ?? 0 }))
        .sort((a, b) => a.orden - b.orden)
        .map(({ id, nombre }) => ({ id, nombre }))
    },

    async enviarSolicitud(s: Solicitud) {
      await addDoc(collection(db, 'candidatos'), { ...s, creado: serverTimestamp() })
    },

    observarUsuario(cb) {
      return onAuthStateChanged(auth, (u) => {
        if (u && dominioValido(u.email)) cb({ email: u.email!, nombre: u.displayName ?? u.email!, foto: u.photoURL ?? undefined })
        else cb(null)
      })
    },

    async entrar() {
      const proveedor = new GoogleAuthProvider()
      proveedor.setCustomParameters({ hd: DOMINIO_PERMITIDO, prompt: 'select_account' })
      const r = await signInWithPopup(auth, proveedor)
      if (!dominioValido(r.user.email)) {
        await signOut(auth)
        throw new Error(`Solo pueden entrar cuentas @${DOMINIO_PERMITIDO}`)
      }
    },

    async salir() {
      await signOut(auth)
    },

    async puestos() {
      const [pub, priv] = await Promise.all([getDocs(collection(db, 'puestos')), getDocs(collection(db, 'puestosPrivado'))])
      const sueldos = new Map(priv.docs.map((d) => [d.id, (d.get('sueldoOfrecido') as number | null) ?? null]))
      return pub.docs
        .map((d) => ({
          id: d.id,
          nombre: d.get('nombre') as string,
          activo: d.get('activo') as boolean,
          orden: (d.get('orden') as number) ?? 0,
          sueldoOfrecido: sueldos.get(d.id) ?? null,
        }))
        .sort((a, b) => a.orden - b.orden)
    },

    async guardarPuesto(p) {
      const ref = p.id ? doc(db, 'puestos', p.id) : doc(collection(db, 'puestos'))
      const batch = writeBatch(db)
      batch.set(ref, { nombre: p.nombre, activo: p.activo, orden: p.orden })
      batch.set(doc(db, 'puestosPrivado', ref.id), { sueldoOfrecido: p.sueldoOfrecido })
      await batch.commit()
    },

    async borrarPuesto(id) {
      await Promise.all([deleteDoc(doc(db, 'puestos', id)), deleteDoc(doc(db, 'puestosPrivado', id))])
    },

    async candidatos() {
      const snap = await getDocs(query(collection(db, 'candidatos'), orderBy('creado', 'desc')))
      return snap.docs.map((d) => aCandidato(d.id, d.data()))
    },

    async candidato(id) {
      const d = await getDoc(doc(db, 'candidatos', id))
      return d.exists() ? aCandidato(d.id, d.data()) : null
    },

    async importarCandidatos(cs) {
      for (let i = 0; i < cs.length; i += 400) {
        const batch = writeBatch(db)
        for (const { creado, ...c } of cs.slice(i, i + 400)) {
          // JSON elimina los campos `undefined`, que Firestore no acepta.
          batch.set(doc(collection(db, 'candidatos')), { ...JSON.parse(JSON.stringify(c)), creado: Timestamp.fromDate(creado) })
        }
        await batch.commit()
      }
    },

    async borrarCandidatos(ids) {
      // Cada candidato se borra junto con sus notas en un mismo lote (las reglas lo permiten solo si el candidato desaparece).
      for (const id of ids) {
        const notas = await getDocs(collection(db, 'candidatos', id, 'notas'))
        if (notas.size > 490) throw new Error('Este candidato tiene demasiadas notas para borrarlo de una vez')
        const batch = writeBatch(db)
        notas.docs.forEach((d) => batch.delete(d.ref))
        batch.delete(doc(db, 'candidatos', id))
        await batch.commit()
      }
    },

    async actualizarCandidatos(ids, cambios) {
      const datos: Record<string, unknown> = {}
      if (cambios.etapa !== undefined) datos.etapa = cambios.etapa
      if (cambios.etiquetas !== undefined) datos.etiquetas = cambios.etiquetas
      for (let i = 0; i < ids.length; i += 400) {
        const batch = writeBatch(db)
        for (const id of ids.slice(i, i + 400)) batch.update(doc(db, 'candidatos', id), datos)
        await batch.commit()
      }
    },

    async etiquetas() {
      const snap = await getDocs(collection(db, 'etiquetas'))
      return snap.docs
        .map((d) => ({ id: d.id, nombre: d.get('nombre') as string, color: d.get('color') as string }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
    },

    async guardarEtiqueta(e) {
      const ref = e.id ? doc(db, 'etiquetas', e.id) : doc(collection(db, 'etiquetas'))
      await setDoc(ref, { nombre: e.nombre, color: e.color })
      return { id: ref.id, nombre: e.nombre, color: e.color }
    },

    async borrarEtiqueta(id) {
      await deleteDoc(doc(db, 'etiquetas', id))
    },

    async notas(candidatoId) {
      const snap = await getDocs(query(collection(db, 'candidatos', candidatoId, 'notas'), orderBy('creado', 'desc')))
      return snap.docs.map((d): Nota => ({
        id: d.id,
        tipo: d.get('tipo') === 'cambio' ? 'cambio' : 'nota',
        texto: (d.get('texto') as string) ?? '',
        autorEmail: (d.get('autorEmail') as string) ?? '',
        autorNombre: (d.get('autorNombre') as string) ?? '',
        creado: d.get('creado') instanceof Timestamp ? (d.get('creado') as Timestamp).toDate() : new Date(),
        editado: d.get('editado') instanceof Timestamp ? (d.get('editado') as Timestamp).toDate() : null,
      }))
    },

    async agregarNota(candidatoId, texto, tipo = 'nota') {
      const u = auth.currentUser
      if (!u?.email) throw new Error('Sesión no iniciada')
      const batch = writeBatch(db)
      batch.set(doc(collection(db, 'candidatos', candidatoId, 'notas')), {
        tipo, texto, autorEmail: u.email, autorNombre: u.displayName ?? u.email, creado: serverTimestamp(), editado: null,
      })
      if (tipo === 'nota') batch.update(doc(db, 'candidatos', candidatoId), { numNotas: increment(1) })
      await batch.commit()
    },

    async editarNota(candidatoId, notaId, texto) {
      await updateDoc(doc(db, 'candidatos', candidatoId, 'notas', notaId), { texto, editado: serverTimestamp() })
    },

    async borrarNota(candidatoId, notaId) {
      const batch = writeBatch(db)
      batch.delete(doc(db, 'candidatos', candidatoId, 'notas', notaId))
      batch.update(doc(db, 'candidatos', candidatoId), { numNotas: increment(-1) })
      await batch.commit()
    },

    usuarioActual() {
      const u = auth.currentUser
      return u?.email ? { email: u.email, nombre: u.displayName ?? u.email } : null
    },
  }
}


function aCandidato(id: string, data: Record<string, unknown>): Candidato {
  const creado = data.creado instanceof Timestamp ? data.creado.toDate() : new Date()
  return normalizarCandidato(id, data, creado)
}

