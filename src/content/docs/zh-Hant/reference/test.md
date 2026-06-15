---
summary: "如何在本機執行測試（vitest）以及何時使用 force/coverage 模式"
read_when:
  - Running or fixing tests
title: "測試"
---

- 完整的測試套件（套件、即時、Docker）：[測試](/zh-Hant/help/testing)
- 更新與插件套件驗證：[測試更新與插件](/zh-Hant/help/testing-updates-plugins)

- 例行本地測試順序：
  1. `pnpm test:changed` 用於變更範圍的 Vitest 證明。
  2. `pnpm test <path-or-filter>` 用於單一檔案、目錄或明確目標。
  3. 僅當您有意需要完整的本地 Vitest 套件時才使用 `pnpm test`。
- `pnpm test:force`：終止任何佔用預設控制埠的殘留 gateway 程序，然後使用隔離的 gateway 埠執行完整的 Vitest 套件，使伺服器測試不會與執行中的實例衝突。當先前的 gateway 執行佔用埠 18789 時使用此指令。
- `pnpm test:coverage`：執行具有 V8 涵蓋率（透過 `vitest.unit.config.ts`）的單元套件。這是預設單元軌道的涵蓋率閘門，而非整個儲存庫的所有檔案涵蓋率。臨界值為 70% 的行/函式/陳述式和 55% 的分支。由於 `coverage.all` 為 false，且預設軌道範圍涵蓋率包含與非快速單元測試同層級的原始碼檔案，此閘門測量的是此軌道擁有的原始碼，而非它剛好載入的每個遞移匯入。
- `pnpm test:coverage:changed`：僅針對自 `origin/main` 以來變更的檔案執行單元涵蓋率。
- `pnpm test:changed`：低成本智慧變更測試執行。它從直接的測試編輯、同層級 `*.test.ts` 檔案、明確的原始碼對應以及本地匯入圖執行精確目標。除非廣泛/設定/套件的變更能對應到精確測試，否則將跳過這些變更。
- `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`：明確的廣泛變更測試執行。當測試框架/設定/套件編輯應回退至 Vitest 更廣泛的變更測試行為時，請使用此指令。
- `pnpm changed:lanes`：顯示與 `origin/main` 比對差異所觸發的架構軌道。
- `pnpm check:changed`: 在 CI 外部預設委派給 Crabbox/Testbox，然後在遠端子內部對 `origin/main` 的差異執行智慧變更檢查閘道。它會對受影響的架構通道執行 typecheck、lint 和 guard 指令，但不會執行 Vitest 測試。請使用 `pnpm test:changed` 或明確的 `pnpm test <target>` 進行測試驗證。
- Codex worktrees 和連結/稀疏結帳：避免直接在本機執行 `pnpm test*`、`pnpm check*` 和 `pnpm crabbox:run`，除非您已確認 pnpm 不會調解相依性。對於微小的明確檔案驗證，請使用 `node scripts/run-vitest.mjs <path-or-filter>`；對於變更閘道或廣泛驗證，請使用 `node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox ... -- env OPENCLAW_CHECK_CHANGED_REMOTE_CHILD=1 OPENCLAW_CHANGED_LANES_RAW_SYNC=1 corepack pnpm check:changed`，以便 pnpm 在 Testbox 內執行。
- `OPENCLAW_HEAVY_CHECK_LOCK_SCOPE=worktree <local-heavy-check command>`：將繁重檢查的序列化保持在當前 worktree 內部，而不是 Git 公用目錄中，針對諸如 `pnpm check:changed` 和目標 `pnpm test ...` 等指令。僅當您在連結的 worktree 之間故意執行獨立檢查時，才在高容量的本地主機上使用它。
- `pnpm test`：將明確的檔案/目錄目標透過範圍限定的 Vitest 通道進行路由。非目標執行是完整套件驗證：它們使用固定的分片群組，擴展為葉配置以進行本地並行執行，並在開始前列印預期的本地分片扇出。擴充功能群組始終擴展為個別擴充功能的分片配置，而不是一個巨大的根專案程序。
- 測試包裝程式執行以簡短的 `[test] passed|failed|skipped ... in ...` 摘要結束。Vitest 自己的持續時間行保持為分片細節。
- 共用的 OpenClaw 測試狀態：當測試需要隔離的 `HOME`、`OPENCLAW_STATE_DIR`、`OPENCLAW_CONFIG_PATH`、配置固定裝置 (fixture)、工作區 (workspace)、代理程式目錄或授權設定檔存放區時，請使用來自 Vitest 的 `src/test-utils/openclaw-test-state.ts`。
- 控制 UI 模擬的 E2E：針對啟動 Vite Control UI 並針對模擬的 Gateway WebSocket 驅動真實 Chromium 頁面的 Vitest + Playwright 通道，請使用 `pnpm test:ui:e2e`。測試位於 `ui/src/**/*.e2e.test.ts`；共用的模擬和控制項位於 `ui/src/test-helpers/control-ui-e2e.ts`。`pnpm test:e2e` 包含此通道。在 Codex worktrees 中，在安裝相依性後，對於微小的目標驗證，偏好使用 `node scripts/run-vitest.mjs run --config test/vitest/vitest.ui-e2e.config.ts --configLoader runner ui/src/ui/e2e/chat-flow.e2e.test.ts`，或者使用 Testbox/Crabbox 進行更廣泛的 GUI 驗證。
- 程序 E2E 助手：當 Vitest 程序層級的 E2E 測試需要在一個地方執行執行中的 Gateway、CLI 環境、日誌擷取和清理時，請使用 `test/helpers/openclaw-test-instance.ts`。
- TUI PTY 測試：使用 `node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts` 進行快速 fake-backend PTY 通道。使用 `OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1` 或 `pnpm tui:pty:test:watch --mode local` 進行較慢的 `tui --local` smoke，這僅會模擬外部模型端點。請斷言穩定的可見文字或 fixture 調用，而非原始 ANSI 快照。
- Docker/Bash E2E 輔助工具：source `scripts/lib/docker-e2e-image.sh` 的通道可以將 `docker_e2e_test_state_shell_b64 <label> <scenario>` 傳入容器並使用 `scripts/lib/openclaw-e2e-instance.sh` 解碼；multi-home 腳本可以傳遞 `docker_e2e_test_state_function_b64` 並在每個流程中呼叫 `openclaw_test_state_create <label> <scenario>`。底層呼叫者可以使用 `scripts/lib/openclaw-test-state.mjs shell --label <name> --scenario <name>` 取得容器內的 shell 片段，或使用 `node scripts/lib/openclaw-test-state.mjs -- create --label <name> --scenario <name> --env-file <path> --json` 取得可 source 的主機環境檔案。`create` 之前的 `--` 可防止較新的 Node 執行環境將 `--env-file` 視為 Node 標誌。啟動 Gateway 的 Docker/Bash 通道可以在容器內 source `scripts/lib/openclaw-e2e-instance.sh` 以進行進入點解析、模擬 OpenAI 啟動、Gateway 前景/背景啟動、就緒探針、狀態環境匯出、日誌傾印和程序清理。
- 完整、擴充和包含模式分片執行會更新 `.artifacts/vitest-shard-timings.json` 中的本地計時資料；後續的完整組態執行會使用這些計時來平衡慢速和快速分片。包含模式 CI 分片會將分片名稱附加到計時鍵，這使過濾後的分片計時保持可見，而不會取代完整組態計時資料。設定 `OPENCLAW_TEST_PROJECTS_TIMINGS=0` 以忽略本地計時檔案。
- 選定的 `plugin-sdk` 和 `commands` 測試檔案現在會透過專用的輕量級通道路由，僅保留 `test/setup.ts`，並將執行時間較長的案例保留在其現有通道上。
- 具有同級測試的來源檔案會在回退到更廣泛的目錄 glob 之前對應到該同級。`src/channels/plugins/contracts/test-helpers`、`src/plugin-sdk/test-helpers` 和 `src/plugins/contracts` 下的輔助編輯使用本地匯入圖來執行匯入測試，而不是在依賴路徑精確時廣泛執行每個分片。
- `auto-reply` 現在也拆分為三個專用配置 (`core`, `top-level`, `reply`)，因此 reply harness 不會掩蓋較輕量的頂層狀態/token/helper 測試。
- Base Vitest 配置現在預設為 `pool: "threads"` 和 `isolate: false`，並且在整個 repo 配置中啟用了共享的非隔離 runner。
- `pnpm test:channels` 執行 `vitest.channels.config.ts`。
- `pnpm test:extensions` 和 `pnpm test extensions` 執行所有 extension/plugin 分片。Heavy channel 插件、瀏覽器插件和 OpenAI 作為專用分片運行；其他插件組保持批次處理。使用 `pnpm test extensions/<id>` 進行單一捆綁插件通道運行。
- `pnpm test:perf:imports`：啟用 Vitest import-duration + import-breakdown 報告，同時仍針對明確的檔案/目錄目標使用限定範圍的通道路由。
- `pnpm test:perf:imports:changed`：相同的 import 分析，但僅針對自 `origin/main` 以來變更的檔案。
- `pnpm test:perf:changed:bench -- --ref <git-ref>` 針對相同的已提交 git diff，將路由的 changed-mode 路徑與原生的 root-project 執行進行基準測試。
- `pnpm test:perf:changed:bench -- --worktree` 在不先提交的情況下，對當前 worktree 變更集進行基準測試。
- `pnpm test:perf:profile:main`：寫入 Vitest 主執行緒 (`.artifacts/vitest-main-profile`) 的 CPU 分析檔。
- `pnpm test:perf:profile:runner`：寫入 unit runner (`.artifacts/vitest-runner-profile`) 的 CPU + heap 分析檔。
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json`：依序執行每個 full-suite Vitest leaf 配置，並寫入分組的持續時間資料以及各配置的 JSON/log 成果。Test Performance Agent 在嘗試修復慢速測試之前，會將此作為基線。
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json`：在針對效能的變更之後比較分組報告。
- `pnpm test:docker:timings <summary.json>` 在 Docker all 執行後檢查緩慢的 Docker 通道；使用 `pnpm test:docker:rerun <run-id|summary.json|failures.json>` 從相同的成果中列印廉價的針對性重新執行指令。
- Gateway 整合：透過 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 選擇加入。
- `pnpm test:e2e`：執行儲存庫 E2E 聚合測試：gateway 端到端煙霧測試加上 Control UI 模擬瀏覽器 E2E 通道。
- `pnpm test:e2e:gateway`：執行 gateway 端到端煙霧測試（多實例 WS/HTTP/node 配對）。預設為 `threads` + `isolate: false`，並在 `vitest.e2e.config.ts` 中使用自適應 worker；使用 `OPENCLAW_E2E_WORKERS=<n>` 進行調整，並設定 `OPENCLAW_E2E_VERBOSE=1` 以取得詳細日誌。
- `pnpm test:live`：執行 provider 即時測試（minimax/zai）。需要 API 金鑰和 `LIVE=1`（或 provider 特定的 `*_LIVE_TEST=1`）才能取消跳過。
- `pnpm test:docker:all`：構建共用的 live-test 映像檔，將 OpenClaw 打包一次為 npm tarball，建置/重用裸露的 Node/Git runner 映像檔以及將該 tarball 安裝至 `/app``OPENCLAW_SKIP_DOCKER_BUILD=1` 的功能映像檔，然後透過加權排程器執行 Docker smoke lanes。裸露映像檔 (`OPENCLAW_DOCKER_E2E_BARE_IMAGE`) 用於安裝程式/更新/外掛相依性 lanes；這些 lanes 掛載預建的 tarball 而非使用複製的 repo 來源。功能映像檔 (`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`) 用於正常建置應用程式的功能 lanes。`scripts/package-openclaw-for-docker.mjs` 是單一本機/CI 套件打包器，並在 Docker 使用前驗證 tarball 與 `dist/postinstall-inventory.json`。Docker lane 定義位於 `scripts/lib/docker-e2e-scenarios.mjs`；planner 邏輯位於 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 執行選定的計畫。`node scripts/test-docker-all.mjs --plan-json` 發出排程器擁有的 CI 計畫，用於選定的 lanes、映像檔種類、套件/live-image 需求、狀態情境與憑證檢查，而不建置或執行 Docker。`OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` 控制程序插槽，預設為 10；`OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` 控制供應商敏感的尾端 pool，預設為 10。Heavy lane 上限預設為 `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 與 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；供應商上限預設透過 `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT=4`、`OPENCLAW_DOCKER_ALL_LIVE_CODEX_LIMIT=4` 與 `OPENCLAW_DOCKER_ALL_LIVE_GEMINI_LIMIT=4` 設為每個供應商一個 heavy lane。對於較大的主機，請使用 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。如果某個 lane 在低並行主機上超過有效權重或資源上限，它仍可從空的 pool 開始，並將獨自執行直到釋放容量。Lane 啟動預設錯開 2 秒，以避免本機 Docker daemon 建立風暴；可用 `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>` 覆寫。Runner 預設會預檢 Docker、清理過時的 OpenClaw E2E 容器、每 30 秒發出 active-lane 狀態、在相容的 lanes 之間共享供應商 CLI 工具快取、預設重試暫時性 live-provider 失敗一次 (`OPENCLAW_DOCKER_ALL_LIVE_RETRIES=<n>`)，並將 lane 計時儲存在 `.artifacts/docker-tests/lane-timings.json` 以便在後續執行時進行最長優先排序。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 列印 lane 清單而不執行 Docker、使用 `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` 調整狀態輸出，或使用 `OPENCLAW_DOCKER_ALL_TIMINGS=0``OPENCLAW_DOCKER_ALL_LIVE_MODE=skip` 停用計時重用。使用 %%PH:INLINE_CODE:131:6091b6c7\*\* 僅用於確定性/本機 lanes，或使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=only` 僅用於 live-provider lanes；套件別名為 `pnpm test:docker:local:all` 與 `pnpm test:docker:live:all`。僅 Live 模式將主要與尾端 live lanes 合併為一個最長優先的 pool，以便供應商 buckets 可將 Claude、Codex 與 Gemini 工作一起打包。除非設定 `OPENCLAW_DOCKER_ALL_FAIL_FAST=0`，否則 runner 會在第一次失敗後停止排程新的 pooled lanes，且每個 lane 有 120 分鐘的備援逾時，可用 `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` 覆寫；選定的 live/tail lanes 使用更嚴格的單一 lane 上限。CLI 後端 Docker 設定指令有自己的逾時，透過 `OPENCLAW_LIVE_CLI_BACKEND_SETUP_TIMEOUT_SECONDS` (預設 180)。各 lane 的日誌、`summary.json`、`failures.json` 與階段計時會寫入 `.artifacts/docker-tests/<run-id>/` 下；使用 `pnpm test:docker:timings <summary.json>` 檢查緩慢的 lanes，並使用 `pnpm test:docker:rerun <run-id|summary.json|failures.json>` 列印便宜的目標重試執行指令。
- `pnpm test:docker:browser-cdp-snapshot`：構建基於 Chromium 的來源 E2E 容器，啟動原始 CDP 以及獨立的 Gateway，執行 `browser doctor --deep`，並驗證 CDP 角色快照包含連結 URL、游標提升的可點擊元素、iframe 參照和框架元數據。
- `pnpm test:docker:skill-install`：在乾淨的 Docker 執行器中安裝打包的 OpenClaw tarball，停用 `skills.install.allowUploadedArchives`，從即時 ClawHub 搜尋解析目前的 skill slug，透過 `openclaw skills install` 安裝它，並驗證 `SKILL.md`、`.clawhub/origin.json`、`.clawhub/lock.json` 和 `skills info --json`。
- CLI 後端即時 Docker 探測可以作為專注的通道執行，例如 `pnpm test:docker:live-cli-backend:claude`、`pnpm test:docker:live-cli-backend:claude:resume` 或 `pnpm test:docker:live-cli-backend:claude:mcp`。Gemini 具有匹配的 `:resume` 和 `:mcp` 別名。
- `pnpm test:docker:openwebui`：啟動 Docker 化的 OpenClaw 與 Open WebUI，透過 Open WebUI 登入，檢查 `/api/models`，然後透過 `/api/chat/completions` 執行真實的代理聊天。需要可用的即時模型金鑰，會拉取外部 Open WebUI 映像檔，且預期不像一般單元/E2E 測試套件那樣在 CI 中保持穩定。
- `pnpm test:docker:mcp-channels`：啟動一個已設定種子的 Gateway 容器和第二個產生 `openclaw mcp serve` 的用戶端容器，然後透過真實的 stdio 橋接器驗證路由對話探索、逐字稿讀取、附件元數據、即時事件佇列行為、輸出傳送路由，以及 Claude 風格的通道與權限通知。Claude 通知斷言會直接讀取原始 stdio MCP 幀，因此煙霧測試能反映橋接器實際發出的內容。
- `pnpm test:docker:upgrade-survivor`：在髒舊使用者裝置上安裝打包的 OpenClaw tarball，在沒有即時提供商或通道金鑰的情況下執行套件更新和非互動式診斷，然後啟動迴路 Gateway 並檢查代理、通道設定、外掛允許清單、工作區/會話檔案、過時的舊版外掛相依性狀態、啟動和 RPC 狀態是否存續。
- `pnpm test:docker:published-upgrade-survivor`：預設安裝 `openclaw@latest`，在沒有即時 provider 或 channel 金鑰的情況下植入逼真的現有使用者檔案，使用內建的 `openclaw config set` 指令配方設定該基準，將該已發佈的安裝更新為打包的 OpenClaw tarball，以非互動方式執行 doctor，寫入 `.artifacts/upgrade-survivor/summary.json`，然後啟動回環 Gateway 並檢查設定的 intents、workspace/session 檔案、過時的外掛程式設定與舊版相依性狀態、啟動、`/healthz`、`/readyz` 以及 RPC 狀態是否能正常存續或修復。使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆寫某個基準，使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` (例如 `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`) 展開精確的本機矩陣，或使用 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues` 新增情境 fixtures；回報問題集包含 `configured-plugin-installs` 以驗證設定的外部 OpenClaw 外掛程式在升級期間會自動安裝，以及 `stale-source-plugin-shadow` 以防止僅來源的外掛程式影子破壞啟動。Package Acceptance 將這些公開為 `published_upgrade_survivor_baseline`、`published_upgrade_survivor_baselines` 和 `published_upgrade_survivor_scenarios`，並在將精確的套件規格傳遞給 Docker lanes 之前解析中繼基準 token (例如 `last-stable-4` 或 `all-since-2026.4.23`)。
- `pnpm test:docker:update-migration`：在著重清理的 `plugin-deps-cleanup` 情境中執行已發佈升級存留測試套件，預設從 `openclaw@2026.4.23` 開始。獨立的 `Update Migration` 工作流程使用 `baselines=all-since-2026.4.23` 擴展此通道，以便從 `.23` 開始的每個穩定已發佈套件都能更新到候選版本，並在完整版本 CI 之外證明設定外掛程式的相依性清理。
- `pnpm test:docker:plugins`：對本機路徑、`file:`、具有提升相依性的 npm registry 套件、git 移動 refs、ClawHub fixtures、marketplace 更新以及 Claude-bundle 啟用/檢查執行安裝/更新冒煙測試。

