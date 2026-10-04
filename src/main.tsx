import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './styles.css'
import { FormularioPage } from './form/FormularioPage'
import { AvisoPrivacidad } from './form/AvisoPrivacidad'
import { PanelLayout } from './panel/PanelLayout'
import { CandidatosPage } from './panel/CandidatosPage'
import { PerfilPage } from './panel/PerfilPage'
import { PuestosPage } from './panel/PuestosPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FormularioPage />} />
        <Route path="/aviso-de-privacidad" element={<AvisoPrivacidad />} />
        <Route path="/panel" element={<PanelLayout />}>
          <Route index element={<CandidatosPage />} />
          <Route path="candidato/:id" element={<PerfilPage />} />
          <Route path="puestos" element={<PuestosPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
