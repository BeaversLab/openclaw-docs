---
summary: "如何在本機執行測試 (vitest) 以及何時使用 force/coverage 模式"
read_when:
  - Running or fixing tests
title: "測試"
---

# 測試

- 完整的測試套件（套件、live、Docker）：[測試](/zh-Hant/help/testing)

- `pnpm test:force`：終止任何佔用預設控制埠的殘留 gateway 程序，然後使用隔離的 gateway 埠執行完整的 Vitest 套件，以免伺服器測試與執行中的實例衝突。當先前的 gateway 執行留下佔用 18789 埠時使用此選項。
- `pnpm test:coverage`：使用 V8 覆蓋率（透過 `vitest.unit.config.ts`）執行單元套件。這是一個已載入檔案的單元覆蓋率閘門，而非整個 repo 的所有檔案覆蓋率。閾值為 70% 的行/函式/陳述式和 55% 的分支。由於 `coverage.all` 為 false，該閘門測量的是由單元覆蓋率套件載入的檔案，而不是將每個 split-lane 原始檔案視為未覆蓋。
- `pnpm test:coverage:changed`：僅針對自 `origin/main` 以來變更的檔案執行單元覆蓋率。
- `pnpm test:changed`：當差異僅涉及可路由的原始碼/測試檔案時，將變更的 git 路徑擴展為範圍化的 Vitest 通道。配置/設定變更仍然會回退到原生的根專案執行，因此在需要時會廣泛地重新執行接線編輯。
- `pnpm changed:lanes`：顯示針對 `origin/main` 的差異所觸發的架構通道。
- `pnpm check:changed`：針對與 `origin/main` 的差異執行智慧變更閘道。它使用核心測試通道執行核心工作，使用擴充功能測試通道執行擴充功能工作，使用測試型別檢查/僅測試來執行僅測試工作，將公開的 Plugin SDK 或 plugin-contract 變更擴展到擴充功能驗證，並將僅發行中繼資料的版本升級保留在目標版本/配置/根相依性檢查上。
- `pnpm test`：透過範圍化的 Vitest 通道路由明確的檔案/目錄目標。無目標的執行使用固定的分片組並擴展至葉配置以進行本機並行執行；擴充功能組總是擴展至個別擴充功能的分片配置，而不是一個巨大的根專案程序。
- 完整和擴充功能分片執行會更新 `.artifacts/vitest-shard-timings.json` 中的本機計時資料；後續執行會使用這些計時來平衡慢速和快速的分片。設定 `OPENCLAW_TEST_PROJECTS_TIMINGS=0` 以忽略本機計時產出。
- 選取的 `plugin-sdk` 和 `commands` 測試檔案現在會透過專用的輕量級通道路由，該通道僅保留 `test/setup.ts`，將執行時間長的案例留在其現有通道上。
- 選定的 `plugin-sdk` 和 `commands` helper 源碼檔案也會將 `pnpm test:changed` 對應到那些輕量級通道中的明確兄弟測試，因此對 helper 的小幅編輯可避免重新執行繁重的運行時支援測試套件。
- `auto-reply` 現在也會分割為三個專用配置（`core`、`top-level`、`reply`），以便回覆套件不會主導較輕量的頂層狀態/token/helper 測試。
- 基礎 Vitest 配置現在預設為 `pool: "threads"` 和 `isolate: false`，並在所有 repo 配置中啟用了共享的非隔離執行器。
- `pnpm test:channels` 執行 `vitest.channels.config.ts`。
- `pnpm test:extensions` 和 `pnpm test extensions` 執行所有 extension/plugin 分片。繁重的通道擴充功能和 OpenAI 作為專用分片執行；其他擴充功能群組保持批次處理。請使用 `pnpm test extensions/<id>` 進行單一捆綁的 plugin 通道。
- `pnpm test:perf:imports`：啟用 Vitest import-duration + import-breakdown 報告，同時仍針對明確的檔案/目錄目標使用範圍通道路由。
- `pnpm test:perf:imports:changed`：相同的 import 分析，但僅針對自 `origin/main` 以來變更的檔案。
- `pnpm test:perf:changed:bench -- --ref <git-ref>` 會針對相同的已提交 git diff，將路由的變更模式路徑與原生根專案執行進行基準測試。
- `pnpm test:perf:changed:bench -- --worktree` 會在無需先提交的情況下，對當前工作樹變更集進行基準測試。
- `pnpm test:perf:profile:main`：寫入 Vitest 主執行緒（`.artifacts/vitest-main-profile`）的 CPU profile。
- `pnpm test:perf:profile:runner`：寫入單元執行器（`.artifacts/vitest-runner-profile`）的 CPU + heap profiles。
- Gateway 整合：透過 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 選擇加入。
- `pnpm test:e2e`：執行 gateway 端到端冒煙測試（多實例 WS/HTTP/node 配對）。預設為 `threads` + `isolate: false`，並在 `vitest.e2e.config.ts` 中使用自適應工作程序；使用 `OPENCLAW_E2E_WORKERS=<n>` 進行調整，並設定 `OPENCLAW_E2E_VERBOSE=1` 以取得詳細日誌。
- `pnpm test:live`：執行 provider 即時測試（minimax/zai）。需要 API 金鑰和 `LIVE=1`（或 provider 特定的 `*_LIVE_TEST=1`）以取消跳過。
- `pnpm test:docker:openwebui`：啟動 Docker 化的 OpenClaw + Open WebUI，透過 Open WebUI 登入，檢查 `/api/models`，然後透過 `/api/chat/completions` 執行真實的代理聊天。需要可用的即時模型金鑰（例如 `~/.profile` 中的 OpenAI），會拉取外部 Open WebUI 映像檔，且不像一般單元/e2e 測試套件那樣預期在 CI 中穩定。
- `pnpm test:docker:mcp-channels`：啟動一個已植入種子的 Gateway 容器和一個產生 `openclaw mcp serve` 的第二個客戶端容器，然後透過真實的 stdio 橋接器驗證路由的對話發現、紀錄讀取、附件中繼資料、即時事件佇列行為、輸出傳送路由，以及 Claude 風格的通道 + 權限通知。Claude 通知斷言會直接讀取原始 stdio MCP 幀，因此冒煙測試反映了橋接器實際發出的內容。

