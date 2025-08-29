import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AppraiserEvaluation from "./AppraiserEvaluation";
import * as api from "../../utils/api";

interface Goal {
  goal_id: number;
  goal_title: string;
  goal_weightage: number;
  self_comment?: string;
  self_rating?: number | null;
  appraiser_comment?: string;
  appraiser_rating?: number | null;
}

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
    const mockAppraisal = {
      appraisal_id: 1,
      status: "Appraiser Evaluation",
      appraisee: { emp_name: "John Doe" },
    };
    const mockGoals: Goal[] = [];

    vi.mocked(api.apiFetch).mockImplementation((url) => {
      if (url.includes("/appraisals/1"))
        return Promise.resolve({ ok: true, data: mockAppraisal });
      if (url.includes("/goals/appraisal/1"))
        return Promise.resolve({ ok: true, data: mockGoals });
      return Promise.resolve({ ok: true, data: [] });
    });

    renderAppraiserEvaluation();

    await waitFor(() => {
      expect(screen.getByText("Appraiser Evaluation")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });
  });

  it("should display goals with self assessment", async () => {
    const mockAppraisal = {
      appraisal_id: 1,
      status: "Appraiser Evaluation",
    };
    const mockGoals = [
      {
        goal_id: 1,
        goal_title: "Technical Excellence",
        goal_weightage: 40,
        self_comment: "I have improved significantly",
        self_rating: 4,
        appraiser_comment: "",
        appraiser_rating: null,
      },
    ];

    vi.mocked(api.apiFetch).mockImplementation((url) => {
      if (url.includes("/appraisals/1"))
        return Promise.resolve({ ok: true, data: mockAppraisal });
      if (url.includes("/goals/appraisal/1"))
        return Promise.resolve({ ok: true, data: mockGoals });
      return Promise.resolve({ ok: true, data: [] });
    });

    renderAppraiserEvaluation();

    await waitFor(() => {
      expect(screen.getByText("Technical Excellence")).toBeInTheDocument();
      expect(
        screen.getByText("I have improved significantly")
      ).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
    });
  });

  it("should allow entering appraiser comments", async () => {
    const mockAppraisal = {
      appraisal_id: 1,
      status: "Appraiser Evaluation",
    };
    const mockGoals = [
      {
        goal_id: 1,
        goal_title: "Technical Excellence",
        goal_weightage: 40,
        self_comment: "Good progress",
        self_rating: 4,
        appraiser_comment: "",
        appraiser_rating: null,
      },
    ];

    vi.mocked(api.apiFetch).mockImplementation((url) => {
      if (url.includes("/appraisals/1"))
        return Promise.resolve({ ok: true, data: mockAppraisal });
      if (url.includes("/goals/appraisal/1"))
        return Promise.resolve({ ok: true, data: mockGoals });
      return Promise.resolve({ ok: true, data: [] });
    });

    renderAppraiserEvaluation();

    await waitFor(() => {
      const commentTextarea = screen.getByPlaceholderText(
        /enter appraiser comments/i
      ) as HTMLTextAreaElement;
      fireEvent.change(commentTextarea, {
        target: { value: "Excellent performance" },
      });

      expect(commentTextarea.value).toBe("Excellent performance");
    });
  });

  it("should allow entering overall appraiser evaluation", async () => {
    const mockAppraisal = {
      appraisal_id: 1,
      status: "Appraiser Evaluation",
      appraiser_overall_comments: "",
      appraiser_overall_rating: null,
    };
    const mockGoals: Goal[] = [];

    vi.mocked(api.apiFetch).mockImplementation((url) => {
      if (url.includes("/appraisals/1"))
        return Promise.resolve({ ok: true, data: mockAppraisal });
      if (url.includes("/goals/appraisal/1"))
        return Promise.resolve({ ok: true, data: mockGoals });
      return Promise.resolve({ ok: true, data: [] });
    });

    renderAppraiserEvaluation();

    await waitFor(() => {
      const overallComments = screen.getByPlaceholderText(
        /overall comments/i
      ) as HTMLTextAreaElement;
      fireEvent.change(overallComments, {
        target: { value: "Great employee" },
      });

      expect(overallComments.value).toBe("Great employee");
    });
  });

  it("should submit appraiser evaluation", async () => {
    const mockAppraisal = {
      appraisal_id: 1,
      status: "Appraiser Evaluation",
    };
    const mockGoals = [
      {
        goal_id: 1,
        goal_title: "Technical Excellence",
        goal_weightage: 40,
        appraiser_comment: "Excellent work",
        appraiser_rating: 5,
      },
    ];

    vi.mocked(api.apiFetch).mockImplementation((url) => {
      if (url.includes("/appraisals/1"))
        return Promise.resolve({ ok: true, data: mockAppraisal });
      if (url.includes("/goals/appraisal/1"))
        return Promise.resolve({ ok: true, data: mockGoals });
      return Promise.resolve({ ok: true, data: [] });
    });
    vi.mocked(api.apiFetch).mockResolvedValue({ ok: true, data: {} });

    renderAppraiserEvaluation();

    await waitFor(() => {
      const submitButton = screen.getByText("Submit Evaluation");
      fireEvent.click(submitButton);
    });

    expect(api.apiFetch).toHaveBeenCalledWith("/appraisals/1/status", {
      method: "PATCH",
      body: JSON.stringify({ status: "Reviewer Evaluation" }),
    });
  });
});
