import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// Mock framer-motion to bypass animation delays in JSDOM tests using React.createElement
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    motion: {
      ...actual.motion,
      div: React.forwardRef(({ children, ...props }, ref) => {
        const {
          initial,
          animate,
          exit,
          transition,
          ...cleanProps
        } = props;
        return React.createElement('div', { ref, ...cleanProps }, children);
      }),
      section: React.forwardRef(({ children, ...props }, ref) => {
        const {
          initial,
          animate,
          exit,
          transition,
          ...cleanProps
        } = props;
        return React.createElement('section', { ref, ...cleanProps }, children);
      })
    },
    AnimatePresence: ({ children }) => React.createElement(React.Fragment, null, children)
  };
});
