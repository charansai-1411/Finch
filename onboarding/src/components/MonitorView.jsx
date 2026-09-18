import { useState } from 'react'
import FinchGlyph from '../finchGlyph.jsx'
import { Cart } from '../icons.jsx'

export default function MonitorView({ activeShopping, onManage, onGoHome }) {
  const [live, setLive] = useState(true)

  if (!activeShopping) {
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

  // demo metrics — replaced by real analytics once the agent is on AWS
  const stats = [
    { n: '128', l: 'Chats started' },
    { n: '96', l: 'Products recommended' },
    { n: '34', l: 'Added to cart' },
  ]

  return (
    <div className="view-enter">
      <div className="page-top"><div><h2 className="title">Monitor</h2>
        <p className="lead">Watch your live agents — sessions, recommendations, and what they're converting.</p></div></div>

      <div className="live-card">
        <div className="lh">
          <div className="ic"><Cart /></div>
          <div style={{ flex: 1 }}>
            <b>Shopping Agent</b>
            <div className="store">{activeShopping.businessName} · {(activeShopping.productCount || 0).toLocaleString()} products</div>
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
          <button className="link-btn" onClick={onManage}>Manage & get snippet</button>
        </div>
      </div>

      <p className="foot-note" style={{ textAlign: 'left', marginTop: '1.4rem' }}>Demo mode — metrics are sample data until the agent runs on AWS.</p>
    </div>
  )
}
