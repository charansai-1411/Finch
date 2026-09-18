import { useRef, useState } from 'react'
import IndexingStep from './IndexingStep.jsx'
import { ingest, countCsvProducts, snippetFor } from '../api.js'
import { DEFAULT_PROMPT, FLOW, CONNECTORS } from '../data.js'
import { ICONS, Cart, Sliders, Flow, Plug, Rocket, Database, Upload, ArrowLeft, ArrowRight, Check } from '../icons.jsx'

const SECTIONS = [
  { id: 'prompt', label: 'Prompt', Icon: Sliders },
  { id: 'flow', label: 'Flow', Icon: Flow },
  { id: 'connect', label: 'Connect', Icon: Plug },
  { id: 'deploy', label: 'Deploy', Icon: Rocket },
]

/* -- inline catalog connector form -- */
function CatalogForm({ onConnected }) {
  const [name, setName] = useState('')
  const [source, setSource] = useState('csv')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)
  const [count, setCount] = useState(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const readFile = (f) => {
    if (!f) return
    setFile(f)
    const r = new FileReader()
    r.onload = () => setCount(countCsvProducts(String(r.result || '')))
    r.readAsText(f)
  }
  const valid = name.trim() && (source === 'csv' ? file : /\./.test(url))
  const connect = async () => {
    if (!valid || busy) return
    setBusy(true)
    const res = await ingest({ businessName: name.trim(), source, productCount: source === 'csv' ? count : null })
    onConnected({ businessName: name.trim(), productCount: res.productCount, tenantId: res.tenantId, embedKey: res.embedKey })
  }

  return (
    <div className="conn-form">
      <div className="field" style={{ marginTop: 0 }}>
        <label>Store name</label>
        <input className="input" placeholder="e.g. Trailblaze Footwear" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <div className="seg">
          <button className={source === 'csv' ? 'on' : ''} onClick={() => setSource('csv')}>Upload CSV</button>
          <button className={source === 'url' ? 'on' : ''} onClick={() => setSource('url')}>Paste store URL</button>
        </div>
        {source === 'csv' ? (
          <button className="drop" style={{ marginTop: '0.6rem', width: '100%' }} onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept=".csv" hidden onChange={(e) => readFile(e.target.files?.[0])} />
            <div className="ic"><Upload /></div>
            {file ? <><div className="file">{file.name}</div><div className="hint">{count != null ? `${count} products` : 'reading…'}</div></>
              : <><b>Drop your CSV</b><div className="hint">or click to browse</div></>}
          </button>
        ) : (
          <input className="input" style={{ marginTop: '0.6rem' }} placeholder="https://your-store.com" value={url} onChange={(e) => setUrl(e.target.value)} />
        )}
      </div>
      <div style={{ textAlign: 'right', marginTop: '0.8rem' }}>
        <button className="btn btn-primary" disabled={!valid || busy} onClick={connect}>{busy ? 'Connecting…' : 'Connect catalog'}</button>
      </div>
    </div>
  )
}

