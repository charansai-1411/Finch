import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import HomeView from './components/HomeView.jsx'
import BusinessBrainView from './components/BusinessBrainView.jsx'
import MonitorView from './components/MonitorView.jsx'
import AgentBuilder from './components/AgentBuilder.jsx'

const LS_KEY = 'finch_active_shopping'
const loadActive = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)) } catch { return null } }

export default function App() {
  const [view, setView] = useState('home')            // home | brain | monitor
  const [setup, setSetup] = useState(false)            // shopping-agent setup flow open?
  const [activeShopping, setActiveShopping] = useState(loadActive)

  useEffect(() => {
    try {
      if (activeShopping) localStorage.setItem(LS_KEY, JSON.stringify(activeShopping))
      else localStorage.removeItem(LS_KEY)
    } catch { /* ignore */ }
  }, [activeShopping])

  const nav = (v) => { setSetup(false); setView(v) }
  const openSetup = (id) => { if (id === 'shopping') setSetup(true) }

  return (
    <div className="shell">
      <Sidebar view={view} onNav={nav} />
      <main className="content">
        <div className="page">
          {setup ? (
            <AgentBuilder
              existing={activeShopping}
              onBack={() => setSetup(false)}
              onActivated={(tenant) => setActiveShopping(tenant)}
              onClose={() => { setSetup(false); setView('monitor') }}
            />
          ) : view === 'home' ? (
            <HomeView activeShopping={activeShopping} onSetup={openSetup} />
          ) : view === 'brain' ? (
            <BusinessBrainView />
          ) : (
            <MonitorView activeShopping={activeShopping} onManage={() => setSetup(true)} onGoHome={() => setView('home')} />
          )}
        </div>
      </main>
      <span className="mock-tag">● Demo mode — mock API (no AWS yet)</span>
    </div>
  )
}
