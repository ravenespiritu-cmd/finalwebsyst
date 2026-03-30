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
      const url = String(c.apiUrl).replace(/\/$/, '')
      const pointsToLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\b/i.test(url)
      const host = typeof window !== 'undefined' ? window.location.hostname : ''
      const onDeployedSite = host && !/^(localhost|127\.0\.0\.1)$/i.test(host)
      // Stale config.json (e.g. localhost) must not override production builds
      if (!(pointsToLocal && onDeployedSite)) {
        window.__API_BASE_URL__ = url
      }
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
