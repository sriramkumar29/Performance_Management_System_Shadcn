import { useEffect, useState } from "react";
import { ArrowLeft, Save, Send } from "lucide-react";
import AddGoalModal from "../../features/goals/AddGoalModal";
import EditGoalModal from "../../features/goals/EditGoalModal";
import ImportFromTemplateModal from "../../features/goals/ImportFromTemplateModal";
import { useAuth } from "../../contexts/AuthContext";
import { BUTTON_STYLES, ICON_SIZES } from "../../constants/buttonStyles";

import type { Dayjs } from "dayjs";

import { getAddGoalDisabledReason } from "./helpers/uiHelpers";
import {
  fetchEmployees,
  fetchAppraisalTypes,
  fetchRanges,
} from "./helpers/dataHelpers";
import {
  loadAppraisal as loadAppraisalHelper,
  syncGoalChanges as syncGoalChangesHelper,
  saveAppraisal,
  submitAppraisal,
} from "./helpers/appraisalHelpers";
import {
  handleAddGoal,
  handleEditGoal,
  calculateTotalWeightage,
} from "./helpers/goalHelpers";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";

import { GoalsSection } from "./components/GoalsSection";
import { AppraisalDetailsForm } from "./components/AppraisalDetailsForm";
import { isReviewerEligible } from "../../utils/roleHelpers";

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

