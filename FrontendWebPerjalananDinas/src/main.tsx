import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/App'
import { PenyediaAuth } from '@/auth/AuthContext'
import { BatasGalat } from '@/components/feedback/BatasGalat'
import '@/styles/index.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Elemen #root tidak ditemukan pada index.html')
}

createRoot(container).render(
  <StrictMode>
    <BatasGalat>
      <PenyediaAuth>
        <App />
      </PenyediaAuth>
    </BatasGalat>
  </StrictMode>,
)
