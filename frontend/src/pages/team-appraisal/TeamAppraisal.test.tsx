import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import TeamAppraisal from "./TeamAppraisal";
import * as api from "../../utils/api";

vi.mock("../../utils/api");

// ✅ define hoisted mock
const { mockUseAuth } = vi.hoisted(() => {
  return { mockUseAuth: vi.fn() };
});

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: mockUseAuth,
}));

const mockManagerUser = {
  emp_id: 2,
  emp_name: "Manager One",
  emp_email: "manager@company.com",
  emp_roles: "Manager",
  emp_roles_level: 5,
  emp_department: "Engineering",
};

const renderTeamAppraisal = () => {
  return render(
    <BrowserRouter>
      <TeamAppraisal />
    </BrowserRouter>
  );
};

describe("TeamAppraisal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockManagerUser,
      status: "succeeded",
      loginWithCredentials: vi.fn(),
      logout: vi.fn(),
    });
  });

  it("should render page title", () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ ok: true, data: [] });

    renderTeamAppraisal();

    expect(screen.getByText("Team Appraisals")).toBeInTheDocument();
  });

  it("should show create appraisal button for managers", () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ ok: true, data: [] });

    renderTeamAppraisal();

    expect(screen.getByText("Create Appraisal")).toBeInTheDocument();
  });

  it("should display team appraisals when loaded", async () => {
    const mockAppraisals = [
      {
        appraisal_id: 1,
        status: "Draft",
        appraisal_type: { name: "Annual" },
        appraisee: { emp_name: "John Doe" },
        reviewer: { emp_name: "Senior Manager" },
        start_date: "2024-01-01",
        end_date: "2024-12-31",
      },
    ];

    vi.mocked(api.apiFetch).mockResolvedValue({
      ok: true,
      data: mockAppraisals,
    });

    renderTeamAppraisal();

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Annual")).toBeInTheDocument();
      expect(screen.getByText("Draft")).toBeInTheDocument();
    });
  });

  it("should filter appraisals by status", async () => {
    const mockAppraisals = [
      {
        appraisal_id: 1,
        status: "Draft",
        appraisal_type: { name: "Annual" },
        appraisee: { emp_name: "John Doe" },
      },
    ];

    vi.mocked(api.apiFetch).mockResolvedValue({
      ok: true,
      data: mockAppraisals,
    });

    renderTeamAppraisal();

    await waitFor(() => {
      const statusFilter = screen.getByRole("combobox", { name: /status/i });
      expect(statusFilter).toBeInTheDocument();
    });
  });

  it("should show different actions based on appraisal status", async () => {
    const mockAppraisals = [
      {
        appraisal_id: 1,
        status: "Appraiser Evaluation",
        appraisal_type: { name: "Annual" },
        appraisee: { emp_name: "John Doe" },
      },
    ];

    vi.mocked(api.apiFetch).mockResolvedValue({
      ok: true,
      data: mockAppraisals,
    });

    renderTeamAppraisal();

    await waitFor(() => {
      expect(screen.getByText("Evaluate")).toBeInTheDocument();
    });
  });

  it("should handle create appraisal button click", () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ ok: true, data: [] });

    renderTeamAppraisal();

    const createButton = screen.getByText("Create Appraisal");
    fireEvent.click(createButton);

    // Should navigate to create appraisal page
    expect(window.location.pathname).toBe("/appraisal/create");
  });

  it("should not show create button for non-managers", () => {
    mockUseAuth.mockReturnValue({
      user: {
        ...mockManagerUser,
        emp_roles: "Developer",
        emp_roles_level: 3,
      },
      status: "succeeded",
      loginWithCredentials: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(api.apiFetch).mockResolvedValue({ ok: true, data: [] });

    renderTeamAppraisal();

    expect(screen.queryByText("Create Appraisal")).not.toBeInTheDocument();
  });
});
