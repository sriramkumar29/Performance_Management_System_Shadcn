import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Slider } from "../../components/ui/slider";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { BUTTON_STYLES, ICON_SIZES } from "../../constants/buttonStyles";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Flag,
  MessageSquare,
  Star,
  ChevronDown,
  ChevronUp,
  Save,
  ArrowLeft,
  Eye,
  CheckCircle2,
  Clock,
  TrendingUp,
  X,
  Send,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../components/ui/collapsible";
import { toast } from "sonner";
import { PageHeaderSkeleton } from "../../components/PageHeaderSkeleton";
import { GoalsSkeleton } from "../../components/GoalsSkeleton";

interface GoalCategory {
  id: number;
  name: string;
}
interface Goal {
  goal_id: number;
  goal_title: string;
  goal_description?: string | null;
  goal_importance?: string | null;
  goal_weightage: number;
  category?: GoalCategory | null;
}
interface AppraisalGoal {
  id: number;
  goal_id: number;
  goal: Goal;
  self_rating?: number | null;
  self_comment?: string | null;
}
interface AppraisalWithGoals {
  appraisal_id: number;
  appraisee_id: number;
  appraiser_id: number;
  reviewer_id: number;
  appraisal_type_id: number;
  appraisal_type_range_id?: number | null;
  start_date: string;
  end_date: string;
  status: string;
  appraisal_goals: AppraisalGoal[];
}

type FormState = Record<number, { rating: number | null; comment: string }>;

