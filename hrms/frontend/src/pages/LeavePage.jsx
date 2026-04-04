import { useState, useEffect } from 'react'
import { Calendar, Plus, Check, X, AlertTriangle } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  )
}

const statusColors = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' }

export default function LeavePage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [employees, setEmployees] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [tab, setTab] = useState('requests')
  const [form, setForm] = useState({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' })
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1)
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calEvents, setCalEvents] = useState([])

  const load = () => {
    api.get('/leave/requests').then(r => setRequests(r.data))
    api.get('/leave/types').then(r => setLeaveTypes(r.data))
    api.get('/employees').then(r => setEmployees(r.data))
  }

  const loadCalendar = () => {
    api.get(`/leave/calendar?month=${calMonth}&year=${calYear}`).then(r => setCalEvents(r.data))
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (tab === 'calendar') loadCalendar() }, [tab, calMonth, calYear])

  const submitLeave = async (e) => {
    e.preventDefault()
    try {
      const res = await api.post('/leave/requests', { ...form, employee_id: parseInt(form.employee_id), leave_type_id: parseInt(form.leave_type_id) })
      toast.success('Leave request submitted!')
      if (res.data.ai_flag) toast(res.data.ai_flag, { icon: '⚠️', duration: 5000 })
      setShowAdd(false)
      setForm({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' })
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const handleApproval = async (id, status) => {
    const comment = status === 'rejected' ? prompt('Rejection reason:') : ''
    try {
      await api.put(`/leave/requests/${id}/approve`, { status, comment })
      toast.success(`Leave ${status}!`)
      load()
    } catch { toast.error('Failed') }
  }

  const days = (r) => {
    if (!r.start_date || !r.end_date) return 0
    const s = new Date(r.start_date), e = new Date(r.end_date)
    return Math.ceil((e - s) / 86400000) + 1
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-500 text-sm">{requests.filter(r => r.status === 'pending').length} pending requests</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Request Leave
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {['requests', 'calendar'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'requests' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Employee', 'Type', 'Dates', 'Days', 'Reason', 'Status', 'AI Flag', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {requests.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No leave requests</td></tr>
              ) : requests.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.employee_name || `Emp #${r.employee_id}`}</td>
                  <td className="px-4 py-3 capitalize">{r.leave_type}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.start_date} → {r.end_date}</td>
                  <td className="px-4 py-3">{days(r)}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{r.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusColors[r.status]}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {r.ai_flag && <span title={r.ai_flag}><AlertTriangle size={16} className="text-amber-500" /></span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => handleApproval(r.id, 'approved')} className="p-1 rounded bg-green-50 hover:bg-green-100 text-green-600">
                          <Check size={14} />
                        </button>
                        <button onClick={() => handleApproval(r.id, 'rejected')} className="p-1 rounded bg-red-50 hover:bg-red-100 text-red-600">
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'calendar' && (
        <div className="card">
          <div className="flex items-center gap-4 mb-6">
            <select className="input w-auto" value={calMonth} onChange={e => setCalMonth(+e.target.value)}>
              {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{new Date(2024, i).toLocaleString('default', {month: 'long'})}</option>)}
            </select>
            <select className="input w-auto" value={calYear} onChange={e => setCalYear(+e.target.value)}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {calEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No approved leaves this month</div>
          ) : (
            <div className="space-y-2">
              {calEvents.map((e, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs">
                    {e.employee_name?.[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{e.employee_name}</p>
                    <p className="text-xs text-gray-500">{e.start_date} → {e.end_date}</p>
                  </div>
                  <span className="badge bg-blue-100 text-blue-700 capitalize">{e.leave_type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <Modal title="Request Leave" onClose={() => setShowAdd(false)}>
          <form onSubmit={submitLeave} className="space-y-4">
            <div>
              <label className="label">Employee <span className="text-red-500">*</span></label>
              <select className="input" value={form.employee_id} onChange={e => setForm(p => ({...p, employee_id: e.target.value}))} required>
                <option value="">Select employee...</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Leave Type <span className="text-red-500">*</span></label>
              <select className="input" value={form.leave_type_id} onChange={e => setForm(p => ({...p, leave_type_id: e.target.value}))} required>
                <option value="">Select type...</option>
                {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.default_days} days/year)</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Start Date <span className="text-red-500">*</span></label>
                <input type="date" className="input" value={form.start_date} onChange={e => setForm(p => ({...p, start_date: e.target.value}))} required />
              </div>
              <div>
                <label className="label">End Date <span className="text-red-500">*</span></label>
                <input type="date" className="input" value={form.end_date} onChange={e => setForm(p => ({...p, end_date: e.target.value}))} required />
              </div>
            </div>
            <div>
              <label className="label">Reason <span className="text-red-500">*</span></label>
              <textarea className="input resize-none" rows={3} value={form.reason} onChange={e => setForm(p => ({...p, reason: e.target.value}))} required />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1">Submit</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
