import { useEffect, useRef, useState } from 'react'
import FinchGlyph from '../finchGlyph.jsx'

const PHASES = [
  { key: 'read', label: 'Reading your catalog' },
  { key: 'embed', label: 'Teaching Finch every product' },
  { key: 'build', label: 'Building your agent' },
]

export default function IndexingStep({ result, onDone, phases = PHASES, unit = 'products', total: totalProp }) {
  const total = totalProp ?? result?.productCount ?? 300
  const [phase, setPhase] = useState(0)
  const [pct, setPct] = useState(6)
  const [count, setCount] = useState(0)
  const doneRef = useRef(false)

  useEffect(() => {
    let raf
    const start = performance.now()
    const DURATION = 3200 // mock indexing time
    const tick = (now) => {
      const t = Math.min(1, (now - start) / DURATION)
      const eased = 1 - Math.pow(1 - t, 2)
      setPct(6 + eased * 94)
      setCount(Math.round(eased * total))
      setPhase(t < 0.4 ? 0 : t < 0.8 ? 1 : 2)
      // (phase index maps into the provided `phases` array)
      if (t < 1) { raf = requestAnimationFrame(tick) }
      else if (!doneRef.current) { doneRef.current = true; setTimeout(onDone, 550) }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="card indexing">
      <div className="finch-load"><FinchGlyph /></div>
      <div className="progress"><div className="fill" style={{ width: pct + '%' }} /></div>
      <div className="phase">
        <span className="count">{count.toLocaleString()}</span> of {total.toLocaleString()} {unit} · {phases[phase].label}…
      </div>

      <div className="phaselist">
        {phases.map((p, i) => {
          const state = i < phase ? 'done' : i === phase ? 'active' : ''
          return (
            <div className={'row ' + state} key={p.key}>
              <span className="tick">
                {i < phase ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                ) : i === phase ? <span className="spin" /> : null}
              </span>
              {p.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}
