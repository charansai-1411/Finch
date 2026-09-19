import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import HomeView from './components/HomeView.jsx'
import BusinessBrainView from './components/BusinessBrainView.jsx'
import MonitorView from './components/MonitorView.jsx'
import AgentBuilder from './components/AgentBuilder.jsx'
import SupportAgentBuilder from './components/SupportAgentBuilder.jsx'

const LS_SHOP = 'finch_active_shopping'
const LS_SUPPORT = 'finch_active_support'
const load = (k) => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } }
const persist = (k, v) => { try { v ? localStorage.setItem(k, JSON.stringify(v)) : localStorage.removeItem(k) } catch { /* ignore */ } }

export default function App() {
  const [view, setView] = useState('home')            // home | brain | monitor
  const [setup, setSetup] = useState(false)            // false | 'shopping' | 'support'
  const [activeShopping, setActiveShopping] = useState(() => load(LS_SHOP))
  const [activeSupport, setActiveSupport] = useState(() => load(LS_SUPPORT))

  useEffect(() => persist(LS_SHOP, activeShopping), [activeShopping])
  useEffect(() => persist(LS_SUPPORT, activeSupport), [activeSupport])

  const nav = (v) => { setSetup(false); setView(v) }
  const openSetup = (id) => { if (id === 'shopping' || id === 'support') setSetup(id) }

  return (
    <div className="shell">
      <Sidebar view={view} onNav={nav} />
      <main className="content">
        <div className="page">
          {setup === 'shopping' ? (
            <AgentBuilder
              existing={activeShopping}
              onBack={() => setSetup(false)}
              onActivated={(tenant) => setActiveShopping(tenant)}
              onClose={() => { setSetup(false); setView('monitor') }}
            />
          ) : setup === 'support' ? (
            <SupportAgentBuilder
              existing={activeSupport}
              onBack={() => setSetup(false)}
              onActivated={(kb) => setActiveSupport(kb)}
              onClose={() => { setSetup(false); setView('monitor') }}
            />
          ) : view === 'home' ? (
            <HomeView activeShopping={activeShopping} activeSupport={activeSupport} onSetup={openSetup} />
          ) : view === 'brain' ? (
            <BusinessBrainView />
          ) : (
            <MonitorView
              activeShopping={activeShopping}
              activeSupport={activeSupport}
              onManage={(id) => setSetup(id || 'shopping')}
              onGoHome={() => setView('home')}
            />
          )}
        </div>
      </main>
      <span className="mock-tag">● Shopping = demo · Support = live backend</span>
    </div>
  )
}
