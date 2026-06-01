---
summary: "設定 ACP 代理程式：acpx harness 設定、外掛程式設定、權限"
read_when:
  - Installing or configuring the acpx harness for Claude Code / Codex / Gemini CLI
  - Enabling the plugin-tools or OpenClaw-tools MCP bridge
  - Configuring ACP permission modes
title: "ACP 代理程式 — 設定"
---

如需概覽、操作員手冊和概念，請參閱 [ACP agents](/zh-Hant/tools/acp-agents)。

下列章節涵蓋 acpx harness 設定、MCP 橋接器的外掛程式設定，以及權限設定。

僅在您設定 ACP/acpx 路由時使用此頁面。如需原生 Codex app-server 執行時配置，請使用 [Codex harness](/zh-Hant/plugins/codex-harness)。如需 OpenAI API 金鑰或 Codex OAuth 模型提供者配置，請使用 [OpenAI](/zh-Hant/providers/openai)。

Codex 有兩個 OpenClaw 路由：

| 路由                      | 設定/指令                                              | 設定頁面                                   |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------ |
| 原生 Codex 應用程式伺服器 | `/codex ...`, `openai/gpt-*` 代理程式參照              | [Codex harness](/zh-Hant/plugins/codex-harness) |
| 明確的 Codex ACP 配接器   | `/acp spawn codex`, `runtime: "acp", agentId: "codex"` | 本頁                                       |

除非您明確需要 ACP/acpx 行為，否則建議優先使用原生路由。

## acpx harness 支援 (目前)

目前的 acpx 內建 harness 別名：

- `claude`
- `codex`
- `copilot`
- `cursor` (Cursor CLI: `cursor-agent acp`)
- `droid`
- `gemini`
- `iflow`
- `kilocode`
- `kimi`
- `kiro`
- `openclaw`
- `opencode`
- `qwen`

當 OpenClaw 使用 acpx 後端時，除非您的 acpx 配置定義了自訂代理程式別名，否則建議為 `agentId` 使用這些值。如果您本機安裝的 Cursor 仍將 ACP 顯示為 `agent acp`，請在您的 acpx 配置中覆寫 `cursor` 代理程式指令，而不要更改內建預設值。

直接使用 acpx CLI 也可以透過 `--agent <command>` 以目標任意轉接器，但這種原始的緊急逃生方法是 acpx CLI 的功能（不是正常的 OpenClaw `agentId` 路徑）。

模型控制取決於轉接器功能。Codex ACP 模型參照會在啟動前由 OpenClaw 正規化。其他線束需要 ACP `models` 加上 `session/set_model` 支援；如果線束未公開該 ACP 功能或其自身的啟動模型標誌，OpenClaw/acpx 將無法強制選擇模型。

## 必要配置

核心 ACP 基線：

```json5
{
  acp: {
    enabled: true,
    // Optional. Default is true; set false to pause ACP dispatch while keeping /acp controls.
    dispatch: { enabled: true },
    backend: "acpx",
    defaultAgent: "codex",
    allowedAgents: ["claude", "codex", "copilot", "cursor", "droid", "gemini", "iflow", "kilocode", "kimi", "kiro", "openclaw", "opencode", "openclaw", "qwen"],
    maxConcurrentSessions: 8,
    stream: {
      coalesceIdleMs: 300,
      maxChunkChars: 1200,
    },
    runtime: {
      ttlMinutes: 120,
    },
  },
}
```

執行緒綁定配置特定於通道轉接器。Discord 範例：

```json5
{
  session: {
    threadBindings: {
      enabled: true,
      idleHours: 24,
      maxAgeHours: 0,
    },
  },
  channels: {
    discord: {
      threadBindings: {
        enabled: true,
        spawnSessions: true,
      },
    },
  },
}
```

如果執行緒綁定的 ACP 產生無法運作，請先驗證轉接器功能標誌：

- Discord： `channels.discord.threadBindings.spawnSessions=true`

目前對話綁定不需要建立子執行緒。它們需要一個作用中的對話內容和一個公開 ACP 對話綁定的通道轉接器。

