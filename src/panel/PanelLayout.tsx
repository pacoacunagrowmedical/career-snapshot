import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { DOMINIO_PERMITIDO, store, type Store, type Usuario } from '../data/store'

export function PanelLayout() {
  const [s, setS] = useState<Store | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined)
  const [error, setError] = useState('')

  useEffect(() => {
    let fin = () => {}
    store().then((st) => {
      setS(st)
      fin = st.observarUsuario(setUsuario)
    })
    return () => fin()
  }, [])

  if (!s || usuario === undefined) return <div className="centro muted">Cargando…</div>

  if (!usuario) {
    return (
      <div className="centro">
        <div className="card stack" style={{ maxWidth: 400, textAlign: 'center' }}>
          <div className="logo" style={{ margin: '0 auto' }}>G</div>
          <h1 style={{ fontSize: '1.3rem' }}>Snapshot de Carrera</h1>
          <p className="muted">Panel de reclutamiento de Grow Medical. Entra con tu cuenta @{DOMINIO_PERMITIDO}.</p>
          {error && <div className="aviso aviso-amarillo small">{error}</div>}
          <button
            className="btn btn-primary"
            onClick={() => {
              setError('')
              s.entrar().catch((e: Error) => setError(e.message))
            }}
          >
            {s.demo ? 'Entrar al modo demo' : 'Entrar con Google'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {s.demo && (
        <div className="demo-banner no-print">
          Modo demo: datos ficticios guardados solo en este navegador. Configura Firebase en <code>.env</code> para usar datos reales.
        </div>
      )}
      <header className="panel-top">
        <div className="inner">
          <div className="row" style={{ gap: 10 }}>
            <div className="logo" style={{ width: 30, height: 30, fontSize: 14 }}>G</div>
            <b>Snapshot de Carrera</b>
          </div>
          <nav>
            <NavLink to="/panel" end>Candidatos</NavLink>
            <NavLink to="/panel/puestos">Puestos</NavLink>
          </nav>
          <div className="spacer" />
          <span className="muted small">{usuario.email}</span>
          <button className="btn btn-sm btn-ghost" onClick={() => s.salir()}>Salir</button>
        </div>
      </header>
      <main className="panel-main">
        <Outlet context={s} />
      </main>
    </>
  )
}
