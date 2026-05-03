import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { authAPI } from '@/api/client'
import axios from 'axios'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { Lock, Mail, Loader2, ArrowRight, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authAPI.login(form)
      const { access_token, refresh_token } = res.data
      const meRes = await axios.get('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${access_token}` }
      })
      login(meRes.data, access_token, refresh_token)
      toast.success(t('login.welcome'))
      navigate('/dashboard')
    } catch (err) {
      toast.error(err?.response?.status === 401 ? t('login.error') : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const langs = [
    { code: 'uz', label: "O'ZBEK" },
    { code: 'en', label: 'ENGLISH' },
    { code: 'ru', label: 'РУССКИЙ' },
  ]

  return (
    <div 
      className="login-container"
      style={{ display: 'flex', minHeight: '100vh', width: '100%', backgroundColor: 'var(--bg-base)', overflow: 'hidden' }}
    >
      <style>{`
        @media (max-width: 992px) {
          .login-container { flex-direction: column !important; overflow-y: auto !important; }
          .hero-section { display: none !important; }
          .login-form-section { flex: 1 1 100% !important; border-left: none !important; padding: 32px 16px !important; }
        }
      `}</style>

      {/* Left — Hero */}
      <div style={{ flex: '1 1 55%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="hero-section">
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/hero_brain.png)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.9) contrast(1.1)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.4) 0%, var(--bg-base) 100%)' }} />
        
        <div style={{ position: 'relative', zIndex: 10, padding: 80, maxWidth: 700 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 80 }}>
            <div style={{ height: 180, padding: '0 64px', borderRadius: 40, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
              <img src="/assets/logo.png" style={{ height: 120, width: 'auto', objectFit: 'contain' }} alt="Logo" />
            </div>
          </div>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: 'white', lineHeight: 1.2, marginBottom: 24, fontFamily: 'Outfit, sans-serif' }}>
            {t('login.heroTitle').split(' ').slice(0, 4).join(' ')} <span className="text-primary">{t('login.heroTitle').split(' ').slice(4).join(' ')}</span>
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, fontWeight: 500, maxWidth: 500 }}>
            {t('login.heroDesc')}
          </p>
        </div>
      </div>

      {/* Right — Form */}
      <div
        className="login-form-section"
        style={{ flex: '1 1 45%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', background: 'var(--bg-base)', borderLeft: '1px solid var(--border)', position: 'relative' }}
      >
        <div style={{ width: '100%', maxWidth: '440px' }} className="animate-slide-up">
          <div style={{ marginBottom: 40 }}>
            <h3 style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 10, fontFamily: 'Outfit, sans-serif' }}>
              {t('login.welcome')}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, fontWeight: 600 }}>{t('login.subtitle')}</p>
          </div>

          {/* Lang switcher */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 40, background: 'var(--bg-base)', padding: 6, borderRadius: 16, border: '1px solid var(--border)', width: 'fit-content' }}>
            {langs.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => i18n.changeLanguage(l.code)}
                style={{
                  padding: '10px 18px', borderRadius: 12, border: 'none',
                  background: i18n.language === l.code ? 'var(--primary)' : 'transparent',
                  color: i18n.language === l.code ? 'white' : 'var(--text-muted)',
                  fontSize: 11, fontWeight: 900, cursor: 'pointer', transition: 'all 0.3s'
                }}
              >
                {l.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={14} /> {t('login.email')}
              </label>
              <input
                type="email" className="form-input"
                style={{ height: 60, fontSize: 16, borderRadius: 18, padding: '0 24px', fontWeight: 600 }}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required placeholder="shifokor@medseg.ai"
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Lock size={14} /> {t('login.password')}
              </label>
              <input
                type="password" className="form-input"
                style={{ height: 60, fontSize: 16, borderRadius: 18, padding: '0 24px', fontWeight: 600 }}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required placeholder="••••••••"
              />
            </div>
            
            <button
              type="submit" className="btn btn-primary"
              style={{ height: 64, fontSize: 17, borderRadius: 18, fontWeight: 900, gap: 12, marginTop: 8, boxShadow: 'var(--shadow-lg)' }}
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : <>{t('login.signIn')} <ArrowRight size={20} /></>}
            </button>
          </form>

          <div style={{ marginTop: 56, display: 'flex', alignItems: 'center', gap: 16, padding: '20px', borderRadius: 20, background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
            <ShieldCheck className="text-primary" size={22} style={{ flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.5 }}>
              {t('login.securityNote')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
