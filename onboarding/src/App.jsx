import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import FinchGlyph from './finchGlyph.jsx'
import Stepper from './components/Stepper.jsx'
import ConnectStep from './components/ConnectStep.jsx'
import IndexingStep from './components/IndexingStep.jsx'
import LiveStep from './components/LiveStep.jsx'

const STEPS = ['Connect', 'Index', 'Go live']

// Apple-style, critically damped — no overshoot on an occasional transition.
const spring = { type: 'spring', bounce: 0, duration: 0.4 }
const variants = {
  enter: { opacity: 0, y: 14 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -14 },
}

export default function App() {
  const [step, setStep] = useState(0) // 0 connect, 1 indexing, 2 live
  const [tenant, setTenant] = useState(null) // { tenantId, embedKey, productCount, businessName }
  const [pending, setPending] = useState(null) // result waiting for the indexing animation

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="mark"><FinchGlyph /></span> Finch
        </div>
        <a className="help" href="#" onClick={(e) => e.preventDefault()}>Need help?</a>
      </header>

      <main className="main">
        <div className="wizard">
          <Stepper steps={STEPS} current={step} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              variants={variants}
              initial="enter" animate="center" exit="exit"
              transition={spring}
            >
              {step === 0 && (
                <ConnectStep
                  onDone={(result) => { setPending(result); setStep(1) }}
                />
              )}
              {step === 1 && (
                <IndexingStep
                  result={pending}
                  onDone={() => { setTenant(pending); setStep(2) }}
                />
              )}
              {step === 2 && <LiveStep tenant={tenant} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <span className="mock-tag">● Demo mode — mock API (no AWS yet)</span>
    </div>
  )
}
