import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Slider } from "../../components/ui/slider";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { useAuth } from "../../contexts/AuthContext";
import { BUTTON_STYLES, ICON_SIZES } from "../../constants/buttonStyles";
import {
  Calendar,
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
  X,
  Flag,
  CheckCircle2,
} from "lucide-react";
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

// Map API status to user-friendly text
const displayStatus = (s: string) =>
  s === "Submitted" ? "Waiting Acknowledgement" : s;

// Status badge coloring (neutral theme-aware styling)
const statusClass = (_s: string) => "bg-muted text-foreground border-border";

const AppraisalView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [appraisal, setAppraisal] = useState<AppraisalWithGoals | null>(null);
  const [idx, setIdx] = useState(0); // 0..goals.length, where last index is overall page

  // Get navigation source from URL params
  const fromPage = searchParams.get("from");
  const fromTab = searchParams.get("tab");

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      const res = await apiFetch<AppraisalWithGoals>(
        `/api/appraisals/${encodeURIComponent(id)}`
      );
      if (res.ok && res.data) {
        setAppraisal(res.data);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Role/Status-based access guard
  useEffect(() => {
    if (!appraisal) return;
    const empId = user?.emp_id;
    if (!empId) {
      navigate("/", { replace: true });
      return;
    }
    const status = appraisal.status;
    const isAppraisee = empId === appraisal.appraisee_id;
    const isAppraiser = empId === appraisal.appraiser_id;
    const isReviewer = empId === appraisal.reviewer_id;

    let allowed = false;
    if (isAppraisee) {
      // Appraisee can view only during Submitted (Waiting Acknowledgement), Self Assessment, or Complete
      allowed =
        status === "Submitted" ||
        status === "Appraisee Self Assessment" ||
        status === "Complete";
    } else if (isAppraiser) {
      // Appraiser should NOT view during Appraiser/Reviewer Evaluation; allow Complete only
      allowed = status === "Complete";
    } else if (isReviewer) {
      // Reviewer: allow Complete only (evaluation happens in its own page)
      allowed = status === "Complete";
    }

    if (!allowed) navigate("/", { replace: true });
  }, [appraisal, user?.emp_id, navigate]);

  const goals = appraisal?.appraisal_goals || [];
  const showOverall = appraisal?.status === "Complete";
  const totalGoals = goals.length;
  const maxIndex = showOverall ? totalGoals : Math.max(0, totalGoals - 1);
  const isOverallPage = showOverall && idx === totalGoals;
  const current = goals[idx];
  // Keep progress behavior consistent with prior implementation: 100% on overall page
  const progressPct =
    totalGoals > 0
      ? Math.round((Math.min(idx, totalGoals) / totalGoals) * 100)
      : 100;

  if (!appraisal)
    return (
      <div
        className="min-h-screen bg-background p-4 md:p-6 lg:p-8"
        aria-busy={loading}
      >
        <div className="mx-auto max-w-5xl">
          <PageHeaderSkeleton />
          <GoalsSkeleton count={5} />
        </div>
      </div>
    );

  return (
    <div
      className="min-h-screen bg-background p-4 md:p-6 lg:p-8 animate-fade-in"
      aria-busy={loading}
    >
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header Card */}
        <Card className="shadow-soft hover-lift border-0 glass-effect">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Eye className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent text-foreground">
                    Appraisal View
                  </h1>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {new Date(appraisal.start_date).toLocaleDateString()} –{" "}
                    {new Date(appraisal.end_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={`px-3 py-1 text-sm font-medium ${statusClass(
                    appraisal.status
                  )}`}
                >
                  {displayStatus(appraisal.status)}
                </Badge>
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground">
                    {isOverallPage
                      ? "Overall Summary"
                      : `Goal ${Math.min(
                          idx + 1,
                          totalGoals
                        )} of ${totalGoals}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {progressPct}% Complete
                  </div>
                </div>
              </div>
            </div>
            <Progress value={progressPct} className="h-2 mt-4" />
          </CardHeader>
        </Card>

        {!isOverallPage && current && (
          <Card className="shadow-soft hover-lift border-0 glass-effect animate-slide-up">
            <CardHeader className="pb-4">
              <div className="space-y-3">
                {/* Line 1: Goal Number, Category, and Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 flex-shrink-0">
                      <Flag className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-base font-bold text-foreground">
                      Goal {idx + 1}
                    </span>
                    {current.goal.category && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-indigo-100 text-indigo-700 border-indigo-200 flex-shrink-0"
                      >
                        {current.goal.category.name}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Complete
                    </Badge>
                  </div>
                </div>

                {/* Line 2: Title and Weightage Badge */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-foreground leading-tight truncate">
                      {current.goal.goal_title}
                    </h2>
                    <Badge
                      variant="outline"
                      className="text-xs bg-purple-50 text-purple-700 border-purple-200 flex-shrink-0 flex items-center gap-1"
                    >
                      <Weight className="h-3 w-3" />
                      Weightage: {current.goal.goal_weightage}%
                    </Badge>
                  </div>
                </div>

                {/* Description Section */}
                {current.goal.goal_description && (
                  <div className="max-h-24 overflow-y-auto text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap pr-2 custom-scrollbar">
                    {current.goal.goal_description}
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Self Assessment (read-only) */}
              <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium text-foreground">
                    Employee Self Assessment
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      Self Rating
                    </span>
                    {current.self_rating && (
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200"
                      >
                        {current.self_rating}/5
                      </Badge>
                    )}
                  </div>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={
                      current.self_rating == null
                        ? undefined
                        : [current.self_rating]
                    }
                    disabled
                    className="opacity-70"
                  />
                  <div>
                    <div className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-primary" /> Self
                      Comments
                    </div>
                    <Textarea
                      rows={3}
                      value={current.self_comment ?? "No comments provided"}
                      disabled
                      className="bg-card/50 border-border resize-none"
                      aria-label="Self Comments"
                    />
                  </div>
                </div>
              </div>

              {/* Appraiser Evaluation (read-only, visible only when Complete) */}
              {showOverall && (
                <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium text-foreground">
                      Appraiser Evaluation
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        Appraiser Rating
                      </span>
                      {current.appraiser_rating && (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200"
                        >
                          {current.appraiser_rating}/5
                        </Badge>
                      )}
                    </div>
                    <Slider
                      min={1}
                      max={5}
                      step={1}
                      value={
                        current.appraiser_rating == null
                          ? undefined
                          : [current.appraiser_rating]
                      }
                      disabled
                      className="opacity-70"
                    />
                    <div>
                      <div className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-primary" />{" "}
                        Appraiser Comments
                      </div>
                      <Textarea
                        rows={4}
                        value={
                          current.appraiser_comment ?? "No comments provided"
                        }
                        disabled
                        className="bg-card/50 border-border resize-none"
                        aria-label="Appraiser Comments"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/50">
                <Button
                  variant={BUTTON_STYLES.BACK.variant}
                  onClick={() => setIdx((i) => Math.max(0, i - 1))}
                  disabled={loading || idx === 0}
                  className="w-full sm:w-auto"
                >
                  <ChevronLeft className={`${ICON_SIZES.DEFAULT} mr-2`} />
                  Previous Goal
                </Button>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ul
                    className="flex gap-1 list-none p-0 m-0"
                    aria-label="Progress steps"
                  >
                    {Array.from(
                      { length: showOverall ? totalGoals + 1 : totalGoals },
                      (_, i) => {
                        const getStepClass = () => {
                          if (i === idx) return "bg-primary";
                          if (i < idx) return "bg-primary/60";
                          return "bg-border";
                        };

                        return (
                          <li
                            key={i}
                            aria-label={`Step ${i + 1} of ${
                              showOverall ? totalGoals + 1 : totalGoals
                            }${i === idx ? ", current step" : ""}`}
                            aria-current={i === idx ? "step" : undefined}
                            className={`w-2 h-2 rounded-full ${getStepClass()}`}
                          />
                        );
                      }
                    )}
                  </ul>
                </div>

                <Button
                  onClick={() => setIdx((i) => Math.min(maxIndex, i + 1))}
                  disabled={loading || idx === maxIndex}
                  variant={BUTTON_STYLES.CONTINUE.variant}
                  className={`w-full sm:w-auto ${BUTTON_STYLES.CONTINUE.className}`}
                >
                  {showOverall && idx === totalGoals - 1
                    ? "Overall Summary"
                    : "Next Goal"}
                  <ChevronRight className={`${ICON_SIZES.DEFAULT} ml-2`} />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isOverallPage && (
          <Card className="shadow-soft hover-lift border-0 glass-effect animate-slide-up">
            <CardHeader className="pb-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <h2 className="text-xl font-semibold text-foreground leading-tight">
                    Overall Evaluation
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Summary of appraiser and reviewer assessments
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Appraiser Overall - read only */}
                <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium text-foreground">
                      Appraiser Overall Assessment
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        Overall Rating
                      </span>
                      {appraisal.appraiser_overall_rating && (
                        <Badge variant="outline" className="ml-auto">
                          {appraisal.appraiser_overall_rating}/5
                        </Badge>
                      )}
                    </div>
                    <Slider
                      min={1}
                      max={5}
                      step={1}
                      value={
                        appraisal.appraiser_overall_rating == null
                          ? undefined
                          : [appraisal.appraiser_overall_rating]
                      }
                      disabled
                      className="opacity-70"
                    />
                    <div>
                      <div className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-primary" />{" "}
                        Overall Comments
                      </div>
                      <Textarea
                        rows={4}
                        value={
                          appraisal.appraiser_overall_comments ??
                          "No comments provided"
                        }
                        disabled
                        className="bg-card/50 border-border resize-none"
                        aria-label="Appraiser Overall Comments"
                      />
                    </div>
                  </div>
                </div>

                {/* Reviewer Overall - read only */}
                <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium text-foreground">
                      Reviewer Overall Assessment
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        Overall Rating
                      </span>
                      {appraisal.reviewer_overall_rating && (
                        <Badge variant="outline" className="ml-auto">
                          {appraisal.reviewer_overall_rating}/5
                        </Badge>
                      )}
                    </div>
                    <Slider
                      min={1}
                      max={5}
                      step={1}
                      value={
                        appraisal.reviewer_overall_rating == null
                          ? undefined
                          : [appraisal.reviewer_overall_rating]
                      }
                      disabled
                      className="opacity-70"
                    />
                    <div>
                      <div className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-primary" />{" "}
                        Overall Comments
                      </div>
                      <Textarea
                        rows={5}
                        value={
                          appraisal.reviewer_overall_comments ??
                          "No comments provided"
                        }
                        disabled
                        className="bg-card/50 border-border resize-none"
                        aria-label="Reviewer Overall Comments"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/50">
                <Button
                  variant={BUTTON_STYLES.BACK.variant}
                  onClick={() => setIdx((i) => Math.max(0, i - 1))}
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  <ChevronLeft className={`${ICON_SIZES.DEFAULT} mr-2`} />
                  Previous Goal
                </Button>
                <Button
                  onClick={() => {
                    // Navigate back to source page if coming from team-appraisal
                    if (fromPage === "team-appraisal" && fromTab) {
                      navigate(`/team-appraisal?tab=${fromTab}`);
                    } else {
                      navigate("/");
                    }
                  }}
                  variant={BUTTON_STYLES.SUBMIT.variant}
                  className={`w-full sm:w-auto ${BUTTON_STYLES.SUBMIT.className} flex items-center gap-2`}
                  aria-label={fromPage === "team-appraisal" ? "Close" : "Home"}
                  title={fromPage === "team-appraisal" ? "Close" : "Home"}
                >
                  {fromPage === "team-appraisal" ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Home className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {fromPage === "team-appraisal" ? "Close" : "Go Home"}
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AppraisalView;
