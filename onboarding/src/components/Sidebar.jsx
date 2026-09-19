import FinchGlyph from '../finchGlyph.jsx'
import { Home, Brain, Monitor } from '../icons.jsx'
import { USER_NAME } from '../data.js'

const NAV = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'brain', label: 'Business Brain', Icon: Brain },
  { id: 'monitor', label: 'Monitor', Icon: Monitor },
]

// Back to the marketing site (dev: local server; prod: site root).
const LANDING_URL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
  ? 'http://localhost:5500' : '/'

export default function Sidebar({ view, onNav }) {
  return (
    <aside className="sidebar">
      <a href={LANDING_URL} className="side-brand" style={{ textDecoration: 'none', color: 'inherit' }} title="Back to finch.app">
        <span className="mark"><FinchGlyph /></span> Finch
      </a>
      <div className="nav-sec">Workspace</div>
      <nav className="side-nav">
        {NAV.map(({ id, label, Icon }) => (
          <button key={id} className={'nav-item' + (view === id ? ' on' : '')} onClick={() => onNav(id)}>
            <Icon /> {label}
          </button>
        ))}
      </nav>
      <div className="side-foot">
        <div className="av">{USER_NAME[0]}</div>
        <div className="who">{USER_NAME}<small>Free plan</small></div>
      </div>
    </aside>
  )
}
