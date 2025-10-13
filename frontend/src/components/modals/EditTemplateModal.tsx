import { useState, useEffect } from "react";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { apiFetch } from "../../utils/api";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { X } from "lucide-react";
import { BUTTON_STYLES } from "../../constants/buttonStyles";

interface CategoryDto {
  id: number;
  name: string;
}

interface GoalTemplateDto {
  temp_id: number;
  temp_title: string;
  temp_description: string;
  temp_performance_factor: string;
  temp_importance: string;
  temp_weightage: number;
  categories: CategoryDto[];
}

interface EditTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  templateId: number | null;
}

const EditTemplateModal = ({
  open,
  onOpenChange,
  onSuccess,
  templateId,
}: EditTemplateModalProps) => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [tempDescription, setTempDescription] = useState("");
  const [tempPerformanceFactor, setTempPerformanceFactor] = useState("");
  const [tempImportance, setTempImportance] = useState("");
  const [tempWeightage, setTempWeightage] = useState<number | "">("");
  const [categories, setCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryDto[]>([]);
  const [newCategory, setNewCategory] = useState("");

  const isManagerOrAbove = (roles?: string, level?: number | null) => {
    if (
      roles &&
      /manager|lead|head|director|vp|chief|cxo|cto|ceo|admin/i.test(roles)
    )
      return true;
    if (typeof level === "number") return level > 2;
    return false;
  };

  // Reset and load template data when modal opens/closes
  useEffect(() => {
    if (open && templateId) {
      // Load template data and categories when modal opens
      const loadData = async () => {
        try {
          setLoading(true);

          // Load categories
          const catRes = await apiFetch<CategoryDto[]>("/api/goals/categories");
          if (catRes.ok && catRes.data) setAllCategories(catRes.data);

          // Load template data
          const res = await apiFetch<GoalTemplateDto>(
            `/api/goals/templates/${templateId}`
          );
          if (!res.ok || !res.data) {
            throw new Error(res.error || "Failed to load template");
          }

          const template = res.data;
          setTempTitle(template.temp_title);
          setTempDescription(template.temp_description);
          setTempPerformanceFactor(template.temp_performance_factor);
          setTempImportance(template.temp_importance);
          setTempWeightage(template.temp_weightage);
          setCategories(template.categories?.map((c) => c.name) || []);
        } catch (error: any) {
          toast.error(error?.message || "Failed to load template");
          onOpenChange(false);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    } else if (!open) {
      // Reset form when modal closes
      setTempTitle("");
      setTempDescription("");
      setTempPerformanceFactor("");
      setTempImportance("");
      setTempWeightage("");
      setCategories([]);
      setNewCategory("");
      setSaving(false);
      setLoading(false);
    }
  }, [open, templateId, onOpenChange]);

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories([...categories, trimmed]);
      setNewCategory("");
    }
  };

  const handleRemoveCategory = (cat: string) => {
    setCategories(categories.filter((c) => c !== cat));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isManagerOrAbove(user?.emp_roles, user?.emp_roles_level)) {
      toast.error("You are not authorized to edit templates");
      return;
    }

    if (!templateId) {
      toast.error("Template ID is missing");
      return;
    }

    if (!tempTitle.trim()) {
      toast.error("Template title is required");
      return;
    }

    const weight = typeof tempWeightage === "number" ? tempWeightage : 0;
    if (weight <= 0 || weight > 100) {
      toast.error("Weightage must be between 1 and 100");
      return;
    }

    const payload = {
      temp_title: tempTitle.trim(),
      temp_description: tempDescription.trim(),
      temp_performance_factor: tempPerformanceFactor.trim(),
      temp_importance: tempImportance.trim(),
      temp_weightage: weight,
      categories: categories,
    };

    try {
      setSaving(true);
      const res = await apiFetch(`/api/goals/templates/${templateId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!res.ok)
        throw new Error(res.error || "Failed to update goal template");

      toast.success("Template updated successfully");
      onSuccess(); // Refresh the templates list
      onOpenChange(false); // Close the modal
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!templateId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[85vh] sm:max-h-[90vh] overflow-auto nice-scrollbar p-4 sm:p-6">
        <DialogHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <X className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg sm:text-xl font-semibold text-foreground">
                Edit Goal Template
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Update template details. Weightage is assigned during import.
              </p>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading template...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="edit-title"
                  className="text-sm font-medium text-foreground"
                >
                  Template Title *
                </Label>
                <Input
                  id="edit-title"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  disabled={saving}
                  placeholder="Enter a descriptive template title"
                  className="h-11 focus:ring-2 focus:ring-primary/20 border-border/50"
                  aria-describedby="edit-title-help"
                  required
                />
                <p
                  id="edit-title-help"
                  className="text-xs text-muted-foreground"
                >
                  Give your template a concise, descriptive title.
                </p>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="edit-description"
                  className="text-sm font-medium text-foreground"
                >
                  Description
                </Label>
                <Textarea
                  id="edit-description"
                  value={tempDescription}
                  onChange={(e) => setTempDescription(e.target.value)}
                  disabled={saving}
                  rows={3}
                  placeholder="Describe what this template is used for..."
                  className="resize-none focus:ring-2 focus:ring-primary/20 border-border/50"
                  aria-describedby="edit-description-help"
                />
                <p
                  id="edit-description-help"
                  className="text-xs text-muted-foreground"
                >
                  Optional: add context so users understand the template's
                  purpose.
                </p>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="edit-perf"
                  className="text-sm font-medium text-foreground"
                >
                  Performance Factor
                </Label>
                <Textarea
                  id="edit-perf"
                  value={tempPerformanceFactor}
                  onChange={(e) => setTempPerformanceFactor(e.target.value)}
                  disabled={saving}
                  rows={2}
                  placeholder="Describe how performance will be measured..."
                  className="resize-none focus:ring-2 focus:ring-primary/20 border-border/50"
                  aria-describedby="edit-perf-help"
                />
                <p
                  id="edit-perf-help"
                  className="text-xs text-muted-foreground"
                >
                  E.g., Quality, Delivery, Ownership, Collaboration.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-weight"
                    className="text-sm font-medium text-foreground"
                  >
                    Weightage (%) *
                  </Label>
                  <Input
                    id="edit-weight"
                    type="number"
                    min={1}
                    max={100}
                    value={tempWeightage}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTempWeightage(val === "" ? "" : Number(val));
                    }}
                    disabled={saving}
                    placeholder="Enter weightage"
                    className="h-11 focus:ring-2 focus:ring-primary/20 border-border/50"
                    aria-describedby="edit-weight-help"
                    required
                  />
                  <p
                    id="edit-weight-help"
                    className="text-xs text-muted-foreground"
                  >
                    Default weightage from 1-100%.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="edit-importance"
                    className="text-sm font-medium text-foreground"
                  >
                    Importance Level
                  </Label>
                  <Select
                    value={tempImportance}
                    onValueChange={setTempImportance}
                    disabled={saving}
                  >
                    <SelectTrigger className="h-11 focus:ring-2 focus:ring-primary/20 border-border/50">
                      <SelectValue placeholder="Select importance level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">🔴 High Priority</SelectItem>
                      <SelectItem value="Medium">🟡 Medium Priority</SelectItem>
                      <SelectItem value="Low">🟢 Low Priority</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Priority level for this template.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">
                Categories
              </Label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Add a category..."
                    disabled={saving}
                    className="flex-1 h-11 focus:ring-2 focus:ring-primary/20 border-border/50"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCategory();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleAddCategory}
                    disabled={!newCategory.trim() || saving}
                    variant="outline"
                    className="h-11"
                  >
                    Add
                  </Button>
                </div>

                {categories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <Badge
                        key={cat}
                        variant="secondary"
                        className="flex items-center gap-1 px-3 py-1"
                      >
                        {cat}
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(cat)}
                          disabled={saving}
                          className="ml-1 hover:text-destructive transition-colors"
                          aria-label={`Remove ${cat}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {allCategories.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Or select from existing categories:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {allCategories
                        .filter((cat) => !categories.includes(cat.name))
                        .map((cat) => (
                          <Badge
                            key={cat.id}
                            variant="outline"
                            className="cursor-pointer hover:bg-accent transition-colors px-3 py-1"
                            onClick={() => {
                              if (!categories.includes(cat.name)) {
                                setCategories([...categories, cat.name]);
                              }
                            }}
                          >
                            + {cat.name}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
              <Button
                type="button"
                variant={BUTTON_STYLES.CANCEL.variant}
                onClick={() => onOpenChange(false)}
                disabled={saving}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={BUTTON_STYLES.SUBMIT.variant}
                className={`w-full sm:w-auto ${BUTTON_STYLES.SUBMIT.className}`}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditTemplateModal;
