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
