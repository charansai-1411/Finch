export default function Stepper({ steps, current }) {
  return (
    <div className="stepper">
      {steps.map((label, i) => (
        <div className="s-wrap" key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className={'s ' + (i === current ? 'active' : i < current ? 'done' : '')}>
            <span className="bead">
              {i < current ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              ) : i + 1}
            </span>
            <span className="lbl">{label}</span>
          </div>
          {i < steps.length - 1 && <span className="line" />}
        </div>
      ))}
    </div>
  )
}
