import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { useEffect, useRef } from "react";
import { isLeadOrAbove } from "../utils/roleHelpers";

const ManagerRoute = () => {
  const { user } = useAuth();
  const hasShownToast = useRef(false);

  const hasLeadAccess = isLeadOrAbove(user?.role_id, user?.role?.role_name);

  useEffect(() => {
    if (!hasLeadAccess && !hasShownToast.current) {
      toast.error("You need Lead or higher permissions to access this page");
      hasShownToast.current = true;
    }
  }, [hasLeadAccess]);

  return hasLeadAccess ? <Outlet /> : <Navigate to="/my-appraisal" replace />;
};

export default ManagerRoute;
