import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Slider } from "./ui/slider";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { BUTTON_STYLES, ICON_SIZES } from "../constants/buttonStyles";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Flag,
  MessageSquare,
  Star,
  ChevronDown,
  ChevronUp,
  Save,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Weight,
  Send,
  User,
  UserCheck,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { toast } from "sonner";
import { PageHeaderSkeleton } from "./PageHeaderSkeleton";
import { GoalsSkeleton } from "./GoalsSkeleton";

// Types
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
  appraiser_rating?: number | null;
  appraiser_comment?: string | null;
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
  appraiser_overall_comments?: string | null;
  appraiser_overall_rating?: number | null;
  reviewer_overall_comments?: string | null;
  reviewer_overall_rating?: number | null;
}

type FormState = Record<number, { rating: number | null; comment: string }>;

// Configuration for different workflow types
export type WorkflowMode =
  | "self-assessment"
  | "appraiser-evaluation"
  | "reviewer-evaluation"
  | "appraisal-view";

interface WorkflowConfig {
  mode: WorkflowMode;
  title: string;
  titleGradient: string;
  allowedStatuses: string[];
  isReadOnly: boolean;
  showSelfSection: boolean;
  showAppraiserSection: boolean;
  showReviewerSection: boolean;
  editableSelfSection: boolean;
  editableAppraiserSection: boolean;
  editableReviewerSection: boolean;
  ratingField: "self_rating" | "appraiser_rating" | "reviewer_rating" | null;
  commentField:
    | "self_comment"
    | "appraiser_comment"
    | "reviewer_comment"
    | null;
  submitButtonText: string;
  submitStatusChange: string | null;
  apiEndpoint: (appraisalId: number) => string;
}

const WORKFLOW_CONFIGS: Record<WorkflowMode, WorkflowConfig> = {
  "self-assessment": {
    mode: "self-assessment",
    title: "Self Assessment",
    titleGradient: "from-blue-600 to-purple-600",
    allowedStatuses: ["Appraisee Self Assessment"],
    isReadOnly: false,
    showSelfSection: true,
    showAppraiserSection: false,
    showReviewerSection: false,
    editableSelfSection: true,
    editableAppraiserSection: false,
    editableReviewerSection: false,
    ratingField: "self_rating",
    commentField: "self_comment",
    submitButtonText: "Submit Assessment",
    submitStatusChange: "Appraiser Evaluation",
    apiEndpoint: (id) => `/api/appraisals/${id}/self-assessment`,
  },
  "appraiser-evaluation": {
    mode: "appraiser-evaluation",
    title: "Appraiser Evaluation",
    titleGradient: "from-emerald-600 to-blue-600",
    allowedStatuses: ["Appraiser Evaluation"],
    isReadOnly: false,
    showSelfSection: true,
    showAppraiserSection: true,
    showReviewerSection: false,
    editableSelfSection: false,
    editableAppraiserSection: true,
    editableReviewerSection: false,
    ratingField: "appraiser_rating",
    commentField: "appraiser_comment",
    submitButtonText: "Submit Evaluation",
    submitStatusChange: "Reviewer Evaluation",
    apiEndpoint: (id) => `/api/appraisals/${id}/appraiser-evaluation`,
  },
  "reviewer-evaluation": {
    mode: "reviewer-evaluation",
    title: "Reviewer Evaluation",
    titleGradient: "from-indigo-600 to-purple-600",
    allowedStatuses: ["Reviewer Evaluation"],
    isReadOnly: false,
    showSelfSection: true,
    showAppraiserSection: true,
    showReviewerSection: false,
    editableSelfSection: false,
    editableAppraiserSection: false,
    editableReviewerSection: true,
    ratingField: null,
    commentField: null,
    submitButtonText: "Complete Appraisal",
    submitStatusChange: "Complete",
    apiEndpoint: (id) => `/api/appraisals/${id}/reviewer-evaluation`,
  },
  "appraisal-view": {
    mode: "appraisal-view",
    title: "Appraisal View",
    titleGradient: "from-violet-600 to-fuchsia-600",
    allowedStatuses: ["Submitted", "Appraisee Self Assessment", "Complete"],
    isReadOnly: true,
    showSelfSection: true,
    showAppraiserSection: true,
    showReviewerSection: false,
    editableSelfSection: false,
    editableAppraiserSection: false,
    editableReviewerSection: false,
    ratingField: null,
    commentField: null,
    submitButtonText: "",
    submitStatusChange: null,
    apiEndpoint: () => "",
  },
};

