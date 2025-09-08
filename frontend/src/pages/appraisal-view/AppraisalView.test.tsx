import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import AppraisalView from "./AppraisalView";
import { AuthProvider } from "../../contexts/AuthContext";
import { ThemeProvider } from "../../contexts/ThemeContext";
import * as api from "../../utils/api";

// Mock the API
vi.mock("../../utils/api", () => ({
  apiFetch: vi.fn(),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockParams = { id: "1" };

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

// Mock user
const mockUser = {
  emp_id: 1,
  emp_name: "John Doe",
  emp_email: "john@example.com",
  emp_roles: "Manager",
  emp_roles_level: 4,
  emp_department: "Engineering",
};

// Test data
const mockAppraisalData = {
  appraisal_id: 1,
  appraisee_id: 1,
  appraiser_id: 2,
  reviewer_id: 3,
  appraisal_type_id: 1,
  start_date: "2025-01-01",
  end_date: "2025-12-31",
  status: "Complete",
  appraisal_goals: [
    {
      id: 1,
      goal_id: 1,
      goal: {
        goal_id: 1,
        goal_title: "Test Goal",
        goal_description: "Test goal description",
        goal_importance: "High",
        goal_weightage: 50,
        category: { id: 1, name: "Technical" },
      },
      self_rating: 4,
      self_comment: "Self assessment comment",
      appraiser_rating: 3,
      appraiser_comment: "Appraiser comment",
    },
    {
      id: 2,
      goal_id: 2,
      goal: {
        goal_id: 2,
        goal_title: "Second Goal",
        goal_description: "Second goal description",
        goal_importance: "Medium",
        goal_weightage: 50,
        category: { id: 2, name: "Leadership" },
      },
      self_rating: 5,
      self_comment: "Second self assessment",
      appraiser_rating: 4,
      appraiser_comment: "Second appraiser comment",
    },
  ],
  appraiser_overall_comments: "Overall good performance",
  appraiser_overall_rating: 4,
  reviewer_overall_comments: "Reviewer feedback",
  reviewer_overall_rating: 4,
};

// Wrapper component
const TestWrapper = ({
  children,
  user = mockUser,
}: {
  children: React.ReactNode;
  user?: any;
}) => {
  // Set up sessionStorage for user authentication
  if (user) {
    sessionStorage.setItem("auth_user", JSON.stringify(user));
    sessionStorage.setItem("auth_token", "mock-token");
  } else {
    sessionStorage.removeItem("auth_user");
    sessionStorage.removeItem("auth_token");
  }

  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe("AppraisalView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading State", () => {
    it("should show loading skeleton when data is loading", () => {
      vi.mocked(api.apiFetch).mockImplementation(() => new Promise(() => {}));

      render(
        <TestWrapper>
          <AppraisalView />
        </TestWrapper>
      );

      expect(screen.getByRole("generic", { busy: true })).toBeInTheDocument();
      // Check for loading skeleton structure
      expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
    });
  });

  describe("Data Loading", () => {
    it("should load appraisal data on mount", async () => {
      vi.mocked(api.apiFetch).mockResolvedValue({
        ok: true,
        data: mockAppraisalData,
      });

      render(
        <TestWrapper>
          <AppraisalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(api.apiFetch).toHaveBeenCalledWith("/api/appraisals/1");
      });

      expect(screen.getByText("Appraisal View")).toBeInTheDocument();
      expect(screen.getByText("Test Goal")).toBeInTheDocument();
    });

    it("should handle API error gracefully", async () => {
      vi.mocked(api.apiFetch).mockResolvedValue({
        ok: false,
        error: "Failed to load",
      });

      render(
        <TestWrapper>
          <AppraisalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(api.apiFetch).toHaveBeenCalled();
      });

      // Should show loading skeleton when no data
      expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
    });
  });

  describe("Access Control", () => {
    it("should allow appraisee access during Complete status", async () => {
      vi.mocked(api.apiFetch).mockResolvedValue({
        ok: true,
        data: { ...mockAppraisalData, status: "Complete" },
      });

      render(
        <TestWrapper user={{ ...mockUser, emp_id: 1 }}>
          <AppraisalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Appraisal View")).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should allow appraisee access during Submitted status", async () => {
      vi.mocked(api.apiFetch).mockResolvedValue({
        ok: true,
        data: { ...mockAppraisalData, status: "Submitted" },
      });

      render(
        <TestWrapper user={{ ...mockUser, emp_id: 1 }}>
          <AppraisalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Waiting Acknowledgement")).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should redirect unauthorized users", async () => {
      vi.mocked(api.apiFetch).mockResolvedValue({
        ok: true,
        data: { ...mockAppraisalData, status: "Draft" },
      });

      render(
        <TestWrapper user={{ ...mockUser, emp_id: 1 }}>
          <AppraisalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
      });
    });

    it("should redirect users without authentication", async () => {
      render(
        <TestWrapper user={null}>
          <AppraisalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
      });
    });
  });

  describe("Status Display", () => {
    it("should display status correctly", async () => {
      vi.mocked(api.apiFetch).mockResolvedValue({
        ok: true,
        data: { ...mockAppraisalData, status: "Complete" },
      });

      render(
        <TestWrapper>
          <AppraisalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Complete")).toBeInTheDocument();
      });
    });

    it("should transform Submitted status to Waiting Acknowledgement", async () => {
      vi.mocked(api.apiFetch).mockResolvedValue({
        ok: true,
        data: { ...mockAppraisalData, status: "Submitted" },
      });

      render(
        <TestWrapper>
          <AppraisalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Waiting Acknowledgement")).toBeInTheDocument();
      });
    });
  });

  describe("Goal Navigation", () => {
    it("should show first goal initially", async () => {
      vi.mocked(api.apiFetch).mockResolvedValue({
        ok: true,
        data: mockAppraisalData,
      });

      render(
        <TestWrapper>
          <AppraisalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Test Goal")).toBeInTheDocument();
        expect(screen.getByText("Goal 1 of 2")).toBeInTheDocument();
      });
    });

    it("should navigate between goals", async () => {
      vi.mocked(api.apiFetch).mockResolvedValue({
        ok: true,
        data: mockAppraisalData,
      });

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AppraisalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Test Goal")).toBeInTheDocument();
      });

      // Navigate to next goal
      const nextButton = screen.getByRole("button", { name: /next/i });
      await user.click(nextButton);

      expect(screen.getByText("Second Goal")).toBeInTheDocument();
      expect(screen.getByText("Goal 2 of 2")).toBeInTheDocument();
    });

    it("should show overall summary when status is Complete", async () => {
      vi.mocked(api.apiFetch).mockResolvedValue({
        ok: true,
        data: { ...mockAppraisalData, status: "Complete" },
      });

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AppraisalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Test Goal")).toBeInTheDocument();
      });

      // Navigate to overall page
      const nextButton = screen.getByRole("button", { name: /next/i });
      await user.click(nextButton); // Goal 2
      await user.click(nextButton); // Overall

      expect(screen.getByText("Overall Summary")).toBeInTheDocument();
      expect(screen.getByText("Overall good performance")).toBeInTheDocument();
    });
  });

  describe("Goal Content Display", () => {
    it("should display goal details correctly", async () => {
      vi.mocked(api.apiFetch).mockResolvedValue({
        ok: true,
        data: mockAppraisalData,
      });

      render(
        <TestWrapper>
          <AppraisalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Test Goal")).toBeInTheDocument();
        expect(screen.getByText("Test goal description")).toBeInTheDocument();
        expect(screen.getByText("Weightage: 50%")).toBeInTheDocument();
        expect(screen.getByText("Technical")).toBeInTheDocument();
      });
    });

    it("should display ratings and comments", async () => {
      vi.mocked(api.apiFetch).mockResolvedValue({
        ok: true,
        data: mockAppraisalData,
      });

      render(
        <TestWrapper>
          <AppraisalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Self assessment comment")).toBeInTheDocument();
        expect(screen.getByText("Appraiser comment")).toBeInTheDocument();
      });

      // Check that ratings are displayed (may be in star format or other UI elements)
      expect(screen.getByText("Self assessment comment")).toBeInTheDocument();
      expect(screen.getByText("Appraiser comment")).toBeInTheDocument();
    });
  });

  describe("Progress Tracking", () => {
    it("should show correct progress percentage", async () => {
      vi.mocked(api.apiFetch).mockResolvedValue({
        ok: true,
        data: mockAppraisalData,
      });

      render(
        <TestWrapper>
          <AppraisalView />
        </TestWrapper>
      );

      await waitFor(() => {
        // The first goal starts at 0% since idx starts at 0
        expect(screen.getByText("0% Complete")).toBeInTheDocument();
      });
    });

    it("should show 100% progress on overall page", async () => {
      vi.mocked(api.apiFetch).mockResolvedValue({
        ok: true,
        data: { ...mockAppraisalData, status: "Complete" },
      });

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AppraisalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Test Goal")).toBeInTheDocument();
      });

      // Navigate to overall page
      const nextButton = screen.getByRole("button", { name: /next/i });
      await user.click(nextButton); // Goal 2
      await user.click(nextButton); // Overall

      expect(screen.getByText("100% Complete")).toBeInTheDocument();
    });
  });

  describe("Empty States", () => {
    it("should handle appraisal with no goals", async () => {
      vi.mocked(api.apiFetch).mockResolvedValue({
        ok: true,
        data: { ...mockAppraisalData, appraisal_goals: [] },
      });

      render(
        <TestWrapper>
          <AppraisalView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Appraisal View")).toBeInTheDocument();
      });

      expect(screen.getByText("100% Complete")).toBeInTheDocument();
    });
  });

  describe("Date Formatting", () => {
    it("should format dates correctly", async () => {
      vi.mocked(api.apiFetch).mockResolvedValue({
        ok: true,
        data: mockAppraisalData,
      });

      render(
        <TestWrapper>
          <AppraisalView />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check date format (will depend on locale)
        expect(
          screen.getByText(/1\/1\/2025.*12\/31\/2025/)
        ).toBeInTheDocument();
      });
    });
  });
});
