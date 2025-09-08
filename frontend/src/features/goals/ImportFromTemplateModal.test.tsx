import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import ImportFromTemplateModal from "./ImportFromTemplateModal";
import * as api from "../../utils/api";

// Mock the API
vi.mock("../../utils/api", () => ({
  apiFetch: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Test data
const mockTemplates = [
  {
    temp_id: 1,
    temp_title: "Improve Technical Skills",
    temp_description: "Focus on learning new technologies and best practices",
    temp_performance_factor: "Complete certifications and build projects",
    temp_importance: "High",
    temp_weightage: 30,
    categories: [
      { id: 1, name: "Technical" },
      { id: 2, name: "Professional Development" },
    ],
  },
  {
    temp_id: 2,
    temp_title: "Team Leadership",
    temp_description: "Develop leadership and mentoring skills",
    temp_performance_factor: "Lead team projects and mentor junior developers",
    temp_importance: "Medium",
    temp_weightage: 25,
    categories: [
      { id: 3, name: "Leadership" },
      { id: 4, name: "Communication" },
    ],
  },
  {
    temp_id: 3,
    temp_title: "Process Improvement",
    temp_description: "Optimize team workflows and processes",
    temp_performance_factor: "Implement automation and improve efficiency",
    temp_importance: "Medium",
    temp_weightage: 20,
    categories: [
      { id: 1, name: "Technical" },
      { id: 5, name: "Operations" },
    ],
  },
];

const defaultProps = {
  open: false,
  onClose: vi.fn(),
  onGoalAdded: vi.fn(),
  appraisalId: 1,
  remainingWeightage: 100,
};

describe("ImportFromTemplateModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.apiFetch).mockResolvedValue({
      ok: true,
      data: mockTemplates,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Modal State", () => {
    it("should not render when closed", () => {
      render(<ImportFromTemplateModal {...defaultProps} />);

      expect(
        screen.queryByText("Import Goals from Templates")
      ).not.toBeInTheDocument();
    });

    it("should render when open", async () => {
      render(<ImportFromTemplateModal {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(
          screen.getByText("Import Goals from Templates")
        ).toBeInTheDocument();
      });
    });

    it("should close when onClose is called", async () => {
      const onClose = vi.fn();
      render(
        <ImportFromTemplateModal
          {...defaultProps}
          open={true}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText("Import Goals from Templates")
        ).toBeInTheDocument();
      });

      // Simulate dialog close
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("Data Loading", () => {
    it("should load templates when modal opens", async () => {
      render(<ImportFromTemplateModal {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(api.apiFetch).toHaveBeenCalledWith("/api/goals/templates");
      });
    });

    it("should display loaded templates", async () => {
      render(<ImportFromTemplateModal {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(
          screen.getByText("Improve Technical Skills")
        ).toBeInTheDocument();
        expect(screen.getByText("Team Leadership")).toBeInTheDocument();
        expect(screen.getByText("Process Improvement")).toBeInTheDocument();
      });
    });

    it("should handle templates loading error gracefully", async () => {
      vi.mocked(api.apiFetch).mockResolvedValue({
        ok: false,
        error: "Failed to load templates",
      });

      render(<ImportFromTemplateModal {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(api.apiFetch).toHaveBeenCalledWith("/api/goals/templates");
      });

      // Should show no templates found message
      expect(screen.getByText("No templates found.")).toBeInTheDocument();
    });

    it("should show no templates message when none found", async () => {
      vi.mocked(api.apiFetch).mockResolvedValue({
        ok: true,
        data: [],
      });

      render(<ImportFromTemplateModal {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(screen.getByText("No templates found.")).toBeInTheDocument();
      });
    });
  });

  describe("Template Filtering", () => {
    it("should filter templates by title", async () => {
      const user = userEvent.setup();
      render(<ImportFromTemplateModal {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(
          screen.getByText("Improve Technical Skills")
        ).toBeInTheDocument();
      });

      // Filter by title
      const filterInput = screen.getByPlaceholderText(
        "Filter by title or category"
      );
      await user.type(filterInput, "leadership");

      // Should only show Team Leadership template
      expect(screen.getByText("Team Leadership")).toBeInTheDocument();
      expect(
        screen.queryByText("Improve Technical Skills")
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Process Improvement")).not.toBeInTheDocument();
    });

    it("should filter templates by category", async () => {
      const user = userEvent.setup();
      render(<ImportFromTemplateModal {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(
          screen.getByText("Improve Technical Skills")
        ).toBeInTheDocument();
      });

      // Filter by category
      const filterInput = screen.getByPlaceholderText(
        "Filter by title or category"
      );
      await user.type(filterInput, "technical");

      // Should show templates with Technical category
      expect(screen.getByText("Improve Technical Skills")).toBeInTheDocument();
      expect(screen.getByText("Process Improvement")).toBeInTheDocument();
      expect(screen.queryByText("Team Leadership")).not.toBeInTheDocument();
    });

    it("should show all templates when filter is cleared", async () => {
      const user = userEvent.setup();
      render(<ImportFromTemplateModal {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(
          screen.getByText("Improve Technical Skills")
        ).toBeInTheDocument();
      });

      // Filter first
      const filterInput = screen.getByPlaceholderText(
        "Filter by title or category"
      );
      await user.type(filterInput, "leadership");

      expect(
        screen.queryByText("Improve Technical Skills")
      ).not.toBeInTheDocument();

      // Clear filter
      await user.clear(filterInput);

      // Should show all templates again
      expect(screen.getByText("Improve Technical Skills")).toBeInTheDocument();
      expect(screen.getByText("Team Leadership")).toBeInTheDocument();
      expect(screen.getByText("Process Improvement")).toBeInTheDocument();
    });
  });

  describe("Template Selection", () => {
    it("should allow selecting and deselecting templates", async () => {
      const user = userEvent.setup();
      render(<ImportFromTemplateModal {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(
          screen.getByText("Improve Technical Skills")
        ).toBeInTheDocument();
      });

      // Get checkbox for first template
      const checkboxes = screen.getAllByRole("checkbox");
      const firstCheckbox = checkboxes[0];

      // Initially unchecked
      expect(firstCheckbox).not.toBeChecked();

      // Select template
      await user.click(firstCheckbox);
      expect(firstCheckbox).toBeChecked();

      // Deselect template
      await user.click(firstCheckbox);
      expect(firstCheckbox).not.toBeChecked();
    });

    it("should allow selecting multiple templates", async () => {
      const user = userEvent.setup();
      render(<ImportFromTemplateModal {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(
          screen.getByText("Improve Technical Skills")
        ).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole("checkbox");

      // Select first two templates
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);

      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).toBeChecked();
      expect(checkboxes[2]).not.toBeChecked();
    });
  });

  describe("Template Information Display", () => {
    it("should display template details correctly", async () => {
      render(<ImportFromTemplateModal {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(
          screen.getByText("Improve Technical Skills")
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            "Focus on learning new technologies and best practices"
          )
        ).toBeInTheDocument();
        // Multiple templates have "Weightage:" text, so we check for the specific weightage percentage
        expect(screen.getByText("30%")).toBeInTheDocument();
        expect(screen.getAllByText("Technical").length).toBeGreaterThan(0);
        expect(
          screen.getByText("Professional Development")
        ).toBeInTheDocument();
      });
    });

    it("should display remaining weightage", async () => {
      render(
        <ImportFromTemplateModal
          {...defaultProps}
          open={true}
          remainingWeightage={85}
        />
      );

      await waitFor(() => {
        // Check that "85" is displayed in the remaining weightage section
        expect(screen.getByText("85%")).toBeInTheDocument();
      });
    });
  });

  describe("Import Validation", () => {
    it("should show error when no templates selected", async () => {
      const user = userEvent.setup();
      render(<ImportFromTemplateModal {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(
          screen.getByText("Import Goals from Templates")
        ).toBeInTheDocument();
      });

      // Try to import without selecting any templates
      const importButton = screen.getByText("Import Selected");
      await user.click(importButton);

      // Verify error toast was called
      const { toast } = await import("sonner");
      expect(toast.error).toHaveBeenCalledWith("No templates selected", {
        description: "Pick at least one template to import.",
      });
    });

    it("should validate weightage constraints during import", async () => {
      const user = userEvent.setup();
      render(
        <ImportFromTemplateModal
          {...defaultProps}
          open={true}
          remainingWeightage={25}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText("Improve Technical Skills")
        ).toBeInTheDocument();
      });

      // Select template with weightage > remaining
      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[0]); // 30% weightage, but only 25% remaining

      // Try to import
      const importButton = screen.getByText("Import Selected");
      await user.click(importButton);

      // Verify error toast was called for insufficient weightage
      const { toast } = await import("sonner");
      expect(toast.error).toHaveBeenCalledWith(
        "Insufficient remaining weightage",
        {
          description: 'Skipping "Improve Technical Skills" (30%)',
        }
      );
    });
  });

  describe("Successful Import", () => {
    it("should successfully import selected templates", async () => {
      const user = userEvent.setup();
      const onGoalAdded = vi.fn();
      const onClose = vi.fn();

      render(
        <ImportFromTemplateModal
          {...defaultProps}
          open={true}
          onGoalAdded={onGoalAdded}
          onClose={onClose}
          remainingWeightage={100}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText("Improve Technical Skills")
        ).toBeInTheDocument();
      });

      // Select first template
      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[0]);

      // Import
      const importButton = screen.getByText("Import Selected");
      await user.click(importButton);

      await waitFor(() => {
        expect(onGoalAdded).toHaveBeenCalledWith(
          expect.objectContaining({
            goal: expect.objectContaining({
              goal_title: "Improve Technical Skills",
              goal_weightage: 30,
              goal_template_id: 1,
            }),
          })
        );
      });

      // Verify success toast and modal close
      const { toast } = await import("sonner");
      expect(toast.success).toHaveBeenCalledWith("Imported", {
        description: "Templates staged as goals. Save to apply changes.",
      });
      expect(onClose).toHaveBeenCalled();
    });

    it("should import multiple templates correctly", async () => {
      const user = userEvent.setup();
      const onGoalAdded = vi.fn();

      render(
        <ImportFromTemplateModal
          {...defaultProps}
          open={true}
          onGoalAdded={onGoalAdded}
          remainingWeightage={100}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Team Leadership")).toBeInTheDocument();
      });

      // Select multiple templates
      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[1]); // Team Leadership (25%)
      await user.click(checkboxes[2]); // Process Improvement (20%)

      // Import
      const importButton = screen.getByText("Import Selected");
      await user.click(importButton);

      await waitFor(() => {
        expect(onGoalAdded).toHaveBeenCalledTimes(2);
      });

      // Check that both templates were added
      expect(onGoalAdded).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          goal: expect.objectContaining({
            goal_title: "Team Leadership",
          }),
        })
      );
      expect(onGoalAdded).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          goal: expect.objectContaining({
            goal_title: "Process Improvement",
          }),
        })
      );
    });
  });

  describe("Category Assignment", () => {
    it("should use default category when none selected", async () => {
      const user = userEvent.setup();
      const onGoalAdded = vi.fn();

      render(
        <ImportFromTemplateModal
          {...defaultProps}
          open={true}
          onGoalAdded={onGoalAdded}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText("Improve Technical Skills")
        ).toBeInTheDocument();
      });

      // Select template and import (should use first category by default)
      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[0]);

      const importButton = screen.getByText("Import Selected");
      await user.click(importButton);

      await waitFor(() => {
        expect(onGoalAdded).toHaveBeenCalledWith(
          expect.objectContaining({
            goal: expect.objectContaining({
              category_id: 1, // First category (Technical)
              category: expect.objectContaining({
                id: 1,
                name: "Technical",
              }),
            }),
          })
        );
      });
    });
  });

  describe("UI Interactions", () => {
    it("should show import button and allow interaction", async () => {
      const user = userEvent.setup();
      render(<ImportFromTemplateModal {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(
          screen.getByText("Improve Technical Skills")
        ).toBeInTheDocument();
      });

      // Select template
      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[0]);

      // Find the import button
      const importButton = screen.getByRole("button", {
        name: /import selected/i,
      });

      // Button should be clickable
      expect(importButton).toBeInTheDocument();
      expect(importButton).not.toBeDisabled();
    });

    it("should display cancel button", async () => {
      render(<ImportFromTemplateModal {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(screen.getByText("Cancel")).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      vi.mocked(api.apiFetch).mockRejectedValue(new Error("Network error"));

      render(<ImportFromTemplateModal {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(api.apiFetch).toHaveBeenCalledWith("/api/goals/templates");
      });

      // Should show no templates when API fails
      expect(screen.getByText("No templates found.")).toBeInTheDocument();
    });
  });
});
