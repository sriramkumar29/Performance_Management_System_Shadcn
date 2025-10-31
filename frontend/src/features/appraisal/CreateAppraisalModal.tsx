import { useEffect, useState } from "react";
import { Save, Send, X } from "lucide-react";
import AddGoalModal from "../goals/AddGoalModal";
import EditGoalModal from "../goals/EditGoalModal";
import ImportFromTemplateModal from "../goals/ImportFromTemplateModal";
import { useAuth } from "../../contexts/AuthContext";

import type { Dayjs } from "dayjs";

import { getAddGoalDisabledReason } from "../../pages/appraisal-create/helpers/uiHelpers";
import {
  fetchEmployees,
  fetchAppraisalTypes,
  fetchRanges,
} from "../../pages/appraisal-create/helpers/dataHelpers";
import {
  loadAppraisal as loadAppraisalHelper,
  syncGoalChanges as syncGoalChangesHelper,
  saveAppraisal,
  submitAppraisal,
} from "../../pages/appraisal-create/helpers/appraisalHelpers";
import {
  handleAddGoal,
  calculateTotalWeightage,
} from "../../pages/appraisal-create/helpers/goalHelpers";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";

import { GoalsSection } from "../../pages/appraisal-create/components/GoalsSection";
import { BUTTON_STYLES, ICON_SIZES } from "../../constants/buttonStyles";
import { AppraisalDetailsForm } from "../../pages/appraisal-create/components/AppraisalDetailsForm";
import { isReviewerEligible, compareRoleLevels } from "../../utils/roleHelpers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

// Types
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

interface Role {
  id: number;
  role_name: string;
}

interface Employee {
  emp_id: number;
  emp_name: string;
  emp_email: string;
  role_id: number;
  role: Role;
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

interface CreateAppraisalModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  appraisalId?: number; // Optional: for editing existing appraisals
}

