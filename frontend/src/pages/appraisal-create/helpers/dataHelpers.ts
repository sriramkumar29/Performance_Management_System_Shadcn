import { apiFetch } from "../../../utils/api";
import { toast } from "sonner";

interface Role {
  id: number;
  role_name: string;
}

interface Employee {
  emp_id: number;
  emp_name: string;
  emp_email: string;
  role_id: number;
  application_role_id?: number;
  role: Role;
}

interface AppraisalType {
  id: number;
  name: string;
  has_range?: boolean;
}

interface AppraisalRange {
  id: number;
  name: string;
}

// Helper function to fetch employees
export const fetchEmployees = async (): Promise<Employee[]> => {
  try {
    const res = await apiFetch<Employee[]>("/api/employees/");
    if (res.ok && res.data) {
      return res.data;
    } else {
      toast.error("Failed to fetch employees", {
        description: res.error || "Please try again.",
      });
      return [];
    }
  } catch {
    toast.error("Failed to fetch employees", {
      description: "Please try again.",
    });
    return [];
  }
};

// Helper function to fetch appraisal types
export const fetchAppraisalTypes = async (): Promise<AppraisalType[]> => {
  try {
    const res = await apiFetch<AppraisalType[]>("/api/appraisal-types/");
    if (res.ok && res.data) {
      return res.data;
    } else {
      toast.error("Failed to fetch appraisal types", {
        description: res.error || "Please try again.",
      });
      return [];
    }
  } catch {
    toast.error("Failed to fetch appraisal types", {
      description: "Please try again.",
    });
    return [];
  }
};

// Helper function to fetch ranges
export const fetchRanges = async (typeId: number): Promise<AppraisalRange[]> => {
  try {
    const res = await apiFetch<AppraisalRange[]>(
      `/api/appraisal-types/ranges?appraisal_type_id=${typeId}`
    );
    if (res.ok && res.data) {
      return res.data;
    } else {
      toast.error("Failed to fetch ranges", {
        description: res.error || "Please try again.",
      });
      return [];
    }
  } catch {
    toast.error("Failed to fetch ranges", {
      description: "Please try again.",
    });
    return [];
  }
};