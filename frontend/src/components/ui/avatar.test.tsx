import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { Avatar, AvatarFallback } from "./avatar";

describe("Avatar Components", () => {
  describe("Avatar (Root)", () => {
    it("should render avatar container with default classes", () => {
      const { container } = render(<Avatar />);

      const avatar = container.firstChild as HTMLElement;
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveClass(
        "relative",
        "flex",
        "h-10",
        "w-10",
        "shrink-0",
        "overflow-hidden",
        "rounded-full"
      );
    });

    it("should apply custom className alongside default classes", () => {
      const { container } = render(<Avatar className="custom-avatar" />);

      const avatar = container.firstChild as HTMLElement;
      expect(avatar).toHaveClass("custom-avatar");
      expect(avatar).toHaveClass("h-10", "w-10", "rounded-full"); // Default classes should still be applied
    });

    it("should pass through additional props", () => {
      const { container } = render(
        <Avatar data-testid="test-avatar" id="avatar-id" />
      );

      const avatar = container.firstChild as HTMLElement;
      expect(avatar).toHaveAttribute("data-testid", "test-avatar");
      expect(avatar).toHaveAttribute("id", "avatar-id");
    });

    it("should handle ref forwarding", () => {
      const ref = React.createRef<HTMLElement>();
      render(<Avatar ref={ref} />);

      expect(ref.current).toBeInTheDocument();
      expect(ref.current).toHaveClass("relative", "flex");
    });

    it("should support custom sizes", () => {
      const { container } = render(<Avatar className="h-20 w-20" />);

      const avatar = container.firstChild as HTMLElement;
      expect(avatar).toHaveClass("h-20", "w-20");
    });
  });

  describe("AvatarFallback", () => {
    it("should render fallback with default classes", () => {
      render(
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );

      const fallback = screen.getByText("JD");
      expect(fallback).toBeInTheDocument();
      expect(fallback).toHaveClass(
        "flex",
        "h-full",
        "w-full",
        "items-center",
        "justify-center",
        "rounded-full",
        "bg-muted",
        "text-muted-foreground"
      );
    });

    it("should apply custom className alongside default classes", () => {
      render(
        <Avatar>
          <AvatarFallback className="custom-fallback">JD</AvatarFallback>
        </Avatar>
      );

      const fallback = screen.getByText("JD");
      expect(fallback).toHaveClass("custom-fallback");
      expect(fallback).toHaveClass("flex", "items-center", "justify-center"); // Default classes
    });

    it("should display text content correctly", () => {
      render(
        <Avatar>
          <AvatarFallback>John Doe</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("should handle single character fallbacks", () => {
      render(
        <Avatar>
          <AvatarFallback>J</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByText("J")).toBeInTheDocument();
    });

    it("should handle complex fallback content", () => {
      render(
        <Avatar>
          <AvatarFallback>
            <span data-testid="icon">👤</span>
          </AvatarFallback>
        </Avatar>
      );

      expect(screen.getByTestId("icon")).toBeInTheDocument();
      expect(screen.getByText("👤")).toBeInTheDocument();
    });

    it("should support custom styling", () => {
      render(
        <Avatar>
          <AvatarFallback className="bg-blue-500 text-white">CS</AvatarFallback>
        </Avatar>
      );

      const fallback = screen.getByText("CS");
      expect(fallback).toHaveClass("bg-blue-500", "text-white");
    });
  });

  describe("Avatar Integration", () => {
    it("should handle avatar without image (fallback only)", () => {
      render(
        <Avatar>
          <AvatarFallback>NO</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByText("NO")).toBeInTheDocument();
    });

    it("should create complete avatar structure with fallback", () => {
      const { container } = render(
        <Avatar className="h-20 w-20">
          <AvatarFallback className="text-lg">LA</AvatarFallback>
        </Avatar>
      );

      const avatar = container.firstChild as HTMLElement;
      expect(avatar).toHaveClass("h-20", "w-20");

      const fallback = screen.getByText("LA");
      expect(fallback).toHaveClass("text-lg");
    });

    it("should support different avatar states with fallbacks", () => {
      const { rerender, container } = render(
        <Avatar className="border-2 border-green-500">
          <AvatarFallback className="bg-green-100">ON</AvatarFallback>
        </Avatar>
      );

      const avatar = container.firstChild as HTMLElement;
      expect(avatar).toHaveClass("border-2", "border-green-500");

      // Test state change
      rerender(
        <Avatar className="border-2 border-gray-500">
          <AvatarFallback className="bg-gray-100">OFF</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByText("OFF")).toBeInTheDocument();
    });

    it("should handle multiple fallbacks gracefully", () => {
      render(
        <Avatar>
          <AvatarFallback>First</AvatarFallback>
          <AvatarFallback>Second</AvatarFallback>
        </Avatar>
      );

      // Both should render (Radix handles which one shows)
      expect(screen.getByText("First")).toBeInTheDocument();
      expect(screen.getByText("Second")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should support ARIA attributes on avatar root", () => {
      render(
        <Avatar aria-label="User avatar" role="img">
          <AvatarFallback>TU</AvatarFallback>
        </Avatar>
      );

      const avatar = screen.getByLabelText("User avatar");
      expect(avatar).toHaveAttribute("role", "img");
    });

    it("should maintain semantic structure with fallback", () => {
      render(
        <Avatar>
          <AvatarFallback aria-label="Avatar fallback">TF</AvatarFallback>
        </Avatar>
      );

      const fallback = screen.getByLabelText("Avatar fallback");
      expect(fallback).toBeInTheDocument();
    });

    it("should support tabIndex for keyboard navigation", () => {
      const { container } = render(
        <Avatar tabIndex={0}>
          <AvatarFallback>KB</AvatarFallback>
        </Avatar>
      );

      const avatar = container.firstChild as HTMLElement;
      expect(avatar).toHaveAttribute("tabIndex", "0");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty avatar", () => {
      const { container } = render(<Avatar />);

      const avatar = container.firstChild;
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveClass("rounded-full");
    });

    it("should handle very long fallback text", () => {
      render(
        <Avatar>
          <AvatarFallback>Very Long Fallback Text</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByText("Very Long Fallback Text")).toBeInTheDocument();
    });

    it("should handle special characters in fallback", () => {
      render(
        <Avatar>
          <AvatarFallback>@#$</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByText("@#$")).toBeInTheDocument();
    });

    it("should handle numeric fallback", () => {
      render(
        <Avatar>
          <AvatarFallback>42</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByText("42")).toBeInTheDocument();
    });
  });

  describe("Styling Variations", () => {
    it("should support different sizes through className", () => {
      const { container: small } = render(<Avatar className="h-8 w-8" />);
      const { container: large } = render(<Avatar className="h-16 w-16" />);

      expect(small.firstChild).toHaveClass("h-8", "w-8");
      expect(large.firstChild).toHaveClass("h-16", "w-16");
    });

    it("should support different border styles", () => {
      const { container } = render(
        <Avatar className="border-4 border-blue-500" />
      );

      expect(container.firstChild).toHaveClass("border-4", "border-blue-500");
    });

    it("should support custom background colors on avatar container", () => {
      const { container } = render(
        <Avatar className="bg-gradient-to-r from-blue-500 to-purple-500" />
      );

      expect(container.firstChild).toHaveClass(
        "bg-gradient-to-r",
        "from-blue-500",
        "to-purple-500"
      );
    });
  });
});
