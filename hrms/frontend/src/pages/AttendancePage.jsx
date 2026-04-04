import { useState, useEffect } from 'react'
import { UserCheck } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const statusColors = {
  present: 'bg-green-100 text-green-700',
  wfh: 'bg-blue-100 text-blue-700',
  half_day: 'bg-yellow-100 text-yellow-700',
  absent: 'bg-red-100 text-red-700',
}

export default function AttendancePage() {
  const [employees, setEmployees] = useState([])
  const [selectedEmp, setSelectedEmp] = useState('')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [attendance, setAttendance] = useState([])
  const [summary, setSummary] = useState(null)
  const [markForm, setMarkForm] = useState({ employee_id: '', date: new Date().toISOString().split('T')[0], status: 'present', check_in: '', check_out: '' })

  useEffect(() => { api.get('/employees').then(r => setEmployees(r.data)) }, [])

  const loadAttendance = () => {
    if (!selectedEmp) return
    api.get(`/leave/attendance/${selectedEmp}?month=${month}&year=${year}`).then(r => setAttendance(r.data))
    api.get(`/leave/attendance-summary/${selectedEmp}?month=${month}&year=${year}`).then(r => setSummary(r.data))
  }

  useEffect(() => { loadAttendance() }, [selectedEmp, month, year])

  const markAttendance = async (e) => {
    e.preventDefault()
    try {
      await api.post('/leave/attendance', { ...markForm, employee_id: parseInt(markForm.employee_id) })
      toast.success('Attendance marked!')
      if (markForm.employee_id === selectedEmp) loadAttendance()
    } catch { toast.error('Failed') }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-500 text-sm">Track and manage employee attendance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mark Attendance */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserCheck size={18} className="text-blue-600" /> Mark Attendance
          </h2>
          <form onSubmit={markAttendance} className="space-y-3">
            <div>
              <label className="label">Employee</label>
              <select className="input" value={markForm.employee_id} onChange={e => setMarkForm(p => ({...p, employee_id: e.target.value}))} required>
                <option value="">Select...</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={markForm.date} onChange={e => setMarkForm(p => ({...p, date: e.target.value}))} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={markForm.status} onChange={e => setMarkForm(p => ({...p, status: e.target.value}))}>
                <option value="present">Present</option>
                <option value="wfh">WFH</option>
                <option value="half_day">Half Day</option>
                <option value="absent">Absent</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Check In</label>
                <input type="time" className="input" value={markForm.check_in} onChange={e => setMarkForm(p => ({...p, check_in: e.target.value}))} />
              </div>
              <div>
                <label className="label">Check Out</label>
                <input type="time" className="input" value={markForm.check_out} onChange={e => setMarkForm(p => ({...p, check_out: e.target.value}))} />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full">Mark Attendance</button>
          </form>
        </div>

        {/* View Attendance */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-3 flex-wrap">
            <select className="input flex-1 min-w-32" value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}>
              <option value="">Select employee to view...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select className="input w-auto" value={month} onChange={e => setMonth(+e.target.value)}>
              {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{new Date(2024, i).toLocaleString('default', {month: 'long'})}</option>)}
            </select>
            <select className="input w-auto" value={year} onChange={e => setYear(+e.target.value)}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {summary && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Present', key: 'present', color: 'bg-green-50 text-green-700' },
                { label: 'WFH', key: 'wfh', color: 'bg-blue-50 text-blue-700' },
                { label: 'Half Day', key: 'half_day', color: 'bg-yellow-50 text-yellow-700' },
                { label: 'Absent', key: 'absent', color: 'bg-red-50 text-red-700' },
              ].map(s => (
                <div key={s.key} className={`rounded-xl p-4 text-center ${s.color}`}>
                  <p className="text-2xl font-bold">{summary[s.key]}</p>
                  <p className="text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Check In</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Check Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {!selectedEmp ? (
                  <tr><td colSpan={4} className="text-center py-10 text-gray-400">Select an employee to view attendance</td></tr>
                ) : attendance.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-10 text-gray-400">No records for this period</td></tr>
                ) : attendance.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{a.date}</td>
                    <td className="px-4 py-3">
                      <span className={`badge capitalize ${statusColors[a.status] || 'bg-gray-100 text-gray-600'}`}>{a.status?.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{a.check_in || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{a.check_out || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
