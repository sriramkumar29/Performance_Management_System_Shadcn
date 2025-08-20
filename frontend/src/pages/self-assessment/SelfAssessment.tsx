import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../../utils/api'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Slider } from '../../components/ui/slider'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { Progress } from '../../components/ui/progress'
import { 
  Target, 
  Calendar, 
  Weight, 
  MessageSquare, 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  Send,
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react'

interface GoalCategory { id: number; name: string }
interface Goal {
  goal_id: number
  goal_title: string
  goal_description?: string | null
  goal_importance?: string | null
  goal_weightage: number
  category?: GoalCategory | null
}
interface AppraisalGoal {
  id: number
  goal_id: number
  goal: Goal
  self_rating?: number | null
  self_comment?: string | null
}
interface AppraisalWithGoals {
  appraisal_id: number
  appraisee_id: number
  appraiser_id: number
  reviewer_id: number
  appraisal_type_id: number
  appraisal_type_range_id?: number | null
  start_date: string
  end_date: string
  status: string
  appraisal_goals: AppraisalGoal[]
}

type FormState = Record<number, { rating: number | null; comment: string }>

const SelfAssessment = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [appraisal, setAppraisal] = useState<AppraisalWithGoals | null>(null)
  const [idx, setIdx] = useState(0)
  const [form, setForm] = useState<FormState>({})
  const [banner, setBanner] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)

  const load = async () => {
    if (!id) return
    setLoading(true)
    const res = await apiFetch<AppraisalWithGoals>(`/api/appraisals/${encodeURIComponent(id)}`)
    if (res.ok && res.data) {
      setAppraisal(res.data)
      // Guard: only allow in Appraisee Self Assessment stage
      if (res.data.status !== 'Appraisee Self Assessment') {
        setBanner({ type: 'info', message: `This appraisal is in '${res.data.status}' stage` })
        navigate('/')
        setLoading(false)
        return
      }
      // seed form from existing self inputs if any
      const initial: FormState = {}
      for (const ag of res.data.appraisal_goals || []) {
        initial[ag.goal.goal_id] = {
          rating: ag.self_rating ?? null,
          comment: ag.self_comment ?? ''
        }
      }
      setForm(initial)
    } else {
      setBanner({ type: 'error', message: res.error || 'Failed to load appraisal' })
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const goals = appraisal?.appraisal_goals || []
  const current = goals[idx]
  const total = goals.length

  const canPrev = idx > 0
  const canNext = idx < total - 1

  const setCurrentField = (goalId: number, patch: Partial<{ rating: number | null; comment: string }>) => {
    setForm(prev => ({ ...prev, [goalId]: { rating: prev[goalId]?.rating ?? null, comment: prev[goalId]?.comment ?? '', ...patch } }))
  }

  const validateCurrent = () => {
    if (!current) return false
    const cur = form[current.goal.goal_id] || { rating: null, comment: '' }
    return !!(cur.rating && cur.comment && cur.comment.trim().length > 0)
  }

  const handleNext = () => {
    if (!validateCurrent()) {
      setBanner({ type: 'error', message: 'Rating (1-5) and comment are required' })
      return
    }
    if (canNext) setIdx(i => i + 1)
  }

  const handlePrev = () => { if (canPrev) setIdx(i => i - 1) }

  const handleSubmit = async () => {
    if (!appraisal) return
    // ensure all goals filled
    for (const ag of goals) {
      const v = form[ag.goal.goal_id]
      if (!v || !v.rating || !v.comment || !v.comment.trim()) {
        const missingIdx = goals.findIndex(g => g.goal.goal_id === ag.goal.goal_id)
        setIdx(missingIdx >= 0 ? missingIdx : 0)
        setBanner({ type: 'error', message: 'Please provide rating and comment for all goals' })
        return
      }
    }

    setLoading(true)
    try {
      const payload: any = { goals: {} as Record<number, any> }
      for (const ag of goals) {
        const v = form[ag.goal.goal_id]
        payload.goals[ag.goal.goal_id] = {
          self_rating: v.rating,
          self_comment: v.comment,
        }
      }
      const res = await apiFetch(`/api/appraisals/${appraisal.appraisal_id}/self-assessment`, { method: 'PUT', body: JSON.stringify(payload) })
      if (!res.ok) throw new Error(res.error || 'Failed to submit self assessment')

      // move status to Appraiser Evaluation
      const st = await apiFetch(`/api/appraisals/${appraisal.appraisal_id}/status`, { method: 'PUT', body: JSON.stringify({ status: 'Appraiser Evaluation' }) })
      if (!st.ok) throw new Error(st.error || 'Failed to advance status')
      setBanner({ type: 'success', message: 'Self assessment submitted. Your appraiser will evaluate and you will be notified.' })
      navigate('/')
    } catch (e: any) {
      setBanner({ type: 'error', message: e.message || 'Submission failed' })
    } finally {
      setLoading(false)
    }
  }

  if (!appraisal) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6 lg:p-8" aria-busy={loading}>
      <div className="mx-auto max-w-4xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded-lg w-1/3"></div>
          <div className="h-32 bg-slate-200 rounded-xl"></div>
          <div className="h-96 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    </div>
  )

  const progressPercentage = total > 0 ? ((idx + 1) / total) * 100 : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6 lg:p-8 animate-fade-in" aria-busy={loading}>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Banner */}
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

        {/* Header Card */}
        <Card className="shadow-medium border-0 glass-effect">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-2xl lg:text-3xl font-bold text-gradient">
                  Self Assessment
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {new Date(appraisal.start_date).toLocaleDateString()} – {new Date(appraisal.end_date).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="px-3 py-1 text-sm font-medium">
                  {appraisal.status}
                </Badge>
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground">
                    Goal {idx + 1} of {total}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {Math.round(progressPercentage)}% Complete
                  </div>
                </div>
              </div>
            </div>
            <Progress value={progressPercentage} className="h-2 mt-4" />
          </CardHeader>
        </Card>

        {/* Goal Assessment Card */}
        {current && (
          <Card className="shadow-medium border-0 glass-effect animate-slide-up">
            <CardHeader className="pb-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <h2 className="text-xl font-semibold text-foreground leading-tight">
                    {current.goal.goal_title}
                  </h2>
                  {current.goal.goal_description && (
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {current.goal.goal_description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Weight className="h-3 w-3" />
                      <span>Weightage: {current.goal.goal_weightage}%</span>
                    </div>
                    {current.goal.category && (
                      <Badge variant="secondary" className="text-xs">
                        {current.goal.category.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Rating Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  <label className="text-sm font-medium text-foreground">
                    Your Rating (1-5)
                  </label>
                  {form[current.goal.goal_id]?.rating && (
                    <Badge variant="outline" className="ml-auto">
                      {form[current.goal.goal_id]?.rating}/5
                    </Badge>
                  )}
                </div>
                <div className="px-3">
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={
                      form[current.goal.goal_id]?.rating != null
                        ? [Number(form[current.goal.goal_id]!.rating as number)]
                        : [1]
                    }
                    onValueChange={(v: number[]) =>
                      setCurrentField(current.goal.goal_id, { rating: Number(v[0]) })
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Poor</span>
                    <span>Below Average</span>
                    <span>Average</span>
                    <span>Good</span>
                    <span>Excellent</span>
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <label className="text-sm font-medium text-foreground">
                    Your Comments
                  </label>
                </div>
                <Textarea
                  rows={5}
                  placeholder="Share specific examples, achievements, challenges, and outcomes that demonstrate your performance for this goal..."
                  value={form[current.goal.goal_id]?.comment ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                    setCurrentField(current.goal.goal_id, { comment: e.target.value })
                  }
                  className="resize-none focus:ring-2 focus:ring-primary/20 border-border/50"
                />
                <div className="text-xs text-muted-foreground">
                  {form[current.goal.goal_id]?.comment?.length || 0} characters
                </div>
              </div>

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/50">
                <Button 
                  variant="outline" 
                  onClick={handlePrev} 
                  disabled={!canPrev}
                  className="w-full sm:w-auto"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous Goal
                </Button>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex gap-1">
                    {Array.from({ length: total }, (_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i === idx 
                            ? 'bg-primary' 
                            : i < idx 
                            ? 'bg-green-500' 
                            : 'bg-border'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {canNext ? (
                  <Button
                    onClick={handleNext}
                    disabled={loading || !validateCurrent()}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Next Goal
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || !validateCurrent()}
                    className="w-full sm:w-auto bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white shadow-lg"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Submit Assessment
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default SelfAssessment
