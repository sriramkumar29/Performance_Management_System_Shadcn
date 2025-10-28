import { toast } from "sonner";
import type { Dispatch, SetStateAction } from "react";

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

// Helper function to handle goal addition
export const handleAddGoal = (
  newGoal: AppraisalGoal,
  _goals: AppraisalGoal[],
  setGoals: Dispatch<SetStateAction<AppraisalGoal[]>>,
  setIsAddGoalModalOpen: (open: boolean) => void,
  setSelectedGoalForEdit?: (goal: AppraisalGoal | null) => void
) => {
  // Normalize incoming goal shape so UI can rely on `goal.categories` and `goal.category_ids`.
  const normalizedGoal: AppraisalGoal = (() => {
    const g = newGoal.goal as any;
    const categoriesFromArray = Array.isArray(g.categories) && g.categories.length ? g.categories : undefined;
    const categoriesFromSingle = g.category ? [g.category] : undefined;
    const idsFromArray = Array.isArray(g.category_ids) && g.category_ids.length ? g.category_ids : undefined;
    const idsFromCats = categoriesFromArray ? categoriesFromArray.map((c: any) => c.id) : undefined;
    const idsFromSingle = g.category ? [g.category.id] : undefined;

    const finalCategories = categoriesFromArray ?? categoriesFromSingle ?? (idsFromArray ? idsFromArray.map((id: any) => ({ id, name: "" })) : []);
    const finalCategoryIds = idsFromArray ?? idsFromCats ?? idsFromSingle ?? [];

    return {
      ...newGoal,
      goal: {
        ...newGoal.goal,
        categories: finalCategories,
        category_ids: finalCategoryIds,
      },
    } as AppraisalGoal;
  })();

  // Use functional updater to avoid stale-state races when multiple imports happen quickly
  setGoals((prev) => {
    const exists = prev.some(
      (g) => g.goal.goal_id === normalizedGoal.goal.goal_id
    );
    if (exists) {
      toast.success("Goal updated successfully");
      return prev.map((g) =>
        g.goal.goal_id === normalizedGoal.goal.goal_id ? normalizedGoal : g
      );
    }
    toast.success("Goal added successfully");
    return [...prev, normalizedGoal];
  });

  setIsAddGoalModalOpen(false);
  setSelectedGoalForEdit?.(null);
};

// Batch-add helper: add multiple goals safely using functional updates and dedupe by
// goal_template_id (preferred) or goal_id as fallback.
export const addGoalsBatch = (
  newGoals: AppraisalGoal[],
  setGoals: Dispatch<SetStateAction<AppraisalGoal[]>>
) => {
  setGoals((prev) => {
    const keyFor = (g: AppraisalGoal) =>
      g.goal?.goal_template_id ?? g.goal?.goal_id;

    const existingKeys = new Set(prev.map((g) => keyFor(g)));

    const filtered = newGoals.filter((g) => !existingKeys.has(keyFor(g)));
    if (!filtered.length) return prev;
    return [...prev, ...filtered];
  });
};

// Helper function to handle goal editing
export const handleEditGoal = (
  goal: AppraisalGoal,
  setSelectedGoalForEdit: (goal: AppraisalGoal) => void,
  setIsAddGoalModalOpen: (open: boolean) => void
) => {
  setSelectedGoalForEdit(goal);
  setIsAddGoalModalOpen(true);
};

// Helper function to handle goal deletion
export const handleDeleteGoal = (
  goalId: number,
  goals: AppraisalGoal[],
  setGoals: (goals: AppraisalGoal[]) => void
) => {
  const updatedGoals = goals.filter(g => g.goal.goal_id !== goalId);
  setGoals(updatedGoals);
  toast.success("Goal removed successfully");
};

// Helper function to calculate total weightage
export const calculateTotalWeightage = (goals: AppraisalGoal[]): number => {
  return goals.reduce((sum, g) => sum + (g.goal.goal_weightage || 0), 0);
};

// Helper function to check if goals are valid
export const validateGoals = (goals: AppraisalGoal[]): { isValid: boolean; message?: string } => {
  if (goals.length === 0) {
    return { isValid: false, message: "At least one goal is required" };
  }

  const totalWeightage = calculateTotalWeightage(goals);
  if (totalWeightage !== 100) {
    return {
      isValid: false,
      message: `Total weightage must equal 100% (currently ${totalWeightage}%)`
    };
  }

  return { isValid: true };
};

// Helper function to compute goal changes for syncing
export const computeGoalChanges = (
  currentGoals: AppraisalGoal[],
  originalGoals: AppraisalGoal[]
) => {
  const currentGoalIds = new Set(currentGoals.map(g => g.goal.goal_id));
  const originalGoalIds = new Set(originalGoals.map(g => g.goal.goal_id));

  // Find added goals (present in current but not in original)
  const added = currentGoals.filter(g => !originalGoalIds.has(g.goal.goal_id));

  // Find removed goal IDs (present in original but not in current)
  const removed = Array.from(originalGoalIds).filter(id => !currentGoalIds.has(id));

  // Find updated goals (present in both but with different data)
  const updated = currentGoals.filter(currentGoal => {
    const originalGoal = originalGoals.find(g => g.goal.goal_id === currentGoal.goal.goal_id);
    if (!originalGoal) return false;

    // Check if any relevant fields have changed
    const fieldsToCompare = [
      'goal_title', 'goal_description', 'goal_performance_factor',
      'goal_importance', 'goal_weightage', 'category_id'
    ] as const;

    return fieldsToCompare.some(field =>
      currentGoal.goal[field] !== originalGoal.goal[field]
    );
  });

  return { added, removed, updated };
};