interface AppraisalWorkflowProps {
  appraisalId: string;
  mode: WorkflowMode;
  isReadOnly?: boolean;
}

const AppraisalWorkflow: React.FC<AppraisalWorkflowProps> = ({
  appraisalId,
  mode,
  isReadOnly: externalReadOnly,
}) => {
  const navigate = useNavigate();
  const config = WORKFLOW_CONFIGS[mode];
  const isReadOnly = externalReadOnly ?? config.isReadOnly;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [appraisal, setAppraisal] = useState<AppraisalWithGoals | null>(null);
  const [form, setForm] = useState<FormState>({});
  const [initialForm, setInitialForm] = useState<FormState>({});
  const [openGoals, setOpenGoals] = useState<Record<number, boolean>>({});
  const [openOverallAssessment, setOpenOverallAssessment] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  // For appraiser evaluation - overall comments
  const [appraiserOverall, setAppraiserOverall] = useState<{
    rating: number | null;
    comment: string;
  }>({ rating: 1, comment: "" }); // Default to 1 (Poor)

  // For reviewer evaluation - overall comments
  const [reviewerOverall, setReviewerOverall] = useState<{
    rating: number | null;
    comment: string;
  }>({ rating: 1, comment: "" }); // Default to 1 (Poor)

  const load = useCallback(async () => {
    if (!appraisalId) return;
    setLoading(true);
    const res = await apiFetch<AppraisalWithGoals>(
      `/api/appraisals/${encodeURIComponent(appraisalId)}`
    );
    if (res.ok && res.data) {
      setAppraisal(res.data);

      // Status guard - skip validation in readonly mode
      if (!isReadOnly && !config.allowedStatuses.includes(res.data.status)) {
        toast.info(`This appraisal is in '${res.data.status}' stage`);
        navigate("/");
        setLoading(false);
        return;
      }

      // Seed form from existing inputs
      const initial: FormState = {};
      const openState: Record<number, boolean> = {};

      for (const ag of res.data.appraisal_goals || []) {
        const ratingField = config.ratingField;
        const commentField = config.commentField;

        initial[ag.goal.goal_id] = {
          rating: ratingField ? (ag as any)[ratingField] ?? 1 : null, // Default to null (not set)
          comment: commentField ? (ag as any)[commentField] ?? "" : "",
        };
        openState[ag.goal.goal_id] = false;
      }

      // Open first goal by default
      if (res.data.appraisal_goals.length > 0) {
        openState[res.data.appraisal_goals[0].goal.goal_id] = true;
      }

      setForm(initial);
      setInitialForm(initial);
      setOpenGoals(openState);

      // Load appraiser overall if in appraiser mode
      if (mode === "appraiser-evaluation") {
        setAppraiserOverall({
          rating: res.data.appraiser_overall_rating ?? 1, // Default to 3 (Average) if null
          comment: res.data.appraiser_overall_comments ?? "",
        });
      }

      // Load reviewer overall if in reviewer mode
      if (mode === "reviewer-evaluation") {
        setReviewerOverall({
          rating: res.data.reviewer_overall_rating ?? 1, // Default to 3 (Average) if null
          comment: res.data.reviewer_overall_comments ?? "",
        });
      }
    } else {
      toast.error(res.error || "Failed to load appraisal");
    }
    setLoading(false);
  }, [appraisalId, config, mode, navigate]);

  useEffect(() => {
    load();
  }, [load]);

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
      // For reviewer evaluation, goals are not editable, so they're always "complete" from the goal perspective
      if (mode === "reviewer-evaluation") return true;

      if (isReadOnly) return true;
      const goal = form[goalId];
      return !!(
        goal?.rating &&
        goal?.comment &&
        goal.comment.trim().length > 0
      );
    },
    [form, isReadOnly, mode]
  );

  const completedCount = useMemo(() => {
    return goals.filter((g) => isGoalComplete(g.goal.goal_id)).length;
  }, [goals, isGoalComplete]);

  const handleSave = useCallback(async () => {
    if (!appraisal || isReadOnly) return;

    setSaving(true);
    try {
      const payload: any = { goals: {} as Record<number, any> };

      for (const ag of goals) {
        const v = form[ag.goal.goal_id];
        if (v?.rating || v?.comment?.trim()) {
          payload.goals[ag.goal.goal_id] = {};
          if (config.ratingField) {
            payload.goals[ag.goal.goal_id][config.ratingField] = v.rating;
          }
          if (config.commentField) {
            payload.goals[ag.goal.goal_id][config.commentField] = v.comment;
          }
        }
      }

      // Add overall for appraiser evaluation - always include
      if (mode === "appraiser-evaluation") {
        payload.appraiser_overall_rating = appraiserOverall.rating;
        payload.appraiser_overall_comments = appraiserOverall.comment;
      }

      // Add overall for reviewer evaluation - always include
      if (mode === "reviewer-evaluation") {
        payload.reviewer_overall_rating = reviewerOverall.rating;
        payload.reviewer_overall_comments = reviewerOverall.comment;
      }

      const res = await apiFetch(config.apiEndpoint(appraisal.appraisal_id), {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(res.error || "Failed to save");

      toast.success("Saved successfully");
      navigate(-1);
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }, [
    appraisal,
    goals,
    form,
    appraiserOverall,
    reviewerOverall,
    config,
    mode,
    isReadOnly,
    navigate,
  ]);

  const handleSubmit = useCallback(async () => {
    if (!appraisal || isReadOnly) return;

    // Validate all goals filled (skip for reviewer-evaluation as they don't edit goals)
    if (mode !== "reviewer-evaluation") {
      for (const ag of goals) {
        const v = form[ag.goal.goal_id];
        if (!v?.rating || !v?.comment?.trim()) {
          toast.error("Please provide rating and comment for all goals");
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
    }

    setSaving(true);
    try {
      const payload: any = { goals: {} as Record<number, any> };

      // Only include goal data if ratingField/commentField are configured (not for reviewer-evaluation)
      if (config.ratingField || config.commentField) {
        for (const ag of goals) {
          const v = form[ag.goal.goal_id];
          payload.goals[ag.goal.goal_id] = {};
          if (config.ratingField) {
            payload.goals[ag.goal.goal_id][config.ratingField] = v.rating;
          }
          if (config.commentField) {
            payload.goals[ag.goal.goal_id][config.commentField] = v.comment;
          }
        }
      }

      // For appraiser evaluation, add overall rating/comments
      if (mode === "appraiser-evaluation") {
        if (!appraiserOverall.rating || !appraiserOverall.comment.trim()) {
          toast.error("Please provide overall rating and comment");
          return;
        }
        payload.appraiser_overall_rating = appraiserOverall.rating;
        payload.appraiser_overall_comments = appraiserOverall.comment;
      }

      // For reviewer evaluation, add overall rating/comments
      if (mode === "reviewer-evaluation") {
        if (!reviewerOverall.rating || !reviewerOverall.comment.trim()) {
          toast.error("Please provide overall rating and comment");
          return;
        }
        payload.reviewer_overall_rating = reviewerOverall.rating;
        payload.reviewer_overall_comments = reviewerOverall.comment;
      }

      const res = await apiFetch(config.apiEndpoint(appraisal.appraisal_id), {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(res.error || "Failed to submit");

      // Advance status
      if (config.submitStatusChange) {
        const st = await apiFetch(
          `/api/appraisals/${appraisal.appraisal_id}/status`,
          {
            method: "PUT",
            body: JSON.stringify({ status: config.submitStatusChange }),
          }
        );
        if (!st.ok) throw new Error(st.error || "Failed to advance status");
      }

      toast.success(`${config.title} submitted successfully`);
      navigate("/");
    } catch (e: any) {
      toast.error(e.message || "Submission failed");
    } finally {
      setSaving(false);
    }
  }, [
    appraisal,
    goals,
    form,
    appraiserOverall,
    reviewerOverall,
    config,
    mode,
    isReadOnly,
    isGoalComplete,
    navigate,
  ]);

  const toggleGoal = useCallback((goalId: number) => {
    setOpenGoals((prev) => ({
      ...prev,
      [goalId]: !prev[goalId],
    }));
  }, []);

  const handleBackClick = () => {
    if (!isReadOnly) {
      const hasChanges = Object.keys(form).some((goalIdStr) => {
        const goalId = Number(goalIdStr);
        const current = form[goalId];
        const initial = initialForm[goalId];

        if (!initial) return true;

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

  // Loading skeleton
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
              <h1
                className={`text-xl lg:text-2xl font-bold bg-gradient-to-r ${config.titleGradient} bg-clip-text text-transparent`}
              >
                {config.title}
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

                  let squareColor = "bg-gray-400";

                  if (isComplete) {
                    squareColor = "bg-green-500";
                  } else if (isOpen) {
                    squareColor = "bg-orange-500";
                  } else if (index < completedCount) {
                    squareColor = "bg-orange-400";
                  } else if (index === 0) {
                    squareColor = "bg-yellow-500";
                  }

                  const handleSquareClick = () => {
                    const goalElement = document.getElementById(
                      `goal-card-${goalId}`
                    );
                    if (goalElement) {
                      toggleGoal(goalId);

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

                {/* Overall Assessment Button - For appraiser-evaluation, reviewer-evaluation, and appraisal-view */}
                {(mode === "appraiser-evaluation" ||
                  mode === "reviewer-evaluation" ||
                  mode === "appraisal-view") && (
                  <button
                    onClick={() => {
                      setOpenOverallAssessment(!openOverallAssessment);
                      if (!openOverallAssessment) {
                        setTimeout(() => {
                          const overallElement = document.getElementById(
                            "overall-assessment-card"
                          );
                          if (overallElement) {
                            overallElement.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                          }
                        }, 100);
                      }
                    }}
                    className={`relative flex-shrink-0 w-8 h-8 rounded transition-all duration-200 hover:scale-110 z-10 group ${
                      mode === "appraisal-view"
                        ? "bg-purple-500" // Always purple for appraisal-view
                        : (
                            mode === "appraiser-evaluation"
                              ? appraiserOverall.rating &&
                                appraiserOverall.comment.trim()
                              : reviewerOverall.rating &&
                                reviewerOverall.comment.trim()
                          )
                        ? "bg-green-500"
                        : openOverallAssessment
                        ? "bg-orange-500"
                        : "bg-purple-500"
                    } flex items-center justify-center shadow-md ${
                      openOverallAssessment
                        ? "ring-2 ring-primary ring-offset-2"
                        : ""
                    }`}
                    title="Overall Assessment"
                    aria-label="Overall Assessment"
                  >
                    <UserCheck className="h-4 w-4 text-white" />
                  </button>
                )}
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
                  {config.submitButtonText}
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
                          {/* Line 1: Goal Number, Category, and Status */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-primary/10 flex-shrink-0">
                                <Flag className="h-4 w-4 text-primary" />
                              </div>
                              <span className="text-base font-bold text-foreground">
                                Goal {index + 1}
                              </span>
                              {ag.goal.category && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs bg-indigo-100 text-indigo-700 border-indigo-200 flex-shrink-0"
                                >
                                  {ag.goal.category.name}
                                </Badge>
                              )}
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

                          {/* Line 2: Title and Weightage Badge */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <h2 className="text-base font-semibold text-foreground leading-tight truncate">
                                {ag.goal.goal_title}
                              </h2>
                              <Badge
                                variant="outline"
                                className="text-xs bg-purple-50 text-purple-700 border-purple-200 flex-shrink-0 flex items-center gap-1"
                              >
                                <Weight className="h-3 w-3" />
                                Weightage: {ag.goal.goal_weightage}%
                              </Badge>
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

                        {/* Self Assessment Section */}
                        {config.showSelfSection && (
                          <div
                            className={`rounded-lg border ${
                              config.editableSelfSection
                                ? "border-primary/20 bg-primary/5"
                                : "border-border/50 bg-background"
                            } p-4 space-y-4`}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <User className="h-4 w-4 text-primary" />
                              <h3 className="text-sm font-medium text-foreground">
                                Employee Self Assessment
                              </h3>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 text-primary" />
                                <label className="text-sm font-medium text-foreground">
                                  Self Rating
                                </label>
                                {config.editableSelfSection ? (
                                  form[goalId]?.rating && (
                                    <Badge
                                      variant="outline"
                                      className="bg-emerald-50 text-emerald-700 border-emerald-200"
                                    >
                                      {form[goalId]?.rating}/5
                                    </Badge>
                                  )
                                ) : ag.self_rating ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-emerald-50 text-emerald-700 border-emerald-200"
                                  >
                                    {ag.self_rating}/5
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="bg-gray-50 text-gray-600 border-gray-200"
                                  >
                                    Not Rated
                                  </Badge>
                                )}
                              </div>
                              {(config.editableSelfSection ||
                                ag.self_rating) && (
                                <div className="px-3">
                                  <Slider
                                    min={1}
                                    max={5}
                                    step={1}
                                    value={
                                      config.editableSelfSection
                                        ? form[goalId]?.rating == null
                                          ? [1]
                                          : [form[goalId].rating as number]
                                        : ag.self_rating == null
                                        ? [1]
                                        : [ag.self_rating]
                                    }
                                    onValueChange={(v: number[]) =>
                                      config.editableSelfSection &&
                                      setCurrentField(goalId, {
                                        rating: Number(v[0]),
                                      })
                                    }
                                    disabled={!config.editableSelfSection}
                                    className={
                                      !config.editableSelfSection
                                        ? "opacity-60"
                                        : ""
                                    }
                                  />
                                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                    <span>Poor</span>
                                    <span>Below Avg</span>
                                    <span>Average</span>
                                    <span>Good</span>
                                    <span>Excellent</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-primary" />
                                <label className="text-sm font-medium text-foreground">
                                  Comments
                                </label>
                              </div>
                              <Textarea
                                rows={3}
                                placeholder={
                                  config.editableSelfSection
                                    ? "Share your achievements and challenges..."
                                    : ""
                                }
                                value={
                                  config.editableSelfSection
                                    ? form[goalId]?.comment ?? ""
                                    : ag.self_comment ?? "No comments provided"
                                }
                                onChange={(
                                  e: React.ChangeEvent<HTMLTextAreaElement>
                                ) =>
                                  config.editableSelfSection &&
                                  setCurrentField(goalId, {
                                    comment: e.target.value,
                                  })
                                }
                                disabled={!config.editableSelfSection}
                                className={`focus:ring-2 focus:ring-primary/20 border-border/50 ${
                                  !config.editableSelfSection
                                    ? "opacity-60 bg-background/50 resize-none"
                                    : ""
                                }`}
                              />
                              {config.editableSelfSection && (
                                <div className="text-xs text-muted-foreground">
                                  {form[goalId]?.comment?.length || 0}{" "}
                                  characters
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Appraiser Evaluation Section */}
                        {config.showAppraiserSection && (
                          <div
                            className={`rounded-lg border ${
                              config.editableAppraiserSection
                                ? "border-primary/20 bg-primary/5"
                                : "border-border/50 bg-background"
                            } p-4 space-y-4`}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <UserCheck className="h-4 w-4 text-primary" />
                              <h3 className="text-sm font-medium text-foreground">
                                Appraiser Evaluation
                              </h3>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 text-primary" />
                                <label className="text-sm font-medium text-foreground">
                                  Appraiser Rating
                                </label>
                                {config.editableAppraiserSection ? (
                                  form[goalId]?.rating && (
                                    <Badge
                                      variant="outline"
                                      className="bg-emerald-50 text-emerald-700 border-emerald-200"
                                    >
                                      {form[goalId]?.rating}/5
                                    </Badge>
                                  )
                                ) : ag.appraiser_rating ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-emerald-50 text-emerald-700 border-emerald-200"
                                  >
                                    {ag.appraiser_rating}/5
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="bg-gray-50 text-gray-600 border-gray-200"
                                  >
                                    Not Rated
                                  </Badge>
                                )}
                              </div>
                              {(config.editableAppraiserSection ||
                                ag.appraiser_rating) && (
                                <div className="px-3">
                                  <Slider
                                    min={1}
                                    max={5}
                                    step={1}
                                    value={
                                      config.editableAppraiserSection
                                        ? form[goalId]?.rating == null
                                          ? [1]
                                          : [form[goalId].rating as number]
                                        : ag.appraiser_rating == null
                                        ? [1]
                                        : [ag.appraiser_rating]
                                    }
                                    onValueChange={(v: number[]) =>
                                      config.editableAppraiserSection &&
                                      setCurrentField(goalId, {
                                        rating: Number(v[0]),
                                      })
                                    }
                                    disabled={!config.editableAppraiserSection}
                                    className={
                                      !config.editableAppraiserSection
                                        ? "opacity-60"
                                        : ""
                                    }
                                  />
                                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                    <span>Poor</span>
                                    <span>Below Avg</span>
                                    <span>Average</span>
                                    <span>Good</span>
                                    <span>Excellent</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-primary" />
                                <label className="text-sm font-medium text-foreground">
                                  Comments
                                </label>
                              </div>
                              <Textarea
                                rows={3}
                                placeholder={
                                  config.editableAppraiserSection
                                    ? "Provide your evaluation and feedback..."
                                    : ""
                                }
                                value={
                                  config.editableAppraiserSection
                                    ? form[goalId]?.comment ?? ""
                                    : ag.appraiser_comment ??
                                      "No comments provided"
                                }
                                onChange={(
                                  e: React.ChangeEvent<HTMLTextAreaElement>
                                ) =>
                                  config.editableAppraiserSection &&
                                  setCurrentField(goalId, {
                                    comment: e.target.value,
                                  })
                                }
                                disabled={!config.editableAppraiserSection}
                                className={`focus:ring-2 focus:ring-primary/20 border-border/50 ${
                                  !config.editableAppraiserSection
                                    ? "opacity-60 bg-background/50 resize-none"
                                    : ""
                                }`}
                              />
                              {config.editableAppraiserSection && (
                                <div className="text-xs text-muted-foreground">
                                  {form[goalId]?.comment?.length || 0}{" "}
                                  characters
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>

          {/* Overall Rating Section - For appraiser-evaluation, reviewer-evaluation, and appraisal-view modes */}
          {(mode === "appraiser-evaluation" ||
            mode === "reviewer-evaluation" ||
            mode === "appraisal-view") &&
            appraisal && (
              <div className="mt-6" id="overall-assessment-card">
                {/* Combined Overall Assessment Card - Collapsible */}
                <Collapsible
                  open={openOverallAssessment}
                  onOpenChange={setOpenOverallAssessment}
                >
                  <Card className="border-border/50 shadow-sm">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="pb-4 cursor-pointer hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-5 w-5 text-primary" />
                            <span className="text-lg font-semibold text-foreground">
                              Overall Assessment
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {mode !== "appraisal-view" && (
                              <>
                                {mode === "appraiser-evaluation" ? (
                                  appraiserOverall.rating &&
                                  appraiserOverall.comment.trim() ? (
                                    <Badge
                                      variant="outline"
                                      className="bg-emerald-50 text-emerald-700 border-emerald-200"
                                    >
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Completed
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="bg-amber-50 text-amber-700 border-amber-200"
                                    >
                                      <Clock className="h-3 w-3 mr-1" />
                                      Pending
                                    </Badge>
                                  )
                                ) : reviewerOverall.rating &&
                                  reviewerOverall.comment.trim() ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-emerald-50 text-emerald-700 border-emerald-200"
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Completed
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="bg-amber-50 text-amber-700 border-amber-200"
                                  >
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pending
                                  </Badge>
                                )}
                              </>
                            )}
                            {openOverallAssessment ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="space-y-6 pt-0">
                        {mode === "appraiser-evaluation" ? (
                          /* Appraiser Evaluation Mode - Single Editable Section */
                          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
                            <div className="flex items-center gap-2 mb-3">
                              <UserCheck className="h-4 w-4 text-primary" />
                              <h3 className="text-sm font-medium text-foreground">
                                Your Overall Assessment
                              </h3>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 text-primary" />
                                <label className="text-sm font-medium text-foreground">
                                  Overall Rating (1-5)
                                </label>
                                {appraiserOverall.rating && (
                                  <Badge
                                    variant="outline"
                                    className="bg-emerald-50 text-emerald-700 border-emerald-200"
                                  >
                                    {appraiserOverall.rating}/5
                                  </Badge>
                                )}
                              </div>
                              <div className="px-3">
                                <Slider
                                  min={1}
                                  max={5}
                                  step={1}
                                  value={[appraiserOverall.rating ?? 1]}
                                  onValueChange={(v: number[]) =>
                                    setAppraiserOverall((p) => ({
                                      ...p,
                                      rating: v[0] ?? 1,
                                    }))
                                  }
                                  className="mb-2"
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

                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-primary" />
                                <label className="text-sm font-medium text-foreground">
                                  Comments
                                </label>
                              </div>
                              <Textarea
                                rows={6}
                                placeholder="Summarize overall performance, highlight key strengths, areas for improvement, and recommendations for development..."
                                value={appraiserOverall.comment}
                                onChange={(
                                  e: React.ChangeEvent<HTMLTextAreaElement>
                                ) =>
                                  setAppraiserOverall((p) => ({
                                    ...p,
                                    comment: e.target.value,
                                  }))
                                }
                                className="focus:ring-2 focus:ring-primary/20 border-border/50 resize-none"
                              />
                              <div className="text-xs text-muted-foreground">
                                {appraiserOverall.comment.length} characters
                              </div>
                            </div>
                          </div>
                        ) : mode === "reviewer-evaluation" ? (
                          /* Reviewer Evaluation Mode - Two Sections */
                          <>
                            {/* Appraiser Overall Assessment - Read Only */}
                            <div className="rounded-lg border border-border/50 bg-background p-4 space-y-4">
                              <div className="flex items-center gap-2 mb-3">
                                <User className="h-4 w-4 text-primary" />
                                <h3 className="text-sm font-medium text-foreground">
                                  Appraiser Overall Assessment
                                </h3>
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Star className="h-4 w-4 text-primary" />
                                  <label className="text-sm font-medium text-foreground">
                                    Overall Rating
                                  </label>
                                  {appraisal.appraiser_overall_rating && (
                                    <Badge
                                      variant="outline"
                                      className="bg-emerald-50 text-emerald-700 border-emerald-200"
                                    >
                                      {appraisal.appraiser_overall_rating}/5
                                    </Badge>
                                  )}
                                </div>
                                <div className="px-3">
                                  <Slider
                                    min={1}
                                    max={5}
                                    step={1}
                                    value={
                                      appraisal.appraiser_overall_rating == null
                                        ? [1]
                                        : [appraisal.appraiser_overall_rating]
                                    }
                                    disabled
                                    className="opacity-60"
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

                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4 text-primary" />
                                  <label className="text-sm font-medium text-foreground">
                                    Comments
                                  </label>
                                </div>
                                <Textarea
                                  rows={3}
                                  value={
                                    appraisal.appraiser_overall_comments ??
                                    "No comments provided"
                                  }
                                  disabled
                                  className="opacity-60 bg-background/50 resize-none border-border/50"
                                />
                              </div>
                            </div>

                            {/* Reviewer Overall Assessment - Editable */}
                            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
                              <div className="flex items-center gap-2 mb-3">
                                <UserCheck className="h-4 w-4 text-primary" />
                                <h3 className="text-sm font-medium text-foreground">
                                  Your Reviewer Assessment
                                </h3>
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Star className="h-4 w-4 text-primary" />
                                  <label className="text-sm font-medium text-foreground">
                                    Overall Rating (1-5)
                                  </label>
                                  {reviewerOverall.rating && (
                                    <Badge
                                      variant="outline"
                                      className="bg-emerald-50 text-emerald-700 border-emerald-200"
                                    >
                                      {reviewerOverall.rating}/5
                                    </Badge>
                                  )}
                                </div>
                                <div className="px-3">
                                  <Slider
                                    min={1}
                                    max={5}
                                    step={1}
                                    value={[reviewerOverall.rating ?? 1]}
                                    onValueChange={(v: number[]) =>
                                      setReviewerOverall((p) => ({
                                        ...p,
                                        rating: v[0] ?? 1,
                                      }))
                                    }
                                    className="mb-2"
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

                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4 text-primary" />
                                  <label className="text-sm font-medium text-foreground">
                                    Comments
                                  </label>
                                </div>
                                <Textarea
                                  rows={6}
                                  placeholder="Provide your comprehensive review of the employee's performance, highlighting key strengths, areas for improvement, and overall assessment..."
                                  value={reviewerOverall.comment}
                                  onChange={(
                                    e: React.ChangeEvent<HTMLTextAreaElement>
                                  ) =>
                                    setReviewerOverall((p) => ({
                                      ...p,
                                      comment: e.target.value,
                                    }))
                                  }
                                  className="focus:ring-2 focus:ring-primary/20 border-border/50 resize-none"
                                />
                                <div className="text-xs text-muted-foreground">
                                  {reviewerOverall.comment.length} characters
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          /* Appraisal View Mode - All Read-Only Sections */
                          <>
                            {/* Appraiser Overall Assessment - Read Only */}
                            {appraisal.appraiser_overall_rating && (
                              <div className="rounded-lg border border-border/50 bg-background p-4 space-y-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <UserCheck className="h-4 w-4 text-primary" />
                                  <h3 className="text-sm font-medium text-foreground">
                                    Appraiser Overall Assessment
                                  </h3>
                                </div>

                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Star className="h-4 w-4 text-primary" />
                                    <label className="text-sm font-medium text-foreground">
                                      Overall Rating
                                    </label>
                                    <Badge
                                      variant="outline"
                                      className="bg-emerald-50 text-emerald-700 border-emerald-200"
                                    >
                                      {appraisal.appraiser_overall_rating}/5
                                    </Badge>
                                  </div>
                                  <div className="px-3">
                                    <Slider
                                      min={1}
                                      max={5}
                                      step={1}
                                      value={[
                                        appraisal.appraiser_overall_rating,
                                      ]}
                                      disabled
                                      className="opacity-60"
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

                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4 text-primary" />
                                    <label className="text-sm font-medium text-foreground">
                                      Comments
                                    </label>
                                  </div>
                                  <Textarea
                                    rows={3}
                                    value={
                                      appraisal.appraiser_overall_comments ??
                                      "No comments provided"
                                    }
                                    disabled
                                    className="opacity-60 bg-background/50 resize-none border-border/50"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Reviewer Overall Assessment - Read Only */}
                            {appraisal.reviewer_overall_rating && (
                              <div className="rounded-lg border border-border/50 bg-background p-4 space-y-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <UserCheck className="h-4 w-4 text-primary" />
                                  <h3 className="text-sm font-medium text-foreground">
                                    Reviewer Overall Assessment
                                  </h3>
                                </div>

                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Star className="h-4 w-4 text-primary" />
                                    <label className="text-sm font-medium text-foreground">
                                      Overall Rating
                                    </label>
                                    <Badge
                                      variant="outline"
                                      className="bg-emerald-50 text-emerald-700 border-emerald-200"
                                    >
                                      {appraisal.reviewer_overall_rating}/5
                                    </Badge>
                                  </div>
                                  <div className="px-3">
                                    <Slider
                                      min={1}
                                      max={5}
                                      step={1}
                                      value={[
                                        appraisal.reviewer_overall_rating,
                                      ]}
                                      disabled
                                      className="opacity-60"
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

                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4 text-primary" />
                                    <label className="text-sm font-medium text-foreground">
                                      Comments
                                    </label>
                                  </div>
                                  <Textarea
                                    rows={3}
                                    value={
                                      appraisal.reviewer_overall_comments ??
                                      "No comments provided"
                                    }
                                    disabled
                                    className="opacity-60 bg-background/50 resize-none border-border/50"
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              </div>
            )}
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

export default AppraisalWorkflow;
