import { createContext } from 'react'

export const DEFAULT_ACCENT = '#4488ff'

// Convierte '#4488ff' → '68,136,255'
export function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

export const CoachThemeContext = createContext({
  gradColors:   ['#0a0a2e', '#050518', '#0d0d25'],
  accentColor:  DEFAULT_ACCENT,
  setTema:      () => {},
})
