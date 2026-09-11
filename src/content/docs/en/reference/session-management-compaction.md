---
summary: "Deep dive: session store + transcripts, lifecycle, and (auto)compaction internals"
read_when:
  - You need to debug session ids, transcript events, or session row fields
  - You are changing auto-compaction behavior or adding "pre-compaction" housekeeping
  - You want to implement memory flushes or silent system turns
title: "Session management deep dive"
---

A single **Gateway process** owns session state end-to-end. UIs (macOS app, web Control UI, TUI) query the Gateway for session lists and token counts. In remote mode, the per-agent SQLite database lives on the remote host, so checking your local Mac's state will not reflect what the Gateway is using.

Overview docs first: [Session management](/en/concepts/session), [Compaction](/en/concepts/compaction), [Memory overview](/en/concepts/memory), [Memory search](/en/concepts/memory-search), [Session pruning](/en/concepts/session-pruning), [Transcript hygiene](/en/reference/transcript-hygiene), full config reference at [Agent config](/en/gateway/config-agents).

This page is an index. The deep dive is documented on five pages, one per
reader job. Open the page that matches your task and stay there.

| Page                                                                                        | Read it when                                                                                     |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [Session state on disk](/en/reference/session-management-compaction/store)                     | The two persistence layers and the per-agent paths on the Gateway host.                          |
| [Store maintenance and retention](/en/reference/session-management-compaction/maintenance)     | `session.maintenance` keys, disk-budget cleanup, cron retention, and the SQLite downgrade path.  |
| [Session keys, ids, and transcript events](/en/reference/session-management-compaction/schema) | `sessionKey` patterns, `sessionId` lifecycle, `SessionEntry` fields, and transcript entry types. |
| [Compaction behavior and settings](/en/reference/session-management-compaction/compaction)     | What compaction does, when it runs, its settings and providers, and where it surfaces.           |
| [Silent turns and the memory flush](/en/reference/session-management-compaction/housekeeping)  | The `NO_REPLY` contract and `agents.defaults.compaction.memoryFlush`.                            |

## Where each section moved

Every section heading from the previous single-page version keeps its anchor
here, so an existing link such as
`/reference/session-management-compaction#when-auto-compaction-happens` still resolves. Each entry points at the
page that now holds the content.

- <a id="two-persistence-layers" />[Two persistence layers](/en/reference/session-management-compaction/store#two-persistence-layers)
- <a id="on-disk-locations" />[On-disk locations](/en/reference/session-management-compaction/store#on-disk-locations)
- <a id="store-maintenance-and-disk-controls" />[Store maintenance and disk controls](/en/reference/session-management-compaction/maintenance#store-maintenance-and-disk-controls)
- <a id="downgrading-after-the-sqlite-flip" />[Downgrading After The SQLite Flip](/en/reference/session-management-compaction/maintenance#downgrading-after-the-sqlite-flip)
- <a id="cron-sessions-and-run-logs" />[Cron sessions and run logs](/en/reference/session-management-compaction/maintenance#cron-sessions-and-run-logs)
- <a id="session-keys-(sessionkey)" /><a id="session-keys-sessionkey" />[Session keys (`sessionKey`)](/en/reference/session-management-compaction/schema#session-keys-sessionkey)
- <a id="session-ids-(sessionid)" /><a id="session-ids-sessionid" />[Session ids (`sessionId`)](/en/reference/session-management-compaction/schema#session-ids-sessionid)
- <a id="session-store-schema" />[Session store schema](/en/reference/session-management-compaction/schema#session-store-schema)
- <a id="transcript-event-structure" />[Transcript event structure](/en/reference/session-management-compaction/schema#transcript-event-structure)
- <a id="context-windows-vs-tracked-tokens" />[Context windows vs tracked tokens](/en/reference/session-management-compaction/compaction#context-windows-vs-tracked-tokens)
- <a id="compaction%3A-what-it-is" /><a id="compaction-what-it-is" />[Compaction: what it is](/en/reference/session-management-compaction/compaction#compaction-what-it-is)
- <a id="chunk-boundaries-and-tool-pairing" />[Chunk boundaries and tool pairing](/en/reference/session-management-compaction/compaction#chunk-boundaries-and-tool-pairing)
- <a id="when-auto-compaction-happens" />[When auto-compaction happens](/en/reference/session-management-compaction/compaction#when-auto-compaction-happens)
- <a id="compaction-settings" />[Compaction settings](/en/reference/session-management-compaction/compaction#compaction-settings)
- <a id="pluggable-compaction-providers" />[Pluggable compaction providers](/en/reference/session-management-compaction/compaction#pluggable-compaction-providers)
- <a id="user-visible-surfaces" />[User-visible surfaces](/en/reference/session-management-compaction/compaction#user-visible-surfaces)
- <a id="silent-housekeeping-(no_reply)" /><a id="silent-housekeeping-no_reply" />[Silent housekeeping (`NO_REPLY`)](/en/reference/session-management-compaction/housekeeping#silent-housekeeping-no_reply)
- <a id="pre-compaction-memory-flush" />[Pre-compaction memory flush](/en/reference/session-management-compaction/housekeeping#pre-compaction-memory-flush)

## Troubleshooting checklist

- **Session key wrong?** Start with [/concepts/session](/en/concepts/session) and confirm the `sessionKey` in `/status`.
- **Store vs transcript mismatch?** Confirm the Gateway host and the store path from `openclaw status`.
- **Compaction spam?** Check the model's context window (too small forces frequent compaction) and tool-result bloat (tune session pruning).
- **Every prompt seems to overflow on a small local model?** Confirm the provider reports the correct model context window. OpenClaw can cap the effective reserve only when that window is known.
- **Silent turns leaking?** Confirm the reply starts with the exact silent token `NO_REPLY` (case-insensitive) and you are on a build that includes the streaming-suppression fix (`2026.1.10`+).

## Related

- [Session management](/en/concepts/session)
- [Session pruning](/en/concepts/session-pruning)
- [Context engine](/en/concepts/context-engine)
- [Agent config reference](/en/gateway/config-agents)
