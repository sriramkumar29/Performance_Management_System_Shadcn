import {
  AlertCircle,
  CheckCircle2,
  Pencil,
  Trash2,
  Plus,
  FolderOpen,
  Target,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";
import { Progress } from "../../../components/ui/progress";
import { getBadgeVariant } from "../helpers/uiHelpers";
import { calculateTotalWeightage } from "../helpers/goalHelpers";

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

interface GoalsSectionProps {
  goals: AppraisalGoal[];
  canAddGoals: boolean;
  isLocked: boolean;
  addGoalDisabledReason: string;
  appraiseeSelected: boolean;
  reviewerSelected: boolean;
  typeSelected: boolean;
  periodSelected: boolean;
  onAddGoal: () => void;
  onImportFromTemplate: () => void;
  onEditGoal: (goal: AppraisalGoal) => void;
  onRemoveGoal: (goalId: number) => void;
}

export const GoalsSection = ({
  goals,
  canAddGoals,
  isLocked,
  addGoalDisabledReason,
  appraiseeSelected,
  reviewerSelected,
  typeSelected,
  periodSelected,
  onAddGoal,
  onImportFromTemplate,
  onEditGoal,
  onRemoveGoal,
}: GoalsSectionProps) => {
  const totalWeightageUi = calculateTotalWeightage(goals);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg">Goals</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Add goals, set importance and weightage. Total must be 100%.
            </CardDescription>
          </div>
          <div className="hidden sm:flex gap-2">
            <Button
              size="sm"
              onClick={onAddGoal}
              disabled={!canAddGoals}
              data-testid="add-goal-toolbar"
              aria-label="Add goal"
              title={addGoalDisabledReason}
            >
              <Plus className="h-4 w-4" />
              <span className="ml-2">Add Goal</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onImportFromTemplate}
              disabled={!canAddGoals}
              aria-label="Import from templates"
              title={addGoalDisabledReason}
            >
              <FolderOpen className="h-4 w-4 text-icon" />
              <span className="ml-2">Import from Templates</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {goals.length > 0 ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Total weightage</span>
                <span className="font-medium">{totalWeightageUi}%</span>
              </div>
            </div>
            <Progress value={totalWeightageUi} />
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {goals.map((record) => (
                <Card
                  key={record.goal.goal_id}
                  className="group relative overflow-hidden border shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardHeader className="h-full p-4 pr-4 flex flex-col">
                    {/* Weightage badge */}
                    <div className="absolute top-2 right-2 rounded-full bg-primary/10 text-primary text-xs font-medium px-2 py-0.5">
                      {record.goal.goal_weightage}%
                    </div>

                    {/* Header with icon and text */}
                    <div className="flex items-start gap-2">
                      <div className="p-2 rounded-md bg-primary/10 text-primary">
                        <Target className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <CardTitle
                          className="text-sm font-semibold truncate"
                          title={record.goal.goal_title}
                        >
                          {record.goal.goal_title}
                        </CardTitle>
                        {record.goal.goal_description && (
                          <CardDescription
                            className="text-xs text-muted-foreground line-clamp-5 leading-snug"
                            title={record.goal.goal_description}
                          >
                            {record.goal.goal_description}
                          </CardDescription>
                        )}
                      </div>
                    </div>

                    {/* Spacer to push meta to bottom */}
                    <div className="flex-1" />

                    {/* Meta row at bottom */}
                    <div className="pt-2 mt-auto flex flex-wrap items-center gap-2 text-xs">
                      {record.goal.category?.name ? (
                        <Badge variant="outline">
                          {record.goal.category.name}
                        </Badge>
                      ) : null}
                      <Badge
                        variant={getBadgeVariant(record.goal.goal_importance)}
                        title="Importance"
                      >
                        {record.goal.goal_importance}
                      </Badge>
                    </div>

                    {/* Action buttons bottom-right (show on hover on larger screens) */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="outline"
                        disabled={isLocked}
                        onClick={() => onEditGoal(record)}
                        aria-label="Edit goal"
                        title="Edit goal"
                      >
                        <Pencil className="h-4 w-4 text-icon" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        disabled={isLocked}
                        onClick={() => onRemoveGoal(record.goal.goal_id)}
                        aria-label="Remove goal"
                        title="Remove goal"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <div className="py-10 text-muted-foreground border border-dashed border-border rounded-lg">
            <div className="flex flex-col items-center">
              <div className="text-center">No goals added yet.</div>
              <div className="mt-4 space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  {appraiseeSelected ? (
                    <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-[hsl(var(--warning))]" />
                  )}
                  <span>Employee selected</span>
                </div>
                <div className="flex items-center gap-2">
                  {reviewerSelected ? (
                    <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-[hsl(var(--warning))]" />
                  )}
                  <span>Reviewer selected</span>
                </div>
                <div className="flex items-center gap-2">
                  {typeSelected && periodSelected ? (
                    <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-[hsl(var(--warning))]" />
                  )}
                  <span>Appraisal type and period set</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 flex-wrap justify-center">
              <Button
                size="sm"
                onClick={onAddGoal}
                disabled={!canAddGoals}
                className="gap-2"
                data-testid="add-goal-empty"
                aria-label="Add goal"
                title={addGoalDisabledReason}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline sm:ml-2">Add Goal</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onImportFromTemplate}
                disabled={!canAddGoals}
                aria-label="Import from templates"
                title={addGoalDisabledReason}
              >
                <FolderOpen className="h-4 w-4 text-icon" />
                <span className="ml-2">Import from Templates</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
