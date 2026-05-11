---
summary: "用於確定性 OpenClaw QA 場景的合成 Slack 類通道外掛程式"
title: "QA 通道"
read_when:
  - You are wiring the synthetic QA transport into a local or CI test run
  - You need the bundled qa-channel config surface
  - You are iterating on end-to-end QA automation
---

`qa-channel` 是一個內建的合成訊息傳輸，用於自動化 OpenClaw QA。它不是生產通道 — 其存在目的是為了演練真實傳輸所使用的相同通道外掛程式邊界，同時保持狀態的確定性和完全可檢查性。

## 功能

- Slack 類目標語法：
  - `dm:<user>`
  - `channel:<room>`
  - `thread:<room>/<thread>`
- 基於 HTTP 的合成匯流排，用於傳入訊息注入、傳出逐字稿擷取、執行緒建立、反應、編輯、刪除以及搜尋/讀取動作。
- 主機端自我檢查執行器，會將 Markdown 報告寫入 `.artifacts/qa-e2e/`。

## 設定

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

- `enabled` — 此帳戶的主總開關。
- `name` — 選用顯示標籤。
- `baseUrl` — 合成匯流排 URL。
- `botUserId` — 在目標語法中使用的 Matrix 樣式機器人使用者 ID。
- `botDisplayName` — 傳出訊息的顯示名稱。
- `pollTimeoutMs` — 長輪詢等待視窗。介於 100 到 30000 之間的整數。
- `allowFrom` — 寄件者允許清單 (使用者 ID 或 `"*"`)。
- `defaultTo` — 未提供時的後備目標。
- `actions.messages` / `actions.reactions` / `actions.search` / `actions.threads` — 依動作的工具控管。

頂層的多帳戶金鑰：

- `accounts` — 依帳戶 ID 索引的命名依帳戶覆寫記錄。
- `defaultAccount` — 設定多個帳戶時的偏好帳戶 ID。

## 執行器

主機端自我檢查 (會在 `.artifacts/qa-e2e/` 下寫入 Markdown 報告)：

```bash
pnpm qa:e2e
```

這會透過 `qa-lab` 路由，啟動存放庫內的 QA 匯流排，啟動內建的 `qa-channel` 執行時區段，並執行確定性自我檢查。

完整的存放庫支援場景套件：

```bash
pnpm openclaw qa suite
```

針對 QA 閘道通道並行執行情境。請參閱 [QA 概觀](/zh-Hant/concepts/qa-e2e-automation) 以了解情境、設定檔和提供者模式。

Docker 支援的 QA 網站（閘道 + QA Lab 偵錯工具 UI 位於同一堆疊中）：

```bash
pnpm qa:lab:up
```

建置 QA 網站，啟動 Docker 支援的閘道與 QA Lab 堆疊，並列印 QA Lab URL。之後您可以選擇情境、選擇模型通道、啟動個別執行並即時觀看結果。QA Lab 偵錯工具與出貨的 Control UI 套件是分開的。

## 相關

- [QA 概觀](/zh-Hant/concepts/qa-e2e-automation) — 整體堆疊、傳輸配接器、情境撰寫
- [Matrix QA](/zh-Hant/concepts/qa-matrix) — 驅動真實通道的即時傳輸執行器範例
- [配對](/zh-Hant/channels/pairing)
- [群組](/zh-Hant/channels/groups)
- [通道概觀](/zh-Hant/channels)
