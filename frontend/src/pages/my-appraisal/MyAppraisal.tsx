import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../utils/api'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Progress } from '../../components/ui/progress'
import PeriodFilter, { type Period } from '../../components/PeriodFilter'
import { Calendar, Clock, TrendingUp, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react'

 type Appraisal = {
  appraisal_id: number
  appraisal_setting_id?: number | null
  appraisee_id: number
  appraiser_id: number
  reviewer_id: number
  appraisal_type_id: number
  appraisal_type_range_id?: number | null
  start_date: string
  end_date: string
  status: string
  appraiser_overall_comments?: string | null
  appraiser_overall_rating?: number | null
  reviewer_overall_comments?: string | null
  reviewer_overall_rating?: number | null
  created_at?: string
  updated_at?: string
}

type AppraisalGoal = {
  id: number
  goal?: { goal_weightage?: number }
  self_rating?: number | null
  appraiser_rating?: number | null
}

type AppraisalWithGoals = Appraisal & {
  appraisal_goals: AppraisalGoal[]
}

type AppraisalType = { id: number; name: string; has_range?: boolean }

const MyAppraisal = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [types, setTypes] = useState<AppraisalType[]>([])
  const [typesStatus, setTypesStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle')
  const [appraisals, setAppraisals] = useState<Appraisal[]>([])
  const [appraisalsLoading, setAppraisalsLoading] = useState(false)
  const [appraisalsError, setAppraisalsError] = useState<string | null>(null)
  const [detailsById, setDetailsById] = useState<Record<number, AppraisalWithGoals | undefined>>({})
  const [period, setPeriod] = useState<Period>(() => {
    const y = new Date().getFullYear()
    const start = new Date(y, 0, 1).toISOString().slice(0, 10)
    const end = new Date(y, 11, 31).toISOString().slice(0, 10)
    return { label: 'This Year', startDate: start, endDate: end }
  })
  const [actionError, setActionError] = useState<string | null>(null)
  // Pagination (5 per page)
  const ITEMS_PER_PAGE = 5
  const [myPage, setMyPage] = useState(1)
  // Filter for combined list
  const [myFilter, setMyFilter] = useState<'Active' | 'Completed' | 'All'>('Active')

  useEffect(() => {
    const loadTypes = async () => {
      setTypesStatus('loading')
      const res = await apiFetch<AppraisalType[]>('/api/appraisal-types')
      if (res.ok && res.data) {
        setTypes(res.data)
        setTypesStatus('succeeded')
      } else {
        setTypesStatus('failed')
      }
    }
    if (typesStatus === 'idle') loadTypes()
  }, [typesStatus])

  useEffect(() => {
    const loadAppraisals = async (empId: number) => {
      setAppraisalsLoading(true)
      setAppraisalsError(null)
      const res = await apiFetch<Appraisal[]>(`/api/appraisals?appraisee_id=${encodeURIComponent(empId)}`)
      if (res.ok && res.data) {
        setAppraisals(res.data)
      } else {
        setAppraisalsError(res.error || 'Failed to fetch appraisals')
      }
      setAppraisalsLoading(false)
    }
    if (user?.emp_id) loadAppraisals(user.emp_id)
  }, [user?.emp_id])

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString() } catch { return iso }
  }

  const typeNameById = useMemo(() => {
    const map = new Map(types.map(t => [t.id, t.name]))
    return (id: number) => map.get(id) || `Type #${id}`
  }, [types])
  const displayStatus = (status: string) => status === 'Submitted' ? 'Waiting Acknowledgement' : status
  const now = new Date()
  const activeStatuses = new Set<string>([
    'Submitted',
    'Appraisee Self Assessment',
    'Appraiser Evaluation',
    'Reviewer Evaluation',
  ])
  const upcomingActive = (appraisals || []).filter(a => {
    const end = new Date(a.end_date)
    return activeStatuses.has(a.status) && end >= now
  })
  const selectedAppraisal = upcomingActive.sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())[0] || null
  const dueDateStr = selectedAppraisal ? formatDate(selectedAppraisal.end_date) : '—'

  const appraisalsInPeriod = useMemo(() => {
    if (!period.startDate || !period.endDate) return appraisals
    const start = new Date(period.startDate)
    const end = new Date(period.endDate)
    return appraisals.filter(a => new Date(a.end_date) >= start && new Date(a.start_date) <= end)
  }, [appraisals, period])

  const myActives = useMemo(
    () => appraisalsInPeriod.filter(a => a.status === 'Submitted' || a.status === 'Appraisee Self Assessment'),
    [appraisalsInPeriod]
  )
  const myCompleted = useMemo(
    () => appraisalsInPeriod.filter(a => a.status === 'Complete'),
    [appraisalsInPeriod]
  )

  const combinedMine = useMemo(
    () => [...myActives, ...myCompleted].sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime()),
    [myActives, myCompleted]
  )
  const filteredMine = useMemo(() => {
    switch (myFilter) {
      case 'Active':
        return myActives
      case 'Completed':
        return myCompleted
      default:
        return combinedMine
    }
  }, [myFilter, myActives, myCompleted, combinedMine])

  const listTotalPages = Math.max(1, Math.ceil(filteredMine.length / ITEMS_PER_PAGE))

  const listPaged = useMemo(
    () => filteredMine.slice((myPage - 1) * ITEMS_PER_PAGE, myPage * ITEMS_PER_PAGE),
    [filteredMine, myPage]
  )

  useEffect(() => { setMyPage(1) }, [filteredMine.length, myFilter])

  useEffect(() => {
    const loadDetails = async (appraisalId: number) => {
      const res = await apiFetch<AppraisalWithGoals>(`/api/appraisals/${encodeURIComponent(appraisalId)}`)
      if (res.ok && res.data) {
        setDetailsById(prev => ({ ...prev, [appraisalId]: res.data! }))
      }
    }
    if (selectedAppraisal && !detailsById[selectedAppraisal.appraisal_id]) {
      loadDetails(selectedAppraisal.appraisal_id)
    }
  }, [selectedAppraisal?.appraisal_id, detailsById])

  const startOrContinueSelfAssessment = async (a: Appraisal) => {
    try {
      // If status is Submitted, move to Appraisee Self Assessment first
      if (a.status === 'Submitted') {
        const res = await apiFetch(`/api/appraisals/${a.appraisal_id}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'Appraisee Self Assessment' }),
        })
        if (!res.ok) { setActionError(res.error || 'Failed to start self assessment'); return }
      }
      setActionError(null)
      navigate(`/self-assessment/${a.appraisal_id}`)
    } catch (e: any) {
      setActionError('Unable to start self assessment')
    }
  }

  const completionPct = (() => {
    if (!selectedAppraisal) return null
    const details = detailsById[selectedAppraisal.appraisal_id]
    if (!details) return null
    const goals = details.appraisal_goals || []
    if (!goals.length) return 0
    const total = goals.reduce((acc, g) => acc + (g.goal?.goal_weightage ?? 0), 0)
    if (total <= 0) return 0
    const status = selectedAppraisal.status
    const useAppraiser = status === 'Appraiser Evaluation' || status === 'Reviewer Evaluation' || status === 'Complete'
    const completed = goals.reduce((acc, g) => {
      const done = useAppraiser ? (g.appraiser_rating != null) : (status === 'Appraisee Self Assessment' ? (g.self_rating != null) : false)
      return acc + (done ? (g.goal?.goal_weightage ?? 0) : 0)
    }, 0)
    return Math.round((completed / total) * 100)
  })()
  return (
    <div className="space-y-6 text-neutral-800">
      {/* Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm sm:text-base font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Appraisal Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neutral-900">
              {selectedAppraisal ? typeNameById(selectedAppraisal.appraisal_type_id) : '—'}
            </div>
          </CardContent>
        </Card>
      

        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm sm:text-base font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              Due Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neutral-900">{dueDateStr}</div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm sm:text-base font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completionPct == null ? (
              <div className="text-2xl font-bold text-neutral-400">—</div>
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-bold text-neutral-900">{completionPct}%</div>
                <Progress value={completionPct} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sections grid */}
      <div className="grid grid-cols-1 gap-6">
      {/* My Appraisals (Active + Completed with filter) */}
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            My Appraisals
          </CardTitle>
          <div className="w-full sm:w-auto">
            <PeriodFilter
              defaultPreset="This Year"
              value={period}
              onChange={setPeriod}
              className="w-full sm:max-w-xl"
            />
          </div>
        </CardHeader>
        <CardContent>
          {actionError && (
            <div className="text-sm text-red-600 mb-4 p-3 bg-red-50 rounded-md border border-red-200">
              {actionError}
            </div>
          )}
          {appraisalsError && (
            <div className="text-sm text-red-600 mb-4 p-3 bg-red-50 rounded-md border border-red-200">
              {appraisalsError}
            </div>
          )}
          {appraisalsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-neutral-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant={myFilter === 'Active' ? 'default' : 'outline'}
                    onClick={() => setMyFilter('Active')}
                    className={myFilter === 'Active' ? 'bg-primary text-primary-foreground' : ''}
                  >
                    Active
                  </Button>
                  <Button
                    variant={myFilter === 'Completed' ? 'default' : 'outline'}
                    onClick={() => setMyFilter('Completed')}
                    className={myFilter === 'Completed' ? 'bg-primary text-primary-foreground' : ''}
                  >
                    Completed
                  </Button>
                  <Button
                    variant={myFilter === 'All' ? 'default' : 'outline'}
                    onClick={() => setMyFilter('All')}
                    className={myFilter === 'All' ? 'bg-primary text-primary-foreground' : ''}
                  >
                    All
                  </Button>
                </div>
                {filteredMine.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setMyPage(p => Math.max(1, p - 1))}
                      disabled={myPage <= 1}
                      title="Previous page"
                      aria-label="Previous page"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-neutral-600">Page {myPage} of {listTotalPages}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setMyPage(p => Math.min(listTotalPages, p + 1))}
                      disabled={myPage >= listTotalPages}
                      title="Next page"
                      aria-label="Next page"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-3">
              {filteredMine.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
                  <p>No items</p>
                </div>
              ) : (
                listPaged.map((a: any) => (
                  <div key={a.appraisal_id} className="rounded-lg border border-neutral-200 bg-white p-3 sm:p-4 text-sm transition-all duration-200 hover:shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium text-neutral-900">{typeNameById(a.appraisal_type_id)}</div>
                        <div className="text-sm text-neutral-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(a.start_date)} – {formatDate(a.end_date)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {a.status === 'Complete' ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Completed</Badge>
                        ) : (
                          <Badge variant={a.status === 'Submitted' ? 'secondary' : 'default'}>
                            {displayStatus(a.status)}
                          </Badge>
                        )}
                        {a.status === 'Submitted' || a.status === 'Appraisee Self Assessment' ? (
                          <Button
                            onClick={() => startOrContinueSelfAssessment(a)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            aria-label={a.status === 'Submitted' ? 'Take Self Assessment' : 'Continue Self Assessment'}
                            title={a.status === 'Submitted' ? 'Take Self Assessment' : 'Continue Self Assessment'}
                          >
                            <span className="hidden sm:inline">{a.status === 'Submitted' ? 'Take Self Assessment' : 'Continue Self Assessment'}</span>
                            <ArrowRight className="h-4 w-4 sm:ml-2" />
                          </Button>
                        ) : null}
                        {a.status === 'Complete' ? (
                          <Button
                            variant="outline"
                            onClick={() => navigate(`/appraisal/${a.appraisal_id}`)}
                            className="border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/40"
                            aria-label="View appraisal"
                            title="View appraisal"
                          >
                            <span className="hidden sm:inline">View</span>
                            <ArrowRight className="h-4 w-4 sm:ml-2" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default MyAppraisal;
