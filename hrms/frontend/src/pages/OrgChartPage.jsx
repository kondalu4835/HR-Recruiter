import { useState, useEffect } from 'react'
import { Building2, ChevronDown, ChevronRight, User } from 'lucide-react'
import api from '../utils/api'

function OrgNode({ node, level = 0 }) {
  const [expanded, setExpanded] = useState(level < 2)
  const hasChildren = node.children && node.children.length > 0
  const colors = [
    'border-blue-400 bg-blue-50',
    'border-green-400 bg-green-50',
    'border-purple-400 bg-purple-50',
    'border-orange-400 bg-orange-50',
    'border-pink-400 bg-pink-50',
  ]
  const color = colors[level % colors.length]

  return (
    <div className="flex flex-col items-center">
      {/* Node */}
      <div
        className={`relative border-2 rounded-xl px-4 py-3 min-w-36 text-center cursor-pointer select-none transition-shadow hover:shadow-md ${color}`}
        onClick={() => hasChildren && setExpanded(e => !e)}
      >
        <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-1">
          <User size={18} className="text-gray-500" />
        </div>
        <p className="font-semibold text-gray-900 text-sm leading-tight">{node.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">{node.designation || '—'}</p>
        <p className="text-xs text-gray-400">{node.department || ''}</p>
        {hasChildren && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center">
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="mt-6 relative">
          {/* Vertical line from parent */}
          <div className="absolute top-0 left-1/2 w-0.5 h-4 bg-gray-300 -translate-x-1/2 -top-4" />

          {/* Horizontal connector */}
          {node.children.length > 1 && (
            <div
              className="absolute top-0 bg-gray-300 h-0.5"
              style={{
                left: '0%',
                right: '0%',
                transform: 'none',
              }}
            />
          )}

          <div className="flex gap-6 items-start pt-1">
            {node.children.map((child, i) => (
              <div key={child.id} className="relative flex flex-col items-center">
                {/* Vertical line to child */}
                <div className="absolute -top-1 left-1/2 w-0.5 h-4 bg-gray-300 -translate-x-1/2" />
                <div className="mt-4">
                  <OrgNode node={child} level={level + 1} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function OrgChartPage() {
  const [orgData, setOrgData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/employees/org-chart')
      .then(r => setOrgData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organisation Chart</h1>
        <p className="text-gray-500 text-sm">Visual hierarchy of your organisation. Click nodes to expand/collapse.</p>
      </div>

      <div className="card overflow-auto">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading org chart...</div>
        ) : orgData.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Building2 size={48} className="mx-auto mb-3 opacity-30" />
            <p>No employees found. Add employees to see the org chart.</p>
          </div>
        ) : (
          <div className="overflow-x-auto py-8 px-4">
            <div className="flex gap-12 justify-center min-w-max">
              {orgData.map(root => (
                <OrgNode key={root.id} node={root} level={0} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
