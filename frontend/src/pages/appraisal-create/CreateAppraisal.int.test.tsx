import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { render, userEvent, setupAuthTokens } from "../../test/test-utils";
import CreateAppraisal from "./CreateAppraisal";
import { server } from "../../test/mocks/server";
import { http, HttpResponse } from "msw";

const mockUser = {
  emp_id: 123,
  emp_name: "Test Manager",
  emp_email: "test.manager@example.com",
  emp_roles_level: 3,
};

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: undefined }),
  };
});

vi.mock("dayjs", () => ({
  default: vi.fn((date?: any) => {
    const actualDate = date ? new Date(date) : new Date("2025-01-15");
    return {
      format: vi.fn((format: string) => {
        if (format === "YYYY-MM-DD") {
          return actualDate.toISOString().split("T")[0];
        }
        return actualDate.toISOString();
      }),
      toISOString: () => actualDate.toISOString(),
      valueOf: () => actualDate.getTime(),
    };
  }),
  extend: vi.fn(),
  isDayjs: vi.fn(() => false),
  __esModule: true,
}));

describe("CreateAppraisal Integration Tests", () => {
  beforeAll(() => {
    vi.setConfig({ testTimeout: 60000 }); // Increase timeout for all tests
  });

  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthTokens();
    mockNavigate.mockClear();

    // Reset MSW handlers
    server.resetHandlers();
  });

  describe("Initial data loading", () => {
    it("should load employees and appraisal types on mount", async () => {
      render(<CreateAppraisal />, {
        auth: { user: mockUser, status: "succeeded" },
      });

      await waitFor(() => {
        expect(screen.getByText(/create new appraisal/i)).toBeInTheDocument();
      });

      // Should load employees for dropdown
      const employeeSelect = screen.getByRole("combobox", {
        name: /employee/i,
      });
      expect(employeeSelect).toBeInTheDocument();

      // Should load appraisal types
      const typeSelect = screen.getByRole("combobox", {
        name: /appraisal type/i,
      });
      expect(typeSelect).toBeInTheDocument();
    });

    it("should show error toast when employee loading fails", async () => {
      // Increase test timeout
      vi.setConfig({ testTimeout: 20000 });
      server.use(
        http.get("/api/employees", () => {
          return HttpResponse.json({ detail: "Server error" }, { status: 500 });
        })
      );

      const { toast } = await import("sonner");
      render(<CreateAppraisal />, {
        auth: { user: mockUser, status: "succeeded" },
      });

      await waitFor(
        () => {
          expect(toast.error).toHaveBeenCalledWith(
            expect.stringMatching(/employees|fetch/i),
            expect.objectContaining({
              description: expect.stringMatching(
                /please try again|server error/i
              ),
            })
          );
        },
        { timeout: 10000 }
      );
    });
  });

  describe("Form field dependencies", () => {
    it("should enable reviewer selection only after employee is selected", async () => {
      const user = userEvent.setup();
      render(<CreateAppraisal />, {
        auth: { user: mockUser, status: "succeeded" },
      });

      await waitFor(() => {
        expect(
          screen.getByRole("combobox", { name: /employee/i })
        ).toBeInTheDocument();
      });

      const reviewerSelect = screen.getByRole("combobox", {
        name: /reviewer/i,
      });
      expect(reviewerSelect).toBeDisabled();

      // Select an employee
      const employeeSelect = screen.getByRole("combobox", {
        name: /employee/i,
      });
      await user.click(employeeSelect);
      const listboxEmp = await screen.findByRole("listbox");
      await user.click(
        within(listboxEmp).getByRole("option", { name: /jane smith/i })
      );

      await waitFor(() => {
        expect(reviewerSelect).not.toBeDisabled();
      });
    });

    it("should enable type selection only after reviewer is selected", async () => {
      const user = userEvent.setup();
      render(<CreateAppraisal />, {
        auth: { user: mockUser, status: "succeeded" },
      });

      await waitFor(() => {
        expect(
          screen.getByRole("combobox", { name: /employee/i })
        ).toBeInTheDocument();
      });

      const typeSelect = screen.getByRole("combobox", {
        name: /appraisal type/i,
      });
      expect(typeSelect).toBeDisabled();

      // Select employee first
      const employeeSelect = screen.getByRole("combobox", {
        name: /employee/i,
      });
      await user.click(employeeSelect);
      const listboxEmp = await screen.findByRole("listbox");
      await user.click(
        within(listboxEmp).getByRole("option", { name: /jane smith/i })
      );

      // Select reviewer
      await waitFor(() => {
        const reviewerSelect = screen.getByRole("combobox", {
          name: /reviewer/i,
        });
        expect(reviewerSelect).not.toBeDisabled();
      });

      const reviewerSelect = screen.getByRole("combobox", {
        name: /reviewer/i,
      });
      await user.click(reviewerSelect);
      const listboxReviewer = await screen.findByRole("listbox");
      await user.click(
        within(listboxReviewer).getByRole("option", { name: /bob wilson/i })
      );

      await waitFor(() => {
        expect(typeSelect).not.toBeDisabled();
      });
    });
  });

  describe("Period auto-calculation", () => {
    it("should auto-calculate period for Annual type (no range)", async () => {
      const user = userEvent.setup();
      render(<CreateAppraisal />, {
        auth: { user: mockUser, status: "succeeded" },
      });

      // Complete prerequisites
      await waitFor(() => {
        expect(
          screen.getByRole("combobox", { name: /employee/i })
        ).toBeInTheDocument();
      });

      const employeeSelect = screen.getByRole("combobox", {
        name: /employee/i,
      });
      await user.click(employeeSelect);
      const listboxEmp = await screen.findByRole("listbox");
      await user.click(
        within(listboxEmp).getByRole("option", { name: /jane smith/i })
      );

      const reviewerSelect = screen.getByRole("combobox", {
        name: /reviewer/i,
      });
      await user.click(reviewerSelect);
      const listboxReviewer = await screen.findByRole("listbox");
      await user.click(
        within(listboxReviewer).getByRole("option", { name: /bob wilson/i })
      );

      // Select Annual type
      const typeSelect = screen.getByRole("combobox", {
        name: /appraisal type/i,
      });
      await user.click(typeSelect);
      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument();
      });
      const typeOptions = await screen.findAllByRole("option");
      const annualOption = typeOptions.find(
        (option) => option.textContent?.toLowerCase() === "annual"
      );
      if (!annualOption) throw new Error("Annual option not found");
      await user.click(annualOption);

      // Should show calculated period (full year)
      await waitFor(() => {
        const startInput = screen.getByPlaceholderText("Start Date");
        const endInput = screen.getByPlaceholderText("End Date");
        expect(startInput).toHaveValue("2024-12-31");
        expect(endInput).toHaveValue("2025-12-30");
      });
    });

    it("should show range selection for Half-yearly type", async () => {
      const user = userEvent.setup();

      // Mock ranges API call
      server.use(
        http.get("/api/appraisal-types/ranges", ({ request }) => {
          const url = new URL(request.url);
          const typeId = url.searchParams.get("appraisal_type_id");

          if (typeId === "2") {
            // Half-yearly
            return HttpResponse.json([
              { id: 1, name: "1st" },
              { id: 2, name: "2nd" },
            ]);
          }
          return HttpResponse.json([]);
        })
      );

      render(<CreateAppraisal />, {
        auth: { user: mockUser, status: "succeeded" },
      });

      // Complete prerequisites
      await waitFor(() => {
        expect(
          screen.getByRole("combobox", { name: /employee/i })
        ).toBeInTheDocument();
      });

      const employeeSelect = screen.getByRole("combobox", {
        name: /employee/i,
      });
      await user.click(employeeSelect);
      const listboxEmp = await screen.findByRole("listbox");
      await user.click(
        within(listboxEmp).getByRole("option", { name: /jane smith/i })
      );

      const reviewerSelect = screen.getByRole("combobox", {
        name: /reviewer/i,
      });
      await user.click(reviewerSelect);
      const listboxReviewer = await screen.findByRole("listbox");
      await user.click(
        within(listboxReviewer).getByRole("option", { name: /bob wilson/i })
      );

      // Select Half-yearly type
      const typeSelect = screen.getByRole("combobox", {
        name: /appraisal type/i,
      });
      await user.click(typeSelect);
      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument();
      });
      const halfYearlyOption = await screen.findByRole("option", {
        name: /^half-yearly$/i,
      });
      await user.click(halfYearlyOption);

      // Should show range selection
      await waitFor(() => {
        expect(
          screen.getByRole("combobox", { name: /range/i })
        ).toBeInTheDocument();
      });
    });

    it("should calculate period correctly for Half-yearly 1st range", async () => {
      const user = userEvent.setup();

      server.use(
        http.get("/api/appraisal-types/ranges", () => {
          return HttpResponse.json([
            { id: 1, name: "1st" },
            { id: 2, name: "2nd" },
          ]);
        })
      );

      render(<CreateAppraisal />, {
        auth: { user: mockUser, status: "succeeded" },
      });

      // Complete prerequisites and select Half-yearly
      await waitFor(() => {
        expect(
          screen.getByRole("combobox", { name: /employee/i })
        ).toBeInTheDocument();
      });

      const employeeSelect = screen.getByRole("combobox", {
        name: /employee/i,
      });
      await user.click(employeeSelect);
      const listboxEmp = await screen.findByRole("listbox");
      await user.click(
        within(listboxEmp).getByRole("option", { name: /jane smith/i })
      );

      const reviewerSelect = screen.getByRole("combobox", {
        name: /reviewer/i,
      });
      await user.click(reviewerSelect);
      const listboxReviewer = await screen.findByRole("listbox");
      await user.click(
        within(listboxReviewer).getByRole("option", { name: /bob wilson/i })
      );

      const typeSelect = screen.getByRole("combobox", {
        name: /appraisal type/i,
      });
      await user.click(typeSelect);
      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument();
      });
      const halfYearlyOption = await screen.findByRole("option", {
        name: /^half-yearly$/i,
      });
      await user.click(halfYearlyOption);

      // Select 1st range
      await waitFor(() => {
        const rangeSelect = screen.getByRole("combobox", { name: /range/i });
        expect(rangeSelect).toBeInTheDocument();
      });

      const rangeSelect = screen.getByRole("combobox", { name: /range/i });
      await user.click(rangeSelect);
      const listboxRange = await screen.findByRole("listbox");
      await user.click(
        within(listboxRange).getByRole("option", { name: /1st/i })
      );

      // Should calculate first half period
      await waitFor(() => {
        const startInput = screen.getByPlaceholderText("Start Date");
        const endInput = screen.getByPlaceholderText("End Date");
        expect(startInput).toHaveValue("2024-12-31");
        expect(endInput).toHaveValue("2025-06-29");
      });
    });
  });

  // Test goals configuration for weightage validation
  const testGoals = [
    {
      id: 1,
      temp_id: null,
      title: "Technical Skills",
      description: "Improve technical capabilities",
      performance_factor: "Quality",
      importance: "High",
      weightage: 30,
      categories: [{ id: 1, name: "Category 1" }],
    },
    {
      id: 2,
      temp_id: null,
      title: "Project Management",
      description: "Enhance project planning and execution skills",
      performance_factor: "Efficiency",
      importance: "High",
      weightage: 25,
      categories: [{ id: 2, name: "Leadership" }],
    },
    {
      id: 3,
      temp_id: null,
      title: "Communication",
      description: "Improve written and verbal communication",
      performance_factor: "Collaboration",
      importance: "Medium",
      weightage: 20,
      categories: [{ id: 3, name: "Soft Skills" }],
    },
    {
      id: 4,
      temp_id: null,
      title: "Code Quality",
      description: "Enhance code maintainability and best practices",
      performance_factor: "Quality",
      importance: "High",
      weightage: 30,
      categories: [{ id: 1, name: "Technical" }],
    },
    {
      id: 5,
      temp_id: null,
      title: "Team Collaboration",
      description: "Improve teamwork and knowledge sharing",
      performance_factor: "Collaboration",
      importance: "Medium",
      weightage: 15,
      categories: [{ id: 3, name: "Soft Skills" }],
    },
    {
      id: 6,
      temp_id: null,
      title: "Problem Solving",
      description: "Enhance analytical and critical thinking abilities",
      performance_factor: "Innovation",
      importance: "High",
      weightage: 25,
      categories: [{ id: 4, name: "Cognitive Skills" }],
    },
  ];

  describe("Goal management", () => {
    it("should disable Add Goal button until prerequisites are met", async () => {
      render(<CreateAppraisal />, {
        auth: { user: mockUser, status: "succeeded" },
      });

      await waitFor(() => {
        const addGoalButton = screen.getByTestId("add-goal-toolbar");
        expect(addGoalButton).toBeInTheDocument();
      });

      const addGoalButton = screen.getByTestId("add-goal-toolbar");
      expect(addGoalButton).toBeDisabled();

      // Should show tooltip or disabled reason
      expect(screen.getByText(/select an employee first/i)).toBeInTheDocument();
    });

    it("should enable Add Goal button after all prerequisites are met", async () => {
      const user = userEvent.setup();
      render(<CreateAppraisal />, {
        auth: { user: mockUser, status: "succeeded" },
      });

      // Complete all prerequisites
      await waitFor(() => {
        expect(
          screen.getByRole("combobox", { name: /employee/i })
        ).toBeInTheDocument();
      });

      const employeeSelect = screen.getByRole("combobox", {
        name: /employee/i,
      });
      await user.click(employeeSelect);
      const listboxEmp = await screen.findByRole("listbox");
      await user.click(
        within(listboxEmp).getByRole("option", { name: /jane smith/i })
      );

      const reviewerSelect = screen.getByRole("combobox", {
        name: /reviewer/i,
      });
      await user.click(reviewerSelect);
      const listboxReviewer = await screen.findByRole("listbox");
      await user.click(
        within(listboxReviewer).getByRole("option", { name: /bob wilson/i })
      );

      const typeSelect = screen.getByRole("combobox", {
        name: /appraisal type/i,
      });
      await user.click(typeSelect);
      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument();
      });
      const typeOptions = await screen.findAllByRole("option");
      const annualOption = typeOptions.find(
        (option) => option.textContent?.toLowerCase() === "annual"
      );
      if (!annualOption) throw new Error("Annual option not found");
      await user.click(annualOption);

      await waitFor(() => {
        const addGoalButton = screen.getByTestId("add-goal-toolbar");
        expect(addGoalButton).not.toBeDisabled();
      });
    });

    it("should allow adding multiple goals with valid weightage", async () => {
      const user = userEvent.setup({ delay: null });

      render(<CreateAppraisal />, {
        auth: { user: mockUser, status: "succeeded" },
      });

      // Complete prerequisites first
      await waitFor(() => {
        expect(
          screen.getByRole("combobox", { name: /employee/i })
        ).toBeInTheDocument();
      });

      // Select employee
      const employeeSelect = screen.getByRole("combobox", {
        name: /employee/i,
      });
      await user.click(employeeSelect);
      const listboxEmp = await screen.findByRole("listbox");
      await user.click(
        within(listboxEmp).getByRole("option", { name: /jane smith/i })
      );

      // Select reviewer
      const reviewerSelect = screen.getByRole("combobox", {
        name: /reviewer/i,
      });
      await user.click(reviewerSelect);
      const listboxReviewer = await screen.findByRole("listbox");
      await user.click(
        within(listboxReviewer).getByRole("option", { name: /bob wilson/i })
      );

      // Select type
      const typeSelect = screen.getByRole("combobox", {
        name: /appraisal type/i,
      });
      await user.click(typeSelect);
      const typeOptions = await screen.findAllByRole("option");
      const annualOption = typeOptions.find(
        (option) => option.textContent?.toLowerCase() === "annual"
      );
      if (!annualOption) throw new Error("Annual option not found");
      await user.click(annualOption);

      // Verify Add Goal button is enabled
      await waitFor(() => {
        const addGoalButtons = screen.getAllByRole("button", {
          name: /add goal/i,
        });
        expect(addGoalButtons[0]).not.toBeDisabled();
      });

      // Add multiple goals using the testGoals data
      const addGoalButton = screen.getByTestId("add-goal-toolbar");
      expect(addGoalButton).not.toBeDisabled();

      // Mock the goal endpoints for each goal
      server.use(
        http.post("/api/goals", () => {
          return HttpResponse.json(testGoals[0]);
        }),
        http.get("/api/goals/categories", () => {
          return HttpResponse.json([
            { id: 1, name: "Category 1" },
            { id: 2, name: "Leadership" },
            { id: 3, name: "Soft Skills" },
          ]);
        })
      );

      // Add first goal
      await user.click(addGoalButton);

      // Wait for the dialog to appear
      const dialog = await screen.findByRole("dialog");

      // Fill in goal details for first goal
      const titleInput = within(dialog).getByLabelText(/title/i);
      const descriptionInput = within(dialog).getByLabelText(/description/i);
      const weightageInput = within(dialog).getByLabelText(/weightage/i);

      await user.type(titleInput, testGoals[0].title);
      await user.type(descriptionInput, testGoals[0].description);
      await user.clear(weightageInput);
      await user.type(weightageInput, testGoals[0].weightage.toString());

      // Fill in performance factor
      const perfFactorInput =
        within(dialog).getByLabelText(/performance factors/i);
      await user.type(perfFactorInput, testGoals[0].performance_factor);

      // Select importance level
      const importanceSelect =
        within(dialog).getByLabelText(/importance level/i);
      await user.click(importanceSelect);
      const importanceOption = await screen.findByRole("option", {
        name: new RegExp(testGoals[0].importance + " Priority", "i"),
      });
      await user.click(importanceOption);

      // Select category
      const categorySelect = within(dialog).getByRole("combobox", {
        name: /category/i,
      });
      await user.click(categorySelect);
      const categoryOption = await screen.findByRole("option", {
        name: new RegExp(testGoals[0].categories[0].name, "i"),
      });
      await user.click(categoryOption);

      // Save first goal
      const addButton = within(dialog).getByRole("button", {
        name: /add goal/i,
      });
      await user.click(addButton);

      // Update mock for second goal
      server.use(
        http.post("/api/goals", () => {
          return HttpResponse.json(testGoals[1]);
        })
      );

      // Add second goal
      await user.click(addGoalButton);

      // Wait for the dialog to appear again
      const dialog2 = await screen.findByRole("dialog");

      // Fill in goal details for second goal
      const titleInput2 = within(dialog2).getByLabelText(/title/i);
      const descriptionInput2 = within(dialog2).getByLabelText(/description/i);
      const weightageInput2 = within(dialog2).getByLabelText(/weightage/i);

      await user.type(titleInput2, testGoals[1].title);
      await user.type(descriptionInput2, testGoals[1].description);
      await user.clear(weightageInput2);
      await user.type(weightageInput2, testGoals[1].weightage.toString());

      // Fill in performance factor for second goal
      const perfFactorInput2 =
        within(dialog2).getByLabelText(/performance factors/i);
      await user.type(perfFactorInput2, testGoals[1].performance_factor);

      // Select importance level for second goal
      const importanceSelect2 =
        within(dialog2).getByLabelText(/importance level/i);
      await user.click(importanceSelect2);
      const importanceOption2 = await screen.findByRole("option", {
        name: new RegExp(testGoals[1].importance + " Priority", "i"),
      });
      await user.click(importanceOption2);

      // Select category for second goal
      const categorySelect2 = within(dialog2).getByRole("combobox", {
        name: /category/i,
      });
      await user.click(categorySelect2);
      const categoryOption2 = await screen.findByRole("option", {
        name: new RegExp(testGoals[1].categories[0].name, "i"),
      });
      await user.click(categoryOption2);

      // Save second goal
      const addButton2 = within(dialog2).getByRole("button", {
        name: /add goal/i,
      });
      await user.click(addButton2);

      // Verify total weightage is updated correctly (30% + 25% = 55%)
      await waitFor(() => {
        expect(screen.getByText("Total weightage")).toBeInTheDocument();
        expect(screen.getByText("55%")).toBeInTheDocument();

        // Verify progress indicator style
        const indicator = screen
          .getByRole("progressbar")
          .querySelector('[class*="bg-primary"]');
        expect(indicator).toHaveStyle({ transform: "translateX(-45%)" }); // 100 - 55 = 45
      });
    }, 30000);

    it("should prevent adding goals when total weightage would exceed 100%", async () => {
      const user = userEvent.setup({ delay: null });
      const { toast } = await import("sonner");
      vi.clearAllMocks();
      const toastErrorSpy = vi
        .spyOn(toast, "error")
        .mockImplementation(() => "mock-toast-id");

      render(<CreateAppraisal />, {
        auth: { user: mockUser, status: "succeeded" },
      });

      // Wait for form to load with proper timeout
      await waitFor(
        () => {
          expect(
            screen.getByRole("combobox", { name: /employee/i })
          ).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Select employee
      const employeeSelect = screen.getByRole("combobox", {
        name: /employee/i,
      });
      await user.click(employeeSelect);
      await waitFor(
        () => {
          expect(screen.getByRole("listbox")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
      await user.click(screen.getByRole("option", { name: /jane smith/i }));

      // Wait for and select reviewer
      await waitFor(
        () => {
          const reviewerSelect = screen.getByRole("combobox", {
            name: /reviewer/i,
          });
          expect(reviewerSelect).toBeEnabled();
        },
        { timeout: 5000 }
      );
      const reviewerSelect = screen.getByRole("combobox", {
        name: /reviewer/i,
      });
      await user.click(reviewerSelect);
      await waitFor(
        () => {
          expect(screen.getByRole("listbox")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
      await user.click(screen.getByRole("option", { name: /bob wilson/i }));

      // Wait for and select type
      await waitFor(
        () => {
          const typeSelect = screen.getByRole("combobox", {
            name: /appraisal type/i,
          });
          expect(typeSelect).toBeEnabled();
        },
        { timeout: 5000 }
      );
      const typeSelect = screen.getByRole("combobox", {
        name: /appraisal type/i,
      });
      await user.click(typeSelect);
      await waitFor(
        () => {
          expect(screen.getByRole("listbox")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
      await user.click(screen.getByRole("option", { name: /^annual$/i }));

      // Mock the goal endpoints
      server.use(
        http.post("/api/goals", () => {
          return HttpResponse.json(testGoals[3]); // Use Code Quality goal with 30% weightage
        }),
        http.get("/api/goals/categories", () => {
          return HttpResponse.json([
            { id: 1, name: "Technical" },
            { id: 2, name: "Leadership" },
            { id: 3, name: "Soft Skills" },
          ]);
        })
      );

      // Wait for and click Add Goal button
      await waitFor(
        () => {
          const addGoalButton = screen.getByTestId("add-goal-toolbar");
          expect(addGoalButton).toBeEnabled();
        },
        { timeout: 5000 }
      );
      await user.click(screen.getByTestId("add-goal-toolbar"));

      // Wait for and fill in goal dialog
      const dialog = await screen.findByRole("dialog", {}, { timeout: 5000 });
      await waitFor(
        () => {
          expect(within(dialog).getByLabelText(/title/i)).toBeEnabled();
        },
        { timeout: 5000 }
      );

      // Fill in goal details using testGoals[3] (Code Quality - 30%)
      await user.type(
        within(dialog).getByLabelText(/title/i),
        testGoals[3].title
      );
      await user.type(
        within(dialog).getByLabelText(/description/i),
        testGoals[3].description
      );
      await user.type(
        within(dialog).getByLabelText(/performance factors/i),
        testGoals[3].performance_factor
      );

      // Set weightage
      const weightageInput = within(dialog).getByLabelText(/weightage/i);
      await user.clear(weightageInput);
      await user.type(weightageInput, "30");

      // Select importance
      await user.click(
        within(dialog).getByRole("combobox", { name: /importance level/i })
      );
      await waitFor(
        () => {
          expect(
            screen.getByRole("option", { name: /high priority/i })
          ).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
      await user.click(screen.getByRole("option", { name: /high priority/i }));

      // Select category
      await user.click(
        within(dialog).getByRole("combobox", { name: /category/i })
      );
      await waitFor(
        () => {
          expect(
            screen.getByRole("option", { name: /technical/i })
          ).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
      await user.click(screen.getByRole("option", { name: /technical/i }));

      // Save goal and wait for dialog to close
      await user.click(
        within(dialog).getByRole("button", { name: /add goal/i })
      );
      await waitFor(
        () => {
          expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Verify first goal was added
      await waitFor(
        () => {
          expect(
            screen.getByText("30%", { selector: ".absolute.top-2.right-2" })
          ).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      // Try to add a second goal that would exceed 100%
      await user.click(screen.getByRole("button", { name: /add goal/i }));
      const dialog2 = await screen.findByRole("dialog", {}, { timeout: 5000 });

      // Fill in excessive goal details
      await waitFor(
        () => {
          expect(within(dialog2).getByLabelText(/title/i)).toBeEnabled();
        },
        { timeout: 5000 }
      );

      await user.type(within(dialog2).getByLabelText(/title/i), "Exceed Goal");
      await user.type(
        within(dialog2).getByLabelText(/description/i),
        "This should not be added"
      );
      await user.type(
        within(dialog2).getByLabelText(/performance factors/i),
        "Quality"
      );

      // Fill in all required fields
      await user.type(within(dialog2).getByLabelText(/title/i), "Goal 2");
      await user.type(
        within(dialog2).getByLabelText(/description/i),
        "Second goal description"
      );
      await user.type(
        within(dialog2).getByLabelText(/performance factors/i),
        "Quality"
      );

      // Set importance for second goal
      const importanceCombobox2 = within(dialog2).getByRole("combobox", {
        name: /importance level/i,
      });
      await user.click(importanceCombobox2);
      await waitFor(
        () => {
          expect(screen.getByRole("listbox")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
      const importanceOption2 = await screen.findByRole("option", {
        name: /high priority/i,
      });
      await user.click(importanceOption2);

      // Set category for second goal
      const categoryCombobox2 = within(dialog2).getByRole("combobox", {
        name: /category/i,
      });
      await user.click(categoryCombobox2);
      await waitFor(
        () => {
          expect(screen.getByRole("listbox")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
      const categoryOption2 = await screen.findByRole("option", {
        name: /technical/i,
      });
      await user.click(categoryOption2);

      // Set excessive weightage
      const weightageInput2 = within(dialog2).getByLabelText(/weightage/i);
      await user.clear(weightageInput2);
      await user.type(weightageInput2, "80"); // This would make total 110%

      // Try to save goal with excessive weightage
      await user.click(
        within(dialog2).getByRole("button", { name: /add goal/i })
      );

      // Wait for error toast
      await waitFor(
        () => {
          expect(toastErrorSpy).toHaveBeenCalledWith(
            expect.stringMatching(/weightage/i),
            expect.objectContaining({
              description: expect.stringMatching(/exceeds remaining/i),
            })
          );
        },
        { timeout: 10000 }
      );

      // Verify total still shows 30%
      await waitFor(
        () => {
          expect(screen.getByText("30%")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Clean up
      toastErrorSpy.mockRestore();

      // Close the dialog
      await user.click(
        within(dialog2).getByRole("button", { name: /cancel/i })
      );
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    }, 60000); // Set overall test timeout to 60 seconds

    it("should enable Submit for Acknowledgement button only when weightage is exactly 100%", async () => {
      const user = userEvent.setup({ delay: null });

      render(<CreateAppraisal />, {
        auth: { user: mockUser, status: "succeeded" },
      });

      // Complete prerequisites first
      await waitFor(() => {
        expect(
          screen.getByRole("combobox", { name: /employee/i })
        ).toBeInTheDocument();
      });

      const employeeSelect = screen.getByRole("combobox", {
        name: /employee/i,
      });
      await user.click(employeeSelect);
      const listboxEmp = await screen.findByRole("listbox");
      await user.click(
        within(listboxEmp).getByRole("option", { name: /jane smith/i })
      );

      const reviewerSelect = screen.getByRole("combobox", {
        name: /reviewer/i,
      });
      await user.click(reviewerSelect);
      const listboxReviewer = await screen.findByRole("listbox");
      await user.click(
        within(listboxReviewer).getByRole("option", { name: /bob wilson/i })
      );

      const typeSelect = screen.getByRole("combobox", {
        name: /appraisal type/i,
      });
      await user.click(typeSelect);
      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument();
      });
      const typeOptions = await screen.findAllByRole("option");
      const annualOption = typeOptions.find(
        (option) => option.textContent?.toLowerCase() === "annual"
      );
      if (!annualOption) throw new Error("Annual option not found");
      await user.click(annualOption);

      // Use testGoals for 100% weightage testing
      const goalsFor100Percent = [
        {
          title: testGoals[0].title,
          weightage: 40,
          description: testGoals[0].description,
          performance_factor: testGoals[0].performance_factor,
        },
        {
          title: testGoals[1].title,
          weightage: 35,
          description: testGoals[1].description,
          performance_factor: testGoals[1].performance_factor,
        },
        {
          title: testGoals[2].title,
          weightage: 25,
          description: testGoals[2].description,
          performance_factor: testGoals[2].performance_factor,
        },
      ];

      for (let i = 0; i < goalsFor100Percent.length; i++) {
        const goal = goalsFor100Percent[i];

        await waitFor(() => {
          const addGoalButtons = screen.getAllByRole("button", {
            name: /add goal/i,
          });
          expect(addGoalButtons[0]).not.toBeDisabled();
        });

        const addGoalButton = screen.getAllByRole("button", {
          name: /add goal/i,
        })[0];
        await user.click(addGoalButton);

        // Wait for modal to open
        await waitFor(
          () => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
          },
          { timeout: 15000 }
        );

        const titleInput = await screen.findByPlaceholderText(
          /enter a clear, specific goal title/i
        );
        await user.type(titleInput, goal.title);

        const descriptionInput = screen.getByPlaceholderText(
          /provide a detailed description of what needs to be achieved/i
        );
        await user.type(descriptionInput, goal.description);

        const performanceFactorInput = screen.getByPlaceholderText(
          /describe how performance will be measured and evaluated/i
        );
        await user.type(performanceFactorInput, goal.performance_factor);

        // Select importance level
        const importanceSelect = screen.getByRole("combobox", {
          name: /importance level/i,
        });
        await user.click(importanceSelect);
        const importanceOption = await screen.findByRole("option", {
          name: /high priority/i,
        });
        await user.click(importanceOption);

        const weightageInput = screen.getByPlaceholderText(
          /enter weightage percentage/i
        );
        await user.clear(weightageInput);
        await user.type(weightageInput, goal.weightage.toString());

        const addGoalBtn = screen.getByRole("button", { name: /add goal/i });
        await user.click(addGoalBtn);

        // Verify goal is added and goal modal is closed
        await waitFor(
          () => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
          },
          { timeout: 10000 }
        );
        // Give a small delay for the UI to update
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Verify total is 100%
      await waitFor(() => {
        expect(
          screen.getByText((content) => {
            return content.includes("Total:") && content.includes("100%");
          })
        ).toBeInTheDocument();
      });

      // Add Goal button should now be disabled
      await waitFor(() => {
        const addGoalButtons = screen.getAllByRole("button", {
          name: /add goal/i,
        });
        expect(addGoalButtons[0]).toBeDisabled();
      });

      // Add Goal button should be disabled when total reaches 100%
      await waitFor(() => {
        const addGoalButtons = screen.getAllByRole("button", {
          name: /add goal/i,
        });
        expect(addGoalButtons[0]).toBeDisabled();
      });
    });
  }); // End Goal Management

  describe("Weightage validation", () => {
    it("should enable Submit for Acknowledgement button only when weightage is exactly 100%", async () => {
      vi.setConfig({ testTimeout: 15000 });
      const user = userEvent.setup();

      render(<CreateAppraisal />, {
        auth: { user: mockUser, status: "succeeded" },
      });

      // Complete prerequisites
      await waitFor(() => {
        expect(
          screen.getByRole("combobox", { name: /employee/i })
        ).toBeInTheDocument();
      });

      // Select employee and reviewer
      const employeeSelect = screen.getByRole("combobox", {
        name: /employee/i,
      });
      await user.click(employeeSelect);
      const listboxEmp = await screen.findByRole("listbox");
      await user.click(
        within(listboxEmp).getByRole("option", { name: /jane smith/i })
      );

      const reviewerSelect = screen.getByRole("combobox", {
        name: /reviewer/i,
      });
      await user.click(reviewerSelect);
      const listboxReviewer = await screen.findByRole("listbox");
      await user.click(
        within(listboxReviewer).getByRole("option", { name: /bob wilson/i })
      );

      // Select type
      const typeSelect = screen.getByRole("combobox", {
        name: /appraisal type/i,
      });
      await user.click(typeSelect);
      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument();
      });
      const annualOption = await screen.findByRole("option", {
        name: /^annual$/i, // Exact match for "annual" ignoring case
      });
      await user.click(annualOption);

      // Mock endpoints
      let currentGoalIndex = 0;
      server.use(
        http.post("/api/goals", () => {
          const goal = testGoals[currentGoalIndex];
          currentGoalIndex++;
          return HttpResponse.json(goal);
        }),
        http.get("/api/goals/categories", () => {
          return HttpResponse.json([
            { id: 1, name: "Category 1" },
            { id: 2, name: "Leadership" },
            { id: 3, name: "Soft Skills" },
          ]);
        })
      );

      // Submit button should be disabled initially
      const submitButton = screen.getByRole("button", {
        name: /submit for acknowledgement/i,
      });
      expect(submitButton).toBeDisabled();

      // Add goals to reach 100% (selecting goals with 30%, 25%, 20%, and 25%)
      const goalsFor100Percent = [
        { ...testGoals[0], weightage: 30 }, // Technical Skills - 30%
        { ...testGoals[1], weightage: 25 }, // Project Management - 25%
        { ...testGoals[2], weightage: 20 }, // Communication - 20%
        { ...testGoals[5], weightage: 25 }, // Problem Solving - 25%
      ];

      for (const goal of goalsFor100Percent) {
        // Wait for Add Goal button to be enabled
        await waitFor(
          () => {
            const addGoalButton = screen.getByTestId("add-goal-toolbar");
            expect(addGoalButton).not.toBeDisabled();
          },
          {
            timeout: 2000, // Increase timeout for UI updates
          }
        );

        const addGoalButton = screen.getByTestId("add-goal-toolbar");
        await user.click(addGoalButton);

        // Wait for dialog to appear and be fully loaded
        const dialog = await screen.findByRole("dialog");
        await waitFor(() => {
          expect(within(dialog).getByLabelText(/title/i)).toBeEnabled();
        });

        // Fill in goal details
        await user.type(within(dialog).getByLabelText(/title/i), goal.title);
        await user.type(
          within(dialog).getByLabelText(/description/i),
          goal.description
        );
        await user.type(
          within(dialog).getByLabelText(/performance factors/i),
          goal.performance_factor
        );

        const weightageInput = within(dialog).getByLabelText(/weightage/i);
        await user.clear(weightageInput);
        await user.type(weightageInput, goal.weightage.toString());

        const importanceSelect =
          within(dialog).getByLabelText(/importance level/i);
        await user.click(importanceSelect);
        await user.click(
          screen.getByRole("option", {
            name: new RegExp(goal.importance + " Priority", "i"),
          })
        );

        const categorySelect = within(dialog).getByRole("combobox", {
          name: /category/i,
        });
        await user.click(categorySelect);
        await user.click(
          screen.getByRole("option", {
            name: new RegExp(goal.categories[0].name, "i"),
          })
        );

        // Save goal and wait for modal to close
        const addButton = within(dialog).getByRole("button", {
          name: /add goal/i,
        });
        await user.click(addButton);

        // Verify modal is closed before continuing
        await waitFor(
          () => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
          },
          {
            timeout: 2000, // Increase timeout for modal closing
          }
        );

        // After each goal, check submit button state
        if (currentGoalIndex < testGoals.length) {
          await waitFor(() => {
            expect(submitButton).toBeDisabled();
          });
        }
      }

      // After all goals are added, verify the total weightage is 100%
      await waitFor(
        () => {
          expect(
            screen.getByText((content) => {
              return content.includes("Total:") && content.includes("100%");
            })
          ).toBeInTheDocument();
        },
        {
          timeout: 2000, // Increase timeout to ensure UI updates
        }
      );

      // Now that we have 100% weightage, submit button should be enabled
      await waitFor(
        () => {
          expect(
            screen.getByTestId("submit-for-acknowledgement-button")
          ).toBeEnabled();
        },
        {
          timeout: 2000, // Increase timeout to ensure UI updates
        }
      );
    });

    it("should block submission when weightage is not exactly 100%", async () => {
      const user = userEvent.setup();
      const { toast } = await import("sonner");

      render(<CreateAppraisal />, {
        auth: { user: mockUser, status: "succeeded" },
      });

      // Complete prerequisites
      await waitFor(() => {
        expect(
          screen.getByRole("combobox", { name: /employee/i })
        ).toBeInTheDocument();
      });

      // Set up initial form
      const employeeSelect = screen.getByRole("combobox", {
        name: /employee/i,
      });
      await user.click(employeeSelect);
      const listboxEmp = await screen.findByRole("listbox");
      await user.click(
        within(listboxEmp).getByRole("option", { name: /jane smith/i })
      );

      const reviewerSelect = screen.getByRole("combobox", {
        name: /reviewer/i,
      });
      await user.click(reviewerSelect);
      const listboxReviewer = await screen.findByRole("listbox");
      await user.click(
        within(listboxReviewer).getByRole("option", { name: /bob wilson/i })
      );

      const typeSelect = screen.getByRole("combobox", {
        name: /appraisal type/i,
      });
      await user.click(typeSelect);
      const typeOptions = await screen.findAllByRole("option");
      const annualOption = typeOptions.find(
        (option) => option.textContent?.toLowerCase() === "annual"
      );
      if (!annualOption) throw new Error("Annual option not found");
      await user.click(annualOption);

      // Should allow saving as draft with 0% weightage
      const saveButton = screen.getByRole("button", { name: /save draft/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });

      // Should block submission due to 0% weightage
      const submitButton = screen.getByRole("button", {
        name: /submit for acknowledgement/i,
      });
      expect(submitButton).toBeDisabled();
    });
  });

  describe("Draft save and status transitions", () => {
    it("should save draft successfully with valid data", async () => {
      const user = userEvent.setup();
      const { toast } = await import("sonner");

      render(<CreateAppraisal />, {
        auth: { user: mockUser, status: "succeeded" },
      });

      // Complete prerequisites
      await waitFor(() => {
        expect(
          screen.getByRole("combobox", { name: /employee/i })
        ).toBeInTheDocument();
      });

      const employeeSelect = screen.getByRole("combobox", {
        name: /employee/i,
      });
      await user.click(employeeSelect);
      const listboxEmp = await screen.findByRole("listbox");
      await user.click(
        within(listboxEmp).getByRole("option", { name: /jane smith/i })
      );

      const reviewerSelect = screen.getByRole("combobox", {
        name: /reviewer/i,
      });
      await user.click(reviewerSelect);
      const listboxReviewer = await screen.findByRole("listbox");
      await user.click(
        within(listboxReviewer).getByRole("option", { name: /bob wilson/i })
      );

      const typeSelect = screen.getByRole("combobox", {
        name: /appraisal type/i,
      });
      await user.click(typeSelect);
      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument();
      });
      const typeOptions = await screen.findAllByRole("option");
      const annualOption = typeOptions.find(
        (option) => option.textContent?.toLowerCase() === "annual"
      );
      if (!annualOption) throw new Error("Annual option not found");
      await user.click(annualOption);

      // Save draft
      const saveButton = screen.getByRole("button", { name: /save draft/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Draft saved",
          expect.objectContaining({
            description: "Your draft appraisal has been created.",
          })
        );
      });

      // Should show Draft status
      expect(screen.getByText("Draft")).toBeInTheDocument();
    });

    it("should handle API errors during save", async () => {
      const user = userEvent.setup();

      // Force /api/appraisals POST to fail
      server.use(
        http.post("/api/appraisals", () => {
          return HttpResponse.json({ detail: "Server error" }, { status: 500 });
        })
      );

      // Spy on toast.error
      const { toast } = await import("sonner");
      const toastSpy = vi
        .spyOn(toast, "error")
        .mockImplementation(() => "toast-id");

      render(<CreateAppraisal />, {
        auth: { user: mockUser, status: "succeeded" },
      });

      // ---- Fill in required form fields ----
      // Select employee
      const employeeField = screen.getByRole("combobox", { name: /employee/i });
      await user.click(employeeField);
      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument();
      });
      const employeeOption = await screen.findByRole("option", {
        name: /john doe/i,
      });
      await user.click(employeeOption);

      // Select reviewer
      const reviewerField = await screen.findByLabelText(/reviewer/i);
      await user.click(reviewerField);
      const reviewerOption = await screen.findByText(/jane smith/i);
      await user.click(reviewerOption);

      // Select appraisal type
      const typeField = await screen.findByLabelText(/appraisal type/i);
      await user.click(typeField);
      const typeOption = await screen.findByText(/mid year/i);
      await user.click(typeOption);

      // ---- Add a goal (so draft can be saved) ----
      const addGoalButton = screen.getByRole("button", { name: /add goal/i });
      await user.click(addGoalButton);

      const goalTitleInput = await screen.findByPlaceholderText(
        /enter goal title/i
      );
      await user.type(goalTitleInput, "Test Goal");

      const goalWeightInput = screen.getByLabelText(/weight/i);
      await user.type(goalWeightInput, "30");

      const saveGoalBtn = screen.getByRole("button", { name: /save goal/i });
      await user.click(saveGoalBtn);

      // ---- Try to save draft ----
      const saveButton = screen.getByRole("button", { name: /save draft/i });
      await user.click(saveButton);

      // ---- Verify error toast shows ----
      await waitFor(() => {
        expect(toastSpy).toHaveBeenCalledWith(
          "Failed to save appraisal",
          expect.objectContaining({
            description: expect.stringMatching(/server error/i),
          })
        );
      });

      // ---- Verify state did not transition ----
      // Button should remain "Save Draft" (not Save Changes)
      expect(
        screen.getByRole("button", { name: /save draft/i })
      ).toBeInTheDocument();

      // Badge should remain "New Draft"
      expect(screen.getByTestId("appraisal-status-badge")).toHaveTextContent(
        /new draft/i
      );

      // Cleanup
      toastSpy.mockRestore();
    });
  });

  describe("Role-based access control", () => {
    it("should filter eligible appraisees based on user level", async () => {
      const user = userEvent.setup({ delay: null });

      // Setup mock server response for appraisees
      server.use(
        http.get("/api/employees/eligible-appraisees", () => {
          return HttpResponse.json([
            {
              id: 1,
              name: "John Doe",
              email: "john@example.com",
              role: "Developer",
            },
            {
              id: 2,
              name: "Jane Smith",
              email: "jane@example.com",
              role: "Developer",
            },
          ]);
        })
      );

      render(<CreateAppraisal />, {
        auth: { user: mockUser, status: "succeeded" },
      });

      // Wait for the employee dropdown to be available and click it
      // Find and interact with the employee select dropdown
      const initialEmployeeSelect = await screen.findByRole(
        "combobox",
        {
          name: /employee/i,
        },
        { timeout: 10000 }
      );

      // Ensure the dropdown is visible and clickable
      await waitFor(() => {
        expect(initialEmployeeSelect).toBeVisible();
        expect(initialEmployeeSelect).toBeEnabled();
      });

      await user.click(initialEmployeeSelect);

      // Wait for the dropdown options to appear
      const employeeOption = await screen.findByRole(
        "option",
        {
          name: /john doe/i,
        },
        { timeout: 10000 }
      );

      await waitFor(() => {
        expect(employeeOption).toBeVisible();
        expect(employeeOption).toBeEnabled();
      });

      await user.click(employeeOption);

      // Verify the selection was made
      await waitFor(() => {
        expect(screen.getByDisplayValue(/john doe/i)).toBeInTheDocument();
      });

      // Verify the combobox is still present and click it again
      const employeeSelect2 = screen.getByRole("combobox", {
        name: /employee/i,
      });
      await waitFor(() => {
        expect(employeeSelect2).toBeInTheDocument();
        expect(employeeSelect2).toBeEnabled();
      });

      await user.click(employeeSelect2);

      // Should show employees at same or lower level (Jane Smith - Level 3)
      const listboxEmp = await screen.findByRole("listbox");
      expect(
        within(listboxEmp).getByRole("option", {
          name: /jane smith.*developer/i,
        })
      ).toBeInTheDocument();

      // Should not show higher level employees or self
      expect(
        within(listboxEmp).queryByRole("option", { name: /john doe/i })
      ).not.toBeInTheDocument();
    });

    it("should filter eligible reviewers based on user level", async () => {
      vi.setConfig({ testTimeout: 20000 });
      const user = userEvent.setup();
      render(<CreateAppraisal />, {
        auth: { user: mockUser, status: "succeeded" }, // Level 4 Manager
      });

      await waitFor(() => {
        expect(
          screen.getByRole("combobox", { name: /employee/i })
        ).toBeInTheDocument();
      });

      // Select an employee first
      const employeeSelect = screen.getByRole("combobox", {
        name: /employee/i,
      });
      await user.click(employeeSelect);
      const listboxEmp = await screen.findByRole("listbox");
      await user.click(
        within(listboxEmp).getByRole("option", { name: /jane smith/i })
      );

      // Check reviewer options
      const reviewerSelect = screen.getByRole("combobox", {
        name: /reviewer/i,
      });
      await user.click(reviewerSelect);

      // Should show employees at same or higher level (Bob Wilson - Level 6 VP)
      const listboxReviewer = await screen.findByRole("listbox");
      expect(
        within(listboxReviewer).getByRole("option", { name: /bob wilson.*vp/i })
      ).toBeInTheDocument();

      // Should not show lower level employees or self
      expect(
        within(listboxReviewer).queryByRole("option", { name: /jane smith/i })
      ).not.toBeInTheDocument();
      expect(
        within(listboxReviewer).queryByRole("option", { name: /john doe/i })
      ).not.toBeInTheDocument();
    });
  }); // End of Role-based access control

  describe("Navigation", () => {
    it("should navigate back when back button is clicked", async () => {
      const user = userEvent.setup();

      render(<CreateAppraisal />, {
        auth: { user: mockUser, status: "succeeded" },
      });

      const backButton = screen.getByRole("button", { name: /back/i });
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it("should show correct page title for new appraisal", () => {
      render(<CreateAppraisal />, {
        auth: { user: mockUser, status: "succeeded" },
      });

      expect(
        screen.getByRole("heading", { name: /create new appraisal/i })
      ).toBeInTheDocument();
      expect(screen.getByText("New Draft")).toBeInTheDocument();
    });
  });
});
