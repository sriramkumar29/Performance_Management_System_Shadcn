// Global test setup for Vitest
// Provide a minimal mock for ResizeObserver used by some UI libraries
if (typeof (globalThis as any).ResizeObserver === "undefined") {
    class MockResizeObserver {
        observe() { }
        unobserve() { }
        disconnect() { }
    }
    // @ts-ignore
    (globalThis as any).ResizeObserver = MockResizeObserver;
}

// Optional: mock matchMedia if tests rely on it
if (typeof (globalThis as any).matchMedia !== "function") {
    (globalThis as any).matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => false,
    });
}
