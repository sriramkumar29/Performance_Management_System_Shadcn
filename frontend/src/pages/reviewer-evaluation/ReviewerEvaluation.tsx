import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { Card } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";
import { Slider } from "../../components/ui/slider";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { BUTTON_STYLES, ICON_SIZES } from "../../constants/buttonStyles";
import {
  Eye,
  MessageSquare,
  Star,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  User,
  UserCheck,
  Home,
  Weight,
  Flag,
  Clock,
} from "lucide-react";
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

const ReviewerEvaluation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [appraisal, setAppraisal] = useState<AppraisalWithGoals | null>(null);
  const [idx, setIdx] = useState(0); // 0..goals.length, where last index is overall page
  const [overall, setOverall] = useState<{
    rating: number | null;
    comment: string;
  }>({ rating: null, comment: "" });

  // Helper function to get progress indicator class
  const getProgressIndicatorClass = (
    currentIndex: number,
    activeIndex: number
  ): string => {
    if (currentIndex === activeIndex) {
      return "bg-primary";
    }
    if (currentIndex < activeIndex) {
      return "bg-primary/60";
    }
    return "bg-border";
  };

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await apiFetch<AppraisalWithGoals>(
      `/api/appraisals/${encodeURIComponent(id)}`
    );
    if (res.ok && res.data) {
      setAppraisal(res.data);
      if (res.data.status !== "Reviewer Evaluation") {
        toast.info(`This appraisal is in '${res.data.status}' stage`);
        navigate("/");
        setLoading(false);
        return;
      }
      setOverall({
        rating: res.data.reviewer_overall_rating ?? null,
        comment: res.data.reviewer_overall_comments ?? "",
      });
    } else {
      toast.error(res.error || "Failed to load appraisal");
    }
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [id]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const goals = appraisal?.appraisal_goals || [];
  const isOverallPage = idx === goals.length;
  const current = goals[idx];
  const total = goals.length;
  const progressPercentage = total > 0 ? ((idx + 1) / (total + 1)) * 100 : 0;

  const canPrev = idx > 0;
  const canNext = idx < total;

  const validateOverall = useCallback(
    () => !!(overall.rating && overall.comment.trim()),
    [overall]
  );

  const handleNext = useCallback(() => {
    if (canNext) setIdx((i) => i + 1);
  }, [canNext]);

  const handlePrev = useCallback(() => {
    if (canPrev) setIdx((i) => i - 1);
  }, [canPrev]);

  const handleSubmit = useCallback(async () => {
    if (!appraisal) return;
    if (!overall.rating || !overall.comment.trim()) {
      setIdx(goals.length);
      toast.error("Please provide overall rating and comment");
      return;
    }

    setLoading(true);
    try {
      // Save reviewer overall
      const payload = {
        reviewer_overall_comments: overall.comment,
        reviewer_overall_rating: overall.rating,
      };
      const res = await apiFetch(
        `/api/appraisals/${appraisal.appraisal_id}/reviewer-evaluation`,
        { method: "PUT", body: JSON.stringify(payload) }
      );
      if (!res.ok)
        throw new Error(res.error || "Failed to submit reviewer evaluation");

      // Move status to Complete
      const st = await apiFetch(
        `/api/appraisals/${appraisal.appraisal_id}/status`,
        { method: "PUT", body: JSON.stringify({ status: "Complete" }) }
      );
      if (!st.ok) throw new Error(st.error || "Failed to complete appraisal");
      toast.success("Appraisal marked as Complete");
      navigate("/");
    } catch (e: any) {
      toast.error(e.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  }, [appraisal, overall, goals.length, navigate]);

  if (!appraisal)
    return (
      <div className="min-h-screen bg-background p-6" aria-busy={loading}>
        <div className="max-w-4xl mx-auto">
          <PageHeaderSkeleton />
          <GoalsSkeleton count={5} />
        </div>
        {/* Mobile-only floating Home button for better discoverability */}
        <Button
          onClick={() => navigate("/")}
          title="Home"
          aria-label="Home"
          className="sm:hidden fixed bottom-20 right-4 z-50 rounded-full h-12 w-12 p-0 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <Home className="h-5 w-5" />
        </Button>
      </div>
    );

  return (
    <div className="min-h-screen bg-background p-6" aria-busy={loading}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Card */}
        <Card className="glass-effect shadow-soft hover-lift border-0 p-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary text-primary-foreground">
                <Eye className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Reviewer Evaluation
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {new Date(appraisal.start_date).toLocaleDateString()} –{" "}
                  {new Date(appraisal.end_date).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="secondary"
                className="px-3 py-1 bg-violet-100 text-violet-800 border-violet-200"
              >
                {appraisal.status}
              </Badge>
              <div className="text-right">
                <div className="text-sm font-medium text-foreground">
                  {isOverallPage
                    ? "Overall Evaluation"
                    : `Goal ${idx + 1} of ${total}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {Math.round(progressPercentage)}% Complete
                </div>
              </div>
              <Button
                onClick={() => navigate("/")}
                title="Home"
                aria-label="Home"
                className="ml-1 hidden sm:inline-flex bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Home</span>
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </Card>

        {/* Goal Review Card */}
        {!isOverallPage && current && (
          <Card className="glass-effect shadow-soft hover-lift border-0 p-6 animate-fade-in">
            <div className="space-y-6">
              {/* Goal Header */}
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
                    {(() => {
                      const cats: any[] =
                        (current.goal as any).categories ??
                        (current.goal.category ? [current.goal.category] : []);
                      if (cats && cats.length > 0) {
                        return (
                          <div className="flex flex-wrap gap-2 max-w-[40%]">
                            {cats.map((c: any) => (
                              <Badge
                                key={c.id}
                                variant="secondary"
                                className="text-xs bg-indigo-100 text-indigo-700 border-indigo-200 flex-shrink-0"
                                title={c.name}
                              >
                                {c.name}
                              </Badge>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-violet-50 text-violet-700 border-violet-200 flex items-center gap-1"
                    >
                      <Clock className="h-3 w-3" />
                      Review
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

              <div className="grid gap-6">
                {/* Self Assessment (read-only) */}
                <div className="rounded-xl border border-border p-4 bg-muted/40">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      Employee Self Assessment
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-primary" />
                        <label className="text-sm font-medium text-foreground">
                          Self Rating
                        </label>
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
                            ? [1]
                            : [current.self_rating]
                        }
                        disabled
                        className="opacity-70"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`self-comment-${current.goal.goal_id}`}
                        className="text-xs font-medium text-foreground mb-2 block"
                      >
                        Self Comments
                      </label>
                      <Textarea
                        id={`self-comment-${current.goal.goal_id}`}
                        rows={3}
                        value={current.self_comment ?? "No comments provided"}
                        disabled
                        className="bg-card/50 border-border"
                      />
                    </div>
                  </div>
                </div>

                {/* Appraiser Evaluation (read-only) */}
                <div className="rounded-xl border border-border p-4 bg-muted/40">
                  <div className="flex items-center gap-2 mb-4">
                    <UserCheck className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      Appraiser Evaluation
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-primary" />
                        <label className="text-sm font-medium text-foreground">
                          Appraiser Rating
                        </label>
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
                            ? [1]
                            : [current.appraiser_rating]
                        }
                        disabled
                        className="opacity-70"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`appraiser-comment-${current.goal.goal_id}`}
                        className="text-xs font-medium text-foreground mb-2 block"
                      >
                        Appraiser Comments
                      </label>
                      <Textarea
                        id={`appraiser-comment-${current.goal.goal_id}`}
                        rows={4}
                        value={
                          current.appraiser_comment ?? "No comments provided"
                        }
                        disabled
                        className="bg-card/50 border-border"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/50">
                <Button
                  variant={BUTTON_STYLES.BACK.variant}
                  onClick={handlePrev}
                  disabled={!canPrev}
                  className="w-full sm:w-auto flex items-center gap-2"
                >
                  <ChevronLeft className={ICON_SIZES.DEFAULT} />
                  Previous
                </Button>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex gap-1">
                    {Array.from({ length: total + 1 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${getProgressIndicatorClass(
                          i,
                          idx
                        )}`}
                      />
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleNext}
                  variant={BUTTON_STYLES.CONTINUE.variant}
                  className={`w-full sm:w-auto ${BUTTON_STYLES.CONTINUE.className} flex items-center gap-2`}
                >
                  {idx === total - 1 ? "Overall Review" : "Next Goal"}
                  <ChevronRight className={ICON_SIZES.DEFAULT} />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Overall Evaluation Card */}
        {isOverallPage && (
          <Card className="glass-effect shadow-soft hover-lift border-0 p-6 animate-fade-in">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary text-primary-foreground">
                  <Star className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Overall Evaluation
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Final review and completion
                  </p>
                </div>
              </div>

              {/* Appraiser Overall - read only */}
              <div className="rounded-xl border border-border p-5 bg-muted/40">
                <div className="flex items-center gap-2 mb-4">
                  <UserCheck className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold text-foreground">
                    Appraiser Overall Assessment
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-3 block">
                      Overall Rating:{" "}
                      {appraisal.appraiser_overall_rating || "Not provided"}
                    </label>
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
                      className="opacity-70"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="appraiser-overall-comments"
                      className="text-sm font-medium text-foreground mb-3 block"
                    >
                      Overall Comments
                    </label>
                    <Textarea
                      id="appraiser-overall-comments"
                      rows={4}
                      value={
                        appraisal.appraiser_overall_comments ??
                        "No comments provided"
                      }
                      disabled
                      className="bg-card/50 border-border"
                    />
                  </div>
                </div>
              </div>

              {/* Reviewer Overall - inputs */}
              <div className="rounded-xl border border-border p-5 bg-muted/40">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold text-foreground">
                    Your Reviewer Assessment
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-3 block">
                      Overall Rating (1-5): {overall.rating || "Please select"}
                    </label>
                    <Slider
                      min={1}
                      max={5}
                      step={1}
                      value={overall.rating == null ? [3] : [overall.rating]}
                      onValueChange={(v) =>
                        setOverall((p) => ({ ...p, rating: v[0] ?? null }))
                      }
                      className="mb-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Poor</span>
                      <span>Below Average</span>
                      <span>Average</span>
                      <span>Good</span>
                      <span>Excellent</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Overall Comments
                    </label>
                    <Textarea
                      rows={6}
                      placeholder="Provide your comprehensive review of the employee's performance, highlighting key strengths, areas for improvement, and overall assessment..."
                      value={overall.comment}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setOverall((p) => ({ ...p, comment: e.target.value }))
                      }
                      className="bg-card border-border focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                    <div className="text-xs text-muted-foreground mt-2">
                      {overall.comment.length} characters
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border/50">
                <Button
                  variant={BUTTON_STYLES.BACK.variant}
                  onClick={handlePrev}
                  disabled={!canPrev}
                  className="w-full sm:w-auto flex items-center gap-2"
                >
                  <ChevronLeft className={ICON_SIZES.DEFAULT} />
                  Previous
                </Button>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex gap-1">
                    {Array.from({ length: total + 1 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${getProgressIndicatorClass(
                          i,
                          idx
                        )}`}
                      />
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={loading || !validateOverall()}
                  variant={BUTTON_STYLES.SUBMIT.variant}
                  className={`w-full sm:w-auto ${BUTTON_STYLES.SUBMIT.className} flex items-center gap-2 px-6 py-2`}
                >
                  <CheckCircle2 className={ICON_SIZES.DEFAULT} />
                  {loading ? "Submitting..." : "Submit & Complete"}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
      {/* Mobile-only floating Home button for better discoverability */}
      <Button
        onClick={() => navigate("/")}
        title="Home"
        aria-label="Home"
        className="sm:hidden fixed bottom-20 right-4 z-50 rounded-full h-12 w-12 p-0 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <Home className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default ReviewerEvaluation;
