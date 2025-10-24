import { useAuth } from "../../contexts/AuthContext";
import { useLocation } from "react-router-dom";
import Navbar from "../navbar/Navbar";
import CreateAppraisalButton from "../../features/appraisal/CreateAppraisalButton";
import { Toaster } from "../ui/toaster";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user } = useAuth();
  const location = useLocation();

  const isManagerOrAbove = (roles?: string, level?: number | null) => {
    // Prefer explicit role names, fallback to hierarchy level if provided
    if (
      roles &&
      /manager|lead|head|director|vp|chief|cxo|cto|ceo|admin/i.test(roles)
    )
      return true;
    if (typeof level === "number") return level > 2;
    return false;
  };

  const showTeamTab = isManagerOrAbove(user?.emp_roles, user?.emp_roles_level);

  // Determine the page title based on the current route
  const getPageTitle = () => {
    switch (location.pathname) {
      case "/my-appraisal":
        return "My Appraisal";
      case "/team-appraisal":
        return "Team Appraisal";
      // For root and fallback routes, return empty so no heading is shown
      default:
        return "";
    }
  };

  // Check if we should show the main header (not on auth pages or specific management pages)
  const hideHeaderRoutes = [
    "/login",
    "/goal-templates",
    "/appraisal/create",
    "/self-assessment",
    "/appraiser-evaluation",
    "/reviewer-evaluation",
    "/my-appraisal", // Hide header on My Appraisal page
    "/team-appraisal", // Hide header on Team Appraisal page
  ];

  // Check if current path starts with any hide route or matches edit template pattern
  const shouldHideHeader =
    hideHeaderRoutes.some((route) => location.pathname.startsWith(route)) ||
    /^\/appraisal\/edit\/\d+$/.test(location.pathname) ||
    /^\/appraisal\/\d+$/.test(location.pathname);

  const pageTitle = getPageTitle();
  // Only show main header when not on hidden routes and a title is provided
  const showMainHeader = !shouldHideHeader && !!pageTitle;

  // Only show Create Appraisal button on Team Appraisal page
  const showCreateAppraisalButton = location.pathname === "/team-appraisal";

  return (
    <>
      <Navbar showTeamTab={showTeamTab} />
      <main className="px-3 sm:px-6 py-4 sm:py-6 flex-1 transition-opacity duration-150">
        {showMainHeader && (
          <div className="flex justify-between items-center mb-6 animate-fade-in-up container">
            <h1
              data-testid="page-title"
              className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
            >
              {pageTitle}
            </h1>
            {showCreateAppraisalButton && <CreateAppraisalButton />}
          </div>
        )}

        {/* Let child pages control their own container width so they can match MyAppraisal */}
        <div className="animate-fade-in">{children}</div>
      </main>
      <Toaster />
    </>
  );
};

export default Layout;
