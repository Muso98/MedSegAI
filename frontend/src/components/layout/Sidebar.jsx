import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { useThemeStore } from '@/store/themeStore'
import { 
  LayoutDashboard, Users, UploadCloud, 
  Settings, Sun, Moon, LogOut, Brain,
  ShieldCheck, Globe, Zap
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: <LayoutDashboard size={20} />, key: 'nav.dashboard', roles: ['admin','doctor','radiologist','operator'] },
  { to: '/patients', icon: <Users size={20} />, key: 'nav.patients', roles: ['admin','doctor','radiologist','operator'] },
  { to: '/upload', icon: <UploadCloud size={20} />, key: 'nav.upload', roles: ['admin','doctor','operator'] },
  { to: '/admin', icon: <Settings size={20} />, key: 'nav.admin', roles: ['admin'] },
]

export default function Sidebar({ open, onClose }) {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)

  const handleLogout = () => {
    logout()
    toast.success(t('nav.logout'))
    navigate('/login')
    if (onClose) onClose()
  }

  const roleLabels = {
    admin: 'Administrator',
    doctor: 'Shifokor',
    radiologist: 'Radiolog',
    operator: 'Operator',
  }

  const langs = [
    { code: 'uz', label: 'UZ' },
    { code: 'en', label: 'EN' },
    { code: 'ru', label: 'RU' },
  ]

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} style={{ width: 'var(--sidebar-w)', background: 'var(--bg-card)' }}>
      <div className="brand" style={{ padding: '32px 8px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', flexShrink: 0, width: '100%', textAlign: 'center' }}>
          <img
            src="/assets/logo.png"
            alt="MedSegAI Logo"
            className="brand-logo"
            style={{
              height: 100,
              width: 'auto',
              maxWidth: '100%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 20px 40px var(--accent-glow))'
            }}
          />
        </div>
      </div>

      <nav className="nav-section" style={{ flex: 1, padding: '0 16px' }}>
        <div className="nav-label" style={{ padding: '0 16px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', opacity: 0.8 }}>{t('nav.mainMenu')}</div>
        {navItems.map((item) => {
          if (!item.roles.includes(user?.role)) return null
          return (
          <NavLink
              key={item.to}
              to={item.to}
              onClick={() => { if (onClose) onClose() }}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 20px', borderRadius: '16px',
                marginBottom: 6, transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                color: isActive ? 'white' : 'var(--text-secondary)',
                background: isActive ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'transparent',
                fontWeight: isActive ? 800 : 600,
                boxShadow: isActive ? '0 12px 24px var(--accent-glow)' : 'none',
                transform: isActive ? 'scale(1.02)' : 'scale(1)',
                textDecoration: 'none'
              })}
            >
              <span className="nav-icon" style={{ display: 'flex', color: 'inherit', flexShrink: 0 }}>{item.icon}</span>
              <span className="nav-label" style={{ fontSize: 15 }}>{t(item.key)}</span>
            </NavLink>
          )
        })}
      </nav>

      <div style={{ padding: '32px 20px', borderTop: '1px solid var(--border)' }}>
        {/* Theme & Language combined or streamlined */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 6, background: 'var(--bg-base)', padding: 6, borderRadius: 14, border: '1px solid var(--border)' }}>
            <button
              onClick={() => theme !== 'light' && toggleTheme()}
              style={{
                width: 36, height: 36, borderRadius: 10, border: 'none',
                background: theme === 'light' ? 'var(--bg-card)' : 'transparent',
                color: theme === 'light' ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: theme === 'light' ? 'var(--shadow-sm)' : 'none'
              }}
            >
              <Sun size={18} />
            </button>
            <button
              onClick={() => theme !== 'dark' && toggleTheme()}
              style={{
                width: 36, height: 36, borderRadius: 10, border: 'none',
                background: theme === 'dark' ? 'var(--bg-card)' : 'transparent',
                color: theme === 'dark' ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: theme === 'dark' ? 'var(--shadow-sm)' : 'none'
              }}
            >
              <Moon size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-base)', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
            {langs.map((l) => (
              <button
                key={l.code}
                onClick={() => i18n.changeLanguage(l.code)}
                style={{
                  padding: '6px 10px', borderRadius: 8, border: 'none',
                  background: i18n.language === l.code ? 'var(--primary)' : 'transparent',
                  color: i18n.language === l.code ? 'white' : 'var(--text-muted)',
                  fontSize: 11, fontWeight: 900, cursor: 'pointer', transition: 'all 0.3s'
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* User profile section */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '16px', background: 'var(--bg-base)', borderRadius: '20px',
            border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
            marginBottom: 16
          }}>
            <div className="user-avatar" style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 900, fontSize: 18,
              boxShadow: '0 8px 16px var(--accent-glow)', flexShrink: 0
            }}>
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name" style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'Outfit, sans-serif' }}>
                {user?.full_name}
              </div>
              <div className="user-role" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 4 }}>
                {t(`admin.roles.${user?.role}`) || roleLabels[user?.role] || user?.role}
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--green)' }}></div>
              </div>
            </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'var(--bg-card)', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', width: 36, height: 36, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-light-alpha)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
          >
            <LogOut size={18} />
          </button>
        </div>

        <div style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          padding: '0 8px', opacity: 0.6 
        }}>
          <div className="version-label" style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            {t('common.version')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }}></div>
            <span className="version-label" style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)' }}>{t('common.systemOnline')}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
