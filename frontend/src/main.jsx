import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

async function init() {
  // Load runtime config so API URL works on Vercel (set VITE_API_URL in env)
  try {
    const r = await fetch('/config.json')
    const c = await r.json()
    if (c?.apiUrl) {
      window.__API_BASE_URL__ = c.apiUrl.replace(/\/$/, '')
    }
  } catch (_) {
    // no config.json or invalid; use build-time env
  }
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
init()
