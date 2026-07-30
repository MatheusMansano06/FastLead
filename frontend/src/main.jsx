import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service worker só em produção: em dev ele serve bundle velho e confunde o debug.
// Serve para o tablet do carro continuar exibindo anúncio quando a internet cai.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* sem service worker o app ainda funciona, só perde o modo offline */
    })
  })
}