## Local PR gate

若要進行本機 PR 合併/閘道檢查，請執行：

- `pnpm check:changed`
- `pnpm check`
- `pnpm check:test-types`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

如果 `pnpm test` 在負載較高的主機上不穩定，請在將其視為回歸之前重新運行一次，然後使用 `pnpm test <path/to/test>` 進行隔離。對於記憶體受限的主機，請使用：

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## Model latency bench (local keys)

腳本：[`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

用法：

- `pnpm tsx scripts/bench-model.ts --runs 10`
- 可選環境變數：`MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`、`ANTHROPIC_API_KEY`
- 預設提示：「回覆一個單詞：ok。不要標點符號或多餘文字。」

上次執行 (2025-12-31，20 次執行)：

- minimax 中位數 1279ms (最小值 1114，最大值 2431)
- opus 中位數 2454ms (最小值 1224，最大值 3170)

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

- `startup`：`--version`、`--help`、`health`、`health --json`、`status --json`、`status`
- `real`: `health`, `status`, `status --json`, `sessions`, `sessions --json`, `tasks --json`, `tasks list --json`, `tasks audit --json`, `agents list --json`, `gateway status`, `gateway status --json`, `gateway health --json`, `config get gateway.port`
- `all`: 兩個預設值

輸出包含每個指令的 `sampleCount`、平均值、p50、p95、最小/最大值、退出代碼/訊號分佈，以及最大 RSS 摘要。可選的 `--cpu-prof-dir` / `--heap-prof-dir` 會在每次執行時寫入 V8 設定檔，以便計時和設定檔捕獲使用相同的測試工具。

儲存的輸出慣例：

- `pnpm test:startup:bench:smoke` 會在 `.artifacts/cli-startup-bench-smoke.json` 寫入目標的 smoke 構件
- `pnpm test:startup:bench:save` 會使用 `runs=5` 和 `warmup=1` 在 `.artifacts/cli-startup-bench-all.json` 寫入完整套件的構件
- `pnpm test:startup:bench:update` 會使用 `runs=5` 和 `warmup=1` 更新 `test/fixtures/cli-startup-bench.json` 已提交的基準測試夾具

已提交的夾具：

- `test/fixtures/cli-startup-bench.json`
- 使用 `pnpm test:startup:bench:update` 更新
- 使用 `pnpm test:startup:bench:check` 將目前結果與夾具進行比較

## Gateway 啟動基準測試

腳本：[`scripts/bench-gateway-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-gateway-startup.ts)

