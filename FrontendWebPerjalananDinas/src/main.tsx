import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import App from '@/App'
import { PenyediaAuth } from '@/auth/AuthContext'
import '@/styles/index.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Elemen #root tidak ditemukan pada index.html')
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <PenyediaAuth>
        <App />
      </PenyediaAuth>
    </BrowserRouter>
  </StrictMode>,
)
