import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

// ============================================================
// Screen Reader Announcements
// ============================================================

let _ariaCounter = 0;

/**
 * Announce a message to screen readers via the live region.
 * Falls back to creating a temporary live region if the default one is missing.
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite',
): void {
  const id = 'sr-announcer';
  let el = document.getElementById(id);

  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.setAttribute('aria-live', priority);
    el.setAttribute('aria-atomic', 'true');
    // Visually hidden but accessible to screen readers
    Object.assign(el.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0,0,0,0)',
      whiteSpace: 'nowrap',
      border: '0',
    });
    document.body.appendChild(el);
  }

  // Ensure the priority attribute matches
  el.setAttribute('aria-live', priority);

  // Clear and re-set to force re-announcement
  el.textContent = '';
  // Use requestAnimationFrame to ensure the browser registers the clearing
  requestAnimationFrame(() => {
    el!.textContent = message;
  });
}

// ============================================================
// Focus Trap (for modals / dialogs)
// ============================================================

/**
 * Trap focus within an element. Returns a cleanup function.
 * Call the cleanup function to restore focus and remove listeners.
 */
export function trapFocus(element: HTMLElement): () => void {
  const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const focusableElements = (): NodeListOf<HTMLElement> =>
    element.querySelectorAll(FOCUSABLE_SELECTOR);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const focusable = Array.from(focusableElements());
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      // Shift+Tab: if focus is on first element, wrap to last
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab: if focus is on last element, wrap to first
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  // Store the previously focused element
  const previousFocus = document.activeElement as HTMLElement | null;

  element.addEventListener('keydown', handleKeyDown);

  // Focus the first focusable element
  requestAnimationFrame(() => {
    const focusable = focusableElements();
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  });

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleKeyDown);
    // Restore focus to the previously focused element
    if (previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus();
    }
  };
}

// ============================================================
// Media Query Helpers
// ============================================================

/**
 * Check if user prefers reduced motion.
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user prefers high contrast.
 */
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: more)').matches;
}

// ============================================================
// ARIA ID Generator
// ============================================================

/**
 * Generate a unique ID for ARIA relationships (aria-controls, aria-labelledby, etc.)
 */
export function generateAriaId(prefix: string): string {
  _ariaCounter += 1;
  return `${prefix}-${_ariaCounter}-${Date.now().toString(36)}`;
}

// ============================================================
// Keyboard Navigation Helpers
// ============================================================

interface KeyboardNavActions {
  onEscape?: () => void;
  onEnter?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onTab?: () => void;
}

/**
 * Handle common keyboard navigation patterns.
 */
export function handleKeyboardNav(
  event: ReactKeyboardEvent,
  actions: KeyboardNavActions,
): void {
  const { key } = event;

  switch (key) {
    case 'Escape':
      actions.onEscape?.();
      break;
    case 'Enter':
      actions.onEnter?.();
      break;
    case 'ArrowUp':
      event.preventDefault();
      actions.onArrowUp?.();
      break;
    case 'ArrowDown':
      event.preventDefault();
      actions.onArrowDown?.();
      break;
    case 'ArrowLeft':
      event.preventDefault();
      actions.onArrowLeft?.();
      break;
    case 'ArrowRight':
      event.preventDefault();
      actions.onArrowRight?.();
      break;
    case 'Tab':
      actions.onTab?.();
      break;
  }
}

// ============================================================
// Skip Links Setup
// ============================================================

/**
 * Set up skip link behavior.
 * When a skip link is clicked, focus the target element and remove the focus outline after blur.
 */
export function setupSkipLinks(): void {
  const skipLink = document.querySelector('a[href^="#main-content"]') as HTMLAnchorElement | null;
  if (!skipLink) return;

  skipLink.addEventListener('click', (e) => {
    const targetId = skipLink.getAttribute('href')?.slice(1);
    if (!targetId) return;

    const target = document.getElementById(targetId);
    if (!target) return;

    e.preventDefault();
    target.focus();
    target.scrollIntoView({ behavior: 'smooth' });
  });
}