export default function AgentBuilder({ existing, onBack, onActivated, onClose }) {
  const [section, setSection] = useState(existing ? 'deploy' : 'prompt')
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [tools, setTools] = useState({ stock: true, cart: true })
  const [catalog, setCatalog] = useState(existing || null)
  const [phase, setPhase] = useState(existing ? 'deployed' : 'config')
  const [copied, setCopied] = useState(false)

  const promptCustom = prompt.trim() !== DEFAULT_PROMPT.trim()
  const toolCount = 1 + (tools.stock ? 1 : 0) + (tools.cart ? 1 : 0)
  const line = snippetFor(catalog?.embedKey || 'pk_live_xxxx')
  const copy = () => { navigator.clipboard?.writeText(line); setCopied(true); setTimeout(() => setCopied(false), 1500) }

  const done = { prompt: true, flow: true, connect: !!catalog, deploy: phase === 'deployed' }
  const meta = {
    prompt: promptCustom ? 'Customised' : 'Default',
    flow: `${toolCount} tools`,
    connect: catalog ? `${(catalog.productCount || 0).toLocaleString()} products` : 'Not connected',
    deploy: phase === 'deployed' ? 'Live' : catalog ? 'Ready' : 'Locked',
  }

  return (
    <div className="setup-wrap view-enter" style={{ maxWidth: 960 }}>
      <button className="setup-back" onClick={onBack}><ArrowLeft /> Back to agents</button>
      <div className="builder-head">
        <span className="ic"><Cart /></span>
        <h2 className="title" style={{ fontSize: '1.4rem' }}>Configure the Shopping Agent</h2>
      </div>
      <p className="builder-sub">Pick a step on the left. Everything's optional — keep the defaults and jump straight to Deploy if you like.</p>

      <div className="abuild">
        {/* -------- left rail -------- */}
        <nav className="astep-rail">
          {SECTIONS.map(({ id, label, Icon }) => (
            <button key={id} className={'astep' + (section === id ? ' on' : '')} onClick={() => setSection(id)}>
              <span className="aic"><Icon /></span>
              <span className="albl"><b>{label}</b><small>{meta[id]}</small></span>
              <span className={'ast' + (done[id] ? ' done' : '')}>{done[id] && <Check />}</span>
            </button>
          ))}
        </nav>

        {/* -------- main panel -------- */}
        <div className="astep-main">
          {section === 'deploy' && phase === 'deploying' ? (
            <IndexingStep result={catalog} onDone={() => { onActivated(catalog); setPhase('deployed') }} />
          ) : (
            <div className="astep-panel view-enter" key={section}>
              {section === 'prompt' && (
                <>
                  <h3 className="ph">System prompt</h3>
                  <p className="pdesc">The agent's persona and rules. The defaults work out of the box — edit only if you want a specific tone or policy.</p>
                  <textarea className="prompt-area" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                  <div className="prompt-foot">
                    <span className="cnt">{prompt.length} chars · {promptCustom ? 'customised' : 'default'}</span>
                    <button className="reset-link" disabled={!promptCustom} onClick={() => setPrompt(DEFAULT_PROMPT)}>Reset to default</button>
                  </div>
                  <div className="panel-nav"><span className="spacer" /><button className="btn btn-ghost" onClick={() => setSection('flow')}>Continue <ArrowRight /></button></div>
                </>
              )}

              {section === 'flow' && (
                <>
                  <h3 className="ph">Flow</h3>
                  <p className="pdesc">What the agent does each turn. Core steps are fixed; toggle the optional tools it's allowed to use.</p>
                  <div className="flow-steps">
                    {FLOW.map((s, i) => {
                      const toggleable = s.tool && !s.core
                      const on = !toggleable || (s.key === 'stock' ? tools.stock : s.key === 'cart' ? tools.cart : true)
                      return (
                        <div key={s.key}>
                          <div className={'flow-step' + (on ? '' : ' off')}>
                            <span className="dot">{i + 1}</span>
                            <div className="fs-body"><div className="fs-name">{s.name}</div>{s.tool && <div className="fs-tool">{s.tool}()</div>}</div>
                            {s.core
                              ? <span className="fs-core">Core</span>
                              : <button className={'tog' + (on ? '' : ' off')} aria-label={'toggle ' + s.name} onClick={() => setTools((t) => ({ ...t, [s.key]: !t[s.key] }))}><span className="sw" /></button>}
                          </div>
                          {i < FLOW.length - 1 && <div className="flow-line" />}
                        </div>
                      )
                    })}
                  </div>
                  <div className="panel-nav"><span className="spacer" /><button className="btn btn-ghost" onClick={() => setSection('connect')}>Continue <ArrowRight /></button></div>
                </>
              )}

              {section === 'connect' && (
                <>
                  <h3 className="ph">Connectors</h3>
                  <p className="pdesc">Where the agent gets data and where it can act. Catalog is required — the rest are coming soon.</p>
                  <div className="conn-row">
                    <div className="cic"><Database /></div>
                    <div style={{ flex: 1 }}><div className="cn">Catalog</div><div className="cs">Your products · required</div></div>
                    {catalog && <span className="conn-connected"><Check /> {(catalog.productCount || 0).toLocaleString()} products</span>}
                  </div>
                  {!catalog && <CatalogForm onConnected={(c) => setCatalog(c)} />}
                  {CONNECTORS.map((c) => {
                    const Icon = ICONS[c.icon]
                    return (
                      <div className="conn-row" key={c.id}>
                        <div className="cic">{Icon && <Icon />}</div>
                        <div style={{ flex: 1 }}><div className="cn">{c.name}</div><div className="cs">{c.desc}</div></div>
                        <button className="btn btn-ghost cbtn" disabled>Coming soon</button>
                      </div>
                    )
                  })}
                  <div className="panel-nav"><span className="spacer" /><button className="btn btn-primary" onClick={() => setSection('deploy')}>Continue <ArrowRight /></button></div>
                </>
              )}

              {section === 'deploy' && phase === 'deployed' && (
                <>
                  <span className="deployed-badge"><i /> Deployed</span>
                  <h3 className="ph">You're live</h3>
                  <p className="pdesc">Paste this one line into your site's HTML — the chat bubble appears instantly.</p>
                  <div className="dp-snippet"><button className={'cp' + (copied ? ' done' : '')} onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button><code>{line}</code></div>
                  <div className="panel-nav">
                    <button className="btn btn-ghost" onClick={() => window.open('http://localhost:5600/demo/', '_blank')}>Open demo store</button>
                    <button className="btn btn-primary" onClick={onClose}>Go to Monitor</button>
                  </div>
                </>
              )}

              {section === 'deploy' && phase !== 'deployed' && (
                <>
                  <h3 className="ph">Deploy</h3>
                  <p className="pdesc">Deploy with your changes — or the defaults. You can edit any step later.</p>
                  <div className={'check-row done'}><span className="ck"><Check /></span> System prompt <span className="cmeta">{promptCustom ? 'custom' : 'default'}</span></div>
                  <div className={'check-row done'}><span className="ck"><Check /></span> Flow &amp; tools <span className="cmeta">{toolCount} enabled</span></div>
                  <div className={'check-row' + (catalog ? ' done' : '')}><span className="ck"><Check /></span> Catalog <span className="cmeta">{catalog ? `${(catalog.productCount || 0).toLocaleString()} products` : 'not connected'}</span></div>
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.2rem' }} disabled={!catalog} onClick={() => setPhase('deploying')}>Deploy agent</button>
                  {!catalog && <p className="deploy-note">You need a catalog first. <button className="reset-link" onClick={() => setSection('connect')}>Connect it →</button></p>}
                  {catalog && <p className="deploy-note">No changes needed — you can deploy the defaults.</p>}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
