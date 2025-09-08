import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Label } from "./label";

describe("Label", () => {
  describe("Basic Rendering", () => {
    it("should render label with default classes", () => {
      render(<Label>Test Label</Label>);

      const label = screen.getByText("Test Label");
      expect(label).toBeInTheDocument();
      expect(label).toHaveClass(
        "text-sm",
        "font-medium",
        "leading-none",
        "peer-disabled:cursor-not-allowed",
        "peer-disabled:opacity-70"
      );
    });

    it("should render as label element by default", () => {
      render(<Label>Form Label</Label>);

      const label = screen.getByText("Form Label");
      expect(label.tagName).toBe("LABEL");
    });
  });

  describe("Class Name Handling", () => {
    it("should apply custom className alongside default classes", () => {
      render(<Label className="custom-label">Custom Label</Label>);

      const label = screen.getByText("Custom Label");
      expect(label).toHaveClass("custom-label");
      expect(label).toHaveClass("text-sm", "font-medium", "leading-none"); // Default classes
    });

    it("should handle multiple custom classes", () => {
      render(
        <Label className="text-lg text-blue-500 font-bold">
          Multi Class Label
        </Label>
      );

      const label = screen.getByText("Multi Class Label");
      expect(label).toHaveClass("text-lg", "text-blue-500", "font-bold");
    });
  });

  describe("Props and Attributes", () => {
    it("should pass through all HTML label attributes", () => {
      render(
        <Label htmlFor="test-input" id="test-label">
          Input Label
        </Label>
      );

      const label = screen.getByText("Input Label");
      expect(label).toHaveAttribute("for", "test-input");
      expect(label).toHaveAttribute("id", "test-label");
    });

    it("should support data attributes", () => {
      render(
        <Label data-testid="custom-label" data-custom="value">
          Data Label
        </Label>
      );

      const label = screen.getByTestId("custom-label");
      expect(label).toHaveAttribute("data-custom", "value");
    });

    it("should support aria attributes", () => {
      render(
        <Label aria-label="Accessible label" aria-describedby="help-text">
          Accessible Label
        </Label>
      );

      const label = screen.getByText("Accessible Label");
      expect(label).toHaveAttribute("aria-label", "Accessible label");
      expect(label).toHaveAttribute("aria-describedby", "help-text");
    });
  });

  describe("Content Handling", () => {
    it("should render text content", () => {
      render(<Label>Simple Text</Label>);

      expect(screen.getByText("Simple Text")).toBeInTheDocument();
    });

    it("should render complex content with nested elements", () => {
      render(
        <Label>
          <span>Required</span>
          <span className="text-red-500">*</span>
        </Label>
      );

      expect(screen.getByText("Required")).toBeInTheDocument();
      expect(screen.getByText("*")).toBeInTheDocument();

      const asterisk = screen.getByText("*");
      expect(asterisk).toHaveClass("text-red-500");
    });

    it("should handle numeric content", () => {
      render(<Label>Label 123</Label>);

      expect(screen.getByText("Label 123")).toBeInTheDocument();
    });

    it("should handle empty content gracefully", () => {
      const { container } = render(<Label />);

      const label = container.firstChild;
      expect(label).toBeInTheDocument();
      expect(label).toHaveClass("text-sm");
    });
  });

  describe("Form Integration", () => {
    it("should associate with form input via htmlFor", () => {
      render(
        <div>
          <Label htmlFor="username">Username</Label>
          <input id="username" type="text" />
        </div>
      );

      const label = screen.getByText("Username");
      const input = screen.getByRole("textbox");

      expect(label).toHaveAttribute("for", "username");
      expect(input).toHaveAttribute("id", "username");
    });

    it("should work with wrapped input (implicit association)", () => {
      render(
        <Label>
          Email
          <input type="email" />
        </Label>
      );

      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should support screen reader accessible labels", () => {
      render(<Label aria-label="Screen reader label">Visual Label</Label>);

      const label = screen.getByLabelText("Screen reader label");
      expect(label).toBeInTheDocument();
    });

    it("should maintain semantic meaning as label element", () => {
      render(<Label htmlFor="test">Semantic Label</Label>);

      const label = screen.getByText("Semantic Label");
      expect(label.tagName).toBe("LABEL");
    });

    it("should support role attribute when needed", () => {
      render(<Label role="button">Clickable Label</Label>);

      const label = screen.getByRole("button");
      expect(label).toBeInTheDocument();
    });
  });

  describe("Event Handling", () => {
    it("should handle click events", () => {
      const handleClick = vi.fn();
      render(<Label onClick={handleClick}>Clickable Label</Label>);

      const label = screen.getByText("Clickable Label");
      label.click();

      expect(handleClick).toHaveBeenCalledOnce();
    });

    it("should handle keyboard events", () => {
      const handleKeyDown = vi.fn();
      render(<Label onKeyDown={handleKeyDown}>Keyboard Label</Label>);

      const label = screen.getByText("Keyboard Label");
      label.focus();
      fireEvent.keyDown(label, { key: "Enter" });

      expect(handleKeyDown).toHaveBeenCalledOnce();
    });

    it("should handle mouse events", () => {
      const handleMouseOver = vi.fn();
      render(<Label onMouseOver={handleMouseOver}>Hover Label</Label>);

      const label = screen.getByText("Hover Label");
      fireEvent.mouseOver(label);

      expect(handleMouseOver).toHaveBeenCalledOnce();
    });
  });

  describe("Ref Forwarding", () => {
    it("should forward ref to the label element", () => {
      const ref = React.createRef<HTMLLabelElement>();
      render(<Label ref={ref}>Ref Label</Label>);

      expect(ref.current).toBeInstanceOf(HTMLLabelElement);
      expect(ref.current).toHaveTextContent("Ref Label");
    });

    it("should allow accessing label methods via ref", () => {
      const ref = React.createRef<HTMLLabelElement>();
      render(<Label ref={ref}>Method Label</Label>);

      expect(ref.current?.click).toBeDefined();
      expect(ref.current?.focus).toBeDefined();
    });
  });

  describe("Styling Variations", () => {
    it("should support different text sizes", () => {
      const { rerender } = render(
        <Label className="text-xs">Small Label</Label>
      );
      expect(screen.getByText("Small Label")).toHaveClass("text-xs");

      rerender(<Label className="text-lg">Large Label</Label>);
      expect(screen.getByText("Large Label")).toHaveClass("text-lg");
    });

    it("should support different font weights", () => {
      render(<Label className="font-light">Light Label</Label>);
      expect(screen.getByText("Light Label")).toHaveClass("font-light");
    });

    it("should support color variations", () => {
      render(<Label className="text-red-500">Error Label</Label>);
      expect(screen.getByText("Error Label")).toHaveClass("text-red-500");
    });

    it("should support required field styling", () => {
      render(
        <Label className="after:content-['*'] after:text-red-500">
          Required Field
        </Label>
      );

      const label = screen.getByText("Required Field");
      expect(label).toHaveClass("after:content-['*']", "after:text-red-500");
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long text", () => {
      const longText =
        "This is a very long label text that might wrap across multiple lines and should still maintain proper styling and functionality";
      render(<Label>{longText}</Label>);

      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it("should handle special characters", () => {
      render(<Label>Label with special chars: @#$%^&*()</Label>);

      expect(
        screen.getByText("Label with special chars: @#$%^&*()")
      ).toBeInTheDocument();
    });

    it("should handle unicode characters", () => {
      render(<Label>Unicode: 你好 🌟 ñáéíóú</Label>);

      expect(screen.getByText("Unicode: 你好 🌟 ñáéíóú")).toBeInTheDocument();
    });

    it("should handle whitespace-only content", () => {
      const { container } = render(<Label> </Label>);

      const label = container.firstChild as HTMLElement;
      expect(label).toBeInTheDocument();
      expect(label).toHaveClass("text-sm");
      expect(label.textContent).toBe("   ");
    });
  });
});
