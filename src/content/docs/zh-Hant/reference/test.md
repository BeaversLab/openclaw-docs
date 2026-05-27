---
summary: "如何在本機執行測試（vitest）以及何時使用 force/coverage 模式"
read_when:
  - Running or fixing tests
title: "測試"
---

- 完整測試套件（套件、live、Docker）：[測試](/zh-Hant/help/testing)
- 更新與插件套件驗證：[測試更新與插件](/zh-Hant/help/testing-updates-plugins)

- `pnpm test:force`：終止任何佔用預設控制連接埠的殘留 Gateway 程序，然後使用隔離的 Gateway 連接埠執行完整的 Vitest 套件，以免伺服器測試與運行中的實例發生衝突。當先前的 Gateway 執行佔用了 18789 連接埠時，請使用此指令。
- `pnpm test:coverage`：執行單元測試套件並產生 V8 涵蓋率報告（透過 `vitest.unit.config.ts`）。這是 default-unit-lane 的涵蓋率閘道，而非整個儲存庫所有檔案的涵蓋率。臨界值為 70% 的行/函式/陳述式以及 55% 的分支。由於 `coverage.all` 為 false，且 default lane 範圍涵蓋率包含非快速單元測試及同層級原始檔，因此該閘道測量的是此 lane 擁有的原始碼，而非其恰好載入的每個傳遞匯入。
- `pnpm test:coverage:changed`：僅針對自 `origin/main` 以來變更的檔案執行單元涵蓋率測試。
- `pnpm test:changed`：廉價的智慧型變更測試執行。它會根據直接的測試編輯、同層級 `*.test.ts` 檔案、明確的原始碼對應以及本機匯入圖來執行精確目標。廣泛/設定/套件的變更會被跳過，除非它們對應到精確的測試。
- `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`：明確的廣泛變更測試執行。當測試框架/設定/套件編輯應回退至 Vitest 更廣泛的變更測試行為時，請使用此指令。
- `pnpm changed:lanes`：顯示與 `origin/main` 比對差異所觸發的架構 lanes。
- `pnpm check:changed`：針對與 `origin/main` 的差異執行智慧型變更檢查閘道。它會針對受影響的架構 lanes 執行 typecheck、lint 與 guard 指令，但不會執行 Vitest 測試。請使用 `pnpm test:changed` 或明確的 `pnpm test <target>` 進行測試驗證。
- Codex worktree 和連結/稀疏檢出：避免直接進行本地 `pnpm test*`、`pnpm check*` 和 `pnpm crabbox:run`，除非您已確認 pnpm 不會協調相依性。對於微小的明確檔案驗證，請使用 `node scripts/run-vitest.mjs <path-or-filter>`；對於變更的閘門或廣泛驗證，請使用 `node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox ... --shell -- "pnpm check:changed"`，以便 pnpm 在 Testbox 內執行。
- `OPENCLAW_HEAVY_CHECK_LOCK_SCOPE=worktree <local-heavy-check command>`：將繁重檢查的序列化保留在目前的 worktree 內，而不是 Git 通用目錄，適用於 `pnpm check:changed` 和目標 `pnpm test ...` 等指令。僅當您故意在連結的 worktree 之間執行獨立檢查時，才在高容量的本地主機上使用它。
- `pnpm test`：將明確的檔案/目錄目標透過範圍 Vitest 通道進行路由。未目標的執行使用固定的分片組，並擴展為葉配置以進行本地平行執行；擴充功能組始終擴展為每個擴充功能的分片配置，而不是一個巨大的根專案程序。
- 測試包裝器執行以簡短的 `[test] passed|failed|skipped ... in ...` 摘要結束。Vitest 自己的持續時間行保持每個分片的細節。
- 共享 OpenClaw 測試狀態：當測試需要獨立的 `HOME`、`OPENCLAW_STATE_DIR`、`OPENCLAW_CONFIG_PATH`、配置夾具、工作區、代理目錄或身分驗證設定檔儲存時，請使用來自 Vitest 的 `src/test-utils/openclaw-test-state.ts`。
- Control UI 模擬 E2E：請使用 `pnpm test:ui:e2e` 執行 Vitest + Playwright 通道，該通道會啟動 Vite Control UI 並針對模擬的 Gateway WebSocket 驅動真實的 Chromium 頁面。測試位於 `ui/src/**/*.e2e.test.ts`；共用的模擬與控制項位於 `ui/src/test-helpers/control-ui-e2e.ts`。`pnpm test:e2e` 包含此通道。在 Codex worktrees 中，安裝相依套件後若需微小的目標驗證，建議優先使用 `node scripts/run-vitest.mjs run --config test/vitest/vitest.ui-e2e.config.ts --configLoader runner ui/src/ui/e2e/chat-flow.e2e.test.ts`；若需更廣泛的 GUI 驗證，則使用 Testbox/Crabbox。
- 程序 E2E 助手：當 Vitest 程序層級 E2E 測試需要在同一處取得運行中的 Gateway、CLI 環境、日誌擷取與清理時，請使用 `test/helpers/openclaw-test-instance.ts`。
- TUI PTY 測試：請使用 `node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts` 執行快速假後端 PTY 通道。請使用 `OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1` 或 `pnpm tui:pty:test:watch --mode local` 執行較慢的 `tui --local` 冒煙測試，該測試僅模擬外部模型端點。請斷言穩定的可見文字或 fixture 呼叫，而非原始 ANSI 快照。
- Docker/Bash E2E 助手：來源 `scripts/lib/docker-e2e-image.sh` 的通道可將 `docker_e2e_test_state_shell_b64 <label> <scenario>` 傳入容器並使用 `scripts/lib/openclaw-e2e-instance.sh` 解碼；多重主目錄腳本可傳入 `docker_e2e_test_state_function_b64` 並在每個流程中呼叫 `openclaw_test_state_create <label> <scenario>`。底層呼叫者可使用 `scripts/lib/openclaw-test-state.mjs shell --label <name> --scenario <name>` 取得容器內的 shell 片段，或使用 `node scripts/lib/openclaw-test-state.mjs -- create --label <name> --scenario <name> --env-file <path> --json` 取得可供載入的主機環境檔。`create` 前的 `--` 可防止較新的 Node 執行時將 `--env-file` 視為 Node 參數。啟動 Gateway 的 Docker/Bash 通道可在容器內載入 `scripts/lib/openclaw-e2e-instance.sh`，以進行入口點解析、模擬 OpenAI 啟動、Gateway 前景/背景啟動、就緒探查、狀態環境匯出、日誌傾印與程序清理。
- 完整、擴展和包含模式分片執行會更新 `.artifacts/vitest-shard-timings.json` 中的本地計時資料；後續的完整配置執行會使用這些計時資料來平衡慢速和快速分片。包含模式 CI 分片會將分片名稱附加到計時鍵，這使過濾後的分片計時可見，而不會替換完整配置的計時資料。設定 `OPENCLAW_TEST_PROJECTS_TIMINGS=0` 以忽略本地計時產物。
- 選定的 `plugin-sdk` 和 `commands` 測試檔案現在會透過專用的輕量級通道路由，該通道僅保留 `test/setup.ts`，而將執行時負載較大的案例留在其現有通道上。
- 具有同層測試的來源檔案會先映射到該同層測試，然後才回退到更廣泛的目錄全域符號。在 `src/channels/plugins/contracts/test-helpers`、`src/plugin-sdk/test-helpers` 和 `src/plugins/contracts` 下的輔助程式編輯會使用本機匯入圖來執行匯入這些輔助程式的測試，而不是在相依性路徑精確時廣泛執行每個分片。
- `auto-reply` 現在也會分割為三個專用配置（`core`、`top-level`、`reply`），以便回覆測試線束不會主導較輕量的頂層狀態/權杖/輔助程式測試。
- 基礎 Vitest 配置現在預設為 `pool: "threads"` 和 `isolate: false`，並在所有儲存庫配置中啟用共用的非隔離執行器。
- `pnpm test:channels` 會執行 `vitest.channels.config.ts`。
- `pnpm test:extensions` 和 `pnpm test extensions` 會執行所有擴充功能/外掛程式分片。繁重的通道外掛程式、瀏覽器外掛程式和 OpenAI 作為專用分片執行；其他外掛程式群組則保持批次處理。使用 `pnpm test extensions/<id>` 進行單一批次外掛程式通道。
- `pnpm test:perf:imports`：啟用 Vitest 匯入持續時間 + 匯入分解報告，同時仍針對明確的檔案/目錄目標使用範圍通道路由。
- `pnpm test:perf:imports:changed`：相同的匯入分析，但僅適用於自 `origin/main` 以來變更的檔案。
- `pnpm test:perf:changed:bench -- --ref <git-ref>` 會針對相同的已提交 git diff，將路由的變更模式路徑與原生根專案執行進行基準測試。
- `pnpm test:perf:changed:bench -- --worktree` 會先對當前工作樹變更集進行基準測試，而無需先提交。
- `pnpm test:perf:profile:main`: 為 Vitest 主執行緒撰寫 CPU 分析檔案 (`.artifacts/vitest-main-profile`)。
- `pnpm test:perf:profile:runner`: 為單元執行器 (`.artifacts/vitest-runner-profile`) 撰寫 CPU + heap 分析檔案。
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json`: 依序執行每個完整套件 Vitest 葉層配置，並寫入分組的持續時間資料以及個別配置的 JSON/log 產出。測試效能代理 在嘗試修復慢速測試前，會將此作為基準。
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json`: 在進行以效能為導向的變更後，比較分組報告。
- Gateway 整合：透過 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 啟用。
- `pnpm test:e2e`: 執行儲存庫 E2E 彙總測試：gateway 端對端 煙霧測試 加上 Control UI 模擬瀏覽器 E2E 通道。
- `pnpm test:e2e:gateway`: 執行 gateway 端對端 煙霧測試 (多實例 WS/HTTP/node 配對)。預設為 `threads` + `isolate: false` 並在 `vitest.e2e.config.ts` 中使用自適應工作執行緒；使用 `OPENCLAW_E2E_WORKERS=<n>` 進行調整，並設定 `OPENCLAW_E2E_VERBOSE=1` 以取得詳細日誌。
- `pnpm test:live`: 執行提供者 即時測試 (minimax/zai)。需要 API 金鑰和 `LIVE=1` (或提供者特定的 `*_LIVE_TEST=1`) 來取消跳過。
- `pnpm test:docker:all`：構建共享的即時測試映像檔，將 OpenClaw 打包一次為 npm tarball，構建/重用裸機 Node/Git 執行器映像檔以及將該 tarball 安裝到 `/app` 的功能映像檔，然後透過加權排程器使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行 Docker 煙霧測試通道。裸機映像檔 (`OPENCLAW_DOCKER_E2E_BARE_IMAGE`) 用於安裝程式/更新/外掛相依性通道；這些通道掛載預先建置的 tarball，而不是使用複製的 repo 來源。功能映像檔 (`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`) 用於正常建置應用程式功能通道。`scripts/package-openclaw-for-docker.mjs` 是單一本機/CI 套件打包器，並在 Docker 使用之前驗證 tarball 和 `dist/postinstall-inventory.json`。Docker 通道定義位於 `scripts/lib/docker-e2e-scenarios.mjs`；規劃器邏輯位於 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 執行選定的計畫。`node scripts/test-docker-all.mjs --plan-json` 為選定的通道、映像檔類型、套件/即時映像檔需求、狀態情境和憑證檢查發出排程器擁有的 CI 計畫，而不建置或執行 Docker。`OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` 控制程序插槽，預設為 10；`OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` 控制供應商敏感的尾部集區，預設為 10。繁重通道上限預設為 `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；供應商上限透過 `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT=4`、`OPENCLAW_DOCKER_ALL_LIVE_CODEX_LIMIT=4` 和 `OPENCLAW_DOCKER_ALL_LIVE_GEMINI_LIMIT=4` 預設為每個供應商一個繁重通道。對於較大的主機，請使用 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。如果一個通道在低並行主機上超過有效權重或資源上限，它仍然可以從空集區啟動，並且將單獨運行直到釋放容量。通道啟動預設錯開 2 秒，以避免本機 Docker daemon 建立風暴；使用 `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>` 覆寫。執行器預設會預檢 Docker，清理過時的 OpenClaw E2E 容器，每 30 秒發出一次作用中通道狀態，在相容通道之間共享供應商 CLI 工具快取，預設重試一次暫時性即時供應商失敗 (`OPENCLAW_DOCKER_ALL_LIVE_RETRIES=<n>`)，並將通道計時儲存在 `.artifacts/docker-tests/lane-timings.json` 中，以便在後續運行中進行最長優先排序。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 在不執行 Docker 的情況下列印通道清單，使用 `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` 調整狀態輸出，或使用 `OPENCLAW_DOCKER_ALL_TIMINGS=0` 停用計時重複使用。使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=skip` 僅用於確定性/本機通道，或使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=only` 僅用於即時供應商通道；套件別名是 `pnpm test:docker:local:all` 和 `pnpm test:docker:live:all`。僅即時模式將主要和尾部即時通道合併為一個最長優先集區，以便供應商儲存桶可以一起打包 Claude、Codex 和 Gemini 工作。除非設定了 `OPENCLAW_DOCKER_ALL_FAIL_FAST=0`，否則執行器會在第一次失敗後停止排程新的集區通道，並且每個通道都有 120 分鐘的後備逾時，可以使用 `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` 覆寫；選定的即時/尾部通道使用更嚴格的每通道上限。CLI 後端 Docker 設定命令有自己的逾時，透過 `OPENCLAW_LIVE_CLI_BACKEND_SETUP_TIMEOUT_SECONDS` (預設 180)。每通道日誌、`summary.json`、`failures.json` 和階段計時寫入 `.artifacts/docker-tests/<run-id>/` 下；使用 `pnpm test:docker:timings <summary.json>` 檢查慢速通道，並使用 `pnpm test:docker:rerun <run-id|summary.json|failures.json>` 列印便宜的目標重跑命令。
- `pnpm test:docker:browser-cdp-snapshot`：構建基於 Chromium 的來源 E2E 容器，啟動原始 CDP 以及獨立的 Gateway，執行 `browser doctor --deep`，並驗證 CDP 角色快照包含連結 URL、游標提升的可點擊元素、iframe 參考和框架元資料。
- `pnpm test:docker:skill-install`：在裸機 Docker 執行器中安裝打包的 OpenClaw tarball，停用 `skills.install.allowUploadedArchives`，從即時 ClawHub 搜尋解析當前的 skill slug，透過 `openclaw skills install` 安裝它，並驗證 `SKILL.md`、`.clawhub/origin.json`、`.clawhub/lock.json` 和 `skills info --json`。
- CLI 後端即時 Docker 探測可以作為專注通道執行，例如 `pnpm test:docker:live-cli-backend:claude`、`pnpm test:docker:live-cli-backend:claude:resume` 或 `pnpm test:docker:live-cli-backend:claude:mcp`。Gemini 具有對應的 `:resume` 和 `:mcp` 別名。
- `pnpm test:docker:openwebui`：啟動 Docker 化的 OpenClaw + Open WebUI，透過 Open WebUI 登入，檢查 `/api/models`，然後透過 `/api/chat/completions` 執行真實的代理聊天。需要可用的即時模型金鑰，會拉取外部 Open WebUI 映像檔，且不預期像一般單元/e2e 測試套件那樣在 CI 中保持穩定。
- `pnpm test:docker:mcp-channels`：啟動一個具有種子的 Gateway 容器和第二個生成 `openclaw mcp serve` 的用戶端容器，然後透過真實的 stdio 橋接驗證路由對話發現、逐字稿讀取、附件元資料、即時事件佇列行為、輸出發送路由，以及 Claude 風格的通道 + 權限通知。Claude 通知斷言會直接讀取原始 stdio MCP 框架，因此此冒煙測試能反映橋接實際發出的內容。
- `pnpm test:docker:upgrade-survivor`：在髒舊用戶裝置上安裝打包的 OpenClaw tarball，執行套件更新以及無即時供應商或通道金鑰的非互動式診斷，然後啟動回環 Gateway 並檢查 agents、通道設定、外掛允許清單、工作區/會話檔案、陳舊的舊版外掛相依性狀態、啟動和 RPC 狀態是否存續。
- `pnpm test:docker:published-upgrade-survivor`: 預設安裝 `openclaw@latest`，植入不含即時供應商或頻道金鑰的現實現有使用者檔案，使用內建的 `openclaw config set` 指令配方配置該基準，將該已發布的安裝更新為打包的 OpenClaw tarball，執行非互動式 doctor，寫入 `.artifacts/upgrade-survivor/summary.json`，然後啟動回環 Gateway 並檢查已配置的 intents、workspace/session 檔案、過時的外掛配置和舊版相依性狀態、啟動、`/healthz`、`/readyz` 和 RPC 狀態是否能正常存續或修復。使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆寫某個基準，使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`（例如 `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`）擴充精確的本地矩陣，或使用 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues` 新增情境固定裝置；回報問題集包含 `configured-plugin-installs`，用於驗證已配置的外部 OpenClaw 外掛在升級期間會自動安裝，以及 `stale-source-plugin-shadow`，用於防止僅來源的外掛陰影中斷啟動。Package Acceptance 將這些公開為 `published_upgrade_survivor_baseline`、`published_upgrade_survivor_baselines` 和 `published_upgrade_survivor_scenarios`，並在將精確的套件規格傳遞給 Docker lanes 之前解析諸如 `last-stable-4` 或 `all-since-2026.4.23` 等元基準標記。
- `pnpm test:docker:update-migration`: 在大量清理的 `plugin-deps-cleanup` 情境中執行已發布升級存留測試工具，預設從 `openclaw@2026.4.23` 開始。獨立的 `Update Migration` 工作流程使用 `baselines=all-since-2026.4.23` 擴充此通道，以便從 `.23` 開始的每個穩定已發布套件都會更新到候選版本，並在 Full Release CI 之外證明已配置外掛的相依性清理功能。
- `pnpm test:docker:plugins`: 對本地路徑、`file:`、具有提升相依性的 npm registry 套件、git 移動參考、ClawHub 固定裝置、marketplace 更新以及 Claude-bundle 啟用/檢查執行安裝/更新冒煙測試。

## Local PR gate

若要進行本地 PR land/gate 檢查，請執行：

- `pnpm check:changed`
- `pnpm check`
- `pnpm check:test-types`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

如果 `pnpm test` 在負載較高的主機上出現不穩定，請在將其視為回歸問題之前重新運行一次，然後使用 `pnpm test <path/to/test>` 進行隔離。對於記憶體受限的主機，請使用：

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## Model latency bench (local keys)

腳本：[`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

