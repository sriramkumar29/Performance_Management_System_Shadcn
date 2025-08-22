import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  FolderOpen,
  Save,
  Send,
  X,
} from "lucide-react";
import AddGoalModal from "../../features/goals/AddGoalModal";
import EditGoalModal from "../../features/goals/EditGoalModal";
import ImportFromTemplateModal from "../../features/goals/ImportFromTemplateModal";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../utils/api";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Select as UiSelect,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../components/ui/select";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  CardFooter,
} from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";

// Types (kept same as modal)

type AppraisalStatus =
  | "Draft"
  | "Submitted"
  | "Appraisee Self Assessment"
  | "Appraiser Evaluation"
  | "Reviewer Evaluation"
  | "Complete";

interface AppraisalFormValues {
  appraisee_id: number;
  reviewer_id: number;
  appraisal_type_id: number;
  appraisal_type_range_id?: number;
  period?: [Dayjs, Dayjs];
}

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

interface Employee {
  emp_id: number;
  emp_name: string;
  emp_email: string;
  emp_roles?: string;
  emp_roles_level?: number;
}

interface AppraisalType {
  id: number;
  name: string;
  has_range?: boolean;
}

interface AppraisalRange {
  id: number;
  name: string;
}

const CreateAppraisal = () => {
  const navigate = useNavigate();
  const params = useParams();
  const routeAppraisalId = params.id ? Number(params.id) : undefined;

  // Controlled form state
  const [formValues, setFormValues] = useState<AppraisalFormValues>({
    appraisee_id: 0,
    reviewer_id: 0,
    appraisal_type_id: 0,
    appraisal_type_range_id: undefined,
    period: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [isAppraisalDetailsCollapsed, setIsAppraisalDetailsCollapsed] =
    useState(false);
  // const [isCustomPeriod, setIsCustomPeriod] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [appraisalTypes, setAppraisalTypes] = useState<AppraisalType[]>([]);
  const [ranges, setRanges] = useState<AppraisalRange[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [goals, setGoals] = useState<AppraisalGoal[]>([]);
  const [createdAppraisalId, setCreatedAppraisalId] = useState<number | null>(
    null
  );
  const [createdAppraisalStatus, setCreatedAppraisalStatus] =
    useState<AppraisalStatus | null>(null);
  const [addGoalModalOpen, setAddGoalModalOpen] = useState(false);
  const [editGoalModalOpen, setEditGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<AppraisalGoal | null>(null);
  const [importFromTemplateOpen, setImportFromTemplateOpen] = useState(false);
  // Track goal changes for Draft editing
  const [originalGoals, setOriginalGoals] = useState<AppraisalGoal[]>([]);
  const [goalChanges, setGoalChanges] = useState<{
    added: AppraisalGoal[];
    removed: number[]; // goal_ids
    updated: AppraisalGoal[];
  }>({ added: [], removed: [], updated: [] });
  const { user } = useAuth();
  const isLocked =
    createdAppraisalId !== null && createdAppraisalStatus !== "Draft";

  // Auto-calc period based on type and range selections
  const computePeriod = (
    typeMeta: AppraisalType | undefined,
    rangeMeta?: AppraisalRange
  ): [Dayjs, Dayjs] | undefined => {
    if (!typeMeta) return undefined;
    const year = new Date().getFullYear();
    const t = typeMeta.name.toLowerCase();

    if (!typeMeta.has_range) {
      const start = dayjs(new Date(year, 0, 1));
      const end = dayjs(new Date(year, 11, 31));
      return [start as Dayjs, end as Dayjs];
    }

    if (!rangeMeta) return undefined;
    const r = rangeMeta.name.toLowerCase();

    if (t.includes("half") || t.includes("semi")) {
      if (r.includes("1st") || r.includes("first")) {
        return [
          dayjs(new Date(year, 0, 1)) as Dayjs,
          dayjs(new Date(year, 5, 30)) as Dayjs,
        ];
      }
      if (r.includes("2nd") || r.includes("second")) {
        return [
          dayjs(new Date(year, 6, 1)) as Dayjs,
          dayjs(new Date(year, 11, 31)) as Dayjs,
        ];
      }
      return undefined;
    }

    if (t.includes("quarter")) {
      if (r.includes("1st") || r.includes("first")) {
        return [
          dayjs(new Date(year, 0, 1)) as Dayjs,
          dayjs(new Date(year, 2, 31)) as Dayjs,
        ];
      }
      if (r.includes("2nd") || r.includes("second")) {
        return [
          dayjs(new Date(year, 3, 1)) as Dayjs,
          dayjs(new Date(year, 5, 30)) as Dayjs,
        ];
      }
      if (r.includes("3rd") || r.includes("third")) {
        return [
          dayjs(new Date(year, 6, 1)) as Dayjs,
          dayjs(new Date(year, 8, 30)) as Dayjs,
        ];
      }
      if (r.includes("4th") || r.includes("fourth")) {
        return [
          dayjs(new Date(year, 9, 1)) as Dayjs,
          dayjs(new Date(year, 11, 31)) as Dayjs,
        ];
      }
      return undefined;
    }

    if (t.includes("tri")) {
      if (r.includes("1st") || r.includes("first")) {
        return [
          dayjs(new Date(year, 0, 1)) as Dayjs,
          dayjs(new Date(year, 3, 30)) as Dayjs,
        ];
      }
      if (r.includes("2nd") || r.includes("second")) {
        return [
          dayjs(new Date(year, 4, 1)) as Dayjs,
          dayjs(new Date(year, 7, 31)) as Dayjs,
        ];
      }
      if (r.includes("3rd") || r.includes("third")) {
        return [
          dayjs(new Date(year, 8, 1)) as Dayjs,
          dayjs(new Date(year, 11, 31)) as Dayjs,
        ];
      }
      return undefined;
    }

    return [
      dayjs(new Date(year, 0, 1)) as Dayjs,
      dayjs(new Date(year, 11, 31)) as Dayjs,
    ];
  };

  // UI derivations
  const totalWeightageUi = goals.reduce(
    (sum, g) => sum + g.goal.goal_weightage,
    0
  );
  const appraiseeSelected = !!formValues.appraisee_id;
  const reviewerSelected = !!formValues.reviewer_id;
  const typeSelected = !!formValues.appraisal_type_id;
  const periodSelected = !!formValues.period && formValues.period.length === 2;
  const canAddGoals =
    (createdAppraisalId === null &&
      appraiseeSelected &&
      reviewerSelected &&
      typeSelected &&
      periodSelected &&
      totalWeightageUi < 100) ||
    (createdAppraisalId !== null &&
      createdAppraisalStatus === "Draft" &&
      totalWeightageUi < 100);

  const canSaveDraft =
    !isLocked &&
    appraiseeSelected &&
    reviewerSelected &&
    typeSelected &&
    periodSelected;

  const canSubmitForAck =
    createdAppraisalId !== null &&
    createdAppraisalStatus === "Draft" &&
    totalWeightageUi === 100;

  // Role-based filtering
  const appraiserLevel = user?.emp_roles_level ?? 0;
  const statusLabel = createdAppraisalId
    ? createdAppraisalStatus || "Draft"
    : "New Draft";
  const addGoalDisabledReason = !canAddGoals
    ? isLocked
      ? "Appraisal not in Draft"
      : !appraiseeSelected
      ? "Select an employee first"
      : !reviewerSelected
      ? "Select a reviewer first"
      : !typeSelected || !periodSelected
      ? "Select appraisal type (and range) to set period"
      : totalWeightageUi >= 100
      ? "Total weightage reached"
      : ""
    : "";
  const eligibleAppraisees = employees.filter(
    (emp) =>
      (emp.emp_roles_level ?? -1) <= appraiserLevel &&
      emp.emp_id !== user?.emp_id
  );
  const eligibleReviewers = employees.filter(
    (emp) =>
      (emp.emp_roles_level ?? -1) >= appraiserLevel &&
      emp.emp_id !== user?.emp_id
  );

  const handleGoalAdded = (appraisalGoal: AppraisalGoal) => {
    setGoals((prev) => [...prev, appraisalGoal]);
    // Always stage added goals (even when appraisal already exists).
    // Actual DB insertion happens in syncGoalChanges() on Save/Submit.
    setGoalChanges((prev) => {
      const already = prev.added.some(
        (g) => g.goal.goal_id === appraisalGoal.goal.goal_id
      );
      return already
        ? prev
        : { ...prev, added: [...prev.added, appraisalGoal] };
    });
  };

  const handleGoalUpdated = (updatedGoal: AppraisalGoal) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.goal.goal_id === updatedGoal.goal.goal_id ? updatedGoal : g
      )
    );
    // Track change correctly depending on creation state.
    setGoalChanges((prev) => {
      // If the goal is staged in "added" (pre-creation), update it there so
      // the latest values are persisted when creating the appraisal.
      const addedIdx = prev.added.findIndex(
        (g) => g.goal.goal_id === updatedGoal.goal.goal_id
      );

      if (!createdAppraisalId || addedIdx >= 0) {
        const newAdded = [...prev.added];
        if (addedIdx >= 0) newAdded[addedIdx] = updatedGoal;
        else newAdded.push(updatedGoal);
        const newUpdated = prev.updated.filter(
          (g) => g.goal.goal_id !== updatedGoal.goal.goal_id
        );
        return { ...prev, added: newAdded, updated: newUpdated };
      }

      // When appraisal already exists and goal wasn't staged, track as update
      const existingUpdateIndex = prev.updated.findIndex(
        (g) => g.goal.goal_id === updatedGoal.goal.goal_id
      );
      if (existingUpdateIndex >= 0) {
        const newUpdated = [...prev.updated];
        newUpdated[existingUpdateIndex] = updatedGoal;
        return { ...prev, updated: newUpdated };
      } else {
        return { ...prev, updated: [...prev.updated, updatedGoal] };
      }
    });
  };

  const handleEditGoal = (goal: AppraisalGoal) => {
    setEditingGoal(goal);
    setEditGoalModalOpen(true);
  };

  const handleRemoveGoal = async (goalId: number) => {
    // Capture goal title for toast messages
    const targetGoal = goals.find((g) => g.goal.goal_id === goalId);
    const goalTitle = targetGoal?.goal.goal_title || "Goal";
    try {
      if (createdAppraisalId) {
        const goalToRemove = goals.find((g) => g.goal.goal_id === goalId);
        if (goalToRemove) {
          const wasOriginal = originalGoals.some(
            (og) => og.goal.goal_id === goalId
          );
          const linkOnServer =
            wasOriginal || goalToRemove.appraisal_id === createdAppraisalId;

          if (linkOnServer) {
            setGoalChanges((prev) => ({
              ...prev,
              removed: prev.removed.includes(goalId)
                ? prev.removed
                : [...prev.removed, goalId],
              added: prev.added.filter((g) => g.goal.goal_id !== goalId),
              updated: prev.updated.filter((g) => g.goal.goal_id !== goalId),
            }));
            toast.success("Goal marked for removal", {
              description: `${goalTitle} will be removed when you save.`,
            });
          } else {
            setGoalChanges((prev) => ({
              ...prev,
              added: prev.added.filter((g) => g.goal.goal_id !== goalId),
              updated: prev.updated.filter((g) => g.goal.goal_id !== goalId),
            }));
            toast.success("Goal removed", {
              description: `${goalTitle} removed from appraisal.`,
            });
          }
        }
      } else {
        setGoalChanges((prev) => ({
          ...prev,
          added: prev.added.filter((g) => g.goal.goal_id !== goalId),
          updated: prev.updated.filter((g) => g.goal.goal_id !== goalId),
        }));
        toast.success("Goal removed", {
          description: `${goalTitle} removed from draft.`,
        });
      }
      setGoals((prev) => prev.filter((g) => g.goal.goal_id !== goalId));
    } catch (error) {
      toast.error("Failed to remove goal", {
        description: "Please try again.",
      });
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await apiFetch<Employee[]>("/api/employees");
      if (res.ok && res.data) {
        setEmployees(res.data);
      } else {
        toast.error("Failed to fetch employees", {
          description: res.error || "Please try again.",
        });
      }
    } catch {
      toast.error("Failed to fetch employees", {
        description: "Please try again.",
      });
    }
  };

  const fetchAppraisalTypes = async () => {
    try {
      const res = await apiFetch<AppraisalType[]>("/api/appraisal-types");
      if (res.ok && res.data) {
        setAppraisalTypes(res.data);
      } else {
        toast.error("Failed to fetch appraisal types", {
          description: res.error || "Please try again.",
        });
      }
    } catch {
      toast.error("Failed to fetch appraisal types", {
        description: "Please try again.",
      });
    }
  };

  const fetchRanges = async (typeId: number) => {
    try {
      const res = await apiFetch<AppraisalRange[]>(
        `/api/appraisal-types/ranges?appraisal_type_id=${typeId}`
      );
      if (res.ok && res.data) {
        setRanges(res.data);
      } else {
        toast.error("Failed to fetch ranges", {
          description: res.error || "Please try again.",
        });
      }
    } catch {
      toast.error("Failed to fetch ranges", {
        description: "Please try again.",
      });
    }
  };

  const loadAppraisal = async (id: number) => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/appraisals/${id}`);
      if (!res.ok || !res.data)
        throw new Error(res.error || "Failed to load appraisal");
      const data = res.data as any;
      setCreatedAppraisalId(data.appraisal_id ?? id);
      setCreatedAppraisalStatus(data.status as AppraisalStatus);
      if (Array.isArray(data.appraisal_goals)) {
        setGoals(data.appraisal_goals);
        setOriginalGoals([...data.appraisal_goals]);
      }
      const typeId = data.appraisal_type_id as number;
      setSelectedTypeId(typeId);
      const typeMeta = appraisalTypes.find((t) => t.id === typeId);
      if (typeMeta?.has_range) await fetchRanges(typeId);
      else setRanges([]);

      setFormValues({
        appraisee_id: data.appraisee_id,
        reviewer_id: data.reviewer_id,
        appraisal_type_id: data.appraisal_type_id,
        appraisal_type_range_id: data.appraisal_type_range_id ?? undefined,
        period: [dayjs(data.start_date), dayjs(data.end_date)] as [
          Dayjs,
          Dayjs
        ],
      });
    } catch (error: any) {
      toast.error("Failed to load appraisal", {
        description: error.message || "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([fetchEmployees(), fetchAppraisalTypes()]);
        if (routeAppraisalId) {
          await loadAppraisal(routeAppraisalId);
        } else {
          setRanges([]);
          setSelectedTypeId(null);
        }
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeAppraisalId]);

  const syncGoalChanges = async (appraisalId: number) => {
    const { added, removed, updated } = goalChanges;
    const currentTotalWeightage = goals.reduce(
      (sum, g) => sum + g.goal.goal_weightage,
      0
    );
    if (currentTotalWeightage > 100) {
      throw new Error(
        `Total weightage cannot exceed 100%. Current: ${currentTotalWeightage}%`
      );
    }

    try {
      for (const goalId of removed) {
        const removeRes = await apiFetch(
          `/api/appraisals/${appraisalId}/goals/${goalId}`,
          { method: "DELETE" }
        );
        if (!removeRes.ok)
          throw new Error(removeRes.error || `Failed to remove goal ${goalId}`);
      }

      for (const goalData of added) {
        // Only skip if this goal was already on the server for this appraisal
        const alreadyOnServer = originalGoals.some(
          (g) => g.goal.goal_id === goalData.goal.goal_id
        );
        if (alreadyOnServer) continue;

        const createGoalRes = await apiFetch("/api/goals", {
          method: "POST",
          body: JSON.stringify({
            goal_template_id: goalData.goal.goal_template_id,
            goal_title: goalData.goal.goal_title,
            goal_description: goalData.goal.goal_description,
            goal_performance_factor: goalData.goal.goal_performance_factor,
            goal_importance: goalData.goal.goal_importance,
            goal_weightage: goalData.goal.goal_weightage,
            category_id: goalData.goal.category_id,
          }),
        });
        if (!createGoalRes.ok || !createGoalRes.data)
          throw new Error(createGoalRes.error || "Failed to create goal");
        const createdGoalId = (createGoalRes.data as any).goal_id;
        const attachRes = await apiFetch(
          `/api/appraisals/${appraisalId}/goals/${createdGoalId}`,
          { method: "POST" }
        );
        if (!attachRes.ok) {
          await apiFetch(`/api/goals/${createdGoalId}`, {
            method: "DELETE",
          }).catch(() => {});
          throw new Error(
            attachRes.error || "Failed to attach goal to appraisal"
          );
        }
      }

      for (const goalData of updated) {
        const updateRes = await apiFetch(
          `/api/goals/${goalData.goal.goal_id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              goal_title: goalData.goal.goal_title,
              goal_description: goalData.goal.goal_description,
              goal_performance_factor: goalData.goal.goal_performance_factor,
              goal_importance: goalData.goal.goal_importance,
              goal_weightage: goalData.goal.goal_weightage,
              category_id: goalData.goal.category_id,
            }),
          }
        );
        if (!updateRes.ok)
          throw new Error(
            updateRes.error || `Failed to update goal ${goalData.goal.goal_id}`
          );
      }
    } catch (error: any) {
      throw new Error(`Failed to sync goal changes: ${error.message}`);
    }
  };

  const handleSubmit = async () => {
    if (!user?.emp_id) {
      toast.error("Not authenticated", {
        description: "Please sign in and try again.",
      });
      return;
    }
    if (!canSaveDraft) {
      toast.error("Cannot save", {
        description: "Select employee, reviewer and type/period.",
      });
      return;
    }

    const currentTotalWeightage = goals.reduce(
      (sum, g) => sum + g.goal.goal_weightage,
      0
    );
    if (currentTotalWeightage > 100) {
      toast.error("Invalid weightage", {
        description: `Total is ${currentTotalWeightage}% (> 100%).`,
      });
      return;
    }

    try {
      setLoading(true);
      const body = {
        appraisee_id: formValues.appraisee_id,
        appraiser_id: user.emp_id,
        reviewer_id: formValues.reviewer_id,
        appraisal_type_id: formValues.appraisal_type_id,
        appraisal_type_range_id: formValues.appraisal_type_range_id ?? null,
        start_date: formValues.period?.[0]?.format("YYYY-MM-DD"),
        end_date: formValues.period?.[1]?.format("YYYY-MM-DD"),
        status: "Draft" as AppraisalStatus,
      };

      if (!createdAppraisalId) {
        const res = await apiFetch("/api/appraisals", {
          method: "POST",
          body: JSON.stringify(body),
        });
        if (!res.ok || !res.data)
          throw new Error(res.error || "Could not save draft");
        const newId = (res.data as any).appraisal_id ?? (res.data as any).id;
        setCreatedAppraisalId(newId);
        setCreatedAppraisalStatus("Draft");
        // Persist current goal changes immediately after creating the appraisal
        // so that backend has attached goals before any status transition
        try {
          await syncGoalChanges(newId);
          setGoalChanges({ added: [], removed: [], updated: [] });
          // Refresh to ensure goals in state reflect server IDs (replacing any pseudo goals)
          await loadAppraisal(newId);
        } catch (e: any) {
          // If syncing goals fails, surface a descriptive error and stop here
          throw new Error(
            e?.message || "Failed to sync goals after creating appraisal"
          );
        }
        toast.success("Draft saved", {
          description: "Your draft appraisal has been created.",
        });
      } else {
        const res = await apiFetch(`/api/appraisals/${createdAppraisalId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(res.error || "Could not save changes");
        await syncGoalChanges(createdAppraisalId);
        // Refresh to ensure goals in state reflect server IDs (replacing any pseudo goals)
        await loadAppraisal(createdAppraisalId);
        setGoalChanges({ added: [], removed: [], updated: [] });
        toast.success("Saved", {
          description: "Your changes have been saved.",
        });
      }
    } catch (error: any) {
      toast.error("Save failed", {
        description: error.message || "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    if (!user?.emp_id) {
      toast.error("Not authenticated", {
        description: "Please sign in and try again.",
      });
      return;
    }
    if (!createdAppraisalId) {
      // Create first if needed
      await handleSubmit();
    }
    if (createdAppraisalId === null) return; // still null => failed create

    if (!canSubmitForAck) {
      toast.error("Cannot submit", {
        description: "Total weightage must be 100%.",
      });
      return;
    }

    try {
      setLoading(true);
      // Save latest changes before submitting
      const saveBody = {
        appraisee_id: formValues.appraisee_id,
        appraiser_id: user.emp_id,
        reviewer_id: formValues.reviewer_id,
        appraisal_type_id: formValues.appraisal_type_id,
        appraisal_type_range_id: formValues.appraisal_type_range_id ?? null,
        start_date: formValues.period?.[0]?.format("YYYY-MM-DD"),
        end_date: formValues.period?.[1]?.format("YYYY-MM-DD"),
        status: "Draft" as AppraisalStatus,
      };
      const saveRes = await apiFetch(`/api/appraisals/${createdAppraisalId}`, {
        method: "PUT",
        body: JSON.stringify(saveBody),
      });
      if (!saveRes.ok)
        throw new Error(saveRes.error || "Could not save latest changes");
      await syncGoalChanges(createdAppraisalId);
      setGoalChanges({ added: [], removed: [], updated: [] });

      // Update status to Submitted
      const res = await apiFetch(
        `/api/appraisals/${createdAppraisalId}/status`,
        {
          method: "PUT",
          body: JSON.stringify({ status: "Submitted" }),
        }
      );
      if (!res.ok)
        throw new Error(res.error || "Could not submit for acknowledgement");
      setCreatedAppraisalStatus("Submitted");
      toast.success("Submitted", {
        description: "Sent to appraisee for acknowledgement.",
      });
    } catch (error: any) {
      toast.error("Submission failed", {
        description: error.message || "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-4 sm:py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-semibold">
            {createdAppraisalId ? "Edit Appraisal" : "Create New Appraisal"}
          </h1>
          <Badge variant="outline" className="px-2 py-0.5 text-xs">
            {statusLabel}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            title="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline sm:ml-2">Back</span>
          </Button>
        </div>
      </div>

      {/* Appraisal Details */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() =>
            setIsAppraisalDetailsCollapsed(!isAppraisalDetailsCollapsed)
          }
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg">Appraisal Details</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Configure the basic information for this appraisal.
              </CardDescription>
            </div>
            {isAppraisalDetailsCollapsed ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {!isAppraisalDetailsCollapsed && (
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Employee */}
              <div className="grid gap-2">
                <Label>Employee</Label>
                <UiSelect
                  value={
                    formValues.appraisee_id
                      ? String(formValues.appraisee_id)
                      : undefined
                  }
                  onValueChange={(val) =>
                    setFormValues((v) => ({
                      ...v,
                      appraisee_id: Number(val),
                      reviewer_id: 0,
                    }))
                  }
                  disabled={isLocked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee to appraise" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleAppraisees.map((emp) => (
                      <SelectItem key={emp.emp_id} value={String(emp.emp_id)}>
                        {emp.emp_name} ({emp.emp_email}){" "}
                        {emp.emp_roles ? `- ${emp.emp_roles}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </UiSelect>
                <p className="text-xs text-muted-foreground">
                  Must be same level or lower than you.
                </p>
              </div>

              {/* Reviewer */}
              <div className="grid gap-2">
                <Label>Reviewer</Label>
                <UiSelect
                  value={
                    formValues.reviewer_id
                      ? String(formValues.reviewer_id)
                      : undefined
                  }
                  onValueChange={(val) =>
                    setFormValues((v) => ({ ...v, reviewer_id: Number(val) }))
                  }
                  disabled={!appraiseeSelected || isLocked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleReviewers.map((emp) => (
                      <SelectItem key={emp.emp_id} value={String(emp.emp_id)}>
                        {emp.emp_name} ({emp.emp_email}){" "}
                        {emp.emp_roles ? `- ${emp.emp_roles}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </UiSelect>
                <p className="text-xs text-muted-foreground">
                  Must be same level or higher than you.
                </p>
              </div>

              {/* Appraisal Type */}
              <div className="grid gap-2">
                <Label>Appraisal Type</Label>
                <UiSelect
                  value={
                    formValues.appraisal_type_id
                      ? String(formValues.appraisal_type_id)
                      : undefined
                  }
                  onValueChange={(val) => {
                    const id = Number(val);
                    setSelectedTypeId(id);
                    const meta = appraisalTypes.find((t) => t.id === id);
                    if (meta?.has_range) {
                      setFormValues((v) => ({
                        ...v,
                        appraisal_type_id: id,
                        appraisal_type_range_id: undefined,
                        period: undefined,
                      }));
                      fetchRanges(id);
                    } else {
                      setRanges([]);
                      const p = computePeriod(meta);
                      setFormValues((v) => ({
                        ...v,
                        appraisal_type_id: id,
                        appraisal_type_range_id: undefined,
                        period: p,
                      }));
                    }
                  }}
                  disabled={!reviewerSelected || isLocked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select appraisal type" />
                  </SelectTrigger>
                  <SelectContent>
                    {appraisalTypes.map((type) => (
                      <SelectItem key={type.id} value={String(type.id)}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </UiSelect>
                <p className="text-xs text-muted-foreground">
                  Type determines the period automatically. If the type has
                  ranges, choose one next.
                </p>
              </div>

              {/* Range (only if type has range) */}
              {(() => {
                const meta = appraisalTypes.find(
                  (t) => t.id === selectedTypeId
                );
                if (!meta?.has_range) return null;
                return (
                  <div className="grid gap-2">
                    <Label>Range</Label>
                    <UiSelect
                      value={
                        formValues.appraisal_type_range_id
                          ? String(formValues.appraisal_type_range_id)
                          : undefined
                      }
                      onValueChange={(val) => {
                        const rangeId = Number(val);
                        const tMeta = appraisalTypes.find(
                          (t) => t.id === selectedTypeId!
                        );
                        const r = ranges.find((rg) => rg.id === rangeId);
                        const p = computePeriod(tMeta, r);
                        setFormValues((v) => ({
                          ...v,
                          appraisal_type_range_id: rangeId,
                          period: p,
                        }));
                      }}
                      disabled={isLocked}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        {ranges.map((range) => (
                          <SelectItem key={range.id} value={String(range.id)}>
                            {range.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </UiSelect>
                    <p className="text-xs text-muted-foreground">
                      Range sets the exact start and end dates.
                    </p>
                  </div>
                );
              })()}

              {/* Appraisal Period */}
              <div className="md:col-span-2">
                <div className="grid gap-2">
                  <Label>Appraisal Period</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="date"
                      disabled={isLocked}
                      value={
                        formValues.period
                          ? formValues.period[0].format("YYYY-MM-DD")
                          : ""
                      }
                      onChange={(e) => {
                        if (e.target.value) {
                          const newStartDate = dayjs(e.target.value);
                          setFormValues((v) => ({
                            ...v,
                            period: [newStartDate, v.period?.[1] || dayjs()],
                          }));
                        }
                      }}
                      placeholder="Start Date"
                    />
                    <Input
                      type="date"
                      disabled={isLocked}
                      value={
                        formValues.period
                          ? formValues.period[1].format("YYYY-MM-DD")
                          : ""
                      }
                      onChange={(e) => {
                        if (e.target.value) {
                          const newEndDate = dayjs(e.target.value);
                          setFormValues((v) => ({
                            ...v,
                            period: [v.period?.[0] || dayjs(), newEndDate],
                          }));
                        }
                      }}
                      placeholder="End Date"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Automatically calculated from appraisal type and range.
                    Click on dates to manually adjust if needed.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Goals Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base sm:text-lg">Goals</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Total weightage: {totalWeightageUi}%
                {totalWeightageUi === 100 ? (
                  <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700">
                    Balanced
                  </span>
                ) : (
                  <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-700">
                    Should total 100%
                  </span>
                )}
              </CardDescription>
              {isLocked && (
                <div className="mt-1 text-xs text-amber-600">
                  Goals are read-only in status: {createdAppraisalStatus}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="hidden sm:inline-flex">
                {Math.max(0, 100 - totalWeightageUi)}% left
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setImportFromTemplateOpen(true)}
                disabled={!canAddGoals}
                className="border-primary text-primary hover:bg-primary/10 disabled:opacity-50"
                title={addGoalDisabledReason}
                aria-label="Import from templates"
              >
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline sm:ml-2">Import from Templates</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddGoalModalOpen(true)}
                disabled={!canAddGoals}
                className="border-primary text-primary hover:bg-primary/10 disabled:opacity-50"
                title={addGoalDisabledReason}
                aria-label="Add goal"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline sm:ml-2">Add Goal</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Progress value={totalWeightageUi} />
            <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
              <div>{Math.max(0, 100 - totalWeightageUi)}% remaining</div>
              {totalWeightageUi > 100 && (
                <span className="text-destructive">Exceeds 100%</span>
              )}
            </div>
          </div>

          {goals.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {goals.map((record) => (
                <Card
                  key={record.id}
                  className="hover:shadow-md h-full flex flex-col"
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold leading-snug line-clamp-2 text-sm sm:text-base">
                        {record.goal.goal_title}
                      </h4>
                      <Badge
                        variant="outline"
                        className="shrink-0"
                        title="Weightage"
                      >
                        {record.goal.goal_weightage}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {record.goal.goal_description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline" title="Category">
                        {record.goal.category?.name || "Uncategorized"}
                      </Badge>
                      <Badge variant="outline" title="Performance Factor">
                        Perf: {record.goal.goal_performance_factor}
                      </Badge>
                    </div>
                    <div className="mt-3">
                      <Badge
                        className={
                          record.goal.goal_importance === "High"
                            ? "border-transparent bg-red-500 text-white"
                            : record.goal.goal_importance === "Medium"
                            ? "border-transparent bg-orange-500 text-white"
                            : "border-transparent bg-green-500 text-white"
                        }
                        title="Importance"
                      >
                        {record.goal.goal_importance}
                      </Badge>
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 flex justify-end gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={isLocked}
                      onClick={() => handleEditGoal(record)}
                      aria-label="Edit goal"
                      title="Edit goal"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      disabled={isLocked}
                      onClick={() => handleRemoveGoal(record.goal.goal_id)}
                      aria-label="Remove goal"
                      title="Remove goal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-lg">
              <div>No goals added yet.</div>
              <div className="mt-4 mx-auto max-w-md text-left space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  {appraiseeSelected ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  )}
                  <span>Employee selected</span>
                </div>
                <div className="flex items-center gap-2">
                  {reviewerSelected ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  )}
                  <span>Reviewer selected</span>
                </div>
                <div className="flex items-center gap-2">
                  {typeSelected && periodSelected ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  )}
                  <span>Appraisal type and period set</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                <Button
                  size="sm"
                  onClick={() => setAddGoalModalOpen(true)}
                  disabled={!canAddGoals}
                  className="gap-2"
                  aria-label="Add goal"
                  title={addGoalDisabledReason}
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline sm:ml-2">Add Goal</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setImportFromTemplateOpen(true)}
                  disabled={!canAddGoals}
                  aria-label="Import from templates"
                  title={addGoalDisabledReason}
                >
                  <FolderOpen className="h-4 w-4" />
                  <span className="hidden sm:inline sm:ml-2">Import from Templates</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Actions */}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <Button onClick={handleCancel} disabled={loading} aria-label="Cancel" title="Cancel">
            <X className="h-4 w-4" />
            <span className="hidden sm:inline sm:ml-2">Cancel</span>
          </Button>
          {!createdAppraisalId && (
            <Button
              onClick={handleSubmit}
              disabled={!canSaveDraft || loading}
              aria-label={loading ? "Saving" : "Save as draft"}
              title={loading ? "Saving" : "Save as draft"}
            >
              <Save className="h-4 w-4" />
              <span className="hidden sm:inline sm:ml-2">{loading ? "Saving..." : "Save as Draft"}</span>
            </Button>
          )}
          {createdAppraisalId && createdAppraisalStatus === "Draft" && (
            <Button
              onClick={handleSubmit}
              disabled={!canSaveDraft || loading}
              aria-label={loading ? "Saving" : "Save changes"}
              title={loading ? "Saving" : "Save changes"}
            >
              <Save className="h-4 w-4" />
              <span className="hidden sm:inline sm:ml-2">{loading ? "Saving..." : "Save Changes"}</span>
            </Button>
          )}
        </div>
        <div>
          <Button
            onClick={handleFinish}
            disabled={!canSubmitForAck || loading}
            aria-label="Submit for acknowledgement"
            title="Submit for acknowledgement"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline sm:ml-2">Submit for Acknowledgement</span>
          </Button>
        </div>
      </div>

      {/* Child Modals */}
      <AddGoalModal
        open={addGoalModalOpen}
        onClose={() => setAddGoalModalOpen(false)}
        onGoalAdded={handleGoalAdded}
        appraisalId={createdAppraisalId ?? undefined}
        remainingWeightage={Math.max(0, 100 - totalWeightageUi)}
      />
      <ImportFromTemplateModal
        open={importFromTemplateOpen}
        onClose={() => setImportFromTemplateOpen(false)}
        onGoalAdded={handleGoalAdded}
        appraisalId={createdAppraisalId ?? undefined}
        remainingWeightage={Math.max(0, 100 - totalWeightageUi)}
      />
      <EditGoalModal
        open={editGoalModalOpen}
        onClose={() => {
          setEditGoalModalOpen(false);
          setEditingGoal(null);
        }}
        onGoalUpdated={handleGoalUpdated}
        goalData={editingGoal}
        remainingWeightage={
          editingGoal
            ? Math.max(
                0,
                100 - (totalWeightageUi - editingGoal.goal.goal_weightage)
              )
            : Math.max(0, 100 - totalWeightageUi)
        }
      />
    </div>
  );
};

export default CreateAppraisal;
