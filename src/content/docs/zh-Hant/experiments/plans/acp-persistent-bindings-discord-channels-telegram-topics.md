# 適用於 Discord 頻道和 Telegram 主題的 ACP 永久綁定

狀態：草案

## 摘要

引入永久 ACP 綁定，對應至：

- Discord 頻道（以及現有的討論串，如需要），以及
- 群組/超級群組 中的 Telegram 論壇主題 (`chatId:topic:topicId`)

對應至長期存活的 ACP 會話，並使用明確的綁定類型將綁定狀態儲存在頂層 `bindings[]` 項目中。

這使得在高流量訊息頻道中使用 ACP 具有可預測性和持久性，讓使用者可以建立專用頻道/主題，例如 `codex`、`claude-1` 或 `claude-myrepo`。

## 原因

目前的討論串綁定 ACP 行為已針對暫時性的 Discord 討論串工作流程進行了最佳化。Telegram 並沒有相同的討論串模型；它在群組/超級群組中擁有論壇主題。使用者希望在聊天介面上擁有穩定、始終在線的 ACP「工作區」，而不僅僅是暫時的討論串會話。

## 目標

- 支援以下項目的持久 ACP 綁定：
  - Discord 頻道/討論串
  - Telegram 論壇主題（群組/超級群組）
- 讓綁定來源事實由設定檔驅動。
- 保持 `/acp`、`/new`、`/reset`、`/focus` 和傳遞行為在 Discord 和 Telegram 之間的一致性。
- 保留現有的臨時綁定流程以供臨時使用。

## 非目標

- 完全重新設計 ACP 執行時/會話內部機制。
- 移除現有的暫時性綁定流程。
- 在第一次迭代中擴展到每個頻道。
- 在此階段實作 Telegram 頻道直接訊息主題 (`direct_messages_topic_id`)。
- 在此階段實作 Telegram 私人聊天主題變體。

## UX 方向

### 1) 兩種綁定類型

- **永久綁定**：儲存在設定檔中，在啟動時進行協調，適用於「具名工作區」頻道/主題。
- **臨時綁定**：僅限執行時，根據閒置/最長壽命原則過期。

### 2) 指令行為

- `/acp spawn ... --thread here|auto|off` 保持可用。
- 新增明確的綁定生命週期控制：
  - `/acp bind [session|agent] [--persist]`
  - `/acp unbind [--persist]`
  - `/acp status` 包含綁定是 `persistent` 還是 `temporary`。
- 在綁定的對話中，`/new` 和 `/reset` 會就地重設綁定的 ACP 會話，並保持綁定連接。

### 3) 對話身份

- 使用正準對話 ID：
  - Discord：頻道/執行緒 ID。
  - Telegram 主題：`chatId:topic:topicId`。
- 切勿僅依賴裸露的主題 ID 作為 Telegram 綁定的鍵值。

## 設定模型（提案）

在頂層 `bindings[]` 中統一路由和持久化 ACP 綁定設定，並使用明確的 `type` 區分符：

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

### 最小範例（無每個綁定的 ACP 覆蓋）

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

備註：

- `bindings[].type` 是明確的：
  - `route`：正常代理程式路由。
  - `acp`：針對符合對話的持久化 ACP 組件綁定。
- 對於 `type: "acp"`，`match.peer.id` 是正準對話鍵值：
  - Discord 頻道/執行緒：原始頻道/執行緒 ID。
  - Telegram 主題：`chatId:topic:topicId`。
- `bindings[].acp.backend` 是選用的。後端後援順序：
  1. `bindings[].acp.backend`
  2. `agents.list[].runtime.acp.backend`
  3. 全域 `acp.backend`
- `mode`、`cwd` 和 `label` 遵循相同的覆蓋模式 (`binding override -> agent runtime default -> global/default behavior`)。
- 保留現有的 `session.threadBindings.*` 和 `channels.discord.threadBindings.*` 用於暫時綁定政策。
- 持久化條目聲明期望狀態；執行時協調至實際的 ACP 會話/綁定。
- 每個對話節點一個作用中的 ACP 綁定為預期的模型。
- 向後相容性：遺失的 `type` 在舊版條目中會被解讀為 `route`。

### 後端選擇

- ACP 會話初始化在產生期間已經使用設定的後端選擇（目前為 `acp.backend`）。
- 此提案擴展產生/協調邏輯，以優先使用類型化的 ACP 綁定覆蓋：
  - `bindings[].acp.backend` 用於對話本機的覆蓋。
  - `agents.list[].runtime.acp.backend` 用於每個代理程式的預設值。