const CreateAppraisalModal = ({
  open,
  onClose,
  onSuccess,
  appraisalId,
}: CreateAppraisalModalProps) => {
  // Helper function to get save button labels
  const getSaveButtonLabel = (loading: boolean, isNew: boolean) => {
    if (loading) return "Saving...";
    return isNew ? "Save Draft" : "Save Changes";
  };

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

  // UI derivations
  const totalWeightageUi = calculateTotalWeightage(goals);
  const appraiseeSelected = !!formValues.appraisee_id;
  const reviewerSelected = !!formValues.reviewer_id;
  const typeSelected = !!formValues.appraisal_type_id;
  const periodSelected = !!formValues.period && formValues.period.length === 2;
  // Allow adding goals even if total weightage is already 100% or more.
  const canAddGoals =
    (createdAppraisalId === null &&
      appraiseeSelected &&
      reviewerSelected &&
      typeSelected &&
      periodSelected) ||
    (createdAppraisalId !== null && createdAppraisalStatus === "Draft");

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

  // Role-based filtering using new role system
  const appraiserRoleId = user?.role_id ?? 0;
  const statusLabel = createdAppraisalId
    ? createdAppraisalStatus || "Draft"
    : "New Draft";
  const addGoalDisabledReason = getAddGoalDisabledReason({
    canAddGoals,
    isLocked,
    appraiseeSelected,
    reviewerSelected,
    typeSelected,
    periodSelected,
  });

  // Eligible appraisees: employees with role_id <= appraiser's role_id
  const eligibleAppraisees = employees.filter(
    (emp) =>
      (emp.role_id ?? 999) <= appraiserRoleId && emp.emp_id !== user?.emp_id
  );

  // Eligible reviewers: Manager or above. Use centralized helper which
  // explicitly excludes Admin from reviewer eligibility.
  const eligibleReviewers = employees.filter(
    (emp) =>
      isReviewerEligible((emp as any).role_id, (emp as any).role?.role_name) &&
      // Require reviewer to be equal or higher in role level than the current user
      compareRoleLevels((emp as any).role_id ?? 0, appraiserRoleId ?? 0) >= 0 &&
      emp.emp_id !== user?.emp_id
  );

  const handleGoalAdded = (appraisalGoal: AppraisalGoal) => {
    handleAddGoal(appraisalGoal, goals, setGoals, setAddGoalModalOpen);
    // Always stage added goals (even when appraisal already exists).
    // Actual DB insertion happens in syncGoalChanges() on Save/Submit.
    setGoalChanges((prev) => {
      const already = prev.added.some(
        (g) => g.goal.goal_id === appraisalGoal.goal.goal_id
      );
      if (already) return prev;
      return { ...prev, added: [...prev.added, appraisalGoal] };
    });
  };

  const handleGoalUpdated = (updated: AppraisalGoal) => {
    // Update in local state
    setGoals(
      goals.map((g) => (g.goal.goal_id === updated.goal.goal_id ? updated : g))
    );
    setEditGoalModalOpen(false);
    setEditingGoal(null);

    // If this goal was already in originalGoals, it's "updated"
    const wasOriginal = originalGoals.some(
      (o) => o.goal.goal_id === updated.goal.goal_id
    );
    if (wasOriginal) {
      setGoalChanges((prev) => {
        const alreadyMarked = prev.updated.some(
          (g) => g.goal.goal_id === updated.goal.goal_id
        );
        if (alreadyMarked) {
          return {
            ...prev,
            updated: prev.updated.map((g) =>
              g.goal.goal_id === updated.goal.goal_id ? updated : g
            ),
          };
        }
        return { ...prev, updated: [...prev.updated, updated] };
      });
    } else {
      // It's a brand-new goal being edited, so refresh added list
      setGoalChanges((prev) => ({
        ...prev,
        added: prev.added.map((g) =>
          g.goal.goal_id === updated.goal.goal_id ? updated : g
        ),
      }));
    }
  };

  const handleEditGoalLocal = (goal: AppraisalGoal) => {
    setEditingGoal(goal);
    setEditGoalModalOpen(true);
  };

  const handleRemoveGoal = (goalId: number) => {
    const goalToRemove = goals.find((g) => g.goal.goal_id === goalId);
    if (!goalToRemove) return;

    const updatedGoals = goals.filter((g) => g.goal.goal_id !== goalId);
    setGoals(updatedGoals);

    // If it was originally in the DB, mark as removed
    const wasOriginal = originalGoals.some((o) => o.goal.goal_id === goalId);
    if (wasOriginal) {
      setGoalChanges((prev) => ({
        ...prev,
        removed: [...prev.removed, goalId],
      }));
    } else {
      // Otherwise remove from "added" list
      setGoalChanges((prev) => ({
        ...prev,
        added: prev.added.filter((g) => g.goal.goal_id !== goalId),
      }));
    }
  };

  const handleCancel = () => {
    // Reset form state
    setFormValues({
      appraisee_id: 0,
      reviewer_id: 0,
      appraisal_type_id: 0,
      appraisal_type_range_id: undefined,
      period: undefined,
    });
    setGoals([]);
    setCreatedAppraisalId(null);
    setCreatedAppraisalStatus(null);
    setGoalChanges({ added: [], removed: [], updated: [] });
    setOriginalGoals([]);
    onClose();
  };

  const syncGoalChanges = async (appraisalId: number) => {
    await syncGoalChangesHelper(appraisalId, goalChanges, originalGoals);
    // Clear changes after sync
    setGoalChanges({ added: [], removed: [], updated: [] });
    // Now the current goals become the new "original"
    setOriginalGoals([...goals]);
  };

  const handleSubmit = async () => {
    if (!user?.emp_id) {
      toast.error("User not authenticated");
      return;
    }

    setLoading(true);
    try {
      const appraisalId = await saveAppraisal(
        formValues,
        user.emp_id,
        createdAppraisalId ?? undefined
      );

      if (!createdAppraisalId) {
        // New appraisal created - sync goals immediately
        setCreatedAppraisalId(appraisalId);
        setCreatedAppraisalStatus("Draft");

        // Sync goals to the backend
        if (
          goalChanges.added.length > 0 ||
          goalChanges.removed.length > 0 ||
          goalChanges.updated.length > 0
        ) {
          await syncGoalChanges(appraisalId);
        } else {
          // No changes to sync, just update original goals
          setOriginalGoals([...goals]);
        }

        toast.success("Draft saved successfully");
      } else {
        await syncGoalChanges(appraisalId);
        toast.success("Changes saved successfully");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save draft");
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    if (!createdAppraisalId || createdAppraisalStatus !== "Draft") return;
    setLoading(true);
    try {
      await syncGoalChanges(createdAppraisalId);
      await submitAppraisal(createdAppraisalId);
      toast.success("Appraisal submitted for acknowledgement");
      if (onSuccess) {
        onSuccess();
      }
      handleCancel(); // Close modal and reset
    } catch (error: any) {
      toast.error(error.message || "Failed to submit appraisal");
    } finally {
      setLoading(false);
    }
  };

  // Load initial data on mount
  // Load initial data on mount
  useEffect(() => {
    if (open) {
      const loadData = async () => {
        // First load employees and types
        const [emps, types] = await Promise.all([
          fetchEmployees(),
          fetchAppraisalTypes(),
        ]);
        if (emps) setEmployees(emps);
        if (types) setAppraisalTypes(types);

        // Load existing appraisal if editing
        if (appraisalId) {
          try {
            const appraisalData = await loadAppraisalHelper(appraisalId);
            setCreatedAppraisalId(appraisalData.appraisalId);
            setCreatedAppraisalStatus(appraisalData.status);
            setGoals(appraisalData.goals);
            setOriginalGoals(appraisalData.goals);
            setFormValues(appraisalData.formValues);
            setSelectedTypeId(appraisalData.typeId);

            // Load ranges for the appraisal type if it has range
            if (appraisalData.typeId && types) {
              const selectedType = types.find(
                (t) => t.id === appraisalData.typeId
              );
              if (selectedType?.has_range) {
                const rangesData = await fetchRanges(appraisalData.typeId);
                if (rangesData) {
                  setRanges(rangesData);
                }
              }
            }
          } catch (error: any) {
            toast.error(error.message || "Failed to load appraisal");
            onClose();
          }
        }
      };
      loadData();
    }
  }, [open, appraisalId, onClose]);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  {createdAppraisalId
                    ? "Edit Appraisal"
                    : "Create New Appraisal"}
                </DialogTitle>
                <Badge
                  variant="outline"
                  className="px-3 py-1 text-sm font-semibold shadow-soft"
                  data-testid="appraisal-status-badge"
                >
                  {statusLabel}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
            {/* Appraisal Details */}
            <div className="animate-slide-up">
              <AppraisalDetailsForm
                formValues={formValues}
                setFormValues={setFormValues}
                employees={eligibleAppraisees}
                eligibleReviewers={eligibleReviewers}
                appraisalTypes={appraisalTypes}
                ranges={ranges}
                setRanges={setRanges}
                selectedTypeId={selectedTypeId}
                setSelectedTypeId={setSelectedTypeId}
                isCollapsed={isAppraisalDetailsCollapsed}
                onToggleCollapse={() =>
                  setIsAppraisalDetailsCollapsed(!isAppraisalDetailsCollapsed)
                }
                isLocked={isLocked}
                onFetchRanges={fetchRanges}
              />
            </div>

            {/* Goals Section */}
            <div
              className="animate-slide-up"
              style={{ animationDelay: "100ms" }}
            >
              <GoalsSection
                goals={goals}
                canAddGoals={canAddGoals}
                isLocked={isLocked}
                addGoalDisabledReason={addGoalDisabledReason}
                appraiseeSelected={appraiseeSelected}
                reviewerSelected={reviewerSelected}
                typeSelected={typeSelected}
                periodSelected={periodSelected}
                onAddGoal={() => setAddGoalModalOpen(true)}
                onImportFromTemplate={() => setImportFromTemplateOpen(true)}
                onEditGoal={handleEditGoalLocal}
                onRemoveGoal={handleRemoveGoal}
              />
            </div>
          </div>

          {/* Footer Actions - Fixed at bottom */}
          <div className="border-t bg-background px-6 py-4 mt-auto">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-3">
                <Button
                  variant={BUTTON_STYLES.CANCEL.variant}
                  onClick={handleCancel}
                  disabled={loading}
                  aria-label="Cancel"
                  title="Cancel"
                  className="hover-scale"
                >
                  <X className={ICON_SIZES.DEFAULT} />
                  <span className="hidden sm:inline sm:ml-2">Cancel</span>
                </Button>
                {!createdAppraisalId && (
                  <Button
                    variant={BUTTON_STYLES.SUBMIT.variant}
                    onClick={handleSubmit}
                    disabled={!canSaveDraft || loading}
                    className={BUTTON_STYLES.SUBMIT.className}
                    data-testid="save-draft"
                    aria-label={getSaveButtonLabel(loading, true)}
                    title={getSaveButtonLabel(loading, true)}
                  >
                    <Save className={ICON_SIZES.DEFAULT} />
                    <span className="hidden sm:inline sm:ml-2">
                      {getSaveButtonLabel(loading, true)}
                    </span>
                  </Button>
                )}
                {createdAppraisalId && createdAppraisalStatus === "Draft" && (
                  <Button
                    variant={BUTTON_STYLES.SUBMIT.variant}
                    onClick={handleSubmit}
                    disabled={!canSaveDraft || loading}
                    className={BUTTON_STYLES.SUBMIT.className}
                    aria-label={getSaveButtonLabel(loading, false)}
                    title={getSaveButtonLabel(loading, false)}
                  >
                    <Save className={ICON_SIZES.DEFAULT} />
                    <span className="hidden sm:inline sm:ml-2">
                      {getSaveButtonLabel(loading, false)}
                    </span>
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  data-testid="submit-for-acknowledgement-button"
                  variant={BUTTON_STYLES.SUBMIT.variant}
                  onClick={handleFinish}
                  disabled={!canSubmitForAck || loading}
                  className={BUTTON_STYLES.SUBMIT.className}
                  aria-label="Submit for acknowledgement"
                  title="Submit for acknowledgement"
                >
                  <Send className={ICON_SIZES.DEFAULT} />
                  <span className="hidden sm:inline sm:ml-2">
                    Submit for Acknowledgement
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
    </>
  );
};

export default CreateAppraisalModal;
