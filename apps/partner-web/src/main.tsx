import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './app/App'
import { LanguageProvider, LanguageSelect } from './lib/language'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <div className="fixed right-4 top-4 z-[100]">
        <LanguageSelect />
      </div>
      <App />
    </LanguageProvider>
  </StrictMode>,
)
