## 2024-05-16 - [Security Headers]
**Vulnerability:** Missing basic security headers like Strict-Transport-Security, X-Content-Type-Options, etc., exposing the app to XSS, clickjacking and MIME sniffing attacks.
**Learning:** Adding custom Express middleware is preferred over adding new dependencies like `helmet` when maintaining a strict no-new-dependencies policy.
**Prevention:** Implement standard security headers via a simple custom middleware for any new Express applications in the workspace.
