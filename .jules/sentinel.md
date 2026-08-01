## 2024-05-16 - [Security Headers]
**Vulnerability:** Missing basic security headers like Strict-Transport-Security, X-Content-Type-Options, etc., exposing the app to XSS, clickjacking and MIME sniffing attacks.
**Learning:** Adding custom Express middleware is preferred over adding new dependencies like `helmet` when maintaining a strict no-new-dependencies policy.
**Prevention:** Implement standard security headers via a simple custom middleware for any new Express applications in the workspace.
## 2025-03-09 - Express Security Headers

**Vulnerability:** Missing basic HTTP security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection) and exposed x-powered-by header in the Express API server.
**Learning:** These basic protections should be enabled by default. While `helmet` is standard, we can apply them manually without new dependencies. Also, be careful modifying payload limits or CORS configurations as they can easily break existing functionality.
**Prevention:** Always include basic security headers in Express setups.

## 2025-03-09 - Express CORS and Advanced Security Headers

**Vulnerability:** Weak CORS configuration (`*`) and missing advanced HTTP security headers (Strict-Transport-Security, Content-Security-Policy) in the Express API server.
**Learning:** Default `cors()` allows all origins. It should be restricted in production. Pure APIs that only return JSON should have restrictive CSPs (`default-src 'none'`) to prevent XSS if a response is ever accidentally rendered in a browser.
**Prevention:** Configure CORS based on environment and add HSTS/CSP headers.
## 2025-03-09 - Overly Permissive Default CORS

**Vulnerability:** The default CORS configuration in `artifacts/api-server/src/app.ts` allowed all origins (`*`) if the `CORS_ORIGIN` environment variable was empty or set to `*`.
**Learning:** Default fallbacks for environmental variables in sensitive configurations can open up major holes. A permissive default might be fine for local dev, but should never make it to production unnoticed. Also, redundant security middleware configurations can cause confusion.
**Prevention:** In production environments, default to denying cross-origin requests (or being extremely restrictive) when specific configuration variables are absent, instead of falling back to a wildcard. Always review security-related boilerplate code for duplicate or conflicting settings.

## 2024-05-18 - Express Rate Limiting
**Vulnerability:** Missing rate limiting on the API server, leaving it vulnerable to basic DoS and brute-force attacks.
**Learning:** We can implement a simple in-memory rate limiter using standard Node.js/Express constructs instead of adding new dependencies. It's crucial to `unref()` the cleanup `setInterval` so it doesn't block the process from exiting gracefully.
**Prevention:** Include basic rate limiting on API endpoints to prevent abuse.

## 2025-03-09 - CSS Injection / XSS in UI Component Boilerplate
**Vulnerability:** Found a CSS Injection and XSS vulnerability in `artifacts/tensor-dojo/src/components/ui/chart.tsx`. The component used `dangerouslySetInnerHTML` to inject dynamic `id` and `color` variables into a `<style>` block without sanitization. An attacker could potentially break out of the CSS rules and insert malicious scripts (e.g. `</style><script>alert(1)</script>`).
**Learning:** Standard UI component boilerplate (like Recharts wrappers) often implements dynamic styling using `<style dangerouslySetInnerHTML>` to support theme variables. This pattern is inherently unsafe if any of the interpolated variables depend on user input. Even "safe-looking" things like element IDs or hex colors can be exploited.
**Prevention:** Always sanitize any interpolated variables when using `dangerouslySetInnerHTML` in `<style>` blocks. For IDs, strip non-alphanumeric/dash/underscore characters. For colors, strip characters that can break CSS or HTML rules (`[;{}"'<>]`).
## 2025-03-09 - CSS Injection / XSS in Sandbox UI Component Boilerplate
**Vulnerability:** Found a CSS Injection and XSS vulnerability in `artifacts/mockup-sandbox/src/components/ui/chart.tsx` similar to one previously found in `tensor-dojo`. The component used `dangerouslySetInnerHTML` to inject dynamic `id` and `color` variables into a `<style>` block without sanitization. An attacker could potentially break out of the CSS rules and insert malicious scripts.
**Learning:** Standard UI component boilerplate often implements dynamic styling using `<style dangerouslySetInnerHTML>` to support theme variables. This pattern is inherently unsafe if any of the interpolated variables depend on user input. Even "safe-looking" things like element IDs or hex colors can be exploited. Duplicate boilerplate components in different workspace packages might share the same vulnerabilities.
**Prevention:** Always sanitize any interpolated variables when using `dangerouslySetInnerHTML` in `<style>` blocks. For IDs, strip non-alphanumeric/dash/underscore characters. For colors, strip characters that can break CSS or HTML rules (`[;{}"'<>]`).
## 2026-07-28 - Rate Limiting Reverse Proxy Bypass
**Vulnerability:** The Express API server did not have `trust proxy` configured. When deployed behind a reverse proxy (like Nginx, AWS ALB, or Google Cloud Run), `req.ip` returns the IP of the reverse proxy rather than the actual client. This causes the custom rate limiter to limit the proxy's IP, potentially resulting in a Denial of Service (DoS) for all legitimate users sharing that proxy.
**Learning:** Rate limiting based on `req.ip` without configuring `trust proxy` correctly is a common pitfall in Express applications. It can lead to widespread access denial when a single user exceeds the limit, as the proxy's IP is penalized.
**Prevention:** Always configure `app.set('trust proxy', 1)` (or the appropriate number of hops) when deploying Express applications behind a reverse proxy, especially when relying on IP-based rate limiting or logging.
## 2024-07-27 - Unsanitized Object Keys in dangerouslySetInnerHTML
**Vulnerability:** XSS/CSS Injection via unsanitized configuration keys used in `<style dangerouslySetInnerHTML>` inside UI chart components.
**Learning:** Even if the values (like colors) are sanitized, the keys from external/user-provided configuration objects can be exploited if they are directly interpolated into the style string. A malicious object key (e.g., `"</style><script>alert('XSS')</script>": { color: "red" }`) will break out of the `<style>` context and execute arbitrary code.
**Prevention:** Always sanitize ALL variables (both keys and values) before injecting them into `dangerouslySetInnerHTML`. Use a strict regex (like `/[^a-zA-Z0-9-_]/g`) to strip out any characters that could close tags or rules.
## 2024-05-16 - [Fix OOM DoS vulnerability in rate limiter]
**Vulnerability:** The custom in-memory rate limiter in `artifacts/api-server/src/app.ts` used an unbounded Map to track IP requests. This could lead to a Denial of Service (DoS) via Out Of Memory (OOM) crashes if an attacker spoofed IPs or used a botnet to flood the server, causing the Map to grow infinitely.
**Learning:** In-memory rate limiters must enforce a maximum size or entry limit to prevent memory exhaustion, as malicious actors can easily generate unique cache keys (like IPs).
**Prevention:** Always bound the size of in-memory caching or tracking structures (like Maps) used for security features or state tracking.
