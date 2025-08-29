import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import SelfAssessment from "./SelfAssessment";
import * as api from "../../utils/api";

interface Goal {
  goal_id: number;
  goal_title: string;
  goal_description: string;
  goal_weightage: number;
  self_comment: string | null;
  self_rating: number | null;
  appraiser_comment?: string | null;
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
    const mockAppraisal = {
      appraisal_id: 1,
      status: "Appraisee Self Assessment",
      appraisal_type: { name: "Annual" },
    };
    const mockGoals: Goal[] = [];

    vi.mocked(api.apiFetch).mockImplementation((url) => {
      if (url.includes("/appraisals/1"))
        return Promise.resolve({ ok: true, data: mockAppraisal });
      if (url.includes("/goals/appraisal/1"))
        return Promise.resolve({ ok: true, data: mockGoals });
      return Promise.resolve({ ok: true, data: [] });
    });

    renderSelfAssessment();

    await waitFor(() => {
      expect(screen.getByText("Self Assessment")).toBeInTheDocument();
    });
  });

  it("should display goals for self assessment", async () => {
    const mockAppraisal = {
      appraisal_id: 1,
      status: "Appraisee Self Assessment",
    };
    const mockGoals = [
      {
        goal_id: 1,
        goal_title: "Technical Excellence",
        goal_description: "Improve coding skills",
        goal_weightage: 40,
        self_comment: "",
        self_rating: null,
      },
    ];

    vi.mocked(api.apiFetch).mockImplementation((url) => {
      if (url.includes("/appraisals/1"))
        return Promise.resolve({ ok: true, data: mockAppraisal });
      if (url.includes("/goals/appraisal/1"))
        return Promise.resolve({ ok: true, data: mockGoals });
      return Promise.resolve({ ok: true, data: [] });
    });

    renderSelfAssessment();

    await waitFor(() => {
      expect(screen.getByText("Technical Excellence")).toBeInTheDocument();
      expect(screen.getByText("Improve coding skills")).toBeInTheDocument();
      expect(screen.getByText("40%")).toBeInTheDocument();
    });
  });

  it("should allow entering self assessment comments", async () => {
    const mockAppraisal = {
      appraisal_id: 1,
      status: "Appraisee Self Assessment",
    };
    const mockGoals = [
      {
        goal_id: 1,
        goal_title: "Technical Excellence",
        goal_weightage: 40,
        self_comment: "",
        self_rating: null,
      },
    ];

    vi.mocked(api.apiFetch).mockImplementation((url) => {
      if (url.includes("/appraisals/1"))
        return Promise.resolve({ ok: true, data: mockAppraisal });
      if (url.includes("/goals/appraisal/1"))
        return Promise.resolve({ ok: true, data: mockGoals });
      return Promise.resolve({ ok: true, data: [] });
    });

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

  it("should allow selecting self rating", async () => {
    const mockAppraisal = {
      appraisal_id: 1,
      status: "Appraisee Self Assessment",
    };
    const mockGoals = [
      {
        goal_id: 1,
        goal_title: "Technical Excellence",
        goal_weightage: 40,
        self_comment: "",
        self_rating: null,
      },
    ];

    vi.mocked(api.apiFetch).mockImplementation((url) => {
      if (url.includes("/appraisals/1"))
        return Promise.resolve({ ok: true, data: mockAppraisal });
      if (url.includes("/goals/appraisal/1"))
        return Promise.resolve({ ok: true, data: mockGoals });
      return Promise.resolve({ ok: true, data: [] });
    });

    renderSelfAssessment();

    await waitFor(() => {
      // get the slider by role
      const ratingSlider = screen.getByRole("slider", { name: /rating/i });
      expect(ratingSlider).toBeInTheDocument();

      // simulate sliding to 4
      fireEvent.change(ratingSlider, { target: { value: 4 } });

      // assert the slider now shows value 4
      expect(ratingSlider).toHaveValue("4");
    });
  });

  it("should submit self assessment", async () => {
    const mockAppraisal = {
      appraisal_id: 1,
      status: "Appraisee Self Assessment",
    };
    const mockGoals = [
      {
        goal_id: 1,
        goal_title: "Technical Excellence",
        goal_weightage: 40,
        self_comment: "Good progress",
        self_rating: 4,
      },
    ];

    vi.mocked(api.apiFetch).mockImplementation((url) => {
      if (url.includes("/appraisals/1"))
        return Promise.resolve({ ok: true, data: mockAppraisal });
      if (url.includes("/goals/appraisal/1"))
        return Promise.resolve({ ok: true, data: mockGoals });
      return Promise.resolve({ ok: true, data: [] });
    });
    vi.mocked(api.apiFetch).mockResolvedValueOnce({ ok: true, data: {} });

    renderSelfAssessment();

    await waitFor(() => {
      const submitButton = screen.getByText("Submit Assessment");
      fireEvent.click(submitButton);
    });

    expect(api.apiFetch).toHaveBeenCalledWith("/appraisals/1/status", {
      method: "PATCH",
      body: JSON.stringify({ status: "Appraiser Evaluation" }),
    });
  });

  it("should show read-only view for completed assessment", async () => {
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
      },
    ];

    vi.mocked(api.apiFetch).mockImplementation((url) => {
      if (url.includes("/appraisals/1"))
        return Promise.resolve({ ok: true, data: mockAppraisal });
      if (url.includes("/goals/appraisal/1"))
        return Promise.resolve({ ok: true, data: mockGoals });
      return Promise.resolve({ ok: true, data: [] });
    });

    renderSelfAssessment();

    await waitFor(() => {
      const commentTextarea = screen.getByDisplayValue("Good progress");
      expect(commentTextarea).toBeDisabled();
    });
  });
});
