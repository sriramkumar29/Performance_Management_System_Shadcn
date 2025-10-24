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
import { api } from "../../utils/api";

interface Employee {
  emp_id?: number;
  emp_name: string;
  emp_email: string;
  emp_password?: string;
  emp_department?: string;
  emp_roles?: string;
  emp_roles_level?: number;
  emp_status?: boolean;
}

interface UserDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employee?: Employee | null;
}

const UserDialog = ({ open, onClose, onSuccess, employee }: UserDialogProps) => {
  const [formData, setFormData] = useState<Employee>({
    emp_name: "",
    emp_email: "",
    emp_password: "",
    emp_department: "",
    emp_roles: "",
    emp_roles_level: 1,
    emp_status: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (employee) {
      setFormData({
        emp_name: employee.emp_name,
        emp_email: employee.emp_email,
        emp_department: employee.emp_department || "",
        emp_roles: employee.emp_roles || "",
        emp_roles_level: employee.emp_roles_level || 1,
        emp_status: employee.emp_status ?? true,
      });
    } else {
      setFormData({
        emp_name: "",
        emp_email: "",
        emp_password: "",
        emp_department: "",
        emp_roles: "",
        emp_roles_level: 1,
        emp_status: true,
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
          emp_roles: formData.emp_roles,
          emp_roles_level: formData.emp_roles_level,
        };

        res = await api.put(`/employees/${employee.emp_id}`, updateData);
      } else {
        // Create new user
        if (!formData.emp_password) {
          setError("Password is required for new users");
          setLoading(false);
          return;
        }

        const createData = {
          emp_name: formData.emp_name,
          emp_email: formData.emp_email,
          password: formData.emp_password, // Backend expects 'password', not 'emp_password'
          emp_department: formData.emp_department,
          emp_roles: formData.emp_roles,
          emp_roles_level: formData.emp_roles_level,
          emp_status: true,
          emp_reporting_manager_id: null, // Optional field
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
              <Label htmlFor="emp_roles">Role</Label>
              <select
                id="emp_roles"
                className="w-full p-2 rounded border"
                value={formData.emp_roles}
                onChange={(e) =>
                  setFormData({ ...formData, emp_roles: e.target.value })
                }
              >
                <option value="">Select Role</option>
                <option value="Employee">Employee</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
                <option value="HR">HR</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="emp_roles_level">Role Level</Label>
              <Input
                id="emp_roles_level"
                type="number"
                min="1"
                max="10"
                value={formData.emp_roles_level}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    emp_roles_level: parseInt(e.target.value),
                  })
                }
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-500 mb-4">{error}</div>
          )}

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
