import { useEffect } from 'react'
import { useSettingsStore } from '@/store'

export function useTheme() {
  const { settings, updateSetting } = useSettingsStore()

  useEffect(() => {
    const root = document.documentElement
    
    if (settings.theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', systemDark)
      root.classList.toggle('light', !systemDark)
    } else {
      root.classList.toggle('dark', settings.theme === 'dark')
      root.classList.toggle('light', settings.theme === 'light')
    }
  }, [settings.theme])

  const setTheme = (theme: 'dark' | 'light' | 'system') => {
    updateSetting('theme', theme)
  }

  const toggleTheme = () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }

  return {
    theme: settings.theme,
    setTheme,
    toggleTheme,
    isDark: settings.theme === 'dark' || 
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches),
  }
}
