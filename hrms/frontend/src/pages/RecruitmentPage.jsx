import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Briefcase, Users, X } from 'lucide-react'
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

const stageColors = {
  applied: 'bg-gray-100 text-gray-700',
  screening: 'bg-blue-100 text-blue-700',
  interview: 'bg-yellow-100 text-yellow-700',
  offer: 'bg-purple-100 text-purple-700',
  hired: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export default function RecruitmentPage() {
  const [jobs, setJobs] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', department: '', description: '', required_skills: '', experience_level: 'mid' })

  useEffect(() => { api.get('/recruitment/jobs').then(r => setJobs(r.data)) }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    try {
      await api.post('/recruitment/jobs', form)
      toast.success('Job posted!')
      setShowAdd(false)
      setForm({ title: '', department: '', description: '', required_skills: '', experience_level: 'mid' })
      const r = await api.get('/recruitment/jobs')
      setJobs(r.data)
    } catch (err) { toast.error('Failed to create job') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recruitment & ATS</h1>
          <p className="text-gray-500 text-sm">{jobs.length} job postings</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Post Job
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.map(j => (
          <Link key={j.id} to={`/recruitment/jobs/${j.id}`} className="card hover:shadow-md transition-shadow block">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Briefcase size={18} className="text-purple-600" />
              </div>
              <span className={`badge ${j.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {j.status}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{j.title}</h3>
            <p className="text-sm text-gray-500 mb-3">{j.department || 'No department'} · {j.experience_level}</p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users size={14} />
              <span>{j.candidate_count} candidates</span>
            </div>
            <div className="mt-3 text-xs text-gray-400 line-clamp-2">{j.description}</div>
          </Link>
        ))}
        {jobs.length === 0 && (
          <div className="col-span-3 text-center py-16 text-gray-400">
            <Briefcase size={40} className="mx-auto mb-2 opacity-40" />
            <p>No job postings yet. Create one to get started.</p>
          </div>
        )}
      </div>

      {showAdd && (
        <Modal title="Post New Job" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="label">Job Title <span className="text-red-500">*</span></label>
              <input className="input" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required />
            </div>
            <div>
              <label className="label">Department</label>
              <input className="input" value={form.department} onChange={e => setForm(p => ({...p, department: e.target.value}))} />
            </div>
            <div>
              <label className="label">Job Description <span className="text-red-500">*</span></label>
              <textarea className="input resize-none" rows={4} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} required />
            </div>
            <div>
              <label className="label">Required Skills</label>
              <input className="input" placeholder="React, Python, SQL..." value={form.required_skills} onChange={e => setForm(p => ({...p, required_skills: e.target.value}))} />
            </div>
            <div>
              <label className="label">Experience Level</label>
              <select className="input" value={form.experience_level} onChange={e => setForm(p => ({...p, experience_level: e.target.value}))}>
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior Level</option>
                <option value="lead">Lead / Manager</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1">Post Job</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
