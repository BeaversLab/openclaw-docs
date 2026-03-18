# Discord 頻道與 Telegram 主題的 ACP 永久綁定

狀態：草案

## 摘要

引入永久 ACP 綁定，以映射：

- Discord 頻道（以及必要的現有執行緒），以及
- 群組/超級群組中的 Telegram 論壇主題 (`chatId:topic:topicId`)

至長期存活的 ACP 工作階段，並將綁定狀態儲存在使用明確綁定類型的頂層 `bindings[]` 項目中。

這使得 ACP 在高流量訊息頻道中的使用具有可預測性和持久性，因此使用者可以建立專用的頻道/主題，例如 `codex`、`claude-1` 或 `claude-myrepo`。

## 原因

目前的執行緒綁定 ACP 行為已針對暫時性的 Discord 執行緒工作流程進行最佳化。Telegram 並沒有相同的執行緒模型；它在群組/超級群組中擁有論壇主題。使用者希望在聊天介面上擁有穩定、永遠開啟的 ACP「工作區」，而不僅僅是暫時的執行緒工作階段。

## 目標

- 支援以下項目的持久 ACP 綁定：
  - Discord 頻道/執行緒
  - Telegram 論壇主題（群組/超級群組）
- 讓綁定的唯一事實來源由設定驅動。
- 保持 `/acp`、`/new`、`/reset`、`/focus` 和遞送行為在 Discord 與 Telegram 之間的一致性。
- 保留現有的暫時綁定流程，以供臨時使用。

## 非目標

- 完全重新設計 ACP 執行時/工作階段內部機制。
- 移除現有的暫時綁定流程。
- 在第一個反覆運算中擴展到每個頻道。
- 在此階段實作 Telegram 頻道直接訊息主題 (`direct_messages_topic_id`)。
- 在此階段實作 Telegram 私人聊天主題變體。

## UX 方向

### 1) 兩種綁定類型

- **永久綁定**：儲存在設定中，在啟動時進行協調，用於「具名工作區」頻道/主題。
- **暫時綁定**：僅限執行時，根據閒置/最長存活時間原則過期。

### 2) 指令行為

- `/acp spawn ... --thread here|auto|off` 保持可用。
- 新增明確的綁定生命週期控制：
  - `/acp bind [session|agent] [--persist]`
  - `/acp unbind [--persist]`
  - `/acp status` 包含綁定是 `persistent` 還是 `temporary`。
- 在綁定的對話中，`/new` 和 `/reset` 會就地重設綁定的 ACP 會話，並保持綁定狀態。

### 3) 對話身分

- 使用規範對話 ID：
  - Discord：頻道/執行緒 ID。
  - Telegram 主題：`chatId:topic:topicId`。
- 切勿僅使用裸露的主題 ID 作為 Telegram 綁定的鍵值。

## 設定模型 (建議)

在頂層 `bindings[]` 中統一路由和持久化 ACP 綁定設定，並使用明確的 `type` 區分標識：

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

### 最小範例 (無個別綁定 ACP 覆蓋)

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
  - `route`：一般代理程式路由。
  - `acp`：針對相符對話的持久化 ACP 綁線綁定。
- 對於 `type: "acp"`，`match.peer.id` 是規範對話鍵值：
  - Discord 頻道/執行緒：原始頻道/執行緒 ID。
  - Telegram 主題：`chatId:topic:topicId`。
- `bindings[].acp.backend` 是選用的。後端後援順序：
  1. `bindings[].acp.backend`
  2. `agents.list[].runtime.acp.backend`
  3. 全域 `acp.backend`
- `mode`、`cwd` 和 `label` 遵循相同的覆蓋模式 (`binding override -> agent runtime default -> global/default behavior`)。
- 保留現有的 `session.threadBindings.*` 和 `channels.discord.threadBindings.*` 用於暫時性綁定原則。
- 持久化條目宣告期望的狀態；執行時協調至實際的 ACP 會話/綁定。
- 每個對話節點一個作用中的 ACP 綁定是預期的模型。
- 向後相容性：遺失的 `type` 在舊版條目中會被解讀為 `route`。

### 後端選擇

- ACP 會話初始化在產生期間已使用設定的後端選擇 (目前的 `acp.backend`)。
- 此提議擴充了產生/協調邏輯，以優先使用具類型的 ACP 綁定覆蓋：
  - `bindings[].acp.backend` 用於對話本機覆蓋。
  - `agents.list[].runtime.acp.backend` 用於每個代理程式的預設值。
