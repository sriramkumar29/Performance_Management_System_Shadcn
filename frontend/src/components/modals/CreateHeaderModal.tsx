import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";
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
import { X, Save, FolderPlus } from "lucide-react";
import { BUTTON_STYLES, ICON_SIZES } from "../../constants/buttonStyles";
import { apiFetch } from "../../utils/api";
import { useAuth } from "../../contexts/AuthContext";
import { isLeadOrAbove } from "../../utils/roleHelpers";
import { createTemplateHeader } from "../../api/goalTemplateHeaders";
import type { Role, GoalTemplateType } from "../../types/goalTemplateHeader";

interface CreateHeaderModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  // Optional: parent can provide roles to avoid an extra network request
  rolesFromParent?: Role[];
}

interface Employee {
  emp_id: number;
  first_name?: string;
  last_name?: string;
  emp_name?: string;
}

const CreateHeaderModal = ({
  open,
  onClose,
  onSuccess,
  rolesFromParent,
}: CreateHeaderModalProps) => {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [formData, setFormData] = useState({
    role_id: "",
    title: "",
    description: "",
    goal_template_type: "Organization" as GoalTemplateType,
    shared_users_id: [] as number[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      // If parent provided roles, use them to avoid an extra fetch.
      if (rolesFromParent && rolesFromParent.length > 0) {
        setRoles(rolesFromParent);
      } else {
        loadRoles();
      }
      // Load employees for sharing
      loadEmployees();
      // Reset form when opening
      setFormData({
        role_id: "",
        title: "",
        description: "",
        goal_template_type: "Organization",
        shared_users_id: [],
      });
      setErrors({});
      // No manual click-outside handling required; Radix Select handles portal
      // open/close behavior. Cleanup is a no-op here.
      return;
    }
  }, [open]);

  const loadRoles = async () => {
    try {
      // Use explicit api path to avoid ambiguity in URL building
      const result = await apiFetch<Role[]>("/api/roles/");
      if (result.ok && result.data) {
        setRoles(result.data);
      }
    } catch (error) {
      console.error("Failed to load roles:", error);
      toast.error("Failed to load roles");
    }
  };

  const loadEmployees = async () => {
    try {
      const result = await apiFetch<Employee[]>("/api/employees/");
      if (result.ok && result.data) {
        // Exclude current logged-in user and show only lead-or-above
        const filtered = result.data.filter((e) => {
          if (user && e.emp_id === user.emp_id) return false;
          const roleObj = (e as any).role || (e as any).role_info || null;
          const roleId = roleObj?.id ?? roleObj?.role_id ?? (e as any).role_id;
          const roleName = roleObj?.role_name ?? (e as any).role_name ?? "";
          if (roleId) return isLeadOrAbove(Number(roleId), roleName);
          return isLeadOrAbove(undefined, roleName);
        });
        setEmployees(filtered);
      }
    } catch (error) {
      console.error("Failed to load employees:", error);
      toast.error("Failed to load employees");
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.role_id) {
      newErrors.role_id = "Role is required";
    }

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.trim().length < 3) {
      newErrors.title = "Title must be at least 3 characters";
    } else if (formData.title.trim().length > 255) {
      newErrors.title = "Title must be less than 255 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload: any = {
        role_id: Number(formData.role_id),
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        goal_template_type: formData.goal_template_type,
      };

      // Only include shared_users_id if type is Self and users are selected
      if (
        formData.goal_template_type === "Self" &&
        formData.shared_users_id.length > 0
      ) {
        payload.shared_users_id = formData.shared_users_id;
        payload.is_shared = true;
      }

      const result = await createTemplateHeader(payload);

      if (result.ok) {
        toast.success("Header created successfully", {
          description: `Created "${formData.title}" for ${
            roles.find((r) => r.id === Number(formData.role_id))?.role_name
          }`,
        });
        onSuccess();
        onClose();
      } else {
        toast.error("Failed to create header", {
          description: result.error || "Please try again",
        });
      }
    } catch (error: any) {
      console.error("Failed to create header:", error);
      toast.error("Failed to create header", {
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0">
              <FolderPlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                Create Goal Template Header
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Create a new header to group goal templates by role
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm font-medium">
              Role <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.role_id}
              onValueChange={(value) =>
                setFormData({ ...formData, role_id: value })
              }
              disabled={loading}
            >
              <SelectTrigger
                id="role"
                className={errors.role_id ? "border-destructive" : ""}
              >
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id.toString()}>
                    {role.role_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role_id && (
              <p className="text-xs text-destructive">{errors.role_id}</p>
            )}
          </div>

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

          {/* Goal Template Type */}
          <div className="space-y-2">
            <Label htmlFor="goal_type" className="text-sm font-medium">
              Goal Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.goal_template_type}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  goal_template_type: value as GoalTemplateType,
                  shared_users_id: [],
                })
              }
              disabled={loading}
            >
              <SelectTrigger id="goal_type">
                <SelectValue placeholder="Select goal type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Organization">
                  Organization (Visible to everyone)
                </SelectItem>
                <SelectItem value="Self">Self (Visible only to you)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Organization templates are visible to everyone. Self templates are
              private unless shared.
            </p>
          </div>

          {/* Employees Multi-Select - Only show if type is Self */}
          {formData.goal_template_type === "Self" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Share With Employees (Optional)
              </Label>

              <Select value={""} onValueChange={() => {}}>
                <SelectTrigger id="share_with">
                  <SelectValue
                    placeholder={
                      formData.shared_users_id.length > 0
                        ? `${formData.shared_users_id.length} selected`
                        : "Select employees to share with"
                    }
                  />
                  <div className="ml-2 text-sm text-muted-foreground truncate">
                    {(formData.shared_users_id || [])
                      .map(
                        (id) =>
                          employees.find((e) => e.emp_id === id)?.emp_name ||
                          `${
                            employees.find((e) => e.emp_id === id)
                              ?.first_name || ""
                          } ${
                            employees.find((e) => e.emp_id === id)?.last_name ||
                            ""
                          }`.trim()
                      )
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </SelectTrigger>

                <SelectContent>
                  <div className="p-2">
                    {employees.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Loading employees...
                      </p>
                    ) : (
                      employees.map((emp) => (
                        <label
                          key={emp.emp_id}
                          className="flex items-center gap-2 py-1 px-2 rounded hover:bg-accent/50 cursor-pointer"
                        >
                          <Checkbox
                            id={`emp-${emp.emp_id}`}
                            checked={formData.shared_users_id.includes(
                              emp.emp_id
                            )}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  shared_users_id: [
                                    ...formData.shared_users_id,
                                    emp.emp_id,
                                  ],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  shared_users_id:
                                    formData.shared_users_id.filter(
                                      (id) => id !== emp.emp_id
                                    ),
                                });
                              }
                            }}
                          />
                          <span className="text-sm">
                            {emp.emp_name ??
                              `${emp.first_name || ""} ${
                                emp.last_name || ""
                              }`.trim()}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </SelectContent>
              </Select>

              <p className="text-xs text-muted-foreground">
                Select employees to share this template with. Leave empty to
                keep it private.
              </p>
            </div>
          )}

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
              {loading ? "Creating..." : "Create Header"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateHeaderModal;
