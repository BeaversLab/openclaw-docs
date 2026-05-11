---
summary: "Pi 整合的開發者工作流程：建置、測試與即時驗證"
title: "Pi 開發工作流程"
read_when:
  - Working on Pi integration code or tests
  - Running Pi-specific lint, typecheck, and live test flows
---

一套在 OpenClaw 中處理 Pi 整合的合理工作流程。

## 型別檢查與 Linting

- 預設本地檢查閘道：`pnpm check`
- 建置檢查閘道：當變更可能影響建置輸出、打包或延遲載入/模組邊界時執行 `pnpm build`
- 針對 Pi 大幅變更的完整落地檢查閘道：`pnpm check && pnpm test`

## 執行 Pi 測試

直接使用 Vitest 執行 Pi 專用測試集：

```bash
pnpm test \
  "src/agents/pi-*.test.ts" \
  "src/agents/pi-embedded-*.test.ts" \
  "src/agents/pi-tools*.test.ts" \
  "src/agents/pi-settings.test.ts" \
  "src/agents/pi-tool-definition-adapter*.test.ts" \
  "src/agents/pi-hooks/**/*.test.ts"
```

若要包含即時提供者練習：

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

- 以開發模式執行閘道：
  - `pnpm gateway:dev`
- 直接觸發代理程式：
  - `pnpm openclaw agent --message "Hello" --thinking low`
- 使用 TUI 進行互動式除錯：
  - `pnpm tui`

針對工具呼叫行為，提示要求執行 `read` 或 `exec` 動作，以便您查看工具串流和 Payload 處理。

## 完全重置

狀態位於 OpenClaw 狀態目錄下。預設為 `~/.openclaw`。如果設定了 `OPENCLAW_STATE_DIR`，則改用該目錄。

若要重置所有內容：

- 執行 `openclaw.json` 以重置設定
- 執行 `agents/<agentId>/agent/auth-profiles.json` 以重置模型驗證設定檔 (API 金鑰 + OAuth)
- 執行 `credentials/` 以重置仍位於驗證設定檔存放區外部的提供者/通道狀態
- 執行 `agents/<agentId>/sessions/` 以重置代理程式工作階段歷史
- 執行 `agents/<agentId>/sessions/sessions.json` 以重置工作階段索引
- 如果舊版路徑存在，執行 `sessions/`
- 如果您想要一個空白的工作區，執行 `workspace/`

如果您只想重置工作階段，請刪除該代理程式的 `agents/<agentId>/sessions/`。如果您想要保留驗證資訊，請保留 `agents/<agentId>/agent/auth-profiles.json` 以及 `credentials/` 下的任何提供者狀態。

## 參考資料

- [測試](/zh-Hant/help/testing)
- [開始使用](/zh-Hant/start/getting-started)

## 相關

- [Pi 整合架構](/zh-Hant/pi)
