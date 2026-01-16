# Add Price History Export Button

## Overview

Add a button to export price change history for compliance reporting. The exportPriceLedgerForCompliance() function already exists and formats data for regulatory submission.

## Rationale

The lib/services/price-ledger.ts file has exportPriceLedgerForCompliance() function (lines 517-559) that generates properly formatted compliance data with date ranges. No UI triggers this function currently. The audit page already has date filtering and export paradigm.

---
*This spec was created from ideation and is pending detailed specification.*
