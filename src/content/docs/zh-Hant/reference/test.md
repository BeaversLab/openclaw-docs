---
summary: "如何在本機執行測試（vitest）以及何時使用 force/coverage 模式"
read_when:
  - Running or fixing tests
title: "測試"
---

- 完整測試套件（套件、即時、Docker）：[測試](/zh-Hant/help/testing)
- 更新和外掛套件驗證：[測試更新與外掛](/zh-Hant/help/testing-updates-plugins)

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
- 程序 E2E 幫手：當 Vitest 程序層級的 E2E 測試需要在一個地方運行 Gateway、CLI 環境、日誌擷取和清理時，請使用 `test/helpers/openclaw-test-instance.ts`。
- Docker/Bash E2E 輔助工具：載入 `scripts/lib/docker-e2e-image.sh` 的通道可以將 `docker_e2e_test_state_shell_b64 <label> <scenario>` 傳遞到容器中並使用 `scripts/lib/openclaw-e2e-instance.sh` 對其進行解碼；多主機腳本可以傳遞 `docker_e2e_test_state_function_b64` 並在每個流程中呼叫 `openclaw_test_state_create <label> <scenario>`。底層呼叫者可以使用 `scripts/lib/openclaw-test-state.mjs shell --label <name> --scenario <name>` 來獲取容器內的 shell 程式碼片段，或使用 `node scripts/lib/openclaw-test-state.mjs -- create --label <name> --scenario <name> --env-file <path> --json` 來獲取可載入的主機環境檔案。`create` 之前的 `--` 可防止較新的 Node 執行時將 `--env-file` 視為 Node 標誌。啟動 Gateway 的 Docker/Bash 通道可以在容器內載入 `scripts/lib/openclaw-e2e-instance.sh`，用於入口點解析、模擬 OpenAI 啟動、Gateway 前台/後台啟動、就緒探測、狀態環境匯出、日誌傾印和程序清理。
- 完整、擴充功能和包含模式分片執行會更新 `.artifacts/vitest-shard-timings.json` 中的本地計時資料；後續的完整配置執行會使用這些計時資料來平衡慢速和快速分片。包含模式 CI 分片會將分片名稱附加到計時鍵，這樣可以在不替換完整配置計時資料的情況下保持已篩選分片的計時可見性。設定 `OPENCLAW_TEST_PROJECTS_TIMINGS=0` 可忽略本地計時產出資料。
- 選定的 `plugin-sdk` 和 `commands` 測試檔案現在會透過專用的輕量級通道進行路由，該通道僅保留 `test/setup.ts`，而將執行時繁重的案例保留在其現有通道上。
- 具有同級測試的原始檔案會在回退到更寬的目錄 glob 之前對應到該同級測試。`src/channels/plugins/contracts/test-helpers`、`src/plugin-sdk/test-helpers` 和 `src/plugins/contracts` 下的輔助編輯會使用本地匯入圖來執行匯入測試，而不是在相依性路徑精確時廣泛執行每個分片。
- `auto-reply` 現在也會拆分為三個專用配置（`core`、`top-level`、`reply`），以便回覆測試程式不會主導較輕量的頂層狀態/令牌/輔助測試。
- 基礎 Vitest 設定現在預設為 `pool: "threads"` 和 `isolate: false`，並在倉儲設定中啟用共用的非隔離執行器。
- `pnpm test:channels` 會執行 `vitest.channels.config.ts`。
- `pnpm test:extensions` 和 `pnpm test extensions` 會執行所有擴充功能/插件分片。繁重的頻道插件、瀏覽器插件和 OpenAI 以獨立分片執行；其他插件群組則維持批次執行。請使用 `pnpm test extensions/<id>` 來執行單一綑綁的插件通道。
- `pnpm test:perf:imports`：啟用 Vitest 的匯入持續時間與匯入細分報告，同時仍針對指定的檔案/目錄使用範圍通道路由。
- `pnpm test:perf:imports:changed`：同樣的匯入分析，但僅限自 `origin/main` 以來變更的檔案。
- `pnpm test:perf:changed:bench -- --ref <git-ref>` 會針對相同的 git 提交差異，將路由變更模式路徑與原生根專案執行進行基準測試。
- `pnpm test:perf:changed:bench -- --worktree` 會對目前工作樹的變更集進行基準測試，無需先提交。
- `pnpm test:perf:profile:main`：寫入 Vitest 主執行緒的 CPU 設定檔 (`.artifacts/vitest-main-profile`)。
- `pnpm test:perf:profile:runner`：寫入單元執行器的 CPU + heap 設定檔 (`.artifacts/vitest-runner-profile`)。
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json`：會序列執行每個完整測試套件的 Vitest 葉節點設定，並寫入分組的持續時間資料以及各設定的 JSON/日誌產物。測試效能代理程式會在嘗試修復緩慢測試前將此作為基準。
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json`：在針對效能進行變更後比較分組報告。
- Gateway 整合：透過 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 選擇加入。
- `pnpm test:e2e`：執行 Gateway 端對端冒煙測試 (多實例 WS/HTTP/node 配對)。預設為 `threads` + `isolate: false`，並在 `vitest.e2e.config.ts` 中使用適應性工作執行緒；可使用 `OPENCLAW_E2E_WORKERS=<n>` 進行調整，並設定 `OPENCLAW_E2E_VERBOSE=1` 以取得詳細日誌。
- `pnpm test:live`：執行提供者即時測試（minimax/zai）。需要 API 金鑰和 `LIVE=1`（或提供者特定的 `*_LIVE_TEST=1`）以取消跳過。
- `pnpm test:docker:all`：構建共享的 live-test 映像檔，將 OpenClaw 打包一次為 npm tarball，建置/重用基礎 Node/Git runner 映像檔以及將該 tarball 安裝到 `/app` 的功能映像檔，然後透過加權排程器使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行 Docker smoke lanes。基礎映像檔 (`OPENCLAW_DOCKER_E2E_BARE_IMAGE`) 用於安裝程式/更新/外掛相依性 lanes；這些 lanes 掛載預建的 tarball 而不使用複製的 repo 來源。功能映像檔 (`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`) 用於一般建置應用程式功能 lanes。`scripts/package-openclaw-for-docker.mjs` 是單一本機/CI 套件打包器，並在 Docker 使用之前驗證 tarball 與 `dist/postinstall-inventory.json`。Docker lane 定義位於 `scripts/lib/docker-e2e-scenarios.mjs`；規劃器邏輯位於 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 執行選定的計畫。`node scripts/test-docker-all.mjs --plan-json` 發出排程器擁有的 CI 計畫，用於選定的 lanes、映像種類、套件/live-image 需求、狀態場景與憑證檢查，而不建置或執行 Docker。`OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` 控制程序插槽並預設為 10；`OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` 控制供應商敏感的 tail pool 並預設為 10。Heavy lane 上限預設為 `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；供應商上限透過 `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT=4`、`OPENCLAW_DOCKER_ALL_LIVE_CODEX_LIMIT=4` 和 `OPENCLAW_DOCKER_ALL_LIVE_GEMINI_LIMIT=4` 預設為每個供應商一個 heavy lane。對於較大的主機，請使用 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。如果一個 lane 在低並行主機上超過有效權重或資源上限，它仍然可以從空池啟動，並將單獨執行直到釋放容量。Lane 啟動預設交錯 2 秒，以避免本機 Docker daemon 建立風暴；可透過 `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>` 覆寫。Runner 預設會預檢 Docker、清理過期的 OpenClaw E2E 容器、每 30 秒發出 active-lane 狀態、在相容的 lanes 之間共享供應商 CLI 工具快取、預設重試暫時性 live-provider 失敗一次 (`OPENCLAW_DOCKER_ALL_LIVE_RETRIES=<n>`)，並將 lane 計時儲存在 `.artifacts/docker-tests/lane-timings.json` 中，以便在後續執行時進行最長優先排序。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 列印 lane 資訊清單而不執行 Docker，使用 `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` 調整狀態輸出，或使用 `OPENCLAW_DOCKER_ALL_TIMINGS=0` 停用計時重用。使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=skip` 僅用於確定性/本機 lanes，或使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=only` 僅用於 live-provider lanes；套件別名為 `pnpm test:docker:local:all` 和 `pnpm test:docker:live:all`。Live-only 模式將主要和尾端 live lanes 合併為一個最長優先池，以便供應商貯存區可以將 Claude、Codex 和 Gemini 打包在一起。除非設定了 `OPENCLAW_DOCKER_ALL_FAIL_FAST=0`，否則 runner 會在第一次失敗後停止排程新的 pooled lanes，且每個 lane 都有 120 分鐘的後備逾時，可透過 `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` 覆寫；選定的 live/tail lanes 使用更嚴格的 per-lane 上限。CLI 後端 Docker 設定指令有自己的逾時，透過 `OPENCLAW_LIVE_CLI_BACKEND_SETUP_TIMEOUT_SECONDS` (預設 180)。Per-lane 日誌、`summary.json`、`failures.json` 和階段計時會寫入 `.artifacts/docker-tests/<run-id>/` 下；使用 `pnpm test:docker:timings <summary.json>` 檢查緩慢的 lanes，並使用 `pnpm test:docker:rerun <run-id|summary.json|failures.json>` 列印廉價的目標重跑指令。
- `pnpm test:docker:browser-cdp-snapshot`：構建一個基於 Chromium 的來源 E2E 容器，啟動原始 CDP 以及一個隔離的 Gateway，執行 `browser doctor --deep`，並驗證 CDP 角色快照包含連結 URL、游標促進的可點擊項目、iframe 參考以及框架中繼資料。
- `pnpm test:docker:skill-install`：在裸機 Docker 執行器中安裝打包好的 OpenClaw tarball，停用 `skills.install.allowUploadedArchives`，從即時 ClawHub 搜尋解析當前 skill slug，透過 `openclaw skills install` 安裝它，並驗證 `SKILL.md`、`.clawhub/origin.json`、`.clawhub/lock.json` 和 `skills info --json`。
- CLI 後端即時 Docker 探測可以作為專注的通道執行，例如 `pnpm test:docker:live-cli-backend:claude`、`pnpm test:docker:live-cli-backend:claude:resume` 或 `pnpm test:docker:live-cli-backend:claude:mcp`。Gemini 有對應的 `:resume` 和 `:mcp` 別名。
- `pnpm test:docker:openwebui`：啟動 Docker 化的 OpenClaw + Open WebUI，透過 Open WebUI 登入，檢查 `/api/models`，然後透過 `/api/chat/completions` 執行真實的代理聊天。這需要可用的即時模型金鑰，會拉取外部 Open WebUI 映像檔，並且預期不像一般單元/e2e 測試套件那樣在 CI 中保持穩定。
- `pnpm test:docker:mcp-channels`：啟動一個已設定種子的 Gateway 容器和一個產生 `openclaw mcp serve` 的第二個客戶端容器，然後透過真實的 stdio 橋接器驗證路由對話探索、紀錄讀取、附件中繼資料、即時事件佇列行為、輸出傳送路由，以及 Claude 風格的通道 + 權限通知。Claude 通知斷言會直接讀取原始 stdio MCP 框架，因此該冒煙測試反映了橋接器實際發出的內容。
- `pnpm test:docker:upgrade-survivor`：在髒舊用戶設定上安裝打包好的 OpenClaw tarball，在沒有即時提供者或通道金鑰的情況下執行套件更新和非互動式診斷，然後啟動一個迴路 Gateway 並檢查代理、通道配置、外掛允許清單、工作區/會話檔案、過時的舊版外掛相依性狀態、啟動和 RPC 狀態是否存活。
- `pnpm test:docker:published-upgrade-survivor`：預設安裝 `openclaw@latest`，植入不包含即時提供者或通道金鑰的逼真現有使用者檔案，使用內建的 `openclaw config set` 指令配方配置該基準，將該已發布的安裝更新為封裝好的 OpenClaw tarball，以非互動模式執行 doctor，寫入 `.artifacts/upgrade-survivor/summary.json`，然後啟動回環 Gateway 並檢查已配置的 intents、workspace/session 檔案、過時的外掛配置和舊版相依性狀態、啟動、`/healthz`、`/readyz` 和 RPC 狀態是否能正常存續或修復。使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆寫某個基準，使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`（例如 `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`）擴充精確的本機矩陣，或使用 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues` 新增情境裝置；回報問題集包含 `configured-plugin-installs` 以驗證配置的外部 OpenClaw 外掛是否在升級期間自動安裝，以及 `stale-source-plugin-shadow` 以防止僅原始碼外掛的影子檔案破壞啟動流程。Package Acceptance 將這些公開為 `published_upgrade_survivor_baseline`、`published_upgrade_survivor_baselines` 和 `published_upgrade_survivor_scenarios`，並在將精確的 package 規格傳遞給 Docker lanes 之前解析元基準權杖（例如 `last-stable-4` 或 `all-since-2026.4.23`）。
- `pnpm test:docker:update-migration`：在著重清理的 `plugin-deps-cleanup` 情境中執行已發布升級存留性測試，預設從 `openclaw@2026.4.23` 開始。獨立的 `Update Migration` 工作流程使用 `baselines=all-since-2026.4.23` 擴充此通道，以便從 `.23` 開始的每個穩定已發布套件都能更新至候選版本，並在完整 Release CI 之外驗證已配置外掛的相依性清理。
- `pnpm test:docker:plugins`：針對本機路徑、`file:`、具有提升相依性的 npm registry 套件、git 移動 refs、ClawHub 裝置、marketplace 更新以及 Claude-bundle 啟用/檢查執行安裝/更新冒煙測試。

## 本機 PR 閘道

若要執行本機 PR 合併/閘道檢查，請執行：

- `pnpm check:changed`
- `pnpm check`
- `pnpm check:test-types`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

如果 `pnpm test` 在負載較高的主機上出現不穩定，請先重新執行一次再將其視為回歸，然後使用 `pnpm test <path/to/test>` 進行隔離。對於記憶體受限的主機，請使用：

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## 模型延遲基準測試（本地金鑰）

腳本：[`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

