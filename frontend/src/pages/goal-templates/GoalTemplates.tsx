import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../utils/api'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Search, Trash2, Edit } from 'lucide-react'

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
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Manage Goal Templates</h1>
        </div>
        <div className="flex items-center gap-2">
          {isManagerOrAbove(user?.emp_roles, user?.emp_roles_level) && (
            <Button onClick={() => navigate('/goal-templates/new')} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          )}
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Templates
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {loading ? 'Loading…' : `${visible.length} template(s) found`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input 
              id="filter" 
              placeholder="Search by title or category..." 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-md"
            />
          </div>

          <div className="space-y-4">
            {visible.length === 0 && (
              <div className="text-center py-12">
                <div className="text-muted-foreground text-lg mb-2">No templates found</div>
                <div className="text-sm text-muted-foreground">
                  {filter.trim() ? 'Try adjusting your search criteria' : 'Create your first goal template to get started'}
                </div>
              </div>
            )}
            {visible.map(t => (
              <Card key={t.temp_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-lg truncate">{t.temp_title}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {t.temp_weightage}% Weight
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mb-3 line-clamp-2">{t.temp_description}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {t.categories?.map(c => (
                          <Badge key={c.id} variant="outline" className="text-xs">
                            {c.name}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Importance: <strong>{t.temp_importance}</strong></span>
                        <span>Performance Factor: <strong>{t.temp_performance_factor}</strong></span>
                      </div>
                    </div>
                    {isManagerOrAbove(user?.emp_roles, user?.emp_roles_level) && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/goal-templates/${t.temp_id}/edit`)}
                          className="flex items-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
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
                          className="flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          {deletingId === t.temp_id ? 'Deleting…' : 'Delete'}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default GoalTemplates
