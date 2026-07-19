## 2024-05-24 - Missing aria-pressed on toggle buttons
**Learning:** Visual toggle buttons (e.g., scale select buttons switching between 'log' and 'linear') often rely purely on CSS for state indications (`bg-accent-soft text-accent`), leaving screen readers unaware of which option is currently active.
**Action:** When implementing visually selected toggle buttons (like button groups), always include `aria-pressed={isActive}` to communicate the state to assistive technologies.
