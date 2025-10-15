/**
 * Test Cases - Goal Weightage and Category Assignment
 * Automated Test Suite for Goal Creation Modal
 * Testing Framework: Vitest
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi, beforeAll } from "vitest";
// Mock the UI select implementation (Radix) with a simple native select for tests
vi.mock("@/components/ui/select", () => {
  const React = require("react");

  const SelectTrigger = (props: any) => {
    // placeholder - actual native select will be injected by Select
    // do NOT render the id on the trigger element so label htmlFor resolves to the injected <select>
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
    // Traverse children to collect triggers (ids) and items per trigger
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
          // assign to the last seen trigger if available, otherwise push to a default bucket
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

    // If there are triggers but some have no items, try to fallback to __default
    if (triggers.length && itemsMap["__default"]) {
      triggers.forEach((t) => {
        if (!itemsMap[t]) itemsMap[t] = itemsMap["__default"].slice();
      });
    }

    // Render original children (so Dialog and other markup remain) and inject native selects per trigger
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
            // try to find an exact value match
            let chosen = options.find((o) => o.value === incoming);
            if (!chosen) {
              // try exact label match or label contains incoming
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

import AddGoalModal from "@/features/goals/AddGoalModal";
import EditGoalModal from "@/features/goals/EditGoalModal";
import { toast } from "sonner";
import { apiFetch } from "@/utils/api";
import { fireEvent } from "@testing-library/react";

beforeAll(() => {
  window.HTMLElement.prototype.hasPointerCapture = () => false;
});

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

describe("Goal Weightage and Category Assignment - Black Box Tests", () => {
  // Mock categories data
  const mockCategories = [
    { id: 1, name: "Technical Skills" },
    { id: 2, name: "Leadership" },
    { id: 3, name: "Communication" },
  ];

  // Mock goal data
  const mockGoalData = {
    id: 1,
    appraisal_id: 100,
    goal_id: 1,
    goal: {
      goal_id: 1,
      goal_title: "Test Goal",
      goal_description: "Test Description",
      goal_performance_factor: "Test Factor",
      goal_importance: "High",
      goal_weightage: 30,
      category_id: 1,
      category: { id: 1, name: "Technical Skills" },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful category fetch
    (apiFetch as any).mockResolvedValue({
      ok: true,
      data: mockCategories,
    });
  });

  /**
   * TC-B01.1: Validate that Goal weightage accepts valid values (1–100)
   * Expected: Goal is created successfully with weightage=50
   */
  describe("TC-B01.1 - Valid Weightage (50%)", () => {
    it("should create goal successfully with weightage=50", async () => {
      const onGoalAdded = vi.fn();
      const onClose = vi.fn();

      // Mock API fetch for categories
      (apiFetch as any).mockResolvedValue({
        ok: true,
        data: [
          { id: 1, name: "Technical Skills" },
          { id: 2, name: "Leadership" },
          { id: 3, name: "Communication" },
        ],
      });

      render(
        <AddGoalModal
          open={true}
          onClose={onClose}
          onGoalAdded={onGoalAdded}
          remainingWeightage={100}
        />
      );

      // Wait for form to render
      const titleInput = await screen.findByLabelText(/goal title/i);
      expect(titleInput).toBeInTheDocument();

      console.log("Filling goal title");
      await userEvent.type(titleInput, "Improve Team Leadership Skills");

      console.log("Filling goal description");
      await userEvent.type(
        screen.getByLabelText(/goal description/i),
        "Develop and demonstrate effective team leadership"
      );

      console.log("Filling performance factor");
      await userEvent.type(
        screen.getByLabelText(/performance factor/i),
        "Leadership & Management"
      );

      // Set Importance (Radix Select) using fireEvent
      console.log("Filling importance level");
      const importanceSelect = screen.getByLabelText(/importance level/i);
      fireEvent.change(importanceSelect, {
        target: { value: "🔴 High Priority" },
      });

      // Set Category - use numeric ID (2 = Leadership)
      console.log("Filling category");
      const categorySelect = screen.getByLabelText(/category/i);
      fireEvent.change(categorySelect, { target: { value: "2" } });

      // Set Weightage
      console.log("Filling weightage");
      const weightageInput = screen.getByLabelText(/weightage/i);
      await userEvent.clear(weightageInput);
      await userEvent.type(weightageInput, "50");

      console.log("Clicking Add Goal button");
      const submitButton = screen.getByRole("button", { name: /add goal/i });
      await userEvent.click(submitButton);

      // Verify success toast
      console.log("Toast should appear");
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Goal added to appraisal",
          expect.objectContaining({
            description: "Staged. Save to apply changes.",
          })
        );
      });

      // Verify callbacks
      expect(onGoalAdded).toHaveBeenCalledWith(
        expect.objectContaining({
          goal: expect.objectContaining({
            goal_weightage: 50,
            goal_title: "Improve Team Leadership Skills",
          }),
        })
      );
      expect(onClose).toHaveBeenCalled();

      // Optional: Print current DOM state
      screen.debug();
    });
  });

  /**
   * TC-B01.1-N1: Attempt to create Goal with invalid weightage (0)
   * Expected: System displays validation error
   */
  describe("TC-B01.1-N1 - Invalid Weightage (0)", () => {
    it("should reject weightage of 0", async () => {
      const onGoalAdded = vi.fn();
      const onClose = vi.fn();

      render(
        <AddGoalModal
          open={true}
          onClose={onClose}
          onGoalAdded={onGoalAdded}
          remainingWeightage={100}
        />
      );

      // Wait for form to render
      const titleInput = await screen.findByLabelText(/goal title/i);
      expect(titleInput).toBeInTheDocument();

      console.log("Filling goal title");
      await userEvent.type(titleInput, "Test Goal");

      console.log("Filling goal description");
      await userEvent.type(
        screen.getByLabelText(/goal description/i),
        "Test Description"
      );

      console.log("Filling performance factor");
      await userEvent.type(
        screen.getByLabelText(/performance factor/i),
        "Test Factor"
      );

      // Set Importance (Radix Select) using fireEvent
      console.log("Filling importance level");
      const importanceSelect = screen.getByLabelText(/importance level/i);
      fireEvent.change(importanceSelect, {
        target: { value: "🟡 Medium Priority" },
      });

      // Set Category
      console.log("Filling category");
      const categorySelect = screen.getByLabelText(/category/i);
      fireEvent.change(categorySelect, {
        target: { value: "1" },
      });

      // Try to enter 0 weightage (HTML5 validation should prevent or treat as empty)
      const weightageInput = screen.getByLabelText(/weightage/i);
      await userEvent.clear(weightageInput);
      await userEvent.type(weightageInput, "0");

      // Attempt submit with 0 or empty weightage by submitting form directly
      console.log("Submitting form");
      const form = screen
        .getByRole("dialog")
        .querySelector("form") as HTMLFormElement;
      fireEvent.submit(form);

      // Should show error (0 gets coerced to falsy, triggers "Please complete all fields" error)
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Please complete all fields before submitting"
        );
      });

      expect(onGoalAdded).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  /**
   * TC-B01.1-N2: Attempt to create Goal with null/empty weightage
   * Expected: System displays error about incomplete fields
   */
  describe("TC-B01.1-N2 - Null/Empty Weightage", () => {
    it("should reject empty weightage", async () => {
      const onGoalAdded = vi.fn();

      render(
        <AddGoalModal
          open={true}
          onClose={vi.fn()}
          onGoalAdded={onGoalAdded}
          remainingWeightage={100}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/goal title/i)).toBeInTheDocument();
      });

      // Fill all fields except weightage
      await userEvent.type(
        screen.getByLabelText(/goal title/i),
        "Product Knowledge Enhancement"
      );
      await userEvent.type(
        screen.getByLabelText(/goal description/i),
        "Master product features"
      );
      await userEvent.type(
        screen.getByLabelText(/performance factor/i),
        "Technical Skills"
      );

      // Select importance and category
      const importanceSelect = screen.getByLabelText(/importance level/i);
      await userEvent.click(importanceSelect);
      fireEvent.change(screen.getByLabelText(/importance level/i), {
        target: { value: "High" },
      });

      const categorySelect = screen.getByLabelText(/category/i);
      await userEvent.click(categorySelect);
      fireEvent.change(screen.getByLabelText(/category/i), {
        target: { value: "Technical Skills" },
      });

      // Leave weightage empty
      // Submit by submitting form directly
      const form = screen
        .getByRole("dialog")
        .querySelector("form") as HTMLFormElement;
      fireEvent.submit(form);

      // Should show error
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Please complete all fields before submitting"
        );
      });

      expect(onGoalAdded).not.toHaveBeenCalled();
    });
  });

  /**
   * TC-B01.2: Validate boundary values (1 and 100)
   * Expected: Both goals are created successfully
   */
  describe("TC-B01.2 - Boundary Values", () => {
    it.each([
      { value: "1", label: "minimum boundary value (1%)" },
      { value: "100", label: "maximum boundary value (100%)" },
    ])("should accept $label", async ({ value }) => {
      const onGoalAdded = vi.fn();

      render(
        <AddGoalModal
          open={true}
          onClose={vi.fn()}
          onGoalAdded={onGoalAdded}
          remainingWeightage={100}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/weightage/i)).toBeInTheDocument();
      });

      // Fill form fields
      await userEvent.type(
        screen.getByLabelText(/goal title/i),
        "Boundary Goal"
      );
      await userEvent.type(
        screen.getByLabelText(/goal description/i),
        `Testing boundary ${value}`
      );
      await userEvent.type(
        screen.getByLabelText(/performance factor/i),
        "Performance"
      );

      // Select dropdowns
      const importanceSelect = screen.getByLabelText(/importance level/i);
      fireEvent.change(importanceSelect, { target: { value: "High" } });

      const categorySelect = screen.getByLabelText(/category/i);
      fireEvent.change(categorySelect, {
        target: { value: "Technical Skills" },
      });

      // Enter boundary weightage
      const weightageInput = screen.getByLabelText(/weightage/i);
      await userEvent.clear(weightageInput);
      await userEvent.type(weightageInput, value);

      // Submit form
      const form = screen
        .getByRole("dialog")
        .querySelector("form") as HTMLFormElement;
      fireEvent.submit(form);

      // Verify toast + callback
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });

      expect(onGoalAdded).toHaveBeenCalledWith(
        expect.objectContaining({
          goal: expect.objectContaining({
            goal_weightage: Number(value),
          }),
        })
      );
    });
  });

  /**
   * TC-B01.2-N1: Attempt to create Goal with out-of-range weightage (101)
   * Expected: System displays error
   */
  describe("TC-B01.2-N1 - Upper Boundary Exceeded", () => {
    it("should reject weightage of 101", async () => {
      const onGoalAdded = vi.fn();

      render(
        <AddGoalModal
          open={true}
          onClose={vi.fn()}
          onGoalAdded={onGoalAdded}
          remainingWeightage={100}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/weightage/i)).toBeInTheDocument();
      });

      const weightageInput = screen.getByLabelText(/weightage/i);
      await userEvent.clear(weightageInput);
      await userEvent.type(weightageInput, "101");

      // Fill other fields
      await userEvent.type(
        screen.getByLabelText(/goal title/i),
        "Exceeding Maximum"
      );
      await userEvent.type(
        screen.getByLabelText(/goal description/i),
        "Testing upper boundary violation"
      );
      await userEvent.type(
        screen.getByLabelText(/performance factor/i),
        "Performance"
      );

      const importanceSelect = screen.getByLabelText(/importance level/i);
      await userEvent.click(importanceSelect);
      fireEvent.change(screen.getByLabelText(/importance level/i), {
        target: { value: "Medium" },
      });

      const categorySelect = screen.getByLabelText(/category/i);
      await userEvent.click(categorySelect);
      fireEvent.change(screen.getByLabelText(/category/i), {
        target: { value: "Technical Skills" },
      });

      const form = screen
        .getByRole("dialog")
        .querySelector("form") as HTMLFormElement;
      fireEvent.submit(form);

      // Should either prevent submission or show error
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      expect(onGoalAdded).not.toHaveBeenCalled();
    });
  });

  /**
   * TC-B01.3: Assign Goal to existing Category
   * Expected: Goal is assigned to "Leadership" category
   */
  describe("TC-B01.3 - Valid Category Assignment", () => {
    it("should assign goal to existing category successfully", async () => {
      const onGoalAdded = vi.fn();

      render(
        <AddGoalModal
          open={true}
          onClose={vi.fn()}
          onGoalAdded={onGoalAdded}
          remainingWeightage={100}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      });

      // Fill all fields
      await userEvent.type(
        screen.getByLabelText(/goal title/i),
        "Strategic Planning Excellence"
      );
      await userEvent.type(
        screen.getByLabelText(/goal description/i),
        "Develop strategic planning capabilities"
      );
      await userEvent.type(
        screen.getByLabelText(/performance factor/i),
        "Strategic Thinking"
      );

      const importanceSelect = screen.getByLabelText(/importance level/i);
      fireEvent.change(importanceSelect, { target: { value: "High" } });

      // Select Leadership category (ID=2) - use numeric value directly
      const categorySelect = screen.getByLabelText(/category/i);
      fireEvent.change(categorySelect, { target: { value: "2" } });

      const weightageInput = screen.getByLabelText(/weightage/i);
      await userEvent.clear(weightageInput);
      await userEvent.type(weightageInput, "30");

      const form = screen
        .getByRole("dialog")
        .querySelector("form") as HTMLFormElement;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });

      expect(onGoalAdded).toHaveBeenCalledWith(
        expect.objectContaining({
          goal: expect.objectContaining({
            category_id: 2,
            category: expect.objectContaining({
              id: 2,
              name: "Leadership",
            }),
          }),
        })
      );
    });
  });

  /**
   * TC-B01.3-N1: Attempt to assign Goal to non-existent Category
   * Expected: Frontend prevents selection of non-existent category
   */
  describe("TC-B01.3-N1 - Non-existent Category", () => {
    it("should not show non-existent category in dropdown", async () => {
      render(
        <AddGoalModal
          open={true}
          onClose={vi.fn()}
          onGoalAdded={vi.fn()}
          remainingWeightage={100}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      });

      // Verify that only existing categories are shown (allow for portal duplicates)
      expect(screen.getAllByText("Technical Skills").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Leadership").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Communication").length).toBeGreaterThan(0);

      // Non-existent category should not be present
      expect(
        screen.queryByText("Non-Existent Category")
      ).not.toBeInTheDocument();
    });
  });

  /**
   * TC-B01.3-N2: Attempt to create Goal without selecting category
   * Expected: Validation error
   */
  describe("TC-B01.3-N2 - Missing Category", () => {
    it("should reject goal creation without category", async () => {
      const onGoalAdded = vi.fn();

      render(
        <AddGoalModal
          open={true}
          onClose={vi.fn()}
          onGoalAdded={onGoalAdded}
          remainingWeightage={100}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/goal title/i)).toBeInTheDocument();
      });

      // Fill all fields EXCEPT category
      await userEvent.type(
        screen.getByLabelText(/goal title/i),
        "Quality Improvement"
      );
      await userEvent.type(
        screen.getByLabelText(/goal description/i),
        "Enhance quality standards"
      );
      await userEvent.type(
        screen.getByLabelText(/performance factor/i),
        "Quality Control"
      );

      const importanceSelect = screen.getByLabelText(/importance level/i);
      await userEvent.click(importanceSelect);
      fireEvent.change(screen.getByLabelText(/importance level/i), {
        target: { value: "Medium" },
      });

      const weightageInput = screen.getByLabelText(/weightage/i);
      await userEvent.clear(weightageInput);
      await userEvent.type(weightageInput, "20");

      // Do NOT select category - leave it empty

      const form = screen
        .getByRole("dialog")
        .querySelector("form") as HTMLFormElement;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Please complete all fields before submitting"
        );
      });

      expect(onGoalAdded).not.toHaveBeenCalled();
    });
  });

  /**
   * TC-B01.4: Edit all fields of an existing Goal
   * Expected: Goal fields are updated and changes are reflected
   */
  describe("TC-B01.4 - Edit all fields of an existing Goal", () => {
    it("should update goal fields and reflect changes for goal_id=10", async () => {
      const onGoalUpdated = vi.fn();

      // Existing goal (goal_id = 10) with initial weightage 20
      const existingGoal = {
        id: 10,
        appraisal_id: 100,
        goal_id: 10,
        goal: {
          goal_id: 10,
          goal_title: "Old Title",
          goal_description: "Old Description",
          goal_performance_factor: "Old Factor",
          goal_importance: "Medium",
          goal_weightage: 20,
          category_id: 1,
          category: { id: 1, name: "Technical Skills" },
        },
      };

      // Render EditGoalModal with enough remaining weightage to allow update to 40
      render(
        <EditGoalModal
          open={true}
          onClose={vi.fn()}
          onGoalUpdated={onGoalUpdated}
          goalData={existingGoal}
          remainingWeightage={100}
        />
      );

      // Wait for form to be populated with existing values
      await waitFor(() => {
        expect(screen.getByDisplayValue("Old Title")).toBeInTheDocument();
      });

      // Edit title
      const titleInput = screen.getByLabelText(/goal title/i);
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, "Updated Title");

      // Edit description
      const descInput = screen.getByLabelText(/goal description/i);
      await userEvent.clear(descInput);
      await userEvent.type(descInput, "Updated description");

      // Edit performance factor
      const pfInput = screen.getByLabelText(/performance factor/i);
      await userEvent.clear(pfInput);
      await userEvent.type(pfInput, "Updated Factor");

      // Update weightage to 40
      const weightageInput = screen.getByLabelText(/weightage/i);
      await userEvent.clear(weightageInput);
      await userEvent.type(weightageInput, "40");

      // Submit form
      const form = screen
        .getByRole("dialog")
        .querySelector("form") as HTMLFormElement;
      fireEvent.submit(form);

      // Expect success toast and callback with updated fields
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Goal updated",
          expect.any(Object)
        );
      });

      expect(onGoalUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          goal: expect.objectContaining({
            goal_id: 10,
            goal_title: "Updated Title",
            goal_weightage: 40,
          }),
        })
      );
    });
  });

  /**
   * TC-B01.4-N1: Exceeding 100% Total Weightage
   * Expected: Error when trying to add goal that exceeds remaining weightage
   */
  describe("TC-B01.4-N1 - Exceeding Total Weightage", () => {
    it("should reject goal when total would exceed 100%", async () => {
      const onGoalAdded = vi.fn();

      // Remaining weightage is only 25%
      render(
        <AddGoalModal
          open={true}
          onClose={vi.fn()}
          onGoalAdded={onGoalAdded}
          remainingWeightage={25}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/weightage/i)).toBeInTheDocument();
      });

      // Fill all fields
      await userEvent.type(
        screen.getByLabelText(/goal title/i),
        "Exceeding Goal"
      );
      await userEvent.type(
        screen.getByLabelText(/goal description/i),
        "This will exceed limit"
      );
      await userEvent.type(
        screen.getByLabelText(/performance factor/i),
        "Test Factor"
      );

      const importanceSelect = screen.getByLabelText(/importance level/i);
      await userEvent.click(importanceSelect);
      fireEvent.change(screen.getByLabelText(/importance level/i), {
        target: { value: "High" },
      });

      const categorySelect = screen.getByLabelText(/category/i);
      await userEvent.click(categorySelect);
      fireEvent.change(screen.getByLabelText(/category/i), {
        target: { value: "1" },
      });

      // Try to enter 30% when only 25% remaining
      const weightageInput = screen.getByLabelText(/weightage/i);
      await userEvent.clear(weightageInput);
      await userEvent.type(weightageInput, "30");

      const form = screen
        .getByRole("dialog")
        .querySelector("form") as HTMLFormElement;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Weightage exceeds remaining 25%."
        );
      });

      expect(onGoalAdded).not.toHaveBeenCalled();
    });
  });

  /**
   * TC-B01.5: Edit Goal Weightage
   * Expected: Goal is updated successfully with new weightage
   */
  describe("TC-B01.5 - Edit Goal Weightage", () => {
    it("should update goal weightage successfully", async () => {
      const onGoalUpdated = vi.fn();

      render(
        <EditGoalModal
          open={true}
          onClose={vi.fn()}
          onGoalUpdated={onGoalUpdated}
          goalData={mockGoalData}
          remainingWeightage={70}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue("Test Goal")).toBeInTheDocument();
      });

      // Change weightage from 30 to 45
      const weightageInput = screen.getByLabelText(/weightage/i);
      await userEvent.clear(weightageInput);
      await userEvent.type(weightageInput, "45");

      const form = screen
        .getByRole("dialog")
        .querySelector("form") as HTMLFormElement;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Goal updated",
          expect.any(Object)
        );
      });

      expect(onGoalUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          goal: expect.objectContaining({
            goal_weightage: 45,
          }),
        })
      );
    });
  });

  /**
   * TC-B01.5-N1: Edit Goal Exceeding Remaining
   * Expected: Error when edited weightage exceeds available capacity
   */
  describe("TC-B01.5-N1 - Edit Goal Exceeding Remaining", () => {
    it("should reject edit when weightage exceeds remaining", async () => {
      const onGoalUpdated = vi.fn();

      // Goal has 30%, remaining is 40% (including current goal's 30%)
      render(
        <EditGoalModal
          open={true}
          onClose={vi.fn()}
          onGoalUpdated={onGoalUpdated}
          goalData={mockGoalData}
          remainingWeightage={40}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue("30")).toBeInTheDocument();
      });

      // Try to change to 50% (exceeds 40% available)
      const weightageInput = screen.getByLabelText(/weightage/i);
      await userEvent.clear(weightageInput);
      await userEvent.type(weightageInput, "50");

      const form = screen
        .getByRole("dialog")
        .querySelector("form") as HTMLFormElement;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Must be <= available 40%");
      });

      expect(onGoalUpdated).not.toHaveBeenCalled();
    });
  });
});

