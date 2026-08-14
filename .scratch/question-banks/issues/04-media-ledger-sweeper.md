# 04 — Media storage, upload, ledger, and sweeper

**What to build:** An admin inserts an image into a prompt or an answer: the client requests a presigned PUT for a staging key (png/jpeg/webp only), validates the 5 MB limit before uploading, uploads directly to object storage, then confirms — the server HEAD-checks the original object (rejects over 5 MB), converts it to WebP with sharp, and stores the permanent object. The editor embeds the object key; images render from the public base URL. Removing an image from content and saving the question tombstones the media ledger row, and the periodic sweeper deletes the object afterwards — purge only after successful deletion, failures retried on the next sweep, batches isolated, reconciliation reclaiming orphaned objects past the grace period (including uploads never saved into content). Unit tests mock the storage client; E2E runs against a local MinIO container.

**Blocked by:** 03 — Question authoring with TipTap.

**Status:** done

- [ ] Presign flow rejects non-png/jpeg/webp extensions
- [ ] Confirm rejects originals over 5 MB (server-side HEAD check), independent of the client-side check
- [ ] Original is converted to WebP and stored under a permanent media key; the editor embeds the key and rendering resolves the public URL
- [ ] Saving a question syncs the ledger: new embedded keys registered, removed keys tombstoned, in the same transaction as the content save
- [ ] Sweeper: tombstoned rows → object deleted → row purged, in that order; failed deletions keep the tombstone and retry; one failing row does not block its batch; empty batches no-op
- [ ] Reconciliation deletes objects with no ledger ownership past the grace period
- [ ] Deleting a question tombstones its media ledger rows (objects removed by the sweeper, not in the question transaction)
- [ ] Unit tests: storage module against a mocked client (presign, key scheme, size-check rejection, conversion), ledger diff, sweeper semantics (success, failure/retry, key correctness, purge ordering, batch isolation, empty batch)
- [ ] E2E with MinIO: upload png/jpeg/webp renders in prompt and answer; oversized upload rejected; removing an image from content leads to its object being swept
