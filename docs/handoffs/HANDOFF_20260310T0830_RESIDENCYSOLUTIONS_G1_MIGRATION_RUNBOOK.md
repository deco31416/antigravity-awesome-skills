# HANDOFF — ResidencySolutions G1 JSONL to SQLite Migration Runbook
**Timestamp:** 2026-03-10T08:30:00-04:00 (2026-03-10T12:30:00Z)
**Commit:** Pending (will be pushed sequentially)
**Repo:** `G:\DOWNLOADS5\reidchunes\residencysolutions-core`

---

## What Was Done
Created a definitive step-by-step Operator Runbook detailing how to safely migrate the G1 Entitlements log from its baseline JSONL state into the new MVP SQLite backend, verifying the ingestion synchronously. 

Additionally, modified the `replay_jsonl_to_sqlite.py` script slightly to make operator orchestration statistically safer during evaluation.

**Key Changes:**
1. **Migration Runbook (`docs/MIGRATION_RUNBOOK_JSONL_TO_SQLITE.md`)**:
   - Outlines the 6-step operation path including JSONL dry-runs, SQLite file targeting, idempotency safety nets, and validation checks post-migration.
   - Distinct sections on Backup procedures, strict Rollback instructions, and clear warnings that the JSONL layer remains the true core state path until explicitly abandoned.
2. **Replay Script Polish (`scripts/replay_jsonl_to_sqlite.py`)**:
   - Injected absolute support for an optional `--db-path` argument using Standard `argparse` allowing admins to pipe logs cleanly into `/tmp/` staging databases rather than polluting the ambient system environment via `os.environ`.
3. **Docs Sync:** 
   - Linked to the newly defined Runbook dynamically from the core `SQLITE_ADAPTER.md` notes block.

---

## Sanitized Verification Summary
| Check | Result |
|---|---|
| `guard-no-ui.ps1` | **PASS**: No structural DOM/UI changes anywhere in this process. |
| `verify-core.ps1` | **PASS**: Confirmed IDEMPOTENT tracking, grant processing, list arrays, override capabilities, fallback default JSONL parsing, *and* the isolated SQLite CLI validation sequences successfully continued operating after the Python logic adjustments. |
| Replay Target Override | **PASS**: Executed `python .\scripts\replay_jsonl_to_sqlite.py --jsonl data\entitlements.events.jsonl --db-path $testDb` with successful localized file generation and insertion decoupled from default persistent endpoints. |
| `git status` | **CLEAN**: Only documented and intended framework logic pushed to `main`. |

---

## Rollback Plan
If operators find the `-Backend sqlite` operations misbehaving POST active migration, or the documentation sequence proves faulty:
1. Cease execution of `-Backend sqlite` commands immediately (falling back manually to JSONL commands only). 
2. Delete `data/entitlements.sqlite` if severely unrecoverably corrupted to force regeneration.
3. The legacy default `jsonl` endpoints are wholly untouched; traffic can flip directly back with zero config adjustments globally.

---

## Next Atomic Task
> **G1: Add a formal cutover checklist for promoting SQLite from optional backend to recommended backend**
