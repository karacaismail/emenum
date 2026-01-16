# Add HTTPS Strict Transport Security (HSTS) header

## Overview

The next.config.ts security headers configuration is missing the Strict-Transport-Security header. This header is essential to prevent protocol downgrade attacks and cookie hijacking, especially when the application handles authentication cookies and sensitive business data.

## Rationale

HSTS ensures browsers only communicate with the server over HTTPS, preventing man-in-the-middle attacks where an attacker could intercept traffic by forcing a downgrade to HTTP. This is critical for a SaaS platform handling restaurant business data and user authentication.

---
*This spec was created from ideation and is pending detailed specification.*
