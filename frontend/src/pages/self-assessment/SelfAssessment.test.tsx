import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../../test/mocks/server";
import SelfAssessment from "./SelfAssessment";

interface Goal {
  goal_id: number;
  goal_title: string;
  goal_description?: string | null;
  goal_weightage: number;
  self_comment?: string | null;
  self_rating?: number | null;
  appraiser_comment?: string | null;
  appraiser_rating?: number | null;
}

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

const mockUser = {
  emp_id: 1,
  emp_name: "John Doe",
  emp_email: "john@company.com",
  emp_roles: "Developer",
  emp_roles_level: 3,
  emp_department: "Engineering",
};

const renderSelfAssessment = () => {
  return render(
    <BrowserRouter>
      <SelfAssessment />
    </BrowserRouter>
  );
};

describe("SelfAssessment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
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
          status: "Appraisee Self Assessment",
          appraisal_goals: [],
        })
      )
    );

    renderSelfAssessment();

    await waitFor(() => {
      expect(screen.getByText("Self Assessment")).toBeInTheDocument();
    });
  });

  it("should display goals for self assessment", async () => {
    server.use(
      http.get("/api/appraisals/1", () =>
        HttpResponse.json({
          appraisal_id: 1,
          start_date: "2024-01-01",
          end_date: "2024-12-31",
          status: "Appraisee Self Assessment",
          appraisal_goals: [
            {
              id: 10,
              goal_id: 1,
              goal: {
                goal_id: 1,
                goal_title: "Technical Excellence",
                goal_description: "Improve coding skills",
                goal_weightage: 40,
              },
              self_comment: "",
              self_rating: null,
            },
          ],
        })
      )
    );

    renderSelfAssessment();

    await waitFor(() => {
      expect(screen.getByText("Technical Excellence")).toBeInTheDocument();
      expect(screen.getByText("Improve coding skills")).toBeInTheDocument();
      expect(screen.getByText(/Weightage: 40%/i)).toBeInTheDocument();
    });
  });

  it("should allow entering self assessment comments", async () => {
    server.use(
      http.get("/api/appraisals/1", () =>
        HttpResponse.json({
          appraisal_id: 1,
          start_date: "2024-01-01",
          end_date: "2024-12-31",
          status: "Appraisee Self Assessment",
          appraisal_goals: [
            {
              id: 10,
              goal_id: 1,
              goal: {
                goal_id: 1,
                goal_title: "Technical Excellence",
                goal_weightage: 40,
              },
              self_comment: "",
              self_rating: null,
            },
          ],
        })
      )
    );

    renderSelfAssessment();

    await waitFor(() => {
      const commentTextarea = screen.getByPlaceholderText(
        /Share specific examples, achievements, challenges, and outcomes that demonstrate your performance for this goal.../i
      ) as HTMLTextAreaElement;
      fireEvent.change(commentTextarea, {
        target: { value: "I have improved significantly" },
      });

      expect(commentTextarea.value).toBe("I have improved significantly");
    });
  });

  // Slider interactions are complex; rely on seeding values for submit test

  it("should submit self assessment", async () => {
    server.use(
      http.get("/api/appraisals/1", () =>
        HttpResponse.json({
          appraisal_id: 1,
          start_date: "2024-01-01",
          end_date: "2024-12-31",
          status: "Appraisee Self Assessment",
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
            },
          ],
        })
      )
    );

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    renderSelfAssessment();

    await waitFor(() => {
      const submitButton = screen.getByText("Submit Assessment");
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/appraisals/1/self-assessment"),
        expect.objectContaining({ method: "PUT" })
      );
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/appraisals/1/status"),
        expect.objectContaining({ method: "PUT" })
      );
    });
  });
});