用法：

- `pnpm tsx scripts/bench-model.ts --runs 10`
- 可選環境變數：`MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`、`ANTHROPIC_API_KEY`
- 預設提示詞："Reply with a single word: ok. No punctuation or extra text."

上次運行 (2025-12-31，20 次)：

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
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case tasksJson --case tasksListJson --case tasksAuditJson --runs 3`
- `pnpm tsx scripts/bench-cli-startup.ts --entry openclaw.mjs --entry-secondary dist/entry.js --preset all`
- `pnpm tsx scripts/bench-cli-startup.ts --preset all --output .artifacts/cli-startup-bench-all.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case gatewayStatusJson --output .artifacts/cli-startup-bench-smoke.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --cpu-prof-dir .artifacts/cli-cpu`
- `pnpm tsx scripts/bench-cli-startup.ts --json`

預設：

- `startup`： `--version`、`--help`、`health`、`health --json`、`status --json`、`status`
- `real`: `health`, `status`, `status --json`, `sessions`, `sessions --json`, `tasks --json`, `tasks list --json`, `tasks audit --json`, `agents list --json`, `gateway status`, `gateway status --json`, `gateway health --json`, `config get gateway.port`
- `all`: 兩個預設

輸出包含 `sampleCount`、平均值、p50、p95、最小/最大值、退出代碼/訊號分佈，以及每個命令的 RSS 最大值摘要。可選的 `--cpu-prof-dir` / `--heap-prof-dir` 會在每次運行時寫入 V8 profile，以便計時和 profile 擷取使用相同的測試線束。

儲存輸出的慣例：

- `pnpm test:startup:bench:smoke` 會將目標的 smoke artifact 寫入 `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` 會使用 `runs=5` 和 `warmup=1` 將完整套件的 artifact 寫入 `.artifacts/cli-startup-bench-all.json`
- `pnpm test:startup:bench:update` 會使用 `runs=5` 和 `warmup=1` 更新提交的 baseline fixture `test/fixtures/cli-startup-bench.json`

提交的 fixture：

- `test/fixtures/cli-startup-bench.json`
- 使用 `pnpm test:startup:bench:update` 重新整理
- 使用 `pnpm test:startup:bench:check` 將當前結果與 fixture 進行比較

## Gateway 啟動基準測試

腳本：[`scripts/bench-gateway-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-gateway-startup.ts)

