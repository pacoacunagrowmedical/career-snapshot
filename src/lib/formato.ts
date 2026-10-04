const fmt = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 })

/** 21000 → "$21,000" */
export function dinero(n: number | null | undefined, moneda?: string): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  const s = `$${fmt.format(n)}`
  return moneda && moneda !== 'MXN' ? `${s} ${moneda}` : s
}

/** 21000 → "21k" */
export function dineroCorto(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(n)
}

/** Acepta "15,000", "$15 000", "15k" → 15000. Devuelve NaN si no se entiende. */
export function leerDinero(texto: string): number {
  const t = texto.trim().toLowerCase().replace(/[$\s,]/g, '').replace(/mxn|usd|pesos?/g, '')
  if (!t) return NaN
  const k = t.endsWith('k')
  const n = Number(k ? t.slice(0, -1) : t)
  return k ? n * 1000 : n
}

export function porcentaje(f: number): string {
  const p = Math.round(f * 100)
  return `${p > 0 ? '+' : ''}${p} %`
}
