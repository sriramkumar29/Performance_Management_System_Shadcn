import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import type { Employee } from "../../contexts/AuthContext";
import { apiFetch } from "../../utils/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Mail, LogIn, Loader2, AlertCircle, Building2 } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const { loginWithCredentials, checkSilentSSO, status, user, setUser, setStatus } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);

  // If already authenticated (session persisted), redirect away from login
  useEffect(() => {
    if (user) {
      navigate("/");
      return;
    }

    // Check for tokens in URL hash (Microsoft callback)
    const hash = window.location.hash.substring(1);
    if (hash) {
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        // Process callback on login page
        console.log("[Login] Tokens detected in hash, showing modal");
        setIsProcessingCallback(true);
        processCallback(accessToken, refreshToken);
        return;
      }
    }

    // Check for OAuth errors in URL (from backend redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");
    const errorDescription = urlParams.get("error_description");

    if (error) {
      console.error("[Login] OAuth error:", error, errorDescription);
      let errorMessage = "Microsoft sign-in failed. Please try again.";

      if (error === "user_not_found") {
        errorMessage = "User not found. Please contact your administrator.";
      } else if (error === "unauthorized") {
        errorMessage = errorDescription || "Unauthorized. Please check your email domain.";
      } else if (errorDescription) {
        errorMessage = errorDescription;
      }

      toast.error(errorMessage);

      // Clean up URL by removing error parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // Only attempt silent SSO if there's a hint that user came from SharePoint/Microsoft 365
    // This prevents the iframe warning when user doesn't have an active Microsoft session
    const ssoEnabled = import.meta.env.VITE_ENABLE_SSO === "true";
    const fromSharePoint = urlParams.get("sso") === "true" ||
                          document.referrer.includes("sharepoint.com") ||
                          document.referrer.includes("office.com");

    if (ssoEnabled && fromSharePoint) {
      console.log("[Login] Detected SharePoint/M365 context, attempting silent SSO");
      checkSilentSSO()
        .then((success) => {
          if (success) {
            toast.success("Signed in automatically");
            navigate("/");
          }
        })
        .catch(() => {
          // Silent SSO failed, show login form
          console.log("[Login] Silent SSO not available");
        });
    }
  }, [user, navigate, checkSilentSSO]);

  const validateEmail = (email: string) => {
    if (!email) return "Please enter your email";

    // Use HTML5 email validation pattern - more robust than simple regex
    const emailPattern =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailPattern.test(email)) {
      return "Please enter a valid email address";
    }

    return null;
  };

  const validatePassword = (password: string) => {
    if (!password) return "Please enter your password";
    if (password.length < 6) return "Password must be at least 6 characters";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    if (emailError || passwordError) {
      setErrors({
        email: emailError ?? undefined,
        password: passwordError ?? undefined,
      });
      return;
    }
    setErrors({});
    try {
      await loginWithCredentials(email, password);
      toast.success("Welcome back!");

      // Fetch the latest profile to determine post-login redirect (ensure role is fresh)
      try {
        const profileRes = await apiFetch(`/employees/profile`);
        if (profileRes.ok && profileRes.data) {
          const roleName = (profileRes.data as any).role?.role_name || "";
          if (/admin/i.test(roleName)) {
            navigate("/admin/users", { replace: true });
            return;
          }
        }
      } catch (e) {
        // ignore and fallback
        console.error("Failed to fetch profile:", e);
      }

      // default redirect
      navigate("/");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Please check your credentials and try again.";
      toast.error(errorMessage);
    }
  };

  const processCallback = async (accessToken: string, refreshToken: string) => {
    try {
      console.log("[Login] Processing Microsoft callback");

      // Store tokens
      sessionStorage.setItem("auth_token", accessToken);
      sessionStorage.setItem("refresh_token", refreshToken);

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

      // Store user in sessionStorage
      sessionStorage.setItem("auth_user", JSON.stringify(userRes.data));

      console.log("[Login] Microsoft login successful");

      // Show success toast
      toast.success("Welcome back!", {
        description: "Successfully signed in with Microsoft",
        duration: 2000,
      });

      // Clean up URL hash
      window.history.replaceState({}, document.title, window.location.pathname);

      // Hide modal
      setIsProcessingCallback(false);

      // Redirect to dashboard
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Authentication failed";
      console.error("[Login] Microsoft callback error:", errorMessage);

      // Show error toast
      toast.error("Sign-in failed", {
        description: errorMessage,
        duration: 4000,
      });

      // Clean up URL hash
      window.history.replaceState({}, document.title, window.location.pathname);

      // Hide modal
      setIsProcessingCallback(false);
    }
  };

  const handleMicrosoftLogin = () => {
    try {
      // Set loading state
      setIsMicrosoftLoading(true);

      // Build Microsoft authorization URL and redirect
      const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
      const tenantId = import.meta.env.VITE_MICROSOFT_TENANT_ID;
      const redirectUri = import.meta.env.VITE_MICROSOFT_REDIRECT_URI;

      // Generate state for CSRF protection
      const state = Math.random().toString(36).substring(7);
      sessionStorage.setItem('oauth_state', state);

      // Build authorization URL
      // Using Microsoft Graph User.Read scope instead of reserved OIDC scopes
      const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
        `client_id=${encodeURIComponent(clientId)}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_mode=query` +
        `&scope=${encodeURIComponent('https://graph.microsoft.com/User.Read')}` +
        `&state=${encodeURIComponent(state)}`;

      // Redirect to Microsoft login
      window.location.href = authUrl;
    } catch (error: unknown) {
      setIsMicrosoftLoading(false);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Microsoft sign-in failed. Please try again.";
      toast.error(errorMessage);
    }
  };

  return (
    <>
      {/* Microsoft Sign-in Loading Modal */}
      {isProcessingCallback && (
        <>
          {/* Modal Backdrop */}
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] animate-in fade-in duration-200" />

          {/* Modal Content */}
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
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
      )}

      <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-fade-in">
        <div className="w-full max-w-md">
        {/* Login Card */}
        <Card className="shadow-soft hover-lift border-0 glass-effect animate-slide-up">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="mx-auto w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-glow">
              <LogIn className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text ">
                Performance Management
              </CardTitle>
              <p className="text-muted-foreground">
                Welcome back! Please sign in to continue
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Microsoft SSO Button */}
            {import.meta.env.VITE_ENABLE_SSO === "true" && (
              <>
                <Button
                  type="button"
                  onClick={handleMicrosoftLogin}
                  disabled={status === "loading" || isMicrosoftLoading}
                  className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-soft"
                >
                  {isMicrosoftLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Connecting to Microsoft...
                    </>
                  ) : (
                    <>
                      <Building2 className="h-5 w-5 mr-2" />
                      Sign in with Microsoft
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with email
                    </span>
                  </div>
                </div>
              </>
            )}

            <form noValidate onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-foreground"
                >
                  Work Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your work email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 text-base focus:ring-2 focus:ring-primary/20 border-border/50"
                    required
                  />
                </div>
                {errors.email && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {errors.email}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 text-base focus:ring-2 focus:ring-primary/20 border-border/50"
                    required
                  />
                </div>
                {errors.password && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {errors.password}
                  </div>
                )}
              </div>
              <Button
                type="submit"
                disabled={status === "loading"}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-soft hover:shadow-glow"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="flex items-center justify-between">
              <div>
                <a
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </a>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  Secure employee portal • Contact IT for access issues
                </p>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
};

export default Login;
