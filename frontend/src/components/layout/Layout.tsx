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
      case "/":
        return "Performance Management";
      default:
        return "Performance Management";
    }
  };

  // Check if we should show the main header (not on auth pages or specific management pages)
  const hideHeaderRoutes = [
    "/login",
    "/goal-templates",
    "/goal-templates/new",
    "/appraisal/create",
  ];

  // Check if current path starts with any hide route or matches edit template pattern
  const shouldHideHeader =
    hideHeaderRoutes.some((route) => location.pathname.startsWith(route)) ||
    /^\/goal-templates\/\d+\/edit$/.test(location.pathname) ||
    /^\/appraisal\/edit\/\d+$/.test(location.pathname);

  const showMainHeader = !shouldHideHeader;

  // Only show Create Appraisal button on Team Appraisal page
  const showCreateAppraisalButton = location.pathname === "/team-appraisal";

  return (
    <>
      <Navbar showTeamTab={showTeamTab} />
      <main className="px-3 sm:px-6 py-4 sm:py-6">
        <div className="container w-full">
          {showMainHeader && (
            <div className="flex justify-between items-center mb-6">
              <h1
                data-testid="performance-management-title"
                className="text-2xl font-semibold text-foreground"
              >
                {getPageTitle()}
              </h1>
              {showCreateAppraisalButton && <CreateAppraisalButton />}
            </div>
          )}
          {children}
        </div>
      </main>
      <Toaster />
    </>
  );
};

export default Layout;