const SelfAssessment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReadOnly = searchParams.get("readonly") === "true";
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [appraisal, setAppraisal] = useState<AppraisalWithGoals | null>(null);
  const [form, setForm] = useState<FormState>({});
  const [initialForm, setInitialForm] = useState<FormState>({});
  const [openGoals, setOpenGoals] = useState<Record<number, boolean>>({});
  const [showExitDialog, setShowExitDialog] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await apiFetch<AppraisalWithGoals>(
      `/api/appraisals/${encodeURIComponent(id)}`
    );
    if (res.ok && res.data) {
      setAppraisal(res.data);
      // Guard: allow in Appraisee Self Assessment stage for editing,
      // or in Appraiser/Reviewer Evaluation for read-only viewing
      const allowedStatuses = isReadOnly
        ? ["Appraiser Evaluation", "Reviewer Evaluation", "Complete"]
        : ["Appraisee Self Assessment"];

      if (!allowedStatuses.includes(res.data.status)) {
        toast.info(`This appraisal is in '${res.data.status}' stage`);
        navigate("/");
        setLoading(false);
        return;
      }
      // seed form from existing self inputs if any
      const initial: FormState = {};
      const openState: Record<number, boolean> = {};
      for (const ag of res.data.appraisal_goals || []) {
        initial[ag.goal.goal_id] = {
          rating: ag.self_rating ?? null,
          comment: ag.self_comment ?? "",
        };
        // Open first goal by default
        openState[ag.goal.goal_id] = false;
      }
      if (res.data.appraisal_goals.length > 0) {
        openState[res.data.appraisal_goals[0].goal.goal_id] = true;
      }
      setForm(initial);
      setInitialForm(initial); // Save initial state for comparison
      setOpenGoals(openState);
    } else {
      toast.error(res.error || "Failed to load appraisal");
    }
    setLoading(false);
  }, [id, isReadOnly, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const goals = appraisal?.appraisal_goals || [];
  const total = goals.length;

  const setCurrentField = useCallback(
    (
      goalId: number,
      patch: Partial<{ rating: number | null; comment: string }>
    ) => {
      setForm((prev) => ({
        ...prev,
        [goalId]: {
          rating: prev[goalId]?.rating ?? null,
          comment: prev[goalId]?.comment ?? "",
          ...patch,
        },
      }));
    },
    []
  );

  const isGoalComplete = useCallback(
    (goalId: number) => {
      const goal = form[goalId];
      return !!(
        goal?.rating &&
        goal?.comment &&
        goal.comment.trim().length > 0
      );
    },
    [form]
  );

  const completedCount = useMemo(() => {
    return goals.filter((g) => isGoalComplete(g.goal.goal_id)).length;
  }, [goals, isGoalComplete]);

  const handleSave = useCallback(async () => {
    if (!appraisal) return;

    setSaving(true);
    try {
      const payload: any = { goals: {} as Record<number, any> };
      for (const ag of goals) {
        const v = form[ag.goal.goal_id];
        if (v?.rating || v?.comment?.trim()) {
          payload.goals[ag.goal.goal_id] = {
            self_rating: v.rating,
            self_comment: v.comment,
          };
        }
      }
      const res = await apiFetch(
        `/api/appraisals/${appraisal.appraisal_id}/self-assessment`,
        { method: "PUT", body: JSON.stringify(payload) }
      );
      if (!res.ok) throw new Error(res.error || "Failed to save assessment");

      toast.success("Assessment saved successfully");
      // Navigate back after successful save
      navigate(-1);
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }, [appraisal, goals, form, navigate]);

  const handleSubmit = useCallback(async () => {
    if (!appraisal) return;
    // ensure all goals filled
    for (const ag of goals) {
      const v = form[ag.goal.goal_id];
      if (!v?.rating || !v?.comment?.trim()) {
        toast.error("Please provide rating and comment for all goals");
        // Open the first incomplete goal
        const incompleteGoal = goals.find(
          (g) => !isGoalComplete(g.goal.goal_id)
        );
        if (incompleteGoal) {
          setOpenGoals((prev) => ({
            ...prev,
            [incompleteGoal.goal.goal_id]: true,
          }));
        }
        return;
      }
    }

    setSaving(true);
    try {
      const payload: any = { goals: {} as Record<number, any> };
      for (const ag of goals) {
        const v = form[ag.goal.goal_id];
        payload.goals[ag.goal.goal_id] = {
          self_rating: v.rating,
          self_comment: v.comment,
        };
      }
      const res = await apiFetch(
        `/api/appraisals/${appraisal.appraisal_id}/self-assessment`,
        { method: "PUT", body: JSON.stringify(payload) }
      );
      if (!res.ok)
        throw new Error(res.error || "Failed to submit self assessment");

      // move status to Appraiser Evaluation
      const st = await apiFetch(
        `/api/appraisals/${appraisal.appraisal_id}/status`,
        {
          method: "PUT",
          body: JSON.stringify({ status: "Appraiser Evaluation" }),
        }
      );
      if (!st.ok) throw new Error(st.error || "Failed to advance status");
      toast.success("Self assessment submitted", {
        description: "Your appraiser will evaluate and you will be notified.",
      });
      navigate("/");
    } catch (e: any) {
      toast.error(e.message || "Submission failed");
    } finally {
      setSaving(false);
    }
  }, [appraisal, goals, form, navigate, isGoalComplete]);

  const toggleGoal = useCallback((goalId: number) => {
    setOpenGoals((prev) => ({
      ...prev,
      [goalId]: !prev[goalId],
    }));
  }, []);

  const handleBackClick = () => {
    if (!isReadOnly) {
      // Check if there are actual changes in the form
      const hasChanges = Object.keys(form).some((goalIdStr) => {
        const goalId = Number(goalIdStr);
        const current = form[goalId];
        const initial = initialForm[goalId];

        // If initial doesn't exist, there are changes
        if (!initial) return true;

        // Compare rating and comment
        return (
          current.rating !== initial.rating ||
          current.comment !== initial.comment
        );
      });

      if (hasChanges) {
        setShowExitDialog(true);
      } else {
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  const handleSaveAndClose = async () => {
    setShowExitDialog(false);
    await handleSave();
  };

  const handleCloseWithoutSaving = () => {
    setShowExitDialog(false);
    navigate(-1);
  };

  const progressPercentage = total > 0 ? (completedCount / total) * 100 : 0;

  if (!appraisal)
    return (
      <div
        className="min-h-screen bg-background p-4 md:p-6 lg:p-8"
        aria-busy={loading}
      >
        <div className="mx-auto max-w-full">
          <PageHeaderSkeleton />
          <GoalsSkeleton count={5} />
        </div>
      </div>
    );

  return (
    <div
      className="h-screen flex flex-col bg-background overflow-hidden"
      aria-busy={loading}
    >
      {/* Fixed Header Section */}
      <div className="flex-none bg-background sticky top-0 z-40 border-b border-border/50">
        <div className="px-1 pt-0.5 pb-2">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Back Button + Title */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleBackClick}
                variant={BUTTON_STYLES.BACK.variant}
                size={BUTTON_STYLES.BACK.size}
                className={BUTTON_STYLES.BACK.className}
                title="Go back"
                aria-label="Go back"
              >
                <ArrowLeft className={ICON_SIZES.DEFAULT} />
              </Button>
              <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Self Assessment
              </h1>
            </div>

            {/* Center: Goal Selection Squares + Goal Count */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
              {/* Goal Selection Squares */}
              <div className="flex items-center gap-2">
                {goals.map((ag, index) => {
                  const goalId = ag.goal.goal_id;
                  const isComplete = isGoalComplete(goalId);
                  const isOpen = openGoals[goalId] || false;

                  // Color based on completion status
                  let squareColor = "bg-gray-400";

                  if (isComplete) {
                    squareColor = "bg-red-500";
                  } else if (isOpen) {
                    squareColor = "bg-orange-500";
                  } else if (index < completedCount) {
                    squareColor = "bg-orange-400";
                  } else if (index === 0) {
                    squareColor = "bg-yellow-500";
                  }

                  const handleSquareClick = () => {
                    // Find the goal card element
                    const goalElement = document.getElementById(
                      `goal-card-${goalId}`
                    );
                    if (goalElement) {
                      // Toggle the goal (open if closed, close if open)
                      toggleGoal(goalId);

                      // If opening, wait for animation then scroll
                      if (!isOpen) {
                        setTimeout(() => {
                          goalElement.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                        }, 100);
                      }
                    }
                  };

                  return (
                    <button
                      key={goalId}
                      onClick={handleSquareClick}
                      className={`relative flex-shrink-0 w-8 h-8 rounded transition-all duration-200 hover:scale-110 z-10 group ${squareColor} flex items-center justify-center shadow-md ${
                        isOpen ? "ring-2 ring-primary ring-offset-2" : ""
                      }`}
                      title={`Goal ${index + 1}: ${ag.goal.goal_title}`}
                      aria-label={`Goal ${index + 1}: ${ag.goal.goal_title}`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      ) : (
                        <span className="text-xs font-bold text-white">
                          {index + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Goal Statistics */}
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">
                  {completedCount} of {total} Goals
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  {Math.round(progressPercentage)}% Complete
                </span>
              </div>
            </div>

            {/* Right: Action Buttons */}
            {!isReadOnly && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSave}
                  disabled={saving || loading}
                  variant={BUTTON_STYLES.SAVE.variant}
                  className={BUTTON_STYLES.SAVE.className}
                >
                  <Save className={`${ICON_SIZES.DEFAULT} mr-2`} />
                  Save & Close
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={saving || loading || completedCount < total}
                  variant={BUTTON_STYLES.SUBMIT.variant}
                  className={BUTTON_STYLES.SUBMIT.className}
                >
                  <Send className={`${ICON_SIZES.DEFAULT} mr-2`} />
                  Submit Assessment
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Goal Cards Container */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="px-1 py-2">
          <div className="space-y-2">
            {goals.map((ag, index) => {
              const goalId = ag.goal.goal_id;
              const isComplete = isGoalComplete(goalId);
              const isOpen = openGoals[goalId] || false;

              return (
                <Collapsible
                  key={goalId}
                  open={isOpen}
                  onOpenChange={() => toggleGoal(goalId)}
                >
                  <Card
                    id={`goal-card-${goalId}`}
                    className="shadow-soft hover-lift border-0 glass-effect animate-slide-up scroll-mt-24"
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="pb-4 cursor-pointer hover:bg-accent/50 transition-colors">
                        <div className="space-y-3">
                          {/* Line 1: Goal Number and Status */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-primary/10 flex-shrink-0">
                                <Flag className="h-4 w-4 text-primary" />
                              </div>
                              <span className="text-sm font-semibold text-foreground">
                                Goal {index + 1}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {isComplete ? (
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  Complete
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1"
                                >
                                  <Clock className="h-3 w-3" />
                                  Pending
                                </Badge>
                              )}
                              {isOpen ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          {/* Line 2: Title, Category, and Weightage */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <h2 className="text-base font-semibold text-foreground leading-tight truncate">
                                {ag.goal.goal_title}
                              </h2>
                              {ag.goal.category && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs bg-indigo-100 text-indigo-700 border-indigo-200 flex-shrink-0"
                                >
                                  {ag.goal.category.name}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <TrendingUp className="h-4 w-4" />
                                Weightage: {ag.goal.goal_weightage}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="space-y-6 pt-0">
                        {/* Description Section */}
                        {ag.goal.goal_description && (
                          <div className="space-y-2">
                            <div className="max-h-24 overflow-y-auto text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap pr-2 custom-scrollbar">
                              {ag.goal.goal_description}
                            </div>
                          </div>
                        )}

                        {/* Rating Section */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-primary" />
                            <label
                              htmlFor={`rating-${goalId}`}
                              className="text-sm font-medium text-foreground"
                            >
                              Your Rating (1-5)
                            </label>
                            {form[goalId]?.rating && (
                              <Badge
                                variant="outline"
                                className="ml-auto bg-emerald-50 text-emerald-700 border-emerald-200"
                              >
                                {form[goalId]?.rating}/5
                              </Badge>
                            )}
                          </div>
                          <div className="px-3">
                            <Slider
                              id={`rating-${goalId}`}
                              min={1}
                              max={5}
                              step={1}
                              value={
                                form[goalId]?.rating == null
                                  ? [1]
                                  : [form[goalId].rating as number]
                              }
                              onValueChange={(v: number[]) =>
                                !isReadOnly &&
                                setCurrentField(goalId, {
                                  rating: Number(v[0]),
                                })
                              }
                              disabled={isReadOnly}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>Poor</span>
                              <span>Below Avg</span>
                              <span>Average</span>
                              <span>Good</span>
                              <span>Excellent</span>
                            </div>
                          </div>
                        </div>

                        {/* Comments Section */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-primary" />
                            <label
                              htmlFor={`comment-${goalId}`}
                              className="text-sm font-medium text-foreground"
                            >
                              Your Comments
                            </label>
                          </div>
                          <Textarea
                            id={`comment-${goalId}`}
                            rows={3}
                            placeholder="Share specific examples, achievements, challenges, and outcomes that demonstrate your performance for this goal..."
                            value={form[goalId]?.comment ?? ""}
                            onChange={(
                              e: React.ChangeEvent<HTMLTextAreaElement>
                            ) =>
                              !isReadOnly &&
                              setCurrentField(goalId, {
                                comment: e.target.value,
                              })
                            }
                            disabled={isReadOnly}
                            className="focus:ring-2 focus:ring-primary/20 border-border/50"
                          />
                          <div className="text-xs text-muted-foreground">
                            {form[goalId]?.comment?.length || 0} characters
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        </div>
      </div>

      {/* Unsaved Changes Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Would you like to save your progress
              before leaving?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant={BUTTON_STYLES.CANCEL.variant}
              onClick={handleCloseWithoutSaving}
              className="w-full sm:w-auto"
            >
              Close Without Saving
            </Button>
            <Button
              onClick={handleSaveAndClose}
              disabled={saving}
              variant={BUTTON_STYLES.SAVE.variant}
              className={`w-full sm:w-auto ${BUTTON_STYLES.SAVE.className}`}
            >
              <Save className={`${ICON_SIZES.DEFAULT} mr-2`} />
              {saving ? "Saving..." : "Save & Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SelfAssessment;
