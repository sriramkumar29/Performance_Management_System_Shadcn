/**
 * Vitest Setup File
 * Configures testing environment and imports testing utilities
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
    cleanup();
});

// Polyfill for DOM methods used by Radix UI in jsdom
// Some Radix components call element.scrollIntoView(); jsdom doesn't implement it.
if (typeof (global as any).Element !== 'undefined' && !(global as any).Element.prototype.scrollIntoView) {
    (global as any).Element.prototype.scrollIntoView = function () {
        // no-op in tests
        return;
    };
}

// Polyfill ResizeObserver for libraries that use it (Radix/use-size etc.)
if (typeof (globalThis as any).ResizeObserver === 'undefined') {
    class MockResizeObserver {
        observe() { }
        unobserve() { }
        disconnect() { }
    }
    // @ts-ignore
    (globalThis as any).ResizeObserver = MockResizeObserver;
}

// Polyfill matchMedia for environments that don't provide it
if (typeof (globalThis as any).matchMedia !== 'function') {
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

// Suppress specific Radix warnings about DialogContent aria-describedby during tests
const origWarn = console.warn.bind(console);
console.warn = (...args: any[]) => {
    try {
        const msg = args[0]?.toString?.() || '';
        if (msg.includes('Missing `Description` or `aria-describedby')) {
            return;
        }
    } catch (e) {
        // ignore
    }
    origWarn(...args);
};
