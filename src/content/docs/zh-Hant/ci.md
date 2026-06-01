---
summary: "CI 工作圖、範圍閘道、發行傘與本地指令對等項"
title: "CI 管道"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging a failing GitHub Actions check
  - You are coordinating a release validation run or rerun
  - You are changing ClawSweeper dispatch or GitHub activity forwarding
---

OpenClaw CI 在每次推送到 `main` 和每個 Pull Request 時都會執行。`preflight` 工作會對變更差異進行分類，並且當只有不相關區域變更時關閉耗時的通道。手動 `workflow_dispatch` 執行會刻意略過智慧範圍限定，並為發行候選版本和廣泛驗證展開完整圖譜。Android 通道透過 `include_android` 保持選用 (opt-in)。僅發行版本的 Plugin 涵蓋範圍位於獨立的 [`Plugin Prerelease`](#plugin-prerelease) 工作流程中，且僅從 [`Full Release Validation`](#full-release-validation) 或明確的手動觸發執行。

## 管道概覽

| 工作                               | 用途                                                                             | 執行時機                     |
| ---------------------------------- | -------------------------------------------------------------------------------- | ---------------------------- |
| `preflight`                        | 偵測僅文件變更、變更範圍、變更擴充功能，並建構 CI 清單                           | 總是在非草稿推送與 PR 上執行 |
| `security-fast`                    | 金鑰偵測、透過 `zizmor` 進行的工作流程審核，以及生產環境鎖定檔案審核             | 總是在非草稿推送與 PR 上執行 |
| `check-dependencies`               | Production Knip 僅依賴項目傳遞以及未使用檔案允許清單防護                         | Node 相關變更                |
| `build-artifacts`                  | 建置 `dist/`、Control UI、內建 CLI 燒錄測試、內建構件檢查以及可重複使用的構件    | Node 相關變更                |
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

1. `preflight` 決定哪些通道會存在。`docs-scope` 和 `changed-scope` 邏輯是這個工作中的步驟，而非獨立的工作。
2. `security-fast`、`check-*`、`check-additional-*`、`check-docs` 和 `skills-python` 會快速失敗，而不會等待較繁重的產物與平台矩陣工作。
3. `build-artifacts` 與快速 Linux 通道重疊，因此下游消費者可以在共用建置準備好後儘快開始。
4. 較繁重的平台與執行時通道隨後展開：`checks-fast-core`、`checks-fast-contracts-plugins-*`、`checks-fast-contracts-channels-*`、`checks-node-core-*`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

當有更新的推送送至同一個 PR 或 `main` 參考時，GitHub 可能會將被取代的工作標記為 `cancelled`。除非該參考的最新執行也失敗了，否則請將其視為 CI 雜訊。矩陣工作使用 `fail-fast: false`，而 `build-artifacts` 會直接報告內嵌通道、核心支援邊界 和 Gateway Watch 的失敗，而不是將微小的驗證工作排入佇列。自動 CI 並行索引鍵已版本化 (`CI-v7-*`)，因此 GitHub 端在舊佇列組中的殭屍程序不會無限期地封鎖較新的 main 執行。手動全套組執行使用 `CI-manual-v1-*` 並且不會取消正在進行的執行。

使用 `pnpm ci:timings`、`pnpm ci:timings:recent` 或 `node scripts/ci-run-timings.mjs <run-id>` 來彙總牆鐘時間、排隊時間、最慢的工作、失敗情況，以及來自 GitHub Actions 的 `pnpm-store-warmup` 展開屏障。CI 也會將相同的執行摘要上傳為 `ci-timings-summary` 構件。若要檢查建計時，請查看 `build-artifacts` 工作的 `Build dist` 步驟：`pnpm build:ci-artifacts` 會印出 `[build-all] phase timings:` 並包含 `ui:build`；該工作也會上傳 `startup-memory` 構件。

對於 Pull Request 執行，最終 timing-summary 工作會先從受信任的基礎版本執行輔助程式，然後再將 `GH_TOKEN` 傳遞給 `gh run view`。這能確保使用權杖的查詢不會出現在受分支控制的程式碼中，同時仍能彙總 Pull Request 的目前 CI 執行。

## 實際行為證明

外部貢獻者的 PR 會執行來自
`.github/workflows/real-behavior-proof.yml` 的 `Real behavior proof` 閘道。此工作流程會簽出受信任的
基礎提交並僅評估 PR 內文；它不會執行來自
貢獻者分支的程式碼。

此閘道適用於非儲存庫擁有者、成員、
協作者或 Bot 的 PR 作者。當 PR 內文包含
`Real behavior proof` 章節並填入下列值時即會通過：

- `Behavior or issue addressed`
- `Real environment tested`
- `Exact steps or command run after this patch`
- `Evidence after fix`
- `Observed result after fix`
- `What was not tested`

證據必須顯示修補程式在真實 OpenClaw 環境中套用後的行為變化。螢幕截圖、錄製畫面、終端機擷取、主控台輸出、複製的即時輸出、編輯過的執行時期日誌以及連結的成品皆算數。單元測試、模擬物件、快照、Lint、型別檢查和 CI 結果都是有用的輔助驗證，但它們本身並不足以滿足此閘門要求。

當檢查失敗時，請更新 PR 內文而非推送另一個程式碼提交。維護者僅在該 PR 不適用證明閘門時方可套用 `proof: override`。

## 範圍與路由

範圍邏輯位於 `scripts/ci-changed-scope.mjs` 並由 `src/scripts/ci-changed-scope.test.ts` 中的單元測試涵蓋。手動觸發會跳過變更範圍偵測，並使預檢清單表現得如同所有範圍區域皆已變更。

- **CI 工作流程編輯**會驗證 Node CI 圖形以及工作流程 Lint，但本身不會強制執行 Windows、Android 或 macOS 原生建置；這些平台路徑仍保持針對平台原始碼變更的範圍限定。
- **`main` 推送上的 Docs** 會由獨立的 `Docs` 工作流程檢查，並使用與 CI 相同的 ClawHub docs 鏡像，因此混合的程式碼與文件推送不會再次將 CI `check-docs` 分片排入佇列。當文件變更時，Pull Request 和手動 CI 仍會從 CI 執行 `check-docs`。
- **TUI PTY** 是專注於 TUI 變更的工作流程。它會在 Linux Node 24 上針對 `src/tui/**`、watch harness、package 腳本、鎖定檔和工作流程編輯執行 `node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts`。必備路徑使用確定性 `TuiBackend` 固定裝置；較慢的 `tui --local` 煙霧測試則透過 `OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1` 選擇加入，且僅模擬外部模型端點。
- **僅 CI 路由的編輯、選定的低成本核心測試固定裝置編輯，以及狹窄的外掛程式契約輔助/測試路由編輯**使用快速的僅 Node 清單路徑：`preflight`、安全性以及單一 `checks-fast-core` 任務。當變更僅限於快速任務直接練習的路由或輔助介面時，該路徑會跳過建置成品、Node 22 相容性、通道契約、完整核心分片、捆綁外掛程式分片以及額外的守護矩陣。
- **Windows Node 檢查** 的範圍僅限於 Windows 特定的處理程序/路徑包裝器、npm/pnpm/UI 執行器輔助工具、套件管理員設定，以及執行該路徑的 CI 工作流程表面；無關的原始碼、外掛、install-smoke 和僅測試變更仍留在 Linux Node 路徑上。

最慢的 Node 測試系列會被分割或平衡，以便每個工作保持小型而不會過度預留執行器：外掛合約和頻道合約各自作為兩個加權的 Blacksmith 支援分片運行，並具有標準 GitHub 執行器後備支援，核心單元 fast/support 路徑分開運行，核心執行時架構分割為 state、process/config、shared 和三個 cron 領域分片，auto-reply 作為平衡的工作者運行（回覆子樹分割為 agent-runner、dispatch 和 commands/state-routing 分片），以及 agentic gateway/server 設定分割到 chat/auth/model/http-plugin/runtime/startup 路徑，而不是等待建置的產出成果。廣泛的瀏覽器、QA、媒體和其他外掛測試使用其專用的 Vitest 設定，而不是共享的外攬全部設定。Include-pattern 分片使用 CI 分片名稱記錄計時條目，因此 `.artifacts/vitest-shard-timings.json` 可以區分完整設定和過濾後的分片。`check-additional-*` 將套件邊界 compile/canary 工作保持在一起，並將執行時拓撲架構與 gateway watch 覆蓋範圍分開；邊界守護清單被分條為一個 prompt-heavy 分片和一個剩餘 guard stripes 的組合分片，每個都同時運行選定的獨立守護並列印每個檢查的計時。昂貴的 Codex happy-path prompt snapshot drift 檢查僅針對手動 CI 和影響 prompt 的變更作為額外的工作運行，因此正常的無關 Node 變更不會等待冷啟 prompt snapshot 生成，且邊界分片保持平衡，同時 prompt drift 仍然固定在導致它的 PR 上；相同的旗標會跳過 built-artifact core support-boundary 分片內的 prompt snapshot Vitest 生成。Gateway watch、頻道測試和核心 support-boundary 分片在 `build-artifacts` 內同時運行，此時 `dist/` 和 `dist-runtime/` 已經建置完成。

Android CI 會同時執行 `testPlayDebugUnitTest` 和 `testThirdPartyDebugUnitTest`，然後建構 Play debug APK。第三方版本沒有獨立的來源集或清單；其單元測試通道仍然會使用 SMS/通話紀錄 BuildConfig 標誌來編譯該版本，同時避免在每次與 Android 相關的推送上重複執行 debug APK 打包工作。

`check-dependencies` 分片會執行 `pnpm deadcode:dependencies`（這是指定為最新 Knip 版本的生產環境 Knip 僅依賴傳遞，並針對 `dlx` 安裝停用了 pnpm 的最短發行年限）和 `pnpm deadcode:unused-files`，後者會將 Knip 的生產環境未使用檔案發現結果與 `scripts/deadcode-unused-files.allowlist.mjs` 進行比對。當 PR 新增未經審查的未使用檔案或留下過期的允許清單項目時，未使用檔案防護機制會失敗，同時保留 Knip 無法靜態解析的刻意動態外掛、生成、建置、即時測試和套件橋接介面。

## ClawSweeper 活動轉發

`.github/workflows/clawsweeper-dispatch.yml` 是從 OpenClaw 存儲庫活動到 ClawSweeeper 的目標端橋接器。它不會簽出或執行不受信任的 PR 代碼。該工作流程從 `CLAWSWEEPER_APP_PRIVATE_KEY` 創建 GitHub App 權杖，然後將緊湊的 `repository_dispatch` 負載分發至 `openclaw/clawsweeper`。

該工作流程有四個通道：

- `clawsweeper_item` 用於精確的 issue 和 pull request 審查請求；
- `clawsweeper_comment` 用於 issue 評論中明確的 ClawSweeper 指令；
- `clawsweeper_commit_review` 用於 `main` 推送上的提交層級審查請求；
- `github_activity` 用於 ClawSweeper 代理可能檢查的一般 GitHub 活動。

`github_activity` 通道僅轉發正規化的元數據：事件類型、動作、行為者、存儲庫、項目編號、URL、標題、狀態，以及評論或審查（如果存在）的簡短摘錄。它刻意避免轉發完整的 webhook 正文。`openclaw/clawsweeper` 中的接收工作流程是 `.github/workflows/github-activity.yml`，它會將正規化的事件發佈到 ClawSweeper 代理的 OpenClaw Gateway hook。

一般活動屬於觀察性質，而非預設進行傳遞。ClawSweeper agent 在其提示中接收 Discord 目標，並且應僅在事件令人驚訝、可採取行動、具有風險或具有運營價值時才發佈到 `#clawsweeper`。常規的開啟、編輯、bot 翻轉、重複 webhook 噪音和正常的審查流量應導致 `NO_REPLY`。

在整個過程中，應將 GitHub 標題、評論、內容、審查文字、分支名稱和提交訊息視為不受信任的資料。它們是摘要和分診的輸入，而非工作流程或 agent 執行時的指令。

## 手動派發

手動 CI 派發執行與正常 CI 相同的作業圖，但會強制開啟每個非 Android 範圍的通道：Linux Node 分片、bundled-plugin 分片、plugin 和 channel contract 分片、Node 22 相容性、`check-*`、`check-additional-*`、建置成品煙霧測試、docs 檢查、Python 技能、Windows、macOS 和 Control UI i18n。獨立的手動 CI 派發僅使用 `include_android=true` 執行 Android；完整的 release umbrella 通過傳遞 `include_android=true` 來啟用 Android。Plugin prerelease 靜態檢查、僅限 release 的 `agentic-plugins` 分片、完整擴充批次掃描以及 plugin prerelease Docker 通道從 CI 中排除。Docker prerelease 套件僅當 `Full Release Validation` 使用啟用的 release-validation 閘道派發單獨的 `Plugin Prerelease` 工作流程時才執行。

手動執行使用唯一的並行群組，以免 release-candidate 完整套件被同一 ref 上的另一個推送或 PR 執行取消。可選的 `target_ref` 輸入允許受信任的呼叫者在從選定的派發 ref 使用工作流程檔案的同時，針對分支、標籤或完整 commit SHA 執行該圖。

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## 執行器

| 執行器                           | 作業                                                                                                                                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | 手動 CI 派發和非正式儲存庫備援、workflow-sanity、labeler、auto-response、CI 外的 docs 工作流程，以及 install-smoke 飛前檢查，以便 Blacksmith 矩陣可以更早排隊                                              |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`, `preflight`, `security-fast`, 權重較低的延伸分片, `checks-fast-core`, 外掛/通道合約分片, `checks-node-compat-node22`, `check-guards`, `check-prod-types`, 和 `check-test-types` |
| `blacksmith-8vcpu-ubuntu-2404`   | Linux Node 測試分片, 捆綁外掛測試分片, `check-additional-*` 分片, `check-dependencies`, 和 `android`                                                                                                       |
| `blacksmith-16vcpu-ubuntu-2404`  | `build-artifacts`, `check-lint` (對 CPU 敏感到 8 個 vCPU 的成本超過了它們所節省的); install-smoke Docker 建置 (32-vCPU 排隊時間成本超過了它所節省的)                                                       |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                           |
| `blacksmith-6vcpu-macos-15`      | `macos-node` 在 `openclaw/openclaw` 上; 分支 則回退到 `macos-15`                                                                                                                                           |
| `blacksmith-12vcpu-macos-26`     | `macos-swift` 在 `openclaw/openclaw` 上; 分支 則回退到 `macos-26`                                                                                                                                          |

Canonical-repo CI 對於一般的推送和拉取請求執行, 將 Blacksmith 保留為預設的執行器路徑。`workflow_dispatch` 和非 canonical 儲存庫的執行使用 GitHub 託管的執行器, 但一般的 canonical 執行目前不會偵測 Blacksmith 佇列的健康狀況, 或在 Blacksmith 不可用時自動回退到 GitHub 託管的標籤。

## 本地等效項

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

`OpenClaw Performance` 是產品/執行時效能工作流程。它每天在 `main` 上執行, 也可以手動分派:

```bash
gh workflow run openclaw-performance.yml --ref main -f profile=diagnostic -f repeat=3
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_openai_candidate=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

手動分派通常會對工作流程 ref 進行基準測試。設定 `target_ref` 以對發布標籤或使用當前工作流程實作的另一個分支進行基準測試。發布的報表路徑和最新指標是以測試的 ref 為鍵, 並且每個 `index.md` 都會記錄測試的 ref/SHA、工作流程 ref/SHA、Kova ref、設定檔、lane 驗證模式、模型、重複次數和情境篩選器。

工作流程會從固定的發行版本安裝 OCM，並從 `openclaw/Kova` 在固定的 `kova_ref` 輸入安裝 Kova，然後執行三個通道：

- `mock-provider`：針對具有確定性假 OpenAI 相容驗證的本地建構執行階段，執行 Kova 診斷情境。
- `mock-deep-profile`：針對啟動、閘道和代理回合熱點進行 CPU/堆疊/追蹤效能分析。
- `live-openai-candidate`：一個真實的 OpenAI `openai/gpt-5.5` 代理回合，當 `OPENAI_API_KEY` 不可用時會跳過。

Mock-provider 通道也會在 Kova 通過後執行 OpenClaw 原生源頭探測：針對預設、hook 和 50 個外掛程式啟動情況的閘道啟動時間與記憶體；打包外掛程式匯入 RSS、重複的 mock-OpenAI `channel-chat-baseline` hello 迴圈，以及對已啟動閘道的 CLI 啟動指令。當先前的已發布 mock-provider 源頭報告可提供給受測 ref 時，源頭摘要會將目前的 RSS 和堆疊值與該基準進行比較，並將大幅增加的 RSS 標記為 `watch`。源頭探測 Markdown 摘要位於報告套件中的 `source/index.md`，旁邊附帶原始 JSON。

每個通道都會上傳 GitHub 成品。當設定 `CLAWGRIT_REPORTS_TOKEN` 時，工作流程也會將 `report.json`、`report.md`、套件、`index.md` 和源頭探測成品提交到 `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/` 下的 `openclaw/clawgrit-reports`。目前的受測 ref 指標會寫入為 `openclaw-performance/<tested-ref>/latest-<lane>.json`。

## 完整發行版本驗證

`Full Release Validation` 是「發布前執行所有項目」的手動總管工作流程。它接受分支、標籤或完整的提交 SHA，以該目標觸發手動的 `CI` 工作流程，為僅限發布的外掛/套件/靜態/Docker 驗證觸發 `Plugin Prerelease`，並為安裝冒煙測試、套件驗收、跨 OS 套件檢查、QA Lab 一致性、Matrix 和 Telegram 軌道觸發 `OpenClaw Release Checks`。穩定/預設執行會將詳盡的即時/E2E 和 Docker 發布路徑覆蓋範圍保留在 `run_release_soak=true` 之後；`release_profile=full` 會強制啟用該浸入式覆蓋範圍，以便廣泛的諮詢驗證保持廣泛。透過 `rerun_group=all` 和 `release_profile=full`，它也會針對來自發布檢查的 `release-package-under-test` 成品執行 `NPM Telegram Beta E2E`。發布後，傳遞 `release_package_spec` 以在發布檢查、套件驗收、Docker、跨 OS 和 Telegram 之間重複使用已發布的 npm 套件，無需重新建置。僅當 Telegram 必須驗證不同的套件時，才使用 `npm_telegram_package_spec`。Codex 外掛即時套件軌道預設使用相同的選取狀態：已發布的 `release_package_spec=openclaw@<tag>` 推導 `codex_plugin_spec=npm:@openclaw/codex@<tag>`，而 SHA/成品執行則從選取的 ref 打包 `extensions/codex`。對於自訂外掛來源（例如 `npm:`、`npm-pack:` 或 `git:` specs），請明確設定 `codex_plugin_spec`。

請參閱 [完整發布驗證](/zh-Hant/reference/full-release-validation) 以瞭解階段矩陣、確切的工作流程作業名稱、設定檔差異、成品和專注的重新執行控制代碼。

`OpenClaw Release Publish` 是手動變更發布工作流程。在發布標籤存在且 OpenClaw npm 預檢成功後，從 `release/YYYY.M.D` 或 `main` 分派它。它會驗證 `pnpm plugins:sync:check`，為所有可發布的插件套件分派 `Plugin NPM Release`，為相同的發布 SHA 分派 `Plugin ClawHub Release`，然後才會使用儲存的 `preflight_run_id` 分派 `OpenClaw NPM Release`。

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

若要在快速變動的分支上取得釘選提交的證明，請使用輔助工具而非 `gh workflow run ... --ref main -f ref=<sha>`：

```bash
pnpm ci:full-release --sha <full-sha>
```

GitHub 工作流程分派參照必須是分支或標籤，不能是原始的提交 SHA。輔助工具會在目標 SHA 推送一個暫時的 `release-ci/<sha>-...` 分支，從該釘選的參照分派 `Full Release Validation`，驗證每個子工作流程 `headSha` 都符合目標，並在執行完成後刪除該暫時分支。如果任何子工作流程是在不同的 SHA 下執行，總管驗證程式也會失敗。

`release_profile` 控制傳入發布檢查的即時/提供者廣度。手動發布工作流程預設為 `stable`；僅當您刻意需要廣泛的顧問提供者/媒體矩陣時才使用 `full`。`run_release_soak` 控制穩定/預設發布檢查是否執行完整的即時/E2E 和 Docker 發布路徑浸潤測試；`full` 會強制進行浸潤測試。

- `minimum` 保留最快的 OpenAI/核心發布關鍵通道。
- `stable` 新增穩定的提供者/後端集合。
- `full` 執行廣泛的顧問提供者/媒體矩陣。

總管會記錄已分派的子執行 ID，最終的 `Verify full validation` 作業會重新檢查目前的子執行結論，並為每個子執行附加最慢作業表格。如果子工作流程被重新執行並變為綠色，僅需重新執行父級驗證程式作業，以重新整理總管結果和計時摘要。

為了進行修復，`Full Release Validation` 和 `OpenClaw Release Checks` 都接受 `rerun_group`。對於發布候選版本，請使用 `all`；對於僅限常規完整 CI 子任務，請使用 `ci`；對於僅限外掛程式預發布子任務，請使用 `plugin-prerelease`；對於每個發布子任務，請使用 `release-checks`；或者對於總括範圍，請使用較小的群組：`install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 或 `npm-telegram`。這確保在針對性修復後，失敗的發布盒重新執行範圍受限。對於一個失敗的跨 OS 管道，請將 `rerun_group=cross-os` 與 `cross_os_suite_filter` 結合使用，例如 `windows/packaged-upgrade`；長時間的跨 OS 命令會輸出心跳行，且套件升級摘要包含各階段的計時。QA 發布檢查管道僅供參考，但標準執行階段工具覆蓋率閘門除外，當所需的 OpenClaw 動態工具在標準層級摘要中偏移或消失時，該閘門會進行阻擋。

`OpenClaw Release Checks` 使用受信任的工作流程 ref 將選定的 ref 解析一次為 `release-package-under-test` tarball，然後將該構件傳遞給跨 OS 檢查和套件驗收，以及在執行浸測覆蓋率時傳遞給即時/E2E 發布路徑 Docker 工作流程。這可確保套件位元組在發布盒之間保持一致，並避免在多個子任務中重新打包相同的候選版本。對於 Codex npm-plugin 即時管道，發布檢查會傳遞從 `release_package_spec` 衍生的相符已發布外掛程式規格，或傳遞操作員提供的 `codex_plugin_spec`，或者將輸入留空，以便 Docker 腳本打包所選取出碼的 Codex 外掛程式。

針對 `ref=main` 和 `rerun_group=all` 的重複 `Full Release Validation` 執行會取代較舊的整體執行。當父項被取消時，父項監視器會取消它已分派的所有子工作流程，因此較新的 main 驗證不會滯留在陳舊的兩小時 release-check 執行之後。Release branch/tag 驗證和專注的重新執行群組會保留 `cancel-in-progress: false`。

## Live 和 E2E 分片

Release live/E2E 子項保留了廣泛的原生 `pnpm test:live` 覆蓋率，但它是透過 `scripts/test-live-shard.mjs` 以命名分片的形式執行，而不是單一序列工作：

- `native-live-src-agents`
- `native-live-src-gateway-core`
- provider-filtered `native-live-src-gateway-profiles` 工作
- `native-live-src-gateway-backends`
- `native-live-test`
- `native-live-extensions-a-k`
- `native-live-extensions-l-n`
- `native-live-extensions-openai`
- `native-live-extensions-o-z-other`
- `native-live-extensions-xai`
- 分割媒體音訊/視訊分片以及 provider-filtered 音樂分片

這樣在保持相同檔案覆蓋率的同時，能更輕鬆地重新執行和診斷緩慢的 live provider 失敗。彙總的 `native-live-extensions-o-z`、`native-live-extensions-media` 和 `native-live-extensions-media-music` 分片名稱仍然適用於手動一次性重新執行。

原生 live 媒體分片在 `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04` 中執行，該映像檔由 `Live Media Runner Image` 工作流程建構。該映像檔預先安裝了 `ffmpeg` 和 `ffprobe`；媒體工作僅在設定前驗證二進位檔。請將 Docker 支援的 live suite 保留在一般的 Blacksmith runner 上 — 容器工作不是啟動巢狀 Docker 測試的正確位置。

支援 Docker 的即時模型/後端分片針對每個選定的提交使用獨立的共享 `ghcr.io/openclaw/openclaw-live-test:<sha>` 映像檔。即時發行工作流程會建構並推送該映像檔一次，然後 Docker 即時模型、提供者分片的閘道、CLI 後端、ACP 繫結和 Codess harness 分片會使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行。閘道 Docker 分片攜帶明確的腳本層級 `timeout` 上限，低於工作流程工作的逾時時間，以便卡住的容器或清理路徑能快速失敗，而不是消耗整個發行檢查預算。如果這些分片獨立地重建完整的來源 Docker 目標，則表示發行執行設定錯誤，並會在重複的映像檔建構上浪費實際時間。

## 套件驗收

當問題是「這個可安裝的 OpenClaw 套件是否能作為產品運作？」時，請使用 `Package Acceptance`。這與正常的 CI 不同：正常的 CI 驗證來源樹，而套件驗收則透過使用者安裝或更新後使用的相同 Docker E2E harness 來驗證單一 tarball。

### 工作

1. `resolve_package` 會檢出 `workflow_ref`、解析一個套件候選項、寫入 `.artifacts/docker-e2e-package/openclaw-current.tgz`、寫入 `.artifacts/docker-e2e-package/package-candidate.json`、將兩者作為 `package-under-test` 成品上傳，並在 GitHub 步驟摘要中列印來源、工作流程參照、套件參照、版本、SHA-256 和設定檔。
2. `docker_acceptance` 會使用 `ref=workflow_ref` 和 `package_artifact_name=package-under-test` 呼叫 `openclaw-live-and-e2e-checks-reusable.yml`。可重複使用的工作流程會下載該成品、驗證 tarball 清單、在需要時準備套件摘要 Docker 映像檔，並對該套件執行選定的 Docker 通道，而不是打包工作流程检出。當設定檔選取多個目標 `docker_lanes` 時，可重複使用的工作流程會準備一次套件和共享映像檔，然後將這些通道作為具有唯一成品的平行目標 Docker 工作分散出去。
3. `package_telegram` 選擇性呼叫 `NPM Telegram Beta E2E`。當 `telegram_mode` 不為 `none` 時執行，並在 Package Acceptance 解析到時安裝相同的 `package-under-test` 構件；獨立的 Telegram 分派仍可安裝已發布的 npm 規格。
4. 如果套件解析、Docker 驗收或選用的 Telegram 通道失敗，`summary` 會使工作流程失敗。

### 候選來源

- `source=npm` 僅接受 `openclaw@beta`、`openclaw@latest`，或精確的 OpenClaw 發布版本（例如 `openclaw@2026.4.27-beta.2`）。將此用於已發布的 prelease/stable 驗收。
- `source=ref` 打包受信任的 `package_ref` 分支、標籤或完整提交 SHA。解析器會擷取 OpenClaw 分支/標籤，驗證選取的提交可從儲存庫分支歷史或發布標籤抵達，在分離的工作樹中安裝 deps，並使用 `scripts/package-openclaw-for-docker.mjs` 進行打包。
- `source=url` 下載公開的 HTTPS `.tgz`；需要 `package_sha256`。此路徑會拒絕 URL 憑證、非預設 HTTPS 埠、私人/內部/特殊用途的主機名稱或解析 IP，以及相同公開安全性原則之外的重導向。
- `source=trusted-url` 從 `.github/package-trusted-sources.json` 中指定的受信任來源原則下載 HTTPS `.tgz`；需要 `package_sha256` 和 `trusted_source_id`。僅將此用於維護者擁有的企業鏡像或需要設定主機、埠、路徑前綴、重導向主機或私人網路解析的私人套件儲存庫。如果原則宣告 bearer auth，工作流程會使用固定的 `OPENCLAW_TRUSTED_PACKAGE_TOKEN` 密鑰；內嵌於 URL 的憑證仍會被拒絕。
- `source=artifact` 從 `artifact_run_id` 和 `artifact_name` 下載一個 `.tgz`；`package_sha256` 是選用的，但對於外部共用的構件應提供。

請將 `workflow_ref` 和 `package_ref` 分開。`workflow_ref` 是執行測試的受信工作流程/程式碼。`package_ref` 是在 `source=ref` 時被打包的來源提交。這讓目前的測試程式能驗證較舊的受信來源提交，而無需執行舊的工作流程邏輯。

### 套件組合設定檔

- `smoke` — `npm-onboard-channel-agent`、`gateway-network`、`config-reload`
- `package` — `npm-onboard-channel-agent`、`doctor-switch`、`update-channel-switch`、`skill-install`、`update-corrupt-plugin`、`upgrade-survivor`、`published-upgrade-survivor`、`update-restart-auth`、`plugins-offline`、`plugin-update`
- `product` — `package` 加上 `mcp-channels`、`cron-mcp-cleanup`、`openai-web-search-minimal`、`openwebui`
- `full` — 包含 OpenWebUI 的完整 Docker 發布路徑區塊
- `custom` — 精確的 `docker_lanes`；在 `suite_profile=custom` 時為必需

`package` 設定檔使用離線外掛程式涵蓋範圍，因此已發布套件的驗證不取決於 ClawHub 的即時可用性。選用的 Telegram 頻道會重複使用 `NPM Telegram Beta E2E` 中的 `package-under-test` 構件，並保留已發布的 npm spec 路徑以用於獨立調度。

關於專用的更新與外掛程式測試原則，包括本機指令、Docker 頻道、套件驗收輸入、發布預設值和故障分級，請參閱 [Testing updates and plugins](/zh-Hant/help/testing-updates-plugins)。

Release checks 會使用 `source=artifact`、準備好的發布套件成品 `suite_profile=custom`、`docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'` 和 `telegram_mode=mock-openai` 呼叫 Package Acceptance。這能將套件遷移、更新、即時 ClawHub 技能安裝、過時外掛相依性清理、已配置外掛安裝修復、離線外掛、外掛更新以及 Telegram 驗證保持在同一個已解析的套件 tarball 上。在發布 beta 版後，在 Full Release Validation 或 OpenClaw Release Checks 上設定 `release_package_spec`，即可對已發布的 npm 套件執行相同的矩陣而無需重建；僅當 Package Acceptance 需要與發布驗證其餘部分不同的套件時，才設定 `package_acceptance_package_spec`。跨作業系統發布檢查仍涵蓋特定作業系統的上手、安裝程式和平台行為；套件/更新產品驗證應從 Package Acceptance 開始。`published-upgrade-survivor` Docker lane 會在阻塞性發布路徑中每次執行驗證一個已發布的套件基線。在 Package Acceptance 中，已解析的 `package-under-test` tarball 始終是候選版本，而 `published_upgrade_survivor_baseline` 選擇後備的已發布基線，預設為 `openclaw@latest`；失敗 lane 的重新執行指令會保留該基線。具有 `run_release_soak=true` 或 `release_profile=full` 的 Full Release Validation 會設定 `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` 和 `published_upgrade_survivor_scenarios=reported-issues`，以擴展至四個最新的穩定 npm 發布版本，加上釘選的外掛相容性邊界發布版本以及針對 Feishu 配置、保留的 bootstrap/persona 檔案、已配置的 OpenClaw 外掛安裝、波浪號日誌路徑和過時的舊版外掛相依性根目錄的問題形狀夾具。多基線已發布升級的存活者選取會依基線分片到個別的目標 Docker runner 工作。當問題是徹底的已發布更新清理，而非一般的 Full Release CI 廣度時，獨立的 `Update Migration` 工作流程會使用 `update-migration` Docker lane 以及 `all-since-2026.4.23` 和 `plugin-deps-cleanup`。本機彙總執行可以使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 傳遞確切的套件規格，使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 保持單一 lane（例如 `openclaw@2026.4.15`），或為場景矩陣設定 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS`。已發布的 lane 會使用內建的 `openclaw config set` 指令配方設定基線，在 `summary.json` 中記錄配方步驟，並在 Gateway 啟動後探測 `/healthz`、`/readyz` 以及 RPC 狀態。Windows 打包和安裝程式全新 lane 也會驗證已安裝的套件是否能從原始的絕對 Windows 路徑匯入瀏覽器控制覆寫。當已設定時，OpenAI 跨作業系統 agent-turn 煙霧測試預設為 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否則為 `openai/gpt-5.5`，因此安裝和 gateway 驗證會保持在 GPT-5 測試模型上，同時避免 GPT-4.x 預設值。

### 舊版相容性視窗

針對已發布的套件，Package Acceptance 具有有限的舊版相容性視窗。直到 `2026.4.25` 為止的套件（包含 `2026.4.25-beta.*`）可以使用相容性路徑：

- `dist/postinstall-inventory.json` 中已知的私有 QA 項目可能指向 tarball 中省略的檔案；
- 當套件未公開該旗標時，`doctor-switch` 可能會跳過 `gateway install --wrapper` 持久化子案例；
- `update-channel-switch` 可能會從 tarball 衍生的假 git 測試夾具中修剪遺失的 pnpm `patchedDependencies`，並記錄遺失的持久化 `update.channel`；
- plugin smokes 可能會讀取舊版安裝記錄位置，或接受遺失的 marketplace 安裝記錄持久化；
- `plugin-update` 可能會允許設定元資料遷移，同時仍要求安裝記錄和不重新安裝行為保持不變。

已發布的 `2026.4.26` 套件也可能對已發布的本機建置元資料戳記檔案發出警告。後續套件必須符合現代合約；相同條件將會失敗，而非警告或跳過。

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

當調試失敗的套件驗收執行時，請從 `resolve_package` 摘要開始，以確認套件來源、版本和 SHA-256。然後檢查 `docker_acceptance` 子執行及其 Docker 構件：`.artifacts/docker-tests/**/summary.json`、`failures.json`、lane 日誌、階段計時和重新執行指令。建議優先重新執行失敗的套件設定檔或特定的 Docker lane，而不是重新執行完整的發布驗證。

## 安裝冒煙測試

獨立的 `Install Smoke` 工作流程透過其自身的 `preflight` 工作重用相同的範圍腳本。它將冒煙測試覆蓋範圍分為 `run_fast_install_smoke` 和 `run_full_install_smoke`。

- **快速路徑** 適用於涉及 Docker/套件表面、配套的外掛程式套件/資訊清單變更，或 Docker 測試工作所執行的核心外掛程式/通道/閘道/外掛程式 SDK 表面的提取請求。僅包含原始碼變更的配套外掛程式變更、僅限測試的編輯以及僅限文件的編輯不會佔用 Docker 執行器。快速路徑會建構一次根 Dockerfile 映像檔、檢查 CLI、執行刪除共享工作區 CLI 測試的代理程式、執行容器 gateway-network e2e、驗證配套擴充功能的建構參數，並在 240 秒的彙總指令逾時下執行有界的配套外掛程式 Docker 設定檔（每個場景的 Docker 執行時間分別設有上限）。
- **完整路徑** 會保留夜間排程執行、手動分派、工作流程呼叫發行版本檢查，以及真正涉及安裝程式/套件/Docker 表面的提取請求的 QR 套件安裝和安裝程式 Docker/更新涵蓋範圍。在完整模式下，install-smoke 會準備或重複使用一個目標 SHA GHCR 根 Dockerfile 測試映像檔，然後將 QR 套件安裝、根 Dockerfile/閘道測試、安裝程式/更新測試以及快速配套外掛程式 Docker E2E 作為獨立工作執行，因此安裝程式工作不必等待根映像測試完成。

`main` 推送（包括合併提交）不會強制執行完整路徑；當變更範圍邏輯會在推送時請求完整涵蓋範圍時，工作流程會保留快速 Docker 測試，並將完整安裝測試留給夜間或發行版本驗證。

緩慢的 Bun 全域安裝映像提供者測試由 `run_bun_global_install_smoke` 單獨控制。它會在夜間排程和發行版本檢查工作流程中執行，而手動 `Install Smoke` 分派可以選擇加入，但提取請求和 `main` 推送則不會。一般的 PR CI 仍會針對 Node 相關變更執行快速 Bun 啟動器迴歸測試通道。QR 和安裝程式 Docker 測試會保留自己專注於安裝的 Dockerfiles。

## 本機 Docker E2E

`pnpm test:docker:all` 預先建構一個共用的即時測試映像檔，將 OpenClaw 打包一次為 npm tarball，並建構兩個共用的 `scripts/e2e/Dockerfile` 映像檔：

- 一個用於安裝程式/更新/外掛程式相依性通道的裸機 Node/Git 執行器；
- 一個功能映像檔，將相同的 tarball 安裝到 `/app` 中，用於正常功能通道。

Docker 通道定義位於 `scripts/lib/docker-e2e-scenarios.mjs`，規劃器邏輯位於 `scripts/lib/docker-e2e-plan.mjs`，而執行器僅執行選定的計畫。排程器使用 `OPENCLAW_DOCKER_E2E_BARE_IMAGE` 和 `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE` 為每個通道選取映像檔，然後使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行通道。

### 可調整參數

| 變數                                   | 預設值  | 用途                                                                            |
| -------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10      | 正常通道的主池時段數。                                                          |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10      | 供應商敏感的尾部池時段數。                                                      |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9       | 並行即時通道上限，以避免供應商進行限速。                                        |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10      | 並行 npm 安裝通道上限。                                                         |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7       | 並行多服務通道上限。                                                            |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000    | 通道啟動之間的交錯延遲，以避免 Docker 守護程式的建立風暴；設定 `0` 可停用交錯。 |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000 | 每個通道的後備逾時（120 分鐘）；選定的即時/尾部通道使用更嚴格的上限。           |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | 未設定  | `1` 會列印排程器計畫而不執行通道。                                              |
| `OPENCLAW_DOCKER_ALL_LANES`            | 未設定  | 以逗號分隔的精確通道清單；跳過清理測試，以便代理程式可以重現單一失敗的通道。    |

若通道的權重超過其有效上限，仍可從空池啟動，然後單獨執行直到釋放容量。本機聚合會預檢 Docker、移除過時的 OpenClaw E2E 容器、發出即時通道狀態、保存通道計時以進行「最長優先」排序，並且預設在首次失敗後停止排程新的池化通道。

### 可重複使用的即時/E2E 工作流程

可重用的即時/E2E 工作流程會詢問 `scripts/test-docker-all.mjs --plan-json` 需要哪些套件、映像檔類型、即時映像檔、通道以及憑證覆蓋範圍。`scripts/docker-e2e.mjs` 接著將該計劃轉換為 GitHub 輸出和摘要。它會透過 `scripts/package-openclaw-for-docker.mjs` 打包 OpenClaw，下載當前執行的套件構件，或從 `package_artifact_run_id` 下載套件構件；驗證 tarball 清單；當計劃需要已安裝套件的通道時，透過 Blacksmith 的 Docker 層快取建置並推送帶有套件摘要標籤的 bare/functional GHCR Docker E2E 映像檔；並重複使用提供的 `docker_e2e_bare_image`/`docker_e2e_functional_image` 輸入或現有的套件摘要映像檔，而不重新建置。Docker 映像檔提取作業會重試，每次嘗試有 180 秒的逾時上限，因此卡住的註冊表/快取串流會快速重試，而不會消耗大部分 CI 關鍵路徑的時間。

### 發布路徑區塊

發布 Docker 覆蓋範圍會使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行較小的區塊化工作，因此每個區塊僅提取其所需的映像檔類型，並透過同一個加權排程器執行多個通道：

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

目前的發布 Docker 區塊包括 `core`、`package-update-openai`、`package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、`plugins-runtime-services` 以及 `plugins-runtime-install-a`，一直到 `plugins-runtime-install-h`。`package-update-openai` 包含即時 Codex 外掛套件通道，該通道會安裝候選 OpenClaw 套件，從 `codex_plugin_spec` 或經過明確 Codex CLI 安裝批准的相同參照 tarball 安裝 Codex 外掛，執行 Codex CLI 飛行前檢查，然後針對 OpenAI 執行多個相同階段的 OpenClaw agent 動作。`plugins-runtime-core`、`plugins-runtime` 和 `plugins-integrations` 保持為聚合外掛/執行階段別名。`install-e2e` 通道別名仍然是這兩個提供者安裝程式通道的聚合手動重新執行別名。

當完整的發行路徑覆蓋範圍要求時，OpenWebUI 會合併到 `plugins-runtime-services` 中，並僅針對 OpenWebUI 專屬的調度保留獨立的 `openwebui` 區塊。捆綁通道更新管道會針對暫時性的 npm 網路失敗重試一次。

每個區塊會上傳包含管道日誌、計時、`summary.json`、`failures.json`、階段計時、排程器計畫 JSON、慢速管道表格以及各管道重新執行指令的 `.artifacts/docker-tests/`。工作流程 `docker_lanes` 輸入會針對準備好的映像檔（而非區塊工作）執行選定的管道，這能將失敗管道的偵錯範圍限制在一個指定的 Docker 工作內，並為該次執行準備、下載或重複使用套件構件；如果選定的管道是即時 Docker 管道，該指定工作會針對該次重新執行在本地建置即時測試映像檔。產生的各管道 GitHub 重新執行指令包含 `package_artifact_run_id`、`package_artifact_name`，以及在這些值存在時包含準備好的映像檔輸入，以便失敗的管道能重複使用失敗執行中的確切套件和映像檔。

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

排程的即時/E2E 工作流程會每日執行完整的發行路徑 Docker 套件。

## 外掛程式預先發行

`Plugin Prerelease` 是成本較高的產品/套件覆蓋範圍，因此它是由 `Full Release Validation` 或明確的操作員調度的獨立工作流程。一般的 Pull Request、`main` 推送和獨立的手動 CI 調度都會將該套件關閉。它會在八個擴充工作程式之間平衡捆綁的外掛程式測試；這些擴充分片工作一次最多執行兩個外掛程式設定組，每個組使用一個 Vitest 工作程式，並使用較大的 Node 堆積，以便匯入負荷重的外掛程式批次不會產生額外的 CI 工作。僅限發行的 Docker 預先發行路徑會將目標 Docker 管道分成小批次，以避免為一到三分鐘的工作保留數十個執行器。該工作流程也會從 `@openclaw/plugin-inspector` 上傳資訊性的 `plugin-inspector-advisory` 構件；檢查器的發現是用於分類的輸入，並不會改變封鎖性的外掛程式預先發行閘門。

## QA 實驗室

QA Lab 在主要智慧範圍工作流程之外擁有專用的 CI 通道。Agentic parity 巢套於廣泛的 QA 和 release harnesses 之下，而非獨立的 PR 工作流程。當 parity 應隨廣泛驗證執行一起進行時，請搭配 `rerun_group=qa-parity` 使用 `Full Release Validation`。

- `QA-Lab - All Lanes` 工作流程每夜在 `main` 上及手動觸發時執行；它會將 mock parity 通道、live Matrix 通道以及 live Telegram 和 Discord 通道展開為並行作業。Live 作業使用 `qa-live-shared` 環境，而 Telegram/Discord 則使用 Convex leases。

Release 檢查會使用確定性 mock 提供者和 mock-qualified 模型 (`mock-openai/gpt-5.5` 和 `mock-openai/gpt-5.5-alt`) 執行 Matrix 和 Telegram live 傳輸通道，以便將通道合約與 live model 延遲及正常的 provider-plugin 啟動隔離開來。Live 傳輸閘道會停用記憶體搜尋，因為 QA parity 單獨涵蓋記憶體行為；provider 連線性則由獨立的 live model、native provider 和 Docker provider 測試套件涵蓋。

Matrix 針對排程和 release gate 使用 `--profile fast`，並且僅在籤出的 CLI 支援時才加入 `--fail-fast`。CLI 預設值和手動工作流程輸入保持為 `all`；手動 `matrix_profile=all` 觸發作業總是將完整的 Matrix 涵蓋範圍分片為 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 作業。

`OpenClaw Release Checks` 亦會在 release 核准前執行 release 關鍵的 QA Lab 通道；其 QA parity gate 會將候選和 baseline 套件作為並行通道作業執行，然後將兩個構件下載至一個小型報告作業中以進行最終 parity 比較。

對於一般的 PR，請遵循範圍化的 CI/check 證據，不要將 parity 視為必要狀態。

## CodeQL

`CodeQL` 工作流程特意設計為窄範圍的首輪安全掃描器，而非完整的程式庫掃描。每日、手動和非草稿的 PR guard 執行會掃描 Actions 工作流程程式碼以及最高風險的 JavaScript/TypeScript 表面，並使用篩選至高/嚴重 `security-severity` 的高信心安全查詢。

Pull request guard 保持輕量：它僅針對 `.github/actions`、`.github/codeql`、`.github/workflows`、`packages` 或 `src` 下的變更啟動，並且執行與排程工作流程相同的高信心安全矩陣。Android 和 macOS CodeQL 不包含在 PR 預設值中。

### 安全類別

| 類別                                              | 表面                                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | Auth、secrets、sandbox、cron 和 gateway 基準                                                |
| `/codeql-security-high/channel-runtime-boundary`  | 核心頻道實作合約加上頻道插件執行時、gateway、Plugin SDK、secrets、審計接觸點                |
| `/codeql-security-high/network-ssrf-boundary`     | 核心 SSRF、IP 解析、network guard、web-fetch 和 Plugin SDK SSRF 政策表面                    |
| `/codeql-security-high/mcp-process-tool-boundary` | MCP 伺服器、程序執行輔助程式、輸出傳遞和代理工具執行閘道                                    |
| `/codeql-security-high/plugin-trust-boundary`     | Plugin 安裝、載入器、清單、registry、套件管理器安裝、來源載入和 Plugin SDK 套件合約信任表面 |

### 平台特定的安全分片

- `CodeQL Android Critical Security` — 排程的 Android 安全分片。在 Blacksmith Linux 接受的最小型執行器上為 CodeQL 手動建置 Android 應用程式，並在工作流程健全性檢查允許的情況下上傳至 `/codeql-critical-security/android`。
- `CodeQL macOS Critical Security` — 每週/手動 macOS 安全分片。在 Blacksmith macOS 上為 CodeQL 手動建置 macOS 應用程式，從上傳的 SARIF 中篩選出相依性建置結果，並上傳至 `/codeql-critical-security/macos`。由於 macOS 建置即使乾淨也佔據大部分執行時間，因此不包含在每日預設值中。

### 關鍵品質類別

`CodeQL Critical Quality` 是對應的非安全性分片。它在較小的 Blacksmith Linux 執行器上，針對狹窄的高價值表面，僅執行錯誤嚴重性、非安全性的 JavaScript/TypeScript 品質查詢。其 PR 保護機制特意小於排程設定檔：非草稿 PR 僅針對代理程式命令/模型/工具執行與回覆分派程式碼、設定檔 schema/遷移/IO 程式碼、驗證/機密/沙盒/安全性程式碼、核心通道和 bundled 通道外掛執行時、閘道通訊協定/伺服器方法、記憶體執行時/SDK 膠合程式、MCP/程序/向外傳送、提供者執行時/模型目錄、會話診斷/傳送佇列、外掛載入器、外掛 SDK/套件合約或外掛 SDK 回覆執行時變更，執行對應的 `agent-runtime-boundary`、`config-boundary`、`core-auth-secrets`、`channel-runtime-boundary`、`gateway-runtime-boundary`、`memory-runtime-boundary`、`mcp-process-runtime-boundary`、`provider-runtime-boundary`、`session-diagnostics-boundary`、`plugin-boundary`、`plugin-sdk-package-contract` 和 `plugin-sdk-reply-runtime` 分片。CodeQL 設定與品質工作流程變更會執行全部十二個 PR 品質分片。

手動分派接受：

```
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

狹窄設定檔是教學/迭代掛鉤，用於獨立執行一個品質分片。

| 類別                                                    | 表面                                                                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `/codeql-critical-quality/core-auth-secrets`            | 驗證、機密、沙盒、cron 和閘道安全性邊界程式碼                                                            |
| `/codeql-critical-quality/config-boundary`              | 設定檔 schema、遷移、正規化和 IO 合約                                                                    |
| `/codeql-critical-quality/gateway-runtime-boundary`     | 閘道通訊協定 schema 和伺服器方法合約                                                                     |
| `/codeql-critical-quality/channel-runtime-boundary`     | 核心通道和 bundled 通道外掛實作合約                                                                      |
| `/codeql-critical-quality/agent-runtime-boundary`       | 命令執行、模型/提供者分派、自動回覆分派與佇列，以及 ACP 控制平面執行時合約                               |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | MCP 伺服器和工具橋接器、程序監督協助程式，以及向外傳送合約                                               |
| `/codeql-critical-quality/memory-runtime-boundary`      | 記憶體主機 SDK、記憶體執行時外觀、記憶體外掛 SDK 別名、記憶體執行時啟用膠合程式，以及記憶體 doctor 命令  |
| `/codeql-critical-quality/session-diagnostics-boundary` | 回覆佇列內部機制、會話傳遞佇列、輸出會話綁定/傳遞輔助程式、診斷事件/日誌包裝介面，以及會話修復 CLI 合約  |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | Plugin SDK 輸入回覆分發、回酬載/分塊/執行時輔助程式、通道回覆選項、傳遞佇列，以及會話/執行緒綁定輔助程式 |
| `/codeql-critical-quality/provider-runtime-boundary`    | 模型目錄正規化、提供者驗證與探索、提供者執行時註冊、提供者預設值/目錄，以及網路/搜尋/擷取/嵌入登錄檔     |
| `/codeql-critical-quality/ui-control-plane`             | 控制 UI 啟動程序、本機持久性、閘道控制流程，以及任務控制平面執行時合約                                   |
| `/codeql-critical-quality/web-media-runtime-boundary`   | 核心網路擷取/搜尋、媒體 IO、媒體理解、影像生成，以及媒體生成執行時合約                                   |
| `/codeql-critical-quality/plugin-boundary`              | 載入器、登錄檔、公開介面，以及 Plugin SDK 進入點合約                                                     |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | 已發行的套件端 Plugin SDK 來源與外掛程式套件合約輔助程式                                                 |

品質與安全性分離，以便在不模糊安全性訊號的情況下，排程、衡量、停用或擴充品質發現結果。Swift、Python 和 bundled-plugin CodeQL 擴充功能應僅在狹窄設定檔具有穩定的執行時間和訊號後，作為範圍限定或分片的後續工作加回。

## 維護工作流程

### Docs Agent

`Docs Agent` 工作流程是一個事件驅動的 Codex 維護通道，用於確保現有文件與最近落地的變更保持同步。它沒有純粹的排程：`main` 上成功的非機器人推送 CI 執行可以觸發它，而手動分發可以直接執行它。當 `main` 已經向前推進，或過去一小時內已建立另一個非跳過的 Docs Agent 執行時，工作流程執行叫用會跳過。當它執行時，它會檢閱從上次非跳過的 Docs Agent 來源 SHA 到目前 `main` 的提交範圍，因此每小時一次的執行可以涵蓋自上次文件通過後累積的所有主要變更。

### 測試效能 Agent

`Test Performance Agent` 工作流程是一個用於緩慢測試的事件驅動 Codex 維護通道。它沒有單純的排程：在 `main` 上成功的非機器人推送 CI 執行可以觸發它，但如果該 UTC 天內已有另一個工作流程執行調用已執行或正在執行，它就會跳過。手動分發會繞過該每日活動閘門。該通道會建立完整的套件分組 Vitest 效能報告，讓 Codex 只進行維持覆蓋率的小型測試效能修正，而不是廣泛的重構，然後重新執行完整套件報告並拒絕會減少通過基準測試數量的變更。分組報告會記錄 Linux 和 macOS 上每個設定的執行時間和最大 RSS，因此前後比較會在持續時間差異之外顯示測試記憶體差異。如果基準有失敗的測試，Codex 可能只修正明顯的失敗，並且在提交任何內容之前，代理後的完整套件報告必須通過。當 `main` 在機器人推送落地之前推進時，該通道會重新套用經過驗證的修補程式、重新執行 `pnpm check:changed` 並重試推送；衝突的過時修補程式會被跳過。它使用 GitHub 託管的 Ubuntu，以便 Codex 動作能保持與文件代理相同的 drop-sudo 安全姿態。

### 合併後的重複 PR

`Duplicate PRs After Merge` 工作流程是一個用於落地後重複清理的手動維護者工作流程。它預設為試運行，並且僅在 `apply=true` 時關閉明確列出的 PR。在變更 GitHub 之前，它會驗證落地的 PR 已合併，並且每個重複項都有共用的參考問題或重疊的變更區塊。

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## 本機檢查閘門和變更路由

本機變更通道邏輯存在於 `scripts/changed-lanes.mjs` 中，並由 `scripts/check-changed.mjs` 執行。該本機檢查閘門對架構邊界的要求比廣泛的 CI 平台範圍更嚴格：

- 核心生產變更會執行核心生產和核心測試型別檢查以及核心 lint/防護；
- 核心僅測試變更僅執行核心測試型別檢查以及核心 lint；
- 擴充功能生產變更會執行擴充功能生產和擴充功能測試型別檢查以及擴充功能 lint；
- 擴充功能僅測試變更會執行擴充功能測試型別檢查以及擴充功能 lint；
- 公共 Plugin SDK 或 plugin-contract 變更會擴展到 extension typecheck，因為 extensions 依賴於這些核心 contracts（Vitest extension sweeps 保持為明確的測試工作）；
- 僅限 release metadata 的版本遞增會執行針對性的 version/config/root-dependency 檢查；
- 未知的 root/config 變更會故障安全地觸發所有檢查通道。

Local changed-test routing 位於 `scripts/test-projects.test-support.mjs` 中，並且故意設計得比 `check:changed` 更便宜：直接測試編輯會執行自身，來源編輯偏好明確映射，然後是同層測試和 import-graph 依賴項。Shared group-room delivery config 是明確映射之一：對 group visible-reply config、source reply delivery mode 或 message-tool system prompt 的變更會路由到核心 reply 測試以及 Discord 和 Slack delivery regressions，因此 shared default 的變更會在第一次 PR push 之前失敗。僅當變更範圍廣泛到便宜映射集不可信時，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。

## Testbox 驗證

Crabbox 是用於 maintainer Linux proof 的 repo-owned remote-box wrapper。當檢查對於本地編輯循環來說過於廣泛、當 CI 一致性很重要，或者當 proof 需要 secrets、Docker、package lanes、reusable boxes 或 remote logs 時，請從 repo root 使用它。正常的 OpenClaw backend 是 `blacksmith-testbox`；擁有的 AWS/Hetzner 容量是 Blacksmith 中斷、配額問題或明確擁有容量測試的備用方案。

Crabbox 支援的 Blacksmith 會執行 warm、claim、sync、run、report 和清理一次性 Testboxes。當所需的 root 檔案（例如 `pnpm-lock.yaml`）消失或當 `git status --short` 顯示至少 200 個追蹤刪除時，內建的 sync sanity check 會快速失敗。對於有意的大型刪除 PR，請為遠端指令設定 `OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1`。

Crabbox 還會終止在 sync 階段停留超過五分鐘而沒有 sync 後輸出的本地 Blacksmith CLI 調用。設定 `CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` 以停用該守衛，或者對於異常大的本地差異使用更大的毫秒值。

在第一次執行之前，請從 repo root 檢查 wrapper：

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

Repo 包裝器會拒絕未公告 `blacksmith-testbox` 的過時 Crabbox 二進位檔。即使 `.crabbox.yaml` 具有擁有者雲端預設值，仍需明確傳遞提供者。在 Codex 工作樹或連結/稀疏結帳中，請避免使用本地的 `pnpm crabbox:run` 腳本，因為 pnpm 可能會在 Crabbox 啟動之前協調相依性；請改為直接呼叫 node 包裝器：

```bash
node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox --timing-json --shell -- "pnpm test <path-or-filter>"
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

閱讀最終的 JSON 摘要。有用的欄位包括 `provider`、`leaseId`、`syncDelegated`、`exitCode`、`commandMs` 和 `totalMs`。一次性由 Blacksmith 支援的 Crabbox 執行應自動停止 Testbox；如果執行中斷或清理狀況不明，請檢查運行中的 box 並僅停止您建立的 box：

```bash
blacksmith testbox list --all
blacksmith testbox status --id <tbx_id>
blacksmith testbox stop --id <tbx_id>
```

僅當您刻意需要在同一個已準備好的 box 上執行多個指令時，才使用 reuse：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox --id <tbx_id> --no-sync --timing-json --shell -- "pnpm test <path-or-filter>"
pnpm crabbox:stop -- <tbx_id>
```

如果 Crabbox 是故障層但 Blacksmith 本身運作正常，請僅將直接 Blacksmith 用於診斷，例如 `list`、`status` 和清理。在將直接 Blacksmith 執行視為維護者證明之前，請先修正 Crabbox 路徑。

如果 `blacksmith testbox list --all` 和 `blacksmith testbox status` 運作正常，但新的 warmup 在幾分鐘後仍處於 `queued` 狀態且沒有 IP 或 Actions 執行 URL，請將其視為 Blacksmith 提供者、佇列、計費或組織限制壓力。請停止您建立的佇列 ID，避免啟動更多 Testbox，並在某人檢查 Blacksmith 儀表板、計費和組織限制的同時，將證明移至下方的擁有者 Crabbox 容量路徑。

僅當 Blacksmith 停機、配額受限、缺少所需環境，或擁有者容量明確為目標時，才升級至擁有者 Crabbox 容量：

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

在 AWS 壓力下，除非任務確實需要 48xlarge 級 CPU，否則避免使用 `class=beast`。`beast` 請求從 192 個 vCPU 開始，是觸發區域性 EC2 Spot 或 On-Demand Standard 配額最簡單的方式。儲存庫擁有的 `.crabbox.yaml` 預設為 `standard`、多個容量區域和 `capacity.hints: true`，因此仲介的 AWS 租約會列印所選區域/市場、配額壓力、Spot 回退和高壓類別警告。對於較重的廣泛檢查，請使用 `fast`；僅在 standard/fast 不足時使用 `large`；僅對於異常的 CPU 密集型通道（例如全套件或全外掛 Docker 矩陣、明確的發行/阻斷驗證，或高核心效能分析）使用 `beast`。不要對 `pnpm check:changed`、專注測試、僅文件工作、一般 lint/typecheck、小型 E2E 重現或 Blacksmith 停機分診使用 `beast`。使用 `--market on-demand` 進行容量診斷，以免 Spot 市場的波動混入信號中。

`.crabbox.yaml` 擁有自有雲通道的 provider、sync 和 GitHub Actions hydration 預設值。它排除本地 `.git`，以便 hydration 的 Actions checkout 保留其自己的遠端 Git 元數據，而不是同步維護者本地的遠端和物件儲存，並且它排除不應被傳輸的本地執行時/建置產物。`.github/workflows/crabbox-hydrate.yml` 擁有自有雲 `crabbox run --id <cbx_id>` 指令的 checkout、Node/pnpm 設定、`origin/main` 擷取以及非機密環境交接。

## 相關

- [安裝概觀](/zh-Hant/install)
- [開發通道](/zh-Hant/install/development-channels)
