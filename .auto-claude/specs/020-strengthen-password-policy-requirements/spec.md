# Strengthen password policy requirements

## Overview

The current password policy only requires a minimum of 6 characters (app/(auth)/register/page.tsx line 68, app/(auth)/login/page.tsx line 88). This is below industry standards and makes user accounts vulnerable to brute-force and dictionary attacks.

## Rationale

OWASP and NIST guidelines recommend stronger password requirements. A 6-character password can be cracked in seconds with modern tools. Weak passwords are one of the most common causes of account compromise in SaaS applications.

---
*This spec was created from ideation and is pending detailed specification.*
