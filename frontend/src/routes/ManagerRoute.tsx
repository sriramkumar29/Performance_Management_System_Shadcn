import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { useEffect } from "react";

const ManagerRoute = () => {
  const { user } = useAuth();

  const isManagerOrAbove = (roles?: string, level?: number | null) => {
    // Prefer explicit role names, fallback to hierarchy level if provided
    if (
      roles &&
      /manager|lead|head|director|vp|chief|cxo|cto|ceo|admin/i.test(roles)
    )
      return true;
    if (typeof level === "number") return level > 2;
    return false;
  };

  const hasManagerAccess = isManagerOrAbove(
    user?.emp_roles,
    user?.emp_roles_level
  );

  useEffect(() => {
    if (!hasManagerAccess) {
      toast.error("You need manager permissions to access this page");
    }
  }, [hasManagerAccess]);

  return hasManagerAccess ? (
    <Outlet />
  ) : (
    <Navigate to="/my-appraisal" replace />
  );
};

export default ManagerRoute;
