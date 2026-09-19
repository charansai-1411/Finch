import { useState } from 'react'
import FinchGlyph from '../finchGlyph.jsx'
import { Cart, Life } from '../icons.jsx'

function AgentLiveCard({ icon, name, sub, stats }) {
  const [live, setLive] = useState(true)
  return (
    <div className="live-card">
      <div className="lh">
        <div className="ic">{icon}</div>
        <div style={{ flex: 1 }}>
          <b>{name}</b>
          <div className="store">{sub}</div>
        </div>
        {live && <span className="live-pill"><i /> Live</span>}
      </div>

      <div className="stat-row">
        {stats.map((s) => (
          <div className="mstat" key={s.l}><div className="n">{live ? s.n : '—'}</div><div className="l">{s.l}</div></div>
        ))}
      </div>

      <div className="live-actions">
        <button className={'toggle' + (live ? '' : ' off')} onClick={() => setLive((v) => !v)}>
          <span className="sw" /> {live ? 'Live' : 'Paused'}
        </button>
      </div>
    </div>
  )
}

export default function MonitorView({ activeShopping, activeSupport, onManage, onGoHome }) {
  const none = !activeShopping && !activeSupport

  if (none) {
    return (
      <div className="view-enter">
        <div className="page-top"><div><h2 className="title">Monitor</h2>
          <p className="lead">Watch your live agents — sessions, recommendations, and what they're converting.</p></div></div>
        <div className="empty">
          <div className="fig"><FinchGlyph /></div>
          <h4>No agents running yet</h4>
          <p>Activate an agent from Home and it'll show up here with live stats.</p>
          <button className="btn btn-primary" style={{ marginTop: '1.2rem' }} onClick={onGoHome}>Browse agents</button>
        </div>
      </div>
    )
  }

  return (
    <div className="view-enter">
      <div className="page-top"><div><h2 className="title">Monitor</h2>
        <p className="lead">Watch your live agents — sessions, recommendations, and what they're converting.</p></div></div>

      {activeShopping && (
        <div style={{ marginBottom: '1.2rem' }}>
          <AgentLiveCard
            icon={<Cart />}
            name="Shopping Agent"
            sub={`${activeShopping.businessName} · ${(activeShopping.productCount || 0).toLocaleString()} products`}
            stats={[{ n: '128', l: 'Chats started' }, { n: '96', l: 'Products recommended' }, { n: '34', l: 'Added to cart' }]}
          />
          <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
            <button className="link-btn" onClick={() => onManage('shopping')}>Manage &amp; get snippet</button>
          </div>
        </div>
      )}

      {activeSupport && (
        <div>
          <AgentLiveCard
            icon={<Life />}
            name="Support Agent"
            sub={`${activeSupport.businessName} · ${activeSupport.docCount} docs · ${activeSupport.chunkCount} passages`}
            stats={[{ n: '212', l: 'Questions asked' }, { n: '198', l: 'Answered from docs' }, { n: '14', l: 'Handed to a human' }]}
          />
          <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
            <button className="link-btn" onClick={() => onManage('support')}>Manage &amp; get snippet</button>
          </div>
        </div>
      )}

      <p className="foot-note" style={{ textAlign: 'left', marginTop: '1.4rem' }}>
        Support metrics are sample data; the Support agent itself answers live from your uploaded docs.
      </p>
    </div>
  )
}