請參閱 [Configuration Reference](/zh-Hant/gateway/configuration-reference)。

## acpx 後端的外掛程式設定

封裝安裝使用 ACP 的官方 `@openclaw/acpx` 執行時外掛程式。
在使用 ACP 線束工作階段之前，請先安裝並啟用它：

```bash
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

來源檢出也可以在 `pnpm install` 之後使用本機工作區外掛程式。

開始使用：

```text
/acp doctor
```

如果您停用了 `acpx`，透過 `plugins.allow` / `plugins.deny` 拒絕了它，或者想要
切換回打包的外掛程式，請使用明確的套件路徑：

```bash
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

開發期間的本地工作區安裝：

```bash
openclaw plugins install ./path/to/local/acpx-plugin
```

然後驗證後端健康狀態：

```text
/acp doctor
```

### acpx 指令與版本設定

預設情況下，`acpx` 外掛程式會在 Gateway
啟動期間註冊內嵌的 ACP 後端，並在 Gateway
`ready` 訊號之前等待內嵌執行時啟動探測。僅針對故意
停用啟動探測的腳本或環境設定 `OPENCLAW_ACPX_RUNTIME_STARTUP_PROBE=0` 或
`OPENCLAW_SKIP_ACPX_RUNTIME_PROBE=1`。執行 `/acp doctor` 以進行明確的
隨選探測。

在外掛程式設定中覆寫指令或版本：

```json
{
  "plugins": {
    "entries": {
      "acpx": {
        "enabled": true,
        "config": {
          "command": "../acpx/dist/cli.js",
          "expectedVersion": "any"
        }
      }
    }
  }
}
```

- `command` 接受絕對路徑、相對路徑（從 OpenClaw 工作區解析）或指令名稱。
- `expectedVersion: "any"` 停用嚴格版本比對。
- 自訂 `command` 路徑會停用外掛程式本地的自動安裝。

當路徑或標記值應保持為一個 argv token 時，覆寫個別 ACP 代理程式指令並搭配結構化引數：

```json
{
  "plugins": {
    "entries": {
      "acpx": {
        "enabled": true,
        "config": {
          "agents": {
            "claude": {
              "command": "node",
              "args": ["/path/to/custom adapter.mjs", "--verbose"]
            }
          }
        }
      }
    }
  }
}
```

- `agents.<id>.command` 是該 ACP 代理程式的可執行檔或現有指令字串。
- `agents.<id>.args` 是選用的。在 OpenClaw 將陣列項目透過目前的 acpx 指令字串登錄表傳遞之前，每個陣列項目都會經過 shell 引號處理。

請參閱 [Plugins](/zh-Hant/tools/plugin)。

### 自動相依性安裝

當您使用 `npm install -g openclaw` 全域安裝 OpenClaw 時，acpx
執行時相依性（平台特定的二進位檔）會透過 postinstall hook
自動安裝。如果自動安裝失敗，Gateway 仍會正常啟動
並透過 `openclaw acp doctor` 回報遺失的相依性。

### Plugin tools MCP 橋接器

預設情況下，ACPX 工作階段**不會**將 OpenClaw 外掛程式註冊的工具
公開給 ACP 線具。

如果您希望 ACP 代理程式（例如 Codex 或 Claude Code）呼叫已安裝的
OpenClaw 外掛程式工具（例如記憶體回憶/儲存），請啟用專用橋接器：

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

其作用如下：

- 將名為 `openclaw-plugin-tools` 的內建 MCP 伺服器注入 ACPX 工作階段
  引導程序。
- 公開已安裝並啟用的 OpenClaw 外掛程式已註冊的外掛程式工具。
- 保持此功能為明確選項，且預設為關閉。

安全性與信任注意事項：

- 這會擴充 ACP harness 的工具表面。
- ACP 代理程式只能存取閘道中已啟用的外掛程式工具。
- 請將此視為與讓那些外掛程式在 OpenClaw 本身執行相同的信任邊界。
- 在啟用它之前，請檢閱已安裝的外掛程式。

