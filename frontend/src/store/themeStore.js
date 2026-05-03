import { create } from 'zustand'

export const useThemeStore = create((set) => {
  const savedTheme = localStorage.getItem('theme') || 'light'
  
  return {
    theme: savedTheme,
    toggleTheme: () => set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', newTheme)
      document.documentElement.setAttribute('data-theme', newTheme)
      return { theme: newTheme }
    }),
    initTheme: () => {
      document.documentElement.setAttribute('data-theme', savedTheme)
    }
  }
})
