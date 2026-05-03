import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      login: (user, accessToken, refreshToken) => {
        const normalizedUser = user ? { ...user, role: user.role?.toLowerCase() } : user
        set({ user: normalizedUser, accessToken, refreshToken })
      },

      setUser: (user) => {
        const normalizedUser = user ? { ...user, role: user.role?.toLowerCase() } : user
        set({ user: normalizedUser })
      },

      logout: () => set({ user: null, accessToken: null, refreshToken: null }),

      isAuthenticated: () => !!get().accessToken,
      hasRole: (...roles) => roles.includes(get().user?.role),
    }),
    {
      name: 'medsegai-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      version: 2,
      migrate: (persistedState, version) => {
        // v1 → v2: normalize role to lowercase
        if (persistedState?.user?.role) {
          persistedState.user.role = persistedState.user.role.toLowerCase()
        }
        return persistedState
      },
    }
  )
)
