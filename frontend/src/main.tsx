import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Always apply dark mode — no toggle, no system preference check
document.documentElement.classList.add('dark');
localStorage.removeItem('theme');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
