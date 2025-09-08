import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge, type BadgeProps } from "./badge";

const renderBadge = (props?: BadgeProps) => {
  return render(<Badge {...props}>Test Badge</Badge>);
};

describe("Badge", () => {
  it("should render badge with default variant", () => {
    renderBadge();

    const badge = screen.getByText("Test Badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-primary", "text-primary-foreground");
  });

  it("should render badge with secondary variant", () => {
    renderBadge({ variant: "secondary" });

    const badge = screen.getByText("Test Badge");
    expect(badge).toHaveClass("bg-secondary", "text-secondary-foreground");
  });

  it("should render badge with outline variant", () => {
    renderBadge({ variant: "outline" });

    const badge = screen.getByText("Test Badge");
    expect(badge).toHaveClass("text-foreground");
    expect(badge).not.toHaveClass("border-transparent");
  });

  it("should render badge with destructive variant", () => {
    renderBadge({ variant: "destructive" });

    const badge = screen.getByText("Test Badge");
    expect(badge).toHaveClass("bg-destructive", "text-destructive-foreground");
  });

  it("should render badge with success variant", () => {
    renderBadge({ variant: "success" });

    const badge = screen.getByText("Test Badge");
    expect(badge).toHaveClass(
      "bg-[hsl(var(--success))]",
      "text-[hsl(var(--success-foreground))]"
    );
  });

  it("should render badge with warning variant", () => {
    renderBadge({ variant: "warning" });

    const badge = screen.getByText("Test Badge");
    expect(badge).toHaveClass(
      "bg-[hsl(var(--warning))]",
      "text-[hsl(var(--warning-foreground))]"
    );
  });

  it("should apply common badge classes for all variants", () => {
    renderBadge();

    const badge = screen.getByText("Test Badge");
    expect(badge).toHaveClass(
      "inline-flex",
      "items-center",
      "rounded-full",
      "border",
      "px-2.5",
      "py-0.5",
      "text-xs",
      "font-semibold",
      "transition-colors"
    );
  });

  it("should apply custom className alongside variant classes", () => {
    renderBadge({ className: "custom-class" });

    const badge = screen.getByText("Test Badge");
    expect(badge).toHaveClass("custom-class");
    expect(badge).toHaveClass("bg-primary"); // Default variant should still be applied
  });

  it("should spread additional HTML attributes", () => {
    render(
      <Badge data-testid="test-badge" id="badge-id">
        Test Badge
      </Badge>
    );

    const badge = screen.getByTestId("test-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("id", "badge-id");
  });

  it("should handle different content types", () => {
    render(
      <div>
        <Badge>Text Content</Badge>
        <Badge>123</Badge>
        <Badge>
          <span>Nested Content</span>
        </Badge>
      </div>
    );

    expect(screen.getByText("Text Content")).toBeInTheDocument();
    expect(screen.getByText("123")).toBeInTheDocument();
    expect(screen.getByText("Nested Content")).toBeInTheDocument();
  });

  it("should be accessible with proper focus styles", () => {
    renderBadge();

    const badge = screen.getByText("Test Badge");
    expect(badge).toHaveClass(
      "focus:outline-none",
      "focus:ring-2",
      "focus:ring-ring",
      "focus:ring-offset-2"
    );
  });

  it("should render with minimal content", () => {
    render(<Badge>1</Badge>);

    const badge = screen.getByText("1");
    expect(badge).toBeInTheDocument();
  });

  it("should handle empty content gracefully", () => {
    const { container } = render(<Badge />);

    const badge = container.firstChild;
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("inline-flex");
  });

  it("should combine multiple variants if explicitly provided via className", () => {
    // Testing edge case where someone might try to override variant via className
    renderBadge({
      variant: "success",
      className: "bg-red-500", // This should override the success background
    });

    const badge = screen.getByText("Test Badge");
    expect(badge).toHaveClass("bg-red-500"); // Custom class
    // Note: The success classes should still be present but might be overridden by CSS specificity
  });

  it("should handle onClick events when provided", () => {
    const handleClick = vi.fn();
    render(<Badge onClick={handleClick}>Clickable Badge</Badge>);

    const badge = screen.getByText("Clickable Badge");
    badge.click();

    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("should support aria attributes for accessibility", () => {
    render(
      <Badge aria-label="Status badge" role="status">
        Test Badge
      </Badge>
    );

    const badge = screen.getByRole("status");
    expect(badge).toHaveAttribute("aria-label", "Status badge");
  });
});
