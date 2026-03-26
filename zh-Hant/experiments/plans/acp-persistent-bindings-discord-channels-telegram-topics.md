# Discord 頻道和 Telegram 主題的 ACP 持久化綁定

狀態：草案

## 摘要

引入映射到以下內容的持久化 ACP 綁定：

- Discord 頻道（以及現有的執行緒，如需要），以及
- 群組/超級群組中的 Telegram 論壇主題 (`chatId:topic:topicId`)

到長期存活的 ACP 會話，綁定狀態使用顯式綁定類型存儲在頂層 `bindings[]` 條目中。

這使得在高流量訊息頻道中使用 ACP 具有可預測性和持久性，以便用戶可以創建專用頻道/主題，例如 `codex`、`claude-1` 或 `claude-myrepo`。

## 為什麼

目前的執行緒綁定 ACP 行為是針對暫時性 Discord 執行緒工作流程進行了最佳化。Telegram 沒有相同的執行緒模型；它在群組/超級群組中有論壇主題。使用者希望在使用者介面中獲得穩定、隨時可用的 ACP「工作空間」，而不僅僅是暫時的執行緒會話。

## 目標

- 支援持久的 ACP 綁定以用於：
  - Discord 頻道/執行緒
  - Telegram 論壇主題（群組/超級群組）
- 將綁定的單一事實來源設定為由設定檔驅動。
- 保持 `/acp`、`/new`、`/reset`、`/focus` 以及傳遞行為在 Discord 和 Telegram 之間的一致性。
- 保留現有的臨時綁定流程以供臨時使用。

## 非目標

- 完全重新設計 ACP 執行時/會話內部結構。
- 移除現有的暫時性綁定流程。
- 在第一次迭代中擴展到每個頻道。
- 在此階段實作 Telegram 頻道直接訊息主題（`direct_messages_topic_id`）。
- 在此階段實作 Telegram 私人聊天主題變體。

## UX 方向

### 1) 兩種綁定類型

- **永久綁定（Persistent binding）**：儲存在設定中，在啟動時進行協調，適用於「命名工作區」頻道/主題。
- **臨時綁定（Temporary binding）**：僅在執行時期存在，根據閒置/最長使用期限原則過期。

### 2) 指令行為

- `/acp spawn ... --thread here|auto|off` 保持可用。
- 加入明確的綁定生命週期控制：
  - `/acp bind [session|agent] [--persist]`
  - `/acp unbind [--persist]`
  - `/acp status` 包含綁定是 `persistent` 還是 `temporary`。
- 在已綁定的對話中，`/new` 和 `/reset` 會就地重設已綁定的 ACP 工作階段並保持綁定狀態。

### 3) 對話身分

- 使用規範對話 ID：
  - Discord：頻道/執行緒 ID。
  - Telegram 主題：`chatId:topic:topicId`。
- 切勿僅以裸主題 ID 作為 Telegram 綁定的鍵值。

## 設定模型（建議）

在頂層 `bindings[]` 中統一路由和持久化 ACP 綁定設定，並使用明確的 `type` 判別符：

