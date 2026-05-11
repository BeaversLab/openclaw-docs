---
summary: "設定 ACP 代理程式：acpx harness 設定、外掛程式設定、權限"
read_when:
  - Installing or configuring the acpx harness for Claude Code / Codex / Gemini CLI
  - Enabling the plugin-tools or OpenClaw-tools MCP bridge
  - Configuring ACP permission modes
title: "ACP 代理程式 — 設定"
---

如需概觀、操作員手冊和概念，請參閱 [ACP agents](/zh-Hant/tools/acp-agents)。

下列章節涵蓋 acpx harness 設定、MCP 橋接器的外掛程式設定，以及權限設定。

僅在您設定 ACP/acpx 路由時使用此頁面。若為原生 Codex
應用程式伺服器執行時間設定，請使用 [Codex harness](/zh-Hant/plugins/codex-harness)。若為
OpenAI API 金鑰或 Codex OAuth 模型提供者設定，請使用
[OpenAI](/zh-Hant/providers/openai)。

Codex 有兩個 OpenClaw 路由：

| 路由                      | 設定/指令                                              | 設定頁面                                   |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------ |
| 原生 Codex 應用程式伺服器 | `/codex ...`, `agentRuntime.id: "codex"`               | [Codex harness](/zh-Hant/plugins/codex-harness) |
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
- `pi`
- `qwen`

當 OpenClaw 使用 acpx 後端時，除非您的 acpx 設定定義了自訂代理程式別名，否則建議為 `agentId` 使用這些值。
如果您的本機 Cursor 安裝仍然將 ACP 公開為 `agent acp`，請在您的 acpx 設定中覆寫 `cursor` 代理程式指令，而不是變更內建預設值。

直接的 acpx CLI 使用也可以透過 `--agent <command>` 以任意配接器為目標，但該原始緊急逃生門是 acpx CLI 的功能（而非正常的 OpenClaw `agentId` 路徑）。

模型控制取決於適配器功能。Codex ACP 模型參照會在啟動前由 OpenClaw 正規化。其他 harness 需要 ACP `models` 加上 `session/set_model` 支援；如果 harness 既未暴露該 ACP 功能，也未暴露其自身的啟動模型標誌，OpenClaw/acpx 將無法強制選擇模型。

## 必要設定

核心 ACP 基線：

```json5
{
  acp: {
    enabled: true,
    // Optional. Default is true; set false to pause ACP dispatch while keeping /acp controls.
    dispatch: { enabled: true },
    backend: "acpx",
    defaultAgent: "codex",
    allowedAgents: ["claude", "codex", "copilot", "cursor", "droid", "gemini", "iflow", "kilocode", "kimi", "kiro", "openclaw", "opencode", "pi", "qwen"],
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

執行緒綁定配置因通道適配器而異。以 Discord 為例：

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
        spawnAcpSessions: true,
      },
    },
  },
}
```

如果執行緒綁定 ACP 生成無效，請先驗證適配器功能標誌：

- Discord： `channels.discord.threadBindings.spawnAcpSessions=true`

目前對話的綁定不需要建立子執行緒。它們需要一個有效的對語上下文，以及一個暴露 ACP 對話綁定的通道適配器。

請參閱 [配置參考](/zh-Hant/gateway/configuration-reference)。

## acpx 後端的外掛程式設定

全新安裝預設會啟用內建的 `acpx` 執行時外掛程式，因此 ACP 通常無需手動安裝外掛程式即可運作。

開始於：

```text
/acp doctor
```

如果您停用了 `acpx`，透過 `plugins.allow` / `plugins.deny` 拒絕了它，或是想要切換到本機開發 checkout，請使用明確的外掛程式路徑：

```bash
openclaw plugins install acpx
openclaw config set plugins.entries.acpx.enabled true
```

開發期間的本機工作區安裝：

```bash
openclaw plugins install ./path/to/local/acpx-plugin
```

然後驗證後端健康狀態：

```text
/acp doctor
```

### acpx 指令與版本配置

預設情況下，內建的 `acpx` 外掛程式會註冊內嵌的 ACP 後端，而不會在 Gateway 啟動期間生成 ACP agent。執行 `/acp doctor` 以進行明確的即時探測。僅在您需要 Gateway 在啟動時探測已配置的 agent 時才設定 `OPENCLAW_ACPX_RUNTIME_STARTUP_PROBE=1`。

在外掛程式配置中覆寫指令或版本：

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
- `expectedVersion: "any"` 會停用嚴格版本比對。
- 自訂 `command` 路徑會停用外掛程式本機的自動安裝。

請參閱 [外掛程式](/zh-Hant/tools/plugin)。

### 自動依賴安裝

