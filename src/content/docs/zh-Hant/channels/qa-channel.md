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
pnpm qa:lab:up
```

這個單一命令會建置 QA 網站、啟動基於 Docker 的 gateway + QA Lab 堆疊，並列印 QA Lab URL。從該網站，您可以選擇場景、選擇模型通道、啟動個別執行，並即時觀看結果。

完整的 repo-backed QA 套件：

```bash
pnpm openclaw qa suite
```

這會在本機 URL 啟動私有的 QA 除錯器，與隨附的 Control UI bundle 分開。

## 範圍

目前的範圍刻意保持狹窄：

- bus + plugin transport
- threaded routing grammar
- channel-owned message actions
- Markdown reporting
- Docker-backed QA site with run controls

後續工作將新增：

- provider/model matrix execution
- richer scenario discovery
- OpenClaw-native orchestration later
