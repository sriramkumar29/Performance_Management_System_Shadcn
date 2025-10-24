import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { useEffect, useRef } from "react";
import { isAdmin } from "../utils/roleHelpers";

const AdminRoute = () => {
  const { user } = useAuth();
  const hasShownToast = useRef(false);

  const hasAdminAccess = isAdmin(user?.role_id, user?.role?.role_name);

  useEffect(() => {
    if (!hasAdminAccess && !hasShownToast.current) {
      toast.error("You need admin permissions to access this page");
      hasShownToast.current = true;
    }
  }, [hasAdminAccess]);

  return hasAdminAccess ? <Outlet /> : <Navigate to="/my-appraisal" replace />;
};

export default AdminRoute;
