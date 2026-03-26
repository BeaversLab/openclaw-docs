---
summary: "Skills config schema and examples"
read_when:
  - Adding or modifying skills config
  - Adjusting bundled allowlist or install behavior
title: "Skills Config"
---

# Skills Config

All skills-related configuration lives under `skills` in `~/.openclaw/openclaw.json`.

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills", "~/Projects/oss/some-skill-pack/skills"],
      watch: true,
      watchDebounceMs: 250,
    },
    install: {
      preferBrew: true,
      nodeManager: "npm", // npm | pnpm | yarn | bun (Gateway runtime still Node; bun not recommended)
    },
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // or plaintext string
        env: {
          GEMINI_API_KEY: "GEMINI_KEY_HERE",
        },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

For built-in image generation/editing, prefer `agents.defaults.imageGenerationModel`
plus the core `image_generate` tool. `skills.entries.*` is only for custom or
third-party skill workflows.

Examples:

- Native Nano Banana-style setup: `agents.defaults.imageGenerationModel.primary: "google/gemini-3-pro-image-preview"`
- Native fal setup: `agents.defaults.imageGenerationModel.primary: "fal/fal-ai/flux/dev"`

## Fields

- `allowBundled`: optional allowlist for **bundled** skills only. When set, only
  bundled skills in the list are eligible (managed/workspace skills unaffected).
- `load.extraDirs`: additional skill directories to scan (lowest precedence).
- `load.watch`: watch skill folders and refresh the skills snapshot (default: true).
- `load.watchDebounceMs`: debounce for skill watcher events in milliseconds (default: 250).
- `install.preferBrew`: prefer brew installers when available (default: true).
- `install.nodeManager`: node installer preference (`npm` | `pnpm` | `yarn` | `bun`, default: npm).
  This only affects **skill installs**; the Gateway runtime should still be Node
  (Bun not recommended for WhatsApp/Telegram).
- `entries.<skillKey>`: per-skill overrides.

Per-skill fields:

- `enabled`: set `false` to disable a skill even if it’s bundled/installed.
- `env`: environment variables injected for the agent run (only if not already set).
- `apiKey`: optional convenience for skills that declare a primary env var.
  Supports plaintext string or SecretRef object (`{ source, provider, id }`).

## Notes

- Keys under `entries` map to the skill name by default. If a skill defines
  `metadata.openclaw.skillKey`, use that key instead.
- 當啟用監視器時，對技能的變更將在下一個代理輪次中生效。

### 沙盒化技能 + 環境變數

當工作階段處於**沙盒化**狀態時，技能程序會在 Docker 內執行。沙盒**不會**繼承主機的 `process.env`。

使用下列其中之一：

- `agents.defaults.sandbox.docker.env` (或每個代理的 `agents.list[].sandbox.docker.env`)
- 將環境變數內建至您的自訂沙盒映像中

全域 `env` 和 `skills.entries.<skill>.env/apiKey` 僅適用於**主機**執行。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
