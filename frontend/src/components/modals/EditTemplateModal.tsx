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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Edit Template</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading template...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                disabled={saving}
                className="transition-shadow focus:shadow-sm motion-reduce:transition-none"
                aria-describedby="edit-title-help"
                required
              />
              <p
                id="edit-title-help"
                className="mt-1 text-xs text-muted-foreground"
              >
                Give your template a concise, descriptive title.
              </p>
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={tempDescription}
                onChange={(e) => setTempDescription(e.target.value)}
                disabled={saving}
                className="transition-shadow focus:shadow-sm motion-reduce:transition-none"
                aria-describedby="edit-description-help"
              />
              <p
                id="edit-description-help"
                className="mt-1 text-xs text-muted-foreground"
              >
                Optional: add context so appraisers understand the goal's
                intent.
              </p>
            </div>

            <div>
              <Label htmlFor="edit-perf">Performance Factor</Label>
              <Textarea
                id="edit-perf"
                value={tempPerformanceFactor}
                onChange={(e) => setTempPerformanceFactor(e.target.value)}
                disabled={saving}
                className="transition-shadow focus:shadow-sm motion-reduce:transition-none"
                aria-describedby="edit-perf-help"
              />
              <p
                id="edit-perf-help"
                className="mt-1 text-xs text-muted-foreground"
              >
                E.g., Quality, Delivery, Ownership, Collaboration.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-weight">Weightage (%) *</Label>
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
                  className="transition-shadow focus:shadow-sm motion-reduce:transition-none"
                  aria-describedby="edit-weight-help"
                  required
                />
                <p
                  id="edit-weight-help"
                  className="mt-1 text-xs text-muted-foreground"
                >
                  Goal importance from 1-100%.
                </p>
              </div>

              <div>
                <Label htmlFor="edit-importance">Importance</Label>
                <Select
                  value={tempImportance}
                  onValueChange={setTempImportance}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select importance level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">🔴 High Priority</SelectItem>
                    <SelectItem value="Medium">🟡 Medium Priority</SelectItem>
                    <SelectItem value="Low">🟢 Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Categories</Label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Add a category..."
                    disabled={saving}
                    className="flex-1"
                    onKeyPress={(e) => {
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
                        className="flex items-center gap-1"
                      >
                        {cat}
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(cat)}
                          disabled={saving}
                          className="ml-1 hover:text-destructive"
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
                            className="cursor-pointer hover:bg-accent"
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

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
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
