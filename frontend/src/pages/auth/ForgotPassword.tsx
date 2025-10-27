import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email) {
      toast.error("Please enter your email");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const res = await api.post<{ message: string }>("/auth/password/forgot", {
        email,
      });
      if (res.ok) {
        toast.success(
          res.data?.message ||
            "If an account with that email exists, a reset link has been sent."
        );
        // Optionally navigate to login after a short delay
        setTimeout(() => navigate("/login"), 1200);
      } else {
        toast.success(
          "If an account with that email exists, a reset link has been sent."
        );
        setTimeout(() => navigate("/login"), 1200);
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
              <Mail className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text ">
                Reset password
              </CardTitle>
              <p className="text-muted-foreground">
                Enter your work email and we'll send a password reset link.
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form noValidate onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-foreground"
                >
                  Work Email Address
                </Label>
                <div className="relative">
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
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                You'll receive an email with instructions if the account exists.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
