import { useState, useEffect } from 'react'
import { Plus, Bot, Star, X, ChevronRight } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`bg-white rounded-xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  )
}

function RatingStars({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}>
          <Star size={20} className={n <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
        </button>
      ))}
      <span className="text-sm text-gray-500 ml-1">{value || 0}/5</span>
    </div>
  )
}

export default function PerformancePage() {
  const [cycles, setCycles] = useState([])
  const [selectedCycle, setSelectedCycle] = useState(null)
  const [reviews, setReviews] = useState([])
  const [employees, setEmployees] = useState([])
  const [showCreateCycle, setShowCreateCycle] = useState(false)
  const [showCreateReview, setShowCreateReview] = useState(false)
  const [selectedReview, setSelectedReview] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [cycleForm, setCycleForm] = useState({ name: '', period_start: '', period_end: '' })
  const [reviewForm, setReviewForm] = useState({ employee_id: '', manager_id: '' })
  const [selfForm, setSelfForm] = useState({ achievements: '', challenges: '', goals: '' })
  const [managerForm, setManagerForm] = useState({ rating_quality: 0, rating_delivery: 0, rating_communication: 0, rating_initiative: 0, rating_teamwork: 0, manager_comments: '' })
  const [activeTab, setActiveTab] = useState('self')

  useEffect(() => {
    api.get('/performance/cycles').then(r => setCycles(r.data))
    api.get('/employees').then(r => setEmployees(r.data))
  }, [])

  const loadReviews = (cycleId) => {
    api.get(`/performance/cycles/${cycleId}/reviews`).then(r => setReviews(r.data))
  }

  const selectCycle = (c) => { setSelectedCycle(c); loadReviews(c.id) }

  const createCycle = async (e) => {
    e.preventDefault()
    try {
      await api.post('/performance/cycles', cycleForm)
      toast.success('Review cycle created!')
      setShowCreateCycle(false)
      const r = await api.get('/performance/cycles')
      setCycles(r.data)
    } catch { toast.error('Failed') }
  }

  const createReview = async (e) => {
    e.preventDefault()
    try {
      await api.post('/performance/reviews', { cycle_id: selectedCycle.id, ...reviewForm, employee_id: parseInt(reviewForm.employee_id), manager_id: parseInt(reviewForm.manager_id) })
      toast.success('Review created!')
      setShowCreateReview(false)
      loadReviews(selectedCycle.id)
    } catch { toast.error('Failed') }
  }

  const openReview = async (r) => {
    const full = await api.get(`/performance/reviews/${r.id}`)
    setSelectedReview(full.data)
    setSelfForm({ achievements: full.data.self_achievements || '', challenges: full.data.self_challenges || '', goals: full.data.self_goals || '' })
    setManagerForm({
      rating_quality: full.data.rating_quality || 0,
      rating_delivery: full.data.rating_delivery || 0,
      rating_communication: full.data.rating_communication || 0,
      rating_initiative: full.data.rating_initiative || 0,
      rating_teamwork: full.data.rating_teamwork || 0,
      manager_comments: full.data.manager_comments || ''
    })
  }

  const submitSelf = async () => {
    try {
      await api.put(`/performance/reviews/${selectedReview.id}/self-assessment`, selfForm)
      toast.success('Self assessment saved!')
      openReview(selectedReview)
    } catch { toast.error('Failed') }
  }

  const submitManager = async () => {
    try {
      await api.put(`/performance/reviews/${selectedReview.id}/manager-review`, managerForm)
      toast.success('Manager review saved!')
      openReview(selectedReview)
    } catch { toast.error('Failed') }
  }

  const generateAISummary = async () => {
    setAiLoading(true)
    try {
      await api.post('/ai/generate-review-summary', { review_id: selectedReview.id })
      toast.success('AI summary generated!')
      openReview(selectedReview)
    } catch { toast.error('Failed') }
    finally { setAiLoading(false) }
  }

  const parseJson = (str) => { try { return JSON.parse(str || '[]') } catch { return [] } }

  const statusColors = { pending: 'bg-gray-100 text-gray-600', self_submitted: 'bg-blue-100 text-blue-700', manager_submitted: 'bg-yellow-100 text-yellow-700', completed: 'bg-green-100 text-green-700' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Reviews</h1>
          <p className="text-gray-500 text-sm">AI-assisted performance management</p>
        </div>
        <button onClick={() => setShowCreateCycle(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> New Cycle
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Cycles list */}
        <div className="card">
          <h2 className="font-semibold mb-3">Review Cycles</h2>
          <div className="space-y-2">
            {cycles.map(c => (
              <button key={c.id} onClick={() => selectCycle(c)} className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${selectedCycle?.id === c.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-gray-500">{c.period_start} → {c.period_end}</p>
                <p className="text-xs text-gray-400 mt-1">{c.review_count} reviews</p>
              </button>
            ))}
            {cycles.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No cycles yet</p>}
          </div>
        </div>

        {/* Reviews */}
        <div className="lg:col-span-3">
          {selectedCycle ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{selectedCycle.name} — Reviews</h2>
                <button onClick={() => setShowCreateReview(true)} className="btn-secondary flex items-center gap-2 text-sm">
                  <Plus size={14} /> Add Review
                </button>
              </div>
              <div className="space-y-2">
                {reviews.map(r => (
                  <div key={r.id} onClick={() => openReview(r)} className="card cursor-pointer hover:shadow-md transition-shadow p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                      {r.employee_name?.[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{r.employee_name}</p>
                      <p className="text-sm text-gray-500">Manager: {r.manager_name}</p>
                    </div>
                    <span className={`badge ${statusColors[r.status]}`}>{r.status?.replace('_', ' ')}</span>
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                ))}
                {reviews.length === 0 && (
                  <div className="text-center py-12 text-gray-400 card">No reviews in this cycle</div>
                )}
              </div>
            </div>
          ) : (
            <div className="card text-center py-16 text-gray-400">
              <Star size={40} className="mx-auto mb-2 opacity-30" />
              <p>Select a review cycle to view reviews</p>
            </div>
          )}
        </div>
      </div>

      {/* Review Detail Modal */}
      {selectedReview && (
        <Modal title={`Review: ${selectedReview.employee_name}`} onClose={() => setSelectedReview(null)} wide>
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
            {['self', 'manager', 'ai'].map(t => (
              <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors capitalize ${activeTab === t ? 'bg-white shadow-sm' : 'text-gray-500'}`}>
                {t === 'ai' ? '🤖 AI Summary' : t === 'self' ? '👤 Self Assessment' : '⭐ Manager Review'}
              </button>
            ))}
          </div>

          {activeTab === 'self' && (
            <div className="space-y-4">
              {[['achievements', 'Key Achievements'], ['challenges', 'Challenges Faced'], ['goals', 'Goals for Next Period']].map(([k, l]) => (
                <div key={k}>
                  <label className="label">{l}</label>
                  <textarea className="input resize-none" rows={3} value={selfForm[k]} onChange={e => setSelfForm(p => ({...p, [k]: e.target.value}))} />
                </div>
              ))}
              <button onClick={submitSelf} className="btn-primary w-full">Save Self Assessment</button>
            </div>
          )}

          {activeTab === 'manager' && (
            <div className="space-y-4">
              {[['rating_quality', 'Quality'], ['rating_delivery', 'Delivery'], ['rating_communication', 'Communication'], ['rating_initiative', 'Initiative'], ['rating_teamwork', 'Teamwork']].map(([k, l]) => (
                <div key={k}>
                  <label className="label">{l}</label>
                  <RatingStars value={managerForm[k]} onChange={v => setManagerForm(p => ({...p, [k]: v}))} />
                </div>
              ))}
              <div>
                <label className="label">Manager Comments</label>
                <textarea className="input resize-none" rows={3} value={managerForm.manager_comments} onChange={e => setManagerForm(p => ({...p, manager_comments: e.target.value}))} />
              </div>
              <button onClick={submitManager} className="btn-primary w-full">Save Manager Review</button>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-4">
              <button onClick={generateAISummary} disabled={aiLoading} className="btn-secondary flex items-center gap-2 w-full justify-center">
                <Bot size={16} className={aiLoading ? 'animate-pulse' : ''} />
                {aiLoading ? 'Generating AI Summary...' : 'Generate AI Summary'}
              </button>
              {selectedReview.ai_summary && (
                <div className="p-4 bg-blue-50 rounded-lg text-sm text-gray-700 whitespace-pre-line">{selectedReview.ai_summary}</div>
              )}
              {selectedReview.ai_flags && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="font-medium text-amber-800 mb-1">⚠️ Mismatches Detected</p>
                  <p className="text-sm text-amber-700">{selectedReview.ai_flags}</p>
                </div>
              )}
              {parseJson(selectedReview.ai_development_actions).length > 0 && (
                <div>
                  <p className="font-medium mb-2">📈 Development Actions</p>
                  <ul className="space-y-2">
                    {parseJson(selectedReview.ai_development_actions).map((a, i) => (
                      <li key={i} className="flex gap-2 text-sm"><span className="text-blue-500">→</span>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {showCreateCycle && (
        <Modal title="Create Review Cycle" onClose={() => setShowCreateCycle(false)}>
          <form onSubmit={createCycle} className="space-y-4">
            <div>
              <label className="label">Cycle Name (e.g. Q2 2025)</label>
              <input className="input" value={cycleForm.name} onChange={e => setCycleForm(p => ({...p, name: e.target.value}))} required />
            </div>
            <div>
              <label className="label">Period Start</label>
              <input type="date" className="input" value={cycleForm.period_start} onChange={e => setCycleForm(p => ({...p, period_start: e.target.value}))} required />
            </div>
            <div>
              <label className="label">Period End</label>
              <input type="date" className="input" value={cycleForm.period_end} onChange={e => setCycleForm(p => ({...p, period_end: e.target.value}))} required />
            </div>
            <div className="flex gap-3"><button type="button" onClick={() => setShowCreateCycle(false)} className="btn-secondary flex-1">Cancel</button><button type="submit" className="btn-primary flex-1">Create</button></div>
          </form>
        </Modal>
      )}

      {showCreateReview && (
        <Modal title="Add Employee to Review" onClose={() => setShowCreateReview(false)}>
          <form onSubmit={createReview} className="space-y-4">
            <div>
              <label className="label">Employee</label>
              <select className="input" value={reviewForm.employee_id} onChange={e => setReviewForm(p => ({...p, employee_id: e.target.value}))} required>
                <option value="">Select...</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Reviewer / Manager</label>
              <select className="input" value={reviewForm.manager_id} onChange={e => setReviewForm(p => ({...p, manager_id: e.target.value}))} required>
                <option value="">Select...</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3"><button type="button" onClick={() => setShowCreateReview(false)} className="btn-secondary flex-1">Cancel</button><button type="submit" className="btn-primary flex-1">Add</button></div>
          </form>
        </Modal>
      )}
    </div>
  )
}
