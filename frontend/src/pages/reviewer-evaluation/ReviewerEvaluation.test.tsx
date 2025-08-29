import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ReviewerEvaluation from "./ReviewerEvaluation";
import * as api from "../../utils/api";

vi.mock("../../utils/api");

const mockUseAuth = vi.fn();
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ id: "1" }),
  };
});

const mockReviewerUser = {
  emp_id: 3,
  emp_name: "Senior Manager",
  emp_email: "senior@company.com",
  emp_roles: "VP",
  emp_roles_level: 6,
  emp_department: "Engineering",
};

const renderReviewerEvaluation = () => {
  return render(
    <BrowserRouter>
      <ReviewerEvaluation />
    </BrowserRouter>
  );
};

describe("ReviewerEvaluation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockReviewerUser,
      status: "succeeded",
      loginWithCredentials: vi.fn(),
      logout: vi.fn(),
    });
  });

  it("should render page title", async () => {
    const mockAppraisal = {
      appraisal_id: 1,
      status: "Reviewer Evaluation",
      appraisee: { emp_name: "John Doe" },
      appraiser: { emp_name: "Manager One" },
    };

    vi.mocked(api.apiFetch).mockResolvedValue({
      ok: true,
      data: mockAppraisal,
    });

    renderReviewerEvaluation();

    await waitFor(() => {
      expect(screen.getByText("Reviewer Evaluation")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });
  });

  it("should display appraiser evaluation summary", async () => {
    const mockAppraisal = {
      appraisal_id: 1,
      status: "Reviewer Evaluation",
      appraiser_overall_comments: "Excellent performance overall",
      appraiser_overall_rating: 4,
      reviewer_overall_comments: "",
      reviewer_overall_rating: null,
    };

    vi.mocked(api.apiFetch).mockResolvedValue({
      ok: true,
      data: mockAppraisal,
    });

    renderReviewerEvaluation();

    await waitFor(() => {
      expect(
        screen.getByText("Excellent performance overall")
      ).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
    });
  });

  it("should allow entering reviewer overall comments", async () => {
    const mockAppraisal = {
      appraisal_id: 1,
      status: "Reviewer Evaluation",
      reviewer_overall_comments: "",
      reviewer_overall_rating: null,
    };

    vi.mocked(api.apiFetch).mockResolvedValue({
      ok: true,
      data: mockAppraisal,
    });

    renderReviewerEvaluation();

    await waitFor(() => {
      const commentsTextarea = screen.getByPlaceholderText(
        /reviewer overall comments/i
      ) as HTMLTextAreaElement;
      fireEvent.change(commentsTextarea, {
        target: { value: "Agree with appraiser assessment" },
      });

      expect(commentsTextarea.value).toBe("Agree with appraiser assessment");
    });
  });

  it("should allow selecting reviewer overall rating", async () => {
    const mockAppraisal = {
      appraisal_id: 1,
      status: "Reviewer Evaluation",
      reviewer_overall_rating: null,
    };

    vi.mocked(api.apiFetch).mockResolvedValue({
      ok: true,
      data: mockAppraisal,
    });

    renderReviewerEvaluation();

    await waitFor(() => {
      const ratingSelect = screen.getByRole("combobox", {
        name: /overall rating/i,
      });
      fireEvent.click(ratingSelect);

      const rating5 = screen.getByText("5");
      fireEvent.click(rating5);

      expect(screen.getByDisplayValue("5")).toBeInTheDocument();
    });
  });

  it("should submit reviewer evaluation", async () => {
    const mockAppraisal = {
      appraisal_id: 1,
      status: "Reviewer Evaluation",
      reviewer_overall_comments: "Final approval",
      reviewer_overall_rating: 5,
    };

    vi.mocked(api.apiFetch).mockResolvedValue({
      ok: true,
      data: mockAppraisal,
    });
    vi.mocked(api.apiFetch).mockResolvedValueOnce({ ok: true, data: {} });

    renderReviewerEvaluation();

    await waitFor(() => {
      const submitButton = screen.getByText("Complete Appraisal");
      fireEvent.click(submitButton);
    });

    expect(api.apiFetch).toHaveBeenCalledWith("/appraisals/1/status", {
      method: "PATCH",
      body: JSON.stringify({ status: "Complete" }),
    });
  });

  it("should show read-only view for completed appraisal", async () => {
    const mockAppraisal = {
      appraisal_id: 1,
      status: "Complete",
      reviewer_overall_comments: "Final approval",
      reviewer_overall_rating: 5,
    };

    vi.mocked(api.apiFetch).mockResolvedValue({
      ok: true,
      data: mockAppraisal,
    });

    renderReviewerEvaluation();

    await waitFor(() => {
      const commentsTextarea = screen.getByDisplayValue("Final approval");
      expect(commentsTextarea).toBeDisabled();
    });
  });
});