## Local PR gate

若要進行本機 PR land/gate 檢查，請執行：

- `pnpm check:changed`
- `pnpm check`
- `pnpm check:test-types`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

如果 `pnpm test` 在負載較高的主機上不穩定，請先重新執行一次，再將其視為回歸問題，然後使用 `pnpm test <path/to/test>` 進行隔離。對於記憶體受限的主機，請使用：

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## Model latency bench (local keys)

腳本：[`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

用法：

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- 選用環境變數：`MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`、`ANTHROPIC_API_KEY`
- 預設提示詞：「回覆單一字詞：ok。請勿使用標點符號或額外文字。」

最近一次執行（2025-12-31，20 次執行）：

- minimax 中位數 1279ms（最小值 1114，最大值 2431）
- opus 中位數 2454ms（最小值 1224，最大值 3170）

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

- `startup`: `--version`、`--help`、`health`、`health --json`、`status --json`、`status`
- `real`: `health`、`status`、`status --json`、`sessions`、`sessions --json`、`agents list --json`、`gateway status`、`gateway status --json`、`gateway health --json`、`config get gateway.port`
- `all`: 兩種預設

輸出包含每個指令的 `sampleCount`、平均值、p50、p95、最小/最大值、退出代碼/訊號分佈以及最大 RSS 摘要。選用的 `--cpu-prof-dir` / `--heap-prof-dir` 會在每次執行時寫入 V8 設定檔，以便計時與設定檔擷取使用相同的測試程式。

已儲存的輸出慣例：

- `pnpm test:startup:bench:smoke` 會在 `.artifacts/cli-startup-bench-smoke.json` 寫入目標的 smoke 製作成品
- `pnpm test:startup:bench:save` 會使用 `runs=5` 和 `warmup=1` 將完整套件的構件寫入 `.artifacts/cli-startup-bench-all.json`
- `pnpm test:startup:bench:update` 使用 `runs=5` 和 `warmup=1` 重新整理 `test/fixtures/cli-startup-bench.json` 中簽入的 baseline fixture

簽入的 fixture：

- `test/fixtures/cli-startup-bench.json`
- 使用 `pnpm test:startup:bench:update` 重新整理
- 使用 `pnpm test:startup:bench:check` 將目前結果與 fixture 進行比較

## Onboarding E2E (Docker)

Docker 是可選的；這僅在需要容器化入門測試時才需要。

在乾淨的 Linux 容器中進行完整的冷啟動流程：

```bash
scripts/e2e/onboard-docker.sh
```

此指令碼透過偽終端機驅動互動式精靈，驗證 config/workspace/session 檔案，然後啟動 gateway 並執行 `openclaw health`。

## QR import smoke (Docker)

確保 `qrcode-terminal` 在支援的 Docker Node 執行環境下載入（預設為 Node 24，相容於 Node 22）：

```bash
pnpm test:docker:qr
```
