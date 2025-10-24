import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { apiFetch } from "../utils/api";
import { useAuth } from "./AuthContext";

export interface Role {
  id: number;
  role_name: string;
}

export interface Employee {
  emp_id: number;
  emp_name: string;
  emp_email?: string;
  emp_department?: string;
  role_id: number;
  role: Role;
  emp_reporting_manager_id?: number | null;
  emp_status?: boolean;
}

export interface AppraisalType {
  id: number;
  name: string;
  has_range?: boolean;
}

export interface AppraisalTypeRange {
  id: number;
  appraisal_type_id: number;
  range_name: string;
  min_score: number;
  max_score: number;
}

interface DataContextValue {
  employees: Employee[];
  appraisalTypes: AppraisalType[];
  appraisalRanges: AppraisalTypeRange[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, status: authStatus } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [appraisalTypes, setAppraisalTypes] = useState<AppraisalType[]>([]);
  const [appraisalRanges, setAppraisalRanges] = useState<AppraisalTypeRange[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [empRes, typesRes, rangesRes] = await Promise.all([
        apiFetch<Employee[]>("/api/employees/"),
        apiFetch<AppraisalType[]>("/api/appraisal-types/"),
        apiFetch<AppraisalTypeRange[]>("/api/appraisal-types/ranges"),
      ]);

      if (empRes.ok && empRes.data) {
        setEmployees(empRes.data);
      }

      if (typesRes.ok && typesRes.data) {
        setAppraisalTypes(typesRes.data);
      }

      if (rangesRes.ok && rangesRes.data) {
        setAppraisalRanges(rangesRes.data);
      }

      // Set error if any request failed
      if (!empRes.ok || !typesRes.ok || !rangesRes.ok) {
        setError("Failed to load some reference data");
      }
    } catch (err) {
      setError("Failed to load reference data");
      console.error("Data context error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data only when user is authenticated
  useEffect(() => {
    if (authStatus === "succeeded" && user) {
      fetchData();
    } else if (!user) {
      // Clear data when user logs out
      setEmployees([]);
      setAppraisalTypes([]);
      setAppraisalRanges([]);
      setError(null);
    }
  }, [authStatus, user, fetchData]);

  const value = useMemo(
    () => ({
      employees,
      appraisalTypes,
      appraisalRanges,
      loading,
      error,
      refetch: fetchData,
    }),
    [employees, appraisalTypes, appraisalRanges, loading, error, fetchData]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
