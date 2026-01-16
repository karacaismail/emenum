# Add Mobile Navigation Menu to Landing Page

## Overview

The landing page navigation on mobile devices only shows a 'Basla' button, hiding all other navigation links. Add a proper hamburger menu for mobile users.

## Rationale

The Navigation component (app/page.tsx lines 338-382) hides the full navigation links on mobile (hidden md:flex) and only shows a register CTA. Users on mobile cannot access Features, Pricing, or Login pages from the header without scrolling through the entire landing page.

---
*This spec was created from ideation and is pending detailed specification.*