基準測試預設使用 `dist/entry.js` 中建構的 CLI 進入點；在使用 package-script 命令前請先執行
`pnpm build`。若要測量 source runner，請傳遞 `--entry scripts/run-node.mjs` 並將這些結果與 built-entry 基準分開。

用法：

- `pnpm test:startup:gateway -- --runs 5 --warmup 1`
- `pnpm test:startup:gateway -- --case default --runs 10 --warmup 1`
- `pnpm test:startup:gateway -- --case skipChannels --case fiftyPlugins --runs 5`
- `node --import tsx scripts/bench-gateway-startup.ts --case default --runs 5 --output .artifacts/gateway-startup.json`
- `node --import tsx scripts/bench-gateway-startup.ts --case default --runs 3 --cpu-prof-dir .artifacts/gateway-startup-cpu`

案例 ID：

- `default`: 正常的 Gateway 啟動。
- `skipChannels`: 跳過通道啟動的 Gateway 啟動。
- `oneInternalHook`: 一個已配置的內部掛鉤。
- `allInternalHooks`: 所有內部掛鉤。
- `fiftyPlugins`: 50 個清單插件。
- `fiftyStartupLazyPlugins`: 50 個啟動延遲清單插件。

輸出包含首次程序輸出、`/healthz`、`/readyz`、HTTP 監聽日誌時間、
Gateway 就緒日誌時間、CPU 時間、CPU 核心比、最大 RSS、堆積、啟動追蹤
指標、事件循環延遲，以及插件查找表詳細指標。該腳本會在子 Gateway 環境中
啟用 `OPENCLAW_GATEWAY_STARTUP_TRACE=1`。

