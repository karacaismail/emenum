# Create API.md - Comprehensive API Reference Documentation

## Overview

The ROUTES.md file references './API.md' for detailed API reference, but this file does not exist. The project has 7 API endpoints (auth/logout, locations, qr/generate, menu/publish, menu/snapshot, service-request) with varying authentication requirements and request/response formats that need documentation.

## Rationale

Developers integrating with the platform or building client applications need a single source of truth for API contracts. Currently they must read the route handler source code to understand request formats, authentication requirements, and error responses. This is especially critical for public endpoints like service-request that third parties might need.

---
*This spec was created from ideation and is pending detailed specification.*
