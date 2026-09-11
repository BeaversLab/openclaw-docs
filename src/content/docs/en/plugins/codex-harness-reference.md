---
summary: "Configuration, auth, discovery, and app-server reference for the Codex harness"
title: "Codex harness reference"
read_when:
  - You need every Codex harness config field
  - You are changing app-server transport, auth, discovery, or timeout behavior
  - You are debugging Codex harness startup, model discovery, or environment isolation
---

This reference covers detailed configuration for the official `codex` plugin.
For setup and routing decisions, start with
[Codex harness](/en/plugins/codex-harness).

## Plugin config surface

All Codex harness settings live under `plugins.entries.codex.config`.

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          discovery: {
            enabled: true,
            timeoutMs: 2500,
          },
          appServer: {
            mode: "guardian",
          },
        },
      },
    },
  },
}
```

Top-level fields:

| Field                      | Default                  | Meaning                                                                                                                                                                                                                                 |
| -------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discovery`                | enabled                  | Model discovery settings for Codex app-server `model/list`. See [Codex model discovery](/en/plugins/codex-harness-reference/model-discovery).                                                                                              |
| `appServer`                | managed stdio app-server | Transport, command, auth, approval, sandbox, and timeout settings. The ordinary harness defaults to agent-scoped state. See [Codex app-server transport](/en/plugins/codex-harness-reference/app-server-transport).                        |
| `codexDynamicToolsLoading` | `"searchable"`           | Use `"direct"` to put OpenClaw dynamic tools directly in the initial Codex tool context. See [Codex dynamic tools](/en/plugins/codex-harness-reference/dynamic-tools).                                                                     |
| `codexDynamicToolsExclude` | `[]`                     | Additional OpenClaw dynamic tool names to omit from Codex app-server turns. See [Codex dynamic tools](/en/plugins/codex-harness-reference/dynamic-tools).                                                                                  |
| `codexPlugins`             | disabled                 | Native Codex plugin/app support, including opt-in access to connected account apps. See [Native Codex plugins](/en/plugins/codex-native-plugins).                                                                                          |
| `computerUse`              | disabled                 | Codex Computer Use setup. See [Codex Computer Use](/en/plugins/codex-computer-use).                                                                                                                                                        |
| `sessionCatalog`           | enabled                  | Native Codex session discovery for the sidebar. Set `enabled: false` to disable it, or set `homes` to include additional local Codex stores. See [Codex session catalog and supervision](/en/plugins/codex-harness-reference/supervision). |
| `supervision`              | disabled                 | Agent-facing native-session transcript and write-control policy. See [Codex supervision](/en/plugins/codex-supervision).                                                                                                                   |

## Where each section moved

Every section of the single-page version now lives on this page or on one of the
nine child pages below. The anchors from the single-page version still resolve here.

### Codex session catalog and supervision

[Codex session catalog and supervision](/en/plugins/codex-harness-reference/supervision) — Native Codex session discovery and agent-facing supervision settings.

- <a id="supervision"></a>[Supervision](/en/plugins/codex-harness-reference/supervision#supervision)

### Codex app-server transport

[Codex app-server transport](/en/plugins/codex-harness-reference/app-server-transport) — App-server transport selection, the appServer field table, and local testing env overrides.

- <a id="app-server-transport"></a>[App-server transport](/en/plugins/codex-harness-reference/app-server-transport#app-server-transport)
- <a id="environment-overrides"></a>[Environment overrides](/en/plugins/codex-harness-reference/app-server-transport#environment-overrides)

### Codex approval and sandbox modes

[Codex approval and sandbox modes](/en/plugins/codex-harness-reference/approval-and-sandbox) — YOLO and guardian approval presets, and sandboxed native execution paths.

- <a id="approval-and-sandbox-modes"></a>[Approval and sandbox modes](/en/plugins/codex-harness-reference/approval-and-sandbox#approval-and-sandbox-modes)
- <a id="sandboxed-native-execution"></a>[Sandboxed native execution](/en/plugins/codex-harness-reference/approval-and-sandbox#sandboxed-native-execution)

### Codex auth and environment isolation

[Codex auth and environment isolation](/en/plugins/codex-harness-reference/auth) — Codex auth selection order, credential handling, and environment isolation.

- <a id="auth-and-environment-isolation"></a>[Auth and environment isolation](/en/plugins/codex-harness-reference/auth#auth-and-environment-isolation)

### Codex dynamic tools

[Codex dynamic tools](/en/plugins/codex-harness-reference/dynamic-tools) — How OpenClaw dynamic tools are exposed to Codex app-server turns.

- <a id="dynamic-tools"></a>[Dynamic tools](/en/plugins/codex-harness-reference/dynamic-tools#dynamic-tools)

### Codex timeouts and turn settlement

[Codex timeouts and turn settlement](/en/plugins/codex-harness-reference/timeouts) — Dynamic tool timeout order, turn execution budgets, and local settlement.

- <a id="timeouts"></a>[Timeouts](/en/plugins/codex-harness-reference/timeouts#timeouts)
- <a id="turn-execution-and-settlement"></a>[Turn execution and settlement](/en/plugins/codex-harness-reference/timeouts#turn-execution-and-settlement)

### Codex model discovery

[Codex model discovery](/en/plugins/codex-harness-reference/model-discovery) — Codex app-server model discovery, offline hints, and catalog rules.

- <a id="model-discovery"></a>[Model discovery](/en/plugins/codex-harness-reference/model-discovery#model-discovery)

### Codex restricted turns

[Codex restricted turns](/en/plugins/codex-harness-reference/restricted-turns) — When a tool policy restricts the Codex native surface, and what ring zero adds.

- <a id="restricted-turns"></a>[Restricted turns](/en/plugins/codex-harness-reference/restricted-turns#restricted-turns)

### Codex workspace bootstrap files

[Codex workspace bootstrap files](/en/plugins/codex-harness-reference/workspace-bootstrap-files) — Which workspace bootstrap files reach a Codex turn, and how they are carried.

- <a id="workspace-bootstrap-files"></a>[Workspace bootstrap files](/en/plugins/codex-harness-reference/workspace-bootstrap-files#workspace-bootstrap-files)

## Related

- [Codex harness](/en/plugins/codex-harness)
- [Codex harness runtime](/en/plugins/codex-harness-runtime)
- [Codex supervision](/en/plugins/codex-supervision)
- [Native Codex plugins](/en/plugins/codex-native-plugins)
- [Codex Computer Use](/en/plugins/codex-computer-use)
- [OpenAI provider](/en/providers/openai)
- [Configuration reference](/en/gateway/configuration-reference)
