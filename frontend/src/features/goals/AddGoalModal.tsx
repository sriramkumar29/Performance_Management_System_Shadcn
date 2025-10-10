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
import { Plus, Target, Weight, X } from "lucide-react";
import { toast } from "sonner";
import { BUTTON_STYLES, ICON_SIZES } from "../../constants/buttonStyles";

interface AddGoalModalProps {
  open: boolean;
  onClose: () => void;
  onGoalAdded: (goal: AppraisalGoal) => void;
  appraisalId?: number;
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
  category_id: number;
}

const AddGoalModal = ({
  open,
  onClose,
  onGoalAdded,
  appraisalId: _appraisalId,
  remainingWeightage = 100,
}: AddGoalModalProps) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [formValues, setFormValues] = useState<GoalFormValues>({
    goal_title: "",
    goal_description: "",
    goal_performance_factor: "",
    goal_importance: "",
    goal_weightage: 0,
    category_id: 0,
  });

  // Load categories when modal opens
  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);

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
    const values = formValues;
    setLoading(true);
    try {
      // Enforce remaining weightage locally
      if (values.goal_weightage > remainingWeightage) {
        throw new Error(`Weightage exceeds remaining ${remainingWeightage}%.`);
      }

      // Basic required checks
      if (
        !values.goal_title ||
        !values.goal_description ||
        !values.goal_performance_factor ||
        !values.goal_importance ||
        !values.category_id ||
        !values.goal_weightage
      ) {
        throw new Error("Please complete all fields before submitting");
      }

      // Always: build a pseudo AppraisalGoal for in-memory staging only.
      // Database insertion will occur on Save/Submit via syncGoalChanges().
      const category = categories.find((c) => c.id === values.category_id);
      const tempId = Date.now();
      const pseudo: AppraisalGoal = {
        id: tempId,
        appraisal_id: 0,
        goal_id: tempId,
        goal: {
          goal_id: tempId,
          goal_title: values.goal_title,
          goal_description: values.goal_description,
          goal_performance_factor: values.goal_performance_factor,
          goal_importance: values.goal_importance,
          goal_weightage: values.goal_weightage,
          category_id: values.category_id,
          category: category
            ? { id: category.id, name: category.name }
            : ({} as any),
        },
      };
      toast.success("Goal added to appraisal", {
        description: "Staged. Save to apply changes.",
      });
      onGoalAdded(pseudo);
      handleCancel();
    } catch (error: any) {
      toast.error(error.message || "Failed to add goal");
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
      category_id: 0,
    });
    onClose();
  };

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
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-semibold text-foreground">
                Add New Goal
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Create a new performance goal for this appraisal
              </p>
            </div>
            <div className="text-xs text-muted-foreground ml-auto">
              Remaining:{" "}
              <span className="font-medium">{remainingWeightage}%</span>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md border p-4 space-y-4">
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
                    <SelectTrigger
                      id="goal_importance"
                      className="h-11 focus:ring-2 focus:ring-primary/20 border-border/50"
                    >
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
                    htmlFor="category_id"
                    className="text-sm font-medium text-foreground"
                  >
                    Category
                  </Label>
                  <UiSelect
                    value={
                      formValues.category_id
                        ? String(formValues.category_id)
                        : ""
                    }
                    onValueChange={(value) =>
                      setFormValues((v) => ({
                        ...v,
                        category_id: Number.parseInt(value) || 0,
                      }))
                    }
                  >
                    <SelectTrigger
                      id="category_id"
                      className="h-11 focus:ring-2 focus:ring-primary/20 border-border/50"
                    >
                      <SelectValue
                        placeholder={
                          loadingCategories ? "Loading..." : "Select category"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
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
                  max={remainingWeightage}
                  placeholder="Enter weightage percentage"
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
                    Remaining weightage:{" "}
                    <span className="font-medium text-foreground">
                      {remainingWeightage}%
                    </span>
                  </span>
                  {remainingWeightage <= 0 && (
                    <span className="text-red-600 font-medium">
                      No weightage remaining
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
              disabled={loading || remainingWeightage <= 0}
              className={`w-full sm:w-auto ${BUTTON_STYLES.SUBMIT.className}`}
              title="Add goal"
              aria-label="Add goal"
            >
              <Plus
                className={`hidden sm:inline ${ICON_SIZES.DEFAULT} sm:mr-2`}
              />
              <span className="sm:ml-2">Add Goal</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddGoalModal;
