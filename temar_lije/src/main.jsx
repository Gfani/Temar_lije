import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import CreateAccount from './features/auth/create_account/create_account'


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CreateAccount />
  </StrictMode>,
)