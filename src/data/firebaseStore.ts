import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, orderBy, query,
  serverTimestamp, Timestamp, where, writeBatch,
} from 'firebase/firestore'
import type { Candidato, Solicitud } from '../types'
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

    async borrarCandidatos(ids) {
      for (let i = 0; i < ids.length; i += 400) {
        const batch = writeBatch(db)
        for (const id of ids.slice(i, i + 400)) batch.delete(doc(db, 'candidatos', id))
        await batch.commit()
      }
    },
  }
}

function aCandidato(id: string, data: Record<string, unknown>): Candidato {
  const creado = data.creado instanceof Timestamp ? data.creado.toDate() : new Date()
  return { ...(data as unknown as Solicitud), id, creado }
}

