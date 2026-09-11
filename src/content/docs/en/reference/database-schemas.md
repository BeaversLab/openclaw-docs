---
summary: "OpenClaw SQLite database locations, schema versions, integrity checks, and downgrade recovery"
read_when:
  - Diagnosing a newer database schema error
  - Checking database compatibility before an update or downgrade
  - Proposing a SQLite or persistent-store change
  - Preparing storage operations for another database backend
  - Recovering a database for an older OpenClaw release
title: "Database schemas"
---

OpenClaw stores control-plane state in the shared state database and agent data in one SQLite database per agent. Schema migrations run forward when a database opens. Older OpenClaw builds refuse databases written by a newer schema.

Two mechanisms back that contract. CI runs
`scripts/check-native-state-schema-version.mjs`, which fails the build when the
Swift and TypeScript state-database contracts declare different schema versions.
`openclaw doctor --fix` owns file-to-SQLite migrations and records a receipt for
each one in the shared `migration_runs` and `migration_sources` tables.

This page is an index. The reference is documented on seven pages, one per
reader job. Open the page that matches your task and stay there.

| Page                                                                                           | Read it when                                                                                             |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [Database layout](/en/reference/database-schemas/layout)                                          | The two database roles, their on-disk paths, and the tables behind individual features.                  |
| [Versioning contract](/en/reference/database-schemas/versioning)                                  | How schema versions are recorded, when a bump is required, and how updaters cross one.                   |
| [Per-person and companion storage](/en/reference/database-schemas/personal-data)                  | Personal GitHub connections, personal model accounts, and Apple companion delivery journals.             |
| [Storage changes and release preflight](/en/reference/database-schemas/storage-changes)           | Preparing for another backend, the material-change review checkpoint, and `openclaw database preflight`. |
| [Agent schema history](/en/reference/database-schemas/agent-schema-history)                       | Per-agent database schema versions, their changes, and their first releases.                             |
| [State schema history](/en/reference/database-schemas/state-schema-history)                       | Shared state database schema versions, their changes, and their first releases.                          |
| [Integrity, troubleshooting, and recovery](/en/reference/database-schemas/integrity-and-recovery) | Integrity checks, common database errors, and the supported downgrade recovery path.                     |

## Related

- [Backups](/en/install/backups) — archives, per-database snapshots, scheduling, and offsite copies for the databases described here
- [Updating](/en/install/updating) — updating safely, including the verified backup to take before a schema bump, and the rollback strategy
- [Doctor](/en/gateway/doctor) — the repair and migration tool that fixes stale config/state and reports health problems

## Where each section moved

Every section heading from the previous single-page version keeps its anchor
here, so an existing link such as
`/reference/database-schemas#schema-bumps-and-older-updaters` still resolves. Each entry points at the
page that now holds the content.