const CreateAppraisal = () => {
  const navigate = useNavigate();
  const params = useParams();
  const routeAppraisalId = params.id ? Number(params.id) : undefined;

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
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [initialFormValues, setInitialFormValues] =
    useState<AppraisalFormValues>({
      appraisee_id: 0,
      reviewer_id: 0,
      appraisal_type_id: 0,
      appraisal_type_range_id: undefined,
      period: undefined,
    });
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

  // Role-based filtering using new role system
  const appraiserRoleId = user?.role_id ?? 0;
  const addGoalDisabledReason = getAddGoalDisabledReason({
    canAddGoals,
    isLocked,
    appraiseeSelected,
    reviewerSelected,
    typeSelected,
    periodSelected,
    totalWeightageUi,
  });

  // Eligible appraisees: employees with role level <= appraiser's role level
  const eligibleAppraisees = employees.filter(
    (emp) =>
      (emp.role_id ?? 999) <= appraiserRoleId && emp.emp_id !== user?.emp_id
  );

  // Reviewers must be manager or above. Use centralized helper which
  // explicitly excludes Admin from appearing as a reviewer.
  const eligibleReviewers = employees.filter(
    (emp) =>
      isReviewerEligible((emp as any).role_id, (emp as any).role?.role_name) &&
      emp.emp_id !== user?.emp_id &&
      emp.emp_id !== formValues.appraisee_id // reviewer cannot be the appraisee
  );

  // Debugging: log reviewer candidates in non-production builds so you can
  // inspect why the dropdown may be empty or different than expected.
  if (import.meta.env.MODE !== "production") {
    // Keep the log concise and safe for console viewing
    console.debug(
      "[CreateAppraisal] eligibleReviewers:",
      eligibleReviewers.map((e) => ({
        emp_id: e.emp_id,
        emp_name: e.emp_name,
        role_id: e.role_id,
        role_name: e.role?.role_name,
      }))
    );
  }

  const handleGoalAdded = (appraisalGoal: AppraisalGoal) => {
    handleAddGoal(appraisalGoal, goals, setGoals, setAddGoalModalOpen);
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

  const handleEditGoalLocal = (goal: AppraisalGoal) => {
    handleEditGoal(goal, setEditingGoal, setEditGoalModalOpen);
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
    } catch (error: any) {
      console.error("Failed to remove goal:", error);
      toast.error("Failed to remove goal", {
        description: error.message || "Please try again.",
      });
    }
  };

  // Data fetching functions moved to dataHelpers.ts

  const loadAppraisal = async (id: number) => {
    try {
      setLoading(true);
      const {
        appraisalId,
        status,
        goals: loadedGoals,
        typeId,
        formValues,
      } = await loadAppraisalHelper(id);
      setCreatedAppraisalId(appraisalId);
      setCreatedAppraisalStatus(status);
      setGoals(loadedGoals);
      setOriginalGoals([...loadedGoals]);
      setSelectedTypeId(typeId);
      setFormValues(formValues);
      setInitialFormValues(formValues); // Save initial form state
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
        const [employeesData, appraisalTypesData] = await Promise.all([
          fetchEmployees(),
          fetchAppraisalTypes(),
        ]);
        setEmployees(employeesData);
        setAppraisalTypes(appraisalTypesData);

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

  // Automatically fetch ranges when appraisal type changes or appraisal types are loaded
  useEffect(() => {
    (async () => {
      if (selectedTypeId && appraisalTypes.length > 0) {
        const typeMeta = appraisalTypes.find((t) => t.id === selectedTypeId);
        if (typeMeta?.has_range) {
          const rangesData = await fetchRanges(selectedTypeId);
          setRanges(rangesData);
        } else {
          setRanges([]);
        }
      }
    })();
  }, [selectedTypeId, appraisalTypes]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const syncGoalChanges = async (appraisalId: number) => {
    await syncGoalChangesHelper(appraisalId, goalChanges, originalGoals);
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

    const currentTotalWeightage = calculateTotalWeightage(goals);
    if (currentTotalWeightage > 100) {
      toast.error("Invalid weightage", {
        description: `Total is ${currentTotalWeightage}% (> 100%).`,
      });
      return;
    }

    try {
      setLoading(true);
      const newId = await saveAppraisal(
        formValues,
        user.emp_id,
        createdAppraisalId ?? undefined
      );

      if (!createdAppraisalId) {
        setCreatedAppraisalId(newId);
        setCreatedAppraisalStatus("Draft");
      }

      // Persist current goal changes
      try {
        await syncGoalChanges(newId);
        setGoalChanges({ added: [], removed: [], updated: [] });
        // Refresh to ensure goals in state reflect server IDs (replacing any pseudo goals)
        await loadAppraisal(newId);
      } catch (e: any) {
        // If syncing goals fails, surface a descriptive error and stop here
        throw new Error(
          e?.message || "Failed to sync goals after saving appraisal"
        );
      }

      toast.success(createdAppraisalId ? "Saved" : "Draft saved", {
        description: createdAppraisalId
          ? "Your changes have been saved."
          : "Your draft appraisal has been created.",
      });
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
      await saveAppraisal(
        formValues,
        user.emp_id,
        createdAppraisalId ?? undefined
      );
      await syncGoalChanges(createdAppraisalId);
      setGoalChanges({ added: [], removed: [], updated: [] });

      // Submit for acknowledgement
      await submitAppraisal(createdAppraisalId);
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

  const handleBackClick = () => {
    // Check if form values have changed
    const formValuesChanged =
      formValues.appraisee_id !== initialFormValues.appraisee_id ||
      formValues.reviewer_id !== initialFormValues.reviewer_id ||
      formValues.appraisal_type_id !== initialFormValues.appraisal_type_id ||
      formValues.appraisal_type_range_id !==
        initialFormValues.appraisal_type_range_id ||
      JSON.stringify(formValues.period) !==
        JSON.stringify(initialFormValues.period);

    // Check if there are goal changes
    const hasGoalChanges =
      goalChanges.added.length > 0 ||
      goalChanges.removed.length > 0 ||
      goalChanges.updated.length > 0;

    // Check if there are unsaved changes
    const hasUnsavedChanges =
      (!createdAppraisalId && (formValuesChanged || goals.length > 0)) ||
      hasGoalChanges ||
      formValuesChanged;

    if (hasUnsavedChanges && !isLocked) {
      setShowExitDialog(true);
    } else {
      navigate(-1);
    }
  };

  const handleSaveAndClose = async () => {
    setShowExitDialog(false);
    await handleSubmit();
    navigate(-1);
  };

  const handleCloseWithoutSaving = () => {
    setShowExitDialog(false);
    navigate(-1);
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
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
                {createdAppraisalId ? "Edit Appraisal" : "Create New Appraisal"}
              </h1>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2">
              {!createdAppraisalId && (
                <Button
                  onClick={handleSubmit}
                  disabled={!canSaveDraft || loading}
                  variant={BUTTON_STYLES.SAVE_DRAFT.variant}
                  className={BUTTON_STYLES.SAVE_DRAFT.className}
                  data-testid="save-draft"
                  aria-label={getSaveButtonLabel(loading, true)}
                  title={getSaveButtonLabel(loading, true)}
                >
                  <Save className={`${ICON_SIZES.DEFAULT} mr-2`} />
                  {getSaveButtonLabel(loading, true)}
                </Button>
              )}
              {createdAppraisalId && createdAppraisalStatus === "Draft" && (
                <Button
                  onClick={handleSubmit}
                  disabled={!canSaveDraft || loading}
                  variant={BUTTON_STYLES.SAVE_DRAFT.variant}
                  className={BUTTON_STYLES.SAVE_DRAFT.className}
                  aria-label={getSaveButtonLabel(loading, false)}
                  title={getSaveButtonLabel(loading, false)}
                >
                  <Save className={`${ICON_SIZES.DEFAULT} mr-2`} />
                  {getSaveButtonLabel(loading, false)}
                </Button>
              )}
              <Button
                data-testid="submit-for-acknowledgement-button"
                onClick={handleFinish}
                disabled={!canSubmitForAck || loading}
                variant={BUTTON_STYLES.SUBMIT.variant}
                className={BUTTON_STYLES.SUBMIT.className}
                aria-label="Submit for acknowledgement"
                title="Submit for acknowledgement"
              >
                <Send className={`${ICON_SIZES.DEFAULT} mr-2`} />
                Submit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="px-1 py-2">
          <div className="space-y-2">
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
              disabled={loading}
              variant={BUTTON_STYLES.SAVE.variant}
              className={`w-full sm:w-auto ${BUTTON_STYLES.SAVE.className}`}
            >
              <Save className={`${ICON_SIZES.DEFAULT} mr-2`} />
              {loading ? "Saving..." : "Save & Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateAppraisal;
