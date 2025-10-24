import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

const AdminRoute = () => {
  const { user } = useAuth();
  const hasShownToast = useRef(false);

  const isAdmin = (roles?: string) => {
    if (!roles) return false;
    return /admin/i.test(roles);
  };

  const hasAdminAccess = isAdmin(user?.emp_roles);

  useEffect(() => {
    if (!hasAdminAccess && !hasShownToast.current) {
      toast.error("You need admin permissions to access this page");
      hasShownToast.current = true;
    }
  }, [hasAdminAccess]);

  return hasAdminAccess ? <Outlet /> : <Navigate to="/my-appraisal" replace />;
};

export default AdminRoute;