- <a id="database-layout" />[Database layout](/en/reference/database-schemas/layout#database-layout)
- <a id="plugin-state-listing-index" />[Plugin state listing index](/en/reference/database-schemas/layout#plugin-state-listing-index)
- <a id="mentions-inbox" />[Mentions Inbox](/en/reference/database-schemas/layout#mentions-inbox)
- <a id="acp-replay-accounting" />[ACP replay accounting](/en/reference/database-schemas/layout#acp-replay-accounting)
- <a id="meeting-transcript-tables" />[Meeting transcript tables](/en/reference/database-schemas/layout#meeting-transcript-tables)
- <a id="meeting_transcript_sessions" />[`meeting_transcript_sessions`](/en/reference/database-schemas/layout#meeting_transcript_sessions)
- <a id="meeting_transcript_utterances" />[`meeting_transcript_utterances`](/en/reference/database-schemas/layout#meeting_transcript_utterances)
- <a id="meeting_transcript_summaries" />[`meeting_transcript_summaries`](/en/reference/database-schemas/layout#meeting_transcript_summaries)
- <a id="update-run-ledger" />[Update run ledger](/en/reference/database-schemas/layout#update-run-ledger)
- <a id="cloud-repository-workspaces" />[Cloud repository workspaces](/en/reference/database-schemas/layout#cloud-repository-workspaces)
- <a id="versioning-contract" />[Versioning contract](/en/reference/database-schemas/versioning#versioning-contract)
- <a id="schema-bumps-and-older-updaters" />[Schema bumps and older updaters](/en/reference/database-schemas/versioning#schema-bumps-and-older-updaters)
- <a id="profile-owned-skill-library" />[Profile-owned skill library](/en/reference/database-schemas/versioning#profile-owned-skill-library)
- <a id="personal-github-connections-and-publication" />[Personal GitHub connections and publication](/en/reference/database-schemas/personal-data#personal-github-connections-and-publication)
- <a id="personal-model-accounts" />[Personal model accounts](/en/reference/database-schemas/personal-data#personal-model-accounts)
- <a id="apple-companion-delivery-journals" />[Apple companion delivery journals](/en/reference/database-schemas/personal-data#apple-companion-delivery-journals)
- <a id="preparing-for-another-database-backend" />[Preparing for another database backend](/en/reference/database-schemas/storage-changes#preparing-for-another-database-backend)
- <a id="keep-operations-at-the-owning-store" />[Keep operations at the owning store](/en/reference/database-schemas/storage-changes#keep-operations-at-the-owning-store)
- <a id="preserve-the-data-and-concurrency-contracts" />[Preserve the data and concurrency contracts](/en/reference/database-schemas/storage-changes#preserve-the-data-and-concurrency-contracts)
- <a id="keep-engine-specific-capabilities-owned" />[Keep engine-specific capabilities owned](/en/reference/database-schemas/storage-changes#keep-engine-specific-capabilities-owned)
- <a id="review-checkpoint-for-material-changes" />[Review checkpoint for material changes](/en/reference/database-schemas/storage-changes#review-checkpoint-for-material-changes)
- <a id="preflight-a-target-release" />[Preflight a target release](/en/reference/database-schemas/storage-changes#preflight-a-target-release)
  - <a id="preflight-an-explicit-agent-copy" />[Preflight an explicit agent copy](/en/reference/database-schemas/storage-changes#preflight-an-explicit-agent-copy)
- <a id="agent-schema-history" />[Agent schema history](/en/reference/database-schemas/agent-schema-history#agent-schema-history)
- <a id="creator-namespace-migration" />[Creator namespace migration](/en/reference/database-schemas/agent-schema-history#creator-namespace-migration)
- <a id="participant-identity-migration" />[Participant identity migration](/en/reference/database-schemas/agent-schema-history#participant-identity-migration)
- <a id="state-schema-history" />[State schema history](/en/reference/database-schemas/state-schema-history#state-schema-history)
- <a id="state-schema-16" />[State schema 16](/en/reference/database-schemas/state-schema-history#state-schema-16)
- <a id="state-schema-15" />[State schema 15](/en/reference/database-schemas/state-schema-history#state-schema-15)
- <a id="state-schema-13" />[State schema 13](/en/reference/database-schemas/state-schema-history#state-schema-13)
- <a id="state-schema-11" />[State schema 11](/en/reference/database-schemas/state-schema-history#state-schema-11)
- <a id="state-schema-9" />[State schema 9](/en/reference/database-schemas/state-schema-history#state-schema-9)
- <a id="integrity-checks" />[Integrity checks](/en/reference/database-schemas/integrity-and-recovery#integrity-checks)
- <a id="troubleshooting" />[Troubleshooting](/en/reference/database-schemas/integrity-and-recovery#troubleshooting)
- <a id="why-you-cannot-go-back-after-updating-to-2026.7.2" /><a id="why-you-cannot-go-back-after-updating-to-2026-7-2" />[Why you cannot go back after updating to 2026.7.2](/en/reference/database-schemas/integrity-and-recovery#why-you-cannot-go-back-after-updating-to-2026-7-2)
- <a id="the-gateway-refuses-to-start-with-a-newer-schema-version-error" />[The Gateway refuses to start with a newer schema version error](/en/reference/database-schemas/integrity-and-recovery#the-gateway-refuses-to-start-with-a-newer-schema-version-error)
- <a id="a-database-is-quarantined-after-integrity-verification-failed" />[A database is quarantined after integrity verification failed](/en/reference/database-schemas/integrity-and-recovery#a-database-is-quarantined-after-integrity-verification-failed)
- <a id="downgrades-are-unsupported" />[Downgrades are unsupported](/en/reference/database-schemas/integrity-and-recovery#downgrades-are-unsupported)
- <a id="example-state-schema-13-to-12" />[Example: state schema 13 to 12](/en/reference/database-schemas/integrity-and-recovery#example-state-schema-13-to-12)
- <a id="example-state-schema-12-to-11" />[Example: state schema 12 to 11](/en/reference/database-schemas/integrity-and-recovery#example-state-schema-12-to-11)
- <a id="example-state-schema-11-to-10" />[Example: state schema 11 to 10](/en/reference/database-schemas/integrity-and-recovery#example-state-schema-11-to-10)
- <a id="example-state-schema-10-to-9" />[Example: state schema 10 to 9](/en/reference/database-schemas/integrity-and-recovery#example-state-schema-10-to-9)
- <a id="example-state-schema-9-to-8" />[Example: state schema 9 to 8](/en/reference/database-schemas/integrity-and-recovery#example-state-schema-9-to-8)
- <a id="example-state-schema-7-to-6" />[Example: state schema 7 to 6](/en/reference/database-schemas/integrity-and-recovery#example-state-schema-7-to-6)
- <a id="example-agent-schema-17-to-16" />[Example: agent schema 17 to 16](/en/reference/database-schemas/integrity-and-recovery#example-agent-schema-17-to-16)
- <a id="downgrade-recovery" />[Downgrade recovery](/en/reference/database-schemas/integrity-and-recovery#downgrade-recovery)
