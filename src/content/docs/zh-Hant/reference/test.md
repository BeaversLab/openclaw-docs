---
summary: "如何在本機執行測試 (vitest) 以及何時使用 force/coverage 模式"
read_when:
  - Running or fixing tests
title: "測試"
---

# 測試

- 完整測試套件（套件、即時、Docker）：[測試](/en/help/testing)

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
- `pnpm test:docker:mcp-channels`：啟動一個有種子的 Gateway 容器和一個產生 `openclaw mcp serve` 的第二個客戶端容器，然後驗證透過真實 stdio 橋接器進行的路由對話探索、逐字稿讀取、附件元資料、即時事件佇列行為、輸出傳送路由以及 Claude 風格的頻道 + 權限通知。Claude 通知斷言會直接讀取原始 stdio MCP 框架，因此此冒煙測試能反映橋接器實際發出的內容。

## 本機 PR 閘道

若要進行本機 PR 合併/閘道檢查，請執行：

- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

如果 `pnpm test` 在負載較高的主機上出現不穩定，請在將其視為回歸問題之前重新執行一次，然後使用 `pnpm vitest run <path/to/test>` 將其隔離。對於記憶體受限的主機，請使用：

- `OPENCLAW_TEST_PROFILE=low OPENCLAW_TEST_SERIAL_GATEWAY=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## 模型延遲基準測試（本地金鑰）

腳本：[`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

用法：

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- 可選環境變數：`MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`、`ANTHROPIC_API_KEY`
- 預設提示詞：「請用一個單詞回覆：ok。不要標點符號或多餘的文字。」

最近一次執行（2025-12-31，20 次執行）：

- minimax 中位數 1279ms（最小 1114，最大 2431）
- opus 中位數 2454ms（最小 1224，最大 3170）

## CLI 啟動基準測試

腳本：[`scripts/bench-cli-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-cli-startup.ts)

用法：

- `pnpm test:startup:bench`
- `pnpm test:startup:bench:smoke`
- `pnpm test:startup:bench:save`
- `pnpm test:startup:bench:update`
- `pnpm test:startup:bench:check`
- `pnpm tsx scripts/bench-cli-startup.ts`
- `pnpm tsx scripts/bench-cli-startup.ts --runs 12`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case status --case gatewayStatus --runs 3`
- `pnpm tsx scripts/bench-cli-startup.ts --entry openclaw.mjs --entry-secondary dist/entry.js --preset all`
- `pnpm tsx scripts/bench-cli-startup.ts --preset all --output .artifacts/cli-startup-bench-all.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case gatewayStatusJson --output .artifacts/cli-startup-bench-smoke.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --cpu-prof-dir .artifacts/cli-cpu`
- `pnpm tsx scripts/bench-cli-startup.ts --json`

預設：

- `startup`： `--version`, `--help`, `health`, `health --json`, `status --json`, `status`
- `real`： `health`, `status`, `status --json`, `sessions`, `sessions --json`, `agents list --json`, `gateway status`, `gateway status --json`, `gateway health --json`, `config get gateway.port`
- `all`：兩種預設

輸出包含每個指令的 `sampleCount`、平均值、p50、p95、最小/最大值、退出代碼/訊號分佈，以及最大 RSS 摘要。可選的 `--cpu-prof-dir` / `--heap-prof-dir` 會在每次執行時寫入 V8 設定檔，以便計時和設定檔擷取使用相同的程式框架。

儲存的輸出慣例：

- `pnpm test:startup:bench:smoke` 會將目標煙霧測試構件寫入 `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` 會使用 `runs=5` 和 `warmup=1` 將完整套件構件寫入 `.artifacts/cli-startup-bench-all.json`
- `pnpm test:startup:bench:update` 會使用 `runs=5` 和 `warmup=1` 重新整理已簽入的基線固定裝置 `test/fixtures/cli-startup-bench.json`

簽入的測試夾具：

- `test/fixtures/cli-startup-bench.json`
- 使用 `pnpm test:startup:bench:update` 重新整理
- 使用 `pnpm test:startup:bench:check` 將當前結果與測試夾具進行比較

## 入職端對端測試 (Docker)

Docker 是可選的；這僅用於容器化的入職冒煙測試。

在乾淨的 Linux 容器中進行完整的冷啟動流程：

```bash
scripts/e2e/onboard-docker.sh
```

此腳本透過偽終端機驅動互動式嚮導，驗證配置/工作區/會話檔案，然後啟動閘道並執行 `openclaw health`。

## QR 匯入冒煙測試 (Docker)

確保 `qrcode-terminal` 可在支援的 Docker Node 執行環境下載入 (預設為 Node 24，相容於 Node 22)：

```bash
pnpm test:docker:qr
```
