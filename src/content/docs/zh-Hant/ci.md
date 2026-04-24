---
title: CI Pipeline
summary: "CI job graph, scope gates, and local command equivalents"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging failing GitHub Actions checks
---

# CI Pipeline

CI 在每次推送到 `main` 和每個 Pull Request 時執行。它使用智慧範圍機制，在僅有不相關區域變更時跳過耗時的工作。

QA Lab 在主要的智能範圍工作流程之外擁有專用的 CI 通道。`Parity gate` 工作流程會在符合條件的 PR 變更時和手動觸發時執行；它會建置私有的 QA 執行環境，並比較模擬的 GPT-5.4 和 Opus 4.6 agentic packs。`QA-Lab - All Lanes` 工作流程每晚在 `main` 上及手動觸發時執行；它會將模擬對等性檢查、即時 Matrix 通道和即時 Telegram 通道作為並行作業展開。即時作業使用 `qa-live-shared` 環境，而 Telegram 通道則使用 Convex 租約。`OpenClaw Release Checks` 也會在發布核准前執行相同的 QA Lab 通道。

## 作業概覽

| 作業                             | 用途                                                                         | 執行時機                        |
| -------------------------------- | ---------------------------------------------------------------------------- | ------------------------------- |
| `preflight`                      | 偵測僅文檔變更、變更範圍、變更擴充功能，並建置 CI 清單                       | 總是在非草稿推送和 PR 上執行    |
| `security-scm-fast`              | 透過 `zizmor` 進行金鑰偵測和工作流程稽核                                     | 總是在非草稿推送和 PR 上執行    |
| `security-dependency-audit`      | 針對 npm 公告的無依賴生產鎖定檔稽核                                          | 總是在非草稿推送和 PR 上執行    |
| `security-fast`                  | 快速安全作業的必要聚合                                                       | 總是在非草稿推送和 PR 上執行    |
| `build-artifacts`                | 建置 `dist/`、Control UI、建置成品檢查和可重複使用的下游成品                 | Node 相關變更                   |
| `checks-fast-core`               | 快速 Linux 正確性通道，例如 bundled/plugin-contract/protocol 檢查            | Node 相關變更                   |
| `checks-fast-contracts-channels` | 分片通道合約檢查，具有穩定的聚合檢查結果                                     | Node 相關變更                   |
| `checks-node-extensions`         | 跨擴充功能套件的完整 bundled-plugin 測試分片                                 | Node 相關變更                   |
| `checks-node-core-test`          | 核心 Node 測試分片，不包括通道、bundled、合約和擴充功能通道                  | Node 相關變更                   |
| `extension-fast`                 | 僅針對已變更 bundled plugins 的專注測試                                      | 具有擴充功能變更的 Pull Request |
| `check`                          | 分片主要本地閘道對等項：prod types、lint、guards、test types 和 strict smoke | Node 相關變更                   |
| `check-additional`               | 架構、邊界、擴充表面守衛、套件邊界和閘道監看分片                             | Node 相關變更                   |
| `build-smoke`                    | 內建 CLI 煙霧測試和啟動記憶體煙霧測試                                        | Node 相關變更                   |
| `checks`                         | 內建產品通道測試的驗證程式以及僅限推送的 Node 22 相容性                      | Node 相關變更                   |
| `check-docs`                     | 文件格式、Lint 和連結檢查                                                    | 文件變更                        |
| `skills-python`                  | Python 支援技能的 Ruff + pytest                                              | Python 技能相關變更             |
| `checks-windows`                 | Windows 專屬測試通道                                                         | Windows 相關變更                |
| `macos-node`                     | 使用共用內建產品的 macOS TypeScript 測試通道                                 | macOS 相關變更                  |
| `macos-swift`                    | macOS 應用程式的 Swift Lint、建置和測試                                      | macOS 相關變更                  |
| `android`                        | 兩種版本的 Android 單元測試加上一個 Debug APK 建置                           | Android 相關變更                |

## 快速失敗順序

工作的排序方式是讓廉價的檢查在昂貴的工作執行之前失敗：

