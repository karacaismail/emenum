# Create reusable icon component system

## Overview

175 inline SVG icons are scattered across 19 files with duplicate icon definitions. Icons like edit, delete, plus, check, eye, eye-off, and loading spinner are copy-pasted repeatedly with inconsistent sizing (h-4 w-4, h-5 w-5, h-6 w-6) and stroke widths.

## Rationale

Inline SVG duplication increases bundle size, makes icon updates tedious (must change in multiple places), and leads to visual inconsistency. A centralized icon system enables consistent iconography, easier theming, and potential tree-shaking optimizations.

---
*This spec was created from ideation and is pending detailed specification.*
