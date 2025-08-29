import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MyAppraisal from "./MyAppraisal";
import * as api from "../../utils/api";

// Mock API
vi.mock("../../utils/api");

// Mock Auth Context
const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn()
}));

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: mockUseAuth,
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom") as object),
  useNavigate: () => mockNavigate,
}));

const mockUser = {
  emp_id: 1,
  emp_name: "John Doe",
  emp_email: "john@company.com",
  emp_roles: "Developer",
  emp_roles_level: 3,
  emp_department: "Engineering",
  emp_reporting_manager: 2,
};

const mockAppraisal = {
  appraisal_id: 1,
  appraisal_setting_id: 1,
  appraisee_id: 1,
  appraiser_id: 2,
  reviewer_id: 3,
  appraisal_type_id: 1,
  appraisal_type_range_id: 1,
  start_date: "2024-01-01",
  end_date: "2024-12-31",
  status: "Draft",
  appraiser_overall_comments: null,
  appraiser_overall_rating: null,
  reviewer_overall_comments: null,
  reviewer_overall_rating: null,
  created_at: "2024-01-01T00:00:00Z",
  appraisal_goals: [],
  appraisal_type: { id: 1, name: "Annual" },
  appraiser: { emp_id: 2, emp_name: "Manager One" },
  reviewer: { emp_id: 3, emp_name: "Reviewer One" },
  appraisee: { emp_id: 1, emp_name: "John Doe" },
};

const renderMyAppraisal = (initialEntries = ['/appraisals']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <MyAppraisal />
    </MemoryRouter>
  );
};

