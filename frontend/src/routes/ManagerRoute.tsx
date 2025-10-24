import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { useEffect, useRef } from "react";
import { isManagerOrAbove } from "../utils/roleHelpers";

const ManagerRoute = () => {
  const { user } = useAuth();
  const hasShownToast = useRef(false);

  const hasManagerAccess = isManagerOrAbove(
    user?.role_id,
    user?.role?.role_name
  );

  useEffect(() => {
    if (!hasManagerAccess && !hasShownToast.current) {
      toast.error("You need manager permissions to access this page");
      hasShownToast.current = true;
    }
  }, [hasManagerAccess]);

  return hasManagerAccess ? (
    <Outlet />
  ) : (
    <Navigate to="/my-appraisal" replace />
  );
};

export default ManagerRoute;
