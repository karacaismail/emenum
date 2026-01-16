# Code Split Large Homepage into Lazy-Loaded Sections

## Overview

The homepage (app/page.tsx) is 845 lines containing 15+ components (AnimatedBackground, AnimatedQRDemo, FeatureCard, StatCard, TestimonialCard, PricingTier, Navigation, Footer, etc.). These should be extracted and lazy-loaded for faster initial page load.

## Rationale

All components are bundled together, increasing initial JavaScript payload. Sections below the fold (testimonials, pricing, footer) can be lazy-loaded as the user scrolls, significantly reducing Time to Interactive.

---
*This spec was created from ideation and is pending detailed specification.*
