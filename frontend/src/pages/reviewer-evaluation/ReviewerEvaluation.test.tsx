import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../../test/mocks/server";
import ReviewerEvaluation from "./ReviewerEvaluation";

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
    server.use(
      http.get("/api/appraisals/1", () =>
        HttpResponse.json({
          appraisal_id: 1,
          start_date: "2024-01-01",
          end_date: "2024-12-31",
          status: "Reviewer Evaluation",
          appraisal_goals: [],
          appraiser_overall_comments: "",
          appraiser_overall_rating: null,
          reviewer_overall_comments: "",
          reviewer_overall_rating: null,
        })
      )
    );

    renderReviewerEvaluation();

    await waitFor(() => {
      expect(screen.getByText("Reviewer Evaluation")).toBeInTheDocument();
    });
  });

  it("should display appraiser evaluation summary", async () => {
    server.use(
      http.get("/api/appraisals/1", () =>
        HttpResponse.json({
          appraisal_id: 1,
          start_date: "2024-01-01",
          end_date: "2024-12-31",
          status: "Reviewer Evaluation",
          appraisal_goals: [],
          appraiser_overall_comments: "Excellent performance overall",
          appraiser_overall_rating: 4,
          reviewer_overall_comments: "",
          reviewer_overall_rating: null,
        })
      )
    );

    renderReviewerEvaluation();

    await waitFor(() => {
      expect(
        screen.getByText("Excellent performance overall")
      ).toBeInTheDocument();
      // Shows overall rating text
      expect(screen.getByText(/Overall Rating:\s*4/i)).toBeInTheDocument();
    });
  });

  it("should allow entering reviewer overall comments", async () => {
    server.use(
      http.get("/api/appraisals/1", () =>
        HttpResponse.json({
          appraisal_id: 1,
          start_date: "2024-01-01",
          end_date: "2024-12-31",
          status: "Reviewer Evaluation",
          appraisal_goals: [],
          appraiser_overall_comments: "",
          appraiser_overall_rating: null,
          reviewer_overall_comments: "",
          reviewer_overall_rating: null,
        })
      )
    );

    renderReviewerEvaluation();

    await waitFor(() => {
      const commentsTextarea = screen.getByPlaceholderText(
        /Provide your comprehensive review/i
      ) as HTMLTextAreaElement;
      fireEvent.change(commentsTextarea, {
        target: { value: "Agree with appraiser assessment" },
      });

      expect(commentsTextarea.value).toBe("Agree with appraiser assessment");
    });
  });

  // Slider interactions are complex in tests; we seed valid values in submit test

  it("should submit reviewer evaluation", async () => {
    server.use(
      http.get("/api/appraisals/1", () =>
        HttpResponse.json({
          appraisal_id: 1,
          start_date: "2024-01-01",
          end_date: "2024-12-31",
          status: "Reviewer Evaluation",
          appraisal_goals: [],
          appraiser_overall_comments: "Looks good",
          appraiser_overall_rating: 4,
          reviewer_overall_comments: "Final approval",
          reviewer_overall_rating: 5,
        })
      )
    );

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    renderReviewerEvaluation();

    await waitFor(() => {
      const submitButton = screen.getByText("Submit & Complete");
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/appraisals/1/reviewer-evaluation"),
        expect.objectContaining({ method: "PUT" })
      );
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/appraisals/1/status"),
        expect.objectContaining({ method: "PUT" })
      );
    });
  });
});
