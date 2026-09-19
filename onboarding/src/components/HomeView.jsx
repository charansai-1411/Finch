import { useState } from 'react'
import AgentCard from './AgentCard.jsx'
import { AGENTS, USER_NAME } from '../data.js'
import { Spark, Send, Mic } from '../icons.jsx'

export default function HomeView({ activeShopping, activeSupport, onSetup }) {
  const isActive = (id) => (id === 'shopping' && !!activeShopping) || (id === 'support' && !!activeSupport)
  const [text, setText] = useState('')
  const [noted, setNoted] = useState(false)

  const submit = () => {
    if (!text.trim()) return
    setNoted(true)
    setText('')
  }

  return (
    <div className="view-enter">
      <div className="hero-greet">
        <h1>What would make your day easier, {USER_NAME}?</h1>
      </div>

      {/* agent-builder chat (not wired yet) */}
      <div className="chatbox">
        <div className="cb-head"><span className="spark"><Spark /></span> Build an agent</div>
        <textarea
          rows={2}
          placeholder="Describe an agent you want to build — e.g. “an agent that answers shipping questions from my policies”"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
        />
        <div className="cb-foot">
          <button className="cb-send" disabled={!text.trim()} onClick={submit} aria-label="Send"><Send /></button>
        </div>
      </div>

      {noted ? (
        <div className="cb-note">
          <span style={{ color: 'var(--gold-deep)', flex: 'none' }}><Spark /></span>
          <span>Building agents from a prompt is coming soon. For now, deploy a prebuilt agent below — the <b>Shopping</b> and <b>Support</b> agents are ready today.</span>
        </div>
      ) : (
        <p className="cb-hint">Describe it and Finch will build it — or start from a prebuilt agent below.</p>
      )}

      {/* prebuilt agents */}
      <div className="sec-row">
        <h3>Prebuilt agents</h3>
        <span className="muted">Ready to deploy</span>
      </div>
      <div className="agrid">
        {AGENTS.map((a) => (
          <AgentCard key={a.id} agent={a} active={isActive(a.id)} onSetup={onSetup} />
        ))}
      </div>
    </div>
  )
}
