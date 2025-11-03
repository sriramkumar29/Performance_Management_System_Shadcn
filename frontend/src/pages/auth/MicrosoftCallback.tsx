/**
 * Microsoft Authentication Callback Page
 *
 * Handles the redirect callback from Microsoft login.
 * Processes the authentication response and exchanges Microsoft tokens
 * for backend JWT tokens.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { useAuth } from "../../contexts/AuthContext";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { Employee } from "../../contexts/AuthContext";

const MicrosoftCallback = () => {
  const navigate = useNavigate();
  const { setUser, setStatus } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      try {
        console.log("[Microsoft Callback] Processing redirect response");

        // Extract tokens from URL hash (backend redirect flow)
        // Format: #access_token=...&refresh_token=...&token_type=bearer
        const hash = window.location.hash.substring(1); // Remove the '#'
        const params = new URLSearchParams(hash);

        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (!accessToken || !refreshToken) {
          throw new Error("No authentication tokens received from backend");
        }

        console.log("[Microsoft Callback] Tokens extracted from URL");

        // Store tokens
        sessionStorage.setItem("auth_token", accessToken);
        sessionStorage.setItem("refresh_token", refreshToken);

        console.log("[Microsoft Callback] Fetching user profile");

        // Fetch user profile
        const userRes = await apiFetch<Employee>("/employees/profile", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!userRes.ok || !userRes.data) {
          throw new Error(userRes.error || "Failed to fetch user profile");
        }

        // Update auth context
        setUser(userRes.data);
        setStatus("succeeded");

        // Also store user in sessionStorage
        sessionStorage.setItem("auth_user", JSON.stringify(userRes.data));

        toast.success("Successfully signed in with Microsoft");

        console.log("[Microsoft Callback] Login successful, redirecting");

        // Redirect to home or intended destination
        const intended = sessionStorage.getItem("intended_destination");
        sessionStorage.removeItem("intended_destination");

        setProcessing(false);

        // Small delay to show success message
        setTimeout(() => {
          navigate(intended || "/", { replace: true });
        }, 500);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Authentication failed";

        console.error("[Microsoft Callback] Error:", errorMessage);

        setError(errorMessage);
        setProcessing(false);
        toast.error(errorMessage);

        // Redirect to login after delay
        setTimeout(() => navigate("/login", { replace: true }), 3000);
      }
    };

    processCallback();
  }, [navigate, setUser, setStatus]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="mx-auto w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">
              Authentication Failed
            </h2>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Redirecting to login page...
          </p>
        </div>
      </div>
    );
  }

  if (!processing && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center animate-pulse">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">
              Sign In Successful!
            </h2>
            <p className="text-muted-foreground">
              Redirecting you to the dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">
            Signing you in...
          </h2>
          <p className="text-muted-foreground">
            Please wait while we complete your authentication
          </p>
        </div>
      </div>
    </div>
  );
};

export default MicrosoftCallback;
