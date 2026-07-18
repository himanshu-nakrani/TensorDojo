## 2025-03-09 - Express Security Headers

**Vulnerability:** Missing basic HTTP security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection) and exposed x-powered-by header in the Express API server.
**Learning:** These basic protections should be enabled by default. While `helmet` is standard, we can apply them manually without new dependencies. Also, be careful modifying payload limits or CORS configurations as they can easily break existing functionality.
**Prevention:** Always include basic security headers in Express setups.