- 如果不存在覆蓋，則保持目前行為（`acp.backend` 預設值）。

## 當前系統中的架構適配性

### 重複使用既有元件

- `SessionBindingService` 已經支援與頻道無關的對話參照。
- ACP 生成/綁定流程已經透過服務 API 支援綁定。
- Telegram 已經透過 `MessageThreadId` 和 `chatId` 攜帶主題/執行緒上下文。

### 新增/擴充元件

- **Telegram 綁定配接器**（與 Discord 配接器並行）：
  - 為每個 Telegram 帳號註冊配接器，
  - 透過標準對話 ID 進行解析/列出/綁定/解除綁定/接觸。
- **型別化綁定解析器/索引**：
  - 將 `bindings[]` 分割為 `route` 和 `acp` 檢視，
  - 僅在 `route` 綁定上保留 `resolveAgentRoute`，
  - 僅從 `acp` 綁定解析持續性 ACP 意圖。
- **Telegram 的入站綁定解析**：
  - 在路由最終確定之前解析綁定的工作階段（Discord 已經這樣做）。
- **持續性綁定協調器**：
  - 啟動時：載入已設定的頂層 `type: "acp"` 綁定，確保 ACP 工作階段存在，確保綁定存在。
  - 設定變更時：安全地套用差異。
- **切換模型**：
  - 不讀取通道本機 ACP 綁定後援，
  - 持續性 ACP 綁定僅來自頂層 `bindings[].type="acp"` 項目。

## 分階段交付

### 階段 1：型別化綁定架構基礎

- 擴充設定架構以支援 `bindings[].type` 區別器：
  - `route`，
  - `acp` 附帶可選的 `acp` 覆寫物件（`mode`、`backend`、`cwd`、`label`）。
- 擴充代理架構與執行時期描述符以標記 ACP 原生代理（`agents.list[].runtime.type`）。
- 為路由與 ACP 綁定新增解析器/索引器分割。

### 階段 2：執行時期解析 + Discord/Telegram 同等性

- 從頂層 `type: "acp"` 項目解析持續性 ACP 綁定，針對：
  - Discord 頻道/執行緒，
  - Telegram 論壇主題（`chatId:topic:topicId` 標準 ID）。
- 實作 Telegram 綁定適配器以及與 Discord 相同的輸入綁定會話覆寫功能。
- 在此階段不要包含 Telegram 直接/私人主題變體。

### 階段 3：指令對等與重置

- 在綁定的 Telegram/Discord 對話中，對齊 `/acp`、`/new`、`/reset` 和 `/focus` 的行為。
- 確保綁定按照設定在重置流程中保持有效。

### 階段 4：強化

- 更好的診斷功能（`/acp status`、啟動協調日誌）。
- 衝突處理與健康檢查。

## 防護措施與政策

- 完全像現在一樣尊重 ACP 啟用和沙盒限制。
- 保持明確的帳戶範圍設定 (`accountId`) 以避免跨帳戶洩漏。
- 在路由不明確時採取失敗關閉（fail closed）策略。
- 根據頻道設定保持提及/存取政策的明確行為。

## 測試計畫

- 單元測試：
  - 對話 ID 正規化（特別是 Telegram 主題 ID），
  - 協調器建立/更新/刪除路徑，
  - `/acp bind --persist` 與解除綁定流程。
- 整合測試：
  - 輸入 Telegram 主題 -> 綁定 ACP 會話解析，
  - 輸入 Discord 頻道/執行緒 -> 永久綁定優先順序。
- 回歸測試：
  - 暫時綁定繼續運作，
  - 未綁定的頻道/主題保持目前路由行為。

## 未解決的問題

- Telegram 主題中的 `/acp spawn --thread auto` 是否應預設為 `here`？
- 永久綁定是否應總是在綁定對話中繞過提及閘門，或者需要明確的 `requireMention=false`？
- `/focus` 是否應新增 `--persist` 作為 `/acp bind --persist` 的別名？

## 推出

- 作為每個對話的可選功能推出（存在 `bindings[].type="acp"` 項目）。
- 從 Discord + Telegram 開始。
- 新增包含範例的文件，內容關於：
  - 「每個 Agent 一個頻道/主題」
  - 「同一個 Agent 的多個頻道/主題，具有不同的 `cwd`」
  - 「團隊命名模式（`codex-1`、`claude-repo-x`）」。
