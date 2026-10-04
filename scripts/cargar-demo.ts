// Sube los candidatos ficticios del modo demo a Firestore, por la misma vía pública que usa el formulario
// (mismas reglas de seguridad). Uso: node --env-file=.env scripts/cargar-demo.ts <puestoId> "<puestoNombre>"
import { initializeApp } from 'firebase/app'
import { addDoc, collection, getFirestore, serverTimestamp } from 'firebase/firestore'
import { CANDIDATOS_DEMO } from '../src/data/demoSeed.ts'

const [puestoId, puestoNombre] = process.argv.slice(2)
if (!puestoId || !puestoNombre) throw new Error('Uso: cargar-demo.ts <puestoId> "<puestoNombre>"')

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
})
const db = getFirestore(app)

for (const { id: _id, creado: _creado, ...c } of CANDIDATOS_DEMO) {
  const ref = await addDoc(collection(db, 'candidatos'), {
    ...c,
    nombre: `${c.nombre} (demo)`,
    puestoId,
    puestoNombre,
    creado: serverTimestamp(),
  })
  console.log('✔', c.nombre, ref.id)
}
process.exit(0)
