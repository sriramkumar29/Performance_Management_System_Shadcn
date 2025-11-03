import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiFetch } from "../utils/api";
import { onUnauthorized } from "../utils/auth-events";
import { toast } from "../hooks/use-toast";
import {
  attemptSilentSSO,
  loginWithMicrosoftPopup,
  getMicrosoftAccount,
  logoutFromMicrosoft,
} from "../utils/microsoft-auth";
import type { AccountInfo } from "@azure/msal-browser";

export interface Role {
  id: number;
  role_name: string;
}

export interface Employee {
  emp_id: number;
  emp_name: string;
  emp_email: string;
  emp_department?: string;
  role_id: number;
  role: Role;
  emp_reporting_manager_id?: number | null;
  emp_status?: boolean;
}

export interface AuthContextValue {
  user: Employee | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  loginWithMicrosoft: () => Promise<void>;
  checkSilentSSO: () => Promise<boolean>;
  logout: () => void;
  microsoftAccount: AccountInfo | null;
  setUser: (user: Employee | null) => void;
  setStatus: (status: "idle" | "loading" | "succeeded" | "failed") => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Hydrate user from sessionStorage on first render
  const [user, setUser] = useState<Employee | null>(() => {
    try {
      const raw = sessionStorage.getItem("auth_user");
      return raw ? (JSON.parse(raw) as Employee) : null;
    } catch {
      return null;
    }
  });
  const [status, setStatus] = useState<AuthContextValue["status"]>(() =>
    sessionStorage.getItem("auth_user") ? "succeeded" : "idle"
  );

