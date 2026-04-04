import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Bot, Upload, Save, ArrowLeft, FileText, Trash2 } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function EmployeeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [emp, setEmp] = useState(null)
  const [form, setForm] = useState({})
  const [bioLoading, setBioLoading] = useState(false)
  const [docType, setDocType] = useState('offer_letter')
  const [docFile, setDocFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const load = () => api.get(`/employees/${id}`).then(r => { setEmp(r.data); setForm(r.data) })

  useEffect(() => { load() }, [id])

  const save = async () => {
    try {
      await api.put(`/employees/${id}`, form)
      toast.success('Saved!')
      load()
    } catch { toast.error('Save failed') }
  }

  const generateBio = async () => {
    setBioLoading(true)
    try {
      const res = await api.post('/ai/generate-bio', { employee_id: parseInt(id) })
      setForm(f => ({ ...f, bio: res.data.bio }))
      toast.success('Bio generated!')
    } catch { toast.error('Bio generation failed') }
    finally { setBioLoading(false) }
  }

  const uploadDoc = async (e) => {
    e.preventDefault()
    if (!docFile) return
    setUploading(true)
    const fd = new FormData()
    fd.append('doc_type', docType)
    fd.append('file', docFile)
    try {
      await api.post(`/employees/${id}/documents`, fd)
      toast.success('Document uploaded!')
      setDocFile(null)
      load()
    } catch { toast.error('Upload failed') }
    finally { setUploading(false) }
  }

  const deactivate = async () => {
    if (!confirm('Deactivate this employee?')) return
    try {
      await api.delete(`/employees/${id}`)
      toast.success('Employee deactivated')
      navigate('/employees')
    } catch { toast.error('Failed') }
  }

  if (!emp) return <div className="text-center py-20 text-gray-400">Loading...</div>

  const field = (key, label, type = 'text') => (
    <div key={key}>
      <label className="label">{label}</label>
      <input type={type} className="input" value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
    </div>
  )

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/employees')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{emp.name}</h1>
          <p className="text-gray-500 text-sm">{emp.designation} · {emp.department}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="btn-primary flex items-center gap-2 text-sm">
            <Save size={16} /> Save Changes
          </button>
          {emp.is_active && (
            <button onClick={deactivate} className="btn-danger flex items-center gap-2 text-sm">
              <Trash2 size={16} /> Deactivate
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Profile Information</h2>
          {field('name', 'Full Name')}
          {field('email', 'Email', 'email')}
          {field('phone', 'Phone')}
          {field('designation', 'Designation')}
          {field('department', 'Department')}
          {field('joining_date', 'Joining Date', 'date')}
          {field('skills', 'Skills (comma-separated)')}
          {field('salary', 'Salary (₹)', 'number')}
          {field('address', 'Address')}
        </div>

        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">Professional Bio</h2>
              <button onClick={generateBio} disabled={bioLoading} className="btn-secondary flex items-center gap-2 text-xs">
                <Bot size={14} className={bioLoading ? 'animate-pulse' : ''} />
                {bioLoading ? 'Generating...' : 'AI Generate'}
              </button>
            </div>
            <textarea
              className="input resize-none"
              rows={6}
              value={form.bio || ''}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Professional bio will appear here..."
            />
          </div>

          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-3">Documents</h2>
            {emp.documents?.length > 0 && (
              <div className="space-y-2 mb-4">
                {emp.documents.map(d => (
                  <div key={d.id} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded-lg">
                    <FileText size={14} className="text-gray-400" />
                    <span className="text-gray-600 flex-1">{d.filename}</span>
                    <span className="badge bg-blue-100 text-blue-700">{d.doc_type}</span>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={uploadDoc} className="space-y-3">
              <div>
                <label className="label">Document Type</label>
                <select className="input" value={docType} onChange={e => setDocType(e.target.value)}>
                  <option value="offer_letter">Offer Letter</option>
                  <option value="id_proof">ID Proof</option>
                  <option value="education">Education Certificate</option>
                  <option value="contract">Contract</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label">File</label>
                <input type="file" className="input" onChange={e => setDocFile(e.target.files[0])} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
              </div>
              <button type="submit" disabled={!docFile || uploading} className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                <Upload size={16} /> {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
