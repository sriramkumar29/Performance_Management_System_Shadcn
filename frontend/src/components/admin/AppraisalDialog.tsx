import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { getStatusBadgeVariant } from "../../utils/appraisalUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { api } from "../../utils/api";
import CategoryModal from "../modals/CategoryModal";

interface Appraisal {
  appraisal_id: number;
  status: string;
  appraisee_id: number;
  appraiser_id?: number;
  reviewer_id?: number;
  start_date?: string;
  end_date?: string;
}

interface Employee {
  emp_id: number;
  emp_name: string;
}

interface AppraisalDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appraisal: Appraisal | null;
  mode: "view" | "edit";
  employees: Employee[];
}

const AppraisalDialog = ({
  open,
  onClose,
  onSuccess,
  appraisal,
  mode,
  employees,
}: AppraisalDialogProps) => {
  const [formData, setFormData] = useState<{
    appraiser_id: string;
    reviewer_id: string;
    status: string;
  }>({
    appraiser_id: "",
    reviewer_id: "",
    status: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<any>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => {
    if (appraisal && open) {
      setFormData({
        appraiser_id: appraisal.appraiser_id?.toString() || "",
        reviewer_id: appraisal.reviewer_id?.toString() || "",
        status: appraisal.status || "",
      });

      if (mode === "view") {
        loadDetails();
      }
    }
    setError("");
  }, [appraisal, open, mode]);

  const loadDetails = async () => {
    if (!appraisal) return;

    try {
      const res = await api.get(`/appraisals/${appraisal.appraisal_id}`);
      if (res.ok && res.data) {
        setDetails(res.data);
      }
    } catch (e) {}
  };

  const getEmployeeName = (empId?: number): string => {
    if (!empId) return "—";
    const employee = employees.find((emp) => emp.emp_id === empId);
    return employee ? employee.emp_name : `ID: ${empId}`;
  };

  // Role helpers — mirror the logic used in CreateAppraisal
  const isAppraiserEligible = (roles?: string, level?: number | null) => {
    // Appraiser: lead or above
    if (
      roles &&
      /lead|manager|head|director|vp|chief|cxo|cto|ceo|admin/i.test(roles)
    )
      return true;
    if (typeof level === "number") return level >= 3; // fallback: manager+ (3+)
    return false;
  };

  const isReviewerEligible = (roles?: string, level?: number | null) => {
    // Reviewer: manager or above — explicitly exclude 'lead' as reviewer if role text contains it
    if (
      roles &&
      /manager|head|director|vp|chief|cxo|cto|ceo|admin/i.test(roles)
    )
      return true;
    if (typeof level === "number") return level >= 3; // fallback: manager+ (3+)
    return false;
  };

  // Compute eligible lists for selects
  const eligibleAppraisers = employees.filter((e) =>
    isAppraiserEligible((e as any).emp_roles, (e as any).emp_roles_level)
  );

  const selectedAppraiserId = formData.appraiser_id
    ? parseInt(formData.appraiser_id)
    : undefined;
  const selectedAppraiser = employees.find(
    (e) => e.emp_id === selectedAppraiserId
  );
  const selectedAppraiserLevel =
    (selectedAppraiser as any)?.emp_roles_level ?? null;

  const eligibleReviewers = employees.filter((e) => {
    const ok = isReviewerEligible(
      (e as any).emp_roles,
      (e as any).emp_roles_level
    );
    if (!ok) return false;
    // reviewer must be same or higher rank than appraiser when appraiser selected
    if (
      selectedAppraiserLevel != null &&
      typeof (e as any).emp_roles_level === "number"
    ) {
      return (e as any).emp_roles_level >= selectedAppraiserLevel;
    }
    return true;
  });

  /*************  ✨ Windsurf Command ⭐  *************/
  /**
   * Returns a formatted date string from an ISO string.
   * If the ISO string is invalid or undefined, returns "—".
   * @param {string} [iso] ISO string to be formatted.
   * @returns {string} Formatted date string or "—" if invalid or undefined.
   */
  /*******  0a32cdaf-d5ce-45a1-9e28-3779e235607e *******/
  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appraisal) return;

    setError("");
    setLoading(true);

    try {
      const payload: any = {};

      if (formData.appraiser_id) {
        payload.appraiser_id = parseInt(formData.appraiser_id);
      }
      if (formData.reviewer_id) {
        payload.reviewer_id = parseInt(formData.reviewer_id);
      }

      const res = await api.put(
        `/appraisals/${appraisal.appraisal_id}`,
        payload
      );

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const errMsg =
          (res as any).error ??
          (res.data
            ? (res.data as any).detail ?? JSON.stringify(res.data)
            : `status ${res.status}`);
        setError(errMsg);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!appraisal) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "view" ? (
              <div className="flex items-baseline gap-3">
                <span>Appraisal #{appraisal.appraisal_id}</span>
                <span className="text-sm text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">
                  {getEmployeeName(appraisal.appraisee_id)}
                </span>
                {/** Show appraisal type name when available (enriched by admin list) */}
                {(appraisal as any).appraisal_type_name && (
                  <span className="text-sm text-muted-foreground">
                    • {(appraisal as any).appraisal_type_name}
                  </span>
                )}
              </div>
            ) : (
              `Edit Appraisal #${appraisal.appraisal_id}`
            )}
          </DialogTitle>
        </DialogHeader>

        {mode === "view" ? (
          <div className="py-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {getEmployeeName(appraisal.appraisee_id)}
                  <span className="text-sm text-muted-foreground ml-2">
                    #{appraisal.appraisal_id}
                  </span>
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Appraisee details and appraisal overview
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={getStatusBadgeVariant(appraisal.status)}>
                  {appraisal.status}
                </Badge>
                <div className="text-sm text-muted-foreground">
                  Start: {formatDate(appraisal.start_date)}
                </div>
                <div className="text-sm text-muted-foreground">
                  End: {formatDate(appraisal.end_date)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="font-semibold">Appraiser</Label>
                <p className="text-sm">
                  {getEmployeeName(appraisal.appraiser_id)}
                </p>
              </div>
              <div>
                <Label className="font-semibold">Reviewer</Label>
                <p className="text-sm">
                  {getEmployeeName(appraisal.reviewer_id)}
                </p>
              </div>
              <div>
                <Label className="font-semibold">Period</Label>
                <p className="text-sm">
                  {formatDate(appraisal.start_date)} —{" "}
                  {formatDate(appraisal.end_date)}
                </p>
              </div>
            </div>

            {details && details.goals && details.goals.length > 0 && (
              <div>
                <Label className="font-semibold mb-2">Goals</Label>
                <div className="grid grid-cols-1 gap-3">
                  {details.goals.map((goal: any, idx: number) => (
                    <div key={idx} className="p-4 border rounded bg-muted/30">
                      <p className="font-medium text-sm">{goal.goal_title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {goal.goal_description}
                      </p>
                      {goal.weightage && (
                        <p className="text-xs mt-2">
                          Weightage: {goal.weightage}%
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Appraisal ID</Label>
                <Input value={appraisal.appraisal_id} disabled />
              </div>

              <div className="grid gap-2">
                <Label>Appraisee</Label>
                <Input
                  value={`${getEmployeeName(appraisal.appraisee_id)} (${
                    appraisal.appraisee_id
                  })`}
                  disabled
                />
              </div>

              <div className="grid gap-2">
                <Label>Status</Label>
                <Input value={appraisal.status} disabled />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="appraiser_id">Appraiser</Label>
                <Select
                  value={formData.appraiser_id}
                  onValueChange={(v) =>
                    setFormData({ ...formData, appraiser_id: v })
                  }
                >
                  <SelectTrigger id="appraiser_id" className="w-full">
                    <SelectValue placeholder="Select Appraiser" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleAppraisers.map((emp: any) => (
                      <SelectItem key={emp.emp_id} value={String(emp.emp_id)}>
                        {emp.emp_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reviewer_id">Reviewer</Label>
                <Select
                  value={formData.reviewer_id}
                  onValueChange={(v) =>
                    setFormData({ ...formData, reviewer_id: v })
                  }
                >
                  <SelectTrigger id="reviewer_id" className="w-full">
                    <SelectValue placeholder="Select Reviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleReviewers.map((emp: any) => (
                      <SelectItem key={emp.emp_id} value={String(emp.emp_id)}>
                        {emp.emp_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && <div className="text-sm text-red-500 mb-4">{error}</div>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Update"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {mode === "view" && (
          <>
            <DialogFooter>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCategoryModal(true)}
                >
                  Categories
                </Button>
              </div>
              <div className="ml-auto">
                <Button onClick={onClose}>Close</Button>
              </div>
            </DialogFooter>

            <CategoryModal
              open={showCategoryModal}
              onOpenChange={(o: boolean) => setShowCategoryModal(o)}
              onCreated={() => {
                // optionally reload details if open
                if (mode === "view") loadDetails();
              }}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AppraisalDialog;
