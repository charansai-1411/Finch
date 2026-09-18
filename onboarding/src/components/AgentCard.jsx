import { ICONS } from '../icons.jsx'

export default function AgentCard({ agent, active, onSetup }) {
  const Icon = ICONS[agent.icon]
  const available = agent.status === 'available'
  return (
    <div className={'acard ' + (available ? 'available' : 'soon')}>
      {active
        ? <span className="live-badge"><i /> Live</span>
        : !available && <span className="soon-badge">Coming soon</span>}
      <div className="ic">{Icon && <Icon />}</div>
      <div className="an"><b>{agent.name}</b><span className="chip">{agent.tag}</span></div>
      <p>{agent.desc}</p>
      <div className="act">
        {available ? (
          <button className="btn btn-primary" onClick={() => onSetup(agent.id)}>
            {active ? 'Manage' : 'Set up'}
          </button>
        ) : (
          <button className="btn btn-ghost" disabled>Coming soon</button>
        )}
      </div>
    </div>
  )
}
