# Add Content Security Policy (CSP) header to prevent XSS attacks

## Overview

The application uses dangerouslySetInnerHTML for QR code SVG rendering in app/(dashboard)/tables/page.tsx and app/(dashboard)/dashboard/dashboard-client.tsx. While the SVG is generated from a trusted library (qrcode), there's no Content Security Policy header to provide defense-in-depth against XSS attacks. The current next.config.ts only includes X-Frame-Options, X-Content-Type-Options, and Referrer-Policy headers.

## Rationale

CSP is a critical security header that provides an additional layer of protection against XSS attacks. Even when input is properly sanitized, CSP can prevent exploitation if a vulnerability is discovered. The dangerouslySetInnerHTML usage creates potential XSS vectors that CSP would mitigate.

---
*This spec was created from ideation and is pending detailed specification.*
