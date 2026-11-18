# Security Specification: De Compritas con Paula

## 1. Data Invariants
1. Products can only be created, updated, or deleted by authenticated authorized users.
2. Product stock cannot be negative unless explicitly logged, and salePrice/costPrice must be valid non-negative numbers.
3. Every Sale record must reference an authenticated user's UID as `sellerId` and valid transaction totals (`totalAmount >= 0`).
4. Once created, a Sale record cannot have its `receiptNumber`, `sellerId`, or `createdAt` mutated.
5. In inventory logs, each record is an immutable audit entry reflecting authentic operations.
6. The user `denarms@gmail.com` is bootstrapped as the super-admin with all administrative authorizations.

## 2. The Dirty Dozen Payloads (Targeting Rejection)
1. **Unauthenticated Product Injection**: Write to `/products/{id}` with `request.auth == null` -> DENIED.
2. **Negative Stock Insertion**: Creating product with `stock = -10` -> DENIED.
3. **Invalid Price Type/Range**: Setting `salePrice = "free"` or `-50` -> DENIED.
4. **Oversized String Injection Attack**: Product title exceeding 150 chars or containing malicious payload -> DENIED.
5. **Identity Spoofing on Sale**: Authenticated user 'User_B' attempting to register a sale with `sellerId: "User_Admin"` -> DENIED.
6. **Negative Sale Total Tampering**: Registering a sale with `totalAmount: -100` -> DENIED.
7. **Phantom Field / Ghost Injection**: Injecting undocumented backdoor fields `isAdmin: true` into Product -> DENIED.
8. **Sale Immutability Violation**: Attempting to alter items or reduce `totalAmount` on an existing sale -> DENIED.
9. **Orphaned Inventory Log**: Submitting an inventory log without a valid `productId` -> DENIED.
10. **Admin Escalation on User Profile**: Non-admin user setting their own `role: "admin"` -> DENIED.
11. **Path Traversal / Malicious ID**: Writing to document ID with illegal characters or excessive bytes -> DENIED.
12. **Blanket Query Scraping**: Attempting an unrestricted list query without authenticated context -> DENIED.
