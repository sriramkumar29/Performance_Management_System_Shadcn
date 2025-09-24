// src/test/polyfills.ts
import { vi } from "vitest";

// Mock sessionStorage
const sessionStore = new Map<string, string>();
Object.defineProperty(window, "sessionStorage", {
  value: {
    getItem: vi.fn((key: string) =>
      sessionStore.has(key) ? sessionStore.get(key)! : null
    ),
    setItem: vi.fn((key: string, value: string) => {
      sessionStore.set(key, String(value));
    }),
    removeItem: vi.fn((key: string) => sessionStore.delete(key)),
    clear: vi.fn(() => sessionStore.clear()),
  },
  writable: true,
});

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Polyfill Pointer Events
if (!("PointerEvent" in window)) {
  class PointerEvent extends MouseEvent {}
  (window as any).PointerEvent = PointerEvent;
}

// Radix pointer capture stubs
if (!(Element.prototype as any).hasPointerCapture) {
  (Element.prototype as any).hasPointerCapture = () => false;
}
if (!(Element.prototype as any).setPointerCapture) {
  (Element.prototype as any).setPointerCapture = () => {};
}
if (!(Element.prototype as any).releasePointerCapture) {
  (Element.prototype as any).releasePointerCapture = () => {};
}

// scrollIntoView stub
if (typeof (Element.prototype as any).scrollIntoView !== "function") {
  (Element.prototype as any).scrollIntoView = () => {};
}

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
