import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { Card } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";
import { Slider } from "../../components/ui/slider";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { 
  Eye, 
  MessageSquare, 
  Star, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Target,
  User,
  UserCheck,
  Home
} from "lucide-react";
import { toast } from 'sonner'

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
  

  const load = async () => {
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
  };

  useEffect(() => {
    load();
  }, [id]);

  const goals = appraisal?.appraisal_goals || [];
  const isOverallPage = idx === goals.length;
  const current = goals[idx];
  const total = goals.length;
  const progressPercentage = total > 0 ? ((idx + 1) / (total + 1)) * 100 : 0;

  const canPrev = idx > 0;
  const canNext = idx < total;

  const validateOverall = () => !!(overall.rating && overall.comment.trim());

  const handleNext = () => {
    if (canNext) setIdx((i) => i + 1);
  };
  const handlePrev = () => {
    if (canPrev) setIdx((i) => i - 1);
  };

  const handleSubmit = async () => {
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
  };

  if (!appraisal)
    return (
      <div className="min-h-screen bg-background p-6" aria-busy={loading}>
        <div className="max-w-4xl mx-auto">
          <Card className="glass-effect shadow-medium border-0 p-8 animate-fade-in">
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </Card>
        </div>
        {/* Mobile-only floating Home button for better discoverability */}
        <Button
          onClick={() => navigate('/')}
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
        <Card className="glass-effect shadow-medium border-0 p-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary text-primary-foreground">
                <Eye className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Reviewer Evaluation</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(appraisal.start_date).toLocaleDateString()} – {new Date(appraisal.end_date).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="px-3 py-1">
                {appraisal.status}
              </Badge>
              <div className="text-right">
                <div className="text-sm font-medium text-foreground">
                  {isOverallPage ? 'Overall Evaluation' : `Goal ${idx + 1} of ${total}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {Math.round(progressPercentage)}% Complete
                </div>
              </div>
              <Button
                onClick={() => navigate('/')}
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
          <Card className="glass-effect shadow-medium border-0 p-6 animate-fade-in">
            <div className="space-y-6">
              {/* Goal Header */}
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    {current.goal.goal_title}
                  </h2>
                  {current.goal.goal_description && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">
                      {current.goal.goal_description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      Weightage: {current.goal.goal_weightage}%
                    </span>
                    {current.goal.category && (
                      <span className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {current.goal.category.name}
                        </Badge>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-6">
                {/* Self Assessment (read-only) */}
                <div className="rounded-xl border border-border p-4 bg-muted/40">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Employee Self Assessment</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-foreground mb-2 block">
                        Self Rating: {current.self_rating || 'Not rated'}
                      </label>
                      <Slider
                        min={1}
                        max={5}
                        step={1}
                        value={current.self_rating != null ? [current.self_rating] : [1]}
                        disabled
                        className="opacity-70"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground mb-2 block">
                        Self Comments
                      </label>
                      <Textarea
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
                    <span className="text-sm font-medium text-foreground">Appraiser Evaluation</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-foreground mb-2 block">
                        Appraiser Rating: {current.appraiser_rating || 'Not rated'}
                      </label>
                      <Slider
                        min={1}
                        max={5}
                        step={1}
                        value={current.appraiser_rating != null ? [current.appraiser_rating] : [1]}
                        disabled
                        className="opacity-70"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground mb-2 block">
                        Appraiser Comments
                      </label>
                      <Textarea
                        rows={4}
                        value={current.appraiser_comment ?? "No comments provided"}
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
                  variant="outline" 
                  onClick={handlePrev} 
                  disabled={!canPrev}
                  className="w-full sm:w-auto flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex gap-1">
                    {Array.from({ length: total + 1 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i === idx
                            ? 'bg-primary'
                            : i < idx
                            ? 'bg-primary/60'
                            : 'bg-border'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleNext}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
                >
                  {idx === total - 1 ? "Overall Review" : "Next Goal"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Overall Evaluation Card */}
        {isOverallPage && (
          <Card className="glass-effect shadow-medium border-0 p-6 animate-fade-in">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary text-primary-foreground">
                  <Star className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Overall Evaluation</h2>
                  <p className="text-sm text-muted-foreground mt-1">Final review and completion</p>
                </div>
              </div>

              {/* Appraiser Overall - read only */}
              <div className="rounded-xl border border-border p-5 bg-muted/40">
                <div className="flex items-center gap-2 mb-4">
                  <UserCheck className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold text-foreground">Appraiser Overall Assessment</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-3 block">
                      Overall Rating: {appraisal.appraiser_overall_rating || 'Not provided'}
                    </label>
                    <Slider
                      min={1}
                      max={5}
                      step={1}
                      value={appraisal.appraiser_overall_rating != null ? [appraisal.appraiser_overall_rating] : [1]}
                      disabled
                      className="opacity-70"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-3 block">
                      Overall Comments
                    </label>
                    <Textarea
                      rows={4}
                      value={appraisal.appraiser_overall_comments ?? "No comments provided"}
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
                  <span className="text-lg font-semibold text-foreground">Your Reviewer Assessment</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-3 block">
                      Overall Rating (1-5): {overall.rating || 'Please select'}
                    </label>
                    <Slider
                      min={1}
                      max={5}
                      step={1}
                      value={overall.rating != null ? [overall.rating] : [3]}
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
                  variant="outline" 
                  onClick={handlePrev} 
                  disabled={!canPrev}
                  className="w-full sm:w-auto flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex gap-1">
                    {Array.from({ length: total + 1 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i === idx
                            ? 'bg-primary'
                            : i < idx
                            ? 'bg-primary/60'
                            : 'bg-border'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={loading || !validateOverall()}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 px-6 py-2 shadow-lg"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {loading ? 'Submitting...' : 'Submit & Complete'}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
      {/* Mobile-only floating Home button for better discoverability */}
      <Button
        onClick={() => navigate('/')}
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
