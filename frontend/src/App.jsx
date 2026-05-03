import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './i18n/index.js'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PatientsPage from './pages/PatientsPage'
import PatientDetailPage from './pages/PatientDetailPage'
import UploadPage from './pages/UploadPage'
import ResultsPage from './pages/ResultsPage'
import AdminPage from './pages/AdminPage'
import { useThemeStore } from './store/themeStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Initialize theme on app load
useThemeStore.getState().initTheme()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="patients" element={<PatientsPage />} />
            <Route path="patients/:patientId" element={<PatientDetailPage />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="results/:studyId" element={<ResultsPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            backdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '16px 24px',
            fontSize: '15px',
            fontWeight: '700',
            fontFamily: 'Outfit, sans-serif',
            boxShadow: 'var(--shadow-lg)',
          },
          success: {
            iconTheme: {
              primary: 'var(--success)',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--danger)',
              secondary: 'white',
            },
          },
        }}
      />
    </QueryClientProvider>
  )
}
