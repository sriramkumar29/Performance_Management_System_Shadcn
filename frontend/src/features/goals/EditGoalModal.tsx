import { useState, useEffect } from "react";
import { apiFetch } from "../../utils/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import {
  Select as UiSelect,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../components/ui/select";
import { Edit3, Target, Weight, Save, X } from "lucide-react";
import { toast } from "sonner";
import { BUTTON_STYLES, ICON_SIZES } from "../../constants/buttonStyles";

interface EditGoalModalProps {
  open: boolean;
  onClose: () => void;
  onGoalUpdated: (goal: AppraisalGoal) => void;
  goalData: AppraisalGoal | null;
  remainingWeightage?: number;
}

interface Category {
  id: number;
  name: string;
}

interface AppraisalGoal {
  id: number;
  appraisal_id: number;
  goal_id: number;
  goal: {
    goal_id: number;
    goal_title: string;
    goal_description: string;
    goal_performance_factor: string;
    goal_importance: string;
    goal_weightage: number;
    category_id: number;
    category: Category;
  };
}

interface GoalFormValues {
  goal_title: string;
  goal_description: string;
  goal_performance_factor: string;
  goal_importance: string;
  goal_weightage: number;
  category_ids: number[];
}

const EditGoalModal = ({
  open,
  onClose,
  onGoalUpdated,
  goalData,
  remainingWeightage = 100,
}: EditGoalModalProps) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [formValues, setFormValues] = useState<GoalFormValues>({
    goal_title: "",
    goal_description: "",
    goal_performance_factor: "",
    goal_importance: "",
    goal_weightage: 0,
    category_ids: [],
  });

  // Load categories when modal opens
  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);

  // Prefill form when goalData changes
  useEffect(() => {
    if (open && goalData) {
      // Support multiple shapes: new `category_ids: number[]`,
      // `categories: { id }[]` returned from API, or legacy `category_id`.
      const gd: any = (goalData as any).goal || goalData.goal;
      let existingCategoryIds: number[] = [];

      if (gd) {
        if (Array.isArray(gd.category_ids) && gd.category_ids.length) {
          existingCategoryIds = gd.category_ids as number[];
        } else if (Array.isArray(gd.categories) && gd.categories.length) {
          existingCategoryIds = gd.categories
            .map((c: any) => c?.id ?? c?.category_id)
            .filter(Boolean);
        } else if (gd.category_id) {
          existingCategoryIds = [gd.category_id];
        }
      }

      setFormValues({
        goal_title: gd.goal_title,
        goal_description: gd.goal_description,
        goal_performance_factor: gd.goal_performance_factor,
        goal_importance: gd.goal_importance,
        goal_weightage: gd.goal_weightage,
        category_ids: existingCategoryIds,
      });
    }
  }, [open, goalData]);

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const result = await apiFetch<Category[]>("/api/goals/categories");
      if (result.ok && result.data) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!goalData) {
      toast.error("No goal data available");
      return;
    }

    const values = formValues;

    // Basic validation
    if (
      !values.goal_title ||
      !values.goal_description ||
      !values.goal_performance_factor ||
      !values.goal_importance ||
      !(values.category_ids && values.category_ids.length > 0) ||
      !values.goal_weightage
    ) {
      toast.error("Please complete all fields before submitting");
      return;
    }
    if (values.goal_weightage < 1 || values.goal_weightage > 100) {
      toast.error("Weightage must be between 1 and 100");
      return;
    }
    // Note: we allow setting a goal weight that exceeds the remaining weightage
    // so users can create totals >100%. We still enforce 1-100% per goal.

    setLoading(true);
    try {
      const primaryCategoryId = values.category_ids?.[0];
      const selectedCategories = categories.filter((c) =>
        values.category_ids?.includes(c.id)
      );

      const updatedGoal: AppraisalGoal = {
        ...goalData,
        goal: {
          ...goalData.goal,
          goal_title: values.goal_title,
          goal_description: values.goal_description,
          goal_performance_factor: values.goal_performance_factor,
          goal_importance: values.goal_importance,
          goal_weightage: values.goal_weightage,
          // keep legacy single id for compatibility
          category_id: primaryCategoryId || values.category_ids?.[0] || 0,
          // attach category_ids for new API consumers
          ...(values.category_ids ? { category_ids: values.category_ids } : {}),
          category:
            categories.find((c) => c.id === primaryCategoryId) ||
            goalData.goal.category,
          // Add categories array for proper display
          ...(selectedCategories.length > 0
            ? { categories: selectedCategories }
            : {}),
        },
      };

      toast.success("Goal updated", {
        description: "Will be saved on submit.",
      });
      onGoalUpdated(updatedGoal);
      handleCancel();
    } catch (error: any) {
      toast.error(error.message || "Failed to update goal");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormValues({
      goal_title: "",
      goal_description: "",
      goal_performance_factor: "",
      goal_importance: "",
      goal_weightage: 0,
      category_ids: [],
    });
    onClose();
  };

  const maxWeightage = remainingWeightage;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleCancel();
      }}
    >
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[85vh] sm:max-h-[90vh] overflow-auto nice-scrollbar p-4 sm:p-6">
        <DialogHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Edit3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-semibold text-foreground">
                Edit Goal
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Update the performance goal details
              </p>
            </div>
            <div className="text-xs text-muted-foreground ml-auto">
              Remaining: <span className="font-medium">{maxWeightage}%</span>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="goal_title"
                  className="text-sm font-medium text-foreground flex items-center gap-2"
                >
                  <Target className="h-4 w-4 text-primary" />
                  Goal Title
                </Label>
                <Input
                  id="goal_title"
                  placeholder="Enter a clear, specific goal title"
                  value={formValues.goal_title}
                  onChange={(e) =>
                    setFormValues((v) => ({ ...v, goal_title: e.target.value }))
                  }
                  className="h-11 focus:ring-2 focus:ring-primary/20 border-border/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="goal_description"
                  className="text-sm font-medium text-foreground"
                >
                  Goal Description
                </Label>
                <Textarea
                  id="goal_description"
                  rows={4}
                  placeholder="Provide a detailed description of what needs to be achieved..."
                  value={formValues.goal_description}
                  onChange={(e) =>
                    setFormValues((v) => ({
                      ...v,
                      goal_description: e.target.value,
                    }))
                  }
                  className="resize-none focus:ring-2 focus:ring-primary/20 border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="goal_performance_factor"
                  className="text-sm font-medium text-foreground"
                >
                  Performance Factors
                </Label>
                <Textarea
                  id="goal_performance_factor"
                  rows={3}
                  placeholder="Describe how performance will be measured and evaluated..."
                  value={formValues.goal_performance_factor}
                  onChange={(e) =>
                    setFormValues((v) => ({
                      ...v,
                      goal_performance_factor: e.target.value,
                    }))
                  }
                  className="resize-none focus:ring-2 focus:ring-primary/20 border-border/50"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="goal_importance"
                    className="text-sm font-medium text-foreground"
                  >
                    Importance Level
                  </Label>
                  <UiSelect
                    value={formValues.goal_importance}
                    onValueChange={(value) =>
                      setFormValues((v) => ({ ...v, goal_importance: value }))
                    }
                  >
                    <SelectTrigger className="h-11 focus:ring-2 focus:ring-primary/20 border-border/50">
                      <SelectValue placeholder="Select importance level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">🔴 High Priority</SelectItem>
                      <SelectItem value="Medium">🟡 Medium Priority</SelectItem>
                      <SelectItem value="Low">🟢 Low Priority</SelectItem>
                    </SelectContent>
                  </UiSelect>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="category_ids"
                    className="text-sm font-medium text-foreground"
                  >
                    Categories
                  </Label>
                  <UiSelect value={""} onValueChange={() => {}}>
                    <SelectTrigger className="h-11 focus:ring-2 focus:ring-primary/20 border-border/50">
                      <SelectValue
                        placeholder={
                          loadingCategories ? "Loading..." : "Select categories"
                        }
                      />
                      <div className="ml-2 text-sm text-muted-foreground truncate">
                        {(formValues.category_ids || [])
                          .map(
                            (id) => categories.find((c) => c.id === id)?.name
                          )
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        {categories.map((cat) => (
                          <label
                            key={cat.id}
                            className="flex items-center gap-2 p-2 rounded hover:bg-muted"
                          >
                            <input
                              type="checkbox"
                              checked={formValues.category_ids.includes(cat.id)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setFormValues((v) => {
                                  const ids = new Set(v.category_ids || []);
                                  if (checked) ids.add(cat.id);
                                  else ids.delete(cat.id);
                                  return {
                                    ...v,
                                    category_ids: Array.from(ids),
                                  };
                                });
                              }}
                            />
                            <span>{cat.name}</span>
                          </label>
                        ))}
                      </div>
                    </SelectContent>
                  </UiSelect>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="goal_weightage"
                  className="text-sm font-medium text-foreground flex items-center gap-2"
                >
                  <Weight className="h-4 w-4 text-amber-500" />
                  Weightage (%)
                </Label>
                <Input
                  id="goal_weightage"
                  type="number"
                  min="1"
                  max={100}
                  placeholder="Enter weightage percentage (1-100)"
                  value={formValues.goal_weightage || ""}
                  onChange={(e) =>
                    setFormValues((v) => ({
                      ...v,
                      goal_weightage: Number.parseInt(e.target.value) || 0,
                    }))
                  }
                  className="h-11 focus:ring-2 focus:ring-primary/20 border-border/50"
                  required
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Remaining weightage after this change:{" "}
                    <span
                      className={`font-medium ${
                        maxWeightage - (formValues.goal_weightage || 0) < 0
                          ? "text-amber-600"
                          : "text-foreground"
                      }`}
                    >
                      {Math.max(
                        0,
                        maxWeightage - (formValues.goal_weightage || 0)
                      )}
                      %
                    </span>
                  </span>
                  {maxWeightage - (formValues.goal_weightage || 0) < 0 && (
                    <span className="text-amber-600 font-medium">
                      Total will exceed 100%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button
              type="button"
              variant={BUTTON_STYLES.CANCEL.variant}
              onClick={handleCancel}
              disabled={loading}
              className="w-full sm:w-auto"
              title="Cancel"
              aria-label="Cancel"
            >
              <X className={`hidden sm:inline ${ICON_SIZES.DEFAULT} sm:mr-2`} />
              <span className="sm:ml-2">Cancel</span>
            </Button>
            <Button
              type="submit"
              variant={BUTTON_STYLES.SUBMIT.variant}
              disabled={loading}
              className={`w-full sm:w-auto ${BUTTON_STYLES.SUBMIT.className}`}
              title="Update goal"
              aria-label="Update goal"
            >
              <Save
                className={`hidden sm:inline ${ICON_SIZES.DEFAULT} sm:mr-2`}
              />
              <span className="sm:ml-2">Update Goal</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditGoalModal;
