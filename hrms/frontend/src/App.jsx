import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import EmployeesPage from './pages/EmployeesPage'
import EmployeeDetailPage from './pages/EmployeeDetailPage'
import RecruitmentPage from './pages/RecruitmentPage'
import JobDetailPage from './pages/JobDetailPage'
import LeavePage from './pages/LeavePage'
import AttendancePage from './pages/AttendancePage'
import PerformancePage from './pages/PerformancePage'
import OnboardingPage from './pages/OnboardingPage'
import AnalyticsPage from './pages/AnalyticsPage'
import OrgChartPage from './pages/OrgChartPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="employees/:id" element={<EmployeeDetailPage />} />
          <Route path="org-chart" element={<OrgChartPage />} />
          <Route path="recruitment" element={<RecruitmentPage />} />
          <Route path="recruitment/jobs/:id" element={<JobDetailPage />} />
          <Route path="leave" element={<LeavePage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="performance" element={<PerformancePage />} />
          <Route path="onboarding" element={<OnboardingPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
