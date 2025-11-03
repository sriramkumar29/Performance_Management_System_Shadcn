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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Employee } from "../../contexts/AuthContext";

const MicrosoftCallback = () => {
  const navigate = useNavigate();
  const { setUser, setStatus } = useAuth();
  const [showModal, setShowModal] = useState(true);

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

        console.log("[Microsoft Callback] Login successful, redirecting");

        // Hide modal and show success toast
        setShowModal(false);
        toast.success("Welcome back!", {
          description: "Successfully signed in with Microsoft",
          duration: 2000,
        });

        // Redirect to home or intended destination
        const intended = sessionStorage.getItem("intended_destination");
        sessionStorage.removeItem("intended_destination");

        navigate(intended || "/", { replace: true });
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Authentication failed";

        console.error("[Microsoft Callback] Error:", errorMessage);

        // Hide modal and show error toast
        setShowModal(false);
        toast.error("Sign-in failed", {
          description: errorMessage,
          duration: 4000,
        });

        // Redirect to login after delay
        setTimeout(() => navigate("/login", { replace: true }), 2000);
      }
    };

    processCallback();
  }, [navigate, setUser, setStatus]);

  // Loading modal popup
  if (!showModal) return null;

  return (
    <>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200" />

      {/* Modal Content */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-background rounded-lg shadow-lg p-8 max-w-sm w-full animate-in zoom-in-95 duration-200">
          <div className="text-center space-y-6">
            {/* Spinner */}
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>

            {/* Text */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Signing you in
              </h3>
              <p className="text-sm text-muted-foreground">
                Please wait while we complete your Microsoft authentication
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MicrosoftCallback;
