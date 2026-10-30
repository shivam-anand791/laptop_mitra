# Support data retention plan — owner and legal review required

## Status

This is an operational proposal, not an approved retention policy. The business owner and legal counsel must approve retention periods, deletion exceptions, and export handling before any retention automation is introduced.

## Current safeguards

- Support tickets are archived rather than deleted by the support workflow.
- Ticket messages and events remain associated with their ticket; events are written as history and are not edited by the support workflow.
- Help articles are unpublished rather than deleted, and categories are archived with all their articles unpublished atomically.
- Returns and ticket attachments have no support-facing hard-delete operation.
- Customer support history is read-only in the admin console.
- Ticket and return CSV exports are restricted to ADMIN and are returned with `Cache-Control: private, no-store`.
- Refund bank details are encrypted separately and are not included in CSV exports.

The development database migration `20261028120000_support_history_preservation` replaces destructive support/ledger foreign-key actions with `RESTRICT` and makes `TicketEvent` and `AuditLog` append-only at the database layer. The migration has only been approved for local development; it has not been applied to Supabase or production. Production rollout remains subject to explicit approval and the preflight/backup procedure in `deploy-database.md`.

## Proposed handling pending approval

1. Retain ticket, message, event, return, and refund-reference history until the owner and legal counsel approve a retention schedule.
2. Do not introduce automatic deletion or anonymization until applicable consumer, tax, payment, warranty, and dispute obligations have been reviewed.
3. Keep archived records available only to authorized staff and preserve their event history.
4. Keep uploaded evidence in private storage. Define an attachment retention and legal-hold process before deleting any stored object.
5. Treat downloaded CSV files as sensitive customer data. Store them only in approved access-controlled locations and delete local copies when no longer needed under the eventual approved schedule.
6. Preserve records subject to a complaint, refund dispute, chargeback, investigation, or legal hold until that hold is released.

## Owner and legal decisions required

- Approve retention periods by record type, including tickets, internal notes, events, returns, refund references, and attachments.
- Define how customer deletion requests interact with financial, warranty, and dispute records.
- Approve anonymization or redaction rules, including whether message bodies and internal notes may be redacted while retaining event metadata.
- Define legal-hold ownership, release procedure, and audit requirements.
- Approve export storage, access, and cleanup rules.

No retention duration or automatic purge behavior is implied by this document.
