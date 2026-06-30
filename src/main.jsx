import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' 
import { AuthProvider } from './context/AuthContext'
import { registerSW } from 'virtual:pwa-register'

/**
 * PWA Service Worker Registration
 * This enables the 'Install Now' functionality from your HTML
 */
registerSW({ 
  immediate: true,
  onRegistered(r) {
    console.log('RadiExpense PWA Ready');
  },
});

/**
 * RadiExpense Entry Point
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)