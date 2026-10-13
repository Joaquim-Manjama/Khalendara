import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import InstallApp from './InstallApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <InstallApp />
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {
      // Installation is optional; keep the online app available when caching fails.
    })
  })
}
