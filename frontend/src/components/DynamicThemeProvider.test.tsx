import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import DynamicThemeProvider from "./DynamicThemeProvider";

const TestChild = () => <div data-testid="test-child">Test Content</div>;

describe("DynamicThemeProvider", () => {
  it("should render children without modifications", () => {
    render(
      <DynamicThemeProvider>
        <TestChild />
      </DynamicThemeProvider>
    );

    expect(screen.getByTestId("test-child")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("should pass through multiple children", () => {
    render(
      <DynamicThemeProvider>
        <div data-testid="child-1">First Child</div>
        <div data-testid="child-2">Second Child</div>
      </DynamicThemeProvider>
    );

    expect(screen.getByTestId("child-1")).toBeInTheDocument();
    expect(screen.getByTestId("child-2")).toBeInTheDocument();
    expect(screen.getByText("First Child")).toBeInTheDocument();
    expect(screen.getByText("Second Child")).toBeInTheDocument();
  });

  it("should render fragments without wrapper elements", () => {
    const { container } = render(
      <DynamicThemeProvider>
        <span>Fragment Content</span>
      </DynamicThemeProvider>
    );

    // Should not add any wrapper divs around children
    expect(container.firstChild).toBeInTheDocument();
    expect(container.firstChild?.nodeName).toBe("SPAN");
  });

  it("should handle empty children gracefully", () => {
    const { container } = render(
      <DynamicThemeProvider>{null}</DynamicThemeProvider>
    );

    expect(container).toBeInTheDocument();
  });

  it("should handle complex nested components", () => {
    const ComplexChild = () => (
      <div data-testid="complex-child">
        <h1>Title</h1>
        <p>Paragraph</p>
        <button>Button</button>
      </div>
    );

    render(
      <DynamicThemeProvider>
        <ComplexChild />
      </DynamicThemeProvider>
    );

    expect(screen.getByTestId("complex-child")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Title"
    );
    expect(screen.getByText("Paragraph")).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveTextContent("Button");
  });

  it("should not interfere with component props or state", () => {
    const StatefulChild = ({
      initialValue = "default",
    }: {
      initialValue?: string;
    }) => <div data-testid="stateful-child">{initialValue}</div>;

    render(
      <DynamicThemeProvider>
        <StatefulChild initialValue="custom value" />
      </DynamicThemeProvider>
    );

    expect(screen.getByTestId("stateful-child")).toHaveTextContent(
      "custom value"
    );
  });

  it("should preserve React context flow through children", () => {
    const TestContext = React.createContext("context-value");

    const ContextConsumer = () => {
      const value = React.useContext(TestContext);
      return <div data-testid="context-consumer">{value}</div>;
    };

    render(
      <TestContext.Provider value="provided-value">
        <DynamicThemeProvider>
          <ContextConsumer />
        </DynamicThemeProvider>
      </TestContext.Provider>
    );

    expect(screen.getByTestId("context-consumer")).toHaveTextContent(
      "provided-value"
    );
  });

  it("should be compatible with event handlers", () => {
    const handleClick = vi.fn();

    render(
      <DynamicThemeProvider>
        <button onClick={handleClick} data-testid="clickable-button">
          Click Me
        </button>
      </DynamicThemeProvider>
    );

    const button = screen.getByTestId("clickable-button");
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledOnce();
  });
});
