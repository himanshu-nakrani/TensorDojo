## 2024-05-24 - Missing aria-pressed on toggle buttons
**Learning:** Visual toggle buttons (e.g., scale select buttons switching between 'log' and 'linear') often rely purely on CSS for state indications (`bg-accent-soft text-accent`), leaving screen readers unaware of which option is currently active.
**Action:** When implementing visually selected toggle buttons (like button groups), always include `aria-pressed={isActive}` to communicate the state to assistive technologies.

## 2024-07-20 - Missing skip-to-content trigger despite having targets
**Learning:** The application successfully defined `id="main"` on main content containers across all pages (HomePage, MapPage, LessonsPage, etc.), but completely omitted the `<a href="#main">Skip to main content</a>` link at the top of the DOM to actually trigger it. This is a common accessibility pattern where developers remember the destination target but forget the required interaction mechanism for keyboard/screen reader users.
**Action:** When auditing or implementing skip links, always ensure both the trigger (the visually hidden, focusable anchor at the start of the document) and the target (`id="main"`) are present. One without the other is useless.
## 2024-12-07 - TabIndex for main content wrapper
**Learning:** React single-page apps using "#main" for skip links may not shift focus appropriately if the `<main>` or `<article>` element lacks a tabindex since they are not natively focusable elements. This causes screen readers to fail shifting focus when the skip link is activated.
**Action:** Always verify that "Skip to main content" links point to a container with `tabIndex={-1}` applied so that programmatic focus works.

## 2026-07-27 - Adding missing aria-pressed to toggle buttons
**Learning:** Some custom toggle buttons in the application visually change states to show activation but are missing the `aria-pressed` attribute, so screen readers can't read their current state.
**Action:** Remember to add `aria-pressed` to any button acting as a toggle switch that is visually styled to show selection (e.g. `ThemeToggle`, `AttentionMatrix` Math toggle).

## 2024-08-07 - W3C ARIA practices for toggle buttons
**Learning:** If a button changes its textual label when activated (e.g., from "Play" to "Pause"), it shouldn't also use `aria-pressed`, as the changing label already conveys the state change. A screen reader might read "Pause, toggle button, pressed," which is slightly redundant.
**Action:** Use `aria-pressed` on toggle buttons primarily when their textual label remains the same but their visual state changes (like selecting a block size).
## 2026-08-21 - Don't use aria-label on complex links
**Learning:** Adding an aria-label to a link or button that contains rich HTML children (like headings, multiple paragraphs, durations) causes screen readers to completely skip reading those semantics and instead only read the provided text string. This means screen reader users miss out on native heading structures (e.g. h3 for navigation) and sub-content like summaries.
**Action:** Instead of aria-label on the parent, append visually hidden text (e.g. <span className="sr-only">...</span>) next to the primary semantic element inside the card (such as appending (Visited) inside the h3 label). This preserves the native heading and allows all child content to be read sequentially.