```jsonc
{
  "agents": {
    "list": [
      {
        "id": "main",
        "default": true,
        "workspace": "~/.openclaw/workspace-main",
        "runtime": { "type": "embedded" },
      },
      {
        "id": "codex",
        "workspace": "~/.openclaw/workspace-codex",
        "runtime": {
          "type": "acp",
          "acp": {
            "agent": "codex",
            "backend": "acpx",
            "mode": "persistent",
            "cwd": "/workspace/repo-a",
          },
        },
      },
      {
        "id": "claude",
        "workspace": "~/.openclaw/workspace-claude",
        "runtime": {
          "type": "acp",
          "acp": {
            "agent": "claude",
            "backend": "acpx",
            "mode": "persistent",
            "cwd": "/workspace/repo-b",
          },
        },
      },
    ],
  },
  "acp": {
    "enabled": true,
    "backend": "acpx",
    "allowedAgents": ["codex", "claude"],
  },
  "bindings": [
    // Route bindings (existing behavior)
    {
      "type": "route",
      "agentId": "main",
      "match": { "channel": "discord", "accountId": "default" },
    },
    {
      "type": "route",
      "agentId": "main",
      "match": { "channel": "telegram", "accountId": "default" },
    },
    // Persistent ACP conversation bindings
    {
      "type": "acp",
      "agentId": "codex",
      "match": {
        "channel": "discord",
        "accountId": "default",
        "peer": { "kind": "channel", "id": "222222222222222222" },
      },
      "acp": {
        "label": "codex-main",
        "mode": "persistent",
        "cwd": "/workspace/repo-a",
        "backend": "acpx",
      },
    },
    {
      "type": "acp",
      "agentId": "claude",
      "match": {
        "channel": "discord",
        "accountId": "default",
        "peer": { "kind": "channel", "id": "333333333333333333" },
      },
      "acp": {
        "label": "claude-repo-b",
        "mode": "persistent",
        "cwd": "/workspace/repo-b",
      },
    },
    {
      "type": "acp",
      "agentId": "codex",
      "match": {
        "channel": "telegram",
        "accountId": "default",
        "peer": { "kind": "group", "id": "-1001234567890:topic:42" },
      },
      "acp": {
        "label": "tg-codex-42",
        "mode": "persistent",
      },
    },
  ],
  "channels": {
    "discord": {
      "guilds": {
        "111111111111111111": {
          "channels": {
            "222222222222222222": {
              "enabled": true,
              "requireMention": false,
            },
            "333333333333333333": {
              "enabled": true,
              "requireMention": false,
            },
          },
        },
      },
    },
    "telegram": {
      "groups": {
        "-1001234567890": {
          "topics": {
            "42": {
              "requireMention": false,
            },
          },
        },
      },
    },
  },
}
```

### 最小範例（無個別綁定的 ACP 覆蓋）

```jsonc
{
  "agents": {
    "list": [
      { "id": "main", "default": true, "runtime": { "type": "embedded" } },
      {
        "id": "codex",
        "runtime": {
          "type": "acp",
          "acp": { "agent": "codex", "backend": "acpx", "mode": "persistent" },
        },
      },
      {
        "id": "claude",
        "runtime": {
          "type": "acp",
          "acp": { "agent": "claude", "backend": "acpx", "mode": "persistent" },
        },
      },
    ],
  },
  "acp": { "enabled": true, "backend": "acpx" },
  "bindings": [
    {
      "type": "route",
      "agentId": "main",
      "match": { "channel": "discord", "accountId": "default" },
    },
    {
      "type": "route",
      "agentId": "main",
      "match": { "channel": "telegram", "accountId": "default" },
    },

    {
      "type": "acp",
      "agentId": "codex",
      "match": {
        "channel": "discord",
        "accountId": "default",
        "peer": { "kind": "channel", "id": "222222222222222222" },
      },
    },
    {
      "type": "acp",
      "agentId": "claude",
      "match": {
        "channel": "discord",
        "accountId": "default",
        "peer": { "kind": "channel", "id": "333333333333333333" },
      },
    },
    {
      "type": "acp",
      "agentId": "codex",
      "match": {
        "channel": "telegram",
        "accountId": "default",
        "peer": { "kind": "group", "id": "-1009876543210:topic:5" },
      },
    },
  ],
}
```

註記：

- `bindings[].type` 是明確的：
  - `route`：常規 Agent 路由。
  - `acp`：針對匹配對話的持久化 ACP 綁定綁具。
- 對於 `type: "acp"`，`match.peer.id` 是規範的對話鍵值：
  - Discord 頻道/執行緒：原始頻道/執行緒 ID。
  - Telegram 主題：`chatId:topic:topicId`。
- `bindings[].acp.backend` 是可選的。後端後備順序：
  1. `bindings[].acp.backend`
  2. `agents.list[].runtime.acp.backend`
  3. 全域 `acp.backend`
- `mode`、`cwd` 和 `label` 遵循相同的覆蓋模式（`binding override -> agent runtime default -> global/default behavior`）。
- 保留現有的 `session.threadBindings.*` 和 `channels.discord.threadBindings.*` 用於暫時性綁定策略。
- 持久化條目聲明期望狀態；執行時協調至實際的 ACP 會話/綁定。
- 每個對話節點一個啟用的 ACP 綁定是預期的模型。
- 向後相容性：遺失的 `type` 對於舊版條目解釋為 `route`。

### 後端選擇

