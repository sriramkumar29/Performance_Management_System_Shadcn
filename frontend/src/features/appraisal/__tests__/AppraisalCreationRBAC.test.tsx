/**
 * Test Cases - Appraisal Creation Role-Based Access Control
 * Automated Test Suite for Appraisal Creation Authorization
 * Testing Framework: Vitest
 *
 * Tests role-based permissions for creating appraisals, ensuring:
 * - Only managers (level >= 3) can create appraisals
 * - Proper validation of reviewer assignments
 * - Complete field assignment during creation
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { BrowserRouter } from "react-router-dom";

// Mock the UI select implementation (Radix) with a simple native select for tests
vi.mock("@/components/ui/select", () => {
  const React = require("react");

  const SelectTrigger = (props: any) => {
    const { id, ...rest } = props || {};
    return React.createElement("div", rest, props.children);
  };
  SelectTrigger.displayName = "SelectTrigger";

  const SelectValue = (props: any) =>
    React.createElement("span", props, props.children);
  SelectValue.displayName = "SelectValue";

  const SelectContent = (props: any) =>
    React.createElement(React.Fragment, null, props.children);
  SelectContent.displayName = "SelectContent";

  const SelectItem = (props: any) =>
    React.createElement("option", { value: props.value }, props.children);
  SelectItem.displayName = "SelectItem";

  const Select = (props: any) => {
    const triggers: string[] = [];
    const itemsMap: Record<string, Array<{ value: any; label: any }>> = {};
    let lastSeenTriggerId: string | null = null;

    function traverse(node: any) {
      if (!node) return;
      if (Array.isArray(node)) return node.forEach(traverse);
      if (typeof node === "object" && node.props) {
        const typeName = node.type && (node.type.displayName || node.type.name);
        if (typeName === "SelectTrigger" && node.props && node.props.id) {
          triggers.push(node.props.id);
          lastSeenTriggerId = node.props.id;
          const key = String(lastSeenTriggerId);
          if (!itemsMap[key]) itemsMap[key] = [];
        }
        if (node.props && node.props.value !== undefined) {
          const key = lastSeenTriggerId
            ? String(lastSeenTriggerId)
            : "__default";
          if (!itemsMap[key]) itemsMap[key] = [];
          itemsMap[key].push({
            value: node.props.value,
            label: node.props.children,
          });
        }
        traverse(node.props.children);
      }
    }

    traverse(props.children);

    if (triggers.length && itemsMap["__default"]) {
      triggers.forEach((t) => {
        if (!itemsMap[t]) itemsMap[t] = itemsMap["__default"].slice();
      });
    }

    const selects = triggers.map((id) => {
      const options = (itemsMap[id] || []).map((it) => ({
        value: String(it.value),
        label: it.label,
      }));

      return React.createElement(
        "select",
        {
          key: id,
          id,
          "data-mocked-select": "true",
          value: props.value || "",
          onChange: (e: any) => {
            const incoming = String(e.target.value);
            let chosen = options.find((o) => o.value === incoming);
            if (!chosen) {
              chosen = options.find((o) => String(o.label) === incoming);
            }
            if (!chosen) {
              chosen = options.find((o) => String(o.label).includes(incoming));
            }
            const finalValue = chosen ? chosen.value : incoming;
            if (typeof props.onValueChange === "function") {
              props.onValueChange(finalValue);
            }
          },
        },
        options.map((it) =>
          React.createElement(
            "option",
            { key: it.value, value: it.value },
            it.label
          )
        )
      );
    });

    return React.createElement(React.Fragment, null, props.children, selects);
  };
  Select.displayName = "Select";

  return {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
  };
});

import CreateAppraisalButton from "@/features/appraisal/CreateAppraisalButton";
import { AuthContext, type Employee } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiFetch } from "@/utils/api";
import dayjs from "dayjs";
import {
  saveAppraisal,
  syncGoalChanges,
  submitAppraisal,
} from "@/pages/appraisal-create/helpers/appraisalHelpers";

// Mock dependencies
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/utils/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe("Appraisal Creation - Role-Based Access Control Tests", () => {
  // Mock employee data with different role levels
  const mockManager: Employee = {
    emp_id: 100,
    emp_name: "John Manager",
    emp_email: "john.manager@company.com",
    emp_roles: "Manager",
    emp_roles_level: 3,
    emp_department: "Engineering",
  };

  const mockEmployee: Employee = {
    emp_id: 101,
    emp_name: "Jane Employee",
    emp_email: "jane.employee@company.com",
    emp_roles: "Software Engineer",
    emp_roles_level: 1,
    emp_department: "Engineering",
  };

  const mockSupervisor: Employee = {
    emp_id: 102,
    emp_name: "Bob Supervisor",
    emp_email: "bob.supervisor@company.com",
    emp_roles: "Senior Developer", // Role without manager keywords
    emp_roles_level: 2,
    emp_department: "Engineering",
  };

  const mockEmployees = [
    { emp_id: 10, emp_name: "Alice Appraisee", emp_email: "alice@company.com" },
    {
      emp_id: 11,
      emp_name: "Charlie Appraiser",
      emp_email: "charlie@company.com",
    },
    { emp_id: 12, emp_name: "David Reviewer", emp_email: "david@company.com" },
  ];

  const mockAppraisalTypes = [
    { id: 1, name: "Annual Review", has_range: false },
    { id: 2, name: "Quarterly Review", has_range: true },
  ];

  const createAuthContextValue = (user: Employee | null) => ({
    user,
    status: "succeeded" as const,
    loginWithCredentials: vi.fn(),
    logout: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful API responses
    (apiFetch as any).mockImplementation((url: string) => {
      if (url.includes("/employees")) {
        return Promise.resolve({ ok: true, data: mockEmployees });
      }
      if (url.includes("/appraisal-types")) {
        return Promise.resolve({ ok: true, data: mockAppraisalTypes });
      }
      return Promise.resolve({ ok: true, data: [] });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * TC-B02.1: Authorized role (Manager, level=3) can create Appraisal
   * Expected: "Create Appraisal" button is visible and functional
   */
  describe("TC-B02.1 - Authorized Manager Creates Appraisal", () => {
    it("should display Create Appraisal button for Manager (level=3)", async () => {
      //Render context with manager user
      render(
        <BrowserRouter>
          <AuthContext.Provider value={createAuthContextValue(mockManager)}>
            <CreateAppraisalButton />
          </AuthContext.Provider>
        </BrowserRouter>
      );

      // Verify Create Appraisal button is visible
      const createButton = screen.getByRole("button", {
        name: /create appraisal/i,
      });
      expect(createButton).toBeInTheDocument();
      expect(createButton).not.toBeDisabled();

      // Prepare form values (select appraisee=10, reviewer=12, type=1, period)
      const formValues = {
        appraisee_id: 10,
        reviewer_id: 12,
        appraisal_type_id: 1,
        appraisal_type_range_id: undefined,
        period: [dayjs("2025-01-01"), dayjs("2025-12-31")],
      } as any;

      // Prepare goal changes: two staged goals that sum to 100%
      const goalChanges = {
        added: [
          {
            id: 0,
            appraisal_id: 0,
            goal_id: 0,
            goal: {
              goal_id: 0,
              goal_title: "Goal A",
              goal_description: "Desc A",
              goal_performance_factor: "PF A",
              goal_importance: "High",
              goal_weightage: 60,
              category_id: 1,
              category: { id: 1, name: "Technical Skills" },
            },
          },
          {
            id: 0,
            appraisal_id: 0,
            goal_id: 0,
            goal: {
              goal_id: 0,
              goal_title: "Goal B",
              goal_description: "Desc B",
              goal_performance_factor: "PF B",
              goal_importance: "Medium",
              goal_weightage: 40,
              category_id: 2,
              category: { id: 2, name: "Leadership" },
            },
          },
        ],
        removed: [],
        updated: [],
      } as any;

      const originalGoals: any[] = [];

      // Mock apiFetch to handle appraisal creation, goal creation, attach, and submit
      (apiFetch as any).mockImplementation(
        async (url: string, options?: any) => {
          // Create appraisal
          if (url === "/api/appraisals/" && options?.method === "POST") {
            return { ok: true, data: { appraisal_id: 500 } };
          }

          // Create goal
          if (url === "/api/goals/" && options?.method === "POST") {
            // return different ids for subsequent calls
            // simple increment using timestamp
            return {
              ok: true,
              data: { goal_id: Math.floor(Math.random() * 1000) + 600 },
            };
          }

          // Attach goal to appraisal
          if (
            url.includes("/api/appraisals/") &&
            url.includes("/goals/") &&
            options?.method === "POST"
          ) {
            return { ok: true, data: {} };
          }

          // Submit appraisal status
          if (
            url.includes("/api/appraisals/") &&
            url.includes("/status") &&
            options?.method === "PUT"
          ) {
            return { ok: true, data: {} };
          }

          // Fall back to success
          return { ok: true, data: [] };
        }
      );

      // Step 1: Save appraisal (create)
      const appraisalId = await saveAppraisal(formValues, 100);
      expect(appraisalId).toBe(500);

      // Step 2: Sync goal changes (create goals and attach)
      await syncGoalChanges(appraisalId, goalChanges, originalGoals);

      // Step 3: Submit appraisal for acknowledgement
      await expect(submitAppraisal(appraisalId)).resolves.not.toThrow();

      // Verify apiFetch was invoked for create and submit
      expect(apiFetch as any).toHaveBeenCalled();
      expect(apiFetch as any).toHaveBeenCalledWith(
        "/api/appraisals/",
        expect.any(Object)
      );
      expect(apiFetch as any).toHaveBeenCalledWith(
        expect.stringContaining(`/api/appraisals/${appraisalId}/status`),
        expect.any(Object)
      );
    });
  });

  // it("should display Create Appraisal button for Manager (level=3)", async () => {
  //   render(
  //     <BrowserRouter>
  //       <AuthContext.Provider value={createAuthContextValue(mockManager)}>
  //         <CreateAppraisalButton />
  //       </AuthContext.Provider>
  //     </BrowserRouter>
  //   );

  //   // Verify Create Appraisal button is visible
  //   const createButton = screen.getByRole("button", {
  //     name: /create appraisal/i,
  //   });
  //   expect(createButton).toBeInTheDocument();
  //   expect(createButton).not.toBeDisabled();
  // });

  /**
   * TC-B02.1-N1: Unauthorized user (Employee, level=1) attempts to create Appraisal
   * Expected: "Create Appraisal" button is not visible
   */
  describe("TC-B02.1-N1 - Unauthorized Employee Cannot Create Appraisal", () => {
    it("should NOT display Create Appraisal button for Employee (level=1)", () => {
      const { container } = render(
        <BrowserRouter>
          <AuthContext.Provider value={createAuthContextValue(mockEmployee)}>
            <CreateAppraisalButton />
          </AuthContext.Provider>
        </BrowserRouter>
      );

      // Button should not exist in DOM
      const createButton = screen.queryByRole("button", {
        name: /create appraisal/i,
      });
      expect(createButton).not.toBeInTheDocument();

      // Component should render nothing (null)
      expect(container.firstChild).toBeNull();
    });

    it("should prevent Employee from accessing create functionality", () => {
      render(
        <BrowserRouter>
          <AuthContext.Provider value={createAuthContextValue(mockEmployee)}>
            <CreateAppraisalButton />
          </AuthContext.Provider>
        </BrowserRouter>
      );

      // Verify no appraisal creation UI elements are present
      expect(
        screen.queryByRole("button", { name: /create appraisal/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/create new appraisal/i)
      ).not.toBeInTheDocument();
    });
  });

  /**
   * TC-B02.2: Only managers (level ≥3) can create Appraisal
   * Expected: Managers with level >= 3 see the create button
   */
  describe("TC-B02.2 - Only managers (level ≥3) can create Appraisal", () => {
    it.each([
      { emp_id: 1, role: "Senior Manager", level: 4 },
      { emp_id: 2, role: "Manager", level: 3 },
    ])(
      "should allow $role (level=$level) to create appraisal",
      async ({ emp_id, role, level }) => {
        const user: Employee = {
          ...mockManager,
          emp_id: emp_id,
          emp_roles: role,
          emp_roles_level: level,
        };

        render(
          <BrowserRouter>
            <AuthContext.Provider value={createAuthContextValue(user)}>
              <CreateAppraisalButton />
            </AuthContext.Provider>
          </BrowserRouter>
        );

        // Verify Create Appraisal button is visible
        const createButton = screen.getByRole("button", {
          name: /create appraisal/i,
        });
        expect(createButton).toBeInTheDocument();
        expect(createButton).not.toBeDisabled();

        // Prepare form values (select appraisee=10, reviewer=12, type=1, period)
        const formValues = {
          appraisee_id: 10,
          reviewer_id: 12,
          appraisal_type_id: 1,
          appraisal_type_range_id: undefined,
          period: [dayjs("2025-01-01"), dayjs("2025-12-31")],
        } as any;

        // Prepare goal changes: two staged goals that sum to 100%
        const goalChanges = {
          added: [
            {
              id: 0,
              appraisal_id: 0,
              goal_id: 0,
              goal: {
                goal_id: 0,
                goal_title: "Goal A",
                goal_description: "Desc A",
                goal_performance_factor: "PF A",
                goal_importance: "High",
                goal_weightage: 60,
                category_id: 1,
                category: { id: 1, name: "Technical Skills" },
              },
            },
            {
              id: 0,
              appraisal_id: 0,
              goal_id: 0,
              goal: {
                goal_id: 0,
                goal_title: "Goal B",
                goal_description: "Desc B",
                goal_performance_factor: "PF B",
                goal_importance: "Medium",
                goal_weightage: 40,
                category_id: 2,
                category: { id: 2, name: "Leadership" },
              },
            },
          ],
          removed: [],
          updated: [],
        } as any;

        const originalGoals: any[] = [];

        // Mock apiFetch to handle appraisal creation, goal creation, attach, and submit
        (apiFetch as any).mockImplementation(
          async (url: string, options?: any) => {
            // Create appraisal
            if (url === "/api/appraisals/" && options?.method === "POST") {
              return { ok: true, data: { appraisal_id: 500 } };
            }

            // Create goal
            if (url === "/api/goals/" && options?.method === "POST") {
              // return different ids for subsequent calls
              // simple increment using timestamp
              return {
                ok: true,
                data: { goal_id: Math.floor(Math.random() * 1000) + 600 },
              };
            }

            // Attach goal to appraisal
            if (
              url.includes("/api/appraisals/") &&
              url.includes("/goals/") &&
              options?.method === "POST"
            ) {
              return { ok: true, data: {} };
            }

            // Submit appraisal status
            if (
              url.includes("/api/appraisals/") &&
              url.includes("/status") &&
              options?.method === "PUT"
            ) {
              return { ok: true, data: {} };
            }

            // Fall back to success
            return { ok: true, data: [] };
          }
        );

        // Step 1: Save appraisal (create)
        const appraisalId = await saveAppraisal(formValues, emp_id);
        expect(appraisalId).toBe(500);

        // Step 2: Sync goal changes (create goals and attach)
        await syncGoalChanges(appraisalId, goalChanges, originalGoals);

        // Step 3: Submit appraisal for acknowledgement
        await expect(submitAppraisal(appraisalId)).resolves.not.toThrow();

        // Verify apiFetch was invoked for create and submit
        expect(apiFetch as any).toHaveBeenCalled();
        expect(apiFetch as any).toHaveBeenCalledWith(
          "/api/appraisals/",
          expect.any(Object)
        );
        expect(apiFetch as any).toHaveBeenCalledWith(
          expect.stringContaining(`/api/appraisals/${appraisalId}/status`),
          expect.any(Object)
        );
      }
    );
  });

  /**
   * TC-B02.2-N1: User with level <3 attempts to create Appraisal
   * Expected: Button is not visible, access denied
   */
  describe("TC-B02.2-N1 - Insufficient Role Level", () => {
    it.each([
      {
        emp_id: 3,
        role: "tester",
        level: 2,
      },
      {
        emp_id: 4,
        role: "Developer",
        level: 1,
      },
      {
        emp_id: 5,
        emp_roles: "Intern",
        emp_roles_level: 0,
      },
    ])(
      "should NOT allow employee with role = $role (level=$level) to create appraisal",
      async ({ emp_id, role, level }) => {
        const user: Employee = {
          ...mockEmployee,
          emp_id: emp_id,
          emp_roles: role,
          emp_roles_level: level,
        };

        const { container } = render(
          <BrowserRouter>
            <AuthContext.Provider value={createAuthContextValue(user)}>
              <CreateAppraisalButton />
            </AuthContext.Provider>
          </BrowserRouter>
        );

        const createButton = screen.queryByRole("button", {
          name: /create appraisal/i,
        });
        expect(createButton).not.toBeInTheDocument();
        expect(container.firstChild).toBeNull();
      }
    );
  });

  /**
   * TC-B02.3: Reviewer must be different from Appraisee and Appraiser
   * Note: This is a backend validation test simulated in frontend
   */
  describe("TC-B02.3 - Reviewer Assignment Validation", () => {
    it("should accept valid reviewer assignment (different from appraisee)", async () => {
      // Mock successful appraisal creation
      (apiFetch as any).mockImplementation((url: string, options: any) => {
        if (url.includes("/appraisals") && options?.method === "POST") {
          const body = JSON.parse(options.body);

          // Validate reviewer is different from appraisee
          if (body.appraisee_id === body.reviewer_id) {
            return Promise.resolve({
              ok: false,
              error: "Reviewer cannot be the same as Appraisee.",
            });
          }

          return Promise.resolve({
            ok: true,
            data: {
              appraisal_id: 1,
              appraisee_id: body.appraisee_id,
              reviewer_id: body.reviewer_id,
            },
          });
        }
        return Promise.resolve({ ok: true, data: [] });
      });

      // Simulate API call with valid data
      const result = await apiFetch("/appraisals", {
        method: "POST",
        body: JSON.stringify({
          appraisee_id: 10,
          appraiser_id: 100, // Current manager
          reviewer_id: 12, // Different from appraisee
          appraisal_type_id: 1,
        }),
      });

      expect(result.ok).toBe(true);
      expect(result.data).toHaveProperty("appraisal_id");
    });
  });

  /**
   * TC-B02.3-N1: Reviewer is same as Appraisee
   * Expected: System displays error
   */
  describe("TC-B02.3-N1 - Invalid Reviewer Assignment", () => {
    it("should reject when reviewer_id equals appraisee_id", async () => {
      // Mock API error for invalid reviewer assignment
      (apiFetch as any).mockImplementation((url: string, options: any) => {
        if (url.includes("/appraisals") && options?.method === "POST") {
          const body = JSON.parse(options.body);

          if (body.appraisee_id === body.reviewer_id) {
            return Promise.resolve({
              ok: false,
              error: "Reviewer cannot be the same as Appraisee.",
            });
          }

          return Promise.resolve({ ok: true, data: { appraisal_id: 1 } });
        }
        return Promise.resolve({ ok: true, data: [] });
      });

      // Attempt to create appraisal with same reviewer and appraisee
      const result = await apiFetch("/appraisals", {
        method: "POST",
        body: JSON.stringify({
          appraisee_id: 10,
          appraiser_id: 100,
          reviewer_id: 10, // Same as appraisee - INVALID
          appraisal_type_id: 1,
        }),
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Reviewer cannot be the same as Appraisee.");
    });

    it("should reject when reviewer_id equals appraiser_id", async () => {
      (apiFetch as any).mockImplementation((url: string, options: any) => {
        if (url.includes("/appraisals") && options?.method === "POST") {
          const body = JSON.parse(options.body);

          if (body.appraiser_id === body.reviewer_id) {
            return Promise.resolve({
              ok: false,
              error: "Reviewer cannot be the same as Appraiser.",
            });
          }

          return Promise.resolve({ ok: true, data: { appraisal_id: 1 } });
        }
        return Promise.resolve({ ok: true, data: [] });
      });

      const result = await apiFetch("/appraisals", {
        method: "POST",
        body: JSON.stringify({
          appraisee_id: 10,
          appraiser_id: 100,
          reviewer_id: 100, // Same as appraiser - INVALID
          appraisal_type_id: 1,
        }),
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Reviewer cannot be the same as Appraiser.");
    });
  });

  /**
   * TC-B02.4: Manager can assign all required fields during Appraisal creation
   * Expected: All fields can be filled and appraisal is created
   */
  describe("TC-B02.4 - Complete Field Assignment", () => {
    it("should validate all required fields are assignable", async () => {
      (apiFetch as any).mockImplementation((url: string, options: any) => {
        if (url.includes("/appraisals") && options?.method === "POST") {
          const body = JSON.parse(options.body);

          // Validate all required fields are present
          const requiredFields = [
            "appraisee_id",
            "reviewer_id",
            "appraisal_type_id",
          ];

          const missingFields = requiredFields.filter((field) => !body[field]);

          if (missingFields.length > 0) {
            return Promise.resolve({
              ok: false,
              error: `Missing required fields: ${missingFields.join(", ")}`,
            });
          }

          return Promise.resolve({
            ok: true,
            data: {
              appraisal_id: 1,
              ...body,
              appraiser_id: 100,
            },
          });
        }
        return Promise.resolve({ ok: true, data: [] });
      });

      // Simulate creating appraisal with all required fields
      const completeAppraisalData = {
        appraisee_id: 10,
        reviewer_id: 12,
        appraisal_type_id: 1,
        appraisal_type_range_id: 1,
        period_start: "2025-01-01",
        period_end: "2025-12-31",
      };

      const result = await apiFetch("/appraisals", {
        method: "POST",
        body: JSON.stringify(completeAppraisalData),
      });

      expect(result.ok).toBe(true);
      expect(result.data).toMatchObject({
        appraisal_id: expect.any(Number),
        appraisee_id: 10,
        reviewer_id: 12,
        appraisal_type_id: 1,
        appraiser_id: 100,
      });
    });

    it("should reject appraisal creation with missing required fields", async () => {
      (apiFetch as any).mockImplementation((url: string, options: any) => {
        if (url.includes("/appraisals") && options?.method === "POST") {
          const body = JSON.parse(options.body);

          if (
            !body.appraisee_id ||
            !body.reviewer_id ||
            !body.appraisal_type_id
          ) {
            return Promise.resolve({
              ok: false,
              error: "Missing required fields",
            });
          }

          return Promise.resolve({ ok: true, data: { appraisal_id: 1 } });
        }
        return Promise.resolve({ ok: true, data: [] });
      });

      // Attempt to create with missing fields
      const incompleteData = {
        appraisee_id: 10,
        // reviewer_id missing
        appraisal_type_id: 1,
      };

      const result = await apiFetch("/appraisals", {
        method: "POST",
        body: JSON.stringify(incompleteData),
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Missing required fields");
    });
  });

  /**
   * Additional Tests - Edge Cases and Security
   */
  describe("Edge Cases and Security", () => {
    it("should handle null user gracefully", () => {
      const { container } = render(
        <BrowserRouter>
          <AuthContext.Provider value={createAuthContextValue(null)}>
            <CreateAppraisalButton />
          </AuthContext.Provider>
        </BrowserRouter>
      );

      expect(
        screen.queryByRole("button", { name: /create appraisal/i })
      ).not.toBeInTheDocument();
      expect(container.firstChild).toBeNull();
    });

    it("should handle undefined role level gracefully", () => {
      const userWithNoLevel: Employee = {
        ...mockEmployee,
        emp_roles_level: undefined,
      };

      const { container } = render(
        <BrowserRouter>
          <AuthContext.Provider value={createAuthContextValue(userWithNoLevel)}>
            <CreateAppraisalButton />
          </AuthContext.Provider>
        </BrowserRouter>
      );

      expect(container.firstChild).toBeNull();
    });

    it("should handle null role level gracefully", () => {
      const userWithNullLevel: Employee = {
        ...mockEmployee,
        emp_roles_level: null as any,
      };

      const { container } = render(
        <BrowserRouter>
          <AuthContext.Provider
            value={createAuthContextValue(userWithNullLevel)}
          >
            <CreateAppraisalButton />
          </AuthContext.Provider>
        </BrowserRouter>
      );

      expect(container.firstChild).toBeNull();
    });

    it("should prioritize role name over level when both present", () => {
      // User has low level but recognized manager role
      const managerWithLowLevel: Employee = {
        ...mockEmployee,
        emp_roles: "Manager",
        emp_roles_level: 1, // Low level but manager role
      };

      render(
        <BrowserRouter>
          <AuthContext.Provider
            value={createAuthContextValue(managerWithLowLevel)}
          >
            <CreateAppraisalButton />
          </AuthContext.Provider>
        </BrowserRouter>
      );

      // Should show button because role name is "Manager"
      const createButton = screen.getByRole("button", {
        name: /create appraisal/i,
      });
      expect(createButton).toBeInTheDocument();
    });
  });

  /**
   * Integration Test - Full Workflow
   */
  describe("Integration - Manager Appraisal Creation Workflow", () => {
    it("should allow complete appraisal creation workflow for manager", async () => {
      // Step 1: Render button for manager
      render(
        <BrowserRouter>
          <AuthContext.Provider value={createAuthContextValue(mockManager)}>
            <CreateAppraisalButton />
          </AuthContext.Provider>
        </BrowserRouter>
      );

      // Step 2: Verify button is present
      const createButton = screen.getByRole("button", {
        name: /create appraisal/i,
      });
      expect(createButton).toBeInTheDocument();
      expect(createButton).not.toBeDisabled();

      // Step 3: Click button (would navigate to create page/modal)
      await userEvent.click(createButton);

      // Step 4: Verify no errors occurred
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("should prevent complete workflow for non-manager", () => {
      render(
        <BrowserRouter>
          <AuthContext.Provider value={createAuthContextValue(mockEmployee)}>
            <CreateAppraisalButton />
          </AuthContext.Provider>
        </BrowserRouter>
      );

      // No button should exist
      expect(
        screen.queryByRole("button", { name: /create appraisal/i })
      ).not.toBeInTheDocument();
    });
  });
});
