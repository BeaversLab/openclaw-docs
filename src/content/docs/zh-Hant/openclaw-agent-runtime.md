---
summary: "OpenClaw agent runtime 的開發者工作流程：建置、測試與即時驗證"
title: "OpenClaw agent runtime 工作流程"
read_when:
  - Working on OpenClaw agent runtime code or tests
  - Running agent-runtime lint, typecheck, and live test flows
---

在 OpenClaw 中處理 OpenClaw agent runtime 的一個合理工作流程。

## 型別檢查與 Linting

- 預設本地檢查閘道：`pnpm check`
- 建置閘道：`pnpm build` 當變更可能影響建置輸出、打包或延遲載入/模組邊界時
- agent-runtime 變更的完整落地閘道：`pnpm check && pnpm test`

## 執行 Agent Runtime 測試

使用 Vitest 直接執行 agent-runtime 測試套件：

```bash
pnpm test \
  "src/agents/agent-*.test.ts" \
  "src/agents/embedded-agent-*.test.ts" \
  "src/agents/agent-tools*.test.ts" \
  "src/agents/agent-settings.test.ts" \
  "src/agents/agent-tool-definition-adapter*.test.ts" \
  "src/agents/agent-hooks/**/*.test.ts"
```

若要包含即時 Provider 測試：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test src/agents/embedded-agent-runner-extraparams.live.test.ts
```

這涵蓋了主要的 agent runtime 單元測試套件：

- `src/agents/agent-*.test.ts`
- `src/agents/embedded-agent-*.test.ts`
- `src/agents/agent-tools*.test.ts`
- `src/agents/agent-settings.test.ts`
- `src/agents/agent-tool-definition-adapter.test.ts`
- `src/agents/agent-hooks/*.test.ts`

## 手動測試

建議流程：

- 以開發模式執行 Gateway：
  - `pnpm gateway:dev`
- 直接觸發 Agent：
  - `pnpm openclaw agent --message "Hello" --thinking low`
- 使用 TUI 進行互動式除錯：
  - `pnpm tui`

若要測試工具呼叫行為，請提示執行 `read` 或 `exec` 動作，以便您查看工具串流和 Payload 處理。

## 完全重置

狀態存儲在 OpenClaw 狀態目錄下。預設為 `~/.openclaw`。如果設定了 `OPENCLAW_STATE_DIR`，則改用該目錄。

若要重置所有內容：

- `openclaw.json` 用於設定
- `agents/<agentId>/agent/auth-profiles.json` 用於模型驗證設定檔 (API 金鑰 + OAuth)
- `credentials/` 用於仍然存在於驗證設定檔存儲外部的 Provider/Channel 狀態
- `agents/<agentId>/sessions/` 用於 Agent 對話歷史
- `agents/<agentId>/sessions/sessions.json` 用於對話索引
- `sessions/` 如果存在舊版路徑
- `workspace/` 如果您想要一個空白的工作區

如果您只想重置對話，請刪除該 Agent 的 `agents/<agentId>/sessions/`。如果您想保留驗證資訊，請保留 `agents/<agentId>/agent/auth-profiles.json` 以及 `credentials/` 下的任何 Provider 狀態。

## 參考資料

- [測試](/zh-Hant/help/testing)
- [開始使用](/zh-Hant/start/getting-started)

## 相關

- [OpenClaw 代理運行時架構](/zh-Hant/agent-runtime-architecture)