用法：

- `pnpm tsx scripts/bench-model.ts --runs 10`
- 可選環境變數：`MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`, `ANTHROPIC_API_KEY`
- 預設提示詞：「用一個單詞回覆：ok。不要標點符號或額外文字。」

最近一次執行 (2025-12-31, 20 次執行)：

- minimax 中位數 1279ms (最小 1114, 最大 2431)
- opus 中位數 2454ms (最小 1224, 最大 3170)

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
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case tasksJson --case tasksListJson --case tasksAuditJson --runs 3`
- `pnpm tsx scripts/bench-cli-startup.ts --entry openclaw.mjs --entry-secondary dist/entry.js --preset all`
- `pnpm tsx scripts/bench-cli-startup.ts --preset all --output .artifacts/cli-startup-bench-all.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case gatewayStatusJson --output .artifacts/cli-startup-bench-smoke.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --cpu-prof-dir .artifacts/cli-cpu`
- `pnpm tsx scripts/bench-cli-startup.ts --json`

預設：

- `startup`: `--version`, `--help`, `health`, `health --json`, `status --json`, `status`
- `real`: `health`、`status`、`status --json`、`sessions`、`sessions --json`、`tasks --json`、`tasks list --json`、`tasks audit --json`、`agents list --json`、`gateway status`、`gateway status --json`、`gateway health --json`、`config get gateway.port`
- `all`: 兩個預設集

輸出包含每個指令的 `sampleCount`、平均、p50、p95、最小/最大、退出碼/訊號分佈以及最大 RSS 摘要。可選的 `--cpu-prof-dir` / `--heap-prof-dir` 會在每次執行時寫入 V8 設定檔，以便計時與設定檔擷取使用相同的測試工具。

已儲存的輸出慣例：

- `pnpm test:startup:bench:smoke` 將目標的 artifact 寫入 `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` 使用 `runs=5` 和 `warmup=1` 將完整測試套件的 artifact 寫入 `.artifacts/cli-startup-bench-all.json`
- `pnpm test:startup:bench:update` 使用 `runs=5` 和 `warmup=1` 更新 `test/fixtures/cli-startup-bench.json` 中簽入的 baseline fixture

已簽入的 fixture：

- `test/fixtures/cli-startup-bench.json`
- 使用 `pnpm test:startup:bench:update` 更新
- 使用 `pnpm test:startup:bench:check` 將當前結果與 fixture 比對

## Onboarding E2E (Docker)

Docker 是選用的；這僅需要用於容器化的 onboarding 測試。

在乾淨的 Linux 容器中進行完整的冷啟動流程：

```bash
scripts/e2e/onboard-docker.sh
```

此腳本透過 pseudo-tty 驅動互動式精靈，驗證 config/workspace/session 檔案，然後啟動 gateway 並執行 `openclaw health`。

## QR import smoke (Docker)

確保維護的 QR runtime helper 可在支援的 Docker Node runtime 下載入（Node 24 預設，Node 22 相容）：

```bash
pnpm test:docker:qr
```

## 相關

- [測試](/zh-Hant/help/testing)
- [即時測試](/zh-Hant/help/testing-live)
- [測試更新與外掛](/zh-Hant/help/testing-updates-plugins)
