import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { fetchEmployees } from "../appraisal-create/helpers/dataHelpers";
import UserDialog from "../../components/admin/UserDialog";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../utils/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { UserPlus, Edit, RefreshCw } from "lucide-react";

interface Role {
  id: number;
  role_name: string;
}

interface Employee {
  emp_id: number;
  emp_name: string;
  emp_email: string;
  emp_department?: string;
  role_id: number;
  role: Role;
  emp_status?: boolean;
}

const AdminUsers = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "deactivated"
  >("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );

  const loadEmployees = async () => {
    try {
      const data = await fetchEmployees();
      setEmployees(
        data.map((d: any) => ({ ...d, emp_status: d.emp_status ?? true }))
      );
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const roles = useMemo(() => {
    const s = new Set<string>();
    employees.forEach((e) => e.role?.role_name && s.add(e.role.role_name));
    return ["all", ...Array.from(s)];
  }, [employees]);

  const filtered = employees.filter((e) => {
    if (statusFilter === "active" && !e.emp_status) return false;
    if (statusFilter === "deactivated" && e.emp_status) return false;
    if (roleFilter !== "all" && e.role?.role_name !== roleFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      return (
        e.emp_name.toLowerCase().includes(q) ||
        e.emp_email.toLowerCase().includes(q) ||
        String(e.emp_id).includes(q)
      );
    }
    return true;
  });

  const handleReset = () => {
    setQuery("");
    setStatusFilter("all");
    setRoleFilter("all");
  };

  const handleToggleActive = async (emp: Employee) => {
    if (!emp.emp_id) return;

    try {
      const res = await api.put(`/employees/${emp.emp_id}`, {
        emp_status: !emp.emp_status,
      });

      if (res.ok) {
        loadEmployees();
      } else {
        const errMsg =
          (res as any).error ??
          (res.data
            ? (res.data as any).detail ?? JSON.stringify(res.data)
            : `status ${res.status}`);
        alert("Failed to update status: " + errMsg);
      }
    } catch (e: any) {
      alert("Failed to update status: " + e.message);
    }
  };

  const handleEdit = (emp: Employee) => {
    setSelectedEmployee(emp);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedEmployee(null);
    setDialogOpen(true);
  };

  if (!user) return null;

  return (
    <div className="space-y-3 text-foreground">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by name, email or ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="w-44">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as any)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="deactivated">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-44">
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r} value={r}>
                  {r === "all" ? "All Roles" : r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={handleReset}
          title="Reset filters"
          aria-label="Reset filters"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        <Button onClick={handleCreate}>
          <UserPlus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>

      <div className="rounded-md border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground"
                >
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((emp) => {
                const isAdmin = /admin/i.test(emp.role?.role_name || "");
                return (
                  <TableRow
                    key={emp.emp_id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-medium">{emp.emp_id}</TableCell>
                    <TableCell>{emp.emp_name}</TableCell>
                    <TableCell>{emp.emp_email}</TableCell>
                    <TableCell>{emp.emp_department || "—"}</TableCell>
                    <TableCell>{emp.role?.role_name || "—"}</TableCell>
                    <TableCell>{emp.role?.id || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={emp.emp_status ? "default" : "secondary"}>
                        {emp.emp_status ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(emp)}
                          disabled={isAdmin}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={emp.emp_status ? "destructive" : "default"}
                          onClick={() => handleToggleActive(emp)}
                          disabled={isAdmin}
                        >
                          {emp.emp_status ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <UserDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => {
          loadEmployees();
        }}
        employee={selectedEmployee}
      />
    </div>
  );
};

export default AdminUsers;
