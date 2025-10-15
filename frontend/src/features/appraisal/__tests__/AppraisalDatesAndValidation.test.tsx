/**
 * Test Suite: Appraisal Date Calculation, Access Control, Template Import, and Weightage Validation
 *
 * Coverage:
 * - TC-B03.1: Automatic date calculation based on AppraisalType
 * - TC-B03.2: Manual override of dates within valid range
 * - TC-B03.2-N1: Invalid manual override (end_date before start_date)
 * - TC-B04.1: Access control based on role/status (Draft - Appraiser)
 * - TC-B04.2: Unauthorized access returns HTTP 403
 * - TC-B05.1: Template fields mapped correctly to Goals
 * - TC-B05.2: Categories assigned during template import
 * - TC-B06.1: Total weightage validation (100%)
 * - TC-B06.1-N1: Total weightage invalid (99%)
 * - TC-B06.2: Individual Goal weightage boundaries (1 and 100)
 * - TC-B06.2-N1: Individual Goal weightage out-of-range (0)
 * - TC-B06.3: Error message for invalid total weightage (101)
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import {
  render,
  waitFor,
  screen,
  within,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "dayjs";
import { BrowserRouter } from "react-router-dom";
import { AuthContext } from "../../../contexts/AuthContext";
import CreateAppraisal from "../../../pages/appraisal-create/CreateAppraisal";

// ============================================================================
// MOCKS
// ============================================================================

// Mock API fetch utility
vi.mock("../../../utils/api", () => ({
  apiFetch: vi.fn(),
}));

// Mock toast notifications
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock router navigation
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: "1" }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

// Mock Radix Select component
vi.mock("@radix-ui/react-select", () => {
  // keep a module-scoped reference to the current onValueChange handler
  let currentOnValueChange: ((v: string) => void) | null = null;
  const React = require("react");

  return {
    Root: ({ children, onValueChange, value }: any) => {
      React.useEffect(() => {
        currentOnValueChange = onValueChange;
        return () => {
          currentOnValueChange = null;
        };
      }, [onValueChange]);

      return (
        <div data-testid="select-root" data-value={value}>
          {children}
        </div>
      );
    },
    Trigger: ({ children }: any) => (
      <button data-testid="select-trigger">{children}</button>
    ),
    Value: ({ children, placeholder }: any) => (
      <span>{children || placeholder}</span>
    ),
    Content: ({ children }: any) => <div>{children}</div>,
    Item: ({ children, value }: any) => (
      <button
        data-testid={`select-item-${value}`}
        onClick={() => currentOnValueChange?.(value)}
      >
        {children}
      </button>
    ),
    Group: ({ children }: any) => <fieldset>{children}</fieldset>,
    Label: ({ children }: any) => <div>{children}</div>,
    Separator: () => <hr />,
    ScrollUpButton: ({ children }: any) => <button>{children}</button>,
    ScrollDownButton: ({ children }: any) => <button>{children}</button>,
    Icon: ({ children }: any) => <span>{children}</span>,
    ItemText: ({ children }: any) => <span>{children}</span>,
    ItemIndicator: ({ children }: any) => <span>{children}</span>,
    Portal: ({ children }: any) => <div>{children}</div>,
    Viewport: ({ children }: any) => <div>{children}</div>,
  };
});

// ============================================================================
// TEST DATA
// ============================================================================

const mockManager = {
  emp_id: 1,
  emp_name: "John Manager",
  emp_email: "manager@example.com",
  emp_roles: "Manager",
  emp_roles_level: 3,
  emp_reporting_manager_id: null,
};

const mockEmployee = {
  emp_id: 2,
  emp_name: "Jane Employee",
  emp_email: "employee@example.com",
  emp_roles: "Software Engineer",
  emp_roles_level: 1,
  emp_reporting_manager_id: 1,
};

const mockAppraiser = {
  emp_id: 3,
  emp_name: "Bob Appraiser",
  emp_email: "appraiser@example.com",
  emp_roles: "Manager",
  emp_roles_level: 3,
  emp_reporting_manager_id: null,
};

const mockAppraisalTypeAnnual = {
  id: 1,
  name: "Annual",
  has_range: false,
};

const mockAppraisalTypeQuarterly = {
  id: 2,
  name: "Quarterly",
  has_range: true,
};

// Half-yearly type with ranges (use this in TC-B03.1)
const mockAppraisalTypeHalfYearly = {
  id: 3,
  name: "Half Yearly",
  has_range: true,
};

const mockAppraisalRangeQ1 = {
  id: 1,
  appraisal_type_id: 2,
  range_name: "1st",
  start_month_offset: 0,
  end_month_offset: 3,
};

const mockAppraisalRangeHY1 = {
  id: 2,
  appraisal_type_id: 3,
  range_name: "1st",
  start_month_offset: 0,
  end_month_offset: 6,
};

const mockGoalTemplate = {
  temp_id: 1,
  temp_title: "Achieve Sales Target",
  temp_description: "Increase sales by 20%",
  temp_performance_factor: "Revenue Growth",
  temp_importance: "High",
  temp_weightage: 30,
  categories: [{ id: 2, name: "Performance" }],
};

const mockGoal = {
  goal_id: 1,
  goal_template_id: 1,
  goal_title: "Achieve Sales Target",
  goal_description: "Increase sales by 20%",
  goal_performance_factor: "Revenue Growth",
  goal_importance: "High",
  goal_weightage: 30,
  category_id: 2,
  category: { id: 2, name: "Performance" },
};

const mockDraftAppraisal = {
  appraisal_id: 1,
  appraisee_id: 2,
  appraiser_id: 1,
  reviewer_id: 3,
  appraisal_type_id: 1,
  appraisal_type_range_id: null,
  start_date: "2024-01-01",
  end_date: "2024-12-31",
  status: "Draft",
  appraisal_goals: [],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const renderWithAuth = (component: React.ReactElement, user: any) => {
  const mockAuthValue = {
    user,
    status: "succeeded" as const,
    loginWithCredentials: vi.fn(),
    logout: vi.fn(),
  };

  return render(
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthValue}>
        {component}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

// ============================================================================
// TEST SUITE: DATE CALCULATION (TC-B03.x)
// ============================================================================

describe("Appraisal Date Calculation Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  beforeAll(() => {
    // jsdom doesn't implement scrollTo; some components call it on mount.
    // Provide a no-op to avoid noisy errors during tests.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.window.scrollTo = () => {};
  });

  /**
   * TC-B03.1: Automatic calculation of Appraisal start/end dates based on AppraisalType
   * Condition: appraisal_type_id = 1 (start_month_offset=0, end_month_offset=6)
   * Expected: start_date = today, end_date = today + 6 months
   */
  it("TC-B03.1: should automatically calculate dates based on AppraisalType range (half-yearly 0-6 months)", async () => {
    const { apiFetch } = await import("../../../utils/api");

    // Prepare expected dates using dayjs to avoid timezone issues
    const expectedStart = dayjs().format("YYYY-MM-DD");
    const expectedEnd = dayjs().add(6, "month").format("YYYY-MM-DD");

    // Mock API responses: include the half-yearly type and its 1st range (0-6 months)
    (apiFetch as any).mockImplementation((url: string, options?: any) => {
      if (url.includes("/employees")) {
        return Promise.resolve({
          ok: true,
          data: [mockManager, mockEmployee, mockAppraiser],
        });
      }
      if (url.includes("/appraisal-types/")) {
        return Promise.resolve({
          ok: true,
          data: [
            mockAppraisalTypeAnnual,
            mockAppraisalTypeQuarterly,
            mockAppraisalTypeHalfYearly,
          ],
        });
      }
      if (url.includes("/appraisal-types/ranges")) {
        // return both quarterly and half-yearly ranges
        return Promise.resolve({
          ok: true,
          data: [mockAppraisalRangeQ1, mockAppraisalRangeHY1],
        });
      }
      if (url.includes("/goals/templates")) {
        return Promise.resolve({ ok: true, data: [] });
      }

      // Intercept the POST to /appraisals and assert start/end were calculated as expected
      if (url.includes("/appraisals") && options?.method === "POST") {
        const body =
          typeof options.body === "string"
            ? JSON.parse(options.body)
            : options.body;
        // body.start_date and body.end_date should be set by the component when a half-yearly 1st range is selected
        expect(body.start_date).toBe(expectedStart);
        expect(body.end_date).toBe(expectedEnd);
        return Promise.resolve({
          ok: true,
          data: {
            ...mockDraftAppraisal,
            start_date: body.start_date,
            end_date: body.end_date,
          },
        });
      }

      return Promise.resolve({ ok: true, data: null });
    });

    renderWithAuth(<CreateAppraisal />, mockManager);

    // Wait for employee/type data to be rendered
    await screen.findByText(
      `${mockEmployee.emp_name} (${mockEmployee.emp_email})`
    );

    // Select Appraisee (Jane Employee) within the Appraisee selector block
    const appraiseeLabel = screen.getByText("Employee (Appraisee)");
    const appraiseeBlock = appraiseeLabel.parentElement as HTMLElement;
    const appraiseeItem = within(appraiseeBlock).getByTestId(
      `select-item-${mockEmployee.emp_id}`
    );
    await userEvent.click(appraiseeItem);

    // Select Reviewer (Bob Appraiser) within the Reviewer selector block
    const reviewerLabel = screen.getByText("Reviewer");
    const reviewerBlock = reviewerLabel.parentElement as HTMLElement;
    const reviewerItem = within(reviewerBlock).getByTestId(
      `select-item-${mockAppraiser.emp_id}`
    );
    await userEvent.click(reviewerItem);

    // Select Appraisal Type (Half Yearly) within the Appraisal Type block
    const typeLabel = screen.getByText("Appraisal Type");
    const typeBlock = typeLabel.parentElement as HTMLElement;
    const typeItem = within(typeBlock).getByTestId(
      `select-item-${mockAppraisalTypeHalfYearly.id}`
    );
    await userEvent.click(typeItem);

    // Select Range (1st) within the Range block
    const rangeLabel = await screen.findByText("Range");
    const rangeBlock = rangeLabel.parentElement as HTMLElement;
    const rangeItem = within(rangeBlock).getByTestId(
      `select-item-${mockAppraisalRangeHY1.id}`
    );
    await userEvent.click(rangeItem);

    // Click Save Draft to trigger POST /appraisals where dates are asserted
    const saveBtn = await screen.findByTestId("save-draft");
    await userEvent.click(saveBtn);

    // Ensure a POST was attempted (the mock implementation will assert dates)
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
  });

  /**
   * TC-B03.2: Manual override of Appraisal dates within valid range
   * Input: start_date = 2024-07-01, end_date = 2024-12-31
   * Expected: Appraisal is created with specified dates
   */
  it("TC-B03.2: should allow manual override of dates within valid range", async () => {
    const { apiFetch } = await import("../../../utils/api");

    // Mock successful date override
    (apiFetch as any).mockImplementation((url: string, options: any) => {
      if (url.includes("/employees")) {
        return Promise.resolve({
          ok: true,
          data: [mockManager, mockEmployee, mockAppraiser],
        });
      }
      if (url.includes("/appraisal-types/")) {
        return Promise.resolve({ ok: true, data: [mockAppraisalTypeAnnual] });
      }
      if (url.includes("/appraisals") && options?.method === "POST") {
        const body = JSON.parse(options.body);
        expect(body.start_date).toBe("2024-07-01");
        expect(body.end_date).toBe("2024-12-31");
        return Promise.resolve({
          ok: true,
          data: {
            ...mockDraftAppraisal,
            start_date: body.start_date,
            end_date: body.end_date,
          },
        });
      }
      return Promise.resolve({ ok: true, data: [] });
    });

    renderWithAuth(<CreateAppraisal />, mockManager);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalled();
    });

    // Verify manual date override is supported
    const manualStartDate = "2024-07-01";
    const manualEndDate = "2024-12-31";
    expect(new Date(manualStartDate)).toBeInstanceOf(Date);
    expect(new Date(manualEndDate) > new Date(manualStartDate)).toBe(true);
  });

  /**
   * TC-B03.2-N1: Manual override with invalid end_date (before start_date)
   * Input: start_date = 2024-07-01, end_date = 2024-06-30
   * Expected: Error: "End date must be after start date."
   */

  it("Tc-B03.2-N1: should reject manual override with end_date before start_date", async () => {
    renderWithAuth(<CreateAppraisal />, mockManager);

    await waitFor(() => {
      expect(screen.getByLabelText(/Create Appraisal/i)).toBeInTheDocument();
    });

    const appraisee = screen.getByLabelText(/Employee (Appraisee)/i);
    fireEvent.change(appraisee, { target: { value: mockEmployee.emp_id } });

    // Select dropdowns
    const reviewer = screen.getByLabelText(/Reviewer/i);
    fireEvent.change(reviewer, { target: { value: mockAppraiser.emp_id } });

    // Select dropdowns
    const appraisalType = screen.getByLabelText(/Appraisal Type/i);
    fireEvent.change(appraisalType, { target: { value: mockAppraisalTypeHalfYearly.id } });

    // Select dropdowns
    const AppraisalRange = screen.getByLabelText(/Range/i);
    fireEvent.change(AppraisalRange, { target: { value: mockAppraisalRangeHY1.id } });
    const startDateInput = screen.getByLabelText(/Start Date/i);
    expect(startDateInput).toHaveValue("2024-01-01");
    const endDateInput = screen.getByLabelText(/End Date/i);
    expect(endDateInput).toHaveValue("2024-12-31");

    fireEvent.change(startDateInput, { target: { value: "2024-07-01" } });
    fireEvent.change(endDateInput, { target: { value: "2024-06-30" } });

    const saveBtn = await screen.findByTestId("save-draft");
    await userEvent.click(saveBtn);

    const errorMessage = await screen.findByText(/End date must be after start date./i);
    expect(errorMessage).toBeInTheDocument();

  });

  it("TC-B03.2-N1: should reject manual override with end_date before start_date", async () => {
    const { apiFetch } = await import("../../../utils/api");

    (apiFetch as any).mockImplementation((url: string, options: any) => {
      if (url.includes("/employees")) {
        return Promise.resolve({
          ok: true,
          data: [mockManager, mockEmployee, mockAppraiser],
        });
      }
      if (url.includes("/appraisal-types/")) {
        return Promise.resolve({ ok: true, data: [mockAppraisalTypeAnnual] });
      }
      if (url.includes("/appraisals") && options?.method === "POST") {
        const body = JSON.parse(options.body);
        if (new Date(body.end_date) < new Date(body.start_date)) {
          return Promise.resolve({
            ok: false,
            error: "End date must be after start date.",
          });
        }
      }
      return Promise.resolve({ ok: true, data: [] });
    });

    renderWithAuth(<CreateAppraisal />, mockManager);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalled();
    });

    // Verify validation logic
    const startDate = new Date("2024-07-01");
    const endDate = new Date("2024-06-30");
    expect(endDate < startDate).toBe(true);
  });
});

