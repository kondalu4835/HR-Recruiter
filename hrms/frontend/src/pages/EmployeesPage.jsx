import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Download, AlertCircle, X } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  )
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState('')
  const [departments, setDepartments] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [flags, setFlags] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    employee_code: '', name: '', email: '', phone: '', designation: '', department: '', joining_date: '', skills: '', salary: ''
  })

  const load = () => {
    setLoading(true)
    const params = {}
    if (search) params.search = search
    if (dept) params.department = dept
    api.get('/employees', { params }).then(r => setEmployees(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => {
    api.get('/employees/departments').then(r => setDepartments(r.data)).catch(() => {})
  }, [])

  useEffect(() => { load() }, [search, dept])

  const handleAdd = async (e) => {
    e.preventDefault()
    try {
      await api.post('/employees', { ...form, salary: form.salary ? parseFloat(form.salary) : null })
      toast.success('Employee added!')
      setShowAdd(false)
      setForm({ employee_code: '', name: '', email: '', phone: '', designation: '', department: '', joining_date: '', skills: '', salary: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add employee')
    }
  }

  const checkDuplicates = async () => {
    try {
      const res = await api.get('/ai/check-profiles')
      setFlags(res.data.flagged_profiles)
      if (res.data.flagged_profiles.length === 0) toast.success('No issues found!')
    } catch { toast.error('Check failed') }
  }

  // ✅ Updated exportCSV function with authentication
  const exportCSV = async () => {
    const token = localStorage.getItem("access_token") // change "access_token" if your key is different
    if (!token) {
      toast.error("Please login to export CSV")
      return
    }

    try {
      const response = await fetch('http://localhost:8000/api/employees/export-csv', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })

      if (!response.ok) {
        if (response.status === 401) toast.error("Unauthorized. Please login again")
        else toast.error(`Export failed: ${response.statusText}`)
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'employees.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success("CSV exported successfully!")
    } catch (err) {
      console.error(err)
      toast.error("Failed to export CSV")
    }
  }

  const statusBadge = (active) => (
    <span className={`badge ${active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-500 text-sm">{employees.length} employees found</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={checkDuplicates} className="btn-secondary flex items-center gap-2 text-sm">
            <AlertCircle size={16} /> Check Profiles (AI)
          </button>
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> Add Employee
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search name, email, skill..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={dept} onChange={e => setDept(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* AI Flags */}
      {flags && flags.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2 font-medium text-amber-800">
            <AlertCircle size={18} /> {flags.length} profile(s) need attention
          </div>
          <div className="space-y-1">
            {flags.map(f => (
              <div key={f.employee_id} className="text-sm text-amber-700">
                <span className="font-medium">{f.name}:</span> {f.issues.join(', ')}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Employee</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Designation</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Joining Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No employees found</td></tr>
              ) : employees.map(e => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs">
                        {e.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{e.name}</p>
                        <p className="text-gray-400 text-xs">{e.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{e.designation || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{e.department || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{e.joining_date || '—'}</td>
                  <td className="px-4 py-3">{statusBadge(e.is_active)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/employees/${e.id}`} className="text-blue-600 hover:text-blue-800 font-medium">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAdd && (
        <Modal title="Add New Employee" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            {[
              { name: 'employee_code', label: 'Employee Code', required: true },
              { name: 'name', label: 'Full Name', required: true },
              { name: 'email', label: 'Email', type: 'email', required: true },
              { name: 'phone', label: 'Phone' },
              { name: 'designation', label: 'Designation' },
              { name: 'department', label: 'Department' },
              { name: 'joining_date', label: 'Joining Date', type: 'date' },
              { name: 'skills', label: 'Skills (comma separated)' },
              { name: 'salary', label: 'Salary (₹)', type: 'number' },
            ].map(f => (
              <div key={f.name}>
                <label className="label">{f.label}{f.required && <span className="text-red-500"> *</span>}</label>
                <input
                  type={f.type || 'text'}
                  className="input"
                  value={form[f.name]}
                  onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
                  required={f.required}
                />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1">Add Employee</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}