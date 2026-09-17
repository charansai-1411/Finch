import { useState } from 'react'
import { snippetFor } from '../api.js'
import PlatformInstructions from './PlatformInstructions.jsx'

export default function LiveStep({ tenant }) {
  const [copied, setCopied] = useState(false)
  const key = tenant?.embedKey || 'pk_live_xxxxxxxxxxxx'
  const line = snippetFor(key)

  const copy = () => {
    navigator.clipboard?.writeText(line)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="card">
      <span className="success-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        Finch understands {(tenant?.productCount || 0).toLocaleString()} products
      </span>
      <h1 style={{ marginTop: '0.9rem' }}>Paste one line. You're live.</h1>
      <p className="sub">Drop this into your site's HTML and the chat bubble appears. It only works on your domain.</p>

      <div className="keyrow">
        <span className="keychip">store&nbsp;<b>{tenant?.businessName || 'Your store'}</b></span>
        <span className="keychip">key&nbsp;<b>{key}</b></span>
      </div>

      <div className="snippet">
        <button className={'copy' + (copied ? ' done' : '')} onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
        <code>
          <span className="punc">&lt;</span><span className="tag">script</span> <span className="attr">src</span><span className="punc">=</span><span className="str">"https://cdn.finch.app/v.js?key={key}"</span> <span className="attr">defer</span><span className="punc">&gt;&lt;/</span><span className="tag">script</span><span className="punc">&gt;</span>
        </code>
      </div>

      <PlatformInstructions />

      <div className="actions">
        <button className="btn btn-ghost grow" onClick={() => window.open('/demo', '_blank')}>Preview on a demo store</button>
        <button className="btn btn-primary grow" onClick={copy}>{copied ? 'Copied ✓' : 'Copy the line'}</button>
      </div>

      <p className="foot-note">Not on your site yet? Send this line to whoever manages it — that's the whole job.</p>
    </div>
  )
}
