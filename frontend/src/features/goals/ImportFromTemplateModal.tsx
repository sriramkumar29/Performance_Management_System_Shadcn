import { useEffect, useState } from "react";
import { apiFetch } from "../../utils/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { X, Download, Weight } from "lucide-react";
import {
  Select as UiSelect,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { BUTTON_STYLES, ICON_SIZES } from "../../constants/buttonStyles";

interface ImportFromTemplateModalProps {
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

interface GoalTemplate {
  temp_id: number;
  temp_title: string;
  temp_description: string;
  temp_performance_factor: string;
  temp_importance: string;
  temp_weightage: number;
  categories: Category[];
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
    category: Category;
  };
}

const getCategorySelectValue = (
  selected: Record<number, { checked: boolean; categoryId?: number }>,
  tempId: number,
  categories?: Category[]
) => {
  if (selected[tempId]?.categoryId) {
    return String(selected[tempId].categoryId);
  }
  if (categories?.[0]?.id) {
    return String(categories[0].id);
  }
  return "";
};

const ImportFromTemplateModal = ({
  open,
  onClose,
  onGoalAdded,
  appraisalId: _appraisalId,
  remainingWeightage = 100,
}: ImportFromTemplateModalProps) => {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<GoalTemplate[]>([]);
  const [selected, setSelected] = useState<
    Record<
      number,
      { checked: boolean; categoryId?: number; weightage?: number }
    >
  >({});
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (open) {
      void loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    try {
      const res = await apiFetch<GoalTemplate[]>("/api/goals/templates");
      if (res.ok && res.data) setTemplates(res.data);
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to load templates";
      console.error("Failed to load templates:", errorMessage);
    }
  };

  const toggleSelect = (
    id: number,
    defaultCategoryId?: number,
    defaultWeightage?: number
  ) => {
    setSelected((prev) => {
      const curr = prev[id];
      return {
        ...prev,
        [id]: curr
          ? { ...curr, checked: !curr.checked }
          : {
              checked: true,
              categoryId: defaultCategoryId,
              weightage: defaultWeightage, // Pre-fill with template's default weightage
            },
      };
    });
  };

  const setCategoryFor = (id: number, categoryId: number) => {
    setSelected((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || { checked: true }), categoryId },
    }));
  };

  const setWeightageFor = (id: number, weightage: number) => {
    setSelected((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || { checked: true }), weightage },
    }));
  };

  const handleImport = async () => {
    const chosen = templates.filter((t) => selected[t.temp_id]?.checked);
    if (!chosen.length) {
      toast.error("No templates selected", {
        description: "Pick at least one template to import.",
      });
      return;
    }

    // Validate all selected templates have weightage
    for (const t of chosen) {
      const weightage = selected[t.temp_id]?.weightage || 0;
      if (!weightage || weightage <= 0) {
        toast.error("Weightage required", {
          description: `Please enter weightage for "${t.temp_title}"`,
        });
        return;
      }
    }

    // Calculate total selected weightage
    const totalSelectedWeightage = chosen.reduce(
      (sum, t) => sum + (selected[t.temp_id]?.weightage || 0),
      0
    );

    if (totalSelectedWeightage > remainingWeightage) {
      toast.error("Total weightage exceeds remaining", {
        description: `Total selected: ${totalSelectedWeightage}%, Remaining: ${remainingWeightage}%`,
      });
      return;
    }

    setLoading(true);
    try {
      for (const t of chosen) {
        const categoryId =
          selected[t.temp_id]?.categoryId || t.categories?.[0]?.id;
        const userWeightage = selected[t.temp_id]?.weightage || 0;

        if (!categoryId) {
          toast.error("Category required", {
            description: `Template "${t.temp_title}" has no category. Please assign one.`,
          });
          continue;
        }

        // Build pseudo AppraisalGoal with user-specified weightage
        const tempId = Date.now() + Math.floor(Math.random() * 1000);
        const category = t.categories?.find((c) => c.id === categoryId);
        const pseudo: AppraisalGoal = {
          id: tempId,
          appraisal_id: 0,
          goal_id: tempId,
          goal: {
            goal_id: tempId,
            goal_template_id: t.temp_id,
            goal_title: t.temp_title,
            goal_description: t.temp_description,
            goal_performance_factor: t.temp_performance_factor,
            goal_importance: t.temp_importance,
            goal_weightage: userWeightage, // Use user-specified weightage
            category_id: categoryId,
            category: category
              ? { id: category.id, name: category.name }
              : ({ id: categoryId, name: "" } as any),
          },
        };
        onGoalAdded(pseudo);
      }

      toast.success("Imported", {
        description: "Templates staged as goals. Save to apply changes.",
      });
      onClose();
    } catch (e: any) {
      toast.error("Import failed", {
        description: e?.message || "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const visible = templates.filter(
    (t) =>
      !filter.trim() ||
      t.temp_title.toLowerCase().includes(filter.toLowerCase()) ||
      t.categories?.some((c) =>
        c.name.toLowerCase().includes(filter.toLowerCase())
      )
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-blue-600 flex-shrink-0">
              <Download className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-semibold text-foreground">
                Import Goals from Templates
              </DialogTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Select templates and assign weightage for each goal
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[150px]">
              <Label
                htmlFor="filter"
                className="text-xs sm:text-sm font-medium text-foreground"
              >
                Search Templates
              </Label>
              <Input
                id="filter"
                placeholder="Filter by title or category..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-10 mt-1 focus:ring-2 focus:ring-primary/20 border-border/50"
              />
            </div>
            <div className="text-xs sm:text-sm rounded-md px-3 py-2 self-end">
              <span className="text-muted-foreground">Remaining: </span>
              <span className="font-semibold text-base sm:text-lg text-primary">
                {remainingWeightage}%
              </span>
            </div>
          </div>

          <div className="space-y-3 rounded-md p-3 bg-card/30">
            {visible.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No templates found matching your search.
              </div>
            )}
            {visible.map((t) => (
              <div
                key={t.temp_id}
                className={`rounded-lg border ${
                  selected[t.temp_id]?.checked
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/50 bg-card/50"
                } p-3 transition-all hover:shadow-sm`}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <Checkbox
                    checked={!!selected[t.temp_id]?.checked}
                    onCheckedChange={() =>
                      toggleSelect(
                        t.temp_id,
                        t.categories?.[0]?.id,
                        t.temp_weightage
                      )
                    }
                    className="mt-1 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm sm:text-base text-foreground break-words">
                        {t.temp_title}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2 break-words">
                        {t.temp_description}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {t.categories?.map((c) => (
                        <Badge key={c.id} variant="outline" className="text-xs">
                          {c.name}
                        </Badge>
                      ))}
                      <Badge variant="secondary" className="text-xs">
                        {t.temp_importance}
                      </Badge>
                      <Badge
                        variant="default"
                        className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                      >
                        <Weight className="h-3 w-3 mr-1" />
                        {t.temp_weightage}%
                      </Badge>
                    </div>

                    {selected[t.temp_id]?.checked && (
                      <div className="grid grid-cols-1 gap-3 pt-2 border-t border-border/50">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-foreground">
                            Assign Category *
                          </Label>
                          <UiSelect
                            value={getCategorySelectValue(
                              selected,
                              t.temp_id,
                              t.categories
                            )}
                            onValueChange={(val) =>
                              setCategoryFor(t.temp_id, Number.parseInt(val))
                            }
                          >
                            <SelectTrigger className="h-10 focus:ring-2 focus:ring-primary/20 border-border/50">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {t.categories?.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </UiSelect>
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor={`weightage-${t.temp_id}`}
                            className="text-xs font-medium text-foreground flex items-center gap-1"
                          >
                            <Weight className="h-3 w-3 text-amber-500" />
                            Weightage (%) *
                            {selected[t.temp_id]?.weightage ===
                              t.temp_weightage && (
                              <span className="text-[10px] text-muted-foreground font-normal ml-1">
                                (default)
                              </span>
                            )}
                          </Label>
                          <Input
                            id={`weightage-${t.temp_id}`}
                            type="number"
                            min="1"
                            max={remainingWeightage}
                            placeholder={`Default: ${t.temp_weightage}%`}
                            value={selected[t.temp_id]?.weightage || ""}
                            onChange={(e) =>
                              setWeightageFor(
                                t.temp_id,
                                Number.parseInt(e.target.value) || 0
                              )
                            }
                            className="h-10 focus:ring-2 focus:ring-primary/20 border-border/50"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t border-border/50 bg-card/30">
          <Button
            variant={BUTTON_STYLES.CANCEL.variant}
            onClick={onClose}
            disabled={loading}
            title="Cancel"
            aria-label="Cancel"
            className="w-full sm:w-auto"
          >
            <X className={`${ICON_SIZES.DEFAULT} sm:mr-2`} />
            <span>Cancel</span>
          </Button>
          <Button
            variant={BUTTON_STYLES.SUBMIT.variant}
            onClick={handleImport}
            disabled={loading}
            className={`w-full sm:w-auto ${BUTTON_STYLES.SUBMIT.className}`}
            title="Import selected templates"
            aria-label="Import selected templates"
          >
            <Download className={`${ICON_SIZES.DEFAULT} sm:mr-2`} />
            <span>Import Selected</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportFromTemplateModal;
