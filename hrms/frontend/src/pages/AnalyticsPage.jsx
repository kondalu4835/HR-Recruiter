import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { Bot, RefreshCw } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

function ChartCard({ title, children }) {
  return (
    <div className="card">
      <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
      {children}
    </div>
  )
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState(null)
  const [headcount, setHeadcount] = useState([])
  const [tenure, setTenure] = useState([])
  const [leaveUtil, setLeaveUtil] = useState(null)
  const [openFilled, setOpenFilled] = useState(null)
  const [attrition, setAttrition] = useState([])
  const [summary, setSummary] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    api.get('/analytics/overview').then(r => setOverview(r.data)).catch(() => {})
    api.get('/analytics/headcount-by-department').then(r => setHeadcount(r.data)).catch(() => {})
    api.get('/analytics/average-tenure').then(r => setTenure(r.data)).catch(() => {})
    api.get('/analytics/leave-utilisation').then(r => setLeaveUtil(r.data)).catch(() => {})
    api.get('/analytics/open-vs-filled').then(r => setOpenFilled(r.data)).catch(() => {})
    api.get('/analytics/attrition-trend').then(r => setAttrition(r.data)).catch(() => {})
  }, [])

  const generateSummary = async () => {
    setSummaryLoading(true)
    try {
      const res = await api.get('/ai/hr-monthly-summary')
      setSummary(res.data.summary)
    } catch { toast.error('Failed to generate summary') }
    finally { setSummaryLoading(false) }
  }

  const StatCard = ({ label, value, sub, color }) => (
    <div className={`rounded-xl p-5 ${color}`}>
      <p className="text-3xl font-bold">{value ?? '—'}</p>
      <p className="font-medium mt-1">{label}</p>
      {sub && <p className="text-sm opacity-75 mt-0.5">{sub}</p>}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">HR Analytics</h1>
        <p className="text-gray-500 text-sm">Data insights across your workforce</p>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Employees" value={overview.total_employees} color="bg-blue-50 text-blue-900" />
          <StatCard label="Active" value={overview.active_employees} color="bg-green-50 text-green-900" />
          <StatCard label="Open Positions" value={overview.open_positions} color="bg-purple-50 text-purple-900" />
          <StatCard label="Attrition Rate" value={`${overview.attrition_rate}%`} color="bg-orange-50 text-orange-900" />
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Headcount by Department">
          {headcount.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={headcount} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-56 flex items-center justify-center text-gray-400 text-sm">No data yet</div>}
        </ChartCard>

        <ChartCard title="Average Tenure by Department (years)">
          {tenure.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tenure} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="avg_tenure_years" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-56 flex items-center justify-center text-gray-400 text-sm">No data yet</div>}
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Open vs Filled Positions">
          {openFilled ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Open', value: openFilled.open },
                      { name: 'Filled', value: openFilled.filled },
                    ]}
                    cx="50%" cy="50%" outerRadius={70}
                    dataKey="value" label={({ name, value }) => `${name}: ${value}`}
                  >
                    <Cell fill="#8b5cf6" />
                    <Cell fill="#10b981" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-6 mt-2 text-sm">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block" /> Open: {openFilled.open}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Filled: {openFilled.filled}</span>
              </div>
            </div>
          ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>}
        </ChartCard>

        <ChartCard title="Leave Utilisation">
          {leaveUtil ? (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-blue-600">{leaveUtil.utilisation_rate}%</p>
                <p className="text-sm text-gray-500 mt-1">Overall utilisation this year</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Used days</span>
                  <span className="font-medium">{leaveUtil.used_days}</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(leaveUtil.utilisation_rate, 100)}%` }} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total allocated</span>
                  <span className="font-medium">{leaveUtil.total_days}</span>
                </div>
              </div>
            </div>
          ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>}
        </ChartCard>

        <ChartCard title="Attrition Trend">
          {attrition.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={attrition} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No attrition data yet</div>}
        </ChartCard>
      </div>

      {/* AI Summary */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-blue-600" />
            <h3 className="font-semibold text-gray-900">AI-Generated Monthly HR Summary</h3>
          </div>
          <button onClick={generateSummary} disabled={summaryLoading} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} className={summaryLoading ? 'animate-spin' : ''} />
            {summaryLoading ? 'Generating...' : 'Generate Summary'}
          </button>
        </div>
        {summary ? (
          <div className="bg-blue-50 rounded-xl p-5 text-sm text-gray-700 whitespace-pre-line leading-relaxed">
            {summary}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400">
            <Bot size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Click "Generate Summary" to get an AI-powered HR insights report</p>
          </div>
        )}
      </div>
    </div>
  )
}
