# Add Bulk QR Code Download for All Tables

## Overview

Add functionality to download all table QR codes at once as a ZIP file or combined PDF, instead of downloading each table's QR individually.

## Rationale

The tables page already has individual QR download functionality (handleDownloadQR) with SVG/PNG/PDF formats. The QR generator functions already exist in lib/qrcode/generator.ts. Extending to bulk download follows the existing validateBulkAdd pattern in limits.ts for handling multiple items.

---
*This spec was created from ideation and is pending detailed specification.*
