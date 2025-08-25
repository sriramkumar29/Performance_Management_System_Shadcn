import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../../utils/api'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Slider } from '../../components/ui/slider'
import { Textarea } from '../../components/ui/textarea'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Progress } from '../../components/ui/progress'
import {
  Calendar,
  Target,
  Weight,
  MessageSquare,
  Star,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  User,
  UserCheck,
  Eye,
  Home,
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
  appraiser_rating?: number | null
  appraiser_comment?: string | null
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
  appraiser_overall_comments?: string | null
  appraiser_overall_rating?: number | null
  reviewer_overall_comments?: string | null
  reviewer_overall_rating?: number | null
}

// Map API status to user-friendly text
const displayStatus = (s: string) => s === 'Submitted' ? 'Waiting Acknowledgement' : s

// Status badge coloring (neutral theme-aware styling)
const statusClass = (_s: string) => 'bg-muted text-foreground border-border'

const AppraisalView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [appraisal, setAppraisal] = useState<AppraisalWithGoals | null>(null)
  const [idx, setIdx] = useState(0) // 0..goals.length, where last index is overall page

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      const res = await apiFetch<AppraisalWithGoals>(`/api/appraisals/${encodeURIComponent(id)}`)
      if (res.ok && res.data) {
        setAppraisal(res.data)
      }
      setLoading(false)
    }
    load()
  }, [id])

  const goals = appraisal?.appraisal_goals || []
  const isOverallPage = idx === goals.length
  const current = goals[idx]
  const total = goals.length
  const progressPct = total > 0 ? Math.round((Math.min(idx, total) / total) * 100) : 100

  if (!appraisal) return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8" aria-busy={loading}>
      <div className="mx-auto max-w-5xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded-lg w-1/3"></div>
          <div className="h-32 bg-muted rounded-xl"></div>
          <div className="h-96 bg-muted rounded-xl"></div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8 animate-fade-in" aria-busy={loading}>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header Card */}
        <Card className="shadow-medium border-0 glass-effect">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Eye className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Appraisal View</h1>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(appraisal.start_date).toLocaleDateString()} – {new Date(appraisal.end_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={`px-3 py-1 text-sm font-medium ${statusClass(appraisal.status)}`}>
                  {displayStatus(appraisal.status)}
                </Badge>
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground">
                    {isOverallPage ? 'Overall Summary' : `Goal ${Math.min(idx + 1, total)} of ${total}`}
                  </div>
                  <div className="text-xs text-muted-foreground">{progressPct}% Complete</div>
                </div>
              </div>
            </div>
            <Progress value={progressPct} className="h-2 mt-4" />
          </CardHeader>
        </Card>

        {!isOverallPage && current && (
          <Card className="shadow-medium border-0 glass-effect animate-slide-up">
            <CardHeader className="pb-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <h2 className="text-xl font-semibold text-foreground leading-tight">{current.goal.goal_title}</h2>
                  {current.goal.goal_description && (
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{current.goal.goal_description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Weight className="h-3 w-3" />
                      <span>Weightage: {current.goal.goal_weightage}%</span>
                    </div>
                    {current.goal.category && (
                      <Badge variant="secondary" className="text-xs">{current.goal.category.name}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Self Assessment (read-only) */}
              <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium text-foreground">Employee Self Assessment</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" />
                    <label className="text-sm font-medium text-foreground">Self Rating</label>
                    {current.self_rating && (
                      <Badge variant="outline" className="ml-auto">{current.self_rating}/5</Badge>
                    )}
                  </div>
                  <Slider min={1} max={5} step={1} value={current.self_rating != null ? [current.self_rating] : undefined} disabled className="opacity-70" />
                  <div>
                    <label className="text-sm font-medium text-foreground flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Self Comments</label>
                    <Textarea rows={3} value={current.self_comment ?? 'No comments provided'} disabled className="bg-card/50 border-border resize-none" />
                  </div>
                </div>
              </div>

              {/* Appraiser Evaluation (read-only) */}
              <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium text-foreground">Appraiser Evaluation</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" />
                    <label className="text-sm font-medium text-foreground">Appraiser Rating</label>
                    {current.appraiser_rating && (
                      <Badge variant="outline" className="ml-auto">{current.appraiser_rating}/5</Badge>
                    )}
                  </div>
                  <Slider min={1} max={5} step={1} value={current.appraiser_rating != null ? [current.appraiser_rating] : undefined} disabled className="opacity-70" />
                  <div>
                    <label className="text-sm font-medium text-foreground flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Appraiser Comments</label>
                    <Textarea rows={4} value={current.appraiser_comment ?? 'No comments provided'} disabled className="bg-card/50 border-border resize-none" />
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/50">
                <Button variant="outline" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={loading || idx === 0} className="w-full sm:w-auto">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous Goal
                </Button>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex gap-1" role="list" aria-label="Progress steps">
                    {Array.from({ length: total + 1 }, (_, i) => (
                      <div
                        key={i}
                        role="listitem"
                        aria-label={`Step ${i + 1} of ${total + 1}${i === idx ? ', current step' : ''}`}
                        aria-current={i === idx ? 'step' : undefined}
                        className={`w-2 h-2 rounded-full ${i === idx ? 'bg-primary' : i < idx ? 'bg-primary/60' : 'bg-border'}`}
                      />
                    ))}
                  </div>
                </div>

                <Button onClick={() => setIdx((i) => Math.min(total, i + 1))} disabled={loading || idx === total} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                  {idx === total - 1 ? 'Overall Summary' : 'Next Goal'}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isOverallPage && (
          <Card className="shadow-medium border-0 glass-effect animate-slide-up">
            <CardHeader className="pb-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <h2 className="text-xl font-semibold text-foreground leading-tight">Overall Evaluation</h2>
                  <p className="text-sm text-muted-foreground">Summary of appraiser and reviewer assessments</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Appraiser Overall - read only */}
                <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium text-foreground">Appraiser Overall Assessment</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      <label className="text-sm font-medium text-foreground">Overall Rating</label>
                      {appraisal.appraiser_overall_rating && (
                        <Badge variant="outline" className="ml-auto">{appraisal.appraiser_overall_rating}/5</Badge>
                      )}
                    </div>
                    <Slider min={1} max={5} step={1} value={appraisal.appraiser_overall_rating != null ? [appraisal.appraiser_overall_rating] : undefined} disabled className="opacity-70" />
                    <div>
                      <label className="text-sm font-medium text-foreground flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Overall Comments</label>
                      <Textarea rows={4} value={appraisal.appraiser_overall_comments ?? 'No comments provided'} disabled className="bg-card/50 border-border resize-none" />
                    </div>
                  </div>
                </div>

                {/* Reviewer Overall - read only */}
                <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium text-foreground">Reviewer Overall Assessment</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      <label className="text-sm font-medium text-foreground">Overall Rating</label>
                      {appraisal.reviewer_overall_rating && (
                        <Badge variant="outline" className="ml-auto">{appraisal.reviewer_overall_rating}/5</Badge>
                      )}
                    </div>
                    <Slider min={1} max={5} step={1} value={appraisal.reviewer_overall_rating != null ? [appraisal.reviewer_overall_rating] : undefined} disabled className="opacity-70" />
                    <div>
                      <label className="text-sm font-medium text-foreground flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Overall Comments</label>
                      <Textarea rows={5} value={appraisal.reviewer_overall_comments ?? 'No comments provided'} disabled className="bg-card/50 border-border resize-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/50">
                <Button variant="outline" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={loading} className="w-full sm:w-auto">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous Goal
                </Button>
                <Button
                  onClick={() => navigate('/')}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
                  aria-label="Home"
                  title="Home"
                >
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">Go Home</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default AppraisalView
