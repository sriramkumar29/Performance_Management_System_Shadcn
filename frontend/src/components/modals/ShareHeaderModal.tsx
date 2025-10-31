import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { toast } from "sonner";
import { X, Save, Share2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { isLeadOrAbove } from "../../utils/roleHelpers";
import { updateTemplateHeader } from "../../api/goalTemplateHeaders";
import { apiFetch } from "../../utils/api";
import type { GoalTemplateHeader } from "../../types/goalTemplateHeader";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  header: GoalTemplateHeader | null;
  onSuccess?: () => void;
}

interface Employee {
  emp_id: number;
  emp_name?: string;
  first_name?: string;
  last_name?: string;
}

const ShareHeaderModal = ({ open, onOpenChange, header, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (open && header) {
      // Coerce IDs to numbers (some backends may return strings)
      setSelected((header.shared_users_id || []).map(Number));
      void loadEmployees();
    }
  }, [open, header]);

  const loadEmployees = async () => {
    try {
      const result = await apiFetch<Employee[]>("/api/employees/");
      if (result.ok && result.data) {
        // Include employees that are lead-or-above OR are already in the header.shared_users_id
        const sharedIds = header?.shared_users_id || [];
        const filtered = result.data.filter((e) => {
          if (user && e.emp_id === user.emp_id) return false;
          // If this employee is already a shared user for this header, include them regardless of role
          if (sharedIds?.includes(e.emp_id)) return true;
          const roleObj = (e as any).role || (e as any).role_info || null;
          const roleId = roleObj?.id ?? roleObj?.role_id ?? (e as any).role_id;
          const roleName = roleObj?.role_name ?? (e as any).role_name ?? "";
          if (roleId) return isLeadOrAbove(Number(roleId), roleName);
          return isLeadOrAbove(undefined, roleName);
        });

        // Sort so already-shared users appear first (helps UX)
        filtered.sort((a, b) => {
          const aShared = sharedIds.includes(a.emp_id) ? 0 : 1;
          const bShared = sharedIds.includes(b.emp_id) ? 0 : 1;
          if (aShared !== bShared) return aShared - bShared;
          return (a.emp_name || "").localeCompare(b.emp_name || "");
        });

        setEmployees(filtered);
      }
    } catch (err) {
      console.error("Failed to load employees for share modal", err);
    }
  };

  const handleToggle = (
    empId: number,
    checked: boolean | "indeterminate" | undefined
  ) => {
    const isChecked = checked === true;
    if (isChecked) {
      setSelected((s) => Array.from(new Set([...s, empId])));
    } else {
      setSelected((s) => s.filter((id) => id !== empId));
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!header) return;
    setLoading(true);
    try {
      const payload: any = {
        shared_users_id: selected,
        is_shared: (selected || []).length > 0,
      };

      const res = await updateTemplateHeader(header.header_id, payload);
      if (res.ok) {
        const userCount = selected.length;
        if (userCount > 0) {
          toast.success(
            `Shared with ${userCount} user${
              userCount > 1 ? "s" : ""
            }. Each will receive their own editable copy.`
          );
        } else {
          toast.success("Sharing removed");
        }
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(res.error || "Failed to update sharing");
      }
    } catch (err: any) {
      console.error("Failed to update header sharing", err);
      toast.error(err?.message || "Failed to update sharing");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) onOpenChange(false);
  };

  if (!header) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0">
              <Share2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                Share Header
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Select employees to share this "{header.title}" header with.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="p-2 border rounded">
              {employees.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Loading employees…
                </p>
              ) : (
                employees.map((emp) => (
                  <label
                    key={emp.emp_id}
                    className="flex items-center gap-2 py-1 px-2 rounded hover:bg-accent/50 cursor-pointer"
                  >
                    <Checkbox
                      id={`share-emp-${emp.emp_id}`}
                      checked={selected.includes(emp.emp_id)}
                      onCheckedChange={(c) => handleToggle(emp.emp_id, c)}
                      disabled={loading}
                    />
                    <span className="text-sm">
                      {emp.emp_name ??
                        `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim()}
                    </span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Only lead and above are available to share with. You can remove
              all selections to un-share.
            </p>
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" variant="default" disabled={loading}>
              <Save className="h-4 w-4" />
              {loading ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ShareHeaderModal;
