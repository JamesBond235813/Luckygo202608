import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'antd-mobile/es/global'
import './index.css'
import App from './App.tsx'
import { AntdMobileProvider } from './providers/AntdMobileProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AntdMobileProvider>
      <App />
    </AntdMobileProvider>
  </StrictMode>,
)
