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
