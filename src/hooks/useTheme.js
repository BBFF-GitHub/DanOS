import { useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage'

export function useTheme() {
  const [theme, setTheme] = useLocalStorage('danos-theme', 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return { theme, toggle }
}
