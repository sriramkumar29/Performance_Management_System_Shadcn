import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import Navbar from "./Navbar";
import { ThemeProvider } from "../../contexts/ThemeContext";

// Mock the useAuth hook
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));
import { useAuth } from "../../contexts/AuthContext";

// Mock the useTheme hook
vi.mock("../../contexts/ThemeContext", () => {
  return {
    useTheme: vi.fn(() => ({
      isDarkMode: false,
      toggleTheme: vi.fn(),
    })),
    ThemeProvider: (props: any) => props.children,
  };
});

const mockAuthUser = {
  emp_id: 1,
  emp_name: "John Doe",
  emp_email: "john@company.com",
  emp_roles: "Manager",
  emp_roles_level: 5,
  emp_department: "Engineering",
};

const renderNavbar = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <Navbar />
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe("Navbar", () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: mockAuthUser,
      status: "succeeded",
      loginWithCredentials: vi.fn(),
      logout: mockLogout,
    });
  });

  it("should render first name when authenticated", () => {
    renderNavbar();
    expect(screen.getByText("John")).toBeInTheDocument();
  });

  it("should render theme toggle and user info for authenticated user", () => {
    renderNavbar();
    // Theme toggle present with correct aria-label when isDarkMode is false
    expect(
      screen.getByRole("button", { name: /switch to dark mode/i })
    ).toBeInTheDocument();
    // User initials and first name are visible
    expect(screen.getByText("JD")).toBeInTheDocument();
    expect(screen.getByText("John")).toBeInTheDocument();
  });

  it("should display the user's role from auth", () => {
    renderNavbar();
    // Role label appears in the dropdown content area
    expect(screen.getAllByText(/Manager/i)[0]).toBeInTheDocument();
  });

  it("should reflect non-manager role in the UI when user is not a manager", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        ...mockAuthUser,
        emp_roles: "Developer",
        emp_roles_level: 3,
      },
      status: "succeeded",
      loginWithCredentials: vi.fn(),
      logout: mockLogout,
    });

    renderNavbar();
    expect(screen.getAllByText(/Developer/i)[0]).toBeInTheDocument();
  });

  it("should handle logout when 'Sign out' is clicked in the user menu", async () => {
    const user = userEvent.setup();
    renderNavbar();
    // Open the user menu by clicking the avatar/initials button
    const trigger = screen
      .getByText("JD")
      .closest("button") as HTMLButtonElement;
    await user.click(trigger);
    // Click on Sign out (menuitem rendered after opening)
    const signOut = await screen.findByRole("menuitem", { name: /sign out/i });
    await user.click(signOut);
    expect(mockLogout).toHaveBeenCalledOnce();
  });

  it("should show default placeholders when user is not authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      status: "idle",
      loginWithCredentials: vi.fn(),
      logout: mockLogout,
    });

    renderNavbar();
    // Default initial and labels
    expect(screen.getByText("U")).toBeInTheDocument();
    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
  });
});
