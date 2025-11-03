import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/layout/Layout";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

const ProtectedRoute = () => {
  const { user, status } = useAuth();
  const [isReady, setIsReady] = useState(false);

  // Add a small delay to ensure smooth transition and prevent flicker
  useEffect(() => {
    if (status === "succeeded" && user) {
      // Small delay to ensure auth state is fully settled
      const timer = setTimeout(() => setIsReady(true), 50);
      return () => clearTimeout(timer);
    } else if (status === "loading") {
      setIsReady(false);
    }
  }, [status, user]);

  // Show loading state while checking authentication
  if (status === "loading" || (status === "succeeded" && user && !isReady)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background animate-fade-in">
        <div className="text-center space-y-4 animate-scale-in">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? (
    <div className="animate-fade-in">
      <Layout>
        <Outlet />
      </Layout>
    </div>
  ) : (
    <Navigate to="/login" replace />
  );
};

export default ProtectedRoute;
