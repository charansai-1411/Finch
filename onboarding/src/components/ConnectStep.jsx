import { useRef, useState } from 'react'
import { ingest, countCsvProducts } from '../api.js'

export default function ConnectStep({ onDone }) {
  const [name, setName] = useState('')
  const [source, setSource] = useState('csv') // 'csv' | 'url'
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)
  const [productCount, setProductCount] = useState(null)
  const [hot, setHot] = useState(false)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  const readFile = (f) => {
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = () => setProductCount(countCsvProducts(String(reader.result || '')))
    reader.readAsText(f)
  }

  const onDrop = (e) => {
    e.preventDefault(); setHot(false)
    const f = e.dataTransfer.files?.[0]
    if (f) readFile(f)
  }

  const valid = name.trim() && (source === 'csv' ? file : /\./.test(url))

  const submit = async () => {
    if (!valid || busy) return
    setBusy(true)
    const result = await ingest({
      businessName: name.trim(),
      source,
      productCount: source === 'csv' ? productCount : null,
    })
    onDone(result)
  }

  return (
    <div className="card">
      <h1>Connect your catalog</h1>
      <p className="sub">Finch reads your products so it can recommend the right ones. Upload a CSV or paste your store URL — no schema, no tagging.</p>

      <div className="field">
        <label htmlFor="biz">Store name</label>
        <input id="biz" className="input" placeholder="e.g. Trailblaze Footwear" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="field">
        <label>Where's your catalog?</label>
        <div className="seg" role="tablist">
          <button className={source === 'csv' ? 'on' : ''} onClick={() => setSource('csv')}>Upload CSV</button>
          <button className={source === 'url' ? 'on' : ''} onClick={() => setSource('url')}>Paste store URL</button>
        </div>

        {source === 'csv' ? (
          <div
            className={'drop' + (hot ? ' hot' : '')}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setHot(true) }}
            onDragLeave={() => setHot(false)}
            onDrop={onDrop}
          >
            <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => readFile(e.target.files?.[0])} />
            <div className="ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
            </div>
            {file ? (
              <>
                <div className="file">{file.name}</div>
                <div className="hint">{productCount != null ? `${productCount} products found` : 'reading…'} · click to replace</div>
              </>
            ) : (
              <>
                <b>Drop your CSV here</b>
                <div className="hint">or click to browse · columns: id, name, price, image_url…</div>
              </>
            )}
          </div>
        ) : (
          <input className="input" style={{ marginTop: '0.6rem' }} placeholder="https://your-store.com" value={url} onChange={(e) => setUrl(e.target.value)} />
        )}
      </div>

      <div className="actions">
        <div className="grow" />
        <button className="btn btn-primary" disabled={!valid || busy} onClick={submit}>
          {busy ? 'Connecting…' : 'Connect & index'}
          {!busy && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>}
        </button>
      </div>
    </div>
  )
}