describe("MyAppraisal", () => {
  const mockApiFetch = vi.mocked(api.apiFetch);
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      status: "succeeded",
      loginWithCredentials: vi.fn(),
      logout: vi.fn(),
    });
    
    // Default mock for appraisals fetch
    mockApiFetch.mockResolvedValue({
      ok: true,
      data: [mockAppraisal],
    });
  });

  it("should render page title and controls", async () => {
    renderMyAppraisal();
    
    await waitFor(() => {
      expect(screen.getByText("My Appraisals")).toBeInTheDocument();
      expect(screen.getByRole("combobox", { name: /period/i })).toBeInTheDocument();
      expect(screen.getByRole("combobox", { name: /status/i })).toBeInTheDocument();
    });
  });

  it("should display loading state initially", () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {}));
    renderMyAppraisal();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
  
  it("should display error state when API fails", async () => {
    const errorMessage = "Failed to load appraisals";
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      error: errorMessage,
      status: 500,
    });
    
    renderMyAppraisal();
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it("should display appraisals with correct details", async () => {
    renderMyAppraisal();

    await waitFor(() => {
      // Check basic info
      expect(screen.getByText("Annual")).toBeInTheDocument();
      expect(screen.getByText("Draft")).toBeInTheDocument();
      expect(screen.getByText("Manager One")).toBeInTheDocument();
      
      // Check date formatting
      expect(screen.getByText("Jan 1, 2024 - Dec 31, 2024")).toBeInTheDocument();
      
      // Check action buttons based on status
      expect(screen.getByRole("button", { name: /view/i })).toBeInTheDocument();
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
    const errorMessage = "API Error";
    vi.mocked(api.apiFetch).mockResolvedValue({
      ok: false,
      error: errorMessage,
      status: 500,
    });

    renderMyAppraisal();

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it("should handle network errors", async () => {
    vi.mocked(api.apiFetch).mockRejectedValue(new Error("Network Error"));
    
    renderMyAppraisal();
    
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  describe("Status-based actions", () => {
    const statusTestCases = [
      {
        status: "Draft",
        expectedButtons: ["View", "Edit"],
        unexpectedButtons: ["Acknowledge", "Complete Self-Assessment"]
      },
      {
        status: "Submitted",
        expectedButtons: ["Acknowledge"],
        unexpectedButtons: ["Edit", "Complete Self-Assessment"]
      },
      {
        status: "Self Assessment",
        expectedButtons: ["Complete Self-Assessment"],
        unexpectedButtons: ["Edit", "Acknowledge"]
      },
      {
        status: "Appraiser Evaluation",
        expectedButtons: ["View"],
        unexpectedButtons: ["Edit", "Acknowledge", "Complete Self-Assessment"]
      },
      {
        status: "Reviewer Evaluation",
        expectedButtons: ["View"],
        unexpectedButtons: ["Edit", "Acknowledge", "Complete Self-Assessment"]
      },
      {
        status: "Complete",
        expectedButtons: ["View", "Print"],
        unexpectedButtons: ["Edit", "Acknowledge", "Complete Self-Assessment"]
      }
    ];

    statusTestCases.forEach(({ status, expectedButtons, unexpectedButtons }) => {
      it(`should show correct buttons for ${status} status`, async () => {
        mockApiFetch.mockResolvedValueOnce({
          ok: true,
          data: [{ ...mockAppraisal, status }],
        });
        
        renderMyAppraisal();
        
        await waitFor(() => {
          // Check expected buttons are present
          expectedButtons.forEach(buttonText => {
            expect(screen.getByRole("button", { name: new RegExp(buttonText, "i") })).toBeInTheDocument();
          });
          
          // Check unexpected buttons are not present
          unexpectedButtons.forEach(buttonText => {
            expect(screen.queryByRole("button", { name: new RegExp(buttonText, "i") })).not.toBeInTheDocument();
          });
        });
      });
    });

    it("should navigate to view page when View button is clicked", async () => {
      const testAppraisal = { ...mockAppraisal, status: "Complete" };
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        data: [testAppraisal],
      });
      
      renderMyAppraisal();
      
      await waitFor(() => {
        fireEvent.click(screen.getByRole("button", { name: /view/i }));
        expect(mockNavigate).toHaveBeenCalledWith(`/appraisals/${testAppraisal.appraisal_id}`);
      });
    });
  });

  describe("Filtering and Pagination", () => {
    it("should filter appraisals by period", async () => {
      renderMyAppraisal();
      
      const periodSelect = await screen.findByRole("combobox", { name: /period/i });
      fireEvent.mouseDown(periodSelect);
      
      // Test that period options are rendered
      await waitFor(() => {
        expect(screen.getByText("This Year")).toBeInTheDocument();
        expect(screen.getByText("Last Year")).toBeInTheDocument();
        expect(screen.getByText("Custom Range")).toBeInTheDocument();
      });
      
      // Test API call with period filter
      fireEvent.click(screen.getByText("Last Year"));
      
      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(
          expect.stringContaining("start_date=2023-01-01&end_date=2023-12-31")
        );
      });
    });

    it("should filter appraisals by status", async () => {
      renderMyAppraisal();
      
      const statusSelect = await screen.findByRole("combobox", { name: /status/i });
      fireEvent.mouseDown(statusSelect);
      
      // Select Draft status
      fireEvent.click(screen.getByText("Draft"));
      
      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(
          expect.stringContaining("status=Draft")
        );
      });
    });

    it("should handle pagination", async () => {
      // Mock paginated response
      const mockPaginatedResponse = {
        ok: true,
        data: {
          items: Array(15).fill(0).map((_, i) => ({
            ...mockAppraisal,
            appraisal_id: i + 1,
            start_date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          })),
          total: 25,
          page: 1,
          pageSize: 10,
          totalPages: 3,
        }
      };
      
      mockApiFetch.mockResolvedValue(mockPaginatedResponse);
      
      renderMyAppraisal();
      
      // Wait for initial load
      await screen.findByText("My Appraisals");
      
      // Check pagination controls
      expect(screen.getByText(/1–10 of 25/)).toBeInTheDocument();
      
      // Test next page
      const nextPageButton = screen.getByRole("button", { name: /next page/i });
      fireEvent.click(nextPageButton);
      
      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(
          expect.stringContaining("page=2")
        );
      });
    });
  });
});
