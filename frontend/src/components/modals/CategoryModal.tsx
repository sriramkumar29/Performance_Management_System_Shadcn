import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { apiFetch } from "../../utils/api";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { Trash, Plus } from "lucide-react";

interface CategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const CategoryModal = ({
  open,
  onOpenChange,
  onCreated,
}: CategoryModalProps) => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [allCategories, setAllCategories] = useState<
    { id: number; name: string }[]
  >([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const isManagerOrAbove = (roleId?: number, roleName?: string) => {
    // Manager or above (role_id >= 3)
    if (roleId && roleId >= 3) return true;
    if (roleName && /manager|ceo|admin/i.test(roleName)) return true;
    return false;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!isManagerOrAbove(user?.role_id, user?.role?.role_name)) {
      toast.error("You are not authorized to create categories");
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Category name is required");
      return;
    }

    // Prevent duplicate by checking existing categories (case-insensitive)
    const exists = allCategories.some(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      toast.error("Category already exists");
      return;
    }

    try {
      setSaving(true);
      const res = await apiFetch(`/api/goals/categories`, {
        method: "POST",
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error(res.error || "Failed to create category");

      toast.success("Category created");
      setName("");
      // Refresh list
      await loadCategories();
      onCreated?.();
    } catch (err: any) {
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await apiFetch<{ id: number; name: string }[]>(
        "/api/goals/categories"
      );
      if (res.ok && res.data) setAllCategories(res.data);
    } catch (e) {
      console.error("Failed to load categories:", e);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    if (open) loadCategories();
  }, [open]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete category '${name}'? This action cannot be undone.`))
      return;
    try {
      const res = await apiFetch(`/api/goals/categories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(res.error || "Failed to delete category");
      toast.success("Category deleted");
      await loadCategories();
      onCreated?.();
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="flex gap-2 items-center">
            <div className="flex-1">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Communication"
              />
            </div>
            <div className="flex flex-col mt-6">
              <Button
                type="submit"
                disabled={saving}
                aria-label="Create category"
              >
                <Plus className="mr-2 h-4 w-3" />
                {saving ? "Inserting..." : "Add"}
              </Button>
            </div>
          </form>

          <div>
            <Label className="mb-2">Existing Categories</Label>
            <div className="space-y-2 max-h-40 overflow-auto nice-scrollbar">
              {loadingCategories ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : allCategories.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No categories yet
                </div>
              ) : (
                allCategories.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center rounded bg-muted/40 text-muted-foreground">
                        C
                      </div>
                      <div className="text-sm">{c.name}</div>
                    </div>
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(c.id, c.name)}
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryModal;
