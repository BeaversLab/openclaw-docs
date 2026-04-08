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

- 預設本地檢查：`pnpm check`
- 建置檢查：當變更可能影響建置輸出、打包或延遲載入/模組邊界時，請執行 `pnpm build`
- 針對重度 Pi 變更的完整落版檢查：`pnpm check && pnpm test`

## 執行 Pi 測試

直接使用 Vitest 執行 Pi 專屬測試組：

```bash
pnpm test \
  "src/agents/pi-*.test.ts" \
  "src/agents/pi-embedded-*.test.ts" \
  "src/agents/pi-tools*.test.ts" \
  "src/agents/pi-settings.test.ts" \
  "src/agents/pi-tool-definition-adapter*.test.ts" \
  "src/agents/pi-hooks/**/*.test.ts"
```

若要包含即時供應者練習：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test src/agents/pi-embedded-runner-extraparams.live.test.ts
```

這涵蓋了主要的 Pi 單元套件：

- `src/agents/pi-*.test.ts`
- `src/agents/pi-embedded-*.test.ts`
- `src/agents/pi-tools*.test.ts`
- `src/agents/pi-settings.test.ts`
- `src/agents/pi-tool-definition-adapter.test.ts`
- `src/agents/pi-hooks/*.test.ts`

## 手動測試

建議流程：

- 在開發模式中執行閘道：
  - `pnpm gateway:dev`
- 直接觸發代理程式：
  - `pnpm openclaw agent --message "Hello" --thinking low`
- 使用 TUI 進行互動式偵錯：
  - `pnpm tui`

針對工具呼叫行為，提示 `read` 或 `exec` 操作，以便您查看工具串流和負載處理。

## 乾淨重設

狀態位於 OpenClaw 狀態目錄下。預設為 `~/.openclaw`。如果設定了 `OPENCLAW_STATE_DIR`，則改用該目錄。

若要重設所有內容：

- `openclaw.json` 用於設定
- `agents/<agentId>/agent/auth-profiles.json` 用於模型驗證設定檔（API 金鑰 + OAuth）
- `credentials/` 用於仍位於驗證設定檔存放區外部的供應者/通道狀態
- `agents/<agentId>/sessions/` 用於代理程式工作階段記錄
- `agents/<agentId>/sessions/sessions.json` 用於工作階段索引
- `sessions/` 如果舊版路徑存在
- `workspace/` 如果您想要一個空白的工作區

如果您只想重設工作階段，請刪除該代理程式的 `agents/<agentId>/sessions/`。如果您想保留驗證，請保留 `agents/<agentId>/agent/auth-profiles.json` 和 `credentials/` 下的任何供應者狀態不變。

## 參考資料

- [測試](/en/help/testing)
- [快速入門](/en/start/getting-started)