1. `preflight` 決定哪些通道存在。`docs-scope` 和 `changed-scope` 邏輯是此工作內的步驟，而非獨立工作。
2. `security-scm-fast`、`security-dependency-audit`、`security-fast`、`check`、`check-additional`、`check-docs` 和 `skills-python` 會快速失敗，無需等待較重的產品和平台矩陣工作。
3. `build-artifacts` 與快速的 Linux 通道重疊，因此下游消費者可以在共用建置準備就緒後立即開始。
4. 較重的平台和執行時通道隨後展開：`checks-fast-core`、`checks-fast-contracts-channels`、`checks-node-extensions`、`checks-node-core-test`、僅限 PR 的 `extension-fast`、`checks`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

範圍邏輯位於 `scripts/ci-changed-scope.mjs` 中，並由 `src/scripts/ci-changed-scope.test.ts` 中的單元測試涵蓋。
CI 工作流程的編輯會驗證 Node CI 圖譜以及工作流程 lint，但不會單獨強制執行 Windows、Android 或 macOS 原生建置；這些平台通道的範圍仍限制於平台原始碼的變更。
Windows Node 檢查的範圍僅限於 Windows 特定的處理程序/路徑包裝器、npm/pnpm/UI 執行器輔助程式、套件管理員設定，以及執行該通道的 CI 工作流程介面；不相關的原始碼、外掛、install-smoke 和僅測試變更會保留在 Linux Node 通道上，以免為已由正常測試分片執行的覆蓋率佔用 16-vCPU 的 Windows 工作節點。
獨立的 `install-smoke` 工作流程透過其自己的 `preflight` 工作重複使用相同的範圍腳本。它根據較窄的 changed-smoke 訊號計算 `run_install_smoke`，因此對於安裝、打包、容器相關變更、打包延伸模組的生產變更，以及 Docker smoke 工作練習的核心外掛/通道/閘道/Plugin SDK 介面，都會執行 Docker/install smoke。僅測試和僅文件的編輯不會佔用 Docker 工作節點。其 QR 套件 smoke 會強制重新執行 Docker `pnpm install` 層，同時保留 BuildKit pnpm 存儲快取，因此它仍會練習安裝過程，而無需在每次執行時重新下載相依項。其 gateway-network e2e 重複使用工作早期建置的執行時映像，因此它增加了真實的容器對容器 WebSocket 覆蓋率，而無需額外的 Docker 建置。本機 `test:docker:all` 預先建置一個共享的 `scripts/e2e/Dockerfile` built-app 映像，並在 E2E 容器 smoke 執行器之間重複使用它；可重複使用的 live/E2E 工作流程透過在 Docker 矩陣之前建置並推送一個 SHA 標記的 GHCR Docker E2E 映像來鏡像該模式，然後使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行矩陣。QR 和安裝程式 Docker 測試保留其自己專注於安裝的 Dockerfile。一個獨立的 `docker-e2e-fast` 工作在 120 秒指令逾時下執行有界的 bundled-plugin Docker 設定檔：setup-entry 相依項修復加上合成的 bundled-loader 失敗隔離。完整的 bundled update/channel 矩陣保持手動/完整套件，因為它會執行重複的真實 npm update 和 doctor 修復過程。

本地變更通道邏輯位於 `scripts/changed-lanes.mjs` 中，並由 `scripts/check-changed.mjs` 執行。該本地閘道對架構邊界的要求比廣泛的 CI 平台範圍更嚴格：核心生產變更執行核心生產類型檢查加上核心測試，核心僅測試變更僅執行核心測試類型檢查/測試，擴充生產變更執行擴充生產類型檢查加上擴充測試，擴充僅測試變更僅執行擴充測試類型檢查/測試。公開插件 SDK 或 plugin-contract 變更會擴展到擴充驗證，因為擴充功能依賴於這些核心合約。僅釋出元資料的版本遞增執行針對性的版本/配置/根依賴檢查。未知的根/配置變更會故障安全地運行所有通道。

在推送時，`checks` 矩陣會新增僅推送的 `compat-node22` 通道。在拉取請求中，該通道會被跳過，矩陣會保持聚焦於正常的測試/通道。