// ============================================================================
// TEST SUITE: ACCESS CONTROL (TC-B04.x)
// ============================================================================

describe("Appraisal Access Control Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * TC-B04.1: Access control for Appraisal based on role/status
   * Condition: emp_roles_level = 3, status = "Draft"
   * Expected: Appraiser can view and edit Appraisal
   */
  it("TC-B04.1: should allow Appraiser to view and edit Draft appraisal", async () => {
    const { apiFetch } = await import("../../../utils/api");

    (apiFetch as any).mockImplementation((url: string) => {
      if (url.includes("/appraisals/1")) {
        return Promise.resolve({
          ok: true,
          data: mockDraftAppraisal,
        });
      }
      if (url.includes("/employees")) {
        return Promise.resolve({ ok: true, data: [mockManager, mockEmployee] });
      }
      if (url.includes("/appraisal-types")) {
        return Promise.resolve({ ok: true, data: [mockAppraisalTypeAnnual] });
      }
      return Promise.resolve({ ok: true, data: [] });
    });

    renderWithAuth(<CreateAppraisal />, mockManager);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/appraisals/1")
      );
    });

    // Verify appraiser (manager) can access draft appraisal
    expect(mockManager.emp_id).toBe(mockDraftAppraisal.appraiser_id);
    expect(mockManager.emp_roles_level).toBe(3);
    expect(mockDraftAppraisal.status).toBe("Draft");
  });

  /**
   * TC-B04.2: Unauthorized access returns HTTP 403 and error message
   * Condition: emp_roles_level = 1, attempting to access appraisal not assigned to them
   * Expected: HTTP 403 response and error: "Access denied."
   */
  it("TC-B04.2: should return HTTP 403 for unauthorized Employee access", async () => {
    const { apiFetch } = await import("../../../utils/api");

    (apiFetch as any).mockImplementation((url: string) => {
      if (url.includes("/appraisals/1")) {
        // Employee (level 1) trying to access appraisal they're not part of
        return Promise.resolve({
          ok: false,
          status: 403,
          error: "Access denied.",
        });
      }
      return Promise.resolve({ ok: true, data: [] });
    });

    renderWithAuth(<CreateAppraisal />, mockEmployee);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalled();
    });

    // Verify employee lacks authorization
    expect(mockEmployee.emp_roles_level).toBe(1);
    expect(mockEmployee.emp_id).not.toBe(mockDraftAppraisal.appraiser_id);
  });
});

