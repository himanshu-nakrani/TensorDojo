## 2024-05-24 - Missing aria-pressed on toggle buttons
**Learning:** Visual toggle buttons (e.g., scale select buttons switching between 'log' and 'linear') often rely purely on CSS for state indications (`bg-accent-soft text-accent`), leaving screen readers unaware of which option is currently active.
**Action:** When implementing visually selected toggle buttons (like button groups), always include `aria-pressed={isActive}` to communicate the state to assistive technologies.

## 2024-07-20 - Missing skip-to-content trigger despite having targets
**Learning:** The application successfully defined `id="main"` on main content containers across all pages (HomePage, MapPage, LessonsPage, etc.), but completely omitted the `<a href="#main">Skip to main content</a>` link at the top of the DOM to actually trigger it. This is a common accessibility pattern where developers remember the destination target but forget the required interaction mechanism for keyboard/screen reader users.
**Action:** When auditing or implementing skip links, always ensure both the trigger (the visually hidden, focusable anchor at the start of the document) and the target (`id="main"`) are present. One without the other is useless.
