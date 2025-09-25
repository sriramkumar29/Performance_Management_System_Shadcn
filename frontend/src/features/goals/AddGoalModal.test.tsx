import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import {
  render,
  screen,
  waitFor,
  within,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import AddGoalModal from "./AddGoalModal";
import * as api from "../../utils/api";

// Mock the API module
vi.mock("../../utils/api", () => ({
  apiFetch: vi.fn(),
}));

// Mock toast notifications from sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockOnClose = vi.fn();
const mockOnGoalAdded = vi.fn();

// Radix Select uses Pointer Events APIs not implemented in JSDOM
beforeAll(() => {
  const proto = Element.prototype as any;
  if (!proto.hasPointerCapture) proto.hasPointerCapture = vi.fn();
  if (!proto.setPointerCapture) proto.setPointerCapture = vi.fn();
  if (!proto.scrollIntoView) proto.scrollIntoView = vi.fn();
});

const mockCategories = [
  { id: 1, name: "Category 1" },
  { id: 2, name: "Category 2" },
];

const defaultProps = {
  open: true,
  onClose: mockOnClose,
  onGoalAdded: mockOnGoalAdded,
  appraisalId: 1,
};

// Type assertion for the mocked apiFetch
const mockApiFetch = vi.mocked(api.apiFetch);

describe("AddGoalModal", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Set up the default mock implementation
    mockApiFetch.mockImplementation((url: string) => {
      if (url === "/api/goals/categories") {
        return Promise.resolve({
          ok: true,
          data: [...mockCategories], // Return a new array to avoid reference issues
        }) as any;
      }
      return Promise.resolve({ ok: false, data: null }) as any;
    });
  });

  it("should render modal when open", async () => {
    render(<AddGoalModal {...defaultProps} />);

    // Wait for categories to load
    await waitFor(() => {
      expect(screen.getByText("Add New Goal")).toBeInTheDocument();
    });
  });

  it("should not render when closed", async () => {
    const { container } = render(
      <AddGoalModal {...defaultProps} open={false} />
    );

    // The modal should not be in the document at all when closed
    expect(container.firstChild).toBeNull();
  });

  it("should render goal form fields", async () => {
    render(<AddGoalModal {...defaultProps} />);

    // Wait for categories to load
    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    // Now check for form fields
    expect(screen.getByLabelText(/goal title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/performance factor/i)).toBeInTheDocument();
    // Category label and trigger
    const categoryLabel = screen.getByText(/category/i, { selector: "label" });
    expect(categoryLabel).toBeInTheDocument();
    const categorySection = categoryLabel.closest("div") as HTMLElement;
    expect(within(categorySection).getByRole("combobox")).toBeInTheDocument();
    // Importance label and trigger
    const importanceLabel = screen.getByText(/importance level/i, {
      selector: "label",
    });
    expect(importanceLabel).toBeInTheDocument();
    const importanceSection = importanceLabel.closest("div") as HTMLElement;
    expect(within(importanceSection).getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByLabelText(/weightage/i)).toBeInTheDocument();
  });

  it("should handle form submission (staged pseudo goal) and show success toast", async () => {
    const user = userEvent.setup();
    render(<AddGoalModal {...defaultProps} />);

    // Wait for categories to load with increased timeout
    await waitFor(
      () => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    // Fill in required fields
    await user.type(screen.getByLabelText(/goal title/i), "New Goal");
    await user.type(screen.getByLabelText(/goal description/i), "Desc");
    await user.type(screen.getByLabelText(/performance factors/i), "Factor");

    // Importance select
    const importanceLabel = screen.getByText(/importance level/i, {
      selector: "label",
    });
    const importanceSection = importanceLabel.closest("div") as HTMLElement;
    const importanceTrigger = within(importanceSection).getByRole("combobox");
    await user.click(importanceTrigger);
    const listbox1 = await screen.findByRole("listbox", {}, { timeout: 5000 });
    await user.click(
      within(listbox1).getByRole("option", { name: /high priority/i })
    );

    // Category select
    const categoryLabel = screen.getByText(/category/i, { selector: "label" });
    const categorySection = categoryLabel.closest("div") as HTMLElement;
    const categoryTrigger = within(categorySection).getByRole("combobox");
    await user.click(categoryTrigger);
    const listbox2 = await screen.findByRole("listbox", {}, { timeout: 5000 });
    await user.click(
      within(listbox2).getByRole("option", { name: /category 1/i })
    );

    // Weightage
    await user.type(screen.getByLabelText(/weightage/i), "25");

    // Submit the form
    await user.click(screen.getByRole("button", { name: /add goal/i }));

    await waitFor(() => {
      expect(mockOnGoalAdded).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Goal added to appraisal",
        expect.objectContaining({ description: expect.any(String) })
      );
    });
  });

  it("should validate required fields and show error toast", async () => {
    render(<AddGoalModal {...defaultProps} />);

    // Submit without filling anything
    fireEvent.submit(
      screen.getByRole("button", { name: /add goal/i }).closest("form")!
    );
    // or: fireEvent.click(screen.getByRole("button", { name: /add goal/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Please complete all fields before submitting"
      );
      expect(mockOnGoalAdded).not.toHaveBeenCalled();
    });
  });

  it("should error when weightage exceeds remaining weightage", async () => {
    const user = userEvent.setup();
    render(<AddGoalModal {...defaultProps} remainingWeightage={10} />);

    // Wait for categories to load with longer timeout
    await waitFor(
      () => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    // fill required fields first
    await user.type(screen.getByLabelText(/goal title/i), "Weightage Goal");
    await user.type(
      screen.getByLabelText(/goal description/i),
      "Some description"
    );
    await user.type(screen.getByLabelText(/performance factors/i), "Factor");

    // Importance select (Radix Select)
    const importanceLabel = screen.getByText(/importance level/i, {
      selector: "label",
    });
    const importanceSection = importanceLabel.closest("div") as HTMLElement;
    const importanceTrigger = within(importanceSection).getByRole("combobox");
    await user.click(importanceTrigger);
    const listboxImp = await screen.findByRole(
      "listbox",
      {},
      { timeout: 8000 }
    );
    await user.click(
      within(listboxImp).getByRole("option", { name: /high priority/i })
    );
    // ensure selection reflected on trigger
    await waitFor(
      () => {
        expect(importanceTrigger).toHaveTextContent(/high priority/i);
      },
      { timeout: 5000 }
    );

    // Category select (Radix Select)
    const categoryLabel = screen.getByText(/category/i, { selector: "label" });
    const categorySection = categoryLabel.closest("div") as HTMLElement;
    const categoryTrigger = within(categorySection).getByRole("combobox");
    await user.click(categoryTrigger);
    const listboxCat = await screen.findByRole(
      "listbox",
      {},
      { timeout: 8000 }
    );
    await user.click(
      within(listboxCat).getByRole("option", { name: /category 1/i })
    );
    // ensure selection reflected on trigger
    await waitFor(
      () => {
        expect(categoryTrigger).toHaveTextContent(/category 1/i);
      },
      { timeout: 5000 }
    );

    // enter weightage > remaining (e.g. 45 when only 10 is left)
    const weightInput = screen.getByLabelText(/weightage/i) as HTMLInputElement;
    await user.clear(weightInput);
    await user.type(weightInput, "45");
    // verify value is set
    expect(weightInput).toHaveValue(45);
    // remove native max validation to ensure submit triggers onSubmit in jsdom
    weightInput.removeAttribute("max");

    // try to submit via form submit to ensure onSubmit is invoked
    const formEl = screen
      .getByRole("button", { name: /add goal/i })
      .closest("form")!;
    fireEvent.submit(formEl);

    // expect toast error with correct message, and no goal added
    await waitFor(
      () => {
        expect(toast.error).toHaveBeenCalled();
      },
      { timeout: 5000 }
    );
    const lastCall = (toast.error as any).mock.calls.at(-1) || [];
    expect(lastCall[0]).toMatch(/Weightage\s+exceeds\s+remaining\s+10%\.?/i);
    expect(mockOnGoalAdded).not.toHaveBeenCalled();
  });

  it("should allow valid weightage within remaining and succeed", async () => {
    const user = userEvent.setup();
    render(<AddGoalModal {...defaultProps} remainingWeightage={60} />);

    await waitFor(
      () => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    await user.type(screen.getByLabelText(/goal title/i), "Valid Goal");
    await user.type(screen.getByLabelText(/goal description/i), "Desc");
    await user.type(screen.getByLabelText(/performance factors/i), "Factor");

    const importanceLabel = screen.getByText(/importance level/i, {
      selector: "label",
    });
    const importanceSection = importanceLabel.closest("div") as HTMLElement;
    const importanceTrigger = within(importanceSection).getByRole("combobox");
    await user.click(importanceTrigger);
    const listbox5 = await screen.findByRole("listbox");
    await user.click(
      within(listbox5).getByRole("option", { name: /medium priority/i })
    );

    const categoryLabel = screen.getByText(/category/i, { selector: "label" });
    const categorySection = categoryLabel.closest("div") as HTMLElement;
    const categoryTrigger = within(categorySection).getByRole("combobox");
    await user.click(categoryTrigger);
    const listbox6 = await screen.findByRole("listbox");
    await user.click(
      within(listbox6).getByRole("option", { name: /category 2/i })
    );

    await user.type(screen.getByLabelText(/weightage/i), "50");

    await user.click(screen.getByRole("button", { name: /add goal/i }));

    await waitFor(() => {
      expect(mockOnGoalAdded).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("should close modal when cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<AddGoalModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should disable submit when no remaining weightage", async () => {
    render(<AddGoalModal {...defaultProps} remainingWeightage={0} />);

    await waitFor(() => {
      expect(screen.getByText(/no weightage remaining/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: /add goal/i });
    expect(submitBtn).toBeDisabled();
  });
});