當您使用 `npm install -g openclaw` 全局安裝 OpenClaw 時，acpx
運行時依賴項（平台特定的二進製文件）會通過 postinstall hook 自動安裝。
如果自動安裝失敗，網關仍會正常啟動並通過 `openclaw acp doctor` 報告缺少的依賴項。

### 插件工具 MCP 橋接

默認情況下，ACPX 會話**不**會將 OpenClaw 插件註冊的工具暴露給
ACP harness。

如果您希望 ACP 代理（如 Codex 或 Claude Code）調用已安裝的
OpenClaw 插件工具（如記憶回憶/存儲），請啟用專用橋接：

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

作用：

- 將名為 `openclaw-plugin-tools` 的內置 MCP 服務器注入到 ACPX 會話
  引導程序中。
- 暴露已由已安裝並啟用的 OpenClaw
  插件註冊的插件工具。
- 保持該功能明確且默認關閉。

安全性和信任說明：

- 這擴展了 ACP harness 的工具表面。
- ACP 代理只能訪問網關中已處於活動狀態的插件工具。
- 應將此視為與讓這些插件在 OpenClaw 本身中執行相同的信任邊界。
- 在啟用之前，請檢查已安裝的插件。

自定義 `mcpServers` 仍像以前一樣工作。內置 plugin-tools 橋接是一個
額外的選擇加入便利功能，而不是通用 MCP 服務器配置的替代品。

### OpenClaw 工具 MCP 橋接

默認情況下，ACPX 會話也**不**會通過 MCP 暴露內置的 OpenClaw 工具。
當 ACP 代理需要選定的內置工具（如 `cron`）時，請啟用獨立的 core-tools 橋接：

```bash
openclaw config set plugins.entries.acpx.config.openClawToolsMcpBridge true
```

作用：

- 將名為 `openclaw-tools` 的內置 MCP 服務器注入到 ACPX 會話
  引導程序中。
- 暴露選定的內置 OpenClaw 工具。初始服務器暴露 `cron`。
- 保持核心工具暴露明確且默認關閉。

### 運行時超時配置

捆綁的 `acpx` 插件將嵌入式運行時默認為 120 秒
超時。這為較慢的 harness（如 Gemini CLI）提供了足夠的時間來完成
ACP 啟動和初始化。如果您的主機需要不同的
運行時限制，請覆蓋它：

```bash
openclaw config set plugins.entries.acpx.config.timeoutSeconds 180
```

更改此值後請重啟網關。

### 健康探測代理配置

當 `/acp doctor` 或選用的啟動探針檢查後端時，內建的
`acpx` 外掛程式會探查一個 harness agent。如果設定了 `acp.allowedAgents`，它
預設為第一個允許的 agent；否則預設為 `codex`。如果您的
部署需要不同的 ACP agent 進行健康檢查，請明確設定探測 agent：

```bash
openclaw config set plugins.entries.acpx.config.probeAgent claude
```

變更此值後請重新啟動 gateway。

## 權限設定

ACP 會話以非互動方式執行 — 沒有 TTY 可以批准或拒絕檔案寫入和 shell 執行權限提示。acpx 外掛程式提供兩個組態鍵來控制權限的處理方式：

這些 ACPX harness 權限與 OpenClaw 執行核准分開，也與 CLI 後端供應商略過標誌（例如 Claude CLI `--permission-mode bypassPermissions`）分開。ACPX `approve-all` 是 ACP 會話的 harness 層級緊急開關。

### `permissionMode`

控制 harness agent 可以在無需提示的情況下執行哪些作業。

| 值              | 行為                                 |
| --------------- | ------------------------------------ |
| `approve-all`   | 自動批准所有檔案寫入和 shell 指令。  |
| `approve-reads` | 僅自動批准讀取；寫入和執行需要提示。 |
| `deny-all`      | 拒絕所有權限提示。                   |

### `nonInteractivePermissions`

控制當顯示權限提示但沒有可用的互動式 TTY 時會發生什麼情況（這在 ACP 會話中總是如此）。

| 值     | 行為                                        |
| ------ | ------------------------------------------- |
| `fail` | 以 `AcpRuntimeError` 中止會話。**（預設）** |
| `deny` | 靜默拒絕權限並繼續（優雅降級）。            |

### 設定

透過外掛程式設定進行設定：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

變更這些值後請重新啟動 gateway。

<Warning>
OpenClaw 預設為 `permissionMode=approve-reads` 和 `nonInteractivePermissions=fail`。在非互動式 ACP 會話中，任何觸發權限提示的寫入或執行都可能失敗並顯示 `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`。

如果您需要限制權限，請將 `nonInteractivePermissions` 設定為 `deny`，以便會話優雅降級而不是崩潰。

</Warning>

## 相關

- [ACP agents](/zh-Hant/tools/acp-agents) — 概述、操作員手冊、概念
- [子代理](/zh-Hant/tools/subagents)
- [多代理路由](/zh-Hant/concepts/multi-agent)
