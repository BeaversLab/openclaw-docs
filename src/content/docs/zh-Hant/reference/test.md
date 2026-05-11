---
summary: "如何在本機執行測試（vitest）以及何時使用 force/coverage 模式"
read_when:
  - Running or fixing tests
title: "測試"
---

- 完整測試套件（套件、即時、Docker）：[測試](/zh-Hant/help/testing)

- `pnpm test:force`：終止任何佔用預設控制埠的殘留 gateway 進程，然後使用獨立的 gateway 埠執行完整的 Vitest 套件，以免伺服器測試與正在執行的實例發生衝突。當先前的 gateway 執行佔用了 18789 埠時，請使用此指令。
- `pnpm test:coverage`：使用 V8 覆蓋率（透過 `vitest.unit.config.ts`）執行單元套件。這是一個針對已載入檔案的單元覆蓋率閘道，而非整個儲存庫的所有檔案覆蓋率。閾值為 70% 的行/函式/陳述式和 55% 的分支。由於 `coverage.all` 為 false，閘道會測量由單元覆蓋率套件載入的檔案，而不會將每個分割車道的原始檔案視為未覆蓋。
- `pnpm test:coverage:changed`：僅對自 `origin/main` 以來變更的檔案執行單元覆蓋率。
- `pnpm test:changed`：廉價的智慧變更測試執行。它執行來自直接測試編輯、同層 `*.test.ts` 檔案、明確來源對應和本機匯入圖表的精確目標。除非對應到精確測試，否則會跳過廣泛/配置/套件的變更。
- `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`：明確的廣泛變更測試執行。當測試線具/配置/套件編輯應回退到 Vitest 的更廣泛變更測試行為時，請使用它。
- `pnpm changed:lanes`：顯示由針對 `origin/main` 的差異所觸發的架構車道。
- `pnpm check:changed`：執行針對 `origin/main` 的差異的智慧變更檢查閘道。它會針對受影響的架構車道執行型別檢查、lint 和 guard 指令，但不會執行 Vitest 測試。請使用 `pnpm test:changed` 或明確的 `pnpm test <target>` 進行測試證明。
- `pnpm test`：將明確的檔案/目錄目標透過範圍限定的 Vitest 通道進行路由。未目標化的執行使用固定的分片組並展開為葉配置以進行本機並行執行；擴充功能組始終展開為各個擴充功能的分片配置，而不是一個巨大的根專案程序。
- 測試包裝器執行以簡短的 `[test] passed|failed|skipped ... in ...` 摘要結束。Vitest 自己的持續時間行保留為各分片的詳細資訊。
- 完整、擴充功能和包含模式分片執行會更新 `.artifacts/vitest-shard-timings.json` 中的本機計時資料；後續的完整配置執行會使用這些計時資料來平衡慢速和快速分片。包含模式 CI 分片會將分片名稱附加到計時鍵，這使過濾後的分片計時保持可見，而不會取代完整配置的計時資料。設定 `OPENCLAW_TEST_PROJECTS_TIMINGS=0` 以忽略本機計時產物。
- 選定的 `plugin-sdk` 和 `commands` 測試檔案現在透過專用的輕量級通道進行路由，該通道僅保留 `test/setup.ts`，而將運行時繁重的案例留在其現有通道上。
- 具有同層級測試的來源檔案會先對應到該同層級，然後再回退到更廣泛的目錄 glob。`test/helpers/channels` 和 `test/helpers/plugins` 下的協助程式編輯使用本機匯入圖來執行匯入的測試，而不是在相依性路徑精確時廣泛執行每個分片。
- `auto-reply` 現在也會分割成三個專用配置（`core`、`top-level`、`reply`），以便回覆測試工具不會壓倒較輕量的頂層狀態/權杖/協助程式測試。
- 基礎 Vitest 配置現在預設為 `pool: "threads"` 和 `isolate: false`，並在所有儲存庫配置中啟用了共享的非隔離執行器。
- `pnpm test:channels` 執行 `vitest.channels.config.ts`。
- `pnpm test:extensions` 和 `pnpm test extensions` 執行所有擴充功能/外掛分片。繁重的通道外掛、瀏覽器外掛和 OpenAI 作為專用分片執行；其他外掛組保持批次處理。使用 `pnpm test extensions/<id>` 取得一個捆綁的外掛通道。
- `pnpm test:perf:imports`：啟用 Vitest import-duration + import-breakdown 報告，同時仍針對明確的檔案/目錄目標使用範圍 lane 路由。
- `pnpm test:perf:imports:changed`：相同的 import profiling，但僅針對自 `origin/main` 以來變更的檔案。
- `pnpm test:perf:changed:bench -- --ref <git-ref>` 會針對相同的已提交 git diff，將路由的 changed-mode 路徑與原生根專案執行進行基準測試。
- `pnpm test:perf:changed:bench -- --worktree` 會先不提交，直接對當前 worktree 變更集進行基準測試。
- `pnpm test:perf:profile:main`：為 Vitest 主執行緒 (`.artifacts/vitest-main-profile`) 撰寫 CPU profile。
- `pnpm test:perf:profile:runner`：為單元執行器 (`.artifacts/vitest-runner-profile`) 撰寫 CPU + heap profiles。
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json`：以序列方式執行每個完整套件 Vitest leaf config，並寫入分組的持續時間資料以及各個 config 的 JSON/log 成品。測試效能代理程式會在嘗試修復慢速測試之前，將此作為其基準。
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json`：在針對效能的變更之後，比較分組報告。
- Gateway 整合：透過 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 加入使用。
- `pnpm test:e2e`：執行 gateway 端對端 煙霧測試 (多執行個體 WS/HTTP/node 配對)。預設為在 `vitest.e2e.config.ts` 中使用具調適性的工作者搭配 `threads` + `isolate: false`；請使用 `OPENCLAW_E2E_WORKERS=<n>` 進行微調，並設定 `OPENCLAW_E2E_VERBOSE=1` 以取得詳細記錄。
- `pnpm test:live`：執行 provider 即時測試 (minimax/zai)。需要 API 金鑰和 `LIVE=1` (或 provider 特定的 `*_LIVE_TEST=1`) 以取消跳過。
- `pnpm test:docker:all`：構建共享的 live-test 映像，將 OpenClaw 打包一次為 npm tarball，構建/復用裸 Node/Git 運行器映像以及將該 tarball 安裝到 `/app` 的功能映像，然後透過加權排程器使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行 Docker smoke lanes。裸映像 (`OPENCLAW_DOCKER_E2E_BARE_IMAGE`) 用於安裝程式/更新/外掛相依性 lanes；這些 lanes 掛載預建的 tarball，而不是使用複製的 repo 原始碼。功能映像 (`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`) 用於正常的建置應用程式功能 lanes。`scripts/package-openclaw-for-docker.mjs` 是單一本機/CI 套件打包器，並在 Docker 使用之前驗證 tarball 和 `dist/postinstall-inventory.json`。Docker lane 定義位於 `scripts/lib/docker-e2e-scenarios.mjs`；規劃器邏輯位於 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 執行選定的計畫。`node scripts/test-docker-all.mjs --plan-json` 發出排程器擁有的 CI 計畫，用於選定的 lanes、映像種類、套件/live-image 需求和憑證檢查，而無需建置或執行 Docker。`OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` 控制程序槽，預設為 10；`OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` 控制提供者敏感的尾池，預設為 10。Heavy lane caps 預設為 `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；提供者 caps 預設透過 `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT=4`、`OPENCLAW_DOCKER_ALL_LIVE_CODEX_LIMIT=4` 和 `OPENCLAW_DOCKER_ALL_LIVE_GEMINI_LIMIT=4` 每個提供者一個 heavy lane。對於較大的主機，請使用 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。如果一個 lane 超過了低並行主機上的有效權重或資源上限，它仍然可以從空池開始，並將單獨運行直到它釋放容量。Lane 預設錯開 2 秒啟動，以避免本機 Docker daemon 建立風暴；使用 `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>` 覆蓋。運行器預設會預檢 Docker，清理過時的 OpenClaw E2E 容器，每 30 秒發出一次活動 lane 狀態，在相容的 lanes 之間共享提供者 CLI 工具快取，預設重試一次暫時性 live-provider 失敗 (`OPENCLAW_DOCKER_ALL_LIVE_RETRIES=<n>`)，並將 lane 計時儲存在 `.artifacts/docker-tests/lane-timings.json` 中，以便在後續運行中按最長優先排序。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 在不執行 Docker 的情況下列印 lane 清單，使用 `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` 調整狀態輸出，或使用 `OPENCLAW_DOCKER_ALL_TIMINGS=0` 停用計時重複使用。使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=skip` 僅用於確定性/本機 lanes，或使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=only` 僅用於 live-provider lanes；套件別名為 `pnpm test:docker:local:all` 和 `pnpm test:docker:live:all`。僅 Live 模式將主要和尾 live lanes 合併到一個最長優先池中，以便提供者貯存器可以將 Claude、Codex 和 Gemini 一起打包。除非設定了 `OPENCLAW_DOCKER_ALL_FAIL_FAST=0`，否則運行器會在第一次失敗後停止排程新的共用 lanes，並且每個 lane 都有 120 分鐘的後備逾時，可透過 `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` 覆蓋；選定的 live/tail lanes 使用更嚴格的每 lane 上限。CLI 後端 Docker 設定命令有自己的逾時，透過 `OPENCLAW_LIVE_CLI_BACKEND_SETUP_TIMEOUT_SECONDS` (預設 180)。每 lane 記錄、`summary.json`、`failures.json` 和階段計時寫在 `.artifacts/docker-tests/<run-id>/` 下；使用 `pnpm test:docker:timings <summary.json>` 檢查慢速 lanes，使用 `pnpm test:docker:rerun <run-id|summary.json|failures.json>` 列印廉價的定向重新執行命令。
- `pnpm test:docker:browser-cdp-snapshot`：建置基於 Chromium 的來源 E2E 容器，啟動原始 CDP 以及獨立的 Gateway，執行 `browser doctor --deep`，並驗證 CDP 角色快照是否包含連結 URL、游標提示的可點擊元素、iframe 參照和 frame 元資料。
- CLI 後端即時 Docker 探測可以作為專用通道執行，例如 `pnpm test:docker:live-cli-backend:codex`、`pnpm test:docker:live-cli-backend:codex:resume` 或 `pnpm test:docker:live-cli-backend:codex:mcp`。Claude 和 Gemini 有對應的 `:resume` 和 `:mcp` 別名。
- `pnpm test:docker:openwebui`：啟動 Docker 化的 OpenClaw + Open WebUI，透過 Open WebUI 登入，檢查 `/api/models`，然後透過 `/api/chat/completions` 執行真實的代理聊天。需要可用的即時模型金鑰（例如 `~/.profile` 中的 OpenAI），會拉取外部 Open WebUI 映像檔，且不像一般的 unit/e2e 套件那樣預期在 CI 中穩定。
- `pnpm test:docker:mcp-channels`：啟動一個已植入種子的 Gateway 容器和一個會產生 `openclaw mcp serve` 的第二個客戶端容器，然後透過真實的 stdio 橋接器驗證路由對話探索、對話紀錄讀取、附件元資料、即時事件佇列行為、輸出發送路由，以及 Claude 風格的通道 + 權限通知。Claude 通知斷言會直接讀取原始 stdio MCP 幀，因此此冒煙測試能反映橋接器實際發送的內容。

## 本機 PR 閘道

若要執行本機 PR 併入/閘道檢查，請執行：

- `pnpm check:changed`
- `pnpm check`
- `pnpm check:test-types`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

如果 `pnpm test` 在負載過重的主機上不穩定，請先重新執行一次，再將其視為迴歸，然後使用 `pnpm test <path/to/test>` 進行隔離。對於記憶體受限的主機，請使用：

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## 模型延遲基準測試（本機金鑰）

指令碼：[`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

