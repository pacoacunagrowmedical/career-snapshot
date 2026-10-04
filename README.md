# Snapshot de Carrera — Grow Medical

En producción: https://career-snapshot.web.app (formulario) · https://career-snapshot.web.app/panel (panel)

Herramienta de reclutamiento inspirada en el *PreScreen Snapshot* de Topgrading.

- **`/`** — Formulario público para candidatos (liga abierta, no indexada).
- **`/panel`** — Panel privado (solo cuentas @growmedical.org): lista de candidatos, perfil con snapshot, puestos.

## Probar en local (modo demo)

Sin configurar Firebase, la app corre en **modo demo**: usa 4 candidatos ficticios y guarda todo en el navegador.

```bash
npm install
npm run dev
```

Abre http://localhost:5173 (formulario) y http://localhost:5173/panel (panel).

```bash
npm test   # pruebas de los cálculos (huecos, traslapes, banderas)
```

## Poner en producción con Firebase

1. **Crear el proyecto** en https://console.firebase.google.com (plan Blaze recomendado).
2. **Firestore**: *Build → Firestore Database → Create database* (modo producción, región `nam5` o `us-central`).
3. **Authentication**: *Build → Authentication → Sign-in method → Google → Enable*.
   En *Settings → Authorized domains* agrega el dominio donde vivirá la app.
4. **App web**: *Project settings → Your apps → Web*. Copia los valores a un archivo `.env` (usa `.env.example` como plantilla).
5. **Protección contra bots (recomendado)**: *Build → App Check* → registra la app con **reCAPTCHA Enterprise**,
   pon la clave en `VITE_RECAPTCHA_SITE_KEY` y, cuando confirmes que funciona, activa *Enforce* para Firestore.
6. **Desplegar**:

   ```bash
   npx firebase login                   # firebase-tools ya viene en devDependencies
   cp .firebaserc.example .firebaserc   # y pon el ID de tu proyecto
   npm run deploy                       # build + hosting + reglas de Firestore
   ```

7. Entra a `/panel`, ve a **Puestos** y da de alta las vacantes con su sueldo ofrecido.

> Si cambias el dominio permitido, cámbialo en `.env` (`VITE_ALLOWED_DOMAIN`) **y** en `firestore.rules`.

## Seguridad y privacidad

| Capa | Qué hace |
|---|---|
| `firestore.rules` | El público solo puede **crear** solicitudes (con validación de forma); leer/borrar requiere cuenta @growmedical.org verificada. El sueldo ofrecido vive en `puestosPrivado`, invisible para candidatos. |
| No indexar | Encabezado `X-Robots-Tag` en todo el sitio (`firebase.json`), meta `robots` en `index.html` y `robots.txt` que bloquea buscadores y rastreadores de IA. |
| Bots | Campo trampa oculto, tiempo mínimo de llenado y App Check (reCAPTCHA invisible). |
| Borrado | Confirmación escribiendo `ELIMINAR`, con lista de registros y opción de exportar CSV antes. |

**Pendiente:** reemplazar el texto provisional de `src/form/AvisoPrivacidad.tsx` con el aviso de privacidad oficial.

## Estructura

```
src/
  form/        Formulario por pasos (borrador autoguardado, validación)
  panel/       Lista de candidatos, perfil, puestos, confirmación de borrado
  snapshot/    Gráfica de sueldo + filas alineadas en el tiempo (SVG)
  lib/         analisis.ts (huecos, traslapes, banderas), catálogos, fechas, CSV
  data/        Acceso a datos: Firebase o modo demo (localStorage)
```

## Decisiones de diseño

- Sueldos **mensuales netos**; moneda solo si el candidato vive fuera de México (la línea de "ofrecemos" solo se dibuja en MXN).
- Fechas con precisión de **mes**. Un cambio de empleo dentro del mismo mes no cuenta como hueco ni traslape.
- **Freelance** se registra aparte y cuenta como tiempo **sin empleo** (se dibuja rayado en la cronología).
- Calificación del jefe: **general, resultados y trato con la gente**, 1–5 o "Imposible de dar".
- Razones de salida con los códigos de Topgrading (M, N, B, P, LM, L, D, O, T) en semáforo.
- Puestos dentro de cada empresa en versión ligera: puesto inicial, final y número de ascensos.
- No se pregunta estado civil.