- 如果不存在覆蓋，則保持目前的行為 (`acp.backend` 預設)。

## 在當前系統中的架構適配性

### 重複使用現有元件

- `SessionBindingService` 已經支援與通道無關的對話參照。
- ACP spawn/bind 流程已經支援透過服務 API 進行綁定。
- Telegram 已經透過 `MessageThreadId` 和 `chatId` 攜帶主題/執行緒上下文。

### 新增/擴充元件

- **Telegram 綁定介面卡**（與 Discord 介面卡平行）：
  - 針對每個 Telegram 帳戶註冊介面卡，
  - 透過標準對話 ID 進行解析/列出/綁定/解除綁定/觸控。
- **類型化綁定解析器/索引**：
  - 將 `bindings[]` 拆分為 `route` 和 `acp` 檢視，
  - 僅在 `route` 綁定上保留 `resolveAgentRoute`，
  - 僅從 `acp` 綁定解析持久 ACP 意圖。
- **Telegram 的入站綁定解析**：
  - 在路由完成前解析綁定的階段（Discord 已經這樣做）。
- **持久綁定協調器**：
  - 啟動時：載入已配置的頂層 `type: "acp"` 綁定，確保 ACP 階段存在，確保綁定存在。
  - 配置變更時：安全套用變更。
- **切換模型**：
  - 不讀取通道本地的 ACP 綁定後備，
  - 持久 ACP 綁定僅來自頂層 `bindings[].type="acp"` 項目。

## 分階段交付

### 階段 1：類型化綁定架構基礎

- 擴充配置架構以支援 `bindings[].type` 區分器：
  - `route`，
  - `acp` 搭配選用 `acp` 覆寫物件（`mode`、`backend`、`cwd`、`label`）。
- 擴充代理架構，新增執行時描述符以標記 ACP 原生代理（`agents.list[].runtime.type`）。
- 新增路由與 ACP 綁定的解析器/索引器分割。

### 階段 2：執行時解析 + Discord/Telegram 同等性

- 從頂層 `type: "acp"` 項目解析持久 ACP 綁定，用於：
  - Discord 頻道/執行緒，
  - Telegram 論壇主題（`chatId:topic:topicId` 標準 ID）。
- 實作 Telegram 綁定配接器，以及與 Discord 相同的輸入綁定會話覆寫功能。
- 此階段不包含 Telegram 直接/私人主題變體。

### 階段 3：指令一致性與重設

- 在綁定的 Telegram/Discord 對話中，統一 `/acp`、`/new`、`/reset` 和 `/focus` 的行為。
- 確保綁定在重設流程中依設定保持有效。

### 階段 4：強化

- 更完善的診斷功能 (`/acp status`，啟動對帳日誌)。
- 衝突處理與健康檢查。

## 防護措施與政策

- 完全遵循目前的 ACP 啟用和沙箱限制。
- 保持明確的帳號範圍 (`accountId`)，以避免跨帳號滲透。
- 在路由不明確時採取封閉式失敗處理。
- 根據頻道設定，保持提及/存取政策的行為明確。

## 測試計畫

- 單元測試：
  - 對話 ID 標準化 (特別是 Telegram 主題 ID)，
  - 協調器 (reconciler) 的建立/更新/刪除路徑，
  - `/acp bind --persist` 與解除綁定流程。
- 整合測試：
  - 輸入 Telegram 主題 -> 綁定 ACP 會議解析，
  - 輸入 Discord 頻道/執行緒 -> 持續性綁定優先順序。
- 迴歸測試：
  - 暫時性綁定繼續正常運作，
  - 未綁定的頻道/主題保持目前的路由行為。

## 待解決問題

- Telegram 主題中的 `/acp spawn --thread auto` 應預設為 `here` 嗎？
- 持續性綁定是否應一律在綁定對話中略過提及閘門，還是需要明確設定 `requireMention=false`？
- `/focus` 應增加 `--persist` 作為 `/acp bind --persist` 的別名嗎？

## 推出

- 作為每個對話的選用功能推出 (`bindings[].type="acp"` 項目存在)。
- 先從 Discord + Telegram 開始。
- 加入包含範例的文件，內容涵蓋：
  - 「單一頻道/主題對應單一代理程式」
  - 「同一代理程式對應多個頻道/主題，且具有不同的 `cwd`」
  - 「團隊命名模式 (`codex-1`, `claude-repo-x`)」。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
