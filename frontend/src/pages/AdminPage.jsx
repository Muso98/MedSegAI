import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminAPI, usersAPI } from '@/api/client'
import toast from 'react-hot-toast'
import { 
  BarChart3, Users, ScrollText, UserPlus, 
  Clock, Activity,
  Trash2, Edit3, CheckCircle2,
  Database, ArrowRight, ArrowLeft
} from 'lucide-react'

const roleColors = { 
  admin: 'badge-red', doctor: 'badge-blue',
  radiologist: 'badge-cyan', operator: 'badge-yellow' 
}
const initialUserForm = { email: '', full_name: '', password: '', role: 'doctor', is_active: true }

export default function AdminPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('stats')
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [userForm, setUserForm] = useState(initialUserForm)
  const [logPage, setLogPage] = useState(1)

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminAPI.stats().then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersAPI.list().then(r => r.data),
    enabled: activeTab === 'users',
  })

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['audit-logs', logPage],
    queryFn: () => adminAPI.logs({ page: logPage, page_size: 50 }).then(r => r.data),
    enabled: activeTab === 'logs',
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = { ...userForm }
      if (editUser && !body.password) delete body.password
      if (editUser) return usersAPI.update(editUser.id, body)
      return usersAPI.create(body)
    },
    onSuccess: () => { qc.invalidateQueries(['users-list']); setShowModal(false); toast.success(t('common.success')) },
    onError: (err) => toast.error(err.response?.data?.detail || t('common.error')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => usersAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries(['users-list']); toast.success(t('common.success')) },
    onError: (err) => toast.error(err.response?.data?.detail || t('common.error')),
  })

  const openCreate = () => { setUserForm(initialUserForm); setEditUser(null); setShowModal(true) }
  const openEdit = (u) => {
    setUserForm({ email: u.email, full_name: u.full_name, password: '', role: u.role, is_active: u.is_active })
    setEditUser(u)
    setShowModal(true)
  }

  const tabs = [
    { key: 'stats',  label: t('admin.systemStats'), icon: <BarChart3 size={18} /> },
    { key: 'users',  label: t('admin.users'),       icon: <Users size={18} /> },
    { key: 'logs',   label: t('admin.auditLogs'),   icon: <ScrollText size={18} /> },
  ]

  const statItems = stats ? [
    { icon: <Users />,        label: t('dashboard.totalPatients'),  value: stats.total_patients,    color: 'blue' },
    { icon: <Database />,     label: t('dashboard.totalStudies'),   value: stats.total_studies,     color: 'cyan' },
    { icon: <Activity />,     label: t('dashboard.todayStudies'),   value: stats.studies_today,     color: 'purple' },
    { icon: <Clock />,        label: t('dashboard.processing'),     value: stats.studies_processing, color: 'yellow' },
    { icon: <CheckCircle2 />, label: t('dashboard.completed'),      value: stats.studies_completed, color: 'green' },
    { icon: <Users />,        label: t('admin.users'),              value: stats.total_users,       color: 'red' },
  ] : []

  return (
    <div className="page-content animate-fade-in">
      <div className="page-header" style={{ marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 900, fontFamily: 'Outfit, sans-serif' }}>
            {t('admin.title')}
          </h1>
          <p style={{ fontSize: 14, fontWeight: 500, opacity: 0.6 }}>MedSegAI Enterprise Control Center</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {activeTab === 'users' && (
            <button className="btn btn-primary" onClick={openCreate} style={{ borderRadius: 14, height: 48, padding: '0 24px' }}>
              <UserPlus size={18} /> <span className="hide-xs">{t('admin.addUser')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, background: 'var(--bg-surface)', padding: 6, borderRadius: 16, width: 'fit-content', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 18px', border: 'none', cursor: 'pointer',
              borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8,
              background: activeTab === tab.key ? 'var(--bg-elevated)' : 'transparent',
              color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.key ? 700 : 500,
              fontSize: 13, transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: activeTab === tab.key ? 'var(--shadow-sm)' : 'none'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      {activeTab === 'stats' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          {statItems.map((s, i) => (
            <div key={i} className="stat-card" style={{ padding: 28 }}>
              <div className={`stat-icon ${s.color}`} style={{ width: 56, height: 56, borderRadius: 18 }}>
                {React.cloneElement(s.icon, { size: 26 })}
              </div>
              <div style={{ marginTop: 16 }}>
                <div className="stat-value" style={{ fontSize: 32, fontWeight: 900, fontFamily: 'Outfit, sans-serif' }}>{s.value ?? '0'}</div>
                <div className="stat-label" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users */}
      {activeTab === 'users' && (
        <div className="card animate-slide-up" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>{t('admin.users')}</th>
                  <th>{t('admin.role')}</th>
                  <th>{t('admin.active')}</th>
                  <th className="hide-mobile">{t('admin.lastLogin')}</th>
                  <th style={{ textAlign: 'right' }}>{t('patients.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 64 }}>
                    <Activity className="animate-spin text-primary" style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{t('common.loading')}</div>
                  </td></tr>
                )}
                {users?.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 13, background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 15, fontWeight: 900, flexShrink: 0, boxShadow: '0 4px 12px var(--accent-glow)' }}>
                          {u.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 14 }}>{u.full_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${roleColors[u.role] || 'badge-gray'}`} style={{ borderRadius: 8, padding: '4px 10px' }}>
                        {t(`admin.roles.${u.role}`) || u.role.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className={`status-dot ${u.is_active ? 'green' : 'red'}`}></div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: u.is_active ? 'var(--green)' : 'var(--red)' }}>
                          {u.is_active ? t('admin.active') : t('admin.inactive')}
                        </span>
                      </div>
                    </td>
                    <td className="hide-mobile" style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 500 }}>
                      {u.last_login ? new Date(u.last_login).toLocaleString(undefined, { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)} style={{ borderRadius: 10, width: 34, height: 34, padding: 0 }}>
                          <Edit3 size={15} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--red)', borderRadius: 10, width: 34, height: 34, padding: 0 }}
                          onClick={() => { if (window.confirm(t('admin.deleteConfirm'))) deleteMutation.mutate(u.id) }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Logs */}
      {activeTab === 'logs' && (
        <div className="card animate-slide-up" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div className="table-container" style={{ border: 'none' }}>
            <table style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>{t('admin.time')}</th>
                  <th>{t('admin.path')}</th>
                  <th className="hide-mobile">{t('admin.ip')}</th>
                  <th>{t('admin.status')}</th>
                  <th style={{ textAlign: 'right' }}>ms</th>
                </tr>
              </thead>
              <tbody>
                {logsLoading && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 64 }}>
                    <Activity className="animate-spin text-primary" style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{t('common.loading')}</div>
                  </td></tr>
                )}
                {logs?.items?.map((log) => (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{log.action.split(' ')[0]}</span> {log.action.split(' ').slice(1).join(' ')}
                    </td>
                    <td className="hide-mobile" style={{ color: 'var(--text-muted)', fontSize: 12 }}>{log.ip_address}</td>
                    <td>
                      <span className={`badge ${log.status_code < 300 ? 'badge-green' : log.status_code < 500 ? 'badge-yellow' : 'badge-red'}`} style={{ borderRadius: 6, fontSize: 10 }}>
                        {log.status_code}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: log.processing_time_ms > 500 ? 'var(--red)' : 'var(--green)' }}>
                      {log.processing_time_ms}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {logs && logs.pages > 1 && (
            <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', gap: 16, alignItems: 'center' }}>
              <button className="btn btn-ghost btn-sm" style={{ borderRadius: 10 }} disabled={logPage <= 1} onClick={() => setLogPage(p => p - 1)}>
                <ArrowLeft size={16} />
              </button>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{t('common.page')} {logPage} {t('common.of')} {logs.pages}</span>
              <button className="btn btn-ghost btn-sm" style={{ borderRadius: 10 }} disabled={logPage >= logs.pages} onClick={() => setLogPage(p => p + 1)}>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* User Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ padding: 40, borderRadius: 28, maxWidth: 580 }}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 26, fontWeight: 900, fontFamily: 'Outfit, sans-serif' }}>
                {editUser ? t('admin.editUser') : t('admin.createUser')}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>
                {t('admin.role')}
              </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="form-group">
                <label className="form-label">{t('admin.fullName')}</label>
                <input type="text" className="form-input" style={{ height: 50, borderRadius: 12 }}
                  value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  placeholder="Dr. Alisher Valiyev" />
              </div>
              
              <div className="form-group">
                <label className="form-label">{t('admin.email')}</label>
                <input type="email" className="form-input" style={{ height: 50, borderRadius: 12 }}
                  value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="email@example.com" />
              </div>

              <div className="form-group">
                <label className="form-label">{t('admin.password')} {editUser && <span style={{ opacity: 0.5, fontSize: 11 }}>(optional)</span>}</label>
                <input type="password" className="form-input" style={{ height: 50, borderRadius: 12 }}
                  value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="••••••••" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">{t('admin.role')}</label>
                  <select className="form-input" style={{ height: 50, borderRadius: 12 }}
                    value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                    {['admin','doctor','radiologist','operator'].map(r => (
                      <option key={r} value={r}>{t(`admin.roles.${r}`)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('admin.active')}</label>
                  <select className="form-input" style={{ height: 50, borderRadius: 12 }}
                    value={String(userForm.is_active)} onChange={(e) => setUserForm({ ...userForm, is_active: e.target.value === 'true' })}>
                    <option value="true">{t('admin.active')}</option>
                    <option value="false">{t('admin.inactive')}</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 32 }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ height: 50, borderRadius: 12, padding: '0 28px' }}>
                {t('common.cancel')}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                style={{ height: 50, borderRadius: 12, padding: '0 36px' }}
              >
                {saveMutation.isPending ? <Activity className="animate-spin" size={18} /> : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
