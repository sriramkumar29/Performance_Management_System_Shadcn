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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog'
import { Skeleton } from '../../components/ui/skeleton'

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
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline sm:ml-2">Back</span>
          </Button>
          <h1 className="text-2xl font-bold">Manage Goal Templates</h1>
        </div>
        <div className="flex items-center gap-2">
          {isManagerOrAbove(user?.emp_roles, user?.emp_roles_level) && (
            <Button
              onClick={() => navigate('/goal-templates/new')}
              className="flex items-center gap-2"
              aria-label="Create Template"
              title="Create Template"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline sm:ml-2">Create Template</span>
            </Button>
          )}
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
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
              className="w-full max-w-md transition-shadow focus:shadow-sm motion-reduce:transition-none"
            />
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="shadow-sm">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-5 w-1/3" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-16 rounded-full" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-6 w-12 rounded-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
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
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-lg truncate">{t.temp_title}</h3>
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 border-amber-200">
                            {t.temp_weightage}% Weight
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-3 line-clamp-2">{t.temp_description}</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {t.categories?.map(c => (
                            <Badge key={c.id} variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200">
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
                        <div className="flex gap-2 mt-3 sm:mt-0 self-start sm:self-auto">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/goal-templates/${t.temp_id}/edit`)}
                            className="flex items-center gap-2"
                            aria-label="Edit template"
                            title="Edit template"
                          >
                            <Edit className="h-4 w-4" aria-hidden="true" />
                            <span className="hidden sm:inline sm:ml-2">Edit</span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={deletingId === t.temp_id}
                                className="flex items-center gap-2"
                                aria-label={deletingId === t.temp_id ? 'Deleting…' : 'Delete template'}
                                title={deletingId === t.temp_id ? 'Deleting…' : 'Delete template'}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                <span className="hidden sm:inline sm:ml-2">{deletingId === t.temp_id ? 'Deleting…' : 'Delete'}</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete template?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the goal template “{t.temp_title}”.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={async () => {
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
                                  Confirm delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default GoalTemplates
