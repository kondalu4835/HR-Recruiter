import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Bot, Star, X, ChevronRight } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected']
const stageColors = {
  applied: 'bg-gray-100 text-gray-600', screening: 'bg-blue-100 text-blue-700',
  interview: 'bg-yellow-100 text-yellow-700', offer: 'bg-purple-100 text-purple-700',
  hired: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-600',
}

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

export default function JobDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(null)
  const [scoreLoading, setScoreLoading] = useState(null)
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '' })
  const [resumeFile, setResumeFile] = useState(null)
  const [offerLoading, setOfferLoading] = useState(false)
  const [offerLetter, setOfferLetter] = useState('')
  const [offerForm, setOfferForm] = useState({ salary: '', start_date: '', reporting_manager: '' })

  const load = () => api.get(`/recruitment/jobs/${id}`).then(r => setJob(r.data))
  useEffect(() => { load() }, [id])

  const addCandidate = async (e) => {
    e.preventDefault()
    if (!resumeFile) { toast.error('Please upload a resume'); return }
    const fd = new FormData()
    fd.append('job_posting_id', id)
    fd.append('name', addForm.name)
    fd.append('email', addForm.email)
    fd.append('phone', addForm.phone)
    fd.append('resume', resumeFile)
    try {
      await api.post('/recruitment/candidates', fd)
      toast.success('Candidate added!')
      setShowAdd(false)
      setAddForm({ name: '', email: '', phone: '' })
      setResumeFile(null)
      load()
    } catch { toast.error('Failed to add candidate') }
  }

  const scoreResume = async (candidateId) => {
    setScoreLoading(candidateId)
    try {
      await api.post('/ai/score-resume', { candidate_id: candidateId })
      toast.success('Resume scored!')
      load()
      if (selected?.id === candidateId) {
        const r = await api.get(`/recruitment/candidates/${candidateId}`)
        setSelected(r.data)
      }
    } catch { toast.error('Scoring failed') }
    finally { setScoreLoading(null) }
  }

  const updateStage = async (candidateId, stage) => {
    try {
      await api.put(`/recruitment/candidates/${candidateId}/stage`, { stage })
      toast.success('Stage updated!')
      load()
    } catch { toast.error('Failed') }
  }

  const generateOffer = async () => {
    setOfferLoading(true)
    try {
      const res = await api.post('/ai/generate-offer-letter', {
        candidate_id: selected.id,
        salary: parseFloat(offerForm.salary),
        start_date: offerForm.start_date,
        reporting_manager: offerForm.reporting_manager
      })
      setOfferLetter(res.data.offer_letter)
    } catch { toast.error('Failed') }
    finally { setOfferLoading(false) }
  }

  if (!job) return <div className="text-center py-20 text-gray-400">Loading...</div>

  const byStage = STAGES.reduce((acc, s) => {
    acc[s] = job.candidates?.filter(c => c.stage === s) || []
    return acc
  }, {})

  const parseJson = (str) => { try { return JSON.parse(str || '[]') } catch { return [] } }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/recruitment')}><ArrowLeft size={20} /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
          <p className="text-gray-500 text-sm">{job.department} · {job.experience_level} · {job.candidates?.length || 0} candidates</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Add Candidate
        </button>
      </div>

      {/* Pipeline Board */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-4">
          {STAGES.map(stage => (
            <div key={stage} className="w-56 flex-shrink-0">
              <div className={`px-3 py-1.5 rounded-lg mb-3 text-xs font-semibold uppercase tracking-wider ${stageColors[stage]}`}>
                {stage} ({byStage[stage].length})
              </div>
              <div className="space-y-2">
                {byStage[stage].map(c => (
                  <div
                    key={c.id}
                    className={`bg-white border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow ${selected?.id === c.id ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-100'}`}
                    onClick={() => setSelected(c)}
                  >
                    <p className="font-medium text-sm text-gray-900 mb-1">{c.name}</p>
                    <p className="text-xs text-gray-400 truncate">{c.email}</p>
                    {c.ai_score != null && (
                      <div className="flex items-center gap-1 mt-2">
                        <Star size={12} className="text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-semibold text-yellow-600">{c.ai_score}% match</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Candidate Detail Panel */}
      {selected && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">{selected.name}</h2>
            <button onClick={() => setSelected(null)}><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Contact</p>
                <p className="font-medium">{selected.email}</p>
                <p className="text-sm text-gray-600">{selected.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Move Stage</p>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map(s => (
                    <button
                      key={s}
                      onClick={() => updateStage(selected.id, s)}
                      className={`text-xs px-2 py-1 rounded-full border transition-colors ${selected.stage === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:border-blue-300'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => scoreResume(selected.id)}
                disabled={scoreLoading === selected.id}
                className="btn-secondary flex items-center gap-2 text-sm w-full justify-center"
              >
                <Bot size={16} className={scoreLoading === selected.id ? 'animate-pulse' : ''} />
                {scoreLoading === selected.id ? 'Scoring...' : 'AI Score Resume'}
              </button>
            </div>
            <div>
              {selected.ai_score != null ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-bold text-blue-600">{selected.ai_score}%</div>
                    <div>
                      <p className="text-sm font-medium">AI Match Score</p>
                      <p className="text-xs text-gray-500">{selected.ai_reasoning}</p>
                    </div>
                  </div>
                  {parseJson(selected.ai_strengths).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-700 mb-1">✅ Strengths</p>
                      <ul className="text-xs space-y-1">
                        {parseJson(selected.ai_strengths).map((s, i) => <li key={i} className="text-gray-600">• {s}</li>)}
                      </ul>
                    </div>
                  )}
                  {parseJson(selected.ai_gaps).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-600 mb-1">⚠️ Gaps</p>
                      <ul className="text-xs space-y-1">
                        {parseJson(selected.ai_gaps).map((g, i) => <li key={i} className="text-gray-600">• {g}</li>)}
                      </ul>
                    </div>
                  )}
                  {parseJson(selected.ai_questions).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-purple-700 mb-1">💬 Interview Questions</p>
                      <ol className="text-xs space-y-1 list-decimal list-inside">
                        {parseJson(selected.ai_questions).map((q, i) => <li key={i} className="text-gray-600">{q}</li>)}
                      </ol>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Bot size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Click "AI Score Resume" to analyze this candidate</p>
                </div>
              )}
            </div>
          </div>

          {/* Offer Letter Generator */}
          {selected.stage === 'offer' && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-medium mb-3">🎉 Generate Offer Letter (AI)</h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="label">Salary (₹)</label>
                  <input className="input" type="number" value={offerForm.salary} onChange={e => setOfferForm(p => ({...p, salary: e.target.value}))} />
                </div>
                <div>
                  <label className="label">Start Date</label>
                  <input className="input" type="date" value={offerForm.start_date} onChange={e => setOfferForm(p => ({...p, start_date: e.target.value}))} />
                </div>
                <div>
                  <label className="label">Reporting Manager</label>
                  <input className="input" value={offerForm.reporting_manager} onChange={e => setOfferForm(p => ({...p, reporting_manager: e.target.value}))} />
                </div>
              </div>
              <button onClick={generateOffer} disabled={offerLoading} className="btn-primary text-sm flex items-center gap-2">
                <Bot size={14} /> {offerLoading ? 'Generating...' : 'Generate Offer Letter'}
              </button>
              {offerLetter && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm whitespace-pre-line text-gray-700 max-h-64 overflow-y-auto">
                  {offerLetter}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Candidate Modal */}
      {showAdd && (
        <Modal title="Add Candidate" onClose={() => setShowAdd(false)}>
          <form onSubmit={addCandidate} className="space-y-4">
            <div>
              <label className="label">Name <span className="text-red-500">*</span></label>
              <input className="input" value={addForm.name} onChange={e => setAddForm(p => ({...p, name: e.target.value}))} required />
            </div>
            <div>
              <label className="label">Email <span className="text-red-500">*</span></label>
              <input className="input" type="email" value={addForm.email} onChange={e => setAddForm(p => ({...p, email: e.target.value}))} required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={addForm.phone} onChange={e => setAddForm(p => ({...p, phone: e.target.value}))} />
            </div>
            <div>
              <label className="label">Resume (PDF/DOC) <span className="text-red-500">*</span></label>
              <input type="file" className="input" accept=".pdf,.doc,.docx,.txt" onChange={e => setResumeFile(e.target.files[0])} required />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1">Add Candidate</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
