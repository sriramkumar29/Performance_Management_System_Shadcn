import { Button } from "../ui/button";

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

const UserCard = ({
  employee,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  employee: Employee;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete?: () => void;
}) => {
  const isAdmin = /admin/i.test(employee.role?.role_name || "");

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-base">
            {employee.emp_name}{" "}
            {isAdmin && (
              <span className="ml-2 text-xs text-primary font-medium">
                (Admin)
              </span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground">{employee.emp_email}</p>
          <p className="text-xs text-muted-foreground mt-1">
            ID: {employee.emp_id}
          </p>
          <p className="text-xs text-muted-foreground">
            Role: {employee.role?.role_name || "N/A"}
          </p>
          <p className="text-xs text-muted-foreground">
            Status: {employee.emp_status ? "Active" : "Deactivated"}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            disabled={isAdmin}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant={employee.emp_status ? "destructive" : "secondary"}
            onClick={onToggleActive}
            disabled={isAdmin}
          >
            {employee.emp_status ? "Deactivate" : "Activate"}
          </Button>
          {onDelete && (
            <Button
              size="sm"
              variant="destructive"
              onClick={onDelete}
              disabled={isAdmin}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserCard;