- ACP session initialization already uses configured backend selection during spawn (`acp.backend` today).
- This proposal extends spawn/reconcile logic to prefer typed ACP binding overrides:
  - `bindings[].acp.backend` for conversation-local override.
  - `agents.list[].runtime.acp.backend` for per-agent defaults.
- If no override exists, keep current behavior (`acp.backend` default).

## Architecture Fit in Current System

### Reuse existing components

- `SessionBindingService` already supports channel-agnostic conversation references.
- ACP spawn/bind flows already support binding through service APIs.
- Telegram already carries topic/thread context via `MessageThreadId` and `chatId`.

### New/extended components

- **Telegram binding adapter** (parallel to Discord adapter):
  - register adapter per Telegram account,
  - 透過正規對話 ID 來解析/列出/綁定/解綁/觸碰。
- **類型綁定解析器/索引**：
  - 將 `bindings[]` 拆分為 `route` 和 `acp` 檢視，
  - 僅在 `route` 綁定上保留 `resolveAgentRoute`，
  - 僅從 `acp` 綁定解析持久化 ACP 意圖。
- **Telegram 的入站綁定解析**：
  - 在路由最終確定之前解析綁定的會話（Discord 已經這樣做）。
- **持久化綁定協調器**：
  - 啟動時：載入設定的頂層 `type: "acp"` 綁定，確保 ACP 會話存在，確保綁定存在。
  - 設定變更時：安全地套用差異。
- **切換模型**：
  - 不讀取通道本地的 ACP 綁定後備，
  - 持久化 ACP 綁定僅來自頂層 `bindings[].type="acp"` 項目。

## 分階段推出

### 階段 1：類型化綁定架構基礎

- 擴展設定架構以支援 `bindings[].type` 判別值：
  - `route`，
  - `acp` 附帶可選的 `acp` 覆蓋物件 (`mode`, `backend`, `cwd`, `label`)。
- 擴充代理程式架構以包含運行時描述符，用於標記 ACP 原生代理程式 (`agents.list[].runtime.type`)。
- 為路由與 ACP 綁定新增解析器/索引器區分。

### 階段 2：執行時期解析 + Discord/Telegram 一致性

- 從頂層 `type: "acp"` 項目解析持續性 ACP 綁定，用於：
  - Discord 頻道/討論串，
  - Telegram 論壇主題（`chatId:topic:topicId` 標準 ID）。
- 實作 Telegram 綁定配接器，並在入站綁定會話覆寫方面與 Discord 保持對等。
- 此階段不包含 Telegram 直接/私人主題變體。

### 階段 3：指令對等與重設

- 在綁定的 Telegram/Discord 對話中，使 `/acp`、`/new`、`/reset` 和 `/focus` 的行為保持一致。
- 確保依設定在重設流程中保留綁定。

### 第四階段：強化

- 更佳的診斷工具（`/acp status`、啟動協調記錄）。
- 衝突處理和健康檢查。

## 防護措施與策略

- 完全遵循現有的 ACP 啟用和沙箱限制。
- 保持明確的帳號範圍（`accountId`），以避免跨帳號滲透。
- 在路由不明確時封閉失敗。
- 根據頻道設定保持提及/存取策略行為的明確性。

## 測試計畫

- 單元：
  - 交談 ID 正規化（特別是 Telegram 主題 ID），
  - reconciler 建立/更新/刪除路徑，
  - `/acp bind --persist` 和解除綁定流程。
- 整合：
  - 傳入 Telegram 主題 -> 綁定的 ACP 會話解析，
  - 傳入 Discord 頻道/執行緒 -> 永久綁定優先順序。
- 迴歸測試：
  - 暫時綁定繼續運作，
  - 未綁定的頻道/主題保持目前路由行為。

## 未解決問題

- Telegram 主題中的 `/acp spawn --thread auto` 應預設為 `here`？
- 持久綁定應始終繞過綁定對話中的提及限制，還是需要明確的 `requireMention=false`？
- `/focus` 應增加 `--persist` 作為 `/acp bind --persist` 的別名？

## 推出

- 作為選用功能推出，每個對話單獨選擇（存在 `bindings[].type="acp"` 條目）。
- 首先僅支援 Discord + Telegram。
- 新增包含以下範例的文件：
  - 「每個代理一個頻道/主題」
  - 「同一代理的多個頻道/主題，且具有不同的 `cwd`」
  - 「團隊命名模式（`codex-1`，`claude-repo-x`）」。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