將 `/healthz` 解讀為存活度：HTTP 伺服器可以回應。將 `/readyz` 解讀為
可用就緒度：啟動插件 sidecars、通道，以及就緒關鍵的
附加後工作已經完成。Gateway 啟動掛鉤是異步分發的，
並不是就緒保證的一部分。就緒日誌時間是 Gateway
的內部就緒日誌時間戳；它有助於程序端的歸因，但
不能取代外部 `/readyz` 探測。

比較變更時，請使用 JSON 輸出或 `--output`。僅當追蹤輸出指向僅從階段計時
無法解釋的匯入、編譯或 CPU 密集型工作時，才使用 `--cpu-prof-dir`。請勿將 source-runner 的結果
與建置的 `dist/entry.js` 結果作為相同基準進行比較。

## Gateway 重新啟動基準測試

腳本：[`scripts/bench-gateway-restart.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-gateway-restart.ts)

重新啟動基準測試僅支援 macOS 和 Linux。它使用 SIGUSR1 進行
程序內重新啟動，並在 Windows 上立即失敗。

基準測試預設為 `dist/entry.js` 的建置 CLI 進入點；在使用
package-script 命令之前請先執行 `pnpm build`。若要改為測量 source runner，
請傳遞 `--entry scripts/run-node.mjs` 並將這些結果與建置進入點基準分開保存。

使用方法：

- `pnpm test:restart:gateway -- --case skipChannels --runs 1 --restarts 5`
- `pnpm test:restart:gateway -- --case default --runs 3 --restarts 3 --warmup 1`
- `pnpm test:restart:gateway -- --case skipChannelsAcpxProbe --case skipChannelsNoAcpxProbe --runs 1 --restarts 5`
- `node --import tsx scripts/bench-gateway-restart.ts --case fiftyPlugins --runs 1 --restarts 5 --output .artifacts/gateway-restart.json`
- `node --import tsx scripts/bench-gateway-restart.ts --json`

案例 ID：

- `skipChannels`：重新啟動並跳過頻道。
- `skipChannelsAcpxProbe`：重新啟動並跳過頻道，且開啟 ACPX 啟動探測。
- `skipChannelsNoAcpxProbe`：重新啟動並跳過頻道，且關閉 ACPX 啟動探測。
- `default`：正常重新啟動。
- `fiftyPlugins`：重新啟動並載入 50 個清單外掛程式。

輸出包含下一個 `/healthz`、下一個 `/readyz`、停機時間、重新啟動就緒時間、
替代處理序的 CPU、RSS、啟動追蹤指標，以及信號處理、主動工作排空、關閉階段、
下一次啟動、就緒時間和記憶體快照的重新啟動追蹤指標。該腳本會在
子 Gateway 環境中啟用
`OPENCLAW_GATEWAY_STARTUP_TRACE=1` 和 `OPENCLAW_GATEWAY_RESTART_TRACE=1`。

當變更涉及重新啟動信號、關閉處理程式、
重新啟動後啟動、Sidecar 關閉、服務移交，或重新啟動後的就緒狀態時，
請使用此基準測試。在將 Gateway 機制與頻道啟動隔離時，
請先從 `skipChannels` 開始。只有在狹隘案例解釋了
重新啟動路徑之後，才使用 `default` 或外掛繁重的案例。

追蹤指標是歸因提示，而非結論。應根據多個樣本、
相符的擁有者 Span、`/healthz` 和 `/readyz`
行為，以及使用者可見的重新啟動合約來判斷重新啟動變更。

## Onboarding E2E (Docker)

Docker 是選用的；僅在需要容器化上手導入煙霧測試時才需要。

在乾淨的 Linux 容器中進行完整的冷啟動流程：

```bash
scripts/e2e/onboard-docker.sh
```

此腳本透過虛擬終端機驅動互動式精靈，驗證 config/workspace/session 檔案，然後啟動 gateway 並執行 `openclaw health`。

## QR import smoke (Docker)

確保維護的 QR 執行時輔助程式可在支援的 Docker Node 執行時（Node 24 預設，Node 22 相容）下載入：

```bash
pnpm test:docker:qr
```

## 相關

- [Testing](/zh-Hant/help/testing)
- [Testing live](/zh-Hant/help/testing-live)
- [Testing updates and plugins](/zh-Hant/help/testing-updates-plugins)
