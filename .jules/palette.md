## 2024-05-18 - Tooltips vs title attributes in React UI
**Learning:** Native HTML `title` attributes are slow to render, cannot be styled, and are not well-supported across all devices (like mobile) or screen magnifiers.
**Action:** Replace native `title` attributes on interactive elements (especially icon-only buttons or those with screen-reader text) with Radix UI Tooltip components (`@/components/ui/tooltip`). Ensure `TooltipProvider` wraps the app layout.
