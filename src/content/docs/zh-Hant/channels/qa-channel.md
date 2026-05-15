---
summary: "用於確定性 OpenClaw QA 場景的合成 Slack 類通道外掛程式"
title: "QA 通道"
read_when:
  - You are wiring the synthetic QA transport into a local or CI test run
  - You need the bundled qa-channel config surface
  - You are iterating on end-to-end QA automation
---

`qa-channel` 是一個內建的綜合訊息傳輸層，用於自動化 OpenClaw QA。它不是生產環境的頻道——它的存在是為了在使用真實傳輸層所使用的相同頻道外掛邊界時，保持狀態確定性且完全可檢查。

## 功能

- Slack 類目標語法：
  - `dm:<user>`
  - `channel:<room>`
  - `group:<room>`
  - `thread:<room>/<thread>`
- 共享的 `channel:` 和 `group:` 對話會以群組/頻道房間輪次的形式呈現給代理，因此它們會使用與 Discord、Slack、Telegram 及類似傳輸層相同的可見回覆和訊息工具路由策略。
- 基於 HTTP 的綜合匯流排，用於入站訊息注入、出站記錄捕獲、執行緒建立、反應、編輯、刪除以及搜尋/讀取操作。
- 主機端自我檢查執行器，會將 Markdown 報告寫入 `.artifacts/qa-e2e/`。

## 配置

```json
{
  "channels": {
    "qa-channel": {
      "baseUrl": "http://127.0.0.1:43123",
      "botUserId": "openclaw",
      "botDisplayName": "OpenClaw QA",
      "allowFrom": ["*"],
      "pollTimeoutMs": 1000
    }
  }
}
```

帳戶金鑰：

- `enabled` - 此帳戶的主開關。
- `name` - 可選的顯示標籤。
- `baseUrl` - 綜合匯流排 URL。
- `botUserId` - 用於目標語法的 Matrix 風格機器人使用者 ID。
- `botDisplayName` - 出站訊息的顯示名稱。
- `pollTimeoutMs` - 長輪詢等待視窗。介於 100 到 30000 之間的整數。
- `allowFrom` - 發送者允許名單 (使用者 ID 或 `"*"`)。私人訊息和
  允許名單群組策略都使用這些綜合發送者 ID。
- `groupPolicy` - 共用房間策略：`"open"` (預設)、`"allowlist"` 或
  `"disabled"`。
- `groupAllowFrom` - 可選的共用房間發送者允許名單。當在
  `"allowlist"` 下省略時，QA 頻道會回退至 `allowFrom`。
- `groups.<room>.requireMention` - 在特定群組/頻道房間中回覆前要求機器人提及。`groups."*"` 設定預設值。
- `defaultTo` - 未提供目標時的回退目標。
- `actions.messages` / `actions.reactions` / `actions.search` / `actions.threads` - 每個動作的工具閘道。

頂層的多帳號金鑰：

- `accounts` - 以帳號 ID 為鍵的命名每個帳號覆寫記錄。
- `defaultAccount` - 當配置了多個帳號時的首選帳號 ID。

## 執行器

主機端自我檢查（在 `.artifacts/qa-e2e/` 下寫入 Markdown 報告）：

```bash
pnpm qa:e2e
```

這會透過 `qa-lab` 路由，啟動倉庫內的 QA 匯流排，引導捆綁的 `qa-channel` 執行時區段，並執行確定性自我檢查。

完整的倉庫支援場景套件：

```bash
pnpm openclaw qa suite
```

針對 QA 閘道通道並行執行場景。請參閱 [QA 概述](/zh-Hant/concepts/qa-e2e-automation) 以了解場景、設定檔和提供者模式。

Docker 支援的 QA 網站（單一堆疊中的閘道 + QA Lab 偵錯工具 UI）：

```bash
pnpm qa:lab:up
```

建構 QA 網站，啟動 Docker 支援的閘道 + QA Lab 堆疊，並列印 QA Lab URL。您可以從那裡選擇場景、選擇模型通道、啟動個別執行並即時觀看結果。QA Lab 偵錯工具與出貨的 Control UI 捆綁包是分開的。

## 相關

- [QA 概述](/zh-Hant/concepts/qa-e2e-automation) - 整體堆疊、傳輸配接器、場景撰寫
- [Matrix QA](/zh-Hant/concepts/qa-matrix) - 驅動真實通道的即時傳輸執行器範例
- [配對](/zh-Hant/channels/pairing)
- [群組](/zh-Hant/channels/groups)
- [通道概述](/zh-Hant/channels)
