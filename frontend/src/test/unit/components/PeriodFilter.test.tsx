import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PeriodFilter from "./PeriodFilter";

const mockOnPeriodChange = vi.fn();

const defaultProps = {
  onChange: mockOnPeriodChange,
};

describe("PeriodFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render period filter dropdown", () => {
    render(<PeriodFilter {...defaultProps} />);

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("All")).toBeInTheDocument();
  });

  it("should show all period options when opened", () => {
    render(<PeriodFilter {...defaultProps} />);

    const dropdown = screen.getByRole("combobox");
    fireEvent.click(dropdown);

    expect(screen.getByText("This Year")).toBeInTheDocument();
    expect(screen.getByText("Last Year")).toBeInTheDocument();
    expect(screen.getByText("Custom Range")).toBeInTheDocument();
  });

  it("should call onPeriodChange when option is selected", () => {
    render(<PeriodFilter {...defaultProps} />);

    const dropdown = screen.getByRole("combobox");
    fireEvent.click(dropdown);

    const thisYearOption = screen.getByText("This Year");
    fireEvent.click(thisYearOption);

    expect(mockOnPeriodChange).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "This Year",
      })
    );
  });

  it("should display selected period correctly", () => {
    const customValue = {
      label: "This Year",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
    };
    render(<PeriodFilter {...defaultProps} value={customValue} />);

    expect(screen.getByText("This Year")).toBeInTheDocument();
  });

  it("should handle custom date range selection", () => {
    render(<PeriodFilter {...defaultProps} />);

    const dropdown = screen.getByRole("combobox");
    fireEvent.click(dropdown);

    const customOption = screen.getByText("Custom Range");
    fireEvent.click(customOption);

    expect(mockOnPeriodChange).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "Custom Range",
      })
    );
  });
});