  const [microsoftAccount, setMicrosoftAccount] = useState<AccountInfo | null>(
    () => getMicrosoftAccount()
  );

  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLogoutTimer = () => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  };

  const decodeJwtExp = (token: string): number | null => {
    try {
      const parts = token.split(".");
      if (parts.length < 2) return null;
      const payload = parts[1];
      const base64 = payload.replaceAll("-", "+").replaceAll("_", "/");
      const padded = base64.padEnd(
        base64.length + (4 - (base64.length % 4 || 4)),
        "="
      );
      const json = atob(padded);
      const obj = JSON.parse(json);
      return typeof obj.exp === "number" ? obj.exp : null;
    } catch {
      return null;
    }
  };

  const refreshTokens = async (): Promise<boolean> => {
    const refreshToken = sessionStorage.getItem("refresh_token");
    if (!refreshToken) return false;

    try {
      const refreshRes = await apiFetch<{
        access_token: string;
        refresh_token: string;
      }>("/employees/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
        headers: { "Content-Type": "application/json" },
      });

      if (
        !refreshRes.ok ||
        !refreshRes.data?.access_token ||
        !refreshRes.data?.refresh_token
      ) {
        return false;
      }

      // Update tokens
      sessionStorage.setItem("auth_token", refreshRes.data.access_token);
      sessionStorage.setItem("refresh_token", refreshRes.data.refresh_token);

      // Reschedule auto logout with new token
      scheduleAutoLogout();
      return true;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return false;
    }
  };

  const handleExpired = async (message?: string) => {
    clearLogoutTimer();

    // Try to refresh tokens before logging out
    const refreshSuccess = await refreshTokens();
    if (refreshSuccess) {
      // Token refreshed successfully, no need to logout
      return;
    }

    // Refresh failed, proceed with logout
    toast({
      title: "Session expired",
      description: message || "Your session has expired. Please log in again.",
    });
    logout();
  };

  const scheduleAutoLogout = () => {
    clearLogoutTimer();
    const token = sessionStorage.getItem("auth_token");
    if (!token) return;
    const exp = decodeJwtExp(token);
    if (!exp) return;
    const msLeft = exp * 1000 - Date.now();
    if (msLeft <= 0) {
      handleExpired();
      return;
    }
    // Schedule refresh attempt 2 minutes before token expires
    const refreshTime = Math.max(msLeft - 2 * 60 * 1000, 0);
    logoutTimerRef.current = setTimeout(() => handleExpired(), refreshTime);
  };

  const loginWithCredentials = async (email: string, password: string) => {
    setStatus("loading");
    try {
      const loginRes = await apiFetch<{
        access_token: string;
        refresh_token: string;
      }>("/employees/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        headers: { "Content-Type": "application/json" },
      });
      if (
        !loginRes.ok ||
        !loginRes.data?.access_token ||
        !loginRes.data?.refresh_token
      )
        throw new Error(loginRes.error || "Invalid credentials");

      // Store both tokens
      sessionStorage.setItem("auth_token", loginRes.data.access_token);
      sessionStorage.setItem("refresh_token", loginRes.data.refresh_token);

      // Fetch user profile with token
      const userRes = await apiFetch<Employee>(`/employees/profile`, {
        headers: { Authorization: `Bearer ${loginRes.data.access_token}` },
      });
      if (!userRes.ok || !userRes.data)
        throw new Error(userRes.error || "Could not fetch user");
      setUser(userRes.data);
      setStatus("succeeded");
      scheduleAutoLogout();
    } catch (e) {
      setStatus("failed");
      throw e;
    }
  };

  const loginWithMicrosoft = async () => {
    setStatus("loading");
    try {
      console.log("[Auth] Starting Microsoft login");

      // Popup login
      const msalResponse = await loginWithMicrosoftPopup();

      if (!msalResponse.idToken) {
        throw new Error("No ID token received from Microsoft");
      }

      // Exchange Microsoft ID token for backend JWT
      const backendTokensRes = await apiFetch<{
        access_token: string;
        refresh_token: string;
      }>("/auth/microsoft/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: msalResponse.idToken }),
      });

      if (
        !backendTokensRes.ok ||
        !backendTokensRes.data?.access_token ||
        !backendTokensRes.data?.refresh_token
      ) {
        throw new Error(backendTokensRes.error || "Failed to exchange Microsoft token");
      }

      // Store tokens
      sessionStorage.setItem("auth_token", backendTokensRes.data.access_token);
      sessionStorage.setItem("refresh_token", backendTokensRes.data.refresh_token);

      // Fetch user profile
      const userRes = await apiFetch<Employee>("/employees/profile", {
        headers: { Authorization: `Bearer ${backendTokensRes.data.access_token}` },
      });

      if (!userRes.ok || !userRes.data) {
        throw new Error(userRes.error || "Could not fetch user");
      }

      setUser(userRes.data);
      setMicrosoftAccount(msalResponse.account);
      setStatus("succeeded");
      scheduleAutoLogout();

      console.log("[Auth] Microsoft login successful");
    } catch (e) {
      setStatus("failed");
      console.error("[Auth] Microsoft login failed:", e);
      throw e;
    }
  };

  const checkSilentSSO = async (): Promise<boolean> => {
    try {
      console.log("[Auth] Checking for silent SSO");

      const msalResponse = await attemptSilentSSO();

      if (msalResponse && msalResponse.idToken) {
        setStatus("loading");

        // Exchange for backend JWT
        const backendTokensRes = await apiFetch<{
          access_token: string;
          refresh_token: string;
        }>("/auth/microsoft/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_token: msalResponse.idToken }),
        });

        if (
          !backendTokensRes.ok ||
          !backendTokensRes.data?.access_token ||
          !backendTokensRes.data?.refresh_token
        ) {
          console.log("[Auth] Silent SSO: Failed to exchange token");
          return false;
        }

        sessionStorage.setItem("auth_token", backendTokensRes.data.access_token);
        sessionStorage.setItem("refresh_token", backendTokensRes.data.refresh_token);

        // Fetch user profile
        const userRes = await apiFetch<Employee>("/employees/profile", {
          headers: { Authorization: `Bearer ${backendTokensRes.data.access_token}` },
        });

        if (userRes.ok && userRes.data) {
          setUser(userRes.data);
          setMicrosoftAccount(msalResponse.account);
          setStatus("succeeded");
          scheduleAutoLogout();

          console.log("[Auth] Silent SSO successful");
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("[Auth] Silent SSO check failed:", error);
      return false;
    }
  };

  const logout = () => {
    clearLogoutTimer();
    setUser(null);
    setStatus("idle");
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("refresh_token");

    // Logout from Microsoft if authenticated
    if (microsoftAccount) {
      logoutFromMicrosoft().catch((err) =>
        console.error("[Auth] Microsoft logout failed:", err)
      );
      setMicrosoftAccount(null);
    }
  };

  // Persist user to sessionStorage on changes
  useEffect(() => {
    try {
      if (user) {
        sessionStorage.setItem("auth_user", JSON.stringify(user));
      } else {
        sessionStorage.removeItem("auth_user");
      }
    } catch {
      // no-op
    }
  }, [user]);

  // Subscribe to unauthorized events and schedule auto logout from JWT exp
  useEffect(() => {
    scheduleAutoLogout();
    const off = onUnauthorized(() => {
      // Ignore unauthorized events if no token is present (e.g., login 401)
      if (!sessionStorage.getItem("auth_token")) return;
      handleExpired("You have been signed out. Please log in again.");
    });
    return () => {
      off();
      clearLogoutTimer();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      loginWithCredentials,
      loginWithMicrosoft,
      checkSilentSSO,
      logout,
      microsoftAccount,
      setUser,
      setStatus,
    }),
    [user, status, microsoftAccount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