最慢的 Node 測試系列被拆分或平衡，以確保每個任務保持精簡：channel contracts 將 registry 和 core 覆蓋率拆分為六個加權分片，bundled plugin 測試在六個 extension workers 之間平衡，auto-reply 作為三個平衡的 workers 運行，而不是六個微小的 workers，agentic gateway/plugin 配置分散到現有的 source-only agentic Node 任務中，而不是等待構建的工件。Broad browser、QA、media 和 miscellaneous plugin 測試使用其專用的 Vitest 配置，而不是共享的 plugin 全包配置。Broad agents lane 使用共享的 Vitest 檔案並行排程器，因為它是由匯入/排程主導，而不是由單個慢速測試檔案佔用。`runtime-config` 與 infra core-runtime 分片一起運行，以防止共享 runtime 分片佔用尾部時間。`check-additional` 將 package-boundary compile/canary 工作保持在一起，並將 runtime topology 架構與 gateway watch 覆蓋率分開；boundary guard 分片在一個任務內並行運行其小型獨立守衛程序。Gateway watch、channel 測試和 core support-boundary 分片在 `build-artifacts` 內並行運行，並在 `dist/` 和 `dist-runtime/` 建成之後進行，同時保留其舊的檢查名稱作為輕量級驗證任務，並避免兩個額外的 Blacksmith workers 和第二個工件消費者佇列。
Android CI 同時運行 `testPlayDebugUnitTest` 和 `testThirdPartyDebugUnitTest`，然後構建 Play debug APK。第三方 flavor 沒有單獨的 source set 或 manifest；其 unit-test lane 仍使用 SMS/call-log BuildConfig flags 編譯該 flavor，同時避免在每次 Android 相關推送時重複執行 debug APK 打包任務。
`extension-fast` 僅限 PR，因為 push 運行已經執行了完整的 bundled plugin 分片。這為審查提供了變更外掛的反饋，而無需在 `main` 上保留額外的 Blacksmith worker 用於 `checks-node-extensions` 中已存在的覆蓋率。

當較新的推送推送至同一個 PR 或 `main` ref 時，GitHub 可能會將過時的工作標記為 `cancelled`。除非同一個 ref 的最新運行也失敗，否則請將其視為 CI 雜訊。聚合分片檢查使用 `!cancelled() && always()`，因此它們仍會回報正常的分片失敗，但在整個工作流程已經被過時後不會排隊。
CI 並發鍵是版本控制的 (`CI-v7-*`)，因此舊佇列組中位於 GitHub 端的殭屍程序無法無限期地阻擋較新的 main 運行。

## 執行器

| 執行器                           | 工作                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | `preflight`、快速安全性工作和聚合工作 (`security-scm-fast`、`security-dependency-audit`、`security-fast`)、快速協定/合約/打包檢查、分片通道合約檢查、`check` 分片（lint 除外）、`check-additional` 分片和聚合工作、Node 測試聚合驗證器、文件檢查、Python 技能、workflow-sanity、labeler、auto-response；install-smoke 預檢也使用 GitHub 託管的 Ubuntu，以便 Blacksmith 矩陣可以更早排隊 |
| `blacksmith-8vcpu-ubuntu-2404`   | `build-artifacts`、build-smoke、Linux Node 測試分片、打包外掛測試分片、`android`                                                                                                                                                                                                                                                                                                        |
| `blacksmith-16vcpu-ubuntu-2404`  | `check-lint`，其仍然對 CPU 足夠敏感，以至於 8 個 vCPU 的成本高於其節省的成本；install-smoke Docker 組建，其中 32 個 vCPU 的排隊時間成本高於其節省的成本                                                                                                                                                                                                                                 |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                                                                                                                                                        |
| `blacksmith-6vcpu-macos-latest`  | `macos-node` 於 `openclaw/openclaw`；分支會回退至 `macos-latest`                                                                                                                                                                                                                                                                                                                        |
| `blacksmith-12vcpu-macos-latest` | `macos-swift` 於 `openclaw/openclaw`；分支會回退至 `macos-latest`                                                                                                                                                                                                                                                                                                                       |

## 本地對等項目

```bash
pnpm changed:lanes   # inspect the local changed-lane classifier for origin/main...HEAD
pnpm check:changed   # smart local gate: changed typecheck/lint/tests by boundary lane
pnpm check          # fast local gate: production tsgo + sharded lint + parallel fast guards
pnpm check:test-types
pnpm check:timed    # same gate with per-stage timings
pnpm build:strict-smoke
pnpm check:architecture
pnpm test:gateway:watch-regression
pnpm test           # vitest tests
pnpm test:channels
pnpm test:contracts:channels
pnpm check:docs     # docs format + lint + broken links
pnpm build          # build dist when CI artifact/build-smoke lanes matter
node scripts/ci-run-timings.mjs <run-id>  # summarize wall time, queue time, and slowest jobs
```
