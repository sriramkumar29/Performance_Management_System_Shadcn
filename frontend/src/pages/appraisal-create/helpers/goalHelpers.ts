import { toast } from "sonner";

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
  goals: AppraisalGoal[],
  setGoals: (goals: AppraisalGoal[]) => void,
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

  const existingGoal = goals.find(g => g.goal.goal_id === normalizedGoal.goal.goal_id);

  if (existingGoal) {
    // Update existing goal
    const updatedGoals = goals.map(g =>
      g.goal.goal_id === normalizedGoal.goal.goal_id ? normalizedGoal : g
    );
    setGoals(updatedGoals);
    toast.success("Goal updated successfully");
  } else {
    // Add new goal
    setGoals([...goals, normalizedGoal]);
    toast.success("Goal added successfully");
  }

  setIsAddGoalModalOpen(false);
  setSelectedGoalForEdit?.(null);
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