使用方式：

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- 可選環境變數：`MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`、`ANTHROPIC_API_KEY`
- 預設提示詞：「Reply with a single word: ok. No punctuation or extra text.」

最近一次執行 (2025-12-31，20 次執行)：

- minimax 中位數 1279ms（最小 1114，最大 2431）
- opus 中位數 2454ms（最小 1224，最大 3170）

## CLI 啟動基準測試

腳本：[`scripts/bench-cli-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-cli-startup.ts)

使用方法：

- `pnpm test:startup:bench`
- `pnpm test:startup:bench:smoke`
- `pnpm test:startup:bench:save`
- `pnpm test:startup:bench:update`
- `pnpm test:startup:bench:check`
- `pnpm tsx scripts/bench-cli-startup.ts`
- `pnpm tsx scripts/bench-cli-startup.ts --runs 12`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case status --case gatewayStatus --runs 3`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case tasksJson --case tasksListJson --case tasksAuditJson --runs 3`
- `pnpm tsx scripts/bench-cli-startup.ts --entry openclaw.mjs --entry-secondary dist/entry.js --preset all`
- `pnpm tsx scripts/bench-cli-startup.ts --preset all --output .artifacts/cli-startup-bench-all.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case gatewayStatusJson --output .artifacts/cli-startup-bench-smoke.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --cpu-prof-dir .artifacts/cli-cpu`
- `pnpm tsx scripts/bench-cli-startup.ts --json`

預設：

- `startup`：`--version`、`--help`、`health`、`health --json`、`status --json`、`status`
- `real`：`health`、`status`、`status --json`、`sessions`、`sessions --json`、`tasks --json`、`tasks list --json`、`tasks audit --json`、`agents list --json`、`gateway status`、`gateway status --json`、`gateway health --json`、`config get gateway.port`
- `all`：兩個預設

輸出包含每個指令的 `sampleCount`、平均值、p50、p95、最小/最大值、結束代碼/訊號分佈，以及最大 RSS 摘要。可選的 `--cpu-prof-dir` / `--heap-prof-dir` 會在每次執行時寫入 V8 設定檔，以便計時與設定檔擷取使用相同的測試工具。

已儲存輸出的慣例：

- `pnpm test:startup:bench:smoke` 會將目標的冒煙測試構件寫入 `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` 會使用 `runs=5` 和 `warmup=1` 在 `.artifacts/cli-startup-bench-all.json` 寫入完整測試套件的產物
- `pnpm test:startup:bench:update` 會使用 `runs=5` 和 `warmup=1` 重新整理簽入的基線測試檔案 `test/fixtures/cli-startup-bench.json`

簽入的測試檔案：

- `test/fixtures/cli-startup-bench.json`
- 使用 `pnpm test:startup:bench:update` 重新整理
- 使用 `pnpm test:startup:bench:check` 比對目前的結果與測試檔案

## 新手上路 E2E (Docker)

Docker 是選用的；這僅需要用於容器化的新手上路冒煙測試。

在乾淨的 Linux 容器中進行完整的冷啟動流程：

```bash
scripts/e2e/onboard-docker.sh
```

此腳本會透過偽終端機驅動互動式精靈，驗證 config/workspace/session 檔案，然後啟動 gateway 並執行 `openclaw health`。

## QR 匯入冒煙測試 (Docker)

確保維護的 QR 執行時輔助程式可在支援的 Docker Node 執行時下載入（Node 24 預設，Node 22 相容）：

```bash
pnpm test:docker:qr
```

## 相關

- [測試](/zh-Hant/help/testing)
- [即時測試](/zh-Hant/help/testing-live)
