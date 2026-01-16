# Make Product Action Buttons Always Visible on Touch Devices

## Overview

Product list action buttons (edit, delete, visibility toggle) are only visible on hover, making them inaccessible on touch devices and difficult for keyboard users.

## Rationale

The opacity-0 group-hover:opacity-100 pattern in ProductListItem hides critical action buttons until mouse hover. Touch device users (tablets, phones) cannot hover, making these actions undiscoverable. This is both an accessibility and usability issue for the restaurant staff who may use tablets.

---
*This spec was created from ideation and is pending detailed specification.*
