// Helper function to determine why adding a goal is disabled
export const getAddGoalDisabledReason = ({
  canAddGoals,
  isLocked,
  appraiseeSelected,
  reviewerSelected,
  typeSelected,
  periodSelected,
}: {
  canAddGoals: boolean;
  isLocked: boolean;
  appraiseeSelected: boolean;
  reviewerSelected: boolean;
  typeSelected: boolean;
  periodSelected: boolean;
}): string => {
  if (canAddGoals) return "";

  if (isLocked) return "Appraisal not in Draft";
  if (!appraiseeSelected) return "Select an employee first";
  if (!reviewerSelected) return "Select a reviewer first";
  if (!typeSelected || !periodSelected) return "Select appraisal type (and range) to set period";

  // Allow adding goals even when total weightage is >= 100
  return "";
};

// Helper function to determine badge variant based on importance
export const getBadgeVariant = (importance: string): "destructive" | "warning" | "success" => {
  if (importance === "High") return "destructive";
  if (importance === "Medium") return "warning";
  return "success";
};