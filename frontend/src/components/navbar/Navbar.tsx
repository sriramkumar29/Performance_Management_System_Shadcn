import { LogOut, Sun, Moon } from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { Button } from "../ui/button";
import { cn } from "../../utils/cn";
import { useMemo } from "react";
// Theme toggle re-enabled with dark mode support

interface NavbarProps {
  showTeamTab?: boolean;
}

const Navbar = ({ showTeamTab = false }: NavbarProps) => {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleTheme } = useTheme();

  // Memoize avatar initials to avoid recalculating on every render
  const avatarInitials = useMemo(() => {
    return (
      authUser?.emp_name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2) || "U"
    );
  }, [authUser?.emp_name]);

  // Memoize first name
  const firstName = useMemo(() => {
    return authUser?.emp_name?.split(" ")[0] || "User";
  }, [authUser?.emp_name]);

  const handleSignOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  // Don't show navigation tabs on login page
  const showNavTabs = !location.pathname.startsWith("/login");

  const isAdminUser = authUser && /admin/i.test(authUser.role?.role_name || "");

  return (
    <header className="w-full sticky top-0 z-50 glass-effect border-t-4 border-t-primary shadow-medium backdrop-blur-xl">
      <div className="container h-16 sm:h-18 flex items-center justify-between px-3 sm:px-4 md:px-6">
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6 min-w-0 flex-1 overflow-hidden">
          <Link
            to="/"
            className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-all duration-300 group flex-shrink-0"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-medium group-hover:shadow-glow transition-all duration-300 group-hover:scale-110">
              <span className="text-primary-foreground font-bold text-base">
                PM
              </span>
            </div>
            <h1 className="text-sm sm:text-lg lg:text-xl font-bold text-foreground hidden sm:block bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Performance Management
            </h1>
            <h1 className="text-sm font-bold text-foreground sm:hidden">
              Performance Management
            </h1>
          </Link>

          {/* Navigation tabs */}
          {showNavTabs && (
            <nav className="flex items-center gap-0.5 sm:gap-1 md:gap-2 overflow-x-auto scrollbar-hide">
              {!isAdminUser && (
                <Link
                  to="/my-appraisal"
                  className={cn(
                    "px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-300 whitespace-nowrap flex-shrink-0",
                    location.pathname === "/my-appraisal" ||
                      location.pathname === "/"
                      ? "bg-primary text-primary-foreground shadow-medium hover:shadow-glow"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:shadow-soft"
                  )}
                >
                  My Appraisal
                </Link>
              )}

              {!isAdminUser && showTeamTab && (
                <Link
                  to="/team-appraisal"
                  className={cn(
                    "px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-300 whitespace-nowrap flex-shrink-0",
                    location.pathname === "/team-appraisal"
                      ? "bg-primary text-primary-foreground shadow-medium hover:shadow-glow"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:shadow-soft"
                  )}
                >
                  Team Appraisal
                </Link>
              )}

              {/* Admin tabs: shown to admin users */}
              {authUser && isAdminUser && (
                <>
                  <Link
                    to="/admin/users"
                    className={cn(
                      "px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-300 whitespace-nowrap flex-shrink-0",
                      location.pathname === "/admin/users"
                        ? "bg-primary text-primary-foreground shadow-medium hover:shadow-glow"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:shadow-soft"
                    )}
                  >
                    User Management
                  </Link>

                  <Link
                    to="/admin/appraisals"
                    className={cn(
                      "px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-300 whitespace-nowrap flex-shrink-0",
                      location.pathname === "/admin/appraisals"
                        ? "bg-primary text-primary-foreground shadow-medium hover:shadow-glow"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:shadow-soft"
                    )}
                  >
                    Appraisal Details
                  </Link>
                </>
              )}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4 flex-shrink-0">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              isDarkMode ? "Switch to light mode" : "Switch to dark mode"
            }
            title={isDarkMode ? "Light mode" : "Dark mode"}
            onClick={toggleTheme}
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-primary/10 hover:shadow-soft transition-all duration-300 flex-shrink-0"
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-icon transition-transform duration-300 hover:rotate-180" />
            ) : (
              <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-icon transition-transform duration-300 hover:-rotate-12" />
            )}
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 sm:gap-2 rounded-xl ring-2 ring-border hover:ring-primary/50 hover:bg-primary/5 px-1.5 sm:px-2 py-1 sm:py-1.5 transition-all duration-300 hover:shadow-soft flex-shrink-0">
                <Avatar className="h-8 w-8 sm:h-9 sm:w-9 ring-2 ring-primary/20 flex-shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs sm:text-sm font-semibold">
                    {avatarInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight truncate max-w-[120px] lg:max-w-[150px]">
                    {firstName}
                  </p>
                  <p className="text-xs text-muted-foreground leading-tight truncate max-w-[120px] lg:max-w-[150px]">
                    {authUser?.role?.role_name || "Employee"}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[280px] sm:w-72 shadow-large border-0 glass-card animate-slide-up"
              align="end"
            >
              <DropdownMenuLabel className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12 ring-2 ring-primary/30 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold text-sm sm:text-base">
                      {avatarInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1 min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-none text-foreground truncate">
                      {authUser?.emp_name || "Employee"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {authUser?.emp_email || "employee@company.com"}
                    </p>
                    <p className="text-xs leading-none text-primary font-semibold truncate">
                      {authUser?.role?.role_name || "Employee"}
                    </p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10 cursor-pointer transition-colors duration-200 mx-2 my-1 rounded-lg"
              >
                <LogOut className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
