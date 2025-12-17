import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { GoogleOAuthProvider } from '@react-oauth/google'
import React from 'react'

const GOOGLE_CLIENT_ID = "14409019261-efo12jcdulklhilhu0817o4n4i3bpsfv.apps.googleusercontent.com"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
