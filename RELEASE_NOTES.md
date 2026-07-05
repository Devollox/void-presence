# Syntax Fix

## Fixed

- **Protocol script closing brace** — removed an extra `}` at the end of the `executeJavaScript` template string, which was breaking the injected IIFE and causing an `Unexpected token '}'` during URL import.
