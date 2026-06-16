'use client'

import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

function applyTheme(theme: Theme) {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', isDark)
  if (theme === 'system') {
    localStorage.removeItem('theme')
  } else {
    localStorage.setItem('theme', theme)
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    setThemeState(stored ?? 'system')
  }, [])

  function setTheme(next: Theme) {
    setThemeState(next)
    applyTheme(next)
  }

  return { theme, setTheme }
}
