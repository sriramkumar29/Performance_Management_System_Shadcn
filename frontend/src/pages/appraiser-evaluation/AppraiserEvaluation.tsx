import { useEffect, useState } from "react";
import type React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Slider } from "../../components/ui/slider";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { 
  Target, 
  Calendar, 
  Weight, 
  MessageSquare, 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  Send,
  User,
  UserCheck,
  BarChart3
} from 'lucide-react';


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
}

type FormState = Record<number, { rating: number | null; comment: string }>;

 

const AppraiserEvaluation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [appraisal, setAppraisal] = useState<AppraisalWithGoals | null>(null);
  const [idx, setIdx] = useState(0); // 0..goals.length, where last index is overall page
  const [form, setForm] = useState<FormState>({});
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
      if (res.data.status !== "Appraiser Evaluation") {
        navigate("/");
        setLoading(false);
        return;
      }
      const initial: FormState = {};
      for (const ag of res.data.appraisal_goals || []) {
        initial[ag.goal.goal_id] = {
          rating: ag.appraiser_rating ?? null,
          comment: ag.appraiser_comment ?? "",
        };
      }
      setForm(initial);
      setOverall({
        rating: res.data.appraiser_overall_rating ?? null,
        comment: res.data.appraiser_overall_comments ?? "",
      });
    } else {
      // notifications removed; silently ignore or handle elsewhere
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

  const canPrev = idx > 0;
  const canNext = idx < total;

  const setCurrentField = (
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
  };

  const validateCurrent = () => {
    if (isOverallPage) {
      return !!(
        overall.rating &&
        overall.comment &&
        overall.comment.trim().length > 0
      );
    }
    if (!current) return false;
    const cur = form[current.goal.goal_id] || { rating: null, comment: "" };
    return !!(cur.rating && cur.comment && cur.comment.trim().length > 0);
  };

  const handleNext = () => {
    if (!validateCurrent()) {
      return;
    }
    if (canNext) setIdx((i) => i + 1);
  };

  const handlePrev = () => {
    if (canPrev) setIdx((i) => i - 1);
  };

  const handleSubmit = async () => {
    if (!appraisal) return;
    // ensure all goals filled
    for (const ag of goals) {
      const v = form[ag.goal.goal_id];
      if (!v || !v.rating || !v.comment || !v.comment.trim()) {
        const missingIdx = goals.findIndex(
          (g) => g.goal.goal_id === ag.goal.goal_id
        );
        setIdx(missingIdx >= 0 ? missingIdx : 0);
        return;
      }
    }
    if (!overall.rating || !overall.comment.trim()) {
      setIdx(goals.length);
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        goals: {} as Record<number, any>,
        appraiser_overall_comments: overall.comment,
        appraiser_overall_rating: overall.rating,
      };
      for (const ag of goals) {
        const v = form[ag.goal.goal_id];
        payload.goals[ag.goal.goal_id] = {
          appraiser_rating: v.rating,
          appraiser_comment: v.comment,
        };
      }
      const res = await apiFetch(
        `/api/appraisals/${appraisal.appraisal_id}/appraiser-evaluation`,
        { method: "PUT", body: JSON.stringify(payload) }
      );
      if (!res.ok)
        throw new Error(res.error || "Failed to submit appraiser evaluation");

      // move status to Reviewer Evaluation
      const st = await apiFetch(
        `/api/appraisals/${appraisal.appraisal_id}/status`,
        {
          method: "PUT",
          body: JSON.stringify({ status: "Reviewer Evaluation" }),
        }
      );
      if (!st.ok) throw new Error(st.error || "Failed to advance status");
      navigate("/");
    } catch (e: any) {
      // notifications removed
    } finally {
      setLoading(false);
    }
  };

  if (!appraisal)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded-lg w-1/3"></div>
            <div className="h-32 bg-slate-200 rounded-xl"></div>
            <div className="h-96 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );

  const progressPercentage = total > 0 ? ((idx + 1) / (total + 1)) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6 lg:p-8 animate-fade-in" aria-busy={loading}>
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Header Card */}
        <Card className="shadow-medium border-0 glass-effect">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-2xl lg:text-3xl font-bold text-gradient">
                  Appraiser Evaluation
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
                    {isOverallPage ? "Overall Evaluation" : `Goal ${idx + 1} of ${total}`}
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
        {!isOverallPage && current && (
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
              {/* Self Assessment (read-only) */}
              <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-medium text-foreground">Employee Self Assessment</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    <label className="text-sm font-medium text-foreground">Self Rating</label>
                    {current.self_rating && (
                      <Badge variant="outline" className="ml-auto">
                        {current.self_rating}/5
                      </Badge>
                    )}
                  </div>
                  <div className="px-3">
                    <Slider
                      min={1}
                      max={5}
                      step={1}
                      value={current.self_rating != null ? [current.self_rating] : [1]}
                      disabled
                      aria-label="Self Rating"
                      className="opacity-60"
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

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    <label className="text-sm font-medium text-foreground">Self Comments</label>
                  </div>
                  <Textarea
                    rows={3}
                    value={current.self_comment ?? "No comments provided"}
                    disabled
                    aria-label="Self Comments"
                    className="resize-none opacity-60 bg-background/50"
                  />
                </div>
              </div>

              {/* Appraiser Evaluation (writable) */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium text-foreground">Your Evaluation</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    <label className="text-sm font-medium text-foreground">Your Rating (1-5)</label>
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
                          ? [form[current.goal.goal_id]!.rating as number]
                          : [1]
                      }
                      onValueChange={(v) =>
                        setCurrentField(current.goal.goal_id, { rating: v[0] ?? null })
                      }
                      aria-label="Your Rating"
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

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <label className="text-sm font-medium text-foreground">Your Comments</label>
                  </div>
                  <Textarea
                    rows={4}
                    placeholder="Provide your detailed evaluation, feedback, and recommendations..."
                    value={form[current.goal.goal_id]?.comment ?? ""}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setCurrentField(current.goal.goal_id, {
                        comment: e.target.value,
                      })
                    }
                    aria-label="Your Comments"
                    className="resize-none focus:ring-2 focus:ring-primary/20 border-border/50"
                  />
                  <div className="text-xs text-muted-foreground">
                    {form[current.goal.goal_id]?.comment?.length || 0} characters
                  </div>
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
                  <div className="flex gap-1" role="list" aria-label="Progress steps">
                    {Array.from({ length: total + 1 }, (_, i) => (
                      <div
                        key={i}
                        role="listitem"
                        aria-label={`Step ${i + 1} of ${total + 1}${i === idx ? ", current step" : ""}`}
                        aria-current={i === idx ? "step" : undefined}
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

                <Button
                  onClick={handleNext}
                  disabled={loading || !validateCurrent()}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {idx === total - 1 ? "Overall Evaluation" : "Next Goal"}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overall Evaluation Card */}
        {isOverallPage && (
          <Card className="shadow-medium border-0 glass-effect animate-slide-up">
            <CardHeader className="pb-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-blue-500/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <h2 className="text-xl font-semibold text-foreground leading-tight">
                    Overall Performance Evaluation
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Provide your overall assessment based on all individual goal evaluations
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Overall Rating */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  <label className="text-sm font-medium text-foreground">
                    Overall Rating (1-5)
                  </label>
                  {overall.rating && (
                    <Badge variant="outline" className="ml-auto">
                      {overall.rating}/5
                    </Badge>
                  )}
                </div>
                <div className="px-3">
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={overall.rating != null ? [overall.rating] : [1]}
                    onValueChange={(v) =>
                      setOverall((p) => ({ ...p, rating: v[0] ?? null }))
                    }
                    aria-label="Overall Rating"
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

              {/* Overall Comments */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <label className="text-sm font-medium text-foreground">
                    Overall Comments
                  </label>
                </div>
                <Textarea
                  rows={6}
                  placeholder="Summarize overall performance, highlight key strengths, areas for improvement, and recommendations for development..."
                  value={overall.comment}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setOverall((p) => ({ ...p, comment: e.target.value }))
                  }
                  aria-label="Overall Comments"
                  className="resize-none focus:ring-2 focus:ring-primary/20 border-border/50"
                />
                <div className="text-xs text-muted-foreground">
                  {overall.comment?.length || 0} characters
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
                    {Array.from({ length: total + 1 }, (_, i) => (
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

                <Button
                  onClick={handleSubmit}
                  disabled={loading || !validateCurrent()}
                  className="w-full sm:w-auto bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white shadow-lg"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit to Reviewer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AppraiserEvaluation;
