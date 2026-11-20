# Memory Meals — Firestore Security Specification (Phase 0)

## 1. Data Invariants

1. **User Profile Isolation (`/users/{userId}`)**:
   - Only the authenticated owner (`request.auth.uid == userId`) or an admin may read or update a user's profile.
   - Users cannot self-assign `role: 'admin'` on creation or update; `role` must remain `'customer'` unless modified by an existing admin.
2. **Per-User Auto-Save State (`/userStates/{userId}`)**:
   - Strictly owned by `userId == request.auth.uid`.
   - Cart array is bounded (`<= 30` items), favorites array is bounded (`<= 50` IDs), and all form/draft strings have strict `.size()` limits.
3. **Orders (`/orders/{orderId}`)**:
   - An order can only be created by an authenticated user with `userId == request.auth.uid`, valid Dehradun locality, bounded items list (`1..30`), valid payment method (`UPI` or `COD`), boolean `includeStoryCard` (A/B test flag), and initial status strictly `'Placed'`.
   - Regular users can only read/list their own orders (`resource.data.userId == request.auth.uid`).
   - Only verified admins (`isAdmin()`) can list all orders or transition `status` (`Placed` -> `Paid` -> `Delivered`), and terminal status updates are protected.
4. **Feedback (`/feedback/{feedbackId}`)**:
   - Feedback can only be submitted by the owner of the referenced order (`get(/databases/$(database)/documents/orders/$(incoming().orderId)).data.userId == request.auth.uid`), ensuring verified buyer reviews.
   - Ratings (`tasteRating`, `storyRating`) are strictly integers between `1` and `5`.
5. **Family Recipe Submissions (`/recipes/{recipeId}`)**:
   - Recipe-holders can create and read their own submitted recipes (`userId == request.auth.uid`).
   - Admins can read all submitted recipes and update moderation status (`Pending`, `Featured`, `Archived`).
   - Photo & voice-note payloads are strictly bounded in character length (`<= 250000` / `<= 350000`) to stay well under the 1 MiB document limit.
6. **Admins (`/admins/{userId}`)**:
   - Read-only to the admin user themselves or another admin; client writes are denied to prevent privilege escalation.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Self-Admin Escalation**: Creating `/users/{uid}` with `role: "admin"` -> `PERMISSION_DENIED`.
2. **Shadow Field Injection on User**: Updating `/users/{uid}` with extra field `isFounder: true` -> `PERMISSION_DENIED`.
3. **Cross-User Cart Read/Write**: Reading or writing `/userStates/{otherUid}` as another signed-in user -> `PERMISSION_DENIED`.
4. **Order Status Bypass on Create**: Creating `/orders/{id}` with `status: "Paid"` instead of `"Placed"` -> `PERMISSION_DENIED`.
5. **Identity Spoofing on Order**: Creating `/orders/{id}` with `userId: "victimUid"` -> `PERMISSION_DENIED`.
6. **Customer Marking Own Order Paid**: Updating `/orders/{id}` as the customer to set `status: "Paid"` -> `PERMISSION_DENIED`.
7. **Unverified Admin Email Spoof**: Accessing admin list queries with `email: "mohantysovit@gmail.com"` and `email_verified: false` -> `PERMISSION_DENIED`.
8. **Orphaned / Forged Feedback**: Creating `/feedback/{id}` referencing an `orderId` owned by a different user -> `PERMISSION_DENIED`.
9. **Out-of-Range Rating**: Creating `/feedback/{id}` with `tasteRating: 99` -> `PERMISSION_DENIED`.
10. **ID Poisoning / Oversized Document ID**: Writing `/orders/<200-char-invalid-id>` -> `PERMISSION_DENIED`.
11. **Oversized String / DoW Attack**: Writing a 50,000-character string into `note` or `hostelAddress` -> `PERMISSION_DENIED`.
12. **Blanket List Scraping**: Listing `/orders`, `/feedback`, `/recipes`, or `/users` as a non-admin without `userId == request.auth.uid` filter -> `PERMISSION_DENIED`.
