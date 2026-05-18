---
summary: "CI 工作圖、範圍閘道、發行傘與本地指令對等項"
title: "CI 管道"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging a failing GitHub Actions check
  - You are coordinating a release validation run or rerun
  - You are changing ClawSweeper dispatch or GitHub activity forwarding
---

OpenClaw CI 會在每次推送到 `main` 及每次提取請求時執行。`preflight` 工作會分類差異，並在僅變更不相關區域時關閉昂貴的通道。手動 `workflow_dispatch` 執行會刻意繞過智慧範圍縮小，為發行候選版本及廣泛驗證展開完整圖譜。Android 通道透過 `include_android` 保持選擇加入。僅發行版的外掛涵蓋範圍位於獨立的 [`Plugin Prerelease`](#plugin-prerelease) 工作流程中，且僅從 [`Full Release Validation`](#full-release-validation) 或明確的手動觸發執行。

## 管道概覽

| 工作                             | 用途                                                                              | 執行時機                     |
| -------------------------------- | --------------------------------------------------------------------------------- | ---------------------------- |
| `preflight`                      | 偵測僅文件變更、變更範圍、變更擴充功能，並建構 CI 清單                            | 總是在非草稿推送與 PR 上執行 |
| `security-scm-fast`              | 透過 `zizmor` 進行金鑰偵測與工作流程稽核                                          | 總是在非草稿推送與 PR 上執行 |
| `security-dependency-audit`      | 針對 npm 公告進行無相依性生產鎖定檔稽核                                           | 總是在非草稿推送與 PR 上執行 |
| `security-fast`                  | 快速安全性工作的必要彙總                                                          | 總是在非草稿推送與 PR 上執行 |
| `check-dependencies`             | 生產環境 Knip 僅相依性階段加上未使用檔案允許清單防護                              | Node 相關變更                |
| `build-artifacts`                | 建構 `dist/`、Control UI、建置成果檢查及可重複使用的下游成果                      | Node 相關變更                |
| `checks-fast-core`               | 快速 Linux 正確性通道，例如 bundled/plugin-contract/protocol 檢查                 | Node 相關變更                |
| `checks-fast-contracts-channels` | 分片通道合約檢查，具穩定的彙總檢查結果                                            | Node 相關變更                |
| `checks-node-core-test`          | 核心 Node 測試分片，排除通道、bundled、合約與擴充功能通道                         | Node 相關變更                |
| `check`                          | Sharded 主要本地閘道同等項目：prod 類型、lint、guards、測試類型和嚴格的冒煙測試   | 與 Node 相關的變更           |
| `check-additional`               | 架構、分片邊界/prompt 偏移、擴充 guards、套件邊界和 gateway watch                 | 與 Node 相關的變更           |
| `build-smoke`                    | Built-CLI 冒煙測試和啟動記憶體冒煙測試                                            | 與 Node 相關的變更           |
| `checks`                         | 建構產物通道測試的驗證器                                                          | 與 Node 相關的變更           |
| `checks-node-compat-node22`      | Node 22 相容性建構和冒煙測試通道                                                  | 發布版本的手動 CI 分派       |
| `check-docs`                     | 文件格式化、lint 和連結失效檢查                                                   | 文件已變更                   |
| `skills-python`                  | 針對 Python 支援技能的 Ruff + pytest                                              | 與 Python 技能相關的變更     |
| `checks-windows`                 | Windows 特定的處理程序/路徑測試以及共享執行階段 import 指定符回歸測試             | 與 Windows 相關的變更        |
| `macos-node`                     | 使用共享建構產物的 macOS TypeScript 測試通道                                      | 與 macOS 相關的變更          |
| `macos-swift`                    | macOS 應用程式的 Swift lint、建構和測試                                           | 與 macOS 相關的變更          |
| `android`                        | 兩種版本的 Android 單元測試以及一個 Debug APK 建構                                | 與 Android 相關的變更        |
| `test-performance-agent`         | 受信任活動後的每日 Codex 慢速測試最佳化                                           | 主要 CI 成功或手動分派       |
| `openclaw-performance`           | 使用 mock-provider、深度分析和 GPT 5.4 live 通道的每日/按需 Kova 執行階段效能報告 | 排程和手動分派               |

## 快速失敗順序

1. `preflight` 決定哪些通道存在。`docs-scope` 和 `changed-scope` 邏輯是此工作中的步驟，而非獨立的工作。
2. `security-scm-fast`、`security-dependency-audit`、`security-fast`、`check`、`check-additional`、`check-docs` 和 `skills-python` 會快速失敗，無需等待較繁重的產物和平台矩陣工作。
3. `build-artifacts` 與快速 Linux 軌道重疊，以便下游消費者可以在共用建置準備就緒後立即開始。
4. 在這之後，更繁重的平台和執行時軌道會展開：`checks-fast-core`、`checks-fast-contracts-channels`、`checks-node-core-test`、`checks`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

當有較新的推送抵達相同的 PR 或 `main` ref 時，GitHub 可能會將被取代的工作標記為 `cancelled`。除非該 ref 的最新執行也失敗，否則請將其視為 CI 雜訊。聚合分片檢查使用 `!cancelled() && always()`，因此它們仍會報告正常的分片失敗，但在整個工作流程已被取代後不會排入佇列。自動 CI 併發金鑰有版本控制（`CI-v7-*`），因此舊佇列組中 GitHub 端的殭屍程序不會無限期地阻塞較新的 main 執行。手動完整套件執行使用 `CI-manual-v1-*`，且不會取消正在進行的執行。

`ci-timings-summary` 工作會為每個非草稿 CI 執行上傳一個精簡的 `ci-timings-summary` 構件。它會記錄當前執行的牆上時間、排隊時間、最慢的工作和失敗的工作，因此 CI 健康檢查不需要重複抓取完整的 Actions 載荷。

## 範圍與路由

範圍邏輯位於 `scripts/ci-changed-scope.mjs` 中，並由 `src/scripts/ci-changed-scope.test.ts` 中的單元測試涵蓋。手動分派會跳過變更範圍檢測，並使預檢清單表現得就像每個範圍區域都已變更一樣。

- **CI workflow 編輯**會驗證 Node CI 圖譜以及 workflow linting，但不會自行強制執行 Windows、Android 或 macOS 原生建置；這些平台軌道仍將範圍限定於平台原始碼變更。
- **僅限 CI 路由的編輯、選定的低成本核心測試夾具編輯，以及狹窄的插件合約輔助/測試路由編輯**使用快速的 Node 僅清單路徑：`preflight`、安全性和單一 `checks-fast-core` 任務。當變更僅限於快速任務直接執行的路由或輔助層時，該路徑會跳過構建工件、Node 22 相容性、通道合約、完整核心分片、捆綁插件分片和額外的防護矩陣。
- **Windows Node 檢查**的範圍僅限於 Windows 特定的處理程序/路徑包裝器、npm/pnpm/UI 執行器輔助程式、套件管理器組態，以及執行該管道的 CI 工作流程表面；不相關的原始碼、插件、安裝冒煙測試和僅測試變更則保留在 Linux Node 管道上。

最慢的 Node 測試系列會進行分割或平衡，以確保每個任務保持輕小且不過度佔用 Runner：channel contracts 作為三個加權的 Blacksmith 支援分片執行，並具備標準 GitHub runner 後備方案；core unit fast/support lanes 分開執行；core runtime infra 分割在 state、process/config、cron 和 shared 分片中；auto-reply 作為平衡的 worker 執行（reply 子樹分割為 agent-runner、dispatch 和 commands/state-routing 分片）；而 agentic gateway/server configs 則分散在 chat/auth/model/http-plugin/runtime/startup lanes，而不是等待建置成品。廣泛的 browser、QA、media 和其他 plugin 測試使用其專用的 Vitest 設定，而非共用的 plugin catch-all。Include-pattern 分片使用 CI 分片名稱記錄時序項目，因此 `.artifacts/vitest-shard-timings.json` 可以區分完整設定與過濾後的分片。`check-additional` 將 package-boundary compile/canary 工作保持在一起，並將 runtime topology architecture 與 gateway watch coverage 分開；boundary guard 清單分散在四個矩陣分片中，每個分片同時執行選定的獨立 guards 並列印各檢查的時序。昂貴的 Codex happy-path prompt snapshot 偏差檢查作為額外的獨立任務執行，僅用於手動 CI 和影響 prompt 的變更，因此一般不相關的 Node 變更不必等待冷 prompt snapshot 的生成，且 boundary 分片保持平衡，同時 prompt偏差仍然歸咎於導致它的 PR；同一個旗標會跳過 built-artifact core support-boundary 分片內的 prompt snapshot Vitest 生成。Gateway watch、channel 測試和 core support-boundary 分片在 `dist/` 和 `dist-runtime/` 已經建置完成後，於 `build-artifacts` 內同時執行。

Android CI 會同時執行 `testPlayDebugUnitTest` 和 `testThirdPartyDebugUnitTest`，然後建置 Play debug APK。Third-party flavor 沒有獨立的 source set 或 manifest；其 unit-test lane 仍然會使用 SMS/call-log BuildConfig 旗標編譯該 flavor，同時避免在每次 Android 相關推送時重複執行 debug APK 打包任務。

`check-dependencies` 分片會執行 `pnpm deadcode:dependencies`（這是一個生產環境 Knip 僅依賴檢查流程，鎖定在最新版本的 Knip，並針對 `dlx` 安裝停用了 pnpm 的最小發布年齡限制）以及 `pnpm deadcode:unused-files`，後者會將 Knip 的生產環境未使用檔案檢查結果與 `scripts/deadcode-unused-files.allowlist.mjs` 進行比對。當 PR 新增了未經審查的未使用檔案或保留了過時的白名單項目時，未使用檔案防護機制將會失敗，同時保留 Knip 無法靜態解析的刻意保留的動態外掛、生成檔案、建置、即時測試和套件橋接介面。

## ClawSweeper 活動轉發

`.github/workflows/clawsweeper-dispatch.yml` 是從 OpenClaw 儲存庫活動到 ClawSweeper 的目標端橋接器。它不會簽出或執行不受信任的 PR 程式碼。此工作流程會從 `CLAWSWEEPER_APP_PRIVATE_KEY` 建立 GitHub App 權杖，然後將精簡的 `repository_dispatch` Payload 分派至 `openclaw/clawsweeper`。

此工作流程包含四個通道：

- `clawsweeper_item` 用於精確的 Issue 和 Pull Request 審查請求；
- `clawsweeper_comment` 用於 Issue 留言中明確的 ClawSweeper 指令；
- `clawsweeper_commit_review` 用於 `main` 推送上的層級審查請求；
- `github_activity` 用於 ClawSweeper 代理程式可能檢查的一般 GitHub 活動。

`github_activity` 通道僅轉發正規化的中繼資料：事件類型、動作、執行者、儲存庫、項目編號、URL、標題、狀態，以及評論或審查的簡短摘錄（如有）。它刻意避免轉發完整的 webhook 本文。`openclaw/clawsweeper` 中的接收工作流程是 `.github/workflows/github-activity.yml`，它會將正規化的事件發佈至給 ClawSweeper 代理程式的 OpenClaw Gateway 掛鉤。

一般活動屬於觀察性質，並非預設遞送。ClawSweeper 代理程式會在其提示詞中接收 Discord 目標，且僅在事件令人意外、可採取行動、具有風險或具營運實用性時，才應張貼至 `#clawsweeper`。常規的開啟、編輯、機器人異動、重複的 webhook 雜訊和正常的審查流量應導致 `NO_REPLY`。

在此路徑中，請將 GitHub 標題、評論、內文、審查文字、分支名稱和提交訊息視為不受信任的資料。它們是摘要和分類的輸入，而非工作流程或代理程式執行時期的指令。

## 手動觸發

手動 CI 觸發會執行與一般 CI 相同的工作圖，但會強制開啟所有非 Android 範圍的通道：Linux Node 分片、捆綁外掛程式分片、通道合約、Node 22 相容性、`check`、`check-additional`、建置冒煙測試、文件檢查、Python 技能、Windows、macOS 和 Control UI i18n。獨立的手動 CI 觸發僅使用 `include_android=true` 執行 Android；完整的發行版本傘會透過傳遞 `include_android=true` 來啟用 Android。外掛程式發行前靜態檢查、僅限發行版本的 `agentic-plugins` 分片、完整擴充功能批次掃描，以及外掛程式發行前 Docker 通道都排除在 CI 之外。Docker 發行前套件僅在 `Full Release Validation` 觸發獨立的 `Plugin Prerelease` 工作流程並啟用發行版本驗證閘道時執行。

手動執行使用唯一的並行群組，因此發行候選的完整套件不會被同一 ref 上的另一個推送或 PR 執行取消。選用的 `target_ref` 輸入允許受信任的呼叫者對分支、標籤或完整提交 SHA 執行該圖，同時使用從所選觸發 ref 取得的工作流程檔案。

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## 執行器

| 執行器                           | 工作                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ubuntu-24.04`                   | `preflight`、快速安全性工作和彙總 (`security-scm-fast`、`security-dependency-audit`、`security-fast`)、快速協定/合約/捆綁檢查、分片通道合約檢查、`check` 分片 (lint 除外)、`check-additional` 彙總、Node 測試彙總驗證器、文件檢查、Python 技能、workflow-sanity、labeler、auto-response；install-smoke preflight 也使用 GitHub 託管的 Ubuntu，以便 Blacksmith 矩陣可以更早佇列 |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`、權重較低的擴充分片、`checks-fast-core`、`checks-node-compat-node22`、`check-prod-types` 以及 `check-test-types`                                                                                                                                                                                                                                     |
| `blacksmith-8vcpu-ubuntu-2404`   | build-smoke、Linux Node 測試分片、內建外掛測試分片、`check-additional` 分片、`android`                                                                                                                                                                                                                                                                                         |
| `blacksmith-16vcpu-ubuntu-2404`  | `build-artifacts`、`check-lint`（對 CPU 敏感度足夠高，使得 8 個 vCPU 的成本超過了它們節省的時間）；install-smoke Docker 建置（32 vCPU 的佇列時間成本超過了它節省的時間）                                                                                                                                                                                                       |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                                                                                                                                               |
| `blacksmith-6vcpu-macos-latest`  | 在 `openclaw/openclaw` 上的 `macos-node`；分支 則回退到 `macos-latest`                                                                                                                                                                                                                                                                                                         |
| `blacksmith-12vcpu-macos-latest` | 在 `openclaw/openclaw` 上的 `macos-swift`；分支 則回退到 `macos-latest`                                                                                                                                                                                                                                                                                                        |

Canonical-repo CI 將 Blacksmith 保持為預設的 runner 路徑。在 `preflight` 期間，`scripts/ci-runner-labels.mjs` 會檢查最近排隊中和進行中的 Actions 執行，尋找已排隊的 Blacksmith 工作。如果特定的 Blacksmith 標籤已經有排隊的工作，將會使用該確切標籤的下游工作會在該次執行中回退到相符的 GitHub 託管 runner（`ubuntu-24.04`、`windows-2025` 或 `macos-latest`）。同一 OS 系列中的其他 Blacksmith 尺寸則保持在它們的主要標籤上。如果 API 探測失敗，則不會套用回退機制。

## 本機對應項

```bash
pnpm changed:lanes                            # inspect the local changed-lane classifier for origin/main...HEAD
pnpm check:changed                            # smart local check gate: changed typecheck/lint/guards by boundary lane
pnpm check                                    # fast local gate: prod tsgo + sharded lint + parallel fast guards
pnpm check:test-types
pnpm check:timed                              # same gate with per-stage timings
pnpm build:strict-smoke
pnpm check:architecture
pnpm test:gateway:watch-regression
pnpm test                                     # vitest tests
pnpm test:changed                             # cheap smart changed Vitest targets
pnpm test:channels
pnpm test:contracts:channels
pnpm check:docs                               # docs format + lint + broken links
pnpm build                                    # build dist when CI artifact/build-smoke lanes matter
pnpm ci:timings                               # summarize the latest origin/main push CI run
pnpm ci:timings:recent                        # compare recent successful main CI runs
node scripts/ci-run-timings.mjs <run-id>      # summarize wall time, queue time, and slowest jobs
node scripts/ci-run-timings.mjs --latest-main # ignore issue/comment noise and choose origin/main push CI
node scripts/ci-run-timings.mjs --recent 10   # compare recent successful main CI runs
pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json
pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json
pnpm perf:kova:summary --report .artifacts/kova/reports/mock-provider/report.json --output .artifacts/kova/summary.md
```

## OpenClaw 效能

`OpenClaw Performance` 是產品/執行時 效能工作流程。它每天在 `main` 上執行，並且可以手動觸發：

```bash
gh workflow run openclaw-performance.yml --ref main -f profile=diagnostic -f repeat=3
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_gpt54=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

手動觸發通常會對工作流程 ref 進行基準測試。請設定 `target_ref` 以使用目前的工作流程實作對發行標籤 或其他分支 進行基準測試。已發佈的報表路徑和最新指標 是以受測 ref 為鍵值，並且每個 `index.md` 都會記錄受測 ref/SHA、工作流程 ref/SHA、Kova ref、設定檔、通道授權模式、模型、重複次數和情境篩選器。

工作流程從固定的版本安裝 OCM，並在固定的 `kova_ref` 輸入處從 `openclaw/Kova` 安裝 Kova，然後執行三個通道：

- `mock-provider`：針對具有確定性虛擬 OpenAI 相容驗證的本地建構執行時，執行 Kova 診診斷情境。
- `mock-deep-profile`：針對啟動、閘道和代理輪次熱點進行 CPU/堆疊/追蹤分析。
- `live-gpt54`：真實的 OpenAI `openai/gpt-5.4` 代理輪次，當 `OPENAI_API_KEY` 不可用時會跳過。

模擬供應商通道也會在 Kova 通過之後執行 OpenClaw 原生來源探測：預設、掛鉤和 50 個外掛程式啟動情況下的閘道啟動時間和記憶體；重複的模擬 OpenAI `channel-chat-baseline` hello 迴圈；以及針對已啟動閘道的 CLI 啟動指令。來源探測 Markdown 摘要位於報告包中的 `source/index.md`，旁邊附有原始 JSON。

每個通道都會上傳 GitHub 成品。當配置了 `CLAWGRIT_REPORTS_TOKEN` 時，工作流程也會將 `report.json`、`report.md`、包、`index.md` 和來源探測成品提交到 `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/` 下的 `openclaw/clawgrit-reports`。當前測試的 ref 指標會寫入為 `openclaw-performance/<tested-ref>/latest-<lane>.json`。

## 完整版本驗證

`Full Release Validation` 是用於「發布前執行所有項目」的手動統管工作流程。它接受分支、標籤或完整的提交 SHA，並使用該目標觸發手動 `CI` 工作流程，觸發 `Plugin Prerelease` 以進行僅限發布的外掛/套件/靜態/Docker 驗證，並觸發 `OpenClaw Release Checks` 以進行安裝冒煙測試、套件驗收、跨 OS 套件檢查、QA Lab 一致性、Matrix 和 Telegram 通道。穩定/預設執行會將詳盡的即時/E2E 和 Docker 發布路徑覆蓋率保留在 `run_release_soak=true` 之後；`release_profile=full` 會強制開啟該覆蓋率，以便廣泛的諮詢驗證保持廣泛。配合 `rerun_group=all` 和 `release_profile=full`，它還會針對發布檢查中的 `release-package-under-test` 成果執行 `NPM Telegram Beta E2E`。發布後，傳遞 `release_package_spec` 即可在發布檢查、套件驗收、Docker、跨 OS 和 Telegram 之間重複使用已發布的 npm 套件，而無需重新建置。僅當 Telegram 必須驗證不同的套件時，才使用 `npm_telegram_package_spec`。

請參閱 [完整發布驗證](/zh-Hant/reference/full-release-validation) 以了解
階段矩陣、確切的工作流程工作名稱、設定檔差異、成果以及
專注的重新執行控制代碼。

`OpenClaw Release Publish` 是手動變異發布工作流程。在發布標籤存在且
OpenClaw npm 預檢成功後，請從 `release/YYYY.M.D` 或 `main` 觸發它。它會驗證 `pnpm plugins:sync:check`，
為所有可發布的外掛套件觸發 `Plugin NPM Release`，
針對相同的發布 SHA 觸發 `Plugin ClawHub Release`，然後才
使用已儲存的 `preflight_run_id` 觸發 `OpenClaw NPM Release`。

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

若要在快速變動的分支上進行固定提交驗證，請使用輔助工具而非
`gh workflow run ... --ref main -f ref=<sha>`：

```bash
pnpm ci:full-release --sha <full-sha>
```

GitHub workflow dispatch refs 必須是分支或標籤，不能是原始的 commit SHA。Helper 會在目標 SHA 處推送一個臨時的 `release-ci/<sha>-...` 分支，從該固定的 ref 調度 `Full Release Validation`，驗證每個子工作流程 `headSha` 是否與目標相符，並在運行完成後刪除臨時分支。如果任何子工作流程在不同的 SHA 上運行，總管驗證器也會失敗。

`release_profile` 控制傳遞給 release 檢查的 live/provider 範圍。手動 release 工作流程預設為 `stable`；僅當您有意使用廣泛的 advisory provider/media 矩陣時，才使用 `full`。`run_release_soak` 控制穩定/預設 release 檢查是否執行完整的 live/E2E 和 Docker release-path soak；`full` 強制執行 soak。

- `minimum` 保留最快的 OpenAI/core 關鍵發布管道。
- `stable` 新增穩定的 provider/backend 集合。
- `full` 執行廣泛的 advisory provider/media 矩陣。

總管會記錄已調度的子運行 ID，最終的 `Verify full validation` 工作會重新檢查當前子運行的結論，並為每個子運行附加最慢工作表格。如果子工作流程被重新運行並通過，請僅重新運行父驗證器工作以重新整理總管結果和計時摘要。

為了進行修復，`Full Release Validation` 和 `OpenClaw Release Checks` 都接受 `rerun_group`。對於發布候選版本，使用 `all`；對於僅常規完整 CI 子任務，使用 `ci`；對於僅插件預發布子任務，使用 `plugin-prerelease`；對於所有發布子任務，使用 `release-checks`；或者對於總覽上的更窄範圍群組：`install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 或 `npm-telegram`。這可以在進行針對性修復後，將失敗的發布匣子重試範圍限制在一定界限內。對於一個失敗的跨 OS 通道，將 `rerun_group=cross-os` 與 `cross_os_suite_filter` 結合使用，例如 `windows/packaged-upgrade`；長時間的跨 OS 指令會輸出心跳行，並且打包升級摘要包含各階段的計時。QA 發布檢查通道是諮詢性的，因此僅 QA 的失敗會發出警告，但不會阻擋發布檢查驗證器。

`OpenClaw Release Checks` 使用受信任的工作流程參照將選定的參照解析一次為 `release-package-under-test` tarball，然後將該工件傳遞給跨 OS 檢查和套件驗收，以及當運行浸泡測試覆蓋時的即時/E2E 發布路徑 Docker 工作流程。這保持了套件位元組在發布匣子間的一致性，並避免在多個子任務中重新打包相同的候選版本。

針對 `ref=main` 和 `rerun_group=all` 重複的 `Full Release Validation` 執行會取代較舊的總覽工作流程。父監視器會在父任務取消時取消它已經分派的任何子工作流程，因此較新的 main 驗證不會滯後於過時的兩小時發布檢查執行。發布分支/標籤驗證和針對性重試群組會保留 `cancel-in-progress: false`。

## 即時和 E2E 分片

發布即時/E2E 子任務保持了廣泛的原生 `pnpm test:live` 覆蓋率，但它透過 `scripts/test-live-shard.mjs` 作為命名分片來運行，而不是作為一個序列任務：

- `native-live-src-agents`
- `native-live-src-gateway-core`
- 提供者過濾的 `native-live-src-gateway-profiles` 工作
- `native-live-src-gateway-backends`
- `native-live-test`
- `native-live-extensions-a-k`
- `native-live-extensions-l-n`
- `native-live-extensions-openai`
- `native-live-extensions-o-z-other`
- `native-live-extensions-xai`
- 分割媒體音訊/影片分片與提供者過濾的音樂分片

這樣能在保持相同檔案覆蓋率的同時，讓緩慢的即時提供者失敗更容易重新執行和診斷。聚合的 `native-live-extensions-o-z`、`native-live-extensions-media` 和 `native-live-extensions-media-music` 分片名稱仍然有效，可用於手動一次性重新執行。

原生即時媒體分片在 `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04` 中執行，該映像檔由 `Live Media Runner Image` 工作流程建構。該映像檔預先安裝了 `ffmpeg` 和 `ffprobe`；媒體工作在設定前僅驗證二進位檔。請將 Docker 支援的即時套件保留在一般的 Blacksmith 執行器上 —— 容器工作不是啟動巢狀 Docker 測試的適當場所。

Docker 支援的即時模型/後端分片針對每個選取的提交使用一個獨立的共享 `ghcr.io/openclaw/openclaw-live-test:<sha>` 映像檔。即時發行工作流程會建構並推送該映像檔一次，然後 Docker 即時模型、提供者分片的閘道、CLI 後端、ACP 綁定和 Codex 鞍具分片會使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行。閘道 Docker 分片在層級腳本上攜帶了明確的 `timeout` 上限，低於工作流程工作逾時時間，以便卡住的容器或清理路徑能快速失敗，而不是耗用整個發行檢查的預算。如果這些分片獨立重新建構完整的來源 Docker 目標，則表示發行執行設定錯誤，並將在重複的映像檔建構上浪費時間。

## 套件驗收

當問題是「此可安裝的 OpenClaw 套件是否能作為產品正常運作？」時，請使用 `Package Acceptance`。這與一般的 CI 不同：一般 CI 驗證原始碼樹，而套件驗收則透過使用者安裝或更新後所使用的相同 Docker E2E 鞍具來驗證單一 tarball。

### 工作

1. `resolve_package` 檢出 `workflow_ref`，解析一個候選套件，寫入 `.artifacts/docker-e2e-package/openclaw-current.tgz`，寫入 `.artifacts/docker-e2e-package/package-candidate.json`，將兩者作為 `package-under-test` 構件上傳，並在 GitHub 步驟摘要中列印來源、工作流程引用、套件引用、版本、SHA-256 和設定檔。
2. `docker_acceptance` 使用 `ref=workflow_ref` 和 `package_artifact_name=package-under-test` 呼叫 `openclaw-live-and-e2e-checks-reusable.yml`。可重用的工作流程會下載該構件、驗證 tarball 清單、在需要時準備 package-digest Docker 映像檔，並對該套件執行選定的 Docker 軌道，而不是封裝工作流程檢出。當設定檔選擇多個目標 `docker_lanes` 時，可重用的工作流程會準備一次套件和共享映像檔，然後將這些軌道作為具有唯一構件的並行目標 Docker 工作分發出去。
3. `package_telegram` 可選地呼叫 `NPM Telegram Beta E2E`。當 `telegram_mode` 不是 `none` 時它會執行，並且當套件驗證解析了一個套件時安裝相同的 `package-under-test` 構件；獨立的 Telegram 調度仍然可以安裝已發布的 npm 規格。
4. 如果套件解析、Docker 驗證或可選的 Telegram 軌道失敗，`summary` 將導致工作流程失敗。

### 候選來源

- `source=npm` 僅接受 `openclaw@beta`、`openclaw@latest` 或確切的 OpenClaw 發布版本（例如 `openclaw@2026.4.27-beta.2`）。將其用於已發布的 prelease/stable 驗證。
- `source=ref` 封裝受信任的 `package_ref` 分支、標籤或完整提交 SHA。解析器會獲取 OpenClaw 分支/標籤，驗證選定的提交可從儲存庫分支歷史記錄或發布標籤到達，在分離的工作樹中安裝 deps，並使用 `scripts/package-openclaw-for-docker.mjs` 封裝它。
- `source=url` 下載 HTTPS `.tgz`；需要 `package_sha256`。
- `source=artifact` 從 `artifact_run_id` 和 `artifact_name` 下載一個 `.tgz`；`package_sha256` 是可選的，但對於外部共享的成品應該提供。

保持 `workflow_ref` 和 `package_ref` 分開。`workflow_ref` 是執行測試的受信任工作流程/harness 程式碼。`package_ref` 是在 `source=ref` 時被打包的原始碼提交。這讓當前的測試 harness 可以驗證較舊的受信任原始碼提交，而無需執行舊的工作流程邏輯。

### 套件設定檔

- `smoke` — `npm-onboard-channel-agent`, `gateway-network`, `config-reload`
- `package` — `npm-onboard-channel-agent`, `doctor-switch`, `update-channel-switch`, `skill-install`, `update-corrupt-plugin`, `upgrade-survivor`, `published-upgrade-survivor`, `update-restart-auth`, `plugins-offline`, `plugin-update`
- `product` — `package` 加上 `mcp-channels`, `cron-mcp-cleanup`, `openai-web-search-minimal`, `openwebui`
- `full` — 包含 OpenWebUI 的完整 Docker 發布路徑區塊
- `custom` — 精確的 `docker_lanes`；當 `suite_profile=custom` 時為必填

`package` 設定檔使用離線外掛覆蓋範圍，因此已發布套件的驗證不會受到即時 ClawHub 可用性的阻礙。可選的 Telegram 通道在 `NPM Telegram Beta E2E` 中重複使用 `package-under-test` 成品，並保留已發布的 npm 規格路徑以供獨立分派使用。

關於專門的更新和外掛測試政策，包括本機指令、Docker 通道、Package Acceptance 輸入、發布預設值和故障分診，請參閱 [測試更新和外掛](/zh-Hant/help/testing-updates-plugins)。

版本檢查會使用 `source=artifact`、準備好的版本套件產出物 `suite_profile=custom`、`docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'` 和 `telegram_mode=mock-openai` 呼叫套件驗收。這能確保套件遷移、更新、即時 ClawHub 技能安裝、過時外掛依賴清理、已配置外掛安裝修復、離線外掛、外掛更新以及 Telegram 驗證都在同一個解析出的套件 tarball 上進行。在發布 beta 版後，於「完整版本驗證」或「OpenClaw 版本檢查」上設定 `release_package_spec`，以便針對已發布的 npm 套件執行相同的矩陣測試而無需重新建置；僅當套件驗收需要與其餘版本驗證不同的套件時，才設定 `package_acceptance_package_spec`。跨作業系統版本檢查仍涵蓋特定作業系統的上手、安裝程式和平台行為；套件/更新產品驗證應從套件驗收開始。`published-upgrade-survivor` Docker 軌道會在阻塞性版本路徑中，於每次執行驗證一個已發布的套件基線。在套件驗收中，解析出的 `package-under-test` tarball 永遠是候選版本，而 `published_upgrade_survivor_baseline` 選擇回退的已發布基線，預設為 `openclaw@latest`；失敗軌道的重新執行指令會保留該基線。帶有 `run_release_soak=true` 或 `release_profile=full` 的完整版本驗證會設定 `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` 和 `published_upgrade_survivor_scenarios=reported-issues`，以擴展涵蓋四個最新的穩定 npm 版本，加上釘選的外掛相容性邊界版本，以及針對 Feishu 配置、保留的 bootstrap/persona 檔案、已配置的 OpenClaw 外掛安裝、tilde 記錄路徑和過時的舊版外掛依賴根目錄的問題狀測試夾具。多基線已發布升級的存留者選擇會依基線分片至不同的目標 Docker 執行器任務。當問題是徹底的已發布更新清理，而非正常的完整版本 CI 廣度時，獨立的 `Update Migration` 工作流程會使用帶有 `all-since-2026.4.23` 和 `plugin-deps-cleanup` 的 `update-migration` Docker 軌道。本地彙整執行可以使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 傳遞確切的套件規格，使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 保留單一軌道（例如 `openclaw@2026.4.15`），或為情境矩陣設定 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS`。已發布軌道會使用內建的 `openclaw config set` 指令配方配置基線，在 `summary.json` 中記錄配方步驟，並在 Gateway 啟動後探測 `/healthz`、`/readyz` 以及 RPC 狀態。Windows 打包和安裝程式全新軌道也會驗證已安裝的套件是否能從原始的絕對 Windows 路徑匯入瀏覽器控制覆寫。OpenAI 跨作業系統代理輪次煙霧測試在設定時預設為 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否則為 `openai/gpt-5.4`，因此安裝和 Gateway 驗證會保持在 GPT-5 測試模型上，同時避免 GPT-4.x 預設值。

### 舊版相容性視窗

套件驗收對已發布的套件設有舊版相容性視窗。`2026.4.25` 及之前的套件，包括 `2026.4.25-beta.*`，可以使用相容性路徑：

- `dist/postinstall-inventory.json` 中已知的私有 QA 項目可能指向 tarball 中省略的檔案；
- 當套件未暴露該旗標時，`doctor-switch` 可能會跳過 `gateway install --wrapper` 持久性子案例；
- `update-channel-switch` 可能會從 tarball 衍生的假 git fixture 中修剪遺失的 pnpm `patchedDependencies`，並且可能記錄遺失的持久性 `update.channel`；
- plugin smokes 可能會讀取舊版安裝記錄位置或接受遺失的 marketplace 安裝記錄持久性；
- `plugin-update` 可能允許設定元數據遷移，同時仍要求安裝記錄和不重新安裝行為保持不變。

已發布的 `2026.4.26` 套件也可能對已發送的本地建置元數據戳記檔案發出警告。後續的套件必須滿足現代合約；相同的條件會導致失敗而不是警告或跳過。

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

當對失敗的套件驗收執行進行偵錯時，請從 `resolve_package` 摘要開始，以確認套件來源、版本和 SHA-256。然後檢查 `docker_acceptance` 子執行及其 Docker 成品：`.artifacts/docker-tests/**/summary.json`、`failures.json`、lane 日誌、階段計時和重新執行指令。建議優先重新執行失敗的套件設定檔或特定的 Docker lanes，而不是重新執行完整的發布驗證。

## 安裝 smokes

獨立的 `Install Smoke` 工作流程透過其自己的 `preflight` 工作重複使用相同的 scope script。它將 smokes 涵蓋範圍分割為 `run_fast_install_smoke` 和 `run_full_install_smoke`。

- **Fast path** 針對涉及 Docker/套件介面、捆綁外掛程式套件/資訊清單變更，或 Docker 測試工作所執行的核心外掛程式/通道/閘道/外掛程式 SDK 介面的提取要求執行。僅原始碼的捆綁外掛程式變更、僅測試的編輯和僅文件的編輯不會保留 Docker 背景工作。Fast path 會建置根 Dockerfile 映像檔一次，檢查 CLI，執行代理程式刪除共用工作區 CLI 測試，執行容器閘道網路端對端測試，驗證捆綁延伸模組建置引數，並在 240 秒的彙總指令逾時下執行有界的捆綁外掛程式 Docker 設定檔（每個情境的 Docker 執行會個別設定上限）。
- **Full path** 會保留 QR 套件安裝和安裝程式 Docker/更新涵蓋範圍，用於每夜排程執行、手動分派、工作流程呼叫發行版本檢查，以及真正涉及安裝程式/套件/Docker 介面的提取要求。在完整模式下，install-smoke 會準備或重複使用一個目標 SHA GHCR 根 Dockerfile 測試映像檔，然後將 QR 套件安裝、根 Dockerfile/閘道測試、安裝程式/更新測試以及快速的捆綁外掛程式 Docker E2E 作為獨立工作執行，以便安裝程式工作不需等待根映像測試完成。

`main` 推送（包括合併提交）不會強制執行完整路徑；當變更範圍邏輯在推送時要求完整涵蓋範圍時，工作流程會保留快速 Docker 測試，並將完整安裝測試留給每夜或發行版本驗證。

緩慢的 Bun 全域安裝映像提供者測試是另外由 `run_bun_global_install_smoke` 控管的。它會在每夜排程和發行版本檢查工作流程中執行，手動 `Install Smoke` 分派可以選擇加入，但提取要求和 `main` 推送則不會。QR 和安裝程式 Docker 測試保留其專注於安裝的 Dockerfiles。

## 本機 Docker E2E

`pnpm test:docker:all` 預先建置一個共用的即時測試映像，將 OpenClaw 打包一次為 npm tarball，並建置兩個共用的 `scripts/e2e/Dockerfile` 映像：

- 一個用於安裝程式/更新/外掛程式相依性通道的裸機 Node/Git 執行器；
- 一個將相同的 tarball 安裝到 `/app` 的功能映像，用於正常功能通道。

Docker 通道定義位於 `scripts/lib/docker-e2e-scenarios.mjs`，規劃器邏輯位於 `scripts/lib/docker-e2e-plan.mjs`，而執行器僅執行選定的計劃。排程器使用 `OPENCLAW_DOCKER_E2E_BARE_IMAGE` 和 `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE` 為每個通道選取映像檔，然後使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行通道。

### 可調參數

| 變數                                   | 預設值  | 用途                                                                           |
| -------------------------------------- | ------- | ------------------------------------------------------------------------------ |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10      | 一般通道的主集區插數量。                                                       |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10      | 供應商敏感的尾部集區插數量。                                                   |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9       | 即時通道並發上限，以避免供應商進行限流。                                       |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10      | npm 安裝通道並發上限。                                                         |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7       | 多服務通道並發上限。                                                           |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000    | 通道啟動之間的錯開時間，以避免 Docker daemon 建立風暴；設定 `0` 表示不錯開。   |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000 | 每個通道的後援逾時（120 分鐘）；選定的即時/尾部通道使用更嚴格的上限。          |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | 未設定  | `1` 會列印排程器計劃而不執行通道。                                             |
| `OPENCLAW_DOCKER_ALL_LANES`            | 未設定  | 逗號分隔的精確通道列表；跳過清理冒煙測試，以便代理程式可以重現一個失敗的通道。 |

超過其有效上限的通道仍可以從空集區啟動，然後單獨運行直到它釋放容量。本地聚合會預檢 Docker、移除過時的 OpenClaw E2E 容器、發出活動通道狀態、持久化通道計時以進行最長優先排序，並且預設在第一次失敗後停止排程新的集區通道。

### 可重複使用的即時/E2E 工作流程

可重用的 Live/E2E 工作流程會詢問 `scripts/test-docker-all.mjs --plan-json` 需要哪些套件、映像檔類型、Live 映像檔、Lane 和憑證覆蓋範圍。`scripts/docker-e2e.mjs` 接著會將該計劃轉換為 GitHub 輸出和摘要。它會透過 `scripts/package-openclaw-for-docker.mjs` 打包 OpenClaw、下載目前執行的套件成果，或是從 `package_artifact_run_id` 下載套件成果；驗證 tarball 清單；當計劃需要已安裝套件的 Lanes 時，透過 Blacksmith 的 Docker 層快取建置並推送標記有套件摘要的 Bare/Functional GHCR Docker E2E 映像檔；並重複使用提供的 `docker_e2e_bare_image`/`docker_e2e_functional_image` 輸入或現有的套件摘要映像檔，而不重新建置。Docker 映像檔提取會以每次嘗試 180 秒的上限進行重試，因此卡住的 Registry/Cache 串流會快速重試，而不會佔用大部分 CI 的關鍵路徑。

### Release-path 區塊

Release Docker 覆蓋範圍會使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行較小的區塊工作，因此每個區塊僅提取其所需的映像檔類型，並透過同一個加權排程器執行多個 Lanes：

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

目前的 Release Docker 區塊為 `core`、`package-update-openai`、`package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、`plugins-runtime-services` 以及 `plugins-runtime-install-a` 透過 `plugins-runtime-install-h`。`plugins-runtime-core`、`plugins-runtime` 和 `plugins-integrations` 仍為彙總的 Plugin/Runtime 別名。`install-e2e` Lane 別名仍是兩個 Provider Installer Lanes 的彙總手動重新執行別名。

當完整的 Release-path 覆蓋範圍有要求時，OpenWebUI 會被納入 `plugins-runtime-services`，並僅針對僅 OpenWebUI 的分派保留獨立的 `openwebui` 區塊。Bundled-channel 更新 Lanes 會因暫時性的 npm 網路失敗重試一次。

每個區塊會上傳包含通道日誌、計時、`summary.json`、`failures.json`、階段計時、排程器計劃 JSON、慢速通道表和各通道重新執行指令的 `.artifacts/docker-tests/`。工作流程 `docker_lanes` 輸入會針對準備好的映像檔執行選定的通道，而非區塊工作，這能讓失敗通道的偵錯侷限在一個目標 Docker 工作中，並為該次執行準備、下載或重用套件工件；如果選定的通道是即時 Docker 通道，目標工作會在本地為該次重新執行建置即時測試映像檔。產生的各通道 GitHub 重新執行指令會在這些值存在時包含 `package_artifact_run_id`、`package_artifact_name` 和準備好的映像檔輸入，因此失敗的通道可以重用失敗執行中的確切套件和映像檔。

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

排程的即時/E2E 工作流程每天會執行完整的發行路徑 Docker 套件。

## 外掛程式預先發行

`Plugin Prerelease` 是成本較高的產品/套件覆蓋範圍，因此它是由 `Full Release Validation` 或特定操作員分派的獨立工作流程。一般的 PR、`main` 推送和獨立的手動 CI 分派都會關閉該套件。它會在八個擴充工作程式之間平衡捆綁的外掛程式測試；這些擴充分片工作一次會執行最多兩個外掛程式設定組，每個組有一個 Vitest 工作程式和較大的 Node 堆積，以便匯入繁重的外掛程式批次不會建立額外的 CI 工作。僅限發行的 Docker 預先發行路徑會將目標 Docker 通道分批為小組，以避免為一到三分鐘的工作保留數十個執行器。工作流程也會從 `@openclaw/plugin-inspector` 上傳資訊性 `plugin-inspector-advisory` 工件；檢查器的發現是分類輸入，不會改變封鎖的外掛程式預先發行閘道。

## QA Lab

QA Lab 在主要智能範圍工作流程之外擁有專屬的 CI 通道。代理對等性嵌套在廣泛的 QA 和發行工具下，而非獨立的 PR 工作流程。當對等性應隨廣泛驗證執行時，請搭配 `rerun_group=qa-parity` 使用 `Full Release Validation`。

- `QA-Lab - All Lanes` 工作流程每晚在 `main` 上執行，並支援手動觸發；它會將 mock parity lane、live Matrix lane 以及 live Telegram 和 Discord lanes 作為並行任務展開。Live 任務使用 `qa-live-shared` 環境，而 Telegram/Discord 使用 Convex leases。

Release 檢查使用決定性 mock provider 和 mock-qualified 模型（`mock-openai/gpt-5.5` 和 `mock-openai/gpt-5.5-alt`）來執行 Matrix 和 Telegram live transport lanes，以便將 channel contract 與 live model 延遲和正常的 provider-plugin 啟動隔離開來。Live transport gateway 會停用記憶體搜尋，因為 QA parity 會單獨涵蓋記憶體行為；provider 連線性則由單獨的 live model、native provider 和 Docker provider suite 涵蓋。

Matrix 對於排定和 release gates 使用 `--profile fast`，並且僅在簽出的 CLI 支援時才新增 `--fail-fast`。CLI 預設值和手動工作流程輸入仍保持為 `all`；手動 `matrix_profile=all` dispatch 總是將完整的 Matrix 涵蓋範圍分割為 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 任務。

`OpenClaw Release Checks` 也會在 release 核准前執行 release-critical 的 QA Lab lanes；其 QA parity gate 會將 candidate 和 baseline packs 作為並行 lane 任務執行，然後將這兩個構件下載到一個小型報告任務中，以進行最終的 parity 比較。

對於一般的 PR，請追蹤 scoped CI/check evidence，而不是將 parity 視為必需狀態。

## CodeQL

`CodeQL` 工作流程刻意設計為一個狹窄的初級安全掃描器，而非完整的儲存庫掃描。每日、手動和非草稿的 PR guard run 會掃描 Actions 工作流程程式碼，以及風險最高的 JavaScript/TypeScript 介面，並使用高置信度的安全性查詢，過濾出高/嚴重等級的 `security-severity`。

Pull request guard 保持輕量：僅當 `.github/actions`、`.github/codeql`、`.github/workflows`、`packages` 或 `src` 下的內容變更時才啟動，並且執行與排程工作流程相同的高信心度安全矩陣。Android 和 macOS CodeQL 不包含在 PR 預設值中。

### Security categories

| 類別                                              | 涵蓋範圍                                                                                                                          |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | Auth、secrets、sandbox、cron 和 gateway 基線                                                                                      |
| `/codeql-security-high/channel-runtime-boundary`  | Core channel 實作合約加上 channel plugin runtime、gateway、Plugin SDK、secrets、audit touchpoints                                 |
| `/codeql-security-high/network-ssrf-boundary`     | Core SSRF、IP parsing、network guard、web-fetch 和 Plugin SDK SSRF policy surfaces                                                |
| `/codeql-security-high/mcp-process-tool-boundary` | MCP servers、process execution helpers、outbound delivery 和 agent tool-execution gates                                           |
| `/codeql-security-high/plugin-trust-boundary`     | Plugin install、loader、manifest、registry、package-manager install、source-loading 和 Plugin SDK package contract trust surfaces |

### 平台特定安全分片

- `CodeQL Android Critical Security` — 排程的 Android 安全分片。在 workflow sanity 接受的最小型 Blacksmith Linux runner 上為 CodeQL 手動建置 Android 應用程式。上傳至 `/codeql-critical-security/android`。
- `CodeQL macOS Critical Security` — 每週/手動 macOS 安全分片。在 Blacksmith macOS 上為 CodeQL 手動建置 macOS 應用程式，從上傳的 SARIF 中篩選出相依性建置結果，並上傳至 `/codeql-critical-security/macos`。排除在每日預設值之外，因為即使在乾淨的情況下，macOS 建置也會佔用大部分執行時間。

### Critical Quality categories

`CodeQL Critical Quality` 是對應的非安全性分片。它僅在較小的 Blacksmith Linux 執行器上，針對狹窄的高價值表面，執行錯誤嚴重性、非安全性的 JavaScript/TypeScript 品質查詢。其 PR 防護故意設計得比排程設定檔更小：非草稿 PR 僅針對代理程式指令/模型/工具執行與回覆分發程式碼、設定 Schema/遷移/IO 程式碼、驗證/秘密/沙盒/安全性程式碼、核心通道與打包通道插件執行時、閘道協定/伺服器方法、記憶體執行時/SDK 介接、MCP/程序/外寄傳遞、提供者執行時/模型目錄、會話診斷/傳遞佇列、插件載入器、Plugin SDK/套件合約，或 Plugin SDK 回覆執行時的變更，執行匹配的 `agent-runtime-boundary`、`config-boundary`、`core-auth-secrets`、`channel-runtime-boundary`、`gateway-runtime-boundary`、`memory-runtime-boundary`、`mcp-process-runtime-boundary`、`provider-runtime-boundary`、`session-diagnostics-boundary`、`plugin-boundary`、`plugin-sdk-package-contract` 和 `plugin-sdk-reply-runtime` 分片。CodeQL 設定與品質工作流程的變更會執行所有十二個 PR 品質分片。

手動分發接受：

```
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

狹窄設定檔是用於獨立執行單一品質分片的教学/迭代掛鉤。

| 類別                                                    | 表面                                                                                                      |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `/codeql-critical-quality/core-auth-secrets`            | 驗證、秘密、沙盒、 cron 和閘道安全性邊界程式碼                                                            |
| `/codeql-critical-quality/config-boundary`              | 設定 Schema、遷移、正規化和 IO 契約                                                                       |
| `/codeql-critical-quality/gateway-runtime-boundary`     | 閘道協定 Schema 與伺服器方法契約                                                                          |
| `/codeql-critical-quality/channel-runtime-boundary`     | 核心通道與打包通道插件實作契約                                                                            |
| `/codeql-critical-quality/agent-runtime-boundary`       | 指令執行、模型/提供者分發、自動回覆分發與佇列，以及 ACP 控制平面執行時契約                                |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | MCP 伺服器與工具橋接器、程序監督輔助程式，以及外寄傳遞契約                                                |
| `/codeql-critical-quality/memory-runtime-boundary`      | Memory 主機 SDK、記憶體執行時外觀、記憶體 Plugin SDK 別名、記憶體執行時啟用膠合程式碼，以及記憶體醫生指令 |
| `/codeql-critical-quality/session-diagnostics-boundary` | 回覆佇列內部機制、會話傳遞佇列、輸出會話綁定/傳遞輔助程式、診斷事件/日誌套件介面，以及會話醫生 CLI 合約   |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | Plugin SDK 輸入回覆分派、回酬載/分塊/執行時輔助程式、通道回覆選項、傳遞佇列以及會話/執行緒綁定輔助程式    |
| `/codeql-critical-quality/provider-runtime-boundary`    | 模型目錄正規化、提供者驗證與探索、提供者執行時註冊、提供者預設值/目錄，以及 Web/搜尋/擷取/嵌入註冊表      |
| `/codeql-critical-quality/ui-control-plane`             | 控制 UI 啟動程序、本地持久性、閘道控制流程以及任務控制平面執行時合約                                      |
| `/codeql-critical-quality/web-media-runtime-boundary`   | 核心 Web 擷取/搜尋、媒體 IO、媒體理解、圖像生成以及媒體生成執行時合約                                     |
| `/codeql-critical-quality/plugin-boundary`              | 載入器、註冊表、公開介面以及 Plugin SDK 進入點合約                                                        |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | 已發布的套件端 Plugin SDK 原始碼與外掛套件合約輔助程式                                                    |

品質與安全性保持分離，以便安排、測量、停用或擴充品質發現，而不會掩蓋安全性訊號。只有在精簡設定檔具有穩定的執行時和訊號之後，才應將 Swift、Python 和隨附外掛的 CodeQL 擴充作為範圍限定或分片的後續工作重新加入。

## 維護工作流程

### Docs Agent

`Docs Agent` 工作流程是一個事件驅動的 Codex 維護通道，用於讓現有文件與最近的變更保持一致。它沒有單純的排程：在 `main` 上成功的非機器人推送 CI 執行可以觸發它，且手動分派可以直接執行它。當 `main` 已更新，或一小時內建立了另一個非跳過的 Docs Agent 執行時，工作流程執行叫用會跳過。當它執行時，它會檢閱從上一次非跳過的 Docs Agent 來源 SHA 到目前 `main` 的提交範圍，因此每小時執行一次就能涵蓋自上次文件處理後累積的所有主要變更。

### 測試效能代理程式

`Test Performance Agent` 工作流程是一個用於緩慢測試的事件驅動 Codex 維護通道。它沒有單純的排程：在 `main` 上成功的非機器人推送 CI 執行可以觸發它，但如果該 UTC 天內另一個工作流程執行調用已經執行或正在執行，它會跳過。手動分發會繞過該每日活動閘門。該通道建立完整的套件分組 Vitest 效能報告，讓 Codex 僅進行小型保持覆蓋率的測試效能修復，而不是廣泛的重構，然後重新執行完整套件報告並拒絕減少通過基準測試數量的變更。如果基準有失敗的測試，Codex 可能只修復明顯的失敗，並且在提交任何內容之前，代理後的完整套件報告必須通過。當 `main` 在機器人推送落地之前推進時，該通道會重新變基驗證過的修補程式，重新執行 `pnpm check:changed`，並重試推送；衝突的過時修補程式會被跳過。它使用 GitHub 託管的 Ubuntu，以便 Codex 動作可以保持與文件代理相同的 drop-sudo 安全姿態。

### 合併後的重複 PR

`Duplicate PRs After Merge` 工作流程是一個用於落地後重複清理的手動維護者工作流程。它預設為試執行，並且僅在 `apply=true` 時關閉明確列出的 PR。在修改 GitHub 之前，它會驗證已落地的 PR 已合併，並且每個重複項都有共同的引用問題或重疊的變更區塊。

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## 本檢查閘門和變更路由

本機變更通道邏輯位於 `scripts/changed-lanes.mjs` 中，並由 `scripts/check-changed.mjs` 執行。該本檢查閘門在架構邊界方面比廣泛的 CI 平台範圍更嚴格：

- core production 變更執行 core prod 和 core test typecheck 以及 core lint/guards；
- core test-only 變更僅執行 core test typecheck 以及 core lint；
- extension production 變更執行 extension prod 和 extension test typecheck 以及 extension lint；
- extension test-only 變更執行 extension test typecheck 以及 extension lint；
- 公開 Plugin SDK 或 plugin-contract 變更會擴展到 extension typecheck，因為 extension 依賴這些核心合約（Vitest extension 掃描保持為明確的測試工作）；
- 僅發布中繼資料（metadata）的版本遞增會執行針對性的版本/配置/根依賴檢查；
- 未知的根/配置變更會在安全上失效於所有檢查通道。

本機變更測試的路由位於 `scripts/test-projects.test-support.mjs`，且刻意設計得比 `check:changed` 更低成本：直接編輯測試會執行自身，原始碼編輯則偏好明確映射，接著是同層測試和匯入圖相依項。共用群組室傳遞配置是明確映射之一：對群組可見回覆配置、來源回覆傳遞模式或訊息工具系統提示的變更，會路由至核心回覆測試加上 Discord 與 Slack 傳遞迴歸，因此共用的預設變更會在首次 PR 推送前失效。僅當變更範圍足以讓低成本的映射集無法作為可靠代理時，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。

## Testbox 驗證

Crabbox 是程式庫擁有的遠端機器包裝函式，用於維護者 Linux 證明。當檢查對本機編輯迴圈來說過於廣泛、需要 CI 對等性，或者當證明需要密鑰、Docker、套件通道、可重用機器或遠端日誌時，請從程式庫根目錄使用它。正常的 OpenClaw 後端是 `blacksmith-testbox`；擁有的 AWS/Hetzner 容量是 Blacksmith 停機、配額問題或明確擁有容量測試的備援方案。

Crabbox 支援的 Blacksmith 會執行暖機、宣告、同步、執行、報告並清理一次性 Testbox。內建的同步健全性檢查會在必要的根檔案（如 `pnpm-lock.yaml`）消失，或 `git status --short` 顯示至少 200 個追蹤刪除時快速失效。對於刻意的大規模刪除 PR，請為遠端指令設定 `OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1`。

Crabbox 也會終止停留在同步階段超過五分鐘且未產生同步後輸出的本機 Blacksmith CLI 呼叫。設定 `CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` 可停用此防護，或針對異常大的本機差異使用更大的毫秒值。

首次執行前，請從程式庫根目錄檢查包裝函式：

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

Repo 包裝器會拒絕未公告 `blacksmith-testbox` 的過時 Crabbox 二進制檔。即使 `.crabbox.yaml` 具有擁有雲預設值，仍需明確傳遞提供者。在 Codex 工作樹或連結/稀疏簽出中，請避免使用本機 `pnpm crabbox:run` 腳本，因為 pnpm 可能會在 Crabbox 啟動之前協調相依性；請改為直接叫用 node 包裝器：

```bash
node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox --timing-json --shell -- "pnpm test <path-or-filter>"
```

變更的閘門：

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
  "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
```

專注的測試重新執行：

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
  "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm test <path-or-filter>"
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
  "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm test"
```

讀取最終的 JSON 摘要。實用的欄位包括 `provider`、`leaseId`、`syncDelegated`、`exitCode`、`commandMs` 和 `totalMs`。單次 Blacksmith 支援的 Crabbox 執行應會自動停止 Testbox；如果執行中斷或清理不明確，請檢查即時的盒子並僅停止您建立的盒子：

```bash
blacksmith testbox list --all
blacksmith testbox status --id <tbx_id>
blacksmith testbox stop --id <tbx_id>
```

僅當您有意在相同的已準備盒子上執行多個指令時才使用重複使用：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox --id <tbx_id> --no-sync --timing-json --shell -- "pnpm test <path-or-filter>"
pnpm crabbox:stop -- <tbx_id>
```

如果 Crabbox 是損壞層但 Blacksmith 本身運作正常，僅將直接 Blacksmith 用於 `list`、`status` 和清理等診斷用途。在將直接 Blacksmith 執行視為維護者證明之前，請先修復 Crabbox 路徑。

如果 `blacksmith testbox list --all` 和 `blacksmith testbox status` 運作正常，但新的暖機在幾分鐘後仍處於 `queued` 狀態而沒有 IP 或 Actions 執行 URL，請將其視為 Blacksmith 提供者、佇列、計費或組織限制壓力。停止您建立的已排程 ID，避免啟動更多 Testbox，並在其他人檢查 Blacksmith 儀表板、計費和組織限制時，將證明移至下方的擁有 Crabbox 容量路徑。

僅當 Blacksmith 停機、配額受限、缺少所需環境或擁有容量明確為目標時，才升級至擁有 Crabbox 容量：

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "env NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

在 AWS 壓力下，除非任務確實需要 48xlarge 級別的 CPU，否則請避免使用 `class=beast`。`beast` 請求從 192 個 vCPU 開始，是觸發區域 EC2 Spot 或按需標準配額的最簡單方式。倉庫擁有的 `.crabbox.yaml` 預設為 `standard`、多容量區域和 `capacity.hints: true`，因此經紀的 AWS 租約會打印選定的區域/市場、配額壓力、Spot 回退以及高壓力類別警告。對於較重的廣泛檢查，請使用 `fast`；僅在標準/快速不足時使用 `large`；並僅對異常的 CPU 密集型通道（例如全套件或所有外掛 Docker 矩陣、明確的發布/阻斷驗證，或高核心效能分析）使用 `beast`。不要將 `beast` 用於 `pnpm check:changed`、專注測試、僅文檔工作、普通 lint/typecheck、小型 E2E 重現或 Blacksmith 故障排查。請使用 `--market on-demand` 進行容量診斷，以免 Spot 市場波動混入信號中。

`.crabbox.yaml` 擁有自有雲通道的提供者、同步和 GitHub Actions 還原預設值。它排除本地 `.git`，以便還原的 Actions 結帳保留其自己的遠端 Git 元數據，而不是同步維護者本地遠端和物件存儲，並且它排除永遠不應傳輸的本地運行時/建置構件。`.github/workflows/crabbox-hydrate.yml` 擁有自有雲 `crabbox run --id <cbx_id>` 命令的結帳、Node/pnpm 設定、`origin/main` 獲取和非祕密環境傳遞。

## 相關

- [安裝概覽](/zh-Hant/install)
- [開發通道](/zh-Hant/install/development-channels)
