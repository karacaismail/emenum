# Update vulnerable development dependencies (esbuild/vite)

## Overview

npm audit reports 5 moderate severity vulnerabilities in esbuild (<=0.24.2) affecting vite and vitest. While these are development dependencies, they could still pose risks in certain scenarios like supply chain attacks or if development environment is compromised.

## Rationale

Keeping dependencies up-to-date reduces the attack surface and prevents potential exploitation of known vulnerabilities. The vulnerability (GHSA-67mh-4wv8-2f99) allows any website to send requests to the development server and read responses, which could leak sensitive information during development.

---
*This spec was created from ideation and is pending detailed specification.*
