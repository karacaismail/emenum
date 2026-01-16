# Implement API rate limiting to prevent abuse

## Overview

Most API routes lack rate limiting protection. While the /api/service-request endpoint has a 30-second cooldown per table, other sensitive endpoints like /api/locations (POST), /api/menu/publish (POST), /api/qr/generate (POST), and authentication endpoints have no rate limiting.

## Rationale

Without rate limiting, attackers can perform brute-force attacks on authentication, exhaust resources through API abuse, or spam the system with automated requests. This is especially critical for a SaaS platform where resource abuse affects all tenants.

---
*This spec was created from ideation and is pending detailed specification.*
