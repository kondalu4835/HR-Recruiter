import { useState, useEffect, useRef } from 'react'
import { Plus, Upload, Bot, MessageCircle, Send, X, CheckCircle, Circle } from 'lucide-react'
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

export default function OnboardingPage() {
  const [tab, setTab] = useState('checklists')
  const [checklists, setChecklists] = useState([])
  const [employees, setEmployees] = useState([])
  const [policyDocs, setPolicyDocs] = useState([])
  const [chatQueries, setChatQueries] = useState(null)
  const [showCreateChecklist, setShowCreateChecklist] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [selectedEmp, setSelectedEmp] = useState('')
  const [empOnboarding, setEmpOnboarding] = useState([])
  const [chatMessages, setChatMessages] = useState([{ role: 'assistant', text: '👋 Hi! I\'m your HR onboarding assistant. Ask me anything about company policies, leave, tools, or processes!' }])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)
  const [docFile, setDocFile] = useState(null)
  const [docTitle, setDocTitle] = useState('')
  const [checklistForm, setChecklistForm] = useState({ role: '', title: '', items: [{ title: '', description: '', due_days: 7, assignee_role: 'employee' }] })
  const [assignForm, setAssignForm] = useState({ employee_id: '', checklist_id: '' })

  useEffect(() => {
    api.get('/onboarding/checklists').then(r => setChecklists(r.data))
    api.get('/employees').then(r => setEmployees(r.data))
    api.get('/onboarding/policy-documents').then(r => setPolicyDocs(r.data))
  }, [])

  useEffect(() => { if (tab === 'analytics') api.get('/onboarding/chatbot-queries').then(r => setChatQueries(r.data)) }, [tab])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  const loadEmpOnboarding = (empId) => {
    if (!empId) return
    api.get(`/onboarding/employee/${empId}`).then(r => setEmpOnboarding(r.data))
  }

  useEffect(() => { loadEmpOnboarding(selectedEmp) }, [selectedEmp])

  const createChecklist = async (e) => {
    e.preventDefault()
    try {
      await api.post('/onboarding/checklists', checklistForm)
      toast.success('Checklist created!')
      setShowCreateChecklist(false)
      const r = await api.get('/onboarding/checklists')
      setChecklists(r.data)
    } catch { toast.error('Failed') }
  }

  const assignChecklist = async (e) => {
    e.preventDefault()
    try {
      await api.post('/onboarding/assign', { employee_id: parseInt(assignForm.employee_id), checklist_id: parseInt(assignForm.checklist_id) })
      toast.success('Checklist assigned!')
      setShowAssign(false)
      loadEmpOnboarding(selectedEmp)
    } catch { toast.error('Failed') }
  }

  const toggleItem = async (onboardingId, itemId, current) => {
    try {
      await api.put(`/onboarding/progress/${onboardingId}`, { item_id: itemId, completed: !current })
      loadEmpOnboarding(selectedEmp)
    } catch { toast.error('Failed') }
  }

  const uploadPolicy = async (e) => {
    e.preventDefault()
    if (!docFile) return
    const fd = new FormData()
    fd.append('title', docTitle)
    fd.append('file', docFile)
    try {
      await api.post('/onboarding/policy-documents', fd)
      toast.success('Policy document uploaded!')
      setDocFile(null); setDocTitle('')
      const r = await api.get('/onboarding/policy-documents')
      setPolicyDocs(r.data)
    } catch { toast.error('Upload failed') }
  }

  const sendChat = async () => {
    if (!chatInput.trim()) return
    const q = chatInput
    setChatInput('')
    setChatMessages(m => [...m, { role: 'user', text: q }])
    setChatLoading(true)
    try {
      const res = await api.post('/ai/chatbot', { question: q })
      setChatMessages(m => [...m, { role: 'assistant', text: res.data.answer }])
    } catch {
      setChatMessages(m => [...m, { role: 'assistant', text: 'Sorry, I encountered an error. Please contact HR at hr@company.com' }])
    } finally { setChatLoading(false) }
  }

  const addChecklistItem = () => setChecklistForm(f => ({ ...f, items: [...f.items, { title: '', description: '', due_days: 7, assignee_role: 'employee' }] }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Onboarding</h1>
          <p className="text-gray-500 text-sm">Checklists, policies, and AI assistant</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowChat(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <MessageCircle size={16} /> AI Chatbot
          </button>
          <button onClick={() => setShowAssign(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <Plus size={16} /> Assign Checklist
          </button>
          <button onClick={() => setShowCreateChecklist(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> Create Checklist
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {['checklists', 'progress', 'policies', 'analytics'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>{t}</button>
        ))}
      </div>

      {tab === 'checklists' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {checklists.map(c => (
            <div key={c.id} className="card">
              <p className="font-medium text-gray-900">{c.title}</p>
              <p className="text-sm text-gray-500">{c.role}</p>
              <p className="text-xs text-gray-400 mt-2">{c.item_count} items</p>
            </div>
          ))}
          {checklists.length === 0 && <div className="col-span-3 text-center py-12 text-gray-400">No checklists created yet</div>}
        </div>
      )}

      {tab === 'progress' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <select className="input w-64" value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}>
              <option value="">Select employee...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          {empOnboarding.map(o => (
            <div key={o.id} className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{o.checklist_title}</h3>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{width: `${o.progress_pct}%`}} />
                  </div>
                  <span className="text-sm font-medium text-blue-600">{o.progress_pct}%</span>
                </div>
              </div>
              <div className="space-y-2">
                {o.items.map(item => (
                  <div key={item.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer" onClick={() => toggleItem(o.id, item.id, item.completed)}>
                    {item.completed ? <CheckCircle size={18} className="text-green-500 flex-shrink-0 mt-0.5" /> : <Circle size={18} className="text-gray-300 flex-shrink-0 mt-0.5" />}
                    <div>
                      <p className={`text-sm font-medium ${item.completed ? 'line-through text-gray-400' : ''}`}>{item.title}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                      <p className="text-xs text-gray-400">Due within {item.due_days} days · {item.assignee_role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {selectedEmp && empOnboarding.length === 0 && <div className="text-center py-8 text-gray-400">No onboarding assigned to this employee</div>}
        </div>
      )}

      {tab === 'policies' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="font-semibold mb-4">Upload Policy Document</h2>
            <form onSubmit={uploadPolicy} className="space-y-3">
              <div><label className="label">Title</label><input className="input" value={docTitle} onChange={e => setDocTitle(e.target.value)} required /></div>
              <div><label className="label">File (PDF, TXT, MD)</label><input type="file" className="input" accept=".pdf,.txt,.md" onChange={e => setDocFile(e.target.files[0])} required /></div>
              <button type="submit" className="btn-primary flex items-center gap-2 text-sm w-full justify-center"><Upload size={16} /> Upload</button>
            </form>
          </div>
          <div className="card">
            <h2 className="font-semibold mb-4">Policy Documents ({policyDocs.length})</h2>
            <div className="space-y-2">
              {policyDocs.map(d => (
                <div key={d.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg text-sm">
                  <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center text-red-600 text-xs font-bold">PDF</div>
                  <div><p className="font-medium">{d.title}</p><p className="text-xs text-gray-400">{d.filename}</p></div>
                </div>
              ))}
              {policyDocs.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No documents uploaded</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'analytics' && chatQueries && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="font-semibold mb-4">Top Questions Asked</h2>
            <div className="space-y-2">
              {chatQueries.top_questions.map((q, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                  <span className="text-lg font-bold text-blue-300">#{i+1}</span>
                  <span className="flex-1 text-sm text-gray-700">{q.question}</span>
                  <span className="badge bg-blue-100 text-blue-700">{q.count}x</span>
                </div>
              ))}
              {chatQueries.top_questions.length === 0 && <p className="text-gray-400 text-sm">No queries yet</p>}
            </div>
          </div>
          <div className="card">
            <h2 className="font-semibold mb-4">Recent Queries</h2>
            <div className="space-y-2">
              {chatQueries.recent.map(q => (
                <div key={q.id} className="p-2 border rounded-lg text-sm">
                  <p className="font-medium text-gray-800">{q.question}</p>
                  <p className="text-gray-500 text-xs mt-1 line-clamp-2">{q.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chatbot Modal */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end bg-black/30 p-0 sm:p-4">
          <div className="bg-white w-full sm:w-96 h-[70vh] sm:h-[600px] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col">
            <div className="flex items-center gap-3 p-4 border-b bg-blue-600 rounded-t-2xl sm:rounded-t-2xl text-white">
              <Bot size={22} />
              <div className="flex-1">
                <p className="font-semibold text-sm">HR Onboarding Assistant</p>
                <p className="text-xs text-blue-200">Powered by AI · Policy documents only</p>
              </div>
              <button onClick={() => setShowChat(false)}><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-4 py-2 rounded-2xl text-sm text-gray-500">Thinking...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-4 border-t flex gap-2">
              <input className="input flex-1 text-sm" placeholder="Ask about policies, leave, tools..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} />
              <button onClick={sendChat} disabled={chatLoading} className="btn-primary px-3">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Checklist Modal */}
      {showCreateChecklist && (
        <Modal title="Create Onboarding Checklist" onClose={() => setShowCreateChecklist(false)} wide>
          <form onSubmit={createChecklist} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Role (e.g. Engineer)</label><input className="input" value={checklistForm.role} onChange={e => setChecklistForm(p => ({...p, role: e.target.value}))} required /></div>
              <div><label className="label">Checklist Title</label><input className="input" value={checklistForm.title} onChange={e => setChecklistForm(p => ({...p, title: e.target.value}))} required /></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Checklist Items</label>
                <button type="button" onClick={addChecklistItem} className="text-blue-600 text-sm">+ Add item</button>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {checklistForm.items.map((item, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg grid grid-cols-2 gap-2">
                    <input className="input text-xs" placeholder="Item title" value={item.title} onChange={e => { const items = [...checklistForm.items]; items[i].title = e.target.value; setChecklistForm(p => ({...p, items})) }} />
                    <input className="input text-xs" placeholder="Description" value={item.description} onChange={e => { const items = [...checklistForm.items]; items[i].description = e.target.value; setChecklistForm(p => ({...p, items})) }} />
                    <input type="number" className="input text-xs" placeholder="Due days" value={item.due_days} onChange={e => { const items = [...checklistForm.items]; items[i].due_days = parseInt(e.target.value); setChecklistForm(p => ({...p, items})) }} />
                    <select className="input text-xs" value={item.assignee_role} onChange={e => { const items = [...checklistForm.items]; items[i].assignee_role = e.target.value; setChecklistForm(p => ({...p, items})) }}>
                      <option value="employee">Employee</option>
                      <option value="hr">HR</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3"><button type="button" onClick={() => setShowCreateChecklist(false)} className="btn-secondary flex-1">Cancel</button><button type="submit" className="btn-primary flex-1">Create</button></div>
          </form>
        </Modal>
      )}

      {showAssign && (
        <Modal title="Assign Onboarding Checklist" onClose={() => setShowAssign(false)}>
          <form onSubmit={assignChecklist} className="space-y-4">
            <div><label className="label">Employee</label><select className="input" value={assignForm.employee_id} onChange={e => setAssignForm(p => ({...p, employee_id: e.target.value}))} required><option value="">Select...</option>{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
            <div><label className="label">Checklist</label><select className="input" value={assignForm.checklist_id} onChange={e => setAssignForm(p => ({...p, checklist_id: e.target.value}))} required><option value="">Select...</option>{checklists.map(c => <option key={c.id} value={c.id}>{c.title} ({c.role})</option>)}</select></div>
            <div className="flex gap-3"><button type="button" onClick={() => setShowAssign(false)} className="btn-secondary flex-1">Cancel</button><button type="submit" className="btn-primary flex-1">Assign</button></div>
          </form>
        </Modal>
      )}
    </div>
  )
}