基準測試預設使用 `dist/entry.js` 中建置的 CLI 進入點；在使用 package-script 指令之前，請先執行
`pnpm build`。若要改為測量來源執行器，請傳遞 `--entry scripts/run-node.mjs` 並將那些結果與建置進入點的基準分開。

用法：

- `pnpm test:startup:gateway -- --runs 5 --warmup 1`
- `pnpm test:startup:gateway -- --case default --runs 10 --warmup 1`
- `pnpm test:startup:gateway -- --case skipChannels --case fiftyPlugins --runs 5`
- `node --import tsx scripts/bench-gateway-startup.ts --case default --runs 5 --output .artifacts/gateway-startup.json`
- `node --import tsx scripts/bench-gateway-startup.ts --case default --runs 3 --cpu-prof-dir .artifacts/gateway-startup-cpu`

案例 ID：

- `default`: 正常的 Gateway 啟動。
- `skipChannels`：略過通道啟動的 Gateway 啟動。
- `oneInternalHook`：一個已配置的內部掛鉤 (hook)。
- `allInternalHooks`：所有內部掛鉤 (hook)。
- `fiftyPlugins`：50 個清單外掛 (manifest plugins)。
- `fiftyStartupLazyPlugins`：50 個啟動延遲 的清單外掛。

輸出包含首次程序輸出、`/healthz`、`/readyz`、HTTP 監聽日誌時間、
Gateway 就緒日誌時間、CPU 時間、CPU 核心比率、最大 RSS、堆積、啟動追蹤
指標、事件迴圈延遲，以及外掛查找表詳細指標。該腳本
會在子 Gateway 環境中啟用 `OPENCLAW_GATEWAY_STARTUP_TRACE=1`。

