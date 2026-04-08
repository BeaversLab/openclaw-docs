---
title: "QA 頻道"
summary: "用於確定性 OpenClaw QA 場景的內建合成 Slack 類別頻道外掛程式"
read_when:
  - You are wiring the synthetic QA transport into a local or CI test run
  - You need the bundled qa-channel config surface
  - You are iterating on end-to-end QA automation
---

# QA 頻道

`qa-channel` 是一個內建的合成訊息傳輸，用於自動化 OpenClaw QA。

它不是生產環境的頻道。它的存在是為了測試真實傳輸所使用的相同頻道外掛程式邊界，同時保持狀態的確定性且完全可檢查。

## 目前的功能

- Slack 類別目標語法：
  - `dm:<user>`
  - `channel:<room>`
  - `thread:<room>/<thread>`
- 基於 HTTP 的合成匯流排，用於：
  - inbound message injection
  - outbound transcript capture
  - thread creation
  - reactions
  - edits
  - deletes
  - search and read actions
- 內建的 Host 端自我檢查執行器，會產生 Markdown 報告

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

支援的帳戶金鑰：

- `baseUrl`
- `botUserId`
- `botDisplayName`
- `pollTimeoutMs`
- `allowFrom`
- `defaultTo`
- `actions.messages`
- `actions.reactions`
- `actions.search`
- `actions.threads`

## 執行器

目前的垂直切片：

```bash
pnpm qa:e2e
```

現在透過內建的 `qa-lab` 擴充功能進行路由。它會啟動程式庫內的
QA 匯流排、啟動內建的 `qa-channel` 執行時切片、執行確定性
的自我檢查，並將 Markdown 報告寫入 `.artifacts/qa-e2e/`。

私人偵錯工具 UI：

```bash
pnpm qa:lab:build
pnpm openclaw qa ui
```

完整的程式庫支援 QA 套件：

```bash
pnpm openclaw qa suite
```

這會在本機 URL 啟動私人 QA 偵錯工具，與已出貨的 Control UI 套件分開。

## 範圍

目前的範圍有意保持狹窄：

- bus + plugin transport
- threaded routing grammar
- channel-owned message actions
- Markdown reporting

後續工作將會加入：

- Dockerized OpenClaw orchestration
- provider/model matrix execution
- richer scenario discovery
- 稍後的 OpenClaw 原生協調
