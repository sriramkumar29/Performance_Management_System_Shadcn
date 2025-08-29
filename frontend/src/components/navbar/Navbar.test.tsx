import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Navbar from "./Navbar";
import { ThemeProvider } from "../../contexts/ThemeContext";

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: mockUseAuth,
}));

// Mock the useTheme hook
vi.mock("../../contexts/ThemeContext", () => ({
  useTheme: vi.fn(() => ({
    isDarkMode: false,
    toggleTheme: vi.fn(),
  })),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

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
    mockUseAuth.mockReturnValue({
      user: mockAuthUser,
      status: "succeeded",
      loginWithCredentials: vi.fn(),
      logout: mockLogout,
    });
  });

  it("should render user name when authenticated", () => {
    renderNavbar();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("should render navigation links for authenticated user", () => {
    renderNavbar();

    expect(screen.getByText("My Appraisal")).toBeInTheDocument();
  });

  it("should show manager-specific links for manager role", () => {
    renderNavbar();

    // Manager should see Team Appraisal and Goal Templates
    expect(screen.getByText("Team Appraisal")).toBeInTheDocument();
    expect(screen.getByText("Goal Templates")).toBeInTheDocument();
  });

  it("should not show manager links for non-manager roles", () => {
    mockUseAuth.mockReturnValue({
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

    expect(screen.queryByText("Team Appraisal")).not.toBeInTheDocument();
    expect(screen.queryByText("Goal Templates")).not.toBeInTheDocument();
  });

  it("should handle logout when logout button is clicked", () => {
    renderNavbar();

    const logoutButton = screen.getByText("Logout");
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledOnce();
  });

  it("should not render when user is not authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      status: "idle",
      loginWithCredentials: vi.fn(),
      logout: mockLogout,
    });

    renderNavbar();

    expect(screen.queryByText("My Appraisal")).not.toBeInTheDocument();
    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
  });
});
