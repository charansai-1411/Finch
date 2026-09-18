import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Stepper from './Stepper.jsx'
import ConnectStep from './ConnectStep.jsx'
import IndexingStep from './IndexingStep.jsx'
import LiveStep from './LiveStep.jsx'
import { ArrowLeft } from '../icons.jsx'

const STEPS = ['Connect', 'Index', 'Go live']
const spring = { type: 'spring', bounce: 0, duration: 0.4 } // Apple critically-damped
const variants = { enter: { opacity: 0, y: 14 }, center: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -14 } }

export default function ShoppingAgentSetup({ existing, onBack, onDone }) {
  const [step, setStep] = useState(existing ? 2 : 0)
  const [tenant, setTenant] = useState(existing || null)
  const [pending, setPending] = useState(null)

  return (
    <div className="setup-wrap view-enter">
      <button className="setup-back" onClick={onBack}><ArrowLeft /> Back to agents</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0.2rem 0 0.4rem' }}>
        <h2 className="title" style={{ fontSize: '1.4rem' }}>Set up the Shopping Agent</h2>
      </div>
      <Stepper steps={STEPS} current={step} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} variants={variants} initial="enter" animate="center" exit="exit" transition={spring}>
          {step === 0 && <ConnectStep onDone={(r) => { setPending(r); setStep(1) }} />}
          {step === 1 && <IndexingStep result={pending} onDone={() => { setTenant(pending); setStep(2) }} />}
          {step === 2 && (
            <>
              <LiveStep tenant={tenant} />
              <div className="actions" style={{ justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={() => onDone(tenant)}>Finish — go to Monitor</button>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
