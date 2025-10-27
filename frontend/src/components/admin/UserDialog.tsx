import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { api, apiFetch } from "../../utils/api";
import { isManagerOrAbove } from "../../utils/roleHelpers";

interface Role {
  id: number;
  role_name: string;
}

interface Employee {
  emp_id?: number;
  emp_name: string;
  emp_email: string;
  emp_password?: string;
  emp_department?: string;
  role_id: number;
  role?: Role;
  emp_roles_level?: number;
  emp_reporting_manager_id?: number | null;
  emp_status?: boolean;
}

interface UserDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employee?: Employee | null;
}

const UserDialog = ({
  open,
  onClose,
  onSuccess,
  employee,
}: UserDialogProps) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [formData, setFormData] = useState<Employee>({
    emp_name: "",
    emp_email: "",
    emp_password: "",
    emp_department: "",
    role_id: 1, // Default to Employee role
    emp_status: true,
    emp_reporting_manager_id: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch available roles
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const res = await apiFetch<Role[]>("/roles/");
        if (res.ok && res.data) {
          setRoles(res.data);
        }
      } catch (err) {
        console.error("Failed to load roles:", err);
      }
    };
    if (open) {
      loadRoles();

      // load managers for reporting manager dropdown
      (async () => {
        try {
          // Use the backend's dedicated managers endpoint. buildApiUrl will
          // prefix with /api so this becomes /api/employees/managers
          const mgrRes = await apiFetch<Employee[]>("/employees/managers");
          if (mgrRes.ok && mgrRes.data) {
            // The endpoint already returns manager-capable employees, but
            // keep an extra guard using the role helper in case of differences.
            const list = mgrRes.data.filter((m) =>
              isManagerOrAbove((m as any).role_id, m.role?.role_name)
            );
            setManagers(list);
          }
        } catch (err) {
          console.error("Failed to load managers:", err);
        }
      })();
    }
  }, [open]);

  useEffect(() => {
    if (employee) {
      setFormData({
        emp_name: employee.emp_name,
        emp_email: employee.emp_email,
        emp_department: employee.emp_department || "",
        role_id: employee.role_id,
        emp_status: employee.emp_status ?? true,
        emp_reporting_manager_id: employee.emp_reporting_manager_id ?? null,
      });
    } else {
      setFormData({
        emp_name: "",
        emp_email: "",
        emp_password: "",
        emp_department: "",
        role_id: 1, // Default to Employee role
        emp_status: true,
        emp_reporting_manager_id: null,
      });
    }
    setError("");
  }, [employee, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let res;
      if (employee?.emp_id) {
        // Update existing user
        const updateData: any = {
          emp_name: formData.emp_name,
          emp_email: formData.emp_email,
          emp_department: formData.emp_department,
          role_id: formData.role_id,
          emp_reporting_manager_id: formData.emp_reporting_manager_id ?? null,
        };

        res = await api.put(`/employees/${employee.emp_id}`, updateData);
      } else {
        // Create new user
        if (!formData.emp_password) {
          setError("Password is required for new users");
          setLoading(false);
          return;
        }

        // Enforce minimum password length client-side to match backend validation
        if ((formData.emp_password || "").length < 8) {
          setError("Password must be at least 8 characters long");
          setLoading(false);
          return;
        }

        const createData = {
          emp_name: formData.emp_name,
          emp_email: formData.emp_email,
          password: formData.emp_password, // Backend expects 'password', not 'emp_password'
          emp_department: formData.emp_department,
          role_id: formData.role_id,
          emp_status: true,
          emp_reporting_manager_id: formData.emp_reporting_manager_id ?? null, // Optional field
        };

        res = await api.post("/employees/", createData);
      }

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const errMsg =
          (res as any).error ??
          (res.data
            ? (res.data as any).detail ?? JSON.stringify(res.data)
            : `status ${res.status}`);
        setError(errMsg);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {employee ? "Edit User" : "Create New User"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="emp_name">Full Name</Label>
              <Input
                id="emp_name"
                value={formData.emp_name}
                onChange={(e) =>
                  setFormData({ ...formData, emp_name: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="emp_email">Email</Label>
              <Input
                id="emp_email"
                type="email"
                value={formData.emp_email}
                onChange={(e) =>
                  setFormData({ ...formData, emp_email: e.target.value })
                }
                required
              />
            </div>

            {!employee && (
              <div className="grid gap-2">
                <Label htmlFor="emp_password">Password</Label>
                <Input
                  id="emp_password"
                  type="password"
                  value={formData.emp_password}
                  onChange={(e) =>
                    setFormData({ ...formData, emp_password: e.target.value })
                  }
                  required
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="emp_department">Department</Label>
              <Input
                id="emp_department"
                value={formData.emp_department}
                onChange={(e) =>
                  setFormData({ ...formData, emp_department: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role_id">Role</Label>
              <select
                id="role_id"
                className="w-full p-2 rounded border bg-background"
                value={formData.role_id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role_id: Number.parseInt(e.target.value),
                  })
                }
                required
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.role_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="emp_reporting_manager_id">
                Reporting Manager
              </Label>
              <select
                id="emp_reporting_manager_id"
                className="w-full p-2 rounded border bg-background"
                value={formData.emp_reporting_manager_id ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    emp_reporting_manager_id:
                      e.target.value === ""
                        ? null
                        : Number.parseInt(e.target.value),
                  })
                }
              >
                <option value="">-- None --</option>
                {managers.map((m) => (
                  <option key={m.emp_id} value={m.emp_id}>
                    {m.emp_name}
                  </option>
                ))}
              </select>
            </div>

            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : employee ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserDialog;
