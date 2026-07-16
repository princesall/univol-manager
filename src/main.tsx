import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ensureSeeded } from '@/lib/seed'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import './styles/global.css'

function Root() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ensureSeeded().finally(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-parchment-50">
        <div className="egg-ring h-12 w-12" style={{ ['--pct' as any]: 60 }}>
          <div className="egg-ring-inner" />
        </div>
      </div>
    )
  }

  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>
)
