import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/dsh-theme.css'
import './styles/app.css'
import './styles/markdown.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root mount point')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
