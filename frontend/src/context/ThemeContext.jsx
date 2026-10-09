/**
 * Theme context - manages dark/light mode toggle.
 * Persists preference to localStorage.
 */
import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      const stored = localStorage.getItem('theme')
      return stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light')
    } catch {
      // Theme still applies for this session when storage is unavailable.
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#080f1b' : '#f8fafc')
  }, [isDark])

  const toggle = () => setIsDark(prev => !prev)

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
