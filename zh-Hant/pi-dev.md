---
title: "Pi 開發工作流程"
summary: "Pi 整合的開發者工作流程：建置、測試和即時驗證"
read_when:
  - 正在處理 Pi 整合程式碼或測試
  - 執行 Pi 特定的 lint、typecheck 和即時測試流程
---

# Pi 開發工作流程

本指南總結了在 OpenClaw 中處理 pi 整合時的合理工作流程。

## 類型檢查與 Lint

- 類型檢查與建置：`pnpm build`
- Lint：`pnpm lint`
- 格式檢查：`pnpm format`
- 推送前的完整檢查流程：`pnpm lint && pnpm build && pnpm test`

## 執行 Pi 測試

使用 Vitest 直接執行 Pi 專屬的測試組：

```bash
pnpm test -- \
  "src/agents/pi-*.test.ts" \
  "src/agents/pi-embedded-*.test.ts" \
  "src/agents/pi-tools*.test.ts" \
  "src/agents/pi-settings.test.ts" \
  "src/agents/pi-tool-definition-adapter*.test.ts" \
  "src/agents/pi-extensions/**/*.test.ts"
```

若要包含即時 provider 練習：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test -- src/agents/pi-embedded-runner-extraparams.live.test.ts
```

這涵蓋了主要的 Pi 單元套件：

- `src/agents/pi-*.test.ts`
- `src/agents/pi-embedded-*.test.ts`
- `src/agents/pi-tools*.test.ts`
- `src/agents/pi-settings.test.ts`
- `src/agents/pi-tool-definition-adapter.test.ts`
- `src/agents/pi-extensions/*.test.ts`

## 手動測試

建議流程：

- 在開發模式下執行 gateway：
  - `pnpm gateway:dev`
- 直接觸發代理程式：
  - `pnpm openclaw agent --message "Hello" --thinking low`
- 使用 TUI 進行互動式除錯：
  - `pnpm tui`

對於工具呼叫行為，提示要求進行 `read` 或 `exec` 動作，這樣您就能看到工具串流和 payload 處理。

## 全新重置

狀態位於 OpenClaw 狀態目錄下。預設為 `~/.openclaw`。如果設定了 `OPENCLAW_STATE_DIR`，則改用該目錄。

若要重置所有內容：

- `openclaw.json` 用於設定
- `credentials/` 用於 auth 設定檔和 token
- `agents/<agentId>/sessions/` 用於代理程式工作階段歷史
- `agents/<agentId>/sessions.json` 用於工作階段索引
- `sessions/` 如果存在舊版路徑
- `workspace/` 如果您想要一個空白的工作區

如果您只想重置工作階段，請刪除該代理程式的 `agents/<agentId>/sessions/` 和 `agents/<agentId>/sessions.json`。如果您不想重新驗證，請保留 `credentials/`。

## 參考資料

- [測試](/zh-Hant/help/testing)
- [開始使用](/zh-Hant/start/getting-started)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