將 `/healthz` 解讀為存活狀態：HTTP 伺服器可以回應。將 `/readyz` 解讀為
可用就緒狀態：啟動外掛 sidecars、通道和關鍵就緒的
附加後工作 已經完成。Gateway 啟動掛鉤是非同步
分派的，不屬於就緒保證的一部分。就緒日誌時間是
Gateway 的內部就緒日誌時間戳；它有助於程序端
歸因，但不能取代外部的 `/readyz` 探測。

在比較變更時，請使用 JSON 輸出或 `--output`。僅在追蹤
輸出指向匯入、編譯或 CPU 密集型工作，且無法僅透過階段計時
解釋時，才使用 `--cpu-prof-dir`。請勿將 source-runner 結果與
已建置的 `dist/entry.js` 結果作為相同的基準進行比較。

## Gateway 重新啟動基準測試

腳本：[`scripts/bench-gateway-restart.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-gateway-restart.ts)

重新啟動基準測試僅支援 macOS 和 Linux。它使用 SIGUSR1 進行
程序內重新啟動，並會在 Windows 上立即失敗。

該基準測試預設為 `dist/entry.js` 中已建置的 CLI 進入點；在使用
package-script 指令前，請先執行 `pnpm build`。若要改為測量
source runner，請傳遞 `--entry scripts/run-node.mjs` 並將這些結果
與已建置進入點的基準分開。

用法：

- `pnpm test:restart:gateway -- --case skipChannels --runs 1 --restarts 5`
- `pnpm test:restart:gateway -- --case default --runs 3 --restarts 3 --warmup 1`
- `pnpm test:restart:gateway -- --case skipChannelsAcpxProbe --case skipChannelsNoAcpxProbe --runs 1 --restarts 5`
- `node --import tsx scripts/bench-gateway-restart.ts --case fiftyPlugins --runs 1 --restarts 5 --output .artifacts/gateway-restart.json`
- `node --import tsx scripts/bench-gateway-restart.ts --json`

案例 ID：

- `skipChannels`：跳過通道的重啟。
- `skipChannelsAcpxProbe`：跳過通道且啟用 ACPX 啟動探測的重啟。
- `skipChannelsNoAcpxProbe`：跳過通道且關閉 ACPX 啟動探測的重啟。
- `default`：正常重啟。
- `fiftyPlugins`：帶有 50 個清單外掛程式的重啟。

輸出包含下一個 `/healthz`、下一個 `/readyz`、停機時間、重啟就緒時間、替換程序的啟動追蹤指標，以及用於信號處理、主動工作排空、關閉階段、下次啟動、就緒時間和記憶體快照的重啟追蹤指標。該腳本會在子 Gateway 環境中啟用 `OPENCLAW_GATEWAY_STARTUP_TRACE=1` 和 `OPENCLAW_GATEWAY_RESTART_TRACE=1`。

當變更涉及重啟信號、關閉處理程式、重啟後啟動、Sidecar 關閉、服務切換或重啟後就緒狀態時，請使用此基準測試。在將 Gateway 機制與通道啟動隔離時，請從 `skipChannels` 開始。僅當狹義案例解釋了重啟路徑後，才使用 `default` 或外掛程式繁重的案例。

追蹤指標是歸屬提示，而非結論。應從多個樣本、匹配的 owner span、`/healthz` 和 `/readyz` 行為以及使用者可見的重啟契約來判斷重啟變更。

## Onboarding E2E (Docker)

Docker 是可選的；這僅用於容器化的入門煙霧測試。

在乾淨的 Linux 容器中進行完整的冷啟動流程：

```bash
scripts/e2e/onboard-docker.sh
```

此腳本透過偽終端機驅動互動式精靈，驗證設定/工作區/會話檔案，然後啟動 gateway 並執行 `openclaw health`。

## QR import smoke (Docker)

確保維護的 QR 執行時輔助程式在受支援的 Docker Node 執行時（預設為 Node 24，相容於 Node 22）下載入：

```bash
pnpm test:docker:qr
```

## 相關

- [測試](/zh-Hant/help/testing)
- [即時測試](/zh-Hant/help/testing-live)
- [測試更新和外掛程式](/zh-Hant/help/testing-updates-plugins)
