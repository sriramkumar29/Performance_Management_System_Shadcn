import { useEffect, useState } from "react";
import { CheckCircle2, X, Eye } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { apiFetch } from "../../utils/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { BUTTON_STYLES, ICON_SIZES } from "../../constants/buttonStyles";

interface AppraisalGoal {
  id: number;
  appraisal_id: number;
  goal_id: number;
  goal: {
    goal_id: number;
    goal_template_id?: number;
    goal_title: string;
    goal_description: string;
    goal_performance_factor: string;
    goal_importance: string;
    goal_weightage: number;
    category_id: number;
    category: {
      id: number;
      name: string;
    };
  };
}

interface AppraisalData {
  appraisal_id: number;
  appraisee_name: string;
  appraiser_name: string;
  reviewer_name: string;
  appraisal_type_name: string;
  appraisal_type_range_name?: string;
  period_start: string;
  period_end: string;
  goals: AppraisalGoal[];
}

interface AcknowledgeAppraisalModalProps {
  open: boolean;
  onClose: () => void;
  appraisalId: number;
  onAcknowledge: () => void;
}

const AcknowledgeAppraisalModal = ({
  open,
  onClose,
  appraisalId,
  onAcknowledge,
}: AcknowledgeAppraisalModalProps) => {
  const [loading, setLoading] = useState(false);
  const [appraisalData, setAppraisalData] = useState<AppraisalData | null>(
    null
  );
  const [loadingData, setLoadingData] = useState(true);
  const [employees, setEmployees] = useState<
    Array<{ emp_id: number; emp_name: string }>
  >([]);
  console.log("Employees:", employees);
  const [appraisalTypes, setAppraisalTypes] = useState<
    Array<{ id: number; name: string }>
  >([]);
  console.log("Appraisal Types:", appraisalTypes);

  useEffect(() => {
    if (open && appraisalId) {
      loadAppraisalData();
    }
  }, [open, appraisalId]);

  const loadAppraisalData = async () => {
    setLoadingData(true);
    try {
      // Load employees and appraisal types first
      const [empRes, typesRes, appraisalRes] = await Promise.all([
        apiFetch("/api/employees/"),
        apiFetch("/api/appraisal-types/"),
        apiFetch(`/api/appraisals/${appraisalId}`),
      ]);

      if (empRes.ok && empRes.data) {
        setEmployees(empRes.data as any);
      }

      if (typesRes.ok && typesRes.data) {
        setAppraisalTypes(typesRes.data as any);
      }

      if (appraisalRes.ok && appraisalRes.data) {
        const data = appraisalRes.data as any;

        // Create lookup maps
        const empMap = new Map(
          (empRes.data as any[]).map((e: any) => [e.emp_id, e.emp_name])
        );
        const typeMap = new Map(
          (typesRes.data as any[]).map((t: any) => [t.id, t.name])
        );

        // Transform the data to match our interface with names
        const transformedData: AppraisalData = {
          appraisal_id: data.appraisal_id,
          appraisee_name: empMap.get(data.appraisee_id) || "Unknown",
          appraiser_name: empMap.get(data.appraiser_id) || "Unknown",
          reviewer_name: empMap.get(data.reviewer_id) || "Unknown",
          appraisal_type_name: typeMap.get(data.appraisal_type_id) || "Unknown",
          appraisal_type_range_name:
            data.appraisal_type?.range_name || data.appraisal_type_range_name,
          period_start: data.start_date,
          period_end: data.end_date,
          goals: data.appraisal_goals || [], // Handle both goals and appraisal_goals
        };
        setAppraisalData(transformedData);
      } else {
        toast.error(appraisalRes.error || "Failed to load appraisal details");
        onClose();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load appraisal details");
      onClose();
    } finally {
      setLoadingData(false);
    }
  };

  const handleAcknowledge = async () => {
    setLoading(true);
    try {
      // Update status to "Appraisee Self Assessment"
      const res = await apiFetch(`/api/appraisals/${appraisalId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "Appraisee Self Assessment" }),
      });

      if (!res.ok) {
        throw new Error(res.error || "Failed to acknowledge appraisal");
      }

      toast.success("Appraisal acknowledged successfully");
      onAcknowledge();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to acknowledge appraisal");
    } finally {
      setLoading(false);
    }
  };

  const totalWeightage =
    appraisalData?.goals?.reduce((sum, g) => sum + g.goal.goal_weightage, 0) ||
    0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Acknowledge Appraisal
              </DialogTitle>
              <DialogDescription className="mt-2 text-base">
                Please review the goals set for your appraisal and acknowledge
                to proceed with self-assessment.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loadingData ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                Loading appraisal details...
              </p>
            </div>
          </div>
        ) : appraisalData ? (
          <>
            <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
              {/* Appraisal Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Appraisal Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Employee</p>
                      <p className="font-medium">
                        {appraisalData.appraisee_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Appraiser</p>
                      <p className="font-medium">
                        {appraisalData.appraiser_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Reviewer</p>
                      <p className="font-medium">
                        {appraisalData.reviewer_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Appraisal Type
                      </p>
                      <p className="font-medium">
                        {appraisalData.appraisal_type_name}
                      </p>
                    </div>
                    {appraisalData.appraisal_type_range_name && (
                      <div>
                        <p className="text-sm text-muted-foreground">Range</p>
                        <p className="font-medium">
                          {appraisalData.appraisal_type_range_name}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Period</p>
                      <p className="font-medium">
                        {new Date(
                          appraisalData.period_start
                        ).toLocaleDateString()}{" "}
                        -{" "}
                        {new Date(
                          appraisalData.period_end
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Goals Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Performance Goals</CardTitle>
                    <Badge variant="secondary">
                      {appraisalData.goals.length} Goal
                      {appraisalData.goals.length !== 1 ? "s" : ""} | Total
                      Weightage: {totalWeightage}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {appraisalData.goals.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No goals have been set for this appraisal yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {appraisalData.goals.map((goalData, index) => (
                        <Card
                          key={goalData.goal_id}
                          className="border-l-4 border-l-primary"
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <span className="text-primary font-bold">
                                    #{index + 1}
                                  </span>
                                  {goalData.goal.goal_title}
                                </CardTitle>
                              </div>
                              <Badge variant="outline">
                                {goalData.goal.goal_weightage}% Weightage
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">
                                Description
                              </p>
                              <p className="text-sm">
                                {goalData.goal.goal_description}
                              </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Category
                                </p>
                                {(() => {
                                  const cats: any[] =
                                    (goalData.goal as any).categories ??
                                    (goalData.goal.category
                                      ? [goalData.goal.category]
                                      : []);
                                  if (cats && cats.length > 0) {
                                    return (
                                      <div className="flex flex-wrap gap-2 mt-1 max-w-[80%]">
                                        {cats.map((c: any) => (
                                          <Badge
                                            key={c.id}
                                            variant="secondary"
                                            className="truncate"
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
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Performance Factor
                                </p>
                                <p className="text-sm font-medium mt-1">
                                  {goalData.goal.goal_performance_factor}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Importance
                                </p>
                                <p className="text-sm font-medium mt-1">
                                  {goalData.goal.goal_importance}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Acknowledgement Notice */}
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h4 className="font-semibold mb-2">Acknowledgement</h4>
                      <p className="text-sm text-muted-foreground">
                        By acknowledging this appraisal, you confirm that you
                        have reviewed the goals set for you. You will then
                        proceed to complete your self-assessment based on these
                        goals.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Footer Actions - Fixed at bottom */}
            <div className="border-t bg-background px-6 py-4 mt-auto">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <Button
                  variant={BUTTON_STYLES.CANCEL.variant}
                  onClick={onClose}
                  disabled={loading}
                  className="gap-2"
                >
                  <X className={ICON_SIZES.DEFAULT} />
                  Cancel
                </Button>
                <Button
                  variant={BUTTON_STYLES.SUBMIT.variant}
                  onClick={handleAcknowledge}
                  disabled={loading || appraisalData.goals.length === 0}
                  className={`gap-2 ${BUTTON_STYLES.SUBMIT.className}`}
                >
                  <CheckCircle2 className={ICON_SIZES.DEFAULT} />
                  {loading
                    ? "Acknowledging..."
                    : "Acknowledge & Proceed to Self-Assessment"}
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default AcknowledgeAppraisalModal;
