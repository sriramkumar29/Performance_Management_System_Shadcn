import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../../test/mocks/server";
import AppraiserEvaluation from "./AppraiserEvaluation";

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

const mockManagerUser = {
  emp_id: 1,
  emp_name: "John Manager",
  emp_email: "john.manager@company.com",
  emp_roles: "Manager",
  emp_roles_level: 5,
};

const renderAppraiserEvaluation = () => {
  return render(
    <BrowserRouter>
      <AppraiserEvaluation />
    </BrowserRouter>
  );
};

describe("AppraiserEvaluation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockManagerUser,
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
          status: "Appraiser Evaluation",
          appraisal_goals: [],
          appraiser_overall_comments: "",
          appraiser_overall_rating: null,
        })
      )
    );

    renderAppraiserEvaluation();

    await waitFor(() => {
      expect(screen.getByText("Appraiser Evaluation")).toBeInTheDocument();
    });
  });

  it("should display goals with self assessment", async () => {
    server.use(
      http.get("/api/appraisals/1", () =>
        HttpResponse.json({
          appraisal_id: 1,
          start_date: "2024-01-01",
          end_date: "2024-12-31",
          status: "Appraiser Evaluation",
          appraisal_goals: [
            {
              id: 10,
              goal_id: 1,
              goal: {
                goal_id: 1,
                goal_title: "Technical Excellence",
                goal_weightage: 40,
                goal_description: "Improve coding skills",
              },
              self_comment: "I have improved significantly",
              self_rating: 4,
              appraiser_comment: "",
              appraiser_rating: null,
            },
          ],
          appraiser_overall_comments: "",
          appraiser_overall_rating: null,
        })
      )
    );

    renderAppraiserEvaluation();

    await waitFor(() => {
      expect(screen.getByText("Technical Excellence")).toBeInTheDocument();
      expect(screen.getByText("Improve coding skills")).toBeInTheDocument();
      expect(screen.getByText(/Weightage: 40%/i)).toBeInTheDocument();
      expect(screen.getByText("I have improved significantly")).toBeInTheDocument();
    });
  });

  it("should allow entering appraiser comments", async () => {
    server.use(
      http.get("/api/appraisals/1", () =>
        HttpResponse.json({
          appraisal_id: 1,
          start_date: "2024-01-01",
          end_date: "2024-12-31",
          status: "Appraiser Evaluation",
          appraisal_goals: [
            {
              id: 10,
              goal_id: 1,
              goal: {
                goal_id: 1,
                goal_title: "Technical Excellence",
                goal_weightage: 40,
              },
              self_comment: "Good progress",
              self_rating: 4,
              appraiser_comment: "",
              appraiser_rating: null,
            },
          ],
          appraiser_overall_comments: "",
          appraiser_overall_rating: null,
        })
      )
    );

    renderAppraiserEvaluation();

    await waitFor(() => {
      const commentTextarea = screen.getByPlaceholderText(
        /Provide your detailed evaluation/i
      ) as HTMLTextAreaElement;
      fireEvent.change(commentTextarea, {
        target: { value: "Excellent performance" },
      });

      expect(commentTextarea.value).toBe("Excellent performance");
    });
  });

  it("should allow entering overall appraiser evaluation", async () => {
    server.use(
      http.get("/api/appraisals/1", () =>
        HttpResponse.json({
          appraisal_id: 1,
          start_date: "2024-01-01",
          end_date: "2024-12-31",
          status: "Appraiser Evaluation",
          appraisal_goals: [],
          appraiser_overall_comments: "",
          appraiser_overall_rating: null,
        })
      )
    );

    renderAppraiserEvaluation();

    await waitFor(() => {
      const overallComments = screen.getByPlaceholderText(
        /Summarize overall performance/i
      ) as HTMLTextAreaElement;
      fireEvent.change(overallComments, {
        target: { value: "Great employee" },
      });

      expect(overallComments.value).toBe("Great employee");
    });
  });

  it("should submit appraiser evaluation", async () => {
    server.use(
      http.get("/api/appraisals/1", () =>
        HttpResponse.json({
          appraisal_id: 1,
          start_date: "2024-01-01",
          end_date: "2024-12-31",
          status: "Appraiser Evaluation",
          appraisal_goals: [
            {
              id: 10,
              goal_id: 1,
              goal: {
                goal_id: 1,
                goal_title: "Technical Excellence",
                goal_weightage: 40,
              },
              appraiser_comment: "Excellent work",
              appraiser_rating: 5,
              self_comment: "",
              self_rating: 3,
            },
          ],
          appraiser_overall_comments: "Overall good",
          appraiser_overall_rating: 5,
        })
      )
    );

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    renderAppraiserEvaluation();

    await waitFor(() => {
      const submitButton = screen.getByText("Submit to Reviewer");
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/appraisals/1/appraiser-evaluation"),
        expect.objectContaining({ method: "PUT" })
      );
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/appraisals/1/status"),
        expect.objectContaining({ method: "PUT" })
      );
    });
  });
});
