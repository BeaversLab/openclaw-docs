---
title: "Pi 開發工作流程"
summary: "Pi 整合的開發者工作流程：建置、測試與即時驗證"
read_when:
  - Working on Pi integration code or tests
  - Running Pi-specific lint, typecheck, and live test flows
---

# Pi 開發工作流程

本指南總結了在 OpenClaw 中處理 pi 整合的合理工作流程。

## 型別檢查與 Lint

- 型別檢查與建置：`pnpm build`
- Lint：`pnpm lint`
- 格式檢查：`pnpm format`
- 推送前的完整檢查：`pnpm lint && pnpm build && pnpm test`

## 執行 Pi 測試

直接使用 Vitest 執行 Pi 專屬的測試組：

```bash
pnpm test -- \
  "src/agents/pi-*.test.ts" \
  "src/agents/pi-embedded-*.test.ts" \
  "src/agents/pi-tools*.test.ts" \
  "src/agents/pi-settings.test.ts" \
  "src/agents/pi-tool-definition-adapter*.test.ts" \
  "src/agents/pi-hooks/**/*.test.ts"
```

若要包含即時提供者的練習：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test -- src/agents/pi-embedded-runner-extraparams.live.test.ts
```

這涵蓋了主要的 Pi 單元測試套件：

- `src/agents/pi-*.test.ts`
- `src/agents/pi-embedded-*.test.ts`
- `src/agents/pi-tools*.test.ts`
- `src/agents/pi-settings.test.ts`
- `src/agents/pi-tool-definition-adapter.test.ts`
- `src/agents/pi-hooks/*.test.ts`

## 手動測試

建議流程：

- 以開發模式執行閘道：
  - `pnpm gateway:dev`
- 直接觸發代理程式：
  - `pnpm openclaw agent --message "Hello" --thinking low`
- 使用 TUI 進行互動式除錯：
  - `pnpm tui`

針對工具呼叫行為，提示要求 `read` 或 `exec` 動作，以便您查看工具串流與負載處理。

## 完全重置

狀態儲存在 OpenClaw 狀態目錄下。預設為 `~/.openclaw`。如果設定了 `OPENCLAW_STATE_DIR`，則改用該目錄。

若要重置所有內容：

- `openclaw.json` 用於設定
- `credentials/` 用於設定檔與權杖
- `agents/<agentId>/sessions/` 用於代理程式工作階段記錄
- `agents/<agentId>/sessions.json` 用於工作階段索引
- `sessions/` 如果舊版路徑存在
- `workspace/` 如果您想要一個空白的工作區

如果您只想重置工作階段，請刪除該代理程式的 `agents/<agentId>/sessions/` 和 `agents/<agentId>/sessions.json`。如果您不想重新進行身份驗證，請保留 `credentials/`。

## 參考資料

- [測試](/en/help/testing)
- [快速入門](/en/start/getting-started)
