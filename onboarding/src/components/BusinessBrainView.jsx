import { useRef, useState } from 'react'
import FinchGlyph from '../finchGlyph.jsx'
import { Upload, File, Globe, Text, Trash } from '../icons.jsx'

const TABS = [
  { id: 'pdf', label: 'Upload file', Icon: Upload },
  { id: 'web', label: 'Add website', Icon: Globe },
  { id: 'text', label: 'Paste text', Icon: Text },
]

export default function BusinessBrainView() {
  const [tab, setTab] = useState('pdf')
  const [sources, setSources] = useState([])
  const [hot, setHot] = useState(false)
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const fileRef = useRef(null)

  const add = (s) => setSources((prev) => [{ id: Date.now() + Math.random(), ...s }, ...prev])
  const remove = (id) => setSources((prev) => prev.filter((s) => s.id !== id))

  const onFiles = (files) => {
    Array.from(files || []).forEach((f) =>
      add({ name: f.name, meta: (f.size / 1024).toFixed(0) + ' KB · document', kind: 'file' }))
  }

  return (
    <div className="view-enter">
      <div className="page-top">
        <div>
          <h2 className="title">Business Brain</h2>
          <p className="lead">Everything Finch knows about your business. Add policies, FAQs, product info and docs — every agent draws from this shared knowledge.</p>
        </div>
      </div>

      <div className="source-tabs">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}><Icon /> {label}</button>
        ))}
      </div>

      {tab === 'pdf' && (
        <div
          className={'drop' + (hot ? ' hot' : '')}
          style={{ marginTop: '1rem' }}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setHot(true) }}
          onDragLeave={() => setHot(false)}
          onDrop={(e) => { e.preventDefault(); setHot(false); onFiles(e.dataTransfer.files) }}
        >
          <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.md,.csv" hidden onChange={(e) => onFiles(e.target.files)} />
          <div className="ic"><Upload /></div>
          <b>Drop files here</b>
          <div className="hint">PDF, DOCX, TXT, Markdown · your policies, FAQs, product sheets</div>
        </div>
      )}
      {tab === 'web' && (
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.6rem' }}>
          <input className="input" placeholder="https://your-store.com/faq" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button className="btn btn-primary" disabled={!/\./.test(url)} onClick={() => { add({ name: url, meta: 'website', kind: 'web' }); setUrl('') }}>Add</button>
        </div>
      )}
      {tab === 'text' && (
        <div style={{ marginTop: '1rem' }}>
          <textarea className="input" rows={4} style={{ resize: 'vertical' }} placeholder="Paste a policy, an FAQ, brand voice notes…" value={text} onChange={(e) => setText(e.target.value)} />
          <div style={{ marginTop: '0.6rem', textAlign: 'right' }}>
            <button className="btn btn-primary" disabled={!text.trim()} onClick={() => { add({ name: text.slice(0, 40) + (text.length > 40 ? '…' : ''), meta: text.length + ' chars · note', kind: 'text' }); setText('') }}>Add to brain</button>
          </div>
        </div>
      )}

      {sources.length === 0 ? (
        <div className="empty">
          <div className="fig"><FinchGlyph /></div>
          <h4>Your Business Brain is empty</h4>
          <p>Add your first source above. The more Finch knows, the sharper every agent gets.</p>
        </div>
      ) : (
        <div className="sources">
          {sources.map((s) => (
            <div className="source-item" key={s.id}>
              <div className="sic">{s.kind === 'web' ? <Globe /> : s.kind === 'text' ? <Text /> : <File />}</div>
              <div><div className="sn">{s.name}</div><div className="sm">{s.meta}</div></div>
              <span className="st">Indexed</span>
              <button className="rm" aria-label="Remove" onClick={() => remove(s.id)}><Trash /></button>
            </div>
          ))}
        </div>
      )}

      <p className="foot-note" style={{ textAlign: 'left', marginTop: '1.6rem' }}>Demo mode — sources are listed but not processed yet.</p>
    </div>
  )
}
