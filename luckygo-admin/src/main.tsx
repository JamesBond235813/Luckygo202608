import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AdminAntdProvider } from './lib/AdminAntdProvider.tsx'
import { AdminI18nProvider } from './lib/AdminI18nProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminI18nProvider>
      <AdminAntdProvider>
        <App />
      </AdminAntdProvider>
    </AdminI18nProvider>
  </StrictMode>,
)
