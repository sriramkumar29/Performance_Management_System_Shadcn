import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import MyAppraisal from "./MyAppraisal";
import * as api from "../../utils/api";

// mock api
vi.mock("../../utils/api");

// ✅ define mockUseAuth in a hoisted block
const { mockUseAuth } = vi.hoisted(() => {
  return { mockUseAuth: vi.fn() };
});

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: mockUseAuth,
}));

const mockUser = {
  emp_id: 1,
  emp_name: "John Doe",
  emp_email: "john@company.com",
  emp_roles: "Developer",
  emp_roles_level: 3,
  emp_department: "Engineering",
};

const renderMyAppraisal = () => {
  return render(
    <BrowserRouter>
      <MyAppraisal />
    </BrowserRouter>
  );
};

describe("MyAppraisal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      status: "succeeded",
      loginWithCredentials: vi.fn(),
      logout: vi.fn(),
    });
  });

  it("should render page title", () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ ok: true, data: [] });

    renderMyAppraisal();

    expect(screen.getByText("My Appraisals")).toBeInTheDocument();
  });

  it("should hide list content while loading", () => {
    vi.mocked(api.apiFetch).mockImplementation(() => new Promise(() => {}));

    renderMyAppraisal();

    // While loading, filter buttons/list are not rendered
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
    expect(screen.queryByText("No items")).not.toBeInTheDocument();
  });

  it("should display appraisals when loaded", async () => {
    const mockTypes = [{ id: 1, name: "Annual" }];
    const mockAppraisals = [
      {
        appraisal_id: 1,
        status: "Submitted",
        appraisal_type_id: 1,
        start_date: "2024-01-01",
        end_date: "2024-12-31",
      },
    ];

    vi.mocked(api.apiFetch).mockImplementation(async (path: string) => {
      if (path.includes("/api/appraisal-types")) {
        return { ok: true, data: mockTypes } as any;
      }
      if (path.startsWith("/api/appraisals?")) {
        return { ok: true, data: mockAppraisals } as any;
      }
      if (path.startsWith("/api/appraisals/")) {
        // details
        return { ok: true, data: { appraisal_goals: [] } } as any;
      }
      return { ok: true, data: [] } as any;
    });

    renderMyAppraisal();

    await waitFor(() => {
      const annualMatches = screen.getAllByText(/Annual/i);
      expect(annualMatches.length).toBeGreaterThan(0);
      // "Submitted" is displayed as "Waiting Acknowledgement" in the badge
      expect(screen.getByText(/Waiting Acknowledgement/i)).toBeInTheDocument();
    });
  });

  it("should display empty state when no appraisals", async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ ok: true, data: [] });

    renderMyAppraisal();

    await waitFor(() => {
      expect(screen.getByText("No items")).toBeInTheDocument();
    });
  });

  it("should handle API error gracefully", async () => {
    // Simulate API error properly
    vi.mocked(api.apiFetch).mockImplementation(async (path: string) => {
      if (path.includes("/api/appraisal-types")) {
        return { ok: true, data: [] } as any;
      }
      return { ok: false, error: "API Error", status: 500 } as any;
    });

    renderMyAppraisal();

    await waitFor(() => {
      expect(screen.getByText("API Error")).toBeInTheDocument();
    });
  });

  it("should show different actions based on appraisal status", async () => {
    const mockAppraisals = [
      {
        appraisal_id: 1,
        status: "Submitted",
        appraisal_type_id: 1,
        start_date: "2024-01-01",
        end_date: "2024-12-31",
      },
    ];

    vi.mocked(api.apiFetch).mockImplementation(async (path: string) => {
      if (path.includes("/api/appraisal-types")) {
        return { ok: true, data: [{ id: 1, name: "Annual" }] } as any;
      }
      if (path.startsWith("/api/appraisals?")) {
        return { ok: true, data: mockAppraisals } as any;
      }
      if (path.startsWith("/api/appraisals/")) {
        return { ok: true, data: { appraisal_goals: [] } } as any;
      }
      return { ok: true, data: [] } as any;
    });

    renderMyAppraisal();

    await waitFor(() => {
      // For Submitted status, the action is to start self assessment
      expect(screen.getByText("Take Self Assessment")).toBeInTheDocument();
    });
  });

  it("should filter appraisals by period", async () => {
    const mockAppraisals = [
      {
        appraisal_id: 1,
        status: "Draft",
        appraisal_type_id: 1,
        start_date: "2024-01-01",
        end_date: "2024-12-31",
      },
    ];

    vi.mocked(api.apiFetch).mockImplementation(async (path: string) => {
      if (path.includes("/api/appraisal-types")) {
        return { ok: true, data: [{ id: 1, name: "Annual" }] } as any;
      }
      if (path.startsWith("/api/appraisals?")) {
        return { ok: true, data: mockAppraisals } as any;
      }
      return { ok: true, data: [] } as any;
    });

    renderMyAppraisal();

    // Open filters to show the period combobox
    const filtersBtn = await screen.findByRole("button", { name: /filters/i });
    await userEvent.click(filtersBtn);

    await waitFor(() => {
      expect(screen.getAllByRole("combobox")).toHaveLength(2); // Type filter and Period filter
    });
  });
});
