import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { patientsAPI } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { 
  Search, Plus, Eye, Pencil, Trash2, 
  ChevronLeft, ChevronRight, UserPlus,
  Loader2, X, FileText, Activity
} from 'lucide-react'

const initialForm = {
  full_name: '', patient_id: '', date_of_birth: '',
  gender: '', phone: '', address: '', notes: '',
}

export default function PatientsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const canEdit = ['admin','doctor','operator'].includes(user?.role)

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editPatient, setEditPatient] = useState(null)
  const [form, setForm] = useState(initialForm)

  const { data, isLoading } = useQuery({
    queryKey: ['patients', page, debouncedSearch],
    queryFn: () => patientsAPI.list({ page, page_size: 20, search: debouncedSearch || undefined }).then(r => r.data),
    placeholderData: (prev) => prev
  })

  const handleSearch = (e) => {
    setSearch(e.target.value)
    clearTimeout(window._searchTimer)
    window._searchTimer = setTimeout(() => {
      setDebouncedSearch(e.target.value)
      setPage(1)
    }, 400)
  }

  const openCreate = () => { setForm(initialForm); setEditPatient(null); setShowModal(true) }
  const openEdit = (p) => {
    setForm({
      full_name: p.full_name, patient_id: p.patient_id,
      date_of_birth: p.date_of_birth || '', gender: p.gender || '',
      phone: p.phone || '', address: p.address || '', notes: p.notes || '',
    })
    setEditPatient(p)
    setShowModal(true)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = { ...form, date_of_birth: form.date_of_birth || null, gender: form.gender || null }
      if (editPatient) return patientsAPI.update(editPatient.id, body)
      return patientsAPI.create(body)
    },
    onSuccess: () => {
      qc.invalidateQueries(['patients'])
      setShowModal(false)
      toast.success(t('common.success'))
    },
    onError: (err) => toast.error(err.response?.data?.detail || t('common.error')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => patientsAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries(['patients']); toast.success(t('common.success')) },
    onError: (err) => toast.error(err.response?.data?.detail || t('common.error')),
  })

  return (
    <div className="page-content animate-fade-in">
      <div className="page-header" style={{ marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 900, letterSpacing: '-0.04em', fontFamily: 'Outfit, sans-serif' }}>
            {t('patients.title')}
          </h1>
          <p style={{ fontSize: '15px', fontWeight: 500, opacity: 0.6 }}>
            {data?.total ?? 0} {t('patients.subtitle')}
          </p>
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap: 'wrap', width: '100%' }}>
          <div className="search-container" style={{ 
            background: 'var(--bg-card)', border: '1px solid var(--border)', 
            borderRadius: '16px', minWidth: 200, maxWidth: 320, padding: '0 18px', height: '48px',
            display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-sm)',
          }}>
            <Search size={18} className="text-muted" style={{ flexShrink: 0 }} />
            <input
              style={{ background: 'transparent', border: 'none', width: '100%', fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}
              placeholder={t('patients.search')}
              value={search}
              onChange={handleSearch}
            />
          </div>
          {canEdit && (
            <button className="btn btn-primary" onClick={openCreate} style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 800, gap: 8 }}>
              <UserPlus size={18} /> <span className="hide-xs">{t('patients.addPatient')}</span>
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, borderRadius: '28px', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>{t('patients.id')}</th>
                <th>{t('patients.name')}</th>
                <th className="hide-mobile">{t('patients.dob')}</th>
                <th className="hide-mobile">{t('patients.gender')}</th>
                <th>{t('patients.studies')}</th>
                <th style={{ textAlign: 'right' }}>{t('patients.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} style={{ textAlign:'center', padding: 64 }}>
                  <Activity className="animate-spin text-primary" size={32} style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{t('patients.loading')}</div>
                </td></tr>
              )}
              {!isLoading && !data?.items?.length && (
                <tr><td colSpan={6} style={{ textAlign:'center', padding: 64, opacity: 0.5, fontWeight: 700 }}>
                  {t('patients.noPatients')}
                </td></tr>
              )}
              {data?.items?.map((p) => (
                <tr key={p.id} className="hover-row">
                  <td>
                    <code style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{p.patient_id}</code>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--primary-light-alpha)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, flexShrink: 0 }}>
                        {p.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 14 }}>{p.full_name}</span>
                    </div>
                  </td>
                  <td className="hide-mobile" style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: 14 }}>
                    {p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString() : '—'}
                  </td>
                  <td className="hide-mobile">
                    <span className="badge badge-gray" style={{ borderRadius: 8, padding: '4px 10px', fontWeight: 700 }}>
                      {p.gender ? t(`patients.${p.gender}`).toUpperCase() : t('patients.unknown').toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FileText size={14} className="text-primary" />
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{p.study_count}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" style={{ borderRadius: 10, width: 36, height: 36, padding: 0 }} onClick={() => navigate(`/patients/${p.id}`)}>
                        <Eye size={16} />
                      </button>
                      {canEdit && (
                        <>
                          <button className="btn btn-ghost btn-sm" style={{ borderRadius: 10, width: 36, height: 36, padding: 0 }} onClick={() => openEdit(p)}>
                            <Pencil size={16} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ borderRadius: 10, width: 36, height: 36, padding: 0, color:'var(--red)' }}
                            onClick={() => { if (window.confirm(t('patients.deleteConfirm'))) deleteMutation.mutate(p.id) }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div style={{ display:'flex', justifyContent:'center', alignItems: 'center', gap:16, marginTop:32 }}>
          <button className="btn btn-ghost" style={{ borderRadius: 12, height: 44, padding: '0 20px', fontWeight: 700 }}
            disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft size={18} /> <span className="hide-xs">{t('patients.prev')}</span>
          </button>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{t('common.page')} {page} {t('common.of')} {data.pages}</span>
          <button className="btn btn-ghost" style={{ borderRadius: 12, height: 44, padding: '0 20px', fontWeight: 700 }}
            disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>
            <span className="hide-xs">{t('patients.next')}</span> <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px', width: '100%' }}>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>
                {editPatient ? t('patients.editPatient') : t('patients.createPatient')}
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-muted)', marginTop: 8, fontWeight: 500 }}>
                {t('patients.clinicalFill')}
              </p>
            </div>
            
            <div style={{ display:'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
              <div className="form-group">
                <label className="form-label">{t('patients.fullName')}</label>
                <input type="text" className="form-input" style={{ height: 52, borderRadius: 14, fontWeight: 600 }}
                  value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder={t('patients.namePlaceholder')} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('patients.patientIdField')}</label>
                <input type="text" className="form-input" style={{ height: 52, borderRadius: 14, fontWeight: 600 }}
                  value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                  disabled={!!editPatient} placeholder={t('patients.idPlaceholder')} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('patients.dobField')}</label>
                <input type="date" className="form-input" style={{ height: 52, borderRadius: 14, fontWeight: 600 }}
                  value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('patients.gender')}</label>
                <select className="form-input" style={{ height: 52, borderRadius: 14, fontWeight: 600 }}
                  value={form.gender} onChange={(e) => setForm({...form, gender:e.target.value})}>
                  <option value="">{t('patients.genderSelect')}</option>
                  <option value="male">{t('patients.male')}</option>
                  <option value="female">{t('patients.female')}</option>
                  <option value="other">{t('patients.other')}</option>
                </select>
              </div>
            </div>
            
            <div className="form-group" style={{ marginTop: 24 }}>
              <label className="form-label">{t('patients.notes')}</label>
              <textarea className="form-input" style={{ borderRadius: 14, padding: '16px', minHeight: 100, fontWeight: 500 }}
                rows={3} value={form.notes} onChange={(e) => setForm({...form, notes:e.target.value})}
                placeholder={t('patients.notesPlaceholder')} />
            </div>
            
            <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop: 36 }}>
              <button className="btn btn-ghost" style={{ height: 52, padding: '0 28px', borderRadius: 14, fontWeight: 700 }} onClick={() => setShowModal(false)}>
                {t('common.cancel')}
              </button>
              <button
                className="btn btn-primary"
                style={{ height: 52, padding: '0 36px', borderRadius: 14, fontWeight: 900 }}
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !form.full_name || !form.patient_id}
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