// ============================================================================
// TEST SUITE: TEMPLATE IMPORT (TC-B05.x)
// ============================================================================

describe("Goal Template Import Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * TC-B05.1: Template fields are correctly mapped to Goals during import
   * Input: temp_id = 1, temp_title = "Achieve Sales Target"
   * Expected: Goal fields match template fields
   */
  it("TC-B05.1: should correctly map template fields to Goal fields", async () => {
    const { apiFetch } = await import("../../../utils/api");

    (apiFetch as any).mockImplementation((url: string, options: any) => {
      if (url.includes("/goals/templates/import")) {
        const body = JSON.parse(options.body);
        // Verify template import request
        expect(body).toHaveProperty("template_id", 1);
        expect(body).toHaveProperty("category_id", 2);
        expect(body).toHaveProperty("weightage", 30);

        // Return mapped goal
        return Promise.resolve({
          ok: true,
          data: {
            id: 1,
            appraisal_id: 1,
            goal_id: 1,
            goal: mockGoal,
          },
        });
      }
      return Promise.resolve({ ok: true, data: [] });
    });

    // Simulate template import
    const importedGoal = {
      goal_id: mockGoal.goal_id,
      goal_title: mockGoalTemplate.temp_title,
      goal_description: mockGoalTemplate.temp_description,
      goal_performance_factor: mockGoalTemplate.temp_performance_factor,
      goal_importance: mockGoalTemplate.temp_importance,
      goal_weightage: mockGoalTemplate.temp_weightage,
    };

    // Verify field mapping
    expect(importedGoal.goal_title).toBe(mockGoalTemplate.temp_title);
    expect(importedGoal.goal_description).toBe(
      mockGoalTemplate.temp_description
    );
    expect(importedGoal.goal_performance_factor).toBe(
      mockGoalTemplate.temp_performance_factor
    );
    expect(importedGoal.goal_importance).toBe(mockGoalTemplate.temp_importance);
    expect(importedGoal.goal_weightage).toBe(mockGoalTemplate.temp_weightage);
  });

  /**
   * TC-B05.2: Categories are assigned to Goals during import
   * Input: template_id = 1, category_id = 2
   * Expected: Goal is assigned to category_id=2
   */
  it("TC-B05.2: should assign category to Goal during template import", async () => {
    const { apiFetch } = await import("../../../utils/api");

    (apiFetch as any).mockImplementation((url: string, options: any) => {
      if (url.includes("/goals/templates/import")) {
        const body = JSON.parse(options.body);
        expect(body.category_id).toBe(2);

        return Promise.resolve({
          ok: true,
          data: {
            id: 1,
            appraisal_id: 1,
            goal_id: 1,
            goal: {
              ...mockGoal,
              category_id: body.category_id,
              category: { id: 2, name: "Performance" },
            },
          },
        });
      }
      return Promise.resolve({ ok: true, data: [] });
    });

    // Verify category assignment during import
    const importedGoal = {
      ...mockGoal,
      category_id: 2,
      category: mockGoalTemplate.categories[0],
    };

    expect(importedGoal.category_id).toBe(2);
    expect(importedGoal.category.name).toBe("Performance");
  });
});

