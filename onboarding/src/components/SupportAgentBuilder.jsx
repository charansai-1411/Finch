import { useEffect, useRef, useState } from 'react'
import IndexingStep from './IndexingStep.jsx'
import { ingestDocs, supportSnippetFor, supportPreviewSrc, SUPPORT_API } from '../api.js'
import { SUPPORT_PROMPT, SUPPORT_FLOW } from '../data.js'
import { Life, Sliders, Flow, Plug, Rocket, File, Upload, Trash, ArrowLeft, ArrowRight, Check } from '../icons.jsx'

const SECTIONS = [
  { id: 'prompt', label: 'Prompt', Icon: Sliders },
  { id: 'flow', label: 'Flow', Icon: Flow },
  { id: 'connect', label: 'Documents', Icon: Plug },
  { id: 'deploy', label: 'Deploy', Icon: Rocket },
]

const INDEX_PHASES = [
  { key: 'read', label: 'Reading your documents' },
  { key: 'embed', label: 'Teaching Finch every passage' },
  { key: 'build', label: 'Building your support agent' },
]

// --- client-side PDF text extraction (pdf.js from CDN, loaded on demand) ---
let pdfjsPromise
function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib)
  if (pdfjsPromise) return pdfjsPromise
  pdfjsPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    s.onload = () => {
      try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js' } catch { /* ignore */ }
      resolve(window.pdfjsLib)
    }
    s.onerror = () => reject(new Error('pdf.js failed to load'))
    document.head.appendChild(s)
  })
  return pdfjsPromise
}
async function extractPdf(file) {
  const lib = await loadPdfJs()
  const buf = await file.arrayBuffer()
  const pdf = await lib.getDocument({ data: buf }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const tc = await page.getTextContent()
    pages.push(tc.items.map((it) => it.str).join(' '))
  }
  return pages.join('\n\n')
}

/* -- inline docs connector form (real ingest) -- */
function DocsForm({ onIngested }) {
  const [name, setName] = useState('')
  const [docs, setDocs] = useState([])   // {name, text, chars, error, reading}
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef(null)

  const addFiles = (fileList) => {
    ;[...fileList].forEach((file) => {
      const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf'
      const entry = { name: file.name, text: '', chars: 0, error: false, reading: true }
      setDocs((d) => [...d, entry])
      const done = (patch) => setDocs((d) => d.map((x) => (x === entry ? { ...x, ...patch, reading: false } : x)))
      const p = isPdf ? extractPdf(file) : file.text()
      p.then((text) => done({ text: text || '', chars: (text || '').length, error: !(text || '').trim() }))
       .catch(() => done({ error: true }))
    })
  }

  const remove = (i) => setDocs((d) => d.filter((_, j) => j !== i))
  const usable = docs.filter((d) => !d.error && !d.reading && d.text.trim())
  const valid = name.trim() && usable.length > 0

  const build = async () => {
    if (!valid || busy) return
    setBusy(true); setErr('')
    try {
      const res = await ingestDocs({ businessName: name.trim(), docs: usable })
      onIngested(res)
    } catch (e) {
      setErr(e.message || 'Ingest failed')
      setBusy(false)
    }
  }

  return (
    <div className="conn-form">
      <div className="field" style={{ marginTop: 0 }}>
        <label>Store name</label>
        <input className="input" placeholder="e.g. Northwind Outfitters" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="field">
        <label>Help documents</label>
        <button className="drop" style={{ marginTop: '0.4rem', width: '100%' }} onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".pdf,.md,.markdown,.txt,text/plain" hidden multiple
            onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
          <div className="ic"><Upload /></div>
          <b>Drop PDFs, Markdown or text</b>
          <div className="hint">policies · FAQs · guides — text is read in your browser</div>
        </button>
      </div>

      {docs.length > 0 && (
        <div className="doclist">
          {docs.map((d, i) => (
            <div className={'docrow' + (d.error ? ' err' : '')} key={i}>
              <span className="dic"><File /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="dn">{d.name}</div>
                <div className="dm">{d.reading ? 'reading…' : d.error ? 'could not read this file' : `${d.chars.toLocaleString()} characters`}</div>
              </div>
              <button className="drm" onClick={() => remove(i)} aria-label="Remove"><Trash /></button>
            </div>
          ))}
        </div>
      )}

      {err && <p className="deploy-note" style={{ color: '#C6503A' }}>Couldn’t reach the backend ({err}). Is it running at {SUPPORT_API}?</p>}

      <div style={{ textAlign: 'right', marginTop: '0.8rem' }}>
        <button className="btn btn-primary" disabled={!valid || busy} onClick={build}>
          {busy ? 'Indexing…' : `Build knowledge base${usable.length ? ` · ${usable.length} doc${usable.length > 1 ? 's' : ''}` : ''}`}
        </button>
      </div>
    </div>
  )
}

