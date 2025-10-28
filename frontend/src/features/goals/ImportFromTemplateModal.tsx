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
import { X, Download, Weight, Flag, Tag } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { BUTTON_STYLES, ICON_SIZES } from "../../constants/buttonStyles";

interface ImportFromTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onGoalAdded: (goal: AppraisalGoal) => void;
  onGoalsAdded?: (goals: AppraisalGoal[]) => void;
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

const ImportFromTemplateModal = ({
  open,
  onClose,
  onGoalAdded,
  onGoalsAdded,
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
      // clear previous selection when opening
      setSelected({});
      void loadTemplates();
    } else {
      // also clear when modal closes
      setSelected({});
    }
  }, [open]);

  const closeAndReset = () => {
    setSelected({});
    onClose();
  };

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
      const pseudos: AppraisalGoal[] = [];
      for (const t of chosen) {
        const userWeightage = selected[t.temp_id]?.weightage || 0;

        // Use all categories present on the template. If a user specifically
        // selected a single category (legacy behaviour), respect it; otherwise
        // import the full set of template categories.
        const selectedEntry = selected[t.temp_id];
        const allTemplateCategoryIds = t.categories?.map((c) => c.id) ?? [];
        const categoryIds: number[] =
          selectedEntry && selectedEntry.categoryId
            ? [selectedEntry.categoryId]
            : allTemplateCategoryIds;

        if (!categoryIds.length) {
          toast.error("Category required", {
            description: `Template "${t.temp_title}" has no category. Please assign one.`,
          });
          continue;
        }

        // Build pseudo AppraisalGoal with user-specified weightage
        const tempId = Date.now() + Math.floor(Math.random() * 1000);
        const categoriesForPseudo = t.categories?.filter((c) =>
          categoryIds.includes(c.id)
        );
        const firstCategory = categoriesForPseudo?.[0];

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
            // legacy single category field: set to first category id for compatibility
            category_id: firstCategory ? firstCategory.id : categoryIds[0],
            category: firstCategory
              ? { id: firstCategory.id, name: firstCategory.name }
              : ({ id: categoryIds[0], name: "" } as any),
          },
        };
        // Attach new multi-category shape for compatibility with updated UI
        (pseudo as any).goal.category_ids = categoryIds;
        (pseudo as any).goal.categories =
          categoriesForPseudo && categoriesForPseudo.length
            ? categoriesForPseudo.map((c) => ({ id: c.id, name: c.name }))
            : categoryIds.map((id) => ({ id, name: "" }));
        pseudos.push(pseudo);
      }

      // If consumer supports batch add, call it once. Otherwise, fall back to
      // calling the single-goal callback for backward compatibility.
      if (onGoalsAdded) {
        onGoalsAdded(pseudos);
      } else {
        for (const p of pseudos) onGoalAdded(p);
      }

      toast.success("Imported", {
        description: "Templates staged as goals. Save to apply changes.",
      });
      closeAndReset();
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
        if (!o) closeAndReset();
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
              // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events
              <div
                key={t.temp_id}
                data-testid={`template-card-${t.temp_id}`}
                onClick={() =>
                  toggleSelect(t.temp_id, undefined, t.temp_weightage)
                }
                className={`rounded-lg border ${
                  selected[t.temp_id]?.checked
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/50 bg-card/50"
                } p-3 transition-all hover:shadow-sm cursor-pointer`}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <Checkbox
                    data-testid={`template-checkbox-${t.temp_id}`}
                    checked={!!selected[t.temp_id]?.checked}
                    onCheckedChange={() =>
                      toggleSelect(t.temp_id, undefined, t.temp_weightage)
                    }
                    className="mt-1 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-semibold text-sm sm:text-base text-foreground break-words">
                          {t.temp_title}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge
                            variant="secondary"
                            className="bg-rose-100 text-rose-700 border-rose-300 font-semibold text-xs flex items-center gap-1"
                          >
                            <Flag className="h-3 w-3" />
                            {t.temp_importance}
                          </Badge>
                          <Badge
                            variant="default"
                            className="text-xs bg-purple-50 text-purple-700 border-purple-200 flex-shrink-0 flex items-center gap-1"
                          >
                            <Weight className="h-3 w-3 mr-1" />
                            {t.temp_weightage}%
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-3 break-words overflow-y-auto">
                        {t.temp_description}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {t.categories?.map((c) => (
                        <Badge
                          key={c.id}
                          variant="outline"
                          className="bg-amber-50 text-amber-600 border-amber-200 font-semibold text-xs flex items-center gap-1"
                        >
                          <Tag className="h-4 w-4 text-amber-600" />
                          {c.name}
                        </Badge>
                      ))}
                    </div>

                    {selected[t.temp_id]?.checked && (
                      <div className="grid grid-cols-1 gap-3 pt-2 border-t border-border/50">
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
                            data-testid={`weightage-${t.temp_id}`}
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
                            onClick={(e) => e.stopPropagation()}
                            onFocus={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
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
            onClick={closeAndReset}
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
