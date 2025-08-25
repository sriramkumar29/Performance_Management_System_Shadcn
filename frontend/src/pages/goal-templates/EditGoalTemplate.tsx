import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { apiFetch } from '../../utils/api'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Home } from 'lucide-react'

interface CategoryDto { id: number; name: string }

interface GoalTemplateDto {
  temp_id: number
  temp_title: string
  temp_description: string
  temp_performance_factor: string
  temp_importance: string
  temp_weightage: number
  categories: CategoryDto[]
}

const EditGoalTemplate = () => {
  const navigate = useNavigate()
  const params = useParams()
  const templateId = params.id ? Number(params.id) : undefined
  const { user } = useAuth()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [tempTitle, setTempTitle] = useState('')
  const [tempDescription, setTempDescription] = useState('')
  const [tempPerformanceFactor, setTempPerformanceFactor] = useState('')
  const [tempImportance, setTempImportance] = useState('')
  const [tempWeightage, setTempWeightage] = useState<number | ''>('')
  const [categories, setCategories] = useState<string[]>([])

  const [allCategories, setAllCategories] = useState<CategoryDto[]>([])
  const [newCategory, setNewCategory] = useState('')

  const isEdit = useMemo(() => typeof templateId === 'number' && !Number.isNaN(templateId), [templateId])

  const isManagerOrAbove = (roles?: string, level?: number | null) => {
    if (roles && /manager|lead|head|director|vp|chief|cxo|cto|ceo|admin/i.test(roles)) return true
    if (typeof level === 'number') return level > 2
    return false
  }

  useEffect(() => {
    // Access guard
    if (!isManagerOrAbove(user?.emp_roles, user?.emp_roles_level)) {
      toast.error('You are not authorized to manage goal templates')
      navigate('/goal-templates')
      return
    }

    const init = async () => {
      try {
        setLoading(true)
        // Load available categories (optional)
        const catRes = await apiFetch<CategoryDto[]>('/api/goals/categories')
        if (catRes.ok && catRes.data) setAllCategories(catRes.data)

        if (isEdit && templateId) {
          const res = await apiFetch<GoalTemplateDto>(`/api/goals/templates/${templateId}`)
          if (!res.ok || !res.data) throw new Error(res.error || 'Failed to load template')
          const t = res.data
          setTempTitle(t.temp_title)
          setTempDescription(t.temp_description)
          setTempPerformanceFactor(t.temp_performance_factor)
          setTempImportance(t.temp_importance)
          setTempWeightage(t.temp_weightage)
          setCategories(Array.isArray(t.categories) ? t.categories.map(c => c.name) : [])
        }
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [isEdit, templateId, user])

  const addCategory = () => {
    const name = newCategory.trim()
    if (!name) return
    if (categories.includes(name)) {
      setNewCategory('')
      return
    }
    setCategories(prev => [...prev, name])
    setNewCategory('')
  }

  const removeCategory = (name: string) => {
    setCategories(prev => prev.filter(c => c !== name))
  }

  const save = async () => {
    if (!tempTitle.trim()) {
      toast.error('Title is required')
      return
    }
    const weight = typeof tempWeightage === 'number' ? tempWeightage : parseInt(String(tempWeightage || '0'))
    if (!weight || weight < 1 || weight > 100) {
      toast.error('Weightage must be between 1 and 100')
      return
    }

    const payload = {
      temp_title: tempTitle.trim(),
      temp_description: tempDescription.trim(),
      temp_performance_factor: tempPerformanceFactor.trim(),
      temp_importance: tempImportance.trim(),
      temp_weightage: weight,
      categories: categories, // array of names per backend contract
    }

    try {
      setSaving(true)
      if (isEdit && templateId) {
        const res = await apiFetch(`/api/goals/templates/${templateId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(res.error || 'Failed to update goal template')
        toast.success('Template updated')
      } else {
        const res = await apiFetch(`/api/goals/templates`, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(res.error || 'Failed to create goal template')
        toast.success('Template created')
      }
      navigate('/goal-templates')
    } catch (e: any) {
      toast.error(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/goal-templates')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Home
          </Button>
        </div>
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit Goal Template' : 'Create Template'}</h1>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">
            {isEdit ? 'Update Template Details' : 'Template Information'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              disabled={loading || saving}
              className="transition-shadow focus:shadow-sm motion-reduce:transition-none"
              aria-describedby="title-help"
            />
            <p id="title-help" className="mt-1 text-xs text-muted-foreground">Give your template a concise, descriptive title.</p>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={tempDescription}
              onChange={(e) => setTempDescription(e.target.value)}
              disabled={loading || saving}
              className="transition-shadow focus:shadow-sm motion-reduce:transition-none"
              aria-describedby="description-help"
            />
            <p id="description-help" className="mt-1 text-xs text-muted-foreground">Optional: add context so appraisers understand the goal’s intent.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="perf">Performance Factor</Label>
              <Input
                id="perf"
                value={tempPerformanceFactor}
                onChange={(e) => setTempPerformanceFactor(e.target.value)}
                disabled={loading || saving}
                className="transition-shadow focus:shadow-sm motion-reduce:transition-none"
                aria-describedby="perf-help"
              />
              <p id="perf-help" className="mt-1 text-xs text-muted-foreground">E.g., Quality, Delivery, Ownership, Collaboration.</p>
            </div>
            <div>
              <Label htmlFor="importance">Importance</Label>
              <Select value={tempImportance} onValueChange={setTempImportance} disabled={loading || saving}>
                <SelectTrigger>
                  <SelectValue placeholder="Select importance level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="weight">Weightage (%)</Label>
              <Input
                id="weight"
                type="number"
                min={1}
                max={100}
                value={tempWeightage}
                onChange={(e) => setTempWeightage(e.target.value === '' ? '' : parseInt(e.target.value))}
                disabled={loading || saving}
                className="transition-shadow focus:shadow-sm motion-reduce:transition-none"
                aria-describedby="weight-help"
              />
              <p id="weight-help" className="mt-1 text-xs text-muted-foreground">Must be between 1–100. Appraisal total must sum to 100%.</p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Categories</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Add category name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } }}
                autoComplete="off"
                disabled={loading || saving}
                className="w-full sm:flex-1 transition-shadow focus:shadow-sm motion-reduce:transition-none"
                aria-describedby="category-help"
              />
              <Button type="button" onClick={addCategory} disabled={loading || saving}>Add</Button>
            </div>
            <p id="category-help" className="text-xs text-muted-foreground">Press Enter to add. Avoid duplicates.</p>
            {allCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>Suggestions:</span>
                {allCategories.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className="px-2 py-1 rounded border hover:bg-muted"
                    onClick={() => setNewCategory(c.name)}
                    disabled={loading || saving}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {categories.map((c) => (
                <Badge key={c} variant="outline" className="flex items-center gap-2">
                  {c}
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => removeCategory(c)}
                    disabled={loading || saving}
                    aria-label={`Remove category ${c}`}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t">
            <Button variant="outline" type="button" onClick={() => navigate('/goal-templates')} disabled={saving} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={saving || loading} className="w-full sm:w-auto px-6">
              {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Template')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default EditGoalTemplate
