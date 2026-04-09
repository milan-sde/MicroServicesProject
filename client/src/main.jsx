import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '12px',
            border: '1px solid #d8d5cf',
            background: '#fffcf8',
            color: '#1f2937',
          },
          success: {
            style: {
              border: '1px solid #86efac',
              background: '#f0fdf4',
              color: '#166534',
            },
          },
          error: {
            style: {
              border: '1px solid #fca5a5',
              background: '#fef2f2',
              color: '#991b1b',
            },
          },
        }}
      />
    </BrowserRouter>
  </StrictMode>,
)
