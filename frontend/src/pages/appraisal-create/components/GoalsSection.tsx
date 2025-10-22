import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Pencil,
  Trash2,
  Plus,
  FolderOpen,
  Target,
  Flag,
  Weight,
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
// ...existing code...
import { calculateTotalWeightage } from "../helpers/goalHelpers";
import { BUTTON_STYLES, ICON_SIZES } from "../../../constants/buttonStyles";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "../../../components/ui/dropdown-menu";

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
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const openConfirmRemove = (id: number) => setConfirmRemoveId(id);
  const closeConfirmRemove = () => setConfirmRemoveId(null);
  const confirmRemove = async () => {
    if (confirmRemoveId == null) return;
    try {
      setDeletingId(confirmRemoveId);
      // Call parent handler - may be sync or async. If it returns a promise, await it.
      // onRemoveGoal might be sync or return a Promise; coerce to any for runtime check
      const maybePromise: any = (onRemoveGoal as any)(confirmRemoveId);
      if (maybePromise && typeof maybePromise.then === "function") {
        await maybePromise;
      }
    } catch (e) {
      // Log so we don't swallow silently and to satisfy linters
      // Parent is still expected to show user-facing errors/toasts
      // eslint-disable-next-line no-console
      console.error("Error removing goal:", e);
    } finally {
      setDeletingId(null);
      closeConfirmRemove();
    }
  };

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
              variant={BUTTON_STYLES.CREATE.variant}
              size={BUTTON_STYLES.CREATE.size}
              onClick={onAddGoal}
              disabled={!canAddGoals}
              data-testid="add-goal-toolbar"
              aria-label="Add goal"
              title={addGoalDisabledReason}
            >
              <Plus className={ICON_SIZES.DEFAULT} />
              <span className="ml-2">Add Manually</span>
            </Button>
            <Button
              variant={BUTTON_STYLES.VIEW.variant}
              size={BUTTON_STYLES.VIEW.size}
              onClick={onImportFromTemplate}
              disabled={!canAddGoals}
              aria-label="Import from templates"
              data-testid="import-templates-toolbar"
              title={addGoalDisabledReason}
            >
              <FolderOpen className={`${ICON_SIZES.DEFAULT} text-icon`} />
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
            {/* Confirm Delete Dialog for selected goal */}
            <Dialog
              open={confirmRemoveId !== null}
              onOpenChange={(open) => {
                if (!open) closeConfirmRemove();
              }}
            >
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Delete goal?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently remove
                    the goal "
                    {
                      goals.find((g) => g.goal.goal_id === confirmRemoveId)
                        ?.goal.goal_title
                    }
                    ".
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    variant={BUTTON_STYLES.CANCEL_SECONDARY.variant}
                    onClick={closeConfirmRemove}
                    className={`w-full sm:w-auto ${BUTTON_STYLES.CANCEL_SECONDARY.className}`}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmRemove}
                    disabled={deletingId === confirmRemoveId}
                    variant={BUTTON_STYLES.DELETE.variant}
                    className={`w-full sm:w-auto ${BUTTON_STYLES.DELETE.className}`}
                  >
                    {deletingId === confirmRemoveId
                      ? "Deleting…"
                      : "Confirm delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Progress value={totalWeightageUi} />
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-6">
              {goals.map((record) => (
                <Card
                  key={record.goal.goal_id}
                  className="group relative overflow-hidden border shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* reduced padding to make card more compact */}
                  {/* increased min height so cards are taller */}
                  <CardHeader className="h-full p-4 pr-4 flex flex-col min-h-[12rem]">
                    {/* Remove absolute weightage badge; show inline badges next to title */}

                    {/* Header with icon and text */}
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                        <Target className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle
                            className="text-sm font-semibold truncate"
                            title={record.goal.goal_title}
                          >
                            {record.goal.goal_title}
                          </CardTitle>

                          {/* Category badge next to title (support multiple categories) */}
                          {(() => {
                            const cats: any[] =
                              (record.goal as any).categories ??
                              (record.goal.category
                                ? [record.goal.category]
                                : []);
                            if (!cats || cats.length === 0) return null;

                            const MAX_VISIBLE = 1;
                            const visible = cats.slice(0, MAX_VISIBLE);
                            const extra = cats.length - visible.length;

                            return (
                              <div className="flex items-center gap-2 max-w-[40%]">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {visible.map((c: any) => (
                                    <Badge
                                      key={c.id}
                                      variant="outline"
                                      className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border-amber-200"
                                      title={c.name}
                                    >
                                      {c.name}
                                    </Badge>
                                  ))}
                                  {extra > 0 && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Badge
                                          variant="outline"
                                          className="px-2 py-0.5 rounded-full text-[11px] font-medium text-amber-800 border-amber-200"
                                          aria-label={`${extra} more categories`}
                                          title={`${extra} more categories: ${cats
                                            .slice(MAX_VISIBLE)
                                            .map((x: any) => x.name)
                                            .join(", ")}`}
                                        >
                                          +{extra}
                                        </Badge>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent
                                        sideOffset={6}
                                        align="start"
                                        className="w-auto"
                                      >
                                        <div className="flex flex-col gap-1">
                                          <div className="flex flex-wrap gap-2 p-2">
                                            {cats
                                              .slice(MAX_VISIBLE)
                                              .map((c: any) => (
                                                <Badge
                                                  key={c.id}
                                                  variant="outline"
                                                  className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border-amber-200"
                                                >
                                                  {c.name}
                                                </Badge>
                                              ))}
                                          </div>
                                        </div>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Importance badge next to title */}
                          <Badge
                            variant="secondary"
                            className="bg-rose-50 text-rose-700 border-rose-200 font-semibold text-xs flex items-center gap-1"
                          >
                            <Flag className="h-3 w-3" />
                            {record.goal.goal_importance}
                          </Badge>

                          {/* Weightage badge next to title */}
                          <Badge
                            variant="default"
                            className="text-xs bg-purple-50 text-purple-700 border-purple-200 flex-shrink-0 flex items-center gap-1"
                          >
                            <Weight className="h-3 w-3 mr-1" />
                            {record.goal.goal_weightage}%
                          </Badge>
                        </div>

                        {record.goal.goal_description && (
                          <CardDescription
                            className="text-xs text-muted-foreground leading-snug mt-1 max-h-[6.75rem] overflow-y-auto pr-3 scrollbar-y break-words whitespace-normal overflow-x-hidden"
                            title={record.goal.goal_description}
                            style={{ WebkitOverflowScrolling: "touch" }}
                          >
                            {record.goal.goal_description}
                          </CardDescription>
                        )}
                      </div>
                    </div>

                    {/* Spacer to push meta to bottom */}
                    <div className="flex-1" />

                    {/* Spacer preserved to keep card layout consistent */}
                    <div className="pt-2 mt-auto" />

                    {/* Action buttons bottom-right (show on hover on larger screens) */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-2">
                      <Button
                        variant={BUTTON_STYLES.EDITGOALSECTION.variant}
                        size={BUTTON_STYLES.EDITGOALSECTION.size}
                        disabled={isLocked}
                        onClick={() => onEditGoal(record)}
                        aria-label="Edit goal"
                        title="Edit goal"
                      >
                        <Pencil className={`${ICON_SIZES.DEFAULT} text-icon`} />
                      </Button>
                      <Button
                        variant={BUTTON_STYLES.DELETE.variant}
                        size={BUTTON_STYLES.EDITGOALSECTION.size}
                        disabled={isLocked}
                        onClick={() => openConfirmRemove(record.goal.goal_id)}
                        aria-label="Remove goal"
                        title="Remove goal"
                      >
                        <Trash2 className={ICON_SIZES.DEFAULT} />
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};