export default function SupportAgentBuilder({ existing, onBack, onActivated, onClose }) {
  const [section, setSection] = useState(existing ? 'deploy' : 'prompt')
  const [prompt, setPrompt] = useState(SUPPORT_PROMPT)
  const [tools, setTools] = useState({ cite: true })
  const [kb, setKb] = useState(existing || null)          // {businessName, tenantId, embedKey, docCount, chunkCount}
  const [phase, setPhase] = useState(existing ? 'deployed' : 'config')
  const [copied, setCopied] = useState(false)
  const [previewing, setPreviewing] = useState(false)

  const promptCustom = prompt.trim() !== SUPPORT_PROMPT.trim()
  const toolCount = 3 + (tools.cite ? 1 : 0)
  const line = supportSnippetFor(kb?.embedKey || 'pk_live_xxxx')
  const copy = () => { navigator.clipboard?.writeText(line); setCopied(true); setTimeout(() => setCopied(false), 1500) }

  // live widget preview on this page (uses the REAL agent key)
  const mountWidget = () => {
    if (!kb?.embedKey) return
    const old = document.getElementById('finch-support-root'); if (old) old.remove()
    try { window.__finchSupportLoaded = false } catch { /* ignore */ }
    const s = document.createElement('script')
    s.src = supportPreviewSrc(kb.embedKey, (kb.businessName || 'Support') + ' Help')
    s.defer = true; s.dataset.finchPreview = '1'
    document.body.appendChild(s)
    setPreviewing(true)
  }
  const unmountWidget = () => {
    const old = document.getElementById('finch-support-root'); if (old) old.remove()
    document.querySelectorAll('script[data-finch-preview]').forEach((s) => s.remove())
    try { window.__finchSupportLoaded = false } catch { /* ignore */ }
    setPreviewing(false)
  }
  // clean the floating widget up when the builder unmounts
  useEffect(() => unmountWidget, []) // eslint-disable-line react-hooks/exhaustive-deps

  const done = { prompt: true, flow: true, connect: !!kb, deploy: phase === 'deployed' }
  const meta = {
    prompt: promptCustom ? 'Customised' : 'Default',
    flow: `${toolCount} steps`,
    connect: kb ? `${kb.docCount} docs · ${kb.chunkCount} passages` : 'Not connected',
    deploy: phase === 'deployed' ? 'Live' : kb ? 'Ready' : 'Locked',
  }

  return (
    <div className="setup-wrap view-enter" style={{ maxWidth: 960 }}>
      <button className="setup-back" onClick={onBack}><ArrowLeft /> Back to agents</button>
      <div className="builder-head">
        <span className="ic"><Life /></span>
        <h2 className="title" style={{ fontSize: '1.4rem' }}>Configure the Support Agent</h2>
      </div>
      <p className="builder-sub">Upload the docs your customers ask about — Finch answers only from them, and cites its source. Everything else is optional.</p>

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
            <IndexingStep result={kb} total={kb?.chunkCount || 40} unit="passages" phases={INDEX_PHASES}
              onDone={() => { onActivated(kb); setPhase('deployed') }} />
          ) : (
            <div className="astep-panel view-enter" key={section}>
              {section === 'prompt' && (
                <>
                  <h3 className="ph">System prompt</h3>
                  <p className="pdesc">How the assistant speaks and its guardrails. The defaults keep it grounded and honest — edit only for a specific tone or policy.</p>
                  <textarea className="prompt-area" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                  <div className="prompt-foot">
                    <span className="cnt">{prompt.length} chars · {promptCustom ? 'customised' : 'default'}</span>
                    <button className="reset-link" disabled={!promptCustom} onClick={() => setPrompt(SUPPORT_PROMPT)}>Reset to default</button>
                  </div>
                  <div className="panel-nav"><span className="spacer" /><button className="btn btn-ghost" onClick={() => setSection('flow')}>Continue <ArrowRight /></button></div>
                </>
              )}

              {section === 'flow' && (
                <>
                  <h3 className="ph">Flow</h3>
                  <p className="pdesc">What the agent does each turn. Retrieval and grounding are fixed; toggle whether it cites the source document.</p>
                  <div className="flow-steps">
                    {SUPPORT_FLOW.map((s, i) => {
                      const toggleable = !s.core
                      const on = !toggleable || (s.key === 'cite' ? tools.cite : true)
                      return (
                        <div key={s.key}>
                          <div className={'flow-step' + (on ? '' : ' off')}>
                            <span className="dot">{i + 1}</span>
                            <div className="fs-body"><div className="fs-name">{s.name}</div>{s.tool && <div className="fs-tool">{s.tool}()</div>}</div>
                            {s.core
                              ? <span className="fs-core">Core</span>
                              : <button className={'tog' + (on ? '' : ' off')} aria-label={'toggle ' + s.name} onClick={() => setTools((t) => ({ ...t, [s.key]: !t[s.key] }))}><span className="sw" /></button>}
                          </div>
                          {i < SUPPORT_FLOW.length - 1 && <div className="flow-line" />}
                        </div>
                      )
                    })}
                  </div>
                  <div className="panel-nav"><span className="spacer" /><button className="btn btn-ghost" onClick={() => setSection('connect')}>Continue <ArrowRight /></button></div>
                </>
              )}

              {section === 'connect' && (
                <>
                  <h3 className="ph">Documents</h3>
                  <p className="pdesc">The knowledge the agent answers from — required. PDFs, Markdown, and text are supported.</p>
                  <div className="conn-row">
                    <div className="cic"><File /></div>
                    <div style={{ flex: 1 }}><div className="cn">Help documents</div><div className="cs">Policies, FAQs, guides · required</div></div>
                    {kb && <span className="conn-connected"><Check /> {kb.docCount} docs · {kb.chunkCount} passages</span>}
                  </div>
                  {!kb
                    ? <DocsForm onIngested={(res) => setKb(res)} />
                    : <div className="panel-nav"><span className="spacer" /><button className="btn btn-primary" onClick={() => setSection('deploy')}>Continue <ArrowRight /></button></div>}
                </>
              )}

              {section === 'deploy' && phase === 'deployed' && (
                <>
                  <span className="deployed-badge"><i /> Deployed</span>
                  <h3 className="ph">You're live</h3>
                  <p className="pdesc">Paste this one line into your site's HTML — a chat bubble appears in the corner and answers from your docs.</p>
                  <div className="dp-snippet"><button className={'cp' + (copied ? ' done' : '')} onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button><code>{line}</code></div>
                  <div className="panel-nav">
                    {previewing
                      ? <button className="btn btn-ghost" onClick={unmountWidget}>Hide preview</button>
                      : <button className="btn btn-ghost" onClick={mountWidget}>Test your agent here ↘</button>}
                    <button className="btn btn-primary" onClick={onClose}>Go to Monitor</button>
                  </div>
                  {previewing && <p className="deploy-note">Your live widget is in the bottom-right — ask it something from your docs.</p>}
                </>
              )}

              {section === 'deploy' && phase !== 'deployed' && (
                <>
                  <h3 className="ph">Deploy</h3>
                  <p className="pdesc">Deploy with your changes — or the defaults. You can edit any step later.</p>
                  <div className={'check-row done'}><span className="ck"><Check /></span> System prompt <span className="cmeta">{promptCustom ? 'custom' : 'default'}</span></div>
                  <div className={'check-row done'}><span className="ck"><Check /></span> Flow &amp; grounding <span className="cmeta">{toolCount} steps</span></div>
                  <div className={'check-row' + (kb ? ' done' : '')}><span className="ck"><Check /></span> Documents <span className="cmeta">{kb ? `${kb.docCount} docs · ${kb.chunkCount} passages` : 'not connected'}</span></div>
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.2rem' }} disabled={!kb} onClick={() => setPhase('deploying')}>Deploy agent</button>
                  {!kb && <p className="deploy-note">You need documents first. <button className="reset-link" onClick={() => setSection('connect')}>Add them →</button></p>}
                  {kb && <p className="deploy-note">No changes needed — you can deploy the defaults.</p>}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
