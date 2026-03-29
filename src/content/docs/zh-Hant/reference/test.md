---
summary: "如何在本機執行測試 (vitest) 以及何時使用 force/coverage 模式"
read_when:
  - Running or fixing tests
title: "測試"
---

# 測試

- 完整測試套件 (suites, live, Docker)：[測試](/en/help/testing)

- `pnpm test:force`：終止任何佔用預設控制埠的殘留 gateway 程序，然後使用隔離的 gateway 埠執行完整的 Vitest 套件，以免伺服器測試與執行中的實例衝突。當先前的 gateway 執行留下佔用 18789 埠時使用此選項。
- `pnpm test:coverage`：使用 V8 覆蓋率 (透過 `vitest.unit.config.ts`) 執行單元套件。全域閾值為 70% 的行/分支/函式/陳述式。覆蓋率排除重度整合的進入點 (CLI 接線、gateway/telegram 橋接器、webchat 靜態伺服器)，以將目標集中在可進行單元測試的邏輯上。
- `pnpm test:coverage:changed`：僅對自 `origin/main` 以來變更的檔案執行單元覆蓋率。
- `pnpm test:changed`：透過 `--changed origin/main` 執行包裝器。基礎 Vitest 設定將包裝器清單/設定檔視為 `forceRerunTriggers`，因此排程器變更仍會在需要時廣泛重新執行。
- `pnpm test`：執行完整的包裝器。它在 git 中僅保留一個小型的行為覆寫清單，然後使用簽入的計時快照將測量到最重的單元檔案剝離到專用通道。
- 單元檔案在包裝器中預設為 `threads`；請將僅限 fork 的例外記錄在 `test/fixtures/test-parallel.behavior.json` 中。
- `pnpm test:channels` 現在透過 `vitest.channels.config.ts` 預設為 `threads`；2026 年 3 月 22 日的直接完整套件控制執行通過了檢查，沒有特定通道的 fork 例外。
- `pnpm test:extensions` 透過包裝器執行，並在 `test/fixtures/test-parallel.behavior.json` 中保留記錄的擴充功能僅限 fork 例外；共用的擴充功能通道仍預設為 `threads`。
- `pnpm test:extensions`：執行擴充功能/外掛套件。
- `pnpm test:perf:imports`：為包裝器啟用 Vitest import-duration + import-breakdown 報告。
- `pnpm test:perf:imports:changed`：相同的匯入分析，但僅針對自 `origin/main` 以來變更的檔案。
- `pnpm test:perf:profile:main`：寫入 Vitest 主執行緒的 CPU 設定檔 (`.artifacts/vitest-main-profile`)。
- `pnpm test:perf:profile:runner`：寫入單元執行器的 CPU + 堆積設定檔 (`.artifacts/vitest-runner-profile`)。
- `pnpm test:perf:update-timings`：更新 `scripts/test-parallel.mjs` 使用的已提交慢速檔案計時快照。
- Gateway 整合：透過 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 選擇加入。
- `pnpm test:e2e`：執行 gateway 端到端基本測試 (多實例 WS/HTTP/node 配對)。預設為 `forks` + `vitest.e2e.config.ts` 中的自適應工作執行緒；使用 `OPENCLAW_E2E_WORKERS=<n>` 進行調整，並設定 `OPENCLAW_E2E_VERBOSE=1` 以取得詳細記錄。
- `pnpm test:live`：執行提供者即時測試 (minimax/zai)。需要 API 金鑰和 `LIVE=1` (或提供者特定的 `*_LIVE_TEST=1`) 以取消跳過。
- `pnpm test:docker:openwebui`：啟動 Docker 化的 OpenClaw + Open WebUI，透過 Open WebUI 登入，檢查 `/api/models`，然後透過 `/api/chat/completions` 執行真實的代理聊天。需要可用的即時模型金鑰 (例如 `~/.profile` 中的 OpenAI)，並會拉取外部 Open WebUI 映像檔，且不像一般的單元/e2e 測試套件那樣預期在 CI 中保持穩定。

## Local PR gate

對於本地 PR land/gate 檢查，請執行：

- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

如果 `pnpm test` 在負載較高的主機上發生不穩定，在將其視為回歸之前請重新執行一次，然後使用 `pnpm vitest run <path/to/test>` 進行隔離。對於記憶體受限的主機，請使用：

- `OPENCLAW_TEST_PROFILE=low OPENCLAW_TEST_SERIAL_GATEWAY=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE=0 pnpm test:changed`

## Model latency bench (local keys)

腳本：[`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

用法：

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- 可選環境變數：`MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`, `ANTHROPIC_API_KEY`
- 預設提示詞：「請用單字回覆：ok。不要標點符號或多餘文字。」

最近一次執行 (2025-12-31，20 次執行)：

- minimax 中位數 1279ms (最小 1114, 最大 2431)
- opus 中位數 2454ms (最小 1224, 最大 3170)

## CLI 啟動基準測試

腳本：[`scripts/bench-cli-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-cli-startup.ts)

用法：

- `pnpm tsx scripts/bench-cli-startup.ts`
- `pnpm tsx scripts/bench-cli-startup.ts --runs 12`
- `pnpm tsx scripts/bench-cli-startup.ts --entry dist/entry.js --timeout-ms 45000`

此基準測試對以下指令進行測試：

- `--version`
- `--help`
- `health --json`
- `status --json`
- `status`

輸出包含每個指令的平均值、p50、p95、最小/最大值，以及退出代碼/訊號分佈。

## 入門 E2E 測試 (Docker)

Docker 是可選的；這僅需要用於容器化的入門冒煙測試。

在乾淨的 Linux 容器中進行完整的冷啟動流程：

```bash
scripts/e2e/onboard-docker.sh
```

此腳本透過虛擬終端機驅動互動式精靈，驗證設定/工作區/會議檔案，然後啟動閘道並執行 `openclaw health`。

## QR 匯入冒煙測試 (Docker)

確保 `qrcode-terminal` 在支援的 Docker Node 執行環境下載入 (Node 24 預設，Node 22 相容)：

```bash
pnpm test:docker:qr
```
