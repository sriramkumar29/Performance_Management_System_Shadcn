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
import { X, Download } from "lucide-react";
import {
  Select as UiSelect,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

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
    Record<number, { checked: boolean; categoryId?: number }>
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

  const toggleSelect = (id: number, defaultCategoryId?: number) => {
    setSelected((prev) => {
      const curr = prev[id];
      return {
        ...prev,
        [id]: curr
          ? { ...curr, checked: !curr.checked }
          : { checked: true, categoryId: defaultCategoryId },
      };
    });
  };

  const setCategoryFor = (id: number, categoryId: number) => {
    setSelected((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || { checked: true }), categoryId },
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

    // Running remaining weightage
    let remaining = remainingWeightage;

    setLoading(true);
    try {
      for (const t of chosen) {
        const categoryId =
          selected[t.temp_id]?.categoryId || t.categories?.[0]?.id;
        if (!categoryId) {
          toast.error("Category required", {
            description: `Template "${t.temp_title}" has no category. Please assign one.`,
          });
          continue;
        }

        if (t.temp_weightage > remaining) {
          toast.error("Insufficient remaining weightage", {
            description: `Skipping "${t.temp_title}" (${t.temp_weightage}%)`,
          });
          continue;
        }

        // Always build a pseudo AppraisalGoal for local staging only.
        // Database insertion will occur on Save/Submit via syncGoalChanges().
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
            goal_weightage: t.temp_weightage,
            category_id: categoryId,
            category: category
              ? { id: category.id, name: category.name }
              : ({ id: categoryId, name: "" } as any),
          },
        };
        onGoalAdded(pseudo);

        remaining -= t.temp_weightage;
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
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto nice-scrollbar p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Import Goals from Templates</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label htmlFor="filter">Search</Label>
              <Input
                id="filter"
                placeholder="Filter by title or category"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground self-end mb-2">
              Remaining:{" "}
              <span className="font-medium">{remainingWeightage}%</span>
            </div>
          </div>

          <div className="max-h-64 sm:max-h-80 md:max-h-96 overflow-auto rounded-md border">
            {visible.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground">
                No templates found.
              </div>
            )}
            {visible.map((t) => (
              <div
                key={t.temp_id}
                className="flex items-start gap-3 p-4 border-b last:border-b-0"
              >
                <Checkbox
                  checked={!!selected[t.temp_id]?.checked}
                  onCheckedChange={() =>
                    toggleSelect(t.temp_id, t.categories?.[0]?.id)
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{t.temp_title}</div>
                    <div className="text-xs">
                      Weightage:{" "}
                      <span className="font-semibold">{t.temp_weightage}%</span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {t.temp_description}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {t.categories?.map((c) => (
                      <Badge key={c.id} variant="outline">
                        {c.name}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Assign Category</Label>
                      <UiSelect
                        value={getCategorySelectValue(
                          selected,
                          t.temp_id,
                          t.categories
                        )}
                        onValueChange={(val) =>
                          setCategoryFor(t.temp_id, Number.parseInt(val))
                        }
                        disabled={!selected[t.temp_id]?.checked}
                      >
                        <SelectTrigger>
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
                    <div>
                      <Label className="text-xs">Importance</Label>
                      <Input disabled value={t.temp_importance} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              title="Cancel"
              aria-label="Cancel"
            >
              <span className="hidden sm:inline">Cancel</span>
              <X className="h-4 w-4 sm:ml-2" />
            </Button>
            <Button
              onClick={handleImport}
              disabled={loading}
              title="Import selected templates"
              aria-label="Import selected templates"
            >
              <span className="hidden sm:inline">Import Selected</span>
              <Download className="h-4 w-4 sm:ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportFromTemplateModal;
