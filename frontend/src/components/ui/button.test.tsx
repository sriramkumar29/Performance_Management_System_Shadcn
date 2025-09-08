import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button, type ButtonProps } from "./button";

const renderButton = (props?: ButtonProps) => {
  return render(<Button {...props}>Test Button</Button>);
};

describe("Button", () => {
  describe("Basic Rendering", () => {
    it("should render button with default variant and size", () => {
      renderButton();

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Test Button");
      expect(button).toHaveClass(
        "bg-primary",
        "text-primary-foreground",
        "h-9"
      );
    });

    it("should apply custom className alongside default classes", () => {
      renderButton({ className: "custom-class" });

      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
      expect(button).toHaveClass("bg-primary"); // Default variant should still be applied
    });
  });

  describe("Variants", () => {
    it("should render primary variant", () => {
      renderButton({ variant: "primary" });

      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-primary", "text-primary-foreground");
    });

    it("should render secondary variant", () => {
      renderButton({ variant: "secondary" });

      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-secondary", "text-secondary-foreground");
    });

    it("should render outline variant", () => {
      renderButton({ variant: "outline" });

      const button = screen.getByRole("button");
      expect(button).toHaveClass("border", "border-input", "bg-background");
    });

    it("should render ghost variant", () => {
      renderButton({ variant: "ghost" });

      const button = screen.getByRole("button");
      expect(button).toHaveClass(
        "hover:bg-accent",
        "hover:text-accent-foreground"
      );
    });

    it("should render link variant", () => {
      renderButton({ variant: "link" });

      const button = screen.getByRole("button");
      expect(button).toHaveClass(
        "text-primary",
        "underline-offset-4",
        "hover:underline"
      );
    });

    it("should render destructive variant", () => {
      renderButton({ variant: "destructive" });

      const button = screen.getByRole("button");
      expect(button).toHaveClass(
        "bg-destructive",
        "text-destructive-foreground"
      );
    });

    it("should render soft variant", () => {
      renderButton({ variant: "soft" });

      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-primary/10", "text-primary");
    });

    it("should render elevated variant", () => {
      renderButton({ variant: "elevated" });

      const button = screen.getByRole("button");
      expect(button).toHaveClass(
        "bg-primary",
        "text-primary-foreground",
        "shadow-sm"
      );
    });
  });

  describe("Sizes", () => {
    it("should render default size", () => {
      renderButton({ size: "default" });

      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-9", "px-3.5", "py-2");
    });

    it("should render small size", () => {
      renderButton({ size: "sm" });

      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-8", "px-3", "py-1.5");
    });

    it("should render large size", () => {
      renderButton({ size: "lg" });

      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-10", "px-6");
    });

    it("should render extra large size", () => {
      renderButton({ size: "xl" });

      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-12", "px-8");
    });

    it("should render extra small size", () => {
      renderButton({ size: "xs" });

      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-7", "px-2.5", "text-xs");
    });

    it("should render icon size", () => {
      renderButton({ size: "icon" });

      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-9", "w-9");
    });
  });

  describe("Loading State", () => {
    it("should show loading spinner when loading is true", () => {
      renderButton({ loading: true });

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-busy", "true");
      expect(button).toHaveAttribute("data-loading", "true");
      expect(button).toBeDisabled();

      // Check for loading spinner
      const spinner = button.querySelector("svg");
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass("animate-spin");
    });

    it("should show default loading text", () => {
      renderButton({ loading: true });

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should show custom loading text", () => {
      renderButton({ loading: true, loadingText: "Processing..." });

      expect(screen.getByText("Processing...")).toBeInTheDocument();
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    it("should hide button content when loading", () => {
      renderButton({ loading: true });

      const button = screen.getByRole("button");
      // Find the content span that has the opacity-0 class
      const contentSpan = button.querySelector("span.opacity-0");
      expect(contentSpan).toBeInTheDocument();
      expect(contentSpan).toHaveClass("opacity-0");
    });

    it("should not trigger onClick when loading", () => {
      const handleClick = vi.fn();
      renderButton({ loading: true, onClick: handleClick });

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("Disabled State", () => {
    it("should be disabled when disabled prop is true", () => {
      renderButton({ disabled: true });

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("aria-disabled", "true");
      expect(button).toHaveClass(
        "disabled:pointer-events-none",
        "disabled:opacity-50"
      );
    });

    it("should not trigger onClick when disabled", () => {
      const handleClick = vi.fn();
      renderButton({ disabled: true, onClick: handleClick });

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("Event Handling", () => {
    it("should handle onClick events", () => {
      const handleClick = vi.fn();
      renderButton({ onClick: handleClick });

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledOnce();
    });

    it("should handle keyboard events", () => {
      const handleKeyDown = vi.fn();
      renderButton({ onKeyDown: handleKeyDown });

      const button = screen.getByRole("button");
      fireEvent.keyDown(button, { key: "Enter" });

      expect(handleKeyDown).toHaveBeenCalledOnce();
    });
  });

  describe("AsChild Functionality", () => {
    it("should render as button when asChild is false", () => {
      renderButton({ asChild: false });

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe("BUTTON");
    });

    // Note: asChild with Slot requires special setup and single child element
    // This functionality is more complex to test and typically tested at integration level
  });

  describe("Accessibility", () => {
    it("should have proper focus styles", () => {
      renderButton();

      const button = screen.getByRole("button");
      expect(button).toHaveClass(
        "focus-visible:outline-none",
        "focus-visible:ring-2",
        "focus-visible:ring-ring",
        "focus-visible:ring-offset-2"
      );
    });

    it("should support aria-label", () => {
      render(<Button aria-label="Custom label">Icon Button</Button>);

      const button = screen.getByLabelText("Custom label");
      expect(button).toBeInTheDocument();
    });

    it("should support custom aria attributes", () => {
      render(
        <Button aria-describedby="help-text">Button with description</Button>
      );

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-describedby", "help-text");
    });
  });

  describe("Common Classes", () => {
    it("should apply all common button classes", () => {
      renderButton();

      const button = screen.getByRole("button");
      expect(button).toHaveClass(
        "group",
        "inline-flex",
        "items-center",
        "justify-center",
        "whitespace-nowrap",
        "rounded-md",
        "text-sm",
        "font-medium",
        "transition-all",
        "duration-200",
        "ease-out",
        "active:scale-95",
        "gap-2"
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty content", () => {
      const { container } = render(<Button />);

      const button = container.querySelector("button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass("inline-flex");
    });

    it("should handle complex children", () => {
      render(
        <Button>
          <span>Icon</span>
          <span>Text</span>
        </Button>
      );

      expect(screen.getByText("Icon")).toBeInTheDocument();
      expect(screen.getByText("Text")).toBeInTheDocument();
    });

    it("should pass through data attributes", () => {
      render(
        <Button data-testid="test-button" data-custom="value">
          Test
        </Button>
      );

      const button = screen.getByTestId("test-button");
      expect(button).toHaveAttribute("data-custom", "value");
    });
  });
});