自訂 `mcpServers` 仍像以前一樣運作。內建的 plugin-tools 橋接器是一個額外的選用便利功能，並非通用 MCP 伺服器設定的替代品。

### OpenClaw 工具 MCP 橋接器

根據預設，ACPX 工作階段也**不會**透過 MCP 公開內建的 OpenClaw 工具。當 ACP 代理程式需要選定的內建工具（例如 `cron`）時，請啟用獨立的 core-tools 橋接器：

```bash
openclaw config set plugins.entries.acpx.config.openClawToolsMcpBridge true
```

此功能的作用：

- 將名為 `openclaw-tools` 的內建 MCP 伺服器注入 ACPX 工作階段啟動程序中。
- 公開選定的內建 OpenClaw 工具。初始伺服器會公開 `cron`。
- 保持核心工具的公開為明確選項，且預設為關閉。

### 執行階段作業逾時設定

`acpx` 外掛程式預設給予嵌入式執行階段啟動和控制作業 120 秒的時間。這給予較慢的 harness（如 Gemini CLI）足夠的時間來完成 ACP 啟動和初始化。如果您的主機需要不同的作業限制，請覆寫此值：

```bash
openclaw config set plugins.entries.acpx.config.timeoutSeconds 180
```

執行階段輪次會使用 OpenClaw 代理程式/執行逾時設定，包括 `/acp timeout` 和 `sessions_spawn.timeoutSeconds`。變更此值後請重新啟動閘道。

### 健康探測代理程式設定

當 `/acp doctor` 或啟動探測檢查後端時，隨附的 `acpx` 外掛程式會探測一個 harness 代理程式。如果設定了 `acp.allowedAgents`，它預設為第一個允許的代理程式；否則預設為 `codex`。如果您的部署需要不同的 ACP 代理程式進行健康檢查，請明確設定探測代理程式：

```bash
openclaw config set plugins.entries.acpx.config.probeAgent claude
```

變更此值後請重新啟動閘道。

## 權限設定

ACP 會話以非互動方式運行 — 沒有 TTY 來批准或拒絕檔案寫入和 Shell 執行權限提示。acpx 外掛程式提供兩個配置鍵來控制權限的處理方式：

這些 ACPX harness 權限與 OpenClaw 執行批准分開，也與 CLI 後端供應商旁路標誌（如 Claude CLI `--permission-mode bypassPermissions`）分開。ACPX `approve-all` 是 ACP 會話的 harness 層級緊急開關。

### `permissionMode`

控制 harness 代理程式可以在無需提示的情況下執行哪些操作。

| 值              | 行為                                 |
| --------------- | ------------------------------------ |
| `approve-all`   | 自動批准所有檔案寫入和 Shell 指令。  |
| `approve-reads` | 僅自動批准讀取；寫入和執行需要提示。 |
| `deny-all`      | 拒絕所有權限提示。                   |

### `nonInteractivePermissions`

控制當顯示權限提示但沒有可用的互動式 TTY 時發生的情況（這對於 ACP 會程式來說總是如此）。

| 值     | 行為                                              |
| ------ | ------------------------------------------------- |
| `fail` | 使用 `AcpRuntimeError` 中止會程式。**（預設值）** |
| `deny` | 靜默拒絕權限並繼續（優雅降級）。                  |

### 配置

透過外掛程式配置設定：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

變更這些值後重新啟動閘道。

<Warning>
OpenClaw 預設為 `permissionMode=approve-reads` 和 `nonInteractivePermissions=fail`。在非互動式 ACP 會程式中，任何觸發權限提示的寫入或執行操作都可能失敗並顯示 `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`。

如果您需要限制權限，請將 `nonInteractivePermissions` 設定為 `deny`，以便會程式優雅降級而不是當機。

</Warning>

## 相關

- [ACP agents](/zh-Hant/tools/acp-agents) — 概述、操作員手冊、概念
- [Sub-agents](/zh-Hant/tools/subagents)
- [Multi-agent routing](/zh-Hant/concepts/multi-agent)
