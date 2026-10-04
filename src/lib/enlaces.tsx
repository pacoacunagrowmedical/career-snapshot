import { Fragment } from 'react'

const URL_RE = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi

/** Muestra texto respetando saltos de línea y convierte los links en enlaces clicables (se abren en otra pestaña). */
export function TextoConEnlaces({ texto }: { texto: string }) {
  const partes = texto.split(URL_RE)
  return (
    <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
      {partes.map((p, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{p}</Fragment>
        // La puntuación final ("…ver https://x.com.") no forma parte del link.
        const m = p.match(/^(.*?)([.,;:!?)\]]*)$/)!
        const url = m[1]
        const href = url.startsWith('http') ? url : `https://${url}`
        return (
          <Fragment key={i}>
            <a href={href} target="_blank" rel="noopener noreferrer">{url}</a>
            {m[2]}
          </Fragment>
        )
      })}
    </span>
  )
}
