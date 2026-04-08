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
- `pnpm test:changed`：使用 `--changed origin/main` 執行原生的 Vitest 專案設定。基礎設定將專案/設定檔視為 `forceRerunTriggers`，因此在需要時，接線變更仍會廣泛地重新執行。
- `pnpm test`：直接執行原生的 Vitest 根專案設定。檔案過濾器可在設定的專案之間原生運作。
- 基礎 Vitest 設定現在預設為 `pool: "threads"` 和 `isolate: false`，並且在所有 repo 設定中啟用了共享的非隔離執行器。
- `pnpm test:channels` 執行 `vitest.channels.config.ts`。
- `pnpm test:extensions` 執行 `vitest.extensions.config.ts`。
- `pnpm test:extensions`：執行擴充功能/外掛程式套件。
- `pnpm test:perf:imports`：針對原生根專案執行啟用 Vitest import-duration + import-breakdown 報告。
- `pnpm test:perf:imports:changed`：相同的 import 分析，但僅針對自 `origin/main` 以來變更的檔案。
- `pnpm test:perf:profile:main`：為 Vitest 主執行緒撰寫 CPU 設定檔 (`.artifacts/vitest-main-profile`)。
- `pnpm test:perf:profile:runner`：為 unit runner 撰寫 CPU + heap 設定檔 (`.artifacts/vitest-runner-profile`)。
- Gateway 整合：透過 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 加入。
- `pnpm test:e2e`：執行 gateway 端對端 煙霧測試（多實例 WS/HTTP/node 配對）。預設為 `threads` + `isolate: false`，並在 `vitest.e2e.config.ts` 中使用自適應 worker；使用 `OPENCLAW_E2E_WORKERS=<n>` 進行調整，並設定 `OPENCLAW_E2E_VERBOSE=1` 以取得詳細記錄。
- `pnpm test:live`：執行提供者即時測試 (minimax/zai)。需要 API 金鑰和 `LIVE=1` (或提供者特定的 `*_LIVE_TEST=1`) 以取消跳過。
- `pnpm test:docker:openwebui`：啟動 Docker 化的 OpenClaw + Open WebUI，透過 Open WebUI 登入，檢查 `/api/models`，然後透過 `/api/chat/completions` 執行真實的代理聊天。需要可用的即時模型金鑰（例如 `~/.profile` 中的 OpenAI），會拉取外部 Open WebUI 映像檔，且不像一般單元/e2e 測試套件那樣預期在 CI 中穩定。
- `pnpm test:docker:mcp-channels`：啟動一個有種子的 Gateway 容器和第二個生成 `openclaw mcp serve` 的客戶端容器，然後透過真實的 stdio 橋接器驗證路由對話發現、逐字稿讀取、附件元資料、即時事件佇列行為、 outbound 傳送路由，以及 Claude 風格的通道 + 權限通知。Claude 通知斷言會直接讀取原始 stdio MCP 幀，因此此冒煙測試能反映橋接器實際發出的內容。

## Local PR gate

若要在本地進行 PR land/gate 檢查，請執行：

- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

如果 `pnpm test` 在負載較重的主機上不穩定，請在將其視為回歸問題前重新執行一次，然後使用 `pnpm test <path/to/test>` 進行隔離。對於記憶受限的主機，請使用：

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## Model latency bench (local keys)

腳本：[`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

用法：

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- 可選環境變數：`MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`、`ANTHROPIC_API_KEY`
- 預設提示詞：「Reply with a single word: ok. No punctuation or extra text.」

上次執行 (2025-12-31，20 次執行)：

- minimax 中位數 1279ms (最小 1114，最大 2431)
- opus 中位數 2454ms (最小 1224，最大 3170)

## CLI startup bench

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

預設集：

- `startup`: `--version`, `--help`, `health`, `health --json`, `status --json`, `status`
- `real`: `health`, `status`, `status --json`, `sessions`, `sessions --json`, `agents list --json`, `gateway status`, `gateway status --json`, `gateway health --json`, `config get gateway.port`
- `all`: 兩個預設集

輸出包含每個指令的 `sampleCount`、平均、p50、p95、最小/最大值、退出代碼/訊號分佈以及最大 RSS 摘要。可選的 `--cpu-prof-dir` / `--heap-prof-dir` 會在每次執行時寫入 V8 profile，使計時和 profile 擷取使用相同的測試工具。

已儲存輸出的慣例：

- `pnpm test:startup:bench:smoke` 會將目標 smoke artifact 寫入 `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` 會使用 `runs=5` 和 `warmup=1` 將完整套件的 artifact 寫入 `.artifacts/cli-startup-bench-all.json`
- `pnpm test:startup:bench:update` 會使用 `runs=5` 和 `warmup=1` 重新整理簽入的基線 fixture `test/fixtures/cli-startup-bench.json`

簽入的 fixture：

- `test/fixtures/cli-startup-bench.json`
- 使用 `pnpm test:startup:bench:update` 重新整理
- 使用 `pnpm test:startup:bench:check` 將目前結果與 fixture 進行比較

## Onboarding E2E (Docker)

Docker 是可選的；這僅需要用於容器化的 onboarding smoke 測試。

在乾淨的 Linux 容器中執行完整的冷啟動流程：

```bash
scripts/e2e/onboard-docker.sh
```

此腳本透過 pseudo-tty 驅動互動式精靈，驗證設定/工作區/工作階段檔案，然後啟動 gateway 並執行 `openclaw health`。

## QR import smoke (Docker)

確保 `qrcode-terminal` 能在支援的 Docker Node 執行環境下載入（預設 Node 24，相容 Node 22）：

```bash
pnpm test:docker:qr
```
