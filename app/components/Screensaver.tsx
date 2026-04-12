'use client'
import { useState, useEffect, useCallback } from 'react'

export default function Screensaver() {
  const [active, setActive] = useState(false)
  const [eyeOpen, setEyeOpen] = useState(true)

  const resetTimer = useCallback(() => {
    setActive(false)
  }, [])

  useEffect(() => {
    let idleTimer: NodeJS.Timeout

    const startTimer = () => {
      clearTimeout(idleTimer)
      idleTimer = setTimeout(() => setActive(true), 7 * 60 * 1000)
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, () => { resetTimer(); startTimer() }))
    startTimer()

    return () => {
      clearTimeout(idleTimer)
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [resetTimer])

  useEffect(() => {
    if (!active) return
    const blink = setInterval(() => {
      setEyeOpen(false)
      setTimeout(() => setEyeOpen(true), 200)
    }, 3000)
    return () => clearInterval(blink)
  }, [active])

  if (!active) return null

  return (
    <div
      onClick={resetTimer}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#1C1C1E',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      <svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        style={{ transition: 'opacity 0.15s ease', opacity: eyeOpen ? 1 : 0 }}
      >
        {/* Outer rings */}
        <circle cx="100" cy="100" r="95" fill="none" stroke="rgba(176,176,176,0.15)" strokeWidth="1"/>
        <circle cx="100" cy="100" r="75" fill="none" stroke="rgba(176,176,176,0.2)" strokeWidth="1"/>
        {/* Eye shape */}
        <path d="M20,100 Q100,40 180,100 Q100,160 20,100 Z" fill="none" stroke="rgba(176,176,176,0.6)" strokeWidth="1.5"/>
        {/* Iris */}
        <circle cx="100" cy="100" r="28" fill="none" stroke="rgba(176,176,176,0.5)" strokeWidth="1"/>
        {/* Pupil */}
        <circle cx="100" cy="100" r="10" fill="rgba(176,176,176,0.3)"/>
        <circle cx="100" cy="100" r="4" fill="#B0B0B0"/>
        {/* Grid lines on iris */}
        <line x1="72" y1="100" x2="128" y2="100" stroke="rgba(176,176,176,0.2)" strokeWidth="0.5"/>
        <line x1="100" y1="72" x2="100" y2="128" stroke="rgba(176,176,176,0.2)" strokeWidth="0.5"/>
        <ellipse cx="100" cy="100" rx="28" ry="14" fill="none" stroke="rgba(176,176,176,0.15)" strokeWidth="0.5"/>
      </svg>
    </div>
  )
}
