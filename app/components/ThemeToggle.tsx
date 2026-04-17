'use client'
import { useTheme } from './ThemeProvider'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()

  const activeStyle: React.CSSProperties = {
    background: 'var(--omen-accent)',
    color: 'var(--omen-bg)',
    border: '1px solid var(--omen-accent)',
  }

  const inactiveStyle: React.CSSProperties = {
    background: 'transparent',
    color: 'var(--omen-muted)',
    border: '1px solid var(--omen-border)',
  }

  const baseStyle: React.CSSProperties = {
    fontFamily: 'var(--font-ibm-plex-mono), ui-monospace, monospace',
    fontSize: '10px',
    letterSpacing: '0.1em',
    padding: '5px 10px',
    cursor: 'pointer',
    flex: 1,
    textAlign: 'center',
  }

  return (
    <div style={{ display: 'flex', gap: '4px', padding: '12px 16px 0' }}>
      <button
        onClick={() => theme === 'light' && toggle()}
        style={{ ...baseStyle, ...(theme === 'dark' ? activeStyle : inactiveStyle) }}
        aria-pressed={theme === 'dark'}
      >
        [ DARK ]
      </button>
      <button
        onClick={() => theme === 'dark' && toggle()}
        style={{ ...baseStyle, ...(theme === 'light' ? activeStyle : inactiveStyle) }}
        aria-pressed={theme === 'light'}
      >
        [ LIGHT ]
      </button>
    </div>
  )
}
