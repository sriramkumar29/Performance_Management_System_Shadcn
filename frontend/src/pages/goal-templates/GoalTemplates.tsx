import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../utils/api'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'sonner'

interface Category {
  id: number
  name: string
}

interface GoalTemplate {
  temp_id: number
  temp_title: string
  temp_description: string
  temp_performance_factor: string
  temp_importance: string
  temp_weightage: number
  categories: Category[]
}

const GoalTemplates = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<GoalTemplate[]>([])
  const [filter, setFilter] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const isManagerOrAbove = (roles?: string, level?: number | null) => {
    if (roles && /manager|lead|head|director|vp|chief|cxo|cto|ceo|admin/i.test(roles)) return true
    if (typeof level === 'number') return level > 2
    return false
  }

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const res = await apiFetch<GoalTemplate[]>('/api/goals/templates')
      if (res.ok && res.data) setTemplates(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTemplates()
  }, [])

  const visible = templates.filter(t =>
    !filter.trim() ||
    t.temp_title.toLowerCase().includes(filter.toLowerCase()) ||
    t.categories?.some(c => c.name.toLowerCase().includes(filter.toLowerCase()))
  )

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Goal Templates</h1>
        <div className="flex items-center gap-2">
          {isManagerOrAbove(user?.emp_roles, user?.emp_roles_level) && (
            <Button variant="outline" onClick={() => navigate('/goal-templates/new')}>New Template</Button>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Label htmlFor="filter">Search</Label>
          <Input id="filter" placeholder="Filter by title or category" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <div className="text-sm text-muted-foreground flex items-end">{loading ? 'Loading…' : `${visible.length} template(s)`}</div>
      </div>

      <div className="mt-4 rounded-md border">
        {visible.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">No templates found.</div>
        )}
        {visible.map(t => (
          <div key={t.temp_id} className="p-4 border-b last:border-b-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium truncate">{t.temp_title}</div>
                  <div className="text-xs whitespace-nowrap">Weightage: <span className="font-semibold">{t.temp_weightage}%</span></div>
                </div>
                <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.temp_description}</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {t.categories?.map(c => (
                    <Badge key={c.id} variant="outline">{c.name}</Badge>
                  ))}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">Importance: {t.temp_importance} · Perf. Factor: {t.temp_performance_factor}</div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {isManagerOrAbove(user?.emp_roles, user?.emp_roles_level) && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/goal-templates/${t.temp_id}/edit`)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={deletingId === t.temp_id}
                      onClick={async () => {
                        const confirmed = window.confirm('Delete this template? This cannot be undone.')
                        if (!confirmed) return
                        try {
                          setDeletingId(t.temp_id)
                          const res = await apiFetch(`/api/goals/templates/${t.temp_id}`, { method: 'DELETE' })
                          if (!res.ok) throw new Error(res.error || 'Failed to delete template')
                          toast.success('Template deleted')
                          await loadTemplates()
                        } catch (e: any) {
                          toast.error(e?.message || 'Delete failed')
                        } finally {
                          setDeletingId(null)
                        }
                      }}
                    >
                      {deletingId === t.temp_id ? 'Deleting…' : 'Delete'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default GoalTemplates
