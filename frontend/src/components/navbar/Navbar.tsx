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
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { Button } from "../ui/button"
// Theme toggle re-enabled with dark mode support

 

const Navbar = () => {
  const { user: authUser, logout } = useAuth()
  const navigate = useNavigate()
  const { isDarkMode, toggleTheme } = useTheme()

  const handleSignOut = () => {
    logout()
    navigate('/login', { replace: true })
  }
  return (
    <header className="w-full sticky top-0 z-50 glass-effect border-t-2 border-t-primary shadow-medium">
      <div className="container h-14 sm:h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">PM</span>
          </div>
          <h1 className="text-sm sm:text-lg lg:text-xl font-bold text-foreground hidden sm:block">
            Performance Management
          </h1>
          <h1 className="text-sm font-bold text-foreground sm:hidden">
            PM
          </h1>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            title={isDarkMode ? "Light mode" : "Dark mode"}
            onClick={toggleTheme}
            className="rounded-lg"
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5 text-icon" />
            ) : (
              <Moon className="h-5 w-5 text-icon" />
            )}
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-xl ring-1 ring-border hover:ring-primary/50 hover:bg-primary/5 px-2 py-1.5 transition-all">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {authUser?.emp_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-foreground leading-tight">
                    {authUser?.emp_name?.split(' ')[0] || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground leading-tight">
                    {authUser?.emp_roles || 'Employee'}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 shadow-medium border-0 glass-effect" align="end">
              <DropdownMenuLabel>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                      {authUser?.emp_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground">
                      {authUser?.emp_name || 'Employee'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {authUser?.emp_email || 'employee@company.com'}
                    </p>
                    <p className="text-xs leading-none text-primary font-medium">
                      {authUser?.emp_roles || 'Employee'}
                    </p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
};

export default Navbar;
