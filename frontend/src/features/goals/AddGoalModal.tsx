import { useState, useEffect } from 'react'
import { apiFetch } from '../../utils/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Label } from '../../components/ui/label'
import {
  Select as UiSelect,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../components/ui/select'
import { Plus, Target, Weight, AlertCircle, CheckCircle2, Info } from 'lucide-react'
 

interface AddGoalModalProps {
  open: boolean
  onClose: () => void
  onGoalAdded: (goal: AppraisalGoal) => void
  appraisalId?: number
  remainingWeightage?: number
}

interface Category {
  id: number
  name: string
}

interface AppraisalGoal {
  id: number
  appraisal_id: number
  goal_id: number
  goal: {
    goal_id: number
    goal_title: string
    goal_description: string
    goal_performance_factor: string
    goal_importance: string
    goal_weightage: number
    category_id: number
    category: Category
  }
}

interface GoalFormValues {
  goal_title: string
  goal_description: string
  goal_performance_factor: string
  goal_importance: string
  goal_weightage: number
  category_id: number
}

const AddGoalModal = ({ open, onClose, onGoalAdded, appraisalId, remainingWeightage = 100 }: AddGoalModalProps) => {
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [formValues, setFormValues] = useState<GoalFormValues>({
    goal_title: '',
    goal_description: '',
    goal_performance_factor: '',
    goal_importance: '',
    goal_weightage: 0,
    category_id: 0,
  })
  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  // Load categories when modal opens
  useEffect(() => {
    if (open) {
      loadCategories()
    }
  }, [open])

  const loadCategories = async () => {
    setLoadingCategories(true)
    try {
      const result = await apiFetch<Category[]>('/api/goals/categories')
      if (result.ok && result.data) {
        setCategories(result.data)
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
    } finally {
      setLoadingCategories(false)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const values = formValues
    setLoading(true)
    try {
      // Enforce remaining weightage locally
      if (values.goal_weightage > remainingWeightage) {
        throw new Error(`Weightage exceeds remaining ${remainingWeightage}%.`)
      }

      // Basic required checks
      if (!values.goal_title || !values.goal_description || !values.goal_performance_factor || !values.goal_importance || !values.category_id || !values.goal_weightage) {
        throw new Error('Please complete all fields before submitting')
      }

      // If we already have an appraisal, persist the goal and attach it to the appraisal.
      if (appraisalId) {
        // 1) Create goal
        const createRes = await apiFetch(`/api/goals`, {
          method: 'POST',
          body: JSON.stringify({
            goal_title: values.goal_title,
            goal_description: values.goal_description,
            goal_performance_factor: values.goal_performance_factor,
            goal_importance: values.goal_importance,
            goal_weightage: values.goal_weightage,
            category_id: values.category_id,
          }),
        })
        if (!createRes.ok || !createRes.data) {
          throw new Error(createRes.error || 'Failed to create goal')
        }
        const createdGoalId = (createRes.data as any).goal_id as number

        // 2) Attach to appraisal (only allowed when appraisal status is Draft)
        const attachRes = await apiFetch(`/api/appraisals/${appraisalId}/goals/${createdGoalId}`, {
          method: 'POST',
        })
        if (!attachRes.ok) {
          // Roll back created goal to avoid orphan on attach failure
          await apiFetch(`/api/goals/${createdGoalId}`, { method: 'DELETE' }).catch(() => {})
          throw new Error(attachRes.error || 'Failed to add goal to appraisal')
        }

        // Backend returns the updated appraisal with appraisal_goals; find the newly added goal
        let updated = attachRes.data as any
        if (!updated) {
          const refetch = await apiFetch(`/api/appraisals/${appraisalId}`)
          if (refetch.ok) {
            updated = refetch.data as any
          }
        }
        const added: AppraisalGoal | undefined = (updated?.appraisal_goals || []).find(
          (ag: any) => ag.goal_id === createdGoalId || ag?.goal?.goal_id === createdGoalId
        )

        if (added) {
          onGoalAdded(added)
        }
        setBanner({ type: 'success', message: 'Goal added to appraisal' })
        handleCancel()
      } else {
        // Client-only: build a pseudo AppraisalGoal for in-memory staging
        const category = categories.find(c => c.id === values.category_id)
        const tempId = Date.now()
        const pseudo: AppraisalGoal = {
          id: tempId,
          appraisal_id: 0,
          goal_id: tempId,
          goal: {
            goal_id: tempId,
            goal_title: values.goal_title,
            goal_description: values.goal_description,
            goal_performance_factor: values.goal_performance_factor,
            goal_importance: values.goal_importance,
            goal_weightage: values.goal_weightage,
            category_id: values.category_id,
            category: category ? { id: category.id, name: category.name } : ({} as any),
          },
        }

        setBanner({ type: 'success', message: 'Goal added to appraisal form' })
        onGoalAdded(pseudo)
        handleCancel()
      }
    } catch (error: any) {
      setBanner({ type: 'error', message: error.message || 'Failed to add goal' })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormValues({
      goal_title: '',
      goal_description: '',
      goal_performance_factor: '',
      goal_importance: '',
      goal_weightage: 0,
      category_id: 0,
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel() }}>
      <DialogContent className="sm:max-w-2xl shadow-medium border-0 glass-effect">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-foreground">Add New Goal</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">Create a new performance goal for this appraisal</p>
            </div>
          </div>
        </DialogHeader>

        {banner && (
          <div
            role="status"
            className={`rounded-xl border p-4 text-sm shadow-soft animate-slide-up ${
              banner.type === 'error'
                ? 'border-red-200 text-red-700 bg-red-50'
                : banner.type === 'success'
                ? 'border-green-200 text-green-700 bg-green-50'
                : 'border-blue-200 text-blue-700 bg-blue-50'
            }`}
          >
            <div className="flex items-center gap-2">
              {banner.type === 'error' && <AlertCircle className="h-4 w-4" />}
              {banner.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
              {banner.type === 'info' && <Info className="h-4 w-4" />}
              {banner.message}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="goal_title" className="text-sm font-medium text-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Goal Title
              </Label>
              <Input
                id="goal_title"
                placeholder="Enter a clear, specific goal title"
                value={formValues.goal_title}
                onChange={(e) => setFormValues(v => ({ ...v, goal_title: e.target.value }))}
                className="h-11 focus:ring-2 focus:ring-primary/20 border-border/50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal_description" className="text-sm font-medium text-foreground">
                Goal Description
              </Label>
              <Textarea
                id="goal_description"
                rows={4}
                placeholder="Provide a detailed description of what needs to be achieved..."
                value={formValues.goal_description}
                onChange={(e) => setFormValues(v => ({ ...v, goal_description: e.target.value }))}
                className="resize-none focus:ring-2 focus:ring-primary/20 border-border/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal_performance_factor" className="text-sm font-medium text-foreground">
                Performance Factors
              </Label>
              <Textarea
                id="goal_performance_factor"
                rows={3}
                placeholder="Describe how performance will be measured and evaluated..."
                value={formValues.goal_performance_factor}
                onChange={(e) => setFormValues(v => ({ ...v, goal_performance_factor: e.target.value }))}
                className="resize-none focus:ring-2 focus:ring-primary/20 border-border/50"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal_importance" className="text-sm font-medium text-foreground">
                  Importance Level
                </Label>
                <UiSelect
                  value={formValues.goal_importance}
                  onValueChange={(value) => setFormValues(v => ({ ...v, goal_importance: value }))}
                >
                  <SelectTrigger className="h-11 focus:ring-2 focus:ring-primary/20 border-border/50">
                    <SelectValue placeholder="Select importance level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">🔴 High Priority</SelectItem>
                    <SelectItem value="Medium">🟡 Medium Priority</SelectItem>
                    <SelectItem value="Low">🟢 Low Priority</SelectItem>
                  </SelectContent>
                </UiSelect>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_id" className="text-sm font-medium text-foreground">
                  Category
                </Label>
                <UiSelect
                  value={formValues.category_id ? String(formValues.category_id) : ''}
                  onValueChange={(value) => setFormValues(v => ({ ...v, category_id: parseInt(value) || 0 }))}
                >
                  <SelectTrigger className="h-11 focus:ring-2 focus:ring-primary/20 border-border/50">
                    <SelectValue placeholder={loadingCategories ? "Loading..." : "Select category"} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </UiSelect>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal_weightage" className="text-sm font-medium text-foreground flex items-center gap-2">
                <Weight className="h-4 w-4 text-amber-500" />
                Weightage (%)
              </Label>
              <Input
                id="goal_weightage"
                type="number"
                min="1"
                max={remainingWeightage}
                placeholder="Enter weightage percentage"
                value={formValues.goal_weightage || ''}
                onChange={(e) => setFormValues(v => ({ ...v, goal_weightage: parseInt(e.target.value) || 0 }))}
                className="h-11 focus:ring-2 focus:ring-primary/20 border-border/50"
                required
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Remaining weightage: <span className="font-medium text-foreground">{remainingWeightage}%</span>
                </span>
                {remainingWeightage <= 0 && (
                  <span className="text-red-600 font-medium">No weightage remaining</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-border/50">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel} 
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || remainingWeightage <= 0}
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddGoalModal
