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

  // Note: Create Appraisal button is global (outside this page). No button checks here.

  it("should display team appraisals when loaded", async () => {
    // Align with component's API calls and data shapes
    const employees = [{ emp_id: 10, emp_name: "John Doe" }] as any;
    const types = [{ id: 99, name: "Annual" }];
    const appraisals = [
      {
        appraisal_id: 1,
        appraisee_id: 10,
        appraiser_id: 2,
        reviewer_id: 5,
        appraisal_type_id: 99,
        appraisal_type_range_id: null,
        start_date: "2025-01-01",
        end_date: "2025-12-31",
        status: "Appraiser Evaluation",
      },
    ];

    vi.mocked(api.apiFetch).mockImplementation(async (url: string) => {
      if (url.startsWith("/api/appraisals?appraiser_id=")) {
        return { ok: true, data: appraisals } as any;
      }
      if (
        url.startsWith("/api/appraisals?reviewer_id=") &&
        url.includes("status=Reviewer%20Evaluation")
      ) {
        return { ok: true, data: [] } as any;
      }
      if (
        url.startsWith("/api/appraisals?reviewer_id=") &&
        url.includes("status=Complete")
      ) {
        return { ok: true, data: [] } as any;
      }
      if (url === "/api/employees") {
        return { ok: true, data: employees } as any;
      }
      if (url === "/api/appraisal-types") {
        return { ok: true, data: types } as any;
      }
      return { ok: true, data: [] } as any;
    });

    renderTeamAppraisal();

    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      expect(screen.getByText(/Annual/i)).toBeInTheDocument();
      expect(screen.getByText("Evaluate")).toBeInTheDocument();
    });
  });

  it("should filter appraisals by Active/Completed", async () => {
    const employees = [
      { emp_id: 10, emp_name: "John Doe" },
      { emp_id: 11, emp_name: "Jane Smith" },
    ] as any;
    const types = [{ id: 99, name: "Annual" }];
    const activeItem = {
      appraisal_id: 1,
      appraisee_id: 10,
      appraiser_id: 2,
      reviewer_id: 5,
      appraisal_type_id: 99,
      appraisal_type_range_id: null,
      start_date: "2025-01-01",
      end_date: "2025-12-31",
      status: "Appraiser Evaluation",
    };
    const completedItem = {
      appraisal_id: 2,
      appraisee_id: 11,
      appraiser_id: 2,
      reviewer_id: 5,
      appraisal_type_id: 99,
      appraisal_type_range_id: null,
      start_date: "2025-01-01",
      end_date: "2025-12-31",
      status: "Complete",
    };

    vi.mocked(api.apiFetch).mockImplementation(async (url: string) => {
      if (url.startsWith("/api/appraisals?appraiser_id=")) {
        return { ok: true, data: [activeItem, completedItem] } as any;
      }
      if (
        url.includes("status=Reviewer%20Evaluation") ||
        url.includes("status=Complete")
      ) {
        return { ok: true, data: [] } as any;
      }
      if (url === "/api/employees") return { ok: true, data: employees } as any;
      if (url === "/api/appraisal-types")
        return { ok: true, data: types } as any;
      return { ok: true, data: [] } as any;
    });

    renderTeamAppraisal();

    // Default is Active
    await waitFor(() => {
      expect(screen.getByText(/John Doe • Annual/i)).toBeInTheDocument();
      expect(screen.queryByText(/Jane Smith • Annual/i)).not.toBeInTheDocument();
    });

    // Switch to Completed
    fireEvent.click(screen.getByRole("button", { name: "Completed" }));
    await waitFor(() => {
      expect(screen.getByText(/Jane Smith • Annual/i)).toBeInTheDocument();
      expect(screen.queryByText(/John Doe • Annual/i)).not.toBeInTheDocument();
    });
  });

  it("should show different actions based on appraisal status", async () => {
    const employees = [{ emp_id: 10, emp_name: "John Doe" }] as any;
    const types = [{ id: 99, name: "Annual" }];
    const appraisals = [
      {
        appraisal_id: 1,
        appraisee_id: 10,
        appraiser_id: 2,
        reviewer_id: 5,
        appraisal_type_id: 99,
        appraisal_type_range_id: null,
        start_date: "2025-01-01",
        end_date: "2025-12-31",
        status: "Appraiser Evaluation",
      },
    ];

    vi.mocked(api.apiFetch).mockImplementation(async (url: string) => {
      if (url.startsWith("/api/appraisals?appraiser_id=")) {
        return { ok: true, data: appraisals } as any;
      }
      if (
        url.includes("status=Reviewer%20Evaluation") ||
        url.includes("status=Complete")
      ) {
        return { ok: true, data: [] } as any;
      }
      if (url === "/api/employees") return { ok: true, data: employees } as any;
      if (url === "/api/appraisal-types")
        return { ok: true, data: types } as any;
      return { ok: true, data: [] } as any;
    });

    renderTeamAppraisal();

    await waitFor(() => {
      expect(screen.getByText("Evaluate")).toBeInTheDocument();
    });
  });

  // No click test for Create Appraisal since it's not part of this page

  // No negative test for Create Appraisal since button isn't on this page
});
