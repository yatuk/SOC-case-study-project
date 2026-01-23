import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  username: string
  role: string
  fullName: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (username: string, password: string) => boolean
  logout: () => void
}

// Demo credentials
const DEMO_USERS = {
  analyst: { password: 'analyst123', fullName: 'Security Analyst', role: 'Analyst' },
  admin: { password: 'admin123', fullName: 'SOC Manager', role: 'Manager' },
  demo: { password: 'demo', fullName: 'Demo User', role: 'Analyst' },
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (username: string, password: string) => {
        const userKey = username.toLowerCase() as keyof typeof DEMO_USERS
        const userConfig = DEMO_USERS[userKey]
        
        if (userConfig && userConfig.password === password) {
          const user: User = {
            username,
            fullName: userConfig.fullName,
            role: userConfig.role,
          }
          set({ user, isAuthenticated: true })
          return true
        }
        return false
      },
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'soc-auth',
    }
  )
)
