import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminAPI, studiesAPI, patientsAPI } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { 
  Users, Microscope, Calendar, Settings, 
  CheckCircle, XCircle, UploadCloud, ChevronRight, ArrowRight,
  Activity, Clock, ShieldCheck, Zap, TrendingUp,
  BrainCircuit, Database, FileText
} from 'lucide-react'

export default function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminAPI.stats().then(r => r.data),
    enabled: user?.role === 'admin',
    refetchInterval: 30000,
  })

  const { data: recentStudies } = useQuery({
    queryKey: ['recent-studies'],
    queryFn: async () => {
      const pats = await patientsAPI.list({ page: 1, page_size: 5 })
      return pats.data.items
    },
    refetchInterval: 15000,
  })

  const statCards = user?.role === 'admin' && stats ? [
    { icon: <Users />, label: t('dashboard.totalPatients'), value: stats.total_patients, color: 'blue' },
    { icon: <Database />, label: t('dashboard.totalStudies'), value: stats.total_studies, color: 'cyan' },
    { icon: <Calendar />, label: t('dashboard.todayStudies'), value: stats.studies_today, color: 'purple' },
    { icon: <Zap />, label: t('dashboard.processing'), value: stats.studies_processing, color: 'yellow' },
    { icon: <CheckCircle />, label: t('dashboard.completed'), value: stats.studies_completed, color: 'green' },
    { icon: <XCircle />, label: t('dashboard.failed'), value: stats.studies_failed, color: 'red' },
  ] : []

  const quickActions = [
    { icon: <Users size={32} />, label: t('nav.patients'), desc: t('dashboard.patientsDesc'), to: '/patients', color: 'var(--primary)', roles: ['admin', 'doctor', 'radiologist', 'operator'] },
    { icon: <UploadCloud size={32} />, label: t('dashboard.uploadStudy'), desc: t('dashboard.uploadDesc'), to: '/upload', color: 'var(--accent)', roles: ['admin', 'doctor', 'operator'] },
  ].filter(a => a.roles.includes(user?.role))

  return (
    <div className="page-content animate-fade-in">
      {/* Welcome Banner */}
      <div className="dashboard-banner" style={{
        background: 'linear-gradient(135deg, var(--primary), var(--accent))',
        borderRadius: '40px', padding: 'clamp(32px, 5vw, 64px)',
        marginBottom: '48px', color: 'white',
        boxShadow: '0 32px 64px -12px var(--accent-glow)',
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 24,
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ position: 'absolute', right: '-10%', top: '-30%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', left: '5%', bottom: '-40%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', fontSize: 11, fontWeight: 800 }}>
              {t('dashboard.systemActive')}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.8 }}>{t('dashboard.lastUpdated')}</span>
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '16px', fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>
            {t('dashboard.welcome')} <br /> {user?.full_name?.split(' ')[0]}
          </h1>
          <p style={{ fontSize: 'clamp(14px, 2vw, 18px)', opacity: 0.9, fontWeight: 500, maxWidth: '560px', lineHeight: 1.6 }}>
            {t('dashboard.platformDesc')} <br />
            {t('common.loading') ? '' : ''}<strong>99.4%</strong> {t('dashboard.accuracy')}
          </p>
        </div>
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <button
            className="btn"
            style={{
              background: 'white', color: 'var(--primary)',
              height: '56px', padding: '0 32px', fontSize: '16px', borderRadius: '18px',
              fontWeight: 800, boxShadow: '0 16px 32px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
            onClick={() => navigate('/upload')}
          >
            <UploadCloud size={20} /> {t('upload.title')}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      {statCards.length > 0 && (
        <div className="stats-grid" style={{ marginBottom: 48 }}>
          {statCards.map((s, i) => (
            <div key={i} className="stat-card" style={{ borderRadius: '28px', padding: '28px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: -10, bottom: -10, opacity: 0.03 }}>{React.cloneElement(s.icon, { size: 100 })}</div>
              <div className={`stat-icon ${s.color}`} style={{ width: 56, height: 56, borderRadius: '16px', marginBottom: 16 }}>
                {React.cloneElement(s.icon, { size: 26 })}
              </div>
              <div>
                <div className="stat-value" style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'Outfit, sans-serif' }}>{s.value ?? '0'}</div>
                <div className="stat-label" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Grid */}
      <div className="dashboard-grid">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 20, fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Zap size={22} className="text-primary" /> {t('dashboard.quickActions')}
          </h2>
          <div className="actions-grid" style={{ marginBottom: 36 }}>
            {quickActions.map((action, i) => (
              <div
                key={i} className="card"
                onClick={() => navigate(action.to)}
                style={{ cursor: 'pointer', padding: '32px', borderRadius: '28px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <div style={{ color: action.color, background: `${action.color}18`, width: 64, height: 64, borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {action.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 20, color: 'var(--text-primary)', marginBottom: 4, fontFamily: 'Outfit, sans-serif' }}>{action.label}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>{action.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Patients Table */}
          <div className="card" style={{ borderRadius: '28px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Clock size={20} className="text-primary" /> {t('dashboard.recentPatients')}
              </h2>
              <button className="btn btn-ghost" onClick={() => navigate('/patients')} style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 13 }}>
                {t('dashboard.viewAll')} <ChevronRight size={16} />
              </button>
            </div>
            <div className="table-container" style={{ border: 'none' }}>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>{t('dashboard.patient')}</th>
                    <th>{t('dashboard.patientId')}</th>
                    <th>{t('dashboard.studies')}</th>
                    <th style={{ textAlign: 'right' }}>{t('dashboard.action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentStudies?.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-light-alpha)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>
                            {p.full_name?.charAt(0)}
                          </div>
                          <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{p.full_name}</span>
                        </div>
                      </td>
                      <td><code style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{p.patient_id}</code></td>
                      <td>
                        <span className="badge badge-blue" style={{ borderRadius: 8 }}>
                          {p.study_count} {t('dashboard.studiesCount')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/patients/${p.id}`)} style={{ borderRadius: 10 }}>
                          <ArrowRight size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Info Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card" style={{ borderRadius: '28px', padding: '28px', border: '1px solid var(--primary-light-alpha)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 900, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Outfit, sans-serif' }}>
              <BrainCircuit size={20} className="text-primary" /> {t('dashboard.aiModelStatus')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>{t('dashboard.accuracyLabel')}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>99.4%</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-base)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ width: '99.4%', height: '100%', background: 'var(--green)', borderRadius: 10 }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>{t('dashboard.avgTime')}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)' }}>4.2 {t('dashboard.seconds')}</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ borderRadius: '28px', padding: '28px' }}>
            <h3 style={{ fontSize: 17, fontWeight: 900, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Outfit, sans-serif' }}>
              <TrendingUp size={20} className="text-purple" /> {t('dashboard.activity')}
            </h3>
            <div style={{ height: 100, display: 'flex', alignItems: 'flex-end', gap: 6, paddingBottom: 8 }}>
              {[40, 60, 30, 80, 50, 90, 70, 45, 85, 100].map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${h}%`, background: 'linear-gradient(to top, var(--primary), var(--accent))', borderRadius: 4, opacity: 0.8 }}></div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 10, fontWeight: 600 }}>{t('dashboard.activityDesc')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
