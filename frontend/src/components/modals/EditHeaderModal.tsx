import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { toast } from "sonner";
import { X, Save, Edit } from "lucide-react";
import { BUTTON_STYLES, ICON_SIZES } from "../../constants/buttonStyles";
import { updateTemplateHeader } from "../../api/goalTemplateHeaders";
import { getAllApplicationRoles } from "../../api/applicationRoles";
import type {
  GoalTemplateHeader,
  GoalTemplateType,
} from "../../types/goalTemplateHeader";
import type { ApplicationRole } from "../../types/applicationRole";

interface EditHeaderModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  header: GoalTemplateHeader | null;
}

const EditHeaderModal = ({
  open,
  onClose,
  onSuccess,
  header,
}: EditHeaderModalProps) => {
  const [loading, setLoading] = useState(false);
  const [applicationRoles, setApplicationRoles] = useState<ApplicationRole[]>(
    []
  );
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    application_role_id: undefined as number | undefined,
    goal_template_type: "Organization" as GoalTemplateType,
    shared_users_id: [] as number[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load application roles on mount
  useEffect(() => {
    const loadApplicationRoles = async () => {
      const result = await getAllApplicationRoles();
      if (result.ok && result.data) {
        setApplicationRoles(result.data);
      }
    };
    loadApplicationRoles();
  }, []);

  useEffect(() => {
    if (open && header) {
      console.log("EditHeaderModal - Loading header data:", header);
      setFormData({
        title: header.title,
        description: header.description || "",
        application_role_id: header.application_role_id,
        goal_template_type: header.goal_template_type || "Organization",
        shared_users_id: header.shared_users_id || [],
      });
      setErrors({});
    }
  }, [open, header]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.trim().length < 3) {
      newErrors.title = "Title must be at least 3 characters";
    } else if (formData.title.trim().length > 255) {
      newErrors.title = "Title must be less than 255 characters";
    }

    if (!formData.application_role_id || formData.application_role_id === 0) {
      newErrors.application_role_id = "Application Role is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!header || !validate()) {
      console.log("EditHeaderModal - Validation failed or no header");
      return;
    }

    console.log("EditHeaderModal - Submitting with formData:", formData);

    setLoading(true);
    try {
      const payload: any = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        application_role_id: formData.application_role_id,
        goal_template_type: formData.goal_template_type,
      };

      // Only include shared_users_id if type is Self and users are selected
      if (
        formData.goal_template_type === "Self" &&
        formData.shared_users_id.length > 0
      ) {
        payload.shared_users_id = formData.shared_users_id;
        payload.is_shared = true;
      } else {
        payload.is_shared = false;
        payload.shared_users_id = [];
      }

      // Debug: log payload being sent
      if (import.meta.env.DEV)
        console.debug("Updating header payload:", payload);

      const result = await updateTemplateHeader(header.header_id, payload);

      if (import.meta.env.DEV) console.debug("Update header result:", result);

      if (result.ok) {
        toast.success("Header updated successfully", {
          description: `Updated "${formData.title}"`,
        });
        // notify parent and close modal
        onSuccess();
        onClose();
        // Let the parent handle refreshing (preserve filter/selection)
        // onSuccess was already called above to notify the parent to re-fetch
      } else {
        toast.error("Failed to update header", {
          description: result.error || "Please try again",
        });
      }
    } catch (error: any) {
      console.error("Failed to update header:", error);
      toast.error("Failed to update header", {
        description: error.message || "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!header) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0">
              <Edit className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                Edit Goal Template Header
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Update the header title and description
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Header Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              type="text"
              placeholder="e.g., Software Engineer - Core Competencies"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              disabled={loading}
              className={errors.title ? "border-destructive" : ""}
              maxLength={255}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {formData.title.length}/255 characters
            </p>
          </div>

          {/* Application Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="appRole" className="text-sm font-medium">
              Application Role (Job Position){" "}
              <span className="text-destructive">*</span>
            </Label>
            <Select
              value={
                formData.application_role_id
                  ? formData.application_role_id.toString()
                  : ""
              }
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  application_role_id: Number.parseInt(value),
                })
              }
              disabled={loading}
            >
              <SelectTrigger
                id="appRole"
                className={
                  errors.application_role_id ? "border-destructive" : ""
                }
              >
                <SelectValue placeholder="Select an application role" />
              </SelectTrigger>
              <SelectContent>
                {applicationRoles.map((role) => (
                  <SelectItem
                    key={role.app_role_id}
                    value={role.app_role_id.toString()}
                  >
                    {role.app_role_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.application_role_id && (
              <p className="text-xs text-destructive">
                {errors.application_role_id}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Select the job position this template header is designed for
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Brief description of this template collection"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={loading}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Provide context about what templates are included in this header
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant={BUTTON_STYLES.CANCEL.variant}
              onClick={handleClose}
              disabled={loading}
            >
              <X className={ICON_SIZES.DEFAULT} />
              Cancel
            </Button>
            <Button
              type="submit"
              variant={BUTTON_STYLES.SAVE.variant}
              className={BUTTON_STYLES.SAVE.className}
              disabled={loading}
            >
              <Save className={ICON_SIZES.DEFAULT} />
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditHeaderModal;