/**
 * Integration Test - Backend Validation
 */
describe("Backend Integration - Goal Weightage Validation", () => {
  /**
   * Test backend schema validation
   */
  it("should validate weightage range on backend", async () => {
    // Mock API call that returns validation error
    (apiFetch as any).mockResolvedValueOnce({
      ok: false,
      error: "Weightage must be between 0 and 100",
    });

    const onGoalAdded = vi.fn();

    render(
      <AddGoalModal
        open={true}
        onClose={vi.fn()}
        onGoalAdded={onGoalAdded}
        remainingWeightage={100}
      />
    );

    // Attempt to create goal with invalid data
    // The backend should validate and return error

    // This test would require actual API integration
    // or more sophisticated mocking of the submission flow
  });

  /**
   * Test category foreign key constraint
   */
  it("should validate category existence on backend", async () => {
    // Mock API response for non-existent category
    (apiFetch as any).mockResolvedValueOnce({
      ok: false,
      error: "Selected category does not exist",
    });

    // Test implementation would verify backend rejects invalid category_id
  });
});

/**
 * Accessibility Tests
 */
describe("Accessibility - Goal Form", () => {
  it("should have proper ARIA labels", async () => {
    render(
      <AddGoalModal
        open={true}
        onClose={vi.fn()}
        onGoalAdded={vi.fn()}
        remainingWeightage={100}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/goal title/i)).toBeInTheDocument();
    });

    // Check for proper labels
    expect(screen.getByLabelText(/goal title/i)).toHaveAttribute("id");
    expect(screen.getByLabelText(/weightage/i)).toHaveAttribute(
      "type",
      "number"
    );
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
  });

  it("should have required field indicators", async () => {
    render(
      <AddGoalModal
        open={true}
        onClose={vi.fn()}
        onGoalAdded={vi.fn()}
        remainingWeightage={100}
      />
    );

    await waitFor(() => {
      const weightageInput = screen.getByLabelText(/weightage/i);
      expect(weightageInput).toHaveAttribute("required");
    });
  });
});
