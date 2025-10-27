import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../utils/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Lock, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromQuery = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenFromQuery);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>(
    {}
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tokenFromQuery) setToken(tokenFromQuery);
  }, [tokenFromQuery]);

  const validate = () => {
    const errs: { password?: string; confirm?: string } = {};
    if (!password) errs.password = "Please enter a new password";
    if (password && password.length < 8)
      errs.password = "Password must be at least 8 characters";
    if (password !== confirm) errs.confirm = "Passwords do not match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!token) {
      toast.error("Missing or invalid reset token");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ message: string }>("/auth/password/reset", {
        token,
        new_password: password,
      });

      if (res.ok) {
        toast.success(res.data?.message || "Password reset successful");
        navigate("/login", { replace: true });
      } else {
        toast.error(res.error || "Failed to reset password");
      }
    } catch (err: any) {
      toast.error(err?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-fade-in">
      <div className="w-full max-w-md">
        <Card className="shadow-soft hover-lift border-0 glass-effect animate-slide-up">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="mx-auto w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-glow">
              <Lock className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text ">
                Reset password
              </CardTitle>
              <p className="text-muted-foreground">
                Enter your new password below
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form noValidate onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label
                  htmlFor="token"
                  className="text-sm font-medium text-foreground"
                >
                  Reset token
                </Label>
                <Input
                  id="token"
                  placeholder="Paste token or use link"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="h-12 text-base focus:ring-2 focus:ring-primary/20 border-border/50"
                />
              </div>

              <div className="space-y-3">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  New password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 text-base focus:ring-2 focus:ring-primary/20 border-border/50"
                />
                {errors.password && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {errors.password}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label
                  htmlFor="confirm"
                  className="text-sm font-medium text-foreground"
                >
                  Confirm new password
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-12 text-base focus:ring-2 focus:ring-primary/20 border-border/50"
                />
                {errors.confirm && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {errors.confirm}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                    Applying...
                  </>
                ) : (
                  "Reset password"
                )}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                After a successful reset you will be redirected to sign in.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
