import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import AppRouter from "./AppRouter";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { DataProvider } from "./contexts/DataContext";
import { Toaster } from "sonner";
import { MsalProvider } from "@azure/msal-react";
import { msalInstance, initializeMsal } from "./config/msalConfig";

// Only use StrictMode in development to avoid double-rendering in production
const AppWrapper = import.meta.env.DEV ? React.StrictMode : React.Fragment;

// Initialize MSAL before rendering
initializeMsal()
  .then(() => {
    console.log("[Main] MSAL initialized successfully");

    ReactDOM.createRoot(document.getElementById("root")!).render(
      <AppWrapper>
        <MsalProvider instance={msalInstance}>
          <ThemeProvider>
            <AuthProvider>
              <DataProvider>
                <AppRouter />
                <Toaster richColors position="top-right" duration={2000} />
              </DataProvider>
            </AuthProvider>
          </ThemeProvider>
        </MsalProvider>
      </AppWrapper>
    );
  })
  .catch((error) => {
    console.error("[Main] MSAL initialization failed:", error);

    // Render app anyway (SSO won't work but traditional login will)
    ReactDOM.createRoot(document.getElementById("root")!).render(
      <AppWrapper>
        <ThemeProvider>
          <AuthProvider>
            <DataProvider>
              <AppRouter />
              <Toaster richColors position="top-right" duration={2000} />
            </DataProvider>
          </AuthProvider>
        </ThemeProvider>
      </AppWrapper>
    );
  });