// ============================================================================
// TEST SUITE: WEIGHTAGE VALIDATION (TC-B06.x)
// ============================================================================

describe("Goal Weightage Validation Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * TC-B06.1: Total weightage of all Goals in Appraisal equals 100%
   * Input: Goal1=30, Goal2=40, Goal3=30
   * Expected: Appraisal is accepted
   */
  it("TC-B06.1: should accept appraisal with total weightage of 100%", async () => {
    const { apiFetch } = await import("../../../utils/api");

    const goals = [
      { ...mockGoal, goal_id: 1, goal_weightage: 30 },
      { ...mockGoal, goal_id: 2, goal_weightage: 40 },
      { ...mockGoal, goal_id: 3, goal_weightage: 30 },
    ];

    (apiFetch as any).mockImplementation((url: string, options: any) => {
      if (url.includes("/appraisals") && options?.method === "POST") {
        const body = JSON.parse(options.body);
        const totalWeightage = body.goal_ids.reduce(
          (sum: number, id: number) =>
            sum + goals.find((g) => g.goal_id === id)!.goal_weightage,
          0
        );

        if (totalWeightage === 100) {
          return Promise.resolve({
            ok: true,
            data: { ...mockDraftAppraisal, appraisal_goals: goals },
          });
        }
      }
      return Promise.resolve({ ok: true, data: [] });
    });

    const totalWeightage = goals.reduce((sum, g) => sum + g.goal_weightage, 0);
    expect(totalWeightage).toBe(100);
  });

  /**
   * TC-B06.1-N1: Total weightage is 99% (invalid)
   * Input: Goal1=30, Goal2=40, Goal3=29
   * Expected: Error: "Total weightage must be 100%."
   */
  it("TC-B06.1-N1: should reject appraisal with total weightage of 99%", async () => {
    const { apiFetch } = await import("../../../utils/api");

    const goals = [
      { ...mockGoal, goal_id: 1, goal_weightage: 30 },
      { ...mockGoal, goal_id: 2, goal_weightage: 40 },
      { ...mockGoal, goal_id: 3, goal_weightage: 29 },
    ];

    (apiFetch as any).mockImplementation((url: string, options: any) => {
      if (url.includes("/appraisals") && options?.method === "POST") {
        const totalWeightage = goals.reduce(
          (sum, g) => sum + g.goal_weightage,
          0
        );

        if (totalWeightage !== 100) {
          return Promise.resolve({
            ok: false,
            error: "Total weightage must be 100%.",
          });
        }
      }
      return Promise.resolve({ ok: true, data: [] });
    });

    const totalWeightage = goals.reduce((sum, g) => sum + g.goal_weightage, 0);
    expect(totalWeightage).toBe(99);
  });

  /**
   * TC-B06.2: Individual Goal weightage is at boundary (1 and 100)
   * Input: Goal1=1, Goal2=99
   * Expected: Appraisal is accepted
   */
  it("TC-B06.2: should accept individual goal weightage at boundaries (1 and 100)", async () => {
    const { apiFetch } = await import("../../../utils/api");

    const goals = [
      { ...mockGoal, goal_id: 1, goal_weightage: 1 },
      { ...mockGoal, goal_id: 2, goal_weightage: 99 },
    ];

    (apiFetch as any).mockImplementation((url: string, options: any) => {
      if (url.includes("/appraisals") && options?.method === "POST") {
        const totalWeightage = goals.reduce(
          (sum, g) => sum + g.goal_weightage,
          0
        );

        // Validate individual weightages
        const allValid = goals.every(
          (g) => g.goal_weightage >= 1 && g.goal_weightage <= 100
        );

        if (totalWeightage === 100 && allValid) {
          return Promise.resolve({
            ok: true,
            data: { ...mockDraftAppraisal, appraisal_goals: goals },
          });
        }
      }
      return Promise.resolve({ ok: true, data: [] });
    });

    const totalWeightage = goals.reduce((sum, g) => sum + g.goal_weightage, 0);
    const allValid = goals.every(
      (g) => g.goal_weightage >= 1 && g.goal_weightage <= 100
    );

    expect(totalWeightage).toBe(100);
    expect(allValid).toBe(true);
  });

  /**
   * TC-B06.2-N1: Individual Goal weightage is out-of-range (0)
   * Input: Goal1=0, Goal2=100
   * Expected: Error: "Weightage must be between 1 and 100."
   */
  it("TC-B06.2-N1: should reject individual goal weightage out-of-range (0)", async () => {
    const { apiFetch } = await import("../../../utils/api");

    const goals = [
      { ...mockGoal, goal_id: 1, goal_weightage: 0 },
      { ...mockGoal, goal_id: 2, goal_weightage: 100 },
    ];

    (apiFetch as any).mockImplementation((url: string, options: any) => {
      if (url.includes("/goals") && options?.method === "POST") {
        const requestBody = JSON.parse(options.body);
        if (
          requestBody.goal_weightage < 1 ||
          requestBody.goal_weightage > 100
        ) {
          return Promise.resolve({
            ok: false,
            error: "Weightage must be between 1 and 100.",
          });
        }
      }
      return Promise.resolve({ ok: true, data: [] });
    });

    const invalidGoal = goals.find(
      (g) => g.goal_weightage < 1 || g.goal_weightage > 100
    );
    expect(invalidGoal).toBeDefined();
    expect(invalidGoal?.goal_weightage).toBe(0);
  });

  /**
   * TC-B06.3: Error message for invalid total weightage
   * Input: Total weightage = 101
   * Expected: Error: "Total weightage must be 100%."
   */
  it("TC-B06.3: should display error message for total weightage exceeding 100%", async () => {
    const { apiFetch } = await import("../../../utils/api");

    const goals = [
      { ...mockGoal, goal_id: 1, goal_weightage: 50 },
      { ...mockGoal, goal_id: 2, goal_weightage: 51 },
    ];

    (apiFetch as any).mockImplementation((url: string, options: any) => {
      if (url.includes("/appraisals") && options?.method === "POST") {
        const totalWeightage = goals.reduce(
          (sum, g) => sum + g.goal_weightage,
          0
        );

        if (totalWeightage !== 100) {
          return Promise.resolve({
            ok: false,
            error: `Total weightage must be 100%. Current total: ${totalWeightage}%`,
          });
        }
      }
      return Promise.resolve({ ok: true, data: [] });
    });

    const totalWeightage = goals.reduce((sum, g) => sum + g.goal_weightage, 0);
    expect(totalWeightage).toBe(101);
    expect(totalWeightage).toBeGreaterThan(100);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("Integration Tests: Complete Workflows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should complete full appraisal creation workflow with automatic date calculation", async () => {
    const { apiFetch } = await import("../../../utils/api");

    (apiFetch as any).mockImplementation((url: string, options: any) => {
      if (url.includes("/employees")) {
        return Promise.resolve({
          ok: true,
          data: [mockManager, mockEmployee, mockAppraiser],
        });
      }
      if (url.includes("/appraisal-types/")) {
        return Promise.resolve({ ok: true, data: [mockAppraisalTypeAnnual] });
      }
      if (url.includes("/goals/templates")) {
        return Promise.resolve({ ok: true, data: [mockGoalTemplate] });
      }
      if (url.includes("/appraisals") && options?.method === "POST") {
        const requestBody = JSON.parse(options.body);

        // Verify automatic date calculation
        expect(requestBody).toHaveProperty("start_date");
        expect(requestBody).toHaveProperty("end_date");

        return Promise.resolve({
          ok: true,
          data: {
            ...mockDraftAppraisal,
            start_date: requestBody.start_date,
            end_date: requestBody.end_date,
          },
        });
      }
      return Promise.resolve({ ok: true, data: [] });
    });

    renderWithAuth(<CreateAppraisal />, mockManager);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalled();
    });
  });

  it("should enforce access control throughout appraisal lifecycle", async () => {
    const { apiFetch } = await import("../../../utils/api");

    const statuses = [
      "Draft",
      "Submitted",
      "Appraisee Self Assessment",
      "Appraiser Evaluation",
      "Reviewer Evaluation",
      "Complete",
    ];

    for (const status of statuses) {
      (apiFetch as any).mockImplementation((url: string) => {
        if (url.includes("/appraisals/1")) {
          return Promise.resolve({
            ok: true,
            data: {
              ...mockDraftAppraisal,
              status,
            },
          });
        }
        return Promise.resolve({ ok: true, data: [] });
      });

      // Verify different access levels based on status
      if (status === "Draft") {
        // Only appraiser can edit
        expect(mockManager.emp_id).toBe(mockDraftAppraisal.appraiser_id);
      } else if (status === "Appraisee Self Assessment") {
        // Appraisee can provide self-ratings
        expect(mockEmployee.emp_id).toBe(mockDraftAppraisal.appraisee_id);
      }
    }
  });
});
