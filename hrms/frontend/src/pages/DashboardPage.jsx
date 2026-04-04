import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Briefcase, Calendar, TrendingUp, Bot, RefreshCw } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

function StatCard({ icon: Icon, label, value, color, to }) {
  const content = (
    <div className={`card flex items-center gap-4 hover:shadow-md transition-shadow`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
  return to ? <Link to={to}>{content}</Link> : content
}

export default function DashboardPage() {
  const [overview, setOverview] = useState(null)
  const [summary, setSummary] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    api.get('/analytics/overview').then(r => setOverview(r.data)).catch(() => {})
  }, [])

  const generateSummary = async () => {
    setSummaryLoading(true)
    try {
      const res = await api.get('/ai/hr-monthly-summary')
      setSummary(res.data.summary)
    } catch {
      toast.error('Failed to generate summary')
    } finally {
      setSummaryLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm">Welcome to your AI-powered HR Management System</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Employees" value={overview?.total_employees} color="bg-blue-500" to="/employees" />
        <StatCard icon={Users} label="Active Employees" value={overview?.active_employees} color="bg-green-500" to="/employees" />
        <StatCard icon={Briefcase} label="Open Positions" value={overview?.open_positions} color="bg-purple-500" to="/recruitment" />
        <StatCard icon={TrendingUp} label="Attrition Rate" value={overview ? `${overview.attrition_rate}%` : null} color="bg-orange-500" to="/analytics" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bot size={20} className="text-blue-600" />
              <h2 className="font-semibold text-gray-900">AI Monthly HR Summary</h2>
            </div>
            <button onClick={generateSummary} disabled={summaryLoading} className="btn-secondary flex items-center gap-2 text-sm">
              <RefreshCw size={14} className={summaryLoading ? 'animate-spin' : ''} />
              {summaryLoading ? 'Generating...' : 'Generate'}
            </button>
          </div>
          {summary ? (
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{summary}</p>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Bot size={40} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Click "Generate" to get an AI-powered HR summary</p>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Add Employee', to: '/employees', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
              { label: 'Post Job', to: '/recruitment', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
              { label: 'Leave Requests', to: '/leave', color: 'bg-green-50 text-green-700 hover:bg-green-100' },
              { label: 'Mark Attendance', to: '/attendance', color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
              { label: 'Performance Review', to: '/performance', color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
              { label: 'Analytics', to: '/analytics', color: 'bg-pink-50 text-pink-700 hover:bg-pink-100' },
            ].map(({ label, to, color }) => (
              <Link key={to} to={to} className={`${color} rounded-lg p-3 text-sm font-medium transition-colors text-center`}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
