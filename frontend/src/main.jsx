import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Initialize theme from store before first render to prevent flash
import { useThemeStore } from './stores/themeStore'
useThemeStore.getState() // triggers store init → applyThemeToDOM

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
