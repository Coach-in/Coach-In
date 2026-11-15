import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Vitest globals are off, so Testing Library cannot register its own cleanup
afterEach(() => cleanup())

// jsdom has no matchMedia: report "prefers-reduced-motion" so animation code (useFlip) is skipped
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: query.includes('reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  }),
})
