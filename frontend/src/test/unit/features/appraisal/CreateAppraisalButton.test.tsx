import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import CreateAppraisalButton from "./CreateAppraisalButton";

// mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// mock useAuth
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../../contexts/AuthContext";

const renderCreateAppraisalButton = () => {
  return render(
    <BrowserRouter>
      <CreateAppraisalButton />
    </BrowserRouter>
  );
};

describe("CreateAppraisalButton", () => {
  it("should render create appraisal button for managers", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        emp_id: 2,
        emp_name: "Manager One",
        emp_email: "manager@company.com",
        emp_roles: "Manager",
        emp_roles_level: 3,
      },
      status: "succeeded",
      loginWithCredentials: vi.fn(),
      logout: vi.fn(),
    });
    renderCreateAppraisalButton();
    expect(
      screen.getByRole("button", { name: /create appraisal/i })
    ).toBeInTheDocument();
  });

  it("should navigate to create appraisal page when clicked", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        emp_id: 2,
        emp_name: "Manager One",
        emp_email: "manager@company.com",
        emp_roles: "Manager",
        emp_roles_level: 3,
      },
      status: "succeeded",
      loginWithCredentials: vi.fn(),
      logout: vi.fn(),
    });
    renderCreateAppraisalButton();
    fireEvent.click(screen.getByRole("button", { name: /create appraisal/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/appraisal/create");
  });

  it("should have proper styling classes", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        emp_id: 2,
        emp_name: "Manager One",
        emp_email: "manager@company.com",
        emp_roles: "Manager",
        emp_roles_level: 3,
      },
      status: "succeeded",
      loginWithCredentials: vi.fn(),
      logout: vi.fn(),
    });
    renderCreateAppraisalButton();
    const button = screen.getByRole("button", { name: /create appraisal/i });
    expect(button).toHaveClass("bg-primary");
    expect(button).toHaveClass("text-primary-foreground");
  });

  it("should not render create appraisal button for non-managers", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        emp_id: 3,
        emp_name: "Employee One",
        emp_email: "employee@company.com",
        emp_roles: "Employee",
        emp_roles_level: 1,
      },
      status: "succeeded",
      loginWithCredentials: vi.fn(),
      logout: vi.fn(),
    });
    renderCreateAppraisalButton();
    expect(
      screen.queryByRole("button", { name: /create appraisal/i })
    ).not.toBeInTheDocument();
  });

  it("should navigate to goal templates page when Manage Templates is clicked", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        emp_id: 2,
        emp_name: "Manager One",
        emp_email: "manager@company.com",
        emp_roles: "Manager",
        emp_roles_level: 3,
      },
      status: "succeeded",
      loginWithCredentials: vi.fn(),
      logout: vi.fn(),
    });

    renderCreateAppraisalButton();

    fireEvent.click(
      screen.getByRole("button", { name: /manage goal templates/i })
    );
    expect(mockNavigate).toHaveBeenCalledWith("/goal-templates");
  });

  it("should not navigate to goal templates page when Manage Templates is clicked for non-managers", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        emp_id: 3,
        emp_name: "Employee One",
        emp_email: "employee@company.com",
        emp_roles: "Employee",
        emp_roles_level: 1,
      },
      status: "succeeded",
      loginWithCredentials: vi.fn(),
      logout: vi.fn(),
    });

    renderCreateAppraisalButton();

    expect(
      screen.queryByRole("button", {
        name: /manage goal templates/i,
      })
    ).not.toBeInTheDocument();
  });
});
