---
summary: "CI job graph, scope gates, release umbrellas, and local command equivalents"
title: "CI pipeline"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging a failing GitHub Actions check
  - You are coordinating a release validation run or rerun
  - You are changing ClawSweeper dispatch or GitHub activity forwarding
---

OpenClaw CI 會在每次推送到 `main` 和每個 Pull Request 時執行。`preflight` 任務會對差異進行分類，並在只有不相關區域變更時關閉昂貴的通道。手動 `workflow_dispatch` 執行會刻意繞過智慧範圍設定，並為發行候選版本和廣泛驗證展開完整的圖譜。Android 通道透過 `include_android` 保持選擇加入。僅限發行版本的插件涵蓋範圍位於獨立的 [`Plugin Prerelease`](#plugin-prerelease) 工作流程中，且僅從 [`Full Release Validation`](#full-release-validation) 或明確的手動觸發執行。

## 管道概覽

| 工作                               | 用途                                                                             | 執行時機                     |
| ---------------------------------- | -------------------------------------------------------------------------------- | ---------------------------- |
| `preflight`                        | 偵測僅文件變更、變更範圍、變更擴充功能，並建構 CI 清單                           | 總是在非草稿推送與 PR 上執行 |
| `security-fast`                    | 私鑰偵測、透過 `zizmor` 進行的工作流程變更稽核，以及正式環境鎖定檔稽核           | 總是在非草稿推送與 PR 上執行 |
| `check-dependencies`               | Production Knip 僅依賴項目傳遞以及未使用檔案允許清單防護                         | Node 相關變更                |
| `build-artifacts`                  | 建構 `dist/`、控制 UI、內建 CLI 的煙霧測試、內建構件的檢查，以及可重複使用的構件 | Node 相關變更                |
| `checks-fast-core`                 | 快速的 Linux 正確性通道，例如 bundle、protocol 和 CI-routing 檢查                | Node 相關變更                |
| `checks-fast-contracts-plugins-*`  | 兩個分片的插件合約檢查                                                           | Node 相關變更                |
| `checks-fast-contracts-channels-*` | 兩個分片的通道合約檢查                                                           | Node 相關變更                |
| `checks-node-core-*`               | 核心 Node 測試分片，排除 channel、bundled、contract 和 extension 通道            | Node 相關變更                |
| `check-*`                          | 分片的主要本地閘道同等項目：prod types、lint、guards、test types 和 strict smoke | Node 相關變更                |
| `check-additional-*`               | 架構、分片邊界/提示漂移、擴充功能防護、套件邊界和執行時期拓撲                    | 與 Node 相關的變更           |
| `checks-node-compat-node22`        | Node 22 相容性建置和燒錄通道                                                     | 用於發行的手動 CI 分派       |
| `check-docs`                       | 文件格式、lint 和中斷連結檢查                                                    | 文件已變更                   |
| `skills-python`                    | 用於 Python 支援技能的 Ruff + pytest                                             | Python 技能相關變更          |
| `checks-windows`                   | Windows 特定的程序/路徑測試以及共用的執行時期匯入指定詞迴歸                      | Windows 相關變更             |
| `macos-node`                       | 使用共用建置產物 macOS TypeScript 測試通道                                       | macOS 相關變更               |
| `macos-swift`                      | macOS 應用程式的 Swift Lint、建置與測試                                          | macOS 相關變更               |
| `android`                          | 針對兩種風格的 Android 單元測試加上一個 Debug APK 建置                           | Android 相關變更             |
| `test-performance-agent`           | 受信任活動後的每日 Codex 慢速測試最佳化                                          | 主要 CI 成功或手動觸發       |
| `openclaw-performance`             | 每日/按需 Kova 執行時效能報告，包含模擬供應商、深度分析與 GPT 5.5 即時通道       | 排程與手動觸發               |

## 快速失敗順序

1. `preflight` 決定了哪些通道會存在。`docs-scope` 和 `changed-scope` 邏輯是此任務內的步驟，而非獨立的任務。
2. `security-fast`、`check-*`、`check-additional-*`、`check-docs` 和 `skills-python` 會快速失敗，無需等待較重的構件和平台矩陣作業。
3. `build-artifacts` 與快速 Linux 軌道重疊，以便下游取用者可以在共用構件準備就緒後立即開始。
4. 較重的平台和執行時期軌道隨後展開：`checks-fast-core`、`checks-fast-contracts-plugins-*`、`checks-fast-contracts-channels-*`、`checks-node-core-*`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

當較新的推送抵達相同的 PR 或 `main` 參照時，GitHub 可能會將被取代的作業標記為 `cancelled`。除非相同參照的最新執行也失敗，否則請將其視為 CI 雜訊。矩陣作業使用 `fail-fast: false`，而 `build-artifacts` 會直接回報內嵌通道、核心支援邊界和閘道監視失敗，而不是將微小的驗證作業排入佇列。自動 CI 並行鍵已加上版本號 (`CI-v7-*`)，因此 GitHub 端舊佇列群組中的殭屍程序無法無限期封鎖較新的 main 執行。手動完整套件執行使用 `CI-manual-v1-*`，且不會取消進行中的執行。

使用 `pnpm ci:timings`、`pnpm ci:timings:recent` 或 `node scripts/ci-run-timings.mjs <run-id>` 來摘要牆上時間、佇列時間、最慢的作業、失敗情況以及來自 GitHub Actions 的 `pnpm-store-warmup` 展開屏障。CI 也會將相同的執行摘要上傳為 `ci-timings-summary` 構件。若要查看建置時序，請檢查 `build-artifacts` 作業的 `Build dist` 步驟：`pnpm build:ci-artifacts` 會列印 `[build-all] phase timings:` 並包含 `ui:build`；該作業也會上傳 `startup-memory` 構件。

對於 Pull Request 執行，終端的 timing-summary job 會先從受信任的 base revision 執行 helper，然後將 `GH_TOKEN` 傳遞給 `gh run view`。這確保了帶有 token 的查詢不會出現在由分支控制的程式碼中，同時仍能彙總 Pull Request 目前的 CI 執行情況。

## 實際行為證明

外部貢獻者的 PR 會從 `.github/workflows/real-behavior-proof.yml` 執行 `Real behavior proof` 閘道。該工作流程會 checkout 受信任的 base commit 並僅評估 PR 內文；它不會執行來自貢獻者分支的程式碼。

此閘道適用於非 repository 擁有者、成員、協作者或機器人的 PR 作者。當 PR 內文包含填寫了以下值的 `Real behavior proof` 區塊時，即會通過：

- `Behavior or issue addressed`
- `Real environment tested`
- `Exact steps or command run after this patch`
- `Evidence after fix`
- `Observed result after fix`
- `What was not tested`

證據必須顯示修補程式在真實 OpenClaw 環境中套用後的行為變化。螢幕截圖、錄製畫面、終端機擷取、主控台輸出、複製的即時輸出、編輯過的執行時期日誌以及連結的成品皆算數。單元測試、模擬物件、快照、Lint、型別檢查和 CI 結果都是有用的輔助驗證，但它們本身並不足以滿足此閘門要求。

當檢查失敗時，請更新 PR 內文，而非推送另一個程式碼提交。維護者僅在證明閘道不適用於該 PR 時，才能套用 `proof: override`。

## 範圍與路由

範圍邏輯位於 `scripts/ci-changed-scope.mjs` 中，並由 `src/scripts/ci-changed-scope.test.ts` 中的單元測試覆蓋。手動分派會跳過變更範圍偵測，並讓 preflight manifest 表現得就像每個範圍區域都已變更一樣。

- **CI 工作流程編輯**會驗證 Node CI 圖形以及工作流程 Lint，但本身不會強制執行 Windows、Android 或 macOS 原生建置；這些平台路徑仍保持針對平台原始碼變更的範圍限定。
- **Workflow Sanity** 會對所有 workflow YAML 檔案執行 `actionlint`、`zizmor`、composite action 插值防護 以及衝突標記防護。範圍僅限 PR 的 `security-fast` job 也會對變更的 workflow 檔案執行 `zizmor`，以便在工作流程安全問題於主要 CI 圖表中失敗前提早發現。
- **在 `main` 推送上的 Docs** 會由獨立的 `Docs` workflow 檢查，並使用與 CI 相同的 ClawHub docs 鏡像，因此混合程式碼與文件的推送不會再將 CI `check-docs` shard 排入佇列。Pull request 和手動 CI 仍會在文件變更時從 CI 執行 `check-docs`。
- **TUI PTY** 是針對 TUI 變更的專注工作流程。它在 Linux Node 24 上針對 `src/tui/**`、watch harness、package script、lockfile 以及工作流程編輯執行 `node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts`。必要通道使用確定性的 `TuiBackend` fixture；較慢的 `tui --local` smoke 則透過 `OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1` 選擇性加入，並僅模擬外部 model endpoint。
- **僅 CI routing 的編輯、選定的低成本 core-test fixture 編輯，以及狹隘的 plugin contract helper/test-routing 編輯** 使用僅包含 Node 的快速 manifest 路徑：`preflight`、security 以及單一 `checks-fast-core` task。當變更僅限於該 fast task 直接執行的 routing 或 helper 介面時，該路徑會略過 build artifacts、Node 22 相容性、channel contracts、完整的 core shards、bundled-plugin shards 以及額外的 guard matrices。
- **Windows Node checks** 的範圍限於 Windows 特定的 process/path wrappers、npm/pnpm/UI runner helpers、package manager config，以及執行該通道的 CI workflow 介面；不相關的 source、plugin、install-smoke 以及僅測試變更仍保持在 Linux Node lanes 上執行。

最慢的 Node 測試系列經過拆分或平衡，確保每個任務保持小型，不會過度保留 Runner：插件合約和頻道合約各自作為兩個加權的 Blacksmith 支援分片運行，並以標準 GitHub Runner 作為後備，核心單元 fast/support 軌道分開運行，核心 runtime 基礎架構拆分為 state、process/config、shared 和三個 cron domain 分片，auto-reply 以平衡 worker 運行（其中 reply 子樹拆分為 agent-runner、dispatch 和 commands/state-routing 分片），而 agentic gateway/server 配置則拆分到 chat/auth/model/http-plugin/runtime/startup 軌道，而不是等待構建產物。廣泛的瀏覽器、QA、媒體和雜項插件測試使用其專用的 Vitest 配置，而不是共享的插件全能配置。Include-pattern 分片使用 CI 分片名稱記錄計時條目，因此 `.artifacts/vitest-shard-timings.json` 可以區分完整配置與過濾後的分片。`check-additional-*` 將 package-boundary compile/canary 工作保持在一起，並將 runtime 拓撲架構與 gateway watch 覆蓋範圍分開；boundary guard 列表被條紋化為一個 prompt-heavy 分片和一個用於其餘 guard stripes 的組合分片，每個分片並發運行選定的獨立 guard 並列印每個檢查的計時。昂貴的 Codex happy-path prompt snapshot drift 檢查僅針對手動 CI 和影響 prompt 的變更作為額外任務運行，因此正常的無關 Node 變更不會等待冷 prompt snapshot 生成，而 boundary 分片保持平衡，同時 prompt drift 仍固定在導致它的 PR 上；同一標誌會跳過 built-artifact core support-boundary 分片內的 prompt snapshot Vitest 生成。Gateway watch、頻道測試和核心 support-boundary 分片在 `build-artifacts` 內並發運行，前提是 `dist/` 和 `dist-runtime/` 已經構建完成。

Android CI 會同時執行 `testPlayDebugUnitTest` 和 `testThirdPartyDebugUnitTest`，然後建置 Play debug APK。第三方變體沒有獨立的 source set 或 manifest；其單元測試通道仍然會使用 SMS/call-log BuildConfig flags 來編譯該變體，同時避免在每次與 Android 相關的推送上執行重複的 debug APK 打包工作。

`check-dependencies` 分片會執行 `pnpm deadcode:dependencies`（這是釘選到最新 Knip 版本的 production Knip 僅相依性傳遞，並針對 `dlx` 安裝停用了 pnpm 的最短發行年限）和 `pnpm deadcode:unused-files`，後者會將 Knip 的 production 未使用檔案發現與 `scripts/deadcode-unused-files.allowlist.mjs` 進行比對。當 PR 新增未經審查的未使用檔案或留有過期的允許清單項目時，未使用檔案防護就會失敗，同時保留 Knip 無法靜態解析的刻意動態外掛、生成、建置、即時測試和套件橋接介面。

## ClawSweeper 活動轉發

`.github/workflows/clawsweeper-dispatch.yml` 是從 OpenClaw 存放庫活動到 ClawSweeeper 的目標端橋接器。它不會檢出或執行不受信任的 PR 程式碼。此工作流程會從 `CLAWSWEEPER_APP_PRIVATE_KEY` 建立 GitHub App 權杖，然後將精簡的 `repository_dispatch` payload 分派給 `openclaw/clawsweeper`。

此工作流程有四個通道：

- `clawsweeper_item` 用於確切的 issue 和 pull request 審查請求；
- `clawsweeper_comment` 用於 issue 留言中的明確 ClawSweeeper 指令；
- `clawsweeper_commit_review` 用於 `main` 推送上的提交層級審查請求；
- `github_activity` 用於 ClawSweeeper 代理程式可能檢查的一般 GitHub 活動。

`github_activity` 通道僅轉發正規化後的中繼資料：事件類型、動作、執行者、存放庫、項目編號、URL、標題、狀態，以及留言或審查（如有）的簡短摘錄。它刻意避免轉發完整的 webhook 內文。`openclaw/clawsweeper` 中的接收工作流程是 `.github/workflows/github-activity.yml`，它會將正規化事件發佈至給 ClawSweeeper 代理程式的 OpenClaw Gateway hook。

一般性活動屬於觀察性質，而非預設進行傳遞。ClawSweeper 代理程式會在其提示中接收 Discord 目標，並且僅在事件令人意外、可採取行動、具有風險或具有運營用途時才發布至 `#clawsweeper`。常規的開啟、編輯、機器人變動、重複的 webhook 噪音以及正常的審查流量應導致 `NO_REPLY`。

在此路徑中，應將 GitHub 標題、評論、內容、審查文字、分支名稱和提交訊息視為不受信任的資料。它們是用於摘要和分診的輸入，而非工作流程或代理程式執行時的指令。

## 手動調度

手動 CI 調度運行與正常 CI 相同的作業圖，但強制開啟每個非 Android 範圍的通道：Linux Node 分片、捆綁外掛分片、外掛和通道合約分片、Node 22 相容性、`check-*`、`check-additional-*`、建構成品冒煙檢查、文件檢查、Python 技能、Windows、macOS 和 Control UI i18n。獨立的手動 CI 調度僅使用 `include_android=true` 運行 Android；完整的發行版傘狀架構通過傳遞 `include_android=true` 來啟用 Android。外掛預發行靜態檢查、僅發行版的 `agentic-plugins` 分片、完整擴充套件批次掃描以及外掛預發行 Docker 通道不包含在 CI 中。Docker 預發行套件僅在 `Full Release Validation` 調度單獨的 `Plugin Prerelease` 工作流程並啟用 release-validation 閘道時才會運行。

手動運行使用唯一的併發組，以免發行候選完整套件被同一 ref 上的另一個推送或 PR 運行取消。可選的 `target_ref` 輸入允許受信任的呼叫者在分支、標籤或完整提交 SHA 上運行該圖，同時使用所選調度 ref 中的工作流程檔案。

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## Runners

| Runner                           | 作業                                                                                                                                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | 手動 CI 調度和非正式儲存庫後備、workflow-sanity、labeler、auto-response、CI 外的文件工作流程，以及 install-smoke 預檢，以便 Blacksmith 矩陣可以更早排隊                                                     |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`、`preflight`、`security-fast`、較低權重的擴充分片、`checks-fast-core`、外掛/通道合約分片、`checks-node-compat-node22`、`check-guards`、`check-prod-types` 以及 `check-test-types` |
| `blacksmith-8vcpu-ubuntu-2404`   | Linux Node 測試分片、捆綁外掛測試分片、`check-additional-*` 分片、`check-dependencies` 以及 `android`                                                                                                       |
| `blacksmith-16vcpu-ubuntu-2404`  | `build-artifacts`、`check-lint`（對 CPU 敏感度高，8 個 vCPU 的成本高於其節省的費用）；install-smoke Docker 建置（32 個 vCPU 的佇列時間成本高於其節省的費用）                                                |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                            |
| `blacksmith-6vcpu-macos-15`      | `macos-node` 於 `openclaw/openclaw` 上；Fork 會回退至 `macos-15`                                                                                                                                            |
| `blacksmith-12vcpu-macos-26`     | `macos-swift` 於 `openclaw/openclaw` 上；Fork 會回退至 `macos-26`                                                                                                                                           |

Canonical repository CI 將 Blacksmith 保留為一般推送和 Pull Request 執行的預設 Runner 路徑。`workflow_dispatch` 和非 Canonical repository 執行使用 GitHub 託管的 Runner，但一般 Canonical 執行目前不會偵測 Blacksmith 佇列狀態，或在 Blacksmith 無法使用時自動回退至 GitHub 託管的標籤。

## 本地對等項

```bash
pnpm changed:lanes                            # inspect the local changed-lane classifier for origin/main...HEAD
pnpm check:changed                            # smart local check gate: changed typecheck/lint/guards by boundary lane
pnpm check                                    # fast local gate: prod tsgo + sharded lint + parallel fast guards
pnpm check:test-types
pnpm check:timed                              # same gate with per-stage timings
pnpm build:strict-smoke
pnpm check:architecture
pnpm test:gateway:watch-regression
node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts
pnpm test                                     # vitest tests
pnpm test:changed                             # cheap smart changed Vitest targets
pnpm test:channels
pnpm test:contracts:channels
pnpm check:docs                               # docs format + lint + broken links
pnpm build                                    # build dist when CI artifact/smoke checks matter
pnpm ci:timings                               # summarize the latest origin/main push CI run
pnpm ci:timings:recent                        # compare recent successful main CI runs
node scripts/ci-run-timings.mjs <run-id>      # summarize wall time, queue time, and slowest jobs
node scripts/ci-run-timings.mjs --latest-main # ignore issue/comment noise and choose origin/main push CI
node scripts/ci-run-timings.mjs --recent 10   # compare recent successful main CI runs
pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json
pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json
pnpm test:startup:memory
pnpm test:extensions:memory -- --json .artifacts/openclaw-performance/source/mock-provider/extension-memory.json
pnpm perf:kova:summary --report .artifacts/kova/reports/mock-provider/report.json --output .artifacts/kova/summary.md
```

## OpenClaw 效能

`OpenClaw Performance` 是產品/執行時效能工作流程。它每日在 `main` 上執行，並可手動觸發：

```bash
gh workflow run openclaw-performance.yml --ref main -f profile=diagnostic -f repeat=3
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_openai_candidate=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

手動觸發通常會對工作流程 ref 進行基準測試。設定 `target_ref` 以使用目前的工作流程實作對發行標籤或其他分支進行基準測試。已發佈的報表路徑和最新指標會以受測 ref 為鍵值，且每個 `index.md` 都會記錄受測 ref/SHA、工作流程 ref/SHA、Kova ref、設定檔、Lane 授權模式、模型、重複計數以及場景篩選器。

該工作流程從固定版本安裝 OCM，並在固定的 `kova_ref` 輸入處從 `openclaw/Kova` 安裝 Kova，然後執行三個通道：

- `mock-provider`：針對使用確定性偽造 OpenAI 相容認證的本機建構執行環境，執行 Kova 診診斷場景。
- `mock-deep-profile`：針對啟動、閘道和 agent 週期熱點進行 CPU/heap/追蹤分析。
- `live-openai-candidate`：真實的 OpenAI `openai/gpt-5.5` agent 週期，當 `OPENAI_API_KEY` 不可用時會跳過。

mock-provider 通道也會在 Kova 執行完畢後執行 OpenClaw 原生源探測：閘道開機時序和記憶體（涵蓋預設、hook 和 50 個外掛程式啟動案例）；套件外掛程式匯入 RSS、重複的 mock-OpenAI `channel-chat-baseline` hello 迴圈，以及針對已啟動閘道的 CLI 啟動指令。當受測 ref 有先前發布的 mock-provider 來源報告可用時，來源摘要會比較當前的 RSS 和 heap 值與該基準，並將大幅增加的 RSS 標記為 `watch`。來源探測的 Markdown 摘要位於報告套件中的 `source/index.md`，旁邊附有原始 JSON。

每個通道都會上傳 GitHub 成品。當設定 `CLAWGRIT_REPORTS_TOKEN` 時，工作流程也會將 `report.json`、`report.md`、套件、`index.md` 和來源探測成品提交到 `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/` 下的 `openclaw/clawgrit-reports`。當前的受測 ref 指標會被寫入為 `openclaw-performance/<tested-ref>/latest-<lane>.json`。

## 完整版本驗證

`Full Release Validation` 是「發布前執行所有項目」的手動總管工作流程。它接受分支、標籤或完整的提交 SHA，以該目標分發手動 `CI` 工作流程，分發 `Plugin Prerelease` 以進行僅限發布的外掛/套件/靜態/Docker 驗證，並分發 `OpenClaw Release Checks` 以進行安裝冒煙測試、套件驗收、跨作業系統套件檢查、QA Lab 一致性、Matrix 和 Telegram 通道。穩定/預設執行會將徹底的 live/E2E 和 Docker 發布路徑覆蓋率保留在 `run_release_soak=true` 之後；`release_profile=full` 會強制開啟該覆蓋率，使廣泛的諮詢驗證保持廣泛。使用 `rerun_group=all` 和 `release_profile=full` 時，它也會針對發布檢查中的 `release-package-under-test` 成果執行 `NPM Telegram Beta E2E`。發布後，傳遞 `release_package_spec` 以在發布檢查、套件驗收、Docker、跨作業系統和 Telegram 之間重複使用已發布的 npm 套件，無需重新建置。僅當 Telegram 必須驗證不同的套件時才使用 `npm_telegram_package_spec`。Codex 外掛 live 套件通道預設使用相同的選取狀態：已發布的 `release_package_spec=openclaw@<tag>` 推導出 `codex_plugin_spec=npm:@openclaw/codex@<tag>`，而 SHA/成果執行則從選取的 ref 打包 `extensions/codex`。針對自訂外掛來源（例如 `npm:`、`npm-pack:` 或 `git:` 規格），請明確設定 `codex_plugin_spec`。

請參閱 [完整發布驗證](/zh-Hant/reference/full-release-validation) 以了解階段矩陣、確切的工作流程作業名稱、設定檔差異、成果及專注的重新執行處理程序。

`OpenClaw Release Publish` 是手動變更發佈的工作流程。在發佈標籤存在且 OpenClaw npm 預檢成功後，請從 `release/YYYY.M.D` 或 `main` 觸發它。它會驗證 `pnpm plugins:sync:check`，為所有可發佈的外掛套件觸發 `Plugin NPM Release`，為相同的發佈 SHA 觸發 `Plugin ClawHub Release`，然後才會使用儲存的 `preflight_run_id` 觸發 `OpenClaw NPM Release`。

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

若要在快速變動的分支上取得釘選提交的證明，請使用輔助程式代替 `gh workflow run ... --ref main -f ref=<sha>`：

```bash
pnpm ci:full-release --sha <full-sha>
```

GitHub workflow dispatch 參照必須是分支或標籤，而不是原始的 commit SHA。輔助程式會在目標 SHA 推送一個暫時性的 `release-ci/<sha>-...` 分支，從該釘選的參照觸發 `Full Release Validation`，驗證每個子工作流程 `headSha` 是否符合目標，並在執行完成時刪除暫時分支。如果任何子工作流程在不同的 SHA 上執行，整體驗證器也會失敗。

`release_profile` 控制傳入發佈檢查的 live/provider 廣度。手動發佈工作流程預設為 `stable`；僅當您故意想要廣泛的 advisory provider/media 矩陣時，才使用 `full`。`run_release_soak` 控制穩定/預設發佈檢查是否執行完整的 live/E2E 和 Docker 發佈路徑 soak；`full` 會強制啟用 soak。

- `minimum` 保留最快的 OpenAI/core 發佈關鍵通道。
- `stable` 新增穩定的 provider/backend 集合。
- `full` 執行廣泛的 advisory provider/media 矩陣。

整體工作流程會記錄已觸發的子執行 ID，而最終的 `Verify full validation` 工作會重新檢查目前的子執行結論，並為每個子執行附加最慢工作表格。如果子工作流程被重新執行並變為綠燈（通過），請僅重新執行父驗證器工作，以重新整理整體結果和計時摘要。

為了復原，`Full Release Validation` 和 `OpenClaw Release Checks` 都接受 `rerun_group`。針對發行候選版本，請使用 `all`；若僅針對一般完整 CI 子作業，請使用 `ci`；若僅針對外掛程式预發行子作業，請使用 `plugin-prerelease`；若針對每個發行子作業，請使用 `release-checks`；或針對在集線器上的較狹窄群組使用：`install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 或 `npm-telegram`。這樣可在進行重點修復後，限制失敗的發行箱重新執行的範圍。若為單一失敗的跨 OS 通道，請將 `rerun_group=cross-os` 與 `cross_os_suite_filter` 結合，例如 `windows/packaged-upgrade`；長時間的跨 OS 指令會輸出心跳行，而套件升級摘要會包含各階段的時序。QA 發行檢查通道屬於建議性質，標準執行階段工具覆蓋率閘道除外，當必要的 OpenClaw 動態工具從標準層級摘要中偏移或消失時，該閘道會進行封鎖。

`OpenClaw Release Checks` 使用受信任的工作流程參照，將選取的參照解析一次為 `release-package-under-test` tarball，然後將該成品傳遞給跨 OS 檢查和套件驗收，以及當 soak 覆蓋率執行時的即時/E2E 發行路徑 Docker 工作流程。這可讓套件位元組在發行箱之間保持一致，並避免在多個子作業中重新封裝相同的候選版本。對於 Codex npm-plugin 即時通道，發行檢查可能會傳遞衍生自 `release_package_spec` 的相符已發行外掛規格、傳遞操作員提供的 `codex_plugin_spec`，或是將輸入留白，讓 Docker 腳本封裝選取簽出版本的 Codex 外掛程式。

針對 `ref=main` 和 `rerun_group=all` 的重複 `Full Release Validation` 執行會取代較舊的總覽。當父項被取消時，父項監視器會取消它已分派的所有子工作流程，因此較新的 main 驗證不會卡在過時的兩小時 release-check 執行之後。Release 分支/tag 驗證和專注的重新執行群組會保留 `cancel-in-progress: false`。

## Live 與 E2E 分片

Release live/E2E 子項保持廣泛的原生 `pnpm test:live` 涵蓋範圍，但它透過 `scripts/test-live-shard.mjs` 以命名分片的方式執行，而不是單一的序列任務：

- `native-live-src-agents`
- `native-live-src-gateway-core`
- 依提供者過濾的 `native-live-src-gateway-profiles` 任務
- `native-live-src-gateway-backends`
- `native-live-test`
- `native-live-extensions-a-k`
- `native-live-extensions-l-n`
- `native-live-extensions-openai`
- `native-live-extensions-o-z-other`
- `native-live-extensions-xai`
- 分割媒體音訊/視訊分片和依提供者過濾的音樂分片

這在保持相同檔案涵蓋範圍的同時，讓緩慢的 live 提供者失敗更容易重新執行和診斷。彙總的 `native-live-extensions-o-z`、`native-live-extensions-media` 和 `native-live-extensions-media-music` 分片名稱仍可用於手動一次性重新執行。

原生 live 媒體分片在 `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04` 中執行，由 `Live Media Runner Image` 工作流程建構。該映像檔預先安裝 `ffmpeg` 和 `ffprobe`；媒體任務僅在設定前驗證二進位檔。請將 Docker 支援的 live 套件保留在一般 Blacksmith 執行器上 — 容器任務不是啟動巢狀 Docker 測試的正確位置。

Docker 支援的即時模型/後端分片針對每個選定的提交使用獨立的共用 `ghcr.io/openclaw/openclaw-live-test:<sha>` 映像檔。即時發佈工作流程會建構並推送該映像檔一次，然後 Docker 即時模型、供應商分片的閘道、CLI 後端、ACP 繫結 和 Codess 測試線束 分片會使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行。閘道 Docker 分片在腳本層級攜帶了明確的低於工作流程工作逾時的 `timeout` 上限，以便卡住的容器或清理路徑能快速失敗，而不是消耗整個發佈檢查的預算。如果這些分片獨立地重建完整的原始碼 Docker 目標，則表示發佈執行設定錯誤，並將在重複的映像檔建構上浪費實際時間。

## 套件驗收

當問題是「這個可安裝的 OpenClaw 套件能否作為產品正常運作？」時，請使用 `Package Acceptance`。這與一般的 CI 不同：一般的 CI 驗證原始碼樹，而套件驗收則是透過使用者在安裝或更新後使用的相同 Docker E2E 測試線束來驗證單一 tarball。

### 工作

1. `resolve_package` 會取出 `workflow_ref`、解析一個套件候選、寫入 `.artifacts/docker-e2e-package/openclaw-current.tgz`、寫入 `.artifacts/docker-e2e-package/package-candidate.json`，將兩者作為 `package-under-test` 構件上傳，並在 GitHub 步驟摘要中列印來源、工作流程參照、套件參照、版本、SHA-256 和設定檔。
2. `docker_acceptance` 會使用 `ref=workflow_ref` 和 `package_artifact_name=package-under-test` 呼叫 `openclaw-live-and-e2e-checks-reusable.yml`。可重用的工作流程會下載該構件、驗證 tarball 清單、在需要時準備套件摘要 Docker 映像檔，並針對該套件執行選定的 Docker 通道，而不是打包工作流程的取出內容。當設定檔選取多個目標 `docker_lanes` 時，可重用的工作流程會準備一次套件和共用映像檔，然後將這些通道作為具有唯一構件的平行目標 Docker 工作展開。
3. `package_telegram` 可選地呼叫 `NPM Telegram Beta E2E`。當 `telegram_mode` 不是 `none` 時它會執行，並且當 Package Acceptance 解析出一個時安裝相同的 `package-under-test` 成品；獨立的 Telegram 分發仍然可以安裝已發布的 npm 規格。
4. 如果套件解析、Docker 驗收或可選的 Telegram 軌道失敗，`summary` 會讓工作流程失敗。

### 來源候選

- `source=npm` 只接受 `openclaw@beta`、`openclaw@latest` 或精確的 OpenClaw 發布版本，例如 `openclaw@2026.4.27-beta.2`。請將其用於已發布的 pre-release/stable 驗收。
- `source=ref` 會打包一個受信任的 `package_ref` 分支、標籤或完整的提交 SHA。解析器會取得 OpenClaw 分支/標籤，驗證所選的提交可從儲存庫分支歷史或發布標籤抵達，在分離的工作樹中安裝相依項，並使用 `scripts/package-openclaw-for-docker.mjs` 打包它。
- `source=url` 下載一個公開的 HTTPS `.tgz`；需要 `package_sha256`。此路徑會拒絕 URL 憑證、非預設的 HTTPS 連接埠、私有/內部/特殊用途的主機名稱或解析出的 IP，以及相同公開安全性原則之外的重導向。
- `source=trusted-url` 從 `.github/package-trusted-sources.json` 中的具名受信任來源原則下載 HTTPS `.tgz`；需要 `package_sha256` 和 `trusted_source_id`。僅對維護者擁有的企業鏡像或需要設定主機、連接埠、路徑前綴、重導向主機或私有網路解析的私有套件儲存庫使用此功能。如果原則宣告 bearer auth，工作流程會使用固定的 `OPENCLAW_TRUSTED_PACKAGE_TOKEN` 密鑰；內嵌於 URL 的憑證仍會被拒絕。
- `source=artifact` 從 `artifact_run_id` 和 `artifact_name` 下載一個 `.tgz`；`package_sha256` 是可選的，但對於外部共享的成品應提供該參數。

請將 `workflow_ref` 和 `package_ref` 分開。`workflow_ref` 是執行測試的受信任工作流程/程式碼。`package_ref` 是當 `source=ref` 時被打包的來源提交。這讓目前的測試程式碼能驗證較舊的受信任來源提交，而無需執行舊的工作流程邏輯。

### 套件設定檔

- `smoke` — `npm-onboard-channel-agent`、`gateway-network`、`config-reload`
- `package` — `npm-onboard-channel-agent`、`doctor-switch`、`update-channel-switch`、`skill-install`、`update-corrupt-plugin`、`upgrade-survivor`、`published-upgrade-survivor`、`update-restart-auth`、`plugins-offline`、`plugin-update`
- `product` — `package` 加上 `mcp-channels`、`cron-mcp-cleanup`、`openai-web-search-minimal`、`openwebui`
- `full` — 包含 OpenWebUI 的完整 Docker 發布路徑區塊
- `custom` — 精確的 `docker_lanes`；當 `suite_profile=custom` 時為必要項

`package` 設定檔使用離線外掛覆蓋率，因此已發布套件的驗證不會受阻於 ClawHub 的即時可用性。選用的 Telegram 通道會在 `NPM Telegram Beta E2E` 中重用 `package-under-test` 構件，並保留已發布的 npm spec 路徑用於獨立觸發。

關於專用的更新和外掛測試政策，包括本機指令、Docker 通道、套件驗收輸入、發布預設值以及故障分診，請參閱[測試更新和外掛](/zh-Hant/help/testing-updates-plugins)。

發行檢查使用 `source=artifact`、準備好的發行套件產物 `suite_profile=custom`、`docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'` 以及 `telegram_mode=mock-openai` 呼叫 Package Acceptance。這能將套件遷移、更新、線上 ClawHub 技能安裝、過時外掛相依性清理、已設定外掛安裝修復、離線外掛、外掛更新以及 Telegram 驗證保持在同一個解析出的套件 tarball 上。在發布 beta 版之後，於 Full Release Validation 或 OpenClaw Release Checks 上設定 `release_package_spec`，即可針對已發布的 npm 套件執行相同的矩陣，而無需重新建置；僅當 Package Acceptance 需要與其餘發行驗證不同的套件時，才設定 `package_acceptance_package_spec`。跨作業系統發行檢查仍涵蓋特定作業系統的上手、安裝程式與平台行為；套件/更新產品驗證應從 Package Acceptance 開始。`published-upgrade-survivor` Docker 軌道在封鎖式發行路徑中，每次執行會驗證一個已發布的套件基準。在 Package Acceptance 中，解析出的 `package-under-test` tarball 一定是候選版本，而 `published_upgrade_survivor_baseline` 則選擇後備的已發布基準，預設為 `openclaw@latest`；失敗軌道的重新執行指令會保留該基準。使用 `run_release_soak=true` 或 `release_profile=full` 的 Full Release Validation 會設定 `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` 和 `published_upgrade_survivor_scenarios=reported-issues`，以擴展至四個最新的穩定 npm 發行版，加上釘選的外掛相容性邊界發行版，以及針對 Feishu 設定、保留的 bootstrap/persona 檔案、已設定的 OpenClaw 外掛安裝、波浪號日誌路徑，以及過時的舊版外掛相依性根目錄的情境固定裝置。多基準已發布升級的存活選取會依基準分片到獨立的目標 Docker runner 工作。當問題是徹底的已發布更新清理，而非一般的 Full Release CI 廣度時，獨立的 `Update Migration` 工作流程會搭配 `all-since-2026.4.23` 與 `plugin-deps-cleanup` 使用 `update-migration` Docker 軌道。本機彙總執行可以使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 傳遞確切的套件規格，使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC`（例如 `openclaw@2026.4.15`）保持單一軌道，或為情境矩陣設定 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS`。已發布軌道使用內建的 `openclaw config set` 指令配方設定基準，在 `summary.json` 中記錄配方步驟，並在 Gateway 啟動後探查 `/healthz`、`/readyz` 以及 RPC 狀態。Windows 打包與安裝程式全新安裝軌道也會驗證已安裝的套件是否能從原始的絕對 Windows 路徑匯入瀏覽器控制覆寫。OpenAI 跨作業系統代理回合冒煙測試在設定時預設為 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否則為 `openai/gpt-5.5`，因此安裝與 gateway 驗證會保持在 GPT-5 測試模型上，同時避免 GPT-4.x 預設值。

### 舊版相容性視窗

Package Acceptance 針對已發布的套件具有受限的舊版相容性視窗。截至 `2026.4.25` 的套件，包括 `2026.4.25-beta.*`，可能會使用相容性路徑：

- `dist/postinstall-inventory.json` 中已知的私有 QA 條目可能指向 tarball 中省略的檔案；
- 當套件未公開該旗標時，`doctor-switch` 可能會跳過 `gateway install --wrapper` 持久化子案例；
- `update-channel-switch` 可能會從衍生自 tarball 的假 git fixture 中修剪遺失的 pnpm `patchedDependencies`，並記錄遺失的持久化 `update.channel`；
- plugin smokes 可能會讀取舊版 install-record 位置或接受遺失的 marketplace install-record 持久化；
- `plugin-update` 可能會允許設定元資料遷移，同時仍要求 install record 和 no-reinstall 行為保持不變。

已發布的 `2026.4.26` 套件也可能對已發送的本地建置元資料標記檔案發出警告。後續的套件必須符合現代合約；相同的條件將會導致失敗而不是警告或跳過。

### 範例

```bash
# Validate the current beta package with product-level coverage.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai

# Pack and validate a release branch with the current harness.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=ref \
  -f package_ref=release/YYYY.M.D \
  -f suite_profile=package \
  -f telegram_mode=mock-openai

# Validate a tarball URL. SHA-256 is mandatory for source=url.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=url \
  -f package_url=https://example.com/openclaw-current.tgz \
  -f package_sha256=<64-char-sha256> \
  -f suite_profile=smoke

# Validate a tarball from a named trusted private mirror policy.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=trusted-url \
  -f trusted_source_id=enterprise-artifactory \
  -f package_url=https://packages.example.internal:8443/artifactory/openclaw/openclaw-current.tgz \
  -f package_sha256=<64-char-sha256> \
  -f suite_profile=smoke

# Reuse a tarball uploaded by another Actions run.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=package-under-test \
  -f suite_profile=custom \
  -f docker_lanes='install-e2e plugin-update'
```

當偵錯失敗的套件驗收執行時，請從 `resolve_package` 摘要開始，以確認套件來源、版本和 SHA-256。然後檢查 `docker_acceptance` 子執行及其 Docker 成品：`.artifacts/docker-tests/**/summary.json`、`failures.json`、lane 日誌、階段時序和重新執行指令。建議優先重新執行失敗的套件設定檔或特定 Docker lanes，而不是重新執行完整的發行驗證。

## Install smoke

獨立的 `Install Smoke` 工作流程透過其自身的 `preflight` job 重複使用相同的範圍腳本。它將 smoke 覆蓋範圍分為 `run_fast_install_smoke` 和 `run_full_install_smoke`。

- 對於涉及 Docker/套件層級、打包的外掛程式套件/清單變更，或 Docker 測試工作所測試的核心外掛程式/通道/閘道/外掛程式 SDK 層級的請求，會執行**快速路徑** (Fast path)。純原始碼的打包外掛程式變更、僅限測試的編輯以及僅限文件的編輯不會保留 Docker 工作站。快速路徑會建構根 Dockerfile 映像檔一次，檢查 CLI，執行刪除共用工作區 CLI 的測試，執行容器 gateway-network 端對端測試，驗證打包擴充功能的建構參數，並在 240 秒的總指令逾時下執行有界的打包外掛程式 Docker 設定檔（每個場景的 Docker 執行個別設有上限）。
- **完整路徑** (Full path) 會保留夜間排程執行、手動觸發、工作流程呼叫發行版本檢查，以及真正觸及安裝程式/套件/Docker 層級的請求的 QR 套件安裝和安裝程式 Docker/更新覆蓋範圍。在完整模式下，install-smoke 會準備或重複使用一個目標 SHA 的 GHCR 根 Dockerfile 測試映像檔，然後將 QR 套件安裝、根 Dockerfile/閘道測試、安裝程式/更新測試，以及快速的打包外掛程式 Docker 端對端測試作為獨立的工作執行，因此安裝程式工作不需要等待根映像測試完成。

`main` 推送（包括合併提交）不會強制執行完整路徑；當變更範圍邏輯會在推送時請求完整覆蓋範圍，工作流程會保留快速的 Docker 測試，並將完整的安裝測試留給夜間或發行版本驗證。

緩慢的 Bun 全域安裝映像提供者測試會被 `run_bun_global_install_smoke` 分別閘控。它會在夜間排程以及從發行版本檢查工作流程執行，而手動 `Install Smoke` 觸發可以選擇加入，但請求和 `main` 推送則不會。一般的 PR CI 仍然會針對 Node 相關變更執行快速 Bun 啟動器回歸路徑。QR 和安裝程式 Docker 測試保留其自己的專注於安裝的 Dockerfile。

## 本機 Docker 端對端測試

`pnpm test:docker:all` 預先建構一個共用的即時測試映像檔，將 OpenClaw 打包一次為 npm tarball，並建構兩個共用的 `scripts/e2e/Dockerfile` 映像檔：

- 一個用於安裝程式/更新/外掛程式相依性路徑的純 Node/Git 執行器；
- 一個功能映像，將相同的 tarball 安裝到 `/app` 中，用於正常功能管道。

Docker 管道定義位於 `scripts/lib/docker-e2e-scenarios.mjs`，規劃器邏輯位於 `scripts/lib/docker-e2e-plan.mjs`，而執行器僅執行選定的計劃。排程器使用 `OPENCLAW_DOCKER_E2E_BARE_IMAGE` 和 `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE` 為每個管道選擇映像，然後使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行管道。

### 可調參數

| 變數                                   | 預設值  | 用途                                                                         |
| -------------------------------------- | ------- | ---------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10      | 正常管道的主池插槽計數。                                                     |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10      | 供應商敏感的尾池插槽計數。                                                   |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9       | 並發運行管道上限，以防止供應商進行限速。                                     |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10      | 並發 npm install 管道上限。                                                  |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7       | 並發多服務管道上限。                                                         |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000    | 管道啟動之間的交錯時間，以避免 Docker 守護程式建立風暴；設定 `0` 則不交錯。  |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000 | 每個管道的後援逾時（120 分鐘）；選定的 live/tail 管道使用更嚴格的上限。      |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | unset   | `1` 列印排程器計劃而不執行管道。                                             |
| `OPENCLAW_DOCKER_ALL_LANES`            | unset   | 以逗號分隔的確切管道列表；跳過清理冒煙，以便代理程式可以重現一個失敗的管道。 |

超過其有效上限的管道仍可以從空池啟動，然後單獨運行直到釋放容量。本地聚合預檢 Docker，移除過時的 OpenClaw E2E 容器，發出活動管道狀態，持久化管道計時以進行最長優先排序，並且預設在第一次失敗後停止排程新的池化管道。

### 可重複使用的 live/E2E 工作流程

可重用的 live/E2E 工作流程詢問 `scripts/test-docker-all.mjs --plan-json` 需要哪個套件、映像檔類型、live 映像檔、通道以及憑證覆蓋範圍。`scripts/docker-e2e.mjs` 接著將該計劃轉換為 GitHub 輸出和摘要。它會透過 `scripts/package-openclaw-for-docker.mjs` 打包 OpenClaw、下載目前執行的套件構件，或是從 `package_artifact_run_id` 下載套件構件；驗證 tarball 清單；並在計劃需要已安裝套件的通道時，透過 Blacksmith 的 Docker 層快取建置並推送已加上套件摘要標籤的 bare/functional GHCR Docker E2E 映像檔；以及重複使用提供的 `docker_e2e_bare_image`/`docker_e2e_functional_image` 輸入或現有的套件摘要映像檔，而不是重新建置。Docker 映像檔拉取操作會重試，每次嘗試有 180 秒的上限，因此卡住的 registry/cache 串流會快速重試，而不是消耗大部分 CI 關鍵路徑的時間。

### Release-path 區塊

Release Docker 覆蓋範圍會以 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行較小的區塊工作，因此每個區塊僅拉取其所需的映像檔類型，並透過相同的加權排程器執行多個通道：

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

目前的 release Docker 區塊為 `core`、`package-update-openai`、`package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、`plugins-runtime-services` 和 `plugins-runtime-install-a` 到 `plugins-runtime-install-h`。`package-update-openai` 包含 live Codex 外掛套件通道，該通道會安裝候選的 OpenClaw 套件、從 `codex_plugin_spec` 或具有明確 Codex CLI 安裝批准的相同參照 tarball 安裝 Codex 外掛、執行 Codex CLI 飛行前檢查，然後針對 OpenAI 執行多個相同工作階段的 OpenClaw agent 週期。`plugins-runtime-core`、`plugins-runtime` 和 `plugins-integrations` 保持為聚合外掛/執行時期別名。`install-e2e` 通道別名仍然是兩個提供者安裝程式通道的聚合手動重新執行別名。

當完整發行路徑覆蓋要求時，OpenWebUI 會被併入 `plugins-runtime-services`，並僅針對僅屬於 OpenWebUI 的派發保留獨立的 `openwebui` 區塊。捆綁通道更新區道會針對暫時性的 npm 網路故障重試一次。

每個區塊都會上傳包含區道日誌、計時資訊、`summary.json`、`failures.json`、階段計時、排程器計劃 JSON、慢速區道表以及各區道重新執行指令的 `.artifacts/docker-tests/`。工作流程的 `docker_lanes` 輸入會針對準備好的映像檔執行選定的區道，而不是區塊工作，這將失敗區道的偵錯範圍限制在一個目標 Docker 工作內，並為該次執行準備、下載或重用套件成品；如果選定的區道是即時 Docker 區道，目標工作會在本地為該次重新執行建置即時測試映像檔。產生的各區道 GitHub 重新執行指令會在這些值存在時包含 `package_artifact_run_id`、`package_artifact_name` 和準備好的映像檔輸入，因此失敗的區道可以重用失敗執行中的確切套件和映像檔。

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

排程的即時/E2E 工作流程每日會執行完整的發行路徑 Docker 測試套組。

## 外掛程式預先發行

`Plugin Prerelease` 是更昂貴的產品/套件覆蓋範圍，因此它是由 `Full Release Validation` 或特定操作員觸發的獨立工作流程。一般的拉取請求、`main` 推送和獨立的手動 CI 派發都會關閉該測試套組。它將捆綁的外掛程式測試分散在八個擴充工作程序之間；這些擴充分片工作每次最多執行兩個外掛程式設定組，每個組使用一個 Vitest 工作程序以及較大的 Node 堆積，因此匯入負載較重的外掛程式批次不會產生額外的 CI 工作。僅限發行的 Docker 預先發行路徑會將目標 Docker 區道分批為小組，以避免為一到三分鐘的工作保留數十個執行器。該工作流程也會從 `@openclaw/plugin-inspector` 上傳資訊性的 `plugin-inspector-advisory` 成品；檢查器的發現是分類輸入，不會改變具有阻擋性的外掛程式預先發行閘道。

## QA 實驗室

QA Lab 在主要智慧範圍的工作流程之外擁有專用的 CI 通道。代理一致性被嵌套在廣泛的 QA 和 release 套件之下，而非獨立的 PR 工作流程。當一致性應隨廣泛驗證運行時，請使用 `Full Release Validation` 搭配 `rerun_group=qa-parity`。

- `QA-Lab - All Lanes` 工作流程每夜在 `main` 上運行，並透過手動觸發；它會將 mock 一致性通道、即時 Matrix 通道，以及即時 Telegram 和 Discord 通道作為並行任務展開。即時任務使用 `qa-live-shared` 環境，而 Telegram/Discord 則使用 Convex 租用。

Release 檢查會執行 Matrix 和 Telegram 即時傳輸通道，搭配確定性 mock 提供者和合格 mock 模型（`mock-openai/gpt-5.5` 和 `mock-openai/gpt-5.5-alt`），因此通道契約會與即時模型延遲和正常的提供者外掛啟動隔離。即時傳輸閘道會停用記憶體搜尋，因為 QA 一致性會另外涵蓋記憶體行為；提供者連線則由獨立的即時模型、原生提供者和 Docker 提供者套件涵蓋。

Matrix 對於排程和 release 閘道使用 `--profile fast`，僅在簽出的 CLI 支援時才加入 `--fail-fast`。CLI 預設和手動工作流程輸入保持為 `all`；手動 `matrix_profile=all` 觸發總是將完整的 Matrix 涵蓋範圍分割為 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 任務。

`OpenClaw Release Checks` 也會在 release 批准前執行關鍵的 QA Lab 通道；其 QA 一致性閘道會將候選和基準套件作為並行通道任務執行，然後將兩個構件下載到一個小型報告任務中以進行最終一致性比較。

對於一般的 PR，請遵循範圍內的 CI/檢查證據，而不是將一致性視為必要狀態。

## CodeQL

`CodeQL` 工作流程刻意設計為狹窄的首輪安全掃描器，而非完整的倉庫掃描。每日、手動和非草稿 PR guard 執行會掃描 Actions 工作流程代碼以及最高風險的 JavaScript/TypeScript 表面，並使用過濾為高/嚴重 `security-severity` 的高置信度安全查詢。

PR guard 保持輕量：它僅針對 `.github/actions`、`.github/codeql`、`.github/workflows`、`packages` 或 `src` 下的變更啟動，並且執行與排程工作流程相同的高置信度安全矩陣。Android 和 macOS CodeQL 不包含在 PR 預設值中。

### 安全類別

| 類別                                              | 表面                                                                                   |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | 驗證、機密、沙盒、定時任務和閘道基線                                                   |
| `/codeql-security-high/channel-runtime-boundary`  | 核心頻道實作合約加上頻道插件執行時、閘道、Plugin SDK、機密、稽核觸點                   |
| `/codeql-security-high/network-ssrf-boundary`     | 核心 SSRF、IP 解析、網路守衛、web-fetch 和 Plugin SDK SSRF 政策表面                    |
| `/codeql-security-high/mcp-process-tool-boundary` | MCP 伺服器、程序執行輔助程式、出站傳遞和代理程式工具執行閘門                           |
| `/codeql-security-high/plugin-trust-boundary`     | 插件安裝、載入器、清單、註冊表、套件管理器安裝、來源載入和 Plugin SDK 套件合約信任表面 |

### 平台特定安全分片

- `CodeQL Android Critical Security` — 排程 Android 安全分片。在 workflow sanity 接受的最小 Blacksmith Linux runner 上手動建構 Android app 以供 CodeQL 使用。上傳至 `/codeql-critical-security/android` 下。
- `CodeQL macOS Critical Security` — 每週/手動 macOS 安全分片。在 Blacksmith macOS 上手動建構 macOS app 以供 CodeQL 使用，從上傳的 SARIF 中過濾掉相依性建置結果，並上傳至 `/codeql-critical-security/macos` 下。由於即使乾淨時 macOS 建置也會佔據大部分執行時間，因此未包含在每日預設值中。

### 關鍵品質類別

`CodeQL Critical Quality` 是對應的非安全性分片。它在較小的 Blacksmith Linux 執行器上，針對狹窄的高價值表面，僅執行錯誤嚴重性、非安全性的 JavaScript/TypeScript 品質查詢。其 PR 防護特意小於排程設定檔：非草稿 PR 僅針對代理程式命令/模型/工具執行和回覆分發程式碼、設定檔架構/遷移/IO 程式碼、驗證/機密/沙盒/安全性程式碼、核心通道和捆綁通道外掛程式執行時、通訊協定/伺服器方法、記憶體執行時/SDK 橋接、MCP/程序/出站分發、提供者執行時/模型目錄、階段診斷/分發佇列、外掛程式載入器、外掛程式 SDK/套件合約，或外掛程式 SDK 回覆執行時變更，執行對應的 `agent-runtime-boundary`、`config-boundary`、`core-auth-secrets`、`channel-runtime-boundary`、`gateway-runtime-boundary`、`memory-runtime-boundary`、`mcp-process-runtime-boundary`、`provider-runtime-boundary`、`session-diagnostics-boundary`、`plugin-boundary`、`plugin-sdk-package-contract` 和 `plugin-sdk-reply-runtime` 分片。CodeQL 設定和品質工作流程變更會執行所有十二個 PR 品質分片。

手動分發接受：

```
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

狹窄設定檔是單獨執行一個品質分片的教學/迭代掛鉤。

| 類別                                                    | 表面                                                                                                                         |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-critical-quality/core-auth-secrets`            | 驗證、機密、沙盒、cron 和閘道安全性邊界程式碼                                                                                |
| `/codeql-critical-quality/config-boundary`              | 設定檔架構、遷移、正規化和 IO 合約                                                                                           |
| `/codeql-critical-quality/gateway-runtime-boundary`     | 閘道通訊協定架構和伺服器方法合約                                                                                             |
| `/codeql-critical-quality/channel-runtime-boundary`     | 核心通道和捆綁通道外掛程式實作合約                                                                                           |
| `/codeql-critical-quality/agent-runtime-boundary`       | 命令執行、模型/提供者分發、自動回覆分發和佇列，以及 ACP 控制平面執行時合約                                                   |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | MCP 伺服器和工具橋接器、程序監督輔助程式，以及出站分發合約                                                                   |
| `/codeql-critical-quality/memory-runtime-boundary`      | Memory 主機 SDK、記憶體執行時外觀、Memory 外掛程式 SDK 別名、記憶體執行時啟動橋接，以及 memory doctor 命令                   |
| `/codeql-critical-quality/session-diagnostics-boundary` | Reply 佇列內部、session 傳遞佇列、輸出 session 繫結/傳遞輔助程式、診斷事件/日誌套件介面，以及 session 醫生 CLI 合約          |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | Plugin SDK 輸入 reply 分派、reply payload/分塊/執行階段輔助程式、通道 reply 選項、傳遞佇列，以及 session/thread 繫結輔助程式 |
| `/codeql-critical-quality/provider-runtime-boundary`    | Model catalog 正規化、提供者驗證與探索、提供者執行階段註冊、提供者預設值/catalogs，以及 web/search/fetch/embedding 登錄      |
| `/codeql-critical-quality/ui-control-plane`             | Control UI 啟動程序、本機持久性、閘道控制流程，以及任務控制平面執行階段合約                                                  |
| `/codeql-critical-quality/web-media-runtime-boundary`   | Core web 擷取/搜尋、媒體 IO、媒體理解、影像生成，以及媒體生成執行階段合約                                                    |
| `/codeql-critical-quality/plugin-boundary`              | 載入器、登錄、公開介面，以及 Plugin SDK 進入點合約                                                                           |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | 已發布套件端 Plugin SDK 來源和外掛程式套件合約輔助程式                                                                       |

品質與安全性保持分離，以便在不掩蓋安全性訊號的情況下安排、測量、停用或擴充品質發現項目。只有在窄型設定檔具有穩定的執行階段和訊號後，才應將 Swift、Python 和 bundled-plugin CodeQL 擴充功能作為範圍限定或分片的後續工作加回。

## 維護工作流程

### Docs Agent

`Docs Agent` 工作流程是一個事件驅動的 Codex 維護通道，用於讓現有文件與最近的變更保持一致。它沒有純粹的排程：在 `main` 上的成功非機器人推送 CI 執行可以觸發它，而手動分派可以直接執行它。當 `main` 已前進或當一小時前建立了另一個非跳過的 Docs Agent 執行時，工作流程執行叫用會跳過。當它執行時，它會從先前的非跳過 Docs Agent 來源 SHA 到目前的 `main` 審查提交範圍，因此每小時一次的執行可以涵蓋自上次文件通過以來累積的所有主要變更。

### Test Performance Agent

`Test Performance Agent` 工作流程是一個事件驅動的 Codex 維護通道，用於執行緩慢的測試。它沒有單純的排程：在 `main` 上成功的非機器人推送 CI 執行可以觸發它，但如果該 UTC 天的另一個工作流程執行調用已經執行或正在執行，它就會跳過。手動調度會繞過該每日活動閘門。該通道會建立一個完整的套件分組 Vitest 效能報告，讓 Codex 僅進行小幅度的保留覆蓋率的測試效能修復，而不是大幅度的重構，然後重新執行完整套件報告並拒絕會減少通過基準測試數量的變更。分組報告會記錄 Linux 和 macOS 上每個設定的牆壁時間 和最大 RSS，因此前後比較會在持續時間差異旁顯示測試記憶體差異。如果基準有失敗的測試，Codex 可能只會修復明顯的失敗，並且在代理程式之後的完整套件報告通過之前，不得提交任何內容。當 `main` 在機器人推送落地之前推進時，該通道會變基已驗證的修補程式，重新執行 `pnpm check:changed`，並重試推送；衝突的過時修補程式會被跳過。它使用 GitHub 託管的 Ubuntu，以便 Codex 動作能保持與文件代理程式相同的 drop-sudo 安全姿態。

### 合併後的重複 PR

`Duplicate PRs After Merge` 工作流程是一個用於落地後重複清理的手動維護者工作流程。它預設為試運行，並且僅在 `apply=true` 時關閉明確列出的 PR。在變更 GitHub 之前，它會驗證已落地的 PR 已合併，並且每個重複項都有共享的參考問題或重疊的變更區塊。

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## 本地檢查閘門和變更路由

本地變更通道邏輯存在於 `scripts/changed-lanes.mjs` 中，並由 `scripts/check-changed.mjs` 執行。該本地檢查閘門對架構邊界的要求比廣泛的 CI 平台範圍更嚴格：

- 核心生產變更會執行核心生產 和核心測試型別檢查，加上核心 lint/guards；
- 核心僅測試變更僅執行核心測試型別檢查，加上核心 lint；
- 擴充功能生產變更會執行擴充功能生產 和擴充功能測試型別檢查，加上擴充功能 lint；
- 擴充功能僅測試變更會執行擴充功能測試型別檢查，加上擴充功能 lint；
- public Plugin SDK 或 plugin-contract 的變更會擴展到 extension typecheck，因為 extensions 依賴於這些核心 contracts（Vitest extension sweeps 保持為明確的測試工作）；
- 僅涉及 release metadata 的版本變動會執行針對性的 version/config/root-dependency 檢查；
- 未知的 root/config 變更會自動觸發所有檢查通道以確保安全。

Local changed-test routing 存在於 `scripts/test-projects.test-support.mjs` 中，並且設計上比 `check:changed` 更低成本：直接的測試編輯會自行運行，原始碼編輯優先使用明確的映射，然後是同層級測試和 import-graph 依賴項。Shared group-room delivery config 是明確映射之一：對群組 visible-reply config、source reply delivery mode 或 message-tool system prompt 的變更會透過核心 reply 測試以及 Discord 和 Slack delivery regressions 進行路由，因此在首次 PR 推送之前，共享的預設變更就會失敗。僅當變更範圍廣泛到使得廉價的映射集不再可靠時，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。

## Testbox 驗證

Crabbox 是 repo 所有的 remote-box 包裝器，用於維護者的 Linux proof。當檢查對於本地編輯循環來說過於廣泛、當 CI 一致性很重要，或者當 proof 需要機密、Docker、package lanes、可重複使用的 boxes 或遠端日誌時，請從 repo 根目錄使用它。正常的 OpenClaw 後端是 `blacksmith-testbox`；所擁有的 AWS/Hetzner 容量是 Blacksmith 停機、配額問題或明確的所擁有容量測試的後備方案。

Crabbox 支援的 Blacksmith 會執行 warm、claim、sync、run、report 和清理一次性 Testboxes。當必要的根檔案（如 `pnpm-lock.yaml`）消失，或者當 `git status --short` 顯示至少 200 個追蹤的刪除時，內建的 sync sanity check 會快速失敗。對於有意進行大量刪除的 PR，請為遠端指令設定 `OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1`。

Crabbox 還會終止在 sync 階段停留超過五分鐘而沒有 post-sync 輸出的本地 Blacksmith CLI 調用。設定 `CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` 以停用該守護，或者對於異常大的本地差異使用更大的毫秒值。

在首次運行之前，請從 repo 根目錄檢查包裝器：

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

Repo 包裝器會拒絕未廣告 `blacksmith-testbox` 的過時 Crabbox 二進制檔。即使 `.crabbox.yaml` 有 owned-cloud 預設值，仍需明確傳遞提供商。在 Codex worktree 或連結/稀疏簽出中，請避免使用本地的 `pnpm crabbox:run` 腳本，因為 pnpm 可能會在 Crabbox 啟動之前協調相依性；請改為直接呼叫 node 包裝器：

```bash
node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox --timing-json --shell -- "pnpm test <path-or-filter>"
```

由 Blacksmith 支援的執行需要 Crabbox 0.22.0 或更新版本，以便包裝器取得目前的 Testbox 同步、佇列和清理行為。使用同層級簽出時，請在計時或驗證工作之前重建已忽略的本機二進制檔：

```bash
version="$(git -C ../crabbox describe --tags --always --dirty | sed 's/^v//')" \
  && go build -C ../crabbox -trimpath -ldflags "-s -w -X github.com/openclaw/crabbox/internal/cli.version=${version}" -o bin/crabbox ./cmd/crabbox
```

變更閘道：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox \
  --blacksmith-org openclaw \
  --blacksmith-workflow .github/workflows/ci-check-testbox.yml \
  --blacksmith-job check \
  --blacksmith-ref main \
  --idle-timeout 90m \
  --ttl 240m \
  --timing-json \
  --shell -- \
  "corepack pnpm check:changed"
```

專注測試重新執行：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox \
  --blacksmith-org openclaw \
  --blacksmith-workflow .github/workflows/ci-check-testbox.yml \
  --blacksmith-job check \
  --blacksmith-ref main \
  --idle-timeout 90m \
  --ttl 240m \
  --timing-json \
  --shell -- \
  "corepack pnpm test <path-or-filter>"
```

完整套件：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox \
  --blacksmith-org openclaw \
  --blacksmith-workflow .github/workflows/ci-check-testbox.yml \
  --blacksmith-job check \
  --blacksmith-ref main \
  --idle-timeout 90m \
  --ttl 240m \
  --timing-json \
  --shell -- \
  "corepack pnpm test"
```

閱讀最終的 JSON 摘要。有用的欄位包括 `provider`、`leaseId`、`syncDelegated`、`exitCode`、`commandMs` 和 `totalMs`。一次性由 Blacksmith 支援的 Crabbox 執行應該會自動停止 Testbox；如果執行中斷或清理不明確，請檢查執行中的盒子並僅停止您建立的盒子：

```bash
blacksmith testbox list --all
blacksmith testbox status --id <tbx_id>
blacksmith testbox stop --id <tbx_id>
```

僅當您刻意需要在同一個已準備好的盒子上執行多個指令時，才使用重複使用：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox --id <tbx_id> --no-sync --timing-json --shell -- "pnpm test <path-or-filter>"
pnpm crabbox:stop -- <tbx_id>
```

如果 Crabbox 是故障層級但 Blacksmith 本身運作正常，請僅將直接 Blacksmith 用於 `list`、`status` 和清理等診斷。在將直接 Blacksmith 執行視為維護者驗證之前，請先修正 Crabbox 路徑。

如果 `blacksmith testbox list --all` 和 `blacksmith testbox status` 運作正常，但幾分鐘後新的預熱仍處於 `queued` 狀態且沒有 IP 或 Actions 執行 URL，請將其視為 Blacksmith 提供商、佇列、計費或組織限制的壓力。停止您建立的已佇列 ID，避免啟動更多 Testbox，並在有人檢查 Blacksmith 儀表板、計費和組織限制的同時，將驗證移至下方擁有的 Crabbox 容量路徑。

僅當 Blacksmith 停機、配額受限、缺少所需環境，或明確以擁有容量為目標時，才升級至擁有的 Crabbox 容量：

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

在 AWS 壓力下，除非任務確實需要 48xlarge 級別的 CPU，否則請避免 `class=beast`。`beast` 請求從 192 個 vCPU 開始，是觸發區域 EC2 Spot 或按需 Standard 配額的最簡單方式。倉庫擁有的 `.crabbox.yaml` 預設為 `standard`、多個容量區域和 `capacity.hints: true`，因此經仲介的 AWS 租約會列印所選區域/市場、配額壓力、Spot 回退以及高壓類別警告。對於較重的廣泛檢查，請使用 `fast`；僅在 standard/fast 不足時使用 `large`；並且僅對於異常的 CPU 密集型通道（如完整套件或所有外掛 Docker 矩陣、明確的 release/blocker 驗證或高核心效能分析）使用 `beast`。對於 `pnpm check:changed`、專注測試、僅文件工作、一般 lint/typecheck、小型 E2E 重現或 Blacksmith 停機排查，請勿使用 `beast`。使用 `--market on-demand` 進行容量診斷，以免 Spot 市場波動混入訊號中。

`.crabbox.yaml` 擁有 owned-cloud 通道的提供者、同步和 GitHub Actions 注入預設值。它排除本地 `.git`，以便注入的 Actions checkout 保留其自己的遠端 Git 元數據，而不是同步維護者本機遠端和物件存儲，並且它排除不應被傳輸的本地執行時/建置產物。`.github/workflows/crabbox-hydrate.yml` 擁有 checkout、Node/pnpm 設定、`origin/main` 獲取以及 owned-cloud `crabbox run --id <cbx_id>` 指令的非機密環境交接。

## 相關

- [安裝概述](/zh-Hant/install)
- [開發通道](/zh-Hant/install/development-channels)
