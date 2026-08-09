import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import LiveClassTab from './features/classroom-detail/tabs/LiveClassTab/LiveClassTab'
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LiveClassTab />
  </StrictMode>,
)