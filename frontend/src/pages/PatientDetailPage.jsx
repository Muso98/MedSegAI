import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation } from '@tanstack/react-query'
import { patientsAPI, studiesAPI } from '@/api/client'
import toast from 'react-hot-toast'
import { 
  ArrowLeft, UploadCloud, Phone, 
  Microscope, MapPin,
  Play, Loader2, 
  Activity, CheckCircle,
  Clock, ChevronRight, 
  BrainCircuit, Database, FileText,
  ClipboardList, Heart, Zap
} from 'lucide-react'

const statusColors = {
  uploaded: 'badge-gray', preprocessing: 'badge-yellow',
  queued: 'badge-yellow', processing: 'badge-blue',
  completed: 'badge-green', failed: 'badge-red',
}
const statusDots = {
  uploaded:'gray', preprocessing:'yellow', queued:'yellow',
  processing:'blue', completed:'green', failed:'red',
}

export default function PatientDetailPage() {
  const { t } = useTranslation()
  const { patientId } = useParams()
  const navigate = useNavigate()

  const { data: patient, isLoading: patLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientsAPI.get(patientId).then(r => r.data),
  })

  const { data: studies, isLoading: studLoading, refetch } = useQuery({
    queryKey: ['patient-studies', patientId],
    queryFn: () => patientsAPI.studies(patientId).then(r => r.data),
    refetchInterval: (query) => {
      const data = query.state.data
      if (data?.some(s => ['processing','queued','preprocessing'].includes(s.status))) return 5000
      return false
    },
  })

  const segmentMutation = useMutation({
    mutationFn: (studyId) => studiesAPI.segment(studyId),
    onSuccess: () => { toast.success(t('patientDetail.segmentConfirm')); refetch() },
    onError: (err) => toast.error(err.response?.data?.detail || t('common.error')),
  })

  if (patLoading) return (
    <div className="page-content animate-fade-in" style={{ display:'flex', flexDirection: 'column', alignItems:'center', justifyContent:'center', minHeight: '60vh', gap: 24 }}>
      <Loader2 className="animate-spin text-primary" size={48} />
      <span style={{ fontWeight: 800, color: 'var(--text-muted)', fontSize: 18, fontFamily: 'Outfit, sans-serif' }}>{t('common.loading')}</span>
    </div>
  )

  if (!patient) return <div className="page-content">{t('common.noData')}</div>

  const age = patient.date_of_birth
    ? Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 24 * 3600 * 1000))
    : null

  return (
    <div className="page-content animate-fade-in">
      {/* Back & Header */}
      <div style={{ marginBottom: 40 }}>
        <button 
          className="btn btn-ghost" 
          onClick={() => navigate('/patients')} 
          style={{ marginBottom: 20, fontWeight: 800, padding: 0, gap: 10, color: 'var(--primary)' }}
        >
          <ArrowLeft size={20} /> {t('patientDetail.backToPatients')}
        </button>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ 
              width: 88, height: 88, borderRadius: 28, 
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', boxShadow: '0 20px 40px var(--accent-glow)',
              fontSize: 36, fontWeight: 900, flexShrink: 0
            }}>
              {patient.full_name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                <span className="badge badge-blue" style={{ borderRadius: '10px', padding: '5px 12px', fontWeight: 800, fontSize: 12 }}>{patient.patient_id}</span>
                <span className="badge badge-gray" style={{ borderRadius: '10px', padding: '5px 12px', fontWeight: 800, fontSize: 12 }}>
                  {patient.gender ? t(`patients.${patient.gender}`).toUpperCase() : t('patients.unknown').toUpperCase()}
                </span>
                {age !== null && (
                  <span className="badge badge-purple" style={{ borderRadius: '10px', padding: '5px 12px', fontWeight: 800, fontSize: 12 }}>
                    {age} {t('patientDetail.age')}
                  </span>
                )}
              </div>
              <h1 className="page-title" style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-0.04em', fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>
                {patient.full_name}
              </h1>
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{ height: 52, borderRadius: 16, padding: '0 28px', fontWeight: 800, gap: 10, boxShadow: 'var(--shadow-lg)' }}
            onClick={() => navigate(`/upload?patient=${patientId}`)}
          >
            <UploadCloud size={20} /> <span className="hide-xs">{t('upload.title')}</span>
          </button>
        </div>
      </div>

      <div className="content-sidebar-grid">
        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Stats */}
          <div className="stats-grid">
            {[
              { label: t('patientDetail.studies'), value: (patient.study_count || 0), icon:<Database size={22} />, color: 'cyan' },
              { label: t('admin.lastLogin'), value: studies?.[0] ? new Date(studies[0].created_at).toLocaleDateString() : '—', icon:<Clock size={22} />, color: 'purple' },
              { label: t('admin.stats'), value: studies?.some(s => s.status === 'completed') ? t('status.completed') : t('status.pending'), icon:<CheckCircle size={22} />, color: 'green' },
            ].map((item, i) => (
              <div key={i} className="stat-card" style={{ borderRadius: '24px', padding: '24px' }}>
                <div className={`stat-icon ${item.color}`} style={{ width: 52, height: 52, borderRadius: '16px', marginBottom: 16 }}>{item.icon}</div>
                <div>
                  <div className="stat-label" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6, marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontWeight: 900, color:'var(--text-primary)', fontSize: 20, fontFamily: 'Outfit, sans-serif' }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Studies Table */}
          <div className="card" style={{ padding:0, borderRadius: '28px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ padding:'24px 32px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h2 style={{ fontSize:20, fontWeight:900, fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: 12 }}>
                <ClipboardList size={20} className="text-primary" /> {t('patientDetail.studies')}
              </h2>
              <span className="badge" style={{ borderRadius: '10px', background: 'var(--bg-base)', fontWeight: 800 }}>
                {studies?.length ?? 0}
              </span>
            </div>
            <div className="table-container" style={{ border: 'none' }}>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>{t('upload.title_field')}</th>
                    <th>{t('admin.status')}</th>
                    <th className="hide-mobile">{t('admin.time')}</th>
                    <th style={{ textAlign: 'right' }}>{t('patients.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {studLoading && (
                    <tr><td colSpan={4} style={{ textAlign:'center', padding: 60 }}>
                      <Activity className="animate-spin text-primary" size={28} style={{ margin: '0 auto' }} />
                    </td></tr>
                  )}
                  {!studLoading && studies?.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign:'center', padding: 60, opacity: 0.5, fontWeight: 700 }}>
                      {t('patientDetail.noStudies')}
                    </td></tr>
                  )}
                  {studies?.map((s) => (
                    <tr key={s.id} className="hover-row">
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ width: 40, height: 40, background: 'var(--bg-base)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                            <BrainCircuit size={20} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: 'var(--text-primary)', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {s.original_filename}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{s.file_format?.toUpperCase()}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${statusColors[s.status] || 'badge-gray'}`} style={{ borderRadius: '10px', padding: '5px 12px', fontWeight: 800, fontSize: 11 }}>
                          <span className={`status-dot ${statusDots[s.status] || 'gray'}`}></span>
                          {t(`status.${s.status}`).toUpperCase()}
                        </span>
                      </td>
                      <td className="hide-mobile" style={{ color:'var(--text-muted)', fontWeight: 600, fontSize: 13 }}>
                        {new Date(s.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:8, justifyContent: 'flex-end' }}>
                          {s.status === 'uploaded' && (
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ borderRadius: '10px', padding: '0 16px', height: 36, fontWeight: 800, fontSize: 12 }}
                              onClick={() => segmentMutation.mutate(s.id)}
                              disabled={segmentMutation.isPending}
                            >
                              <Play size={14} style={{ marginRight: 6 }} /> {t('patientDetail.segment')}
                            </button>
                          )}
                          {s.status === 'completed' && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ borderRadius: '10px', padding: '0 16px', height: 36, fontWeight: 800, background: 'var(--bg-base)', fontSize: 12 }}
                              onClick={() => navigate(`/results/${s.id}`)}
                            >
                              {t('patientDetail.viewResult')} <ChevronRight size={14} style={{ marginLeft: 6 }} />
                            </button>
                          )}
                          {['processing','queued','preprocessing'].includes(s.status) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, color: 'var(--primary)' }} className="animate-pulse">
                              <Loader2 size={14} className="animate-spin" /> {t(`status.${s.status}`).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Profile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card" style={{ borderRadius: '28px', padding: '32px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 900, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Outfit, sans-serif' }}>
              <Heart size={18} className="text-primary" /> {t('patientDetail.basicInfo')}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
                  <MapPin size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    {t('patientDetail.noAddress').split(' ')[0]}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {patient.address || t('patientDetail.noAddress')}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
                  <Phone size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    {t('patientDetail.noPhone').split(' ')[0]}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {patient.phone || t('patientDetail.noPhone')}
                  </div>
                </div>
              </div>

              <div style={{ padding: 20, background: 'var(--bg-base)', borderRadius: '16px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={12} /> {t('patients.notes')}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, fontWeight: 500, fontStyle: 'italic' }}>
                  "{patient.notes || t('patientDetail.noNotes')}"
                </p>
              </div>
            </div>
          </div>
          
          <div style={{
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            borderRadius: '28px', padding: '28px',
            color: 'white', boxShadow: '0 24px 48px -12px var(--accent-glow)'
          }}>
            <h4 style={{ fontSize: 15, fontWeight: 900, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Outfit, sans-serif' }}>
              <Zap size={16} /> AI Diagnostika
            </h4>
            <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.6, fontWeight: 500 }}>
              {t('dashboard.platformDesc')} <strong>99.4%</strong> {t('dashboard.accuracy')}
            </p>
            <div style={{ marginTop: 20, height: 1, background: 'rgba(255,255,255,0.2)' }} />
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.8 }}>{t('dashboard.systemActive')}</span>
              <span style={{ fontSize: 11, fontWeight: 900 }}>OPTIMAL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
