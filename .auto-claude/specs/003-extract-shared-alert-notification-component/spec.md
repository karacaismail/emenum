# Extract shared alert/notification component

## Overview

Error alert pattern is duplicated 36 times across 19 files with nearly identical JSX structure for displaying error messages. Each file has its own implementation of the red-bordered error box with dismiss button.

## Rationale

UI consistency is compromised when the same pattern is implemented differently across files. If the design team wants to update error styling, 36 files must be modified. A shared Alert component also enables adding features like auto-dismiss, different severity levels, and accessibility improvements in one place.

---
*This spec was created from ideation and is pending detailed specification.*
