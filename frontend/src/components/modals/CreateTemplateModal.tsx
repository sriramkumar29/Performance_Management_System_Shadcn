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
import { X, Weight } from "lucide-react";
import { BUTTON_STYLES } from "../../constants/buttonStyles";
import { isManagerOrAbove } from "../../utils/roleHelpers";

interface CategoryDto {
  id: number;
  name: string;
}

interface CreateTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // onSuccess can accept optional created headerId and roleId so parent can refresh appropriately
  onSuccess?: (
    createdHeaderId?: number | null,
    createdRoleId?: number | null
  ) => void;
  initialRoleId?: number | null;
  initialHeaderId?: number | null;
  // When true, the modal will not POST to the server but instead return the created template object
  // via onLocalCreate. This is used by CreateHeaderWithTemplates to defer server saves until Save.
  localMode?: boolean;
  onLocalCreate?: (template: any) => void;
  // When provided, the modal will operate in edit mode for a local template (no server calls)
  editTemplate?: any;
  onLocalUpdate?: (template: any) => void;
  // Remaining weight allowed for this header (computed by parent). If provided, template weight must be <= remainingWeight.
  remainingWeight?: number;
}

const CreateTemplateModal = ({
  open,
  onOpenChange,
  onSuccess,
  initialRoleId = null,
  initialHeaderId = null,
  localMode = false,
  onLocalCreate,
  editTemplate,
  onLocalUpdate,
  remainingWeight,
}: CreateTemplateModalProps) => {
  const { user } = useAuth();

  const [saving, setSaving] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [tempDescription, setTempDescription] = useState("");
  const [tempPerformanceFactor, setTempPerformanceFactor] = useState("");
  const [tempImportance, setTempImportance] = useState("");
  const [tempWeightage, setTempWeightage] = useState<number | "">("");
  const [categories, setCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryDto[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedHeaderId, setSelectedHeaderId] = useState<number | null>(null);

  // const [newCategory, setNewCategory] = useState("");

  // Use centralized role helper for manager-or-above checks (excludes Admin)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      // If initial ids were provided, pre-select them
      if (initialRoleId) setSelectedRoleId(initialRoleId);
      if (initialHeaderId) setSelectedHeaderId(initialHeaderId);

      // If an editTemplate was provided (local edit), populate fields
      if (editTemplate) {
        setTempTitle(editTemplate.temp_title ?? editTemplate.title ?? "");
        setTempDescription(
          editTemplate.temp_description ?? editTemplate.description ?? ""
        );
        setTempPerformanceFactor(editTemplate.temp_performance_factor ?? "");
        setTempImportance(editTemplate.temp_importance ?? "");
        setTempWeightage(
          editTemplate.temp_weightage ?? editTemplate.weightage ?? ""
        );
        setCategories(
          (editTemplate.categories || []).map((c: any) =>
            typeof c === "string" ? c : c.name
          )
        );
        // try to preselect header/role if present
        if (editTemplate.role_id) setSelectedRoleId(editTemplate.role_id);
        if (editTemplate.header_id) setSelectedHeaderId(editTemplate.header_id);
      }

      // Load categories when modal opens
      const loadData = async () => {
        try {
          const catRes = await apiFetch<CategoryDto[]>("/api/goals/categories");
          if (catRes.ok && catRes.data) setAllCategories(catRes.data);
        } catch (error) {
          console.error("Failed to load data:", error);
        }
      };

      loadData();
    } else {
      // Reset form when modal closes
      setTempTitle("");
      setTempDescription("");
      setTempPerformanceFactor("");
      setTempImportance("");
      setTempWeightage("");
      setCategories([]);
      setSelectedRoleId(null);
      setSelectedHeaderId(null);
      setSaving(false);
    }
  }, [open]);

  // const handleAddCategory = () => {
  //   const trimmed = newCategory.trim();
  //   if (trimmed && !categories.includes(trimmed)) {
  //     setCategories([...categories, trimmed]);
  //     setNewCategory("");
  //   }
  // };

  const handleRemoveCategory = (cat: string) => {
    setCategories(categories.filter((c) => c !== cat));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isManagerOrAbove(user?.role_id, user?.role?.role_name)) {
      toast.error("You are not authorized to create templates");
      return;
    }

    // All fields are required for create when in localMode or server mode
    if (!tempTitle.trim()) {
      toast.error("Template title is required");
      return;
    }
    if (!tempDescription.trim()) {
      toast.error("Template description is required");
      return;
    }
    if (!tempPerformanceFactor.trim()) {
      toast.error("Performance factor is required");
      return;
    }
    if (!tempImportance.trim()) {
      toast.error("Importance is required");
      return;
    }
    const weight = typeof tempWeightage === "number" ? tempWeightage : 0;
    if (weight <= 0 || weight > 100) {
      toast.error("Weightage must be between 1 and 100");
      return;
    }
    // If parent provided a remainingWeight, ensure weight does not exceed it
    if (typeof remainingWeight === "number") {
      if (weight > remainingWeight) {
        toast.error(`Weightage cannot exceed remaining ${remainingWeight}%`);
        return;
      }
    }
    if (!categories || categories.length === 0) {
      toast.error("Select at least one category");
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

      // If localMode is enabled, do not call the API — return the template to the parent
      if (localMode) {
        // If editing an existing local template, call onLocalUpdate
        if (editTemplate && onLocalUpdate) {
          const updated = {
            ...editTemplate,
            temp_title: tempTitle.trim(),
            temp_description: tempDescription.trim(),
            temp_performance_factor: tempPerformanceFactor.trim(),
            temp_importance: tempImportance.trim(),
            temp_weightage: weight,
            categories: categories,
            header_id: selectedHeaderId ?? editTemplate.header_id ?? null,
            role_id: selectedRoleId ?? editTemplate.role_id ?? null,
          };
          onLocalUpdate(updated);
          toast.success("Template updated");
          onOpenChange(false);
          return;
        }

        if (onLocalCreate) {
          const tempObj = {
            // create a unique temporary id (negative timestamp to avoid collisions)
            temp_id: -Date.now(),
            ...payload,
            header_id: selectedHeaderId ?? null,
            role_id: selectedRoleId ?? null,
          };
          onLocalCreate(tempObj);
          toast.success("Goal Added");
          onOpenChange(false);
          return;
        }
      }

      // If user selected an existing header from the UI, include it in the payload
      const payloadWithHeader = selectedHeaderId
        ? { ...payload, header_id: selectedHeaderId }
        : payload;

      const res = await apiFetch(`/api/goals/templates`, {
        method: "POST",
        body: JSON.stringify(payloadWithHeader),
      });

      if (!res.ok)
        throw new Error(res.error || "Failed to create goal template");

      toast.success("Template created successfully");
      // No header creation occurs here (header text inputs removed).
      // Pass null for createdHeaderId, and the selected role for context.
      onSuccess?.(null, selectedRoleId ?? null);
      onOpenChange(false); // Close the modal
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

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
                {editTemplate
                  ? "Edit Goal Template"
                  : "Create New Goal Template"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Create a reusable template for goals. Weightage will be assigned
                when importing into appraisals.
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="title"
                className="text-sm font-medium text-foreground"
              >
                Template Title
              </Label>
              <Input
                id="title"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                disabled={saving}
                placeholder="Enter a descriptive template title"
                className="h-11 focus:ring-2 focus:ring-primary/20 border-border/50"
                aria-describedby="title-help"
                data-testid="template-name"
                required
              />
              <p id="title-help" className="text-xs text-muted-foreground">
                Give your template a concise, descriptive title.
              </p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="description"
                className="text-sm font-medium text-foreground"
              >
                Description
              </Label>
              <Textarea
                id="description"
                value={tempDescription}
                onChange={(e) => setTempDescription(e.target.value)}
                disabled={saving}
                rows={3}
                placeholder="Describe what this template is used for..."
                className="resize-none focus:ring-2 focus:ring-primary/20 border-border/50"
                required
                aria-describedby="description-help"
              />
              <p
                id="description-help"
                className="text-xs text-muted-foreground"
              >
                use this description to add context so users understand the
                template's purpose.
              </p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="perf"
                className="text-sm font-medium text-foreground"
              >
                Performance Factor
              </Label>
              <Textarea
                id="perf"
                value={tempPerformanceFactor}
                onChange={(e) => setTempPerformanceFactor(e.target.value)}
                disabled={saving}
                rows={2}
                placeholder="Describe how performance will be measured..."
                className="resize-none focus:ring-2 focus:ring-primary/20 border-border/50"
                required
                aria-describedby="perf-help"
              />
              <p id="perf-help" className="text-xs text-muted-foreground">
                E.g., Quality, Delivery, Ownership, Collaboration.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="weight"
                    className="text-sm font-medium text-foreground"
                  >
                    Weightage (%)
                  </Label>
                  {typeof remainingWeight === "number" &&
                    (() => {
                      const entered =
                        typeof tempWeightage === "number" ? tempWeightage : 0;
                      const remainingAfter = Math.max(
                        0,
                        remainingWeight - entered
                      );
                      const exceeds = entered > remainingWeight;
                      const pillClass = exceeds
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-blue-50 text-blue-700 border-blue-200";
                      return (
                        <div
                          className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${pillClass}`}
                          title={`Remaining allowed: ${remainingWeight}%`}
                        >
                          <Weight className="h-3 w-3" />
                          <span className="leading-none">
                            {exceeds
                              ? `Exceeds by ${entered - remainingWeight}%`
                              : `${remainingAfter}%`}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">
                            / {remainingWeight}%
                          </span>
                        </div>
                      );
                    })()}
                </div>

                <Input
                  id="weight"
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
                  aria-describedby="weight-help"
                  required
                />
                <p id="weight-help" className="text-xs text-muted-foreground">
                  Default weightage from 1-100%.
                </p>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="importance"
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

            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">
                Categories
              </Label>

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
                  {/* <p className="text-sm text-muted-foreground">
                    Or select from existing categories:
                  </p> */}
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
              {saving ? "Creating..." : "Create Template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTemplateModal;
