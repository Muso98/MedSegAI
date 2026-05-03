import React, { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useTranslation } from 'react-i18next'
import Sidebar from './Sidebar'
import { Menu, X } from 'lucide-react'

export default function AppLayout() {
  const { user, accessToken } = useAuthStore()
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!accessToken || !user) return <Navigate to="/login" replace />

  return (
    <div className="layout">
      {/* Mobile backdrop overlay */}
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar — gets .open class on mobile */}
      <div className={sidebarOpen ? 'open' : ''} style={{ display: 'contents' }}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content area */}
      <div className="main-content">
        <div className="mobile-topbar">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 14, width: 44, height: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-primary)', flexShrink: 0
            }}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, paddingRight: 44 }}>
            <img src="/assets/logo.png" alt="Logo" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
          </div>
        </div>

        <div className="animate-fade-in" style={{ flex: 1, padding: '0' }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export function ProtectedRoute({ children, roles }) {
  const { user, accessToken } = useAuthStore()
  if (!accessToken || !user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}
