import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api, { studiesAPI, resultsAPI } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import MeasurementTool from '@/components/MeasurementTool'
import {
  ArrowLeft, FileDown, Eye, EyeOff,
  Activity, Target, Clock,
  CheckCircle, ShieldCheck,
  Brain, Maximize, Loader2,
  Zap, Box, PieChart, Sparkles, Scan,
  Thermometer, Ruler, FlaskConical, Share2
} from 'lucide-react'

const SecureImage = ({ src, alt, style }) => {
  const [imgSrc, setImgSrc] = useState(null)
  useEffect(() => {
    if (!src) return
    let objectUrl
    api.get(src, { responseType: 'blob' })
      .then(res => { objectUrl = URL.createObjectURL(res.data); setImgSrc(objectUrl) })
      .catch(console.error)
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [src])
  return imgSrc ? (
    <img src={imgSrc} alt={alt} draggable={false} style={{ ...style, transition: 'all 0.6s cubic-bezier(0.16,1,0.3,1)', userSelect: 'none' }} />
  ) : (
    <div style={{ ...style, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'var(--bg-base)' }}>
      <Loader2 className="animate-spin text-primary" size={32} style={{ marginBottom: 12 }} />
      <span style={{ fontSize: 13, fontWeight: 700 }}>{/* loading */}</span>
    </div>
  )
}

export default function ResultsPage() {
  const { t, i18n } = useTranslation()
  const { studyId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [showMask, setShowMask] = useState(true)
  const [isMeasuring, setIsMeasuring] = useState(false)
  const [opacity, setOpacity] = useState(0.8)
  const [validationNotes, setValidationNotes] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)

  const lang = i18n.language || 'uz'

  const handleDownloadPDF = async () => {
    if (!result) return
    setIsDownloading(true)
    try {
      const res = await resultsAPI.downloadPdf(result.id, lang)
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `MedSegAI_Report_${result.id.slice(0, 8)}_${lang}.pdf`)
      document.body.appendChild(link)
      link.click()
      setTimeout(() => { document.body.removeChild(link); window.URL.revokeObjectURL(url) }, 2000)
    } catch (err) {
      console.error(err)
      toast.error(t('common.error'))
    } finally {
      setIsDownloading(false)
    }
  }

  const { data: study } = useQuery({
    queryKey: ['study', studyId],
    queryFn: () => studiesAPI.get(studyId).then(r => r.data),
  })

  const { data: result, isLoading, refetch } = useQuery({
    queryKey: ['result-by-study', studyId],
    queryFn: () => resultsAPI.byStudy(studyId).then(r => r.data),
    placeholderData: (prev) => prev,
    refetchInterval: (data) => !data ? 5000 : false,
    retry: 1,
    retryDelay: 3000,
  })

  const { data: studyStatus } = useQuery({
    queryKey: ['study-status', studyId],
    queryFn: () => studiesAPI.status(studyId).then(r => r.data),
    refetchInterval: !result ? 5000 : false,
  })

  const validateMutation = useMutation({
    mutationFn: ({ status, notes }) => resultsAPI.validate(result.id, { status, notes }),
    onSuccess: () => { qc.invalidateQueries(['result-by-study', studyId]); toast.success(t('common.success')) },
    onError: (err) => toast.error(err.response?.data?.detail || t('common.error')),
  })

  const isProcessing = ['processing', 'queued', 'preprocessing'].includes(studyStatus?.status)

  const metricItems = result ? [
    { label: t('results.areaPixels'),    value: result.tumor_area_pixels?.toLocaleString() ?? '—', icon: <Scan size={18} />,     color: 'blue' },
    { label: t('results.areaPercent'),   value: result.tumor_area_percent ? `${result.tumor_area_percent.toFixed(2)}%` : '—',   icon: <PieChart size={18} />,  color: 'cyan' },
    { label: t('results.volume'),        value: result.tumor_volume_cm3 ? `${result.tumor_volume_cm3.toFixed(3)} cm³` : '—',    icon: <Box size={18} />,       color: 'purple' },
    { label: t('results.confidence'),    value: result.confidence_score ? `${(result.confidence_score * 100).toFixed(1)}%` : '—', icon: <Sparkles size={18} />, color: 'green' },
    { label: t('results.processingTime'),value: result.processing_time_sec ? `${result.processing_time_sec}s` : '—',            icon: <Zap size={18} />,       color: 'yellow' },
    { label: t('results.validationStatus'), value: result.validation_status, icon: <ShieldCheck size={18} />,                   color: 'gray' },
  ] : []

  const validationBadge = {
    pending: 'badge-yellow', approved: 'badge-green',
    rejected: 'badge-red', corrected: 'badge-cyan',
  }

  return (
    <div className="page-content animate-fade-in">
      {/* Header */}
      <div className="results-header" style={{ marginBottom: 48, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <button
            className="btn btn-ghost"
            onClick={() => navigate(-1)}
            style={{ marginBottom: 24, fontWeight: 800, padding: 0, gap: 10, color: 'var(--primary)' }}
          >
            <ArrowLeft size={20} /> {t('results.back')}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-0.04em', fontFamily: 'Outfit, sans-serif' }}>
              {t('results.title')}
            </h1>
            {result && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 20px', borderRadius: 16,
                background: result.tumor_present ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                border: `1.5px solid ${result.tumor_present ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
              }}>
                <div className={result.tumor_present ? 'status-dot red' : 'status-dot green'} style={{ width: 10, height: 10 }} />
                <span style={{ fontWeight: 900, fontSize: 13, color: result.tumor_present ? '#ef4444' : '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {result.tumor_present ? t('results.tumorPresent') : t('results.tumorAbsent')}
                </span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>{t('results.studyKey')}</span>
            <code style={{ fontSize: 12, background: 'var(--bg-base)', padding: '5px 14px', borderRadius: 10, fontWeight: 800, color: 'var(--primary)' }}>{studyId?.toUpperCase()}</code>
          </div>
        </div>

        {result && (
          <div style={{ display: 'flex', gap: 12, flexShrink: 0, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" style={{ height: 56, width: 56, padding: 0, borderRadius: 16 }}>
              <Share2 size={20} />
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="btn btn-primary"
              style={{ height: 56, borderRadius: 16, padding: '0 28px', fontWeight: 900, gap: 10 }}
            >
              {isDownloading ? <Loader2 className="animate-spin" size={18} /> : <FileDown size={20} />}
              <span className="hide-xs">{isDownloading ? t('results.preparing') : t('results.downloadPDF')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Processing State */}
      {isProcessing && !result && (
        <div className="card" style={{ textAlign: 'center', padding: 'clamp(40px, 8vw, 100px)', borderRadius: 40 }}>
          <div style={{
            width: 100, height: 100, borderRadius: 32,
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', margin: '0 auto 32px',
            boxShadow: '0 30px 60px var(--accent-glow)', position: 'relative'
          }}>
            <Brain size={48} className="animate-pulse" />
            <div className="animate-spin" style={{ position: 'absolute', inset: -12, border: '3px solid var(--primary-light-alpha)', borderTopColor: 'transparent', borderRadius: '50%' }} />
          </div>
          <h2 style={{ fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: 900, marginBottom: 16, fontFamily: 'Outfit, sans-serif' }}>{t('results.processing')}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 16, maxWidth: 480, margin: '0 auto 40px', lineHeight: 1.6 }}>{t('results.processingDesc')}</p>
          <div style={{ maxWidth: 400, margin: '0 auto' }}>
            <div style={{ height: 10, background: 'var(--bg-base)', borderRadius: 20, overflow: 'hidden', padding: 2 }}>
              <div style={{ height: '100%', width: '75%', background: 'linear-gradient(90deg, var(--primary), var(--accent))', borderRadius: 20 }} />
            </div>
            <div style={{ marginTop: 16, fontSize: 13, fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.08em' }}>{t('results.processingPct')}</div>
          </div>
        </div>
      )}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Viewers + Metrics */}
          <div className="dashboard-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Toolbar */}
              <div className="card" style={{ padding: '16px 24px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowMask(!showMask)}
                  style={{
                    background: showMask ? 'var(--primary)' : 'var(--bg-base)',
                    border: 'none', color: showMask ? 'white' : 'var(--text-secondary)',
                    padding: '10px 20px', borderRadius: 14, fontWeight: 800, fontSize: 14,
                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                  }}
                >
                  {showMask ? <Eye size={16} /> : <EyeOff size={16} />}
                  {t('results.maskOverlay')}
                </button>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16, minWidth: 160 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{t('results.opacity')}</span>
                  <input
                    type="range" min={0.1} max={1} step={0.05} value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--primary)', height: 6 }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--primary)', width: 40, textAlign: 'right' }}>{Math.round(opacity * 100)}%</span>
                </div>

                <div style={{ borderLeft: '1.5px solid var(--border)', paddingLeft: 20, display: 'flex', gap: 8 }}>
                  <button 
                    className="btn btn-ghost" 
                    style={{ padding: 10, borderRadius: 12 }}
                    onClick={() => {
                      const el = document.getElementById('viewers-container');
                      if (document.fullscreenElement) {
                        document.exitFullscreen();
                      } else if (el) {
                        el.requestFullscreen();
                      }
                    }}
                    title={t('results.fullscreen')}
                  >
                    <Maximize size={18} />
                  </button>
                  <button 
                    className="btn btn-ghost" 
                    style={{ 
                      padding: 10, borderRadius: 12,
                      background: isMeasuring ? 'var(--primary)' : 'transparent',
                      color: isMeasuring ? 'white' : 'inherit'
                    }}
                    onClick={() => setIsMeasuring(!isMeasuring)}
                    title="O'lchash"
                  >
                    <Ruler size={18} />
                  </button>
                </div>
              </div>

              {/* Image Viewers */}
              <div id="viewers-container" className="viewers-grid" style={{ backgroundColor: 'var(--bg-base)' }}>
                {/* Original */}
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
                    <div style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', padding: '6px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Scan size={12} className="text-primary" />
                      <span style={{ color: 'white', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('results.originalSource')}</span>
                    </div>
                  </div>
                  <div style={{ background: '#000', borderRadius: 32, overflow: 'hidden', border: '2px solid var(--border)', aspectRatio: '1/1', position: 'relative' }}>
                    <SecureImage src={`/studies/${studyId}/image`} alt="Original MRI" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    <MeasurementTool isActive={isMeasuring} />
                  </div>
                </div>

                {/* AI Overlay */}
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
                    <div style={{ background: 'rgba(37,99,235,0.75)', backdropFilter: 'blur(12px)', padding: '6px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Brain size={12} style={{ color: 'white' }} />
                      <span style={{ color: 'white', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('results.aiMapping')}</span>
                    </div>
                  </div>
                  <div style={{ background: '#000', borderRadius: 32, overflow: 'hidden', border: '2px solid var(--border)', aspectRatio: '1/1', position: 'relative' }}>
                    {result.overlay_image_url ? (
                      <SecureImage
                        src={`/results/${result.id}/overlay`}
                        alt="Overlay"
                        style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: showMask ? opacity : 0.15 }}
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontWeight: 700 }}>{t('results.mapNotGenerated')}</div>
                    )}
                    {showMask && (
                      <div style={{ position: 'absolute', bottom: 16, right: 16, background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: 6, color: 'white', fontSize: 10, fontWeight: 900 }}>
                        {result.tumor_present ? t('results.pathologyDetected') : t('results.cleanScan')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="card" style={{ borderRadius: 32, padding: 32 }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'Outfit, sans-serif' }}>
                  <Activity size={22} className="text-primary" /> {t('results.aiMetrics')}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {metricItems.map((m, i) => (
                    <div key={i} className="metric-row-premium" style={{
                      padding: '18px 20px', background: 'var(--bg-base)', borderRadius: 20,
                      border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16,
                      transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
                    }}>
                      <div style={{
                        color: `var(--${m.color})`, background: `var(--${m.color}-light-alpha)`,
                        width: 44, height: 44, borderRadius: 14,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>{m.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{m.label}</div>
                        <div style={{ fontSize: 17, fontWeight: 950, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>
                          {m.label === t('results.validationStatus') ? (
                            <span className={`badge ${validationBadge[m.value] || 'badge-gray'}`} style={{ borderRadius: 8, fontSize: 11 }}>
                              {t(`status.${m.value}`) || m.value?.toUpperCase()}
                            </span>
                          ) : m.value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Validation */}
              {['admin', 'radiologist', 'doctor'].includes(user?.role) && (
                <div className="card" style={{ borderRadius: 28, padding: 32 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Outfit, sans-serif' }}>
                    <Thermometer size={20} className="text-green" /> {t('results.expertConclusion')}
                  </h2>
                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label className="form-label" style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>{t('results.clinicalNotes')}</label>
                    <textarea
                      className="form-input"
                      style={{ borderRadius: 16, padding: '16px', height: 110, resize: 'none', background: 'var(--bg-base)', fontWeight: 600, fontSize: 14 }}
                      value={validationNotes}
                      onChange={(e) => setValidationNotes(e.target.value)}
                      placeholder={t('results.clinicalPlaceholder')}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <button
                      className="btn"
                      style={{ height: 50, borderRadius: 14, background: 'var(--green)', color: 'white', border: 'none', fontWeight: 900, fontSize: 14, boxShadow: '0 8px 20px rgba(16,185,129,0.25)' }}
                      onClick={() => validateMutation.mutate({ status: 'approved', notes: validationNotes })}
                      disabled={validateMutation.isPending}
                    >
                      {t('results.validate')}
                    </button>
                    <button
                      className="btn"
                      style={{ height: 50, borderRadius: 14, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1.5px solid rgba(239,68,68,0.25)', fontWeight: 900, fontSize: 14 }}
                      onClick={() => validateMutation.mutate({ status: 'rejected', notes: validationNotes })}
                      disabled={validateMutation.isPending}
                    >
                      {t('results.reject')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .viewers-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .metric-row-premium:hover { transform: translateX(6px); border-color: var(--primary-light); background: var(--bg-surface); }
        @media (max-width: 768px) {
          .viewers-grid { grid-template-columns: 1fr; }
          .results-header { flex-direction: column; }
        }
      `}</style>
    </div>
  )
}
