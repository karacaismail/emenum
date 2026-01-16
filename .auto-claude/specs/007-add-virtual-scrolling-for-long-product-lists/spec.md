# Add Virtual Scrolling for Long Product Lists

## Overview

The Products page renders all products in a simple div with .map(). For restaurants with 100+ products, this creates DOM bloat and slow scroll performance. Implementing virtual scrolling would render only visible items.

## Rationale

Each ProductListItem creates multiple DOM elements (image, buttons, text). With 200 products, this means 1000+ DOM nodes. Virtual scrolling reduces this to ~20-30 visible items, dramatically improving scroll performance and memory usage.

---
*This spec was created from ideation and is pending detailed specification.*
