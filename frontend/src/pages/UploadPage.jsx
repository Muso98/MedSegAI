import React, { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useDropzone } from 'react-dropzone'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { patientsAPI, studiesAPI } from '@/api/client'
import toast from 'react-hot-toast'
import { 
  UploadCloud, FileText, User, File, 
  CheckCircle, Play, X, 
  Loader2, Microscope, Sparkles, ShieldCheck, Zap
} from 'lucide-react'

export default function UploadPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedPatient, setSelectedPatient] = useState('')
  const [title, setTitle] = useState('')
  const [uploadedStudy, setUploadedStudy] = useState(null)

  const { data: patients } = useQuery({
    queryKey: ['patients-list-upload'],
    queryFn: () => patientsAPI.list({ page: 1, page_size: 100 }).then(r => r.data.items),
  })

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) setSelectedFile(acceptedFiles[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: false,
    accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'application/octet-stream': ['.nii', '.gz'] },
    maxSize: 500 * 1024 * 1024,
  })

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('patient_id', selectedPatient)
      if (title) formData.append('title', title)
      return studiesAPI.upload(formData).then(r => r.data)
    },
    onSuccess: (study) => {
      setUploadedStudy(study)
      toast.success(t('upload.uploadSuccess'))
    },
    onError: (err) => toast.error(err.response?.data?.detail || t('common.error')),
  })

  const segmentMutation = useMutation({
    mutationFn: () => studiesAPI.segment(uploadedStudy.id).then(r => r.data),
    onSuccess: () => {
      toast.success(t('upload.processing'))
      navigate(`/patients/${uploadedStudy.patient_id}`)
    },
    onError: (err) => toast.error(err.response?.data?.detail || t('common.error')),
  })

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="page-content animate-fade-in">
      <div style={{ marginBottom: 40 }}>
        <h1 className="page-title" style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, letterSpacing: '-0.04em', fontFamily: 'Outfit, sans-serif' }}>
          {t('upload.title')}
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 500, opacity: 0.6 }}>
          {t('upload.subtitle')}
        </p>
      </div>

      <div className="dashboard-grid">
        {/* Left: Config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Patient Select */}
          <div className="card" style={{ borderRadius: '28px', padding: '32px' }}>
            <h2 style={{ fontSize:18, fontWeight:900, marginBottom:24, display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'Outfit, sans-serif' }}>
              <User size={20} className="text-primary" /> {t('upload.patientSection')}
            </h2>
            
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">{t('upload.selectPatient')}</label>
              <select
                className="form-input"
                style={{ height: 52, borderRadius: 14, fontSize: 15, fontWeight: 600 }}
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                required
              >
                <option value="">{t('upload.selectPatient')}</option>
                {patients?.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name} ({p.patient_id})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('upload.title_field')}</label>
              <input
                type="text" className="form-input"
                style={{ height: 52, borderRadius: 14, fontSize: 15, fontWeight: 600 }}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('upload.titlePlaceholder')}
              />
            </div>
          </div>

          {/* File Upload */}
          <div className="card" style={{ borderRadius: '28px', padding: '32px' }}>
            <h2 style={{ fontSize:18, fontWeight:900, marginBottom:24, display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'Outfit, sans-serif' }}>
              <File size={20} className="text-primary" /> {t('upload.fileSection')}
            </h2>
            
            <div
              {...getRootProps()}
              style={{
                border: isDragActive ? '2px solid var(--primary)' : '2px dashed var(--border)',
                borderRadius: '20px', padding: '48px 24px', textAlign: 'center',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                background: isDragActive ? 'var(--primary-light-alpha)' : 'var(--bg-base)',
                cursor: 'pointer',
                transform: isDragActive ? 'scale(1.02)' : 'scale(1)'
              }}
            >
              <input {...getInputProps()} />
              <div style={{ width: 72, height: 72, borderRadius: '20px', background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 12px 24px var(--accent-glow)' }}>
                <UploadCloud size={32} />
              </div>
              <p style={{ fontSize:17, fontWeight:900, color:'var(--text-primary)', marginBottom: 8, fontFamily: 'Outfit, sans-serif' }}>
                {isDragActive ? t('upload.dropzone').split(' ').slice(0,2).join(' ') : t('upload.dropzone')}
              </p>
              <p style={{ fontSize:13, color:'var(--text-muted)', fontWeight: 500, maxWidth: '260px', margin: '0 auto' }}>
                {t('upload.formats')} · {t('upload.maxSize')}
              </p>
            </div>

            {selectedFile && (
              <div className="animate-slide-up" style={{ marginTop: 20, padding: '16px 20px', background: 'var(--bg-base)', borderRadius: '16px', border: '1px solid var(--primary-light-alpha)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'var(--primary-light-alpha)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                    {formatSize(selectedFile.size)}
                  </div>
                </div>
                <button style={{ background: 'var(--bg-elevated)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null) }}>
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Action Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div className="card" style={{ borderRadius: '28px', padding: '32px', border: uploadedStudy ? '2px solid var(--green)' : '1px solid var(--border)' }}>
            <h2 style={{ fontSize:18, fontWeight:900, marginBottom:24, display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'Outfit, sans-serif' }}>
              <Zap size={20} className="text-primary" /> {t('upload.infoSection')}
            </h2>

            {!uploadedStudy ? (
              <button
                className="btn btn-primary"
                style={{ height: 60, fontSize: 17, borderRadius: 18, fontWeight: 900, width: '100%' }}
                onClick={() => uploadMutation.mutate()}
                disabled={!selectedFile || !selectedPatient || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <><Loader2 className="animate-spin" size={20} /> {t('upload.uploading')}</>
                ) : (
                  <><UploadCloud size={20} /> {t('upload.segment')}</>
                )}
              </button>
            ) : (
              <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ padding: 20, background: 'var(--green-light-alpha)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: 14, border: '1px solid rgba(16,185,129,0.2)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--green)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--green)', fontSize: 15 }}>{t('upload.uploadSuccess')}</div>
                    <div style={{ fontSize: 12, color: 'var(--green)', opacity: 0.8, fontWeight: 600 }}>ID: {uploadedStudy.id.slice(0,8)}</div>
                  </div>
                </div>
                
                <button
                  className="btn"
                  style={{ height: 60, fontSize: 17, borderRadius: 18, fontWeight: 900, background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: 'white', border: 'none', boxShadow: '0 16px 32px var(--accent-glow)', width: '100%' }}
                  onClick={() => segmentMutation.mutate()}
                  disabled={segmentMutation.isPending}
                >
                  {segmentMutation.isPending
                    ? <><Loader2 className="animate-spin" size={20} /> {t('common.loading')}</>
                    : <><Microscope size={20} /> {t('upload.segment')}</>}
                </button>
              </div>
            )}

            {/* Features */}
            <div style={{ marginTop: 32, padding: 24, background: 'var(--bg-base)', borderRadius: '20px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize:14, fontWeight:900, color:'var(--text-primary)', marginBottom:16, display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Outfit, sans-serif' }}>
                <Sparkles size={16} className="text-primary" /> {t('upload.infoSection')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { icon: <ShieldCheck size={15} />, label: t('admin.roles.admin'), desc: t('login.securityNote').slice(0, 40) + '...' },
                  { icon: <Zap size={15} />, label: 'GPU Cloud', desc: 'RTX 4060 · 2-5s' },
                  { icon: <Sparkles size={15} />, label: 'AI Model', desc: '99.4% ' + t('dashboard.accuracy') },
                ].map((f, i) => (
                  <div key={i} style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                    <div style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }}>{f.icon}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>{f.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
