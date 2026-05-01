# Security Spec

## Data Invariants
1. A timestamp must be created at `request.time`.
2. A `Stamp` must belong to the user's subcollection correctly, with its `userId` matching `request.auth.uid`.
3. Users can only read and write their own documents.
4. Cannot update `createdAt` or `userId`.

## The Dirty Dozen Payloads

1. Unauthenticated read/write to stamps.
2. Authenticated read/write to someone else's stamps.
3. Injecting a 10MB string into `imageDataUrl`.
4. Updating another user's `date` or `journalEntry`.
5. Spoofing `userId` on creation (`userId` is not `request.auth.uid`).
6. Invalid `date` format (not YYYY-MM-DD).
7. Missing required fields in `Stamp`.
8. Updating `createdAt` timestamp.
9. Injecting extra fields in `Stamp` (e.g. `isAdmin: true`).
10. Spoofing `userId` path parameter.
11. Large `journalEntry` string (e.g. over 10KB).
12. Creating a stamp when not verified (Wait, using standard google sign in, emails are usually verified, but we can check).
