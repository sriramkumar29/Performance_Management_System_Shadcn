import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import AppRouter from "./AppRouter";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { DataProvider } from "./contexts/DataContext";
import { Toaster } from "sonner";

// Only use StrictMode in development to avoid double-rendering in production
const AppWrapper = import.meta.env.DEV ? React.StrictMode : React.Fragment;

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
