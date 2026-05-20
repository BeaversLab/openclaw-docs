---
summary: "完整發布驗證階段、子工作流程、發布設定檔、重新執行處理程序，以及證據"
title: "完整發布驗證"
read_when:
  - Running or rerunning Full Release Validation
  - Comparing stable and full release validation profiles
  - Debugging release validation stage failures
---

`Full Release Validation` 是發布的總管。它是發布前驗證的單一手動入口，但大部分工作發生在子工作流程中，因此可以重新執行失敗的方塊而無需重新啟動整個發布程序。

請從受信任的工作流程參照執行它，通常是 `main`，並將發布分支、標籤或完整的提交 SHA 作為 `ref` 傳入：

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable
```

子工作流程使用受信任的工作流程參照作為測試工具，並使用輸入的 `ref` 作為受測候選項。這確保了在驗證較舊的發布分支或標籤時，仍有新的驗證邏輯可用。

預設情況下，`release_profile=stable` 會執行阻擋發布的通道並跳過詳盡的 Live/Docker soak。傳入 `run_release_soak=true` 以在穩定版本執行中包含 soak 通道。`release_profile=full` 總是啟用 soak 通道，因此廣泛的諮詢性設定檔不會靜默地降低覆蓋率。

Package Acceptance 通常從已解析的 `ref` 建構候選 tarball，包括使用 `pnpm ci:full-release` 分派的完整 SHA 執行。在 beta 發佈後，傳遞 `release_package_spec=openclaw@YYYY.M.D-beta.N` 以跨發佈檢查、Package Acceptance、跨作業系統、發佈路徑 Docker 和 package Telegram 重複使用已發佈的 npm 套件。僅當 Package Acceptance 應刻意驗證不同的套件時，才使用 `package_acceptance_package_spec`。

## 頂層階段

| 階段             | 詳細資訊                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 目標解析         | **Job:** `Resolve target ref`<br />**Child workflow:** none<br />**Proves:** 解析發佈分支、標籤或完整提交 SHA，並記錄選定的輸入。<br />**Rerun:** 如果此項失敗，請重新執行 umbrella。                                                                                                                                                                                                                    |
| Vitest 和一般 CI | **工作：** `Run normal full CI`<br />**子工作流：** `CI`<br />**證明：** 針對目標 ref 的手動完整 CI 圖譜，包括 Linux Node 軌道、捆綁插件分片、插件和通道合約分片、Node 22 相容性、`check-*`、`check-additional-*`、構建成品煙霧測試、文件檢查、Python 技能、Windows、macOS、Control UI i18n，以及透過 umbrella 進行的 Android 測試。<br />**重新執行：** `rerun_group=ci`。                              |
| 插件發行前版本   | **Job:** `Run plugin prerelease validation`<br />**Child workflow:** `Plugin Prerelease`<br />**Proves:** 僅限發佈的 plugin 靜態檢查、agentic plugin coverage、完整 extension batch shards、plugin prerelease Docker lanes，以及用於相容性分診的非封鎖 `plugin-inspector-advisory` 構件。<br />**Rerun:** `rerun_group=plugin-prerelease`。                                                              |
| 發行檢查         | **工作：** `Run release/live/Docker/QA validation`<br />**子工作流程：** `OpenClaw Release Checks`<br />**證明：** 安裝冒煙、跨作業系統套件檢查、套件驗收、QA Lab 對等性、即時 Matrix 以及即時 Telegram。配合 `run_release_soak=true` 或 `release_profile=full`，也會執行窮盡式即時/E2E 測試套件和 Docker 發行路徑區塊。<br />**重新執行：** `rerun_group=release-checks` 或範圍較小的發行檢查處理程序。 |
| 套件構件         | **Job:** `Prepare release package artifact`<br />**Child workflow:** none<br />**Proves:** 足夠早地建立父 `release-package-under-test` tarball，以供不需要等待 `OpenClaw Release Checks` 的面向套件的檢查使用。<br />**Rerun:** 重新執行 umbrella，或為已發佈套件的重新執行提供 `release_package_spec`。                                                                                                 |
| 套件 Telegram    | **Job:** `Run package Telegram E2E`<br />**Child workflow:** `NPM Telegram Beta E2E`<br />**Proves:** 針對 `rerun_group=all` 且具有 `release_profile=full` 的父級產制品支援 Telegram 套件證明，或當設定了 `release_package_spec` 或 `npm_telegram_package_spec` 時的已發布套件 Telegram 證明。<br />**Rerun:** `rerun_group=npm-telegram` 並搭配 `release_package_spec` 或 `npm_telegram_package_spec`。 |
| 總管驗證器       | **Job:** `Verify full validation`<br />**Child workflow:** 無<br />**Proves:** 重新檢查記錄的子執行結論，並附加來自子工作流程的 slowest-job 表格。<br />**Rerun:** 在重新執行失敗的子項至通過後，僅重新執行此工作。                                                                                                                                                                                      |

對於 `ref=main` 和 `rerun_group=all`，較新的總管會取代較舊的。
當父項被取消時，其監視器會取消任何已分派的子工作流程。發行分支和標籤驗證執行預設不會互相取消。

## 發行檢查階段

`OpenClaw Release Checks` 是最大的子工作流程。它會解析目標一次，
並在套件或 Docker 面向的階段需要時準備共用的 `release-package-under-test` 產制品。

| 階段                | 詳細資料                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 發行目標            | **Job:** `Resolve target ref`<br />**Backing workflow:** 無<br />**Tests:** 選定的 ref、可選的預期 SHA、profile、rerun group 以及 focused live suite filter。<br />**Rerun:** `rerun_group=release-checks`。                                                                                                                                                                                                                                          |
| 套件構件            | **Job:** `Prepare release package artifact`<br />**Backing workflow:** 無<br />**Tests:** 打包或解析一個候選 tarball 並上傳 `release-package-under-test` 以供下游套件面向檢查使用。<br />**Rerun:** 受影響的套件、cross-OS 或 live/E2E 群組。                                                                                                                                                                                                         |
| 安裝冒煙測試        | **Job:** `Run install smoke`<br />**Backing workflow:** `Install Smoke`<br />**Tests:** 包含根 Dockerfile smoke image 重用的完整安裝路徑、QR 套件安裝、根和 gateway Docker smokes、安裝程式 Docker 測試、Bun 全域安裝 image-provider smoke，以及快速 bundled-plugin 安裝/解除安裝 E2E。<br />**Rerun:** `rerun_group=install-smoke`。                                                                                                                 |
| 跨作業系統          | **工作：** `cross_os_release_checks`<br />**後備工作流程：** `OpenClaw Cross-OS Release Checks (Reusable)`<br />**測試：** 在 Linux、Windows 和 macOS 上針對選定的提供者和模式進行全新安裝與升級通道測試，使用候選 tarball 以及基準套件。<br />**重新執行：** `rerun_group=cross-os`。                                                                                                                                                                |
| Repo 和即時 E2E     | **工作：** `Run repo/live E2E validation`<br />**後備工作流程：** `OpenClaw Live And E2E Checks (Reusable)`<br />**測試：** 由 `release_profile` 選擇的儲存庫 E2E、即時快取、OpenAI websocket 串流、原生即時提供者和插件分片，以及 Docker 支援的即時模型/後端/閘道裝置。<br />**執行：** `run_release_soak=true`、`release_profile=full` 或專注的 `rerun_group=live-e2e`。<br />**重新執行：** `rerun_group=live-e2e`，可選搭配 `live_suite_filter`。 |
| Docker release path | **工作：** `Run Docker release-path validation`<br />**後備工作流程：** `OpenClaw Live And E2E Checks (Reusable)`<br />**測試：** 對共用套件構件進行發布路徑 Docker 區塊測試。<br />**執行：** `run_release_soak=true`、`release_profile=full` 或專注的 `rerun_group=live-e2e`。<br />**重新執行：** `rerun_group=live-e2e`。                                                                                                                         |
| Package Acceptance  | **工作：** `Run package acceptance`<br />**後備工作流程：** `Package Acceptance`<br />**測試：** 針對相同的 tarball 進行離線插件套件設定、插件更新、模擬 OpenAI Telegram 套件驗收，以及發布升級存活檢查。阻擋式發布檢查使用預設的最新發布基準；浸泡測試會擴展到 `2026.4.23` 或之後的每個穩定 npm 發行版，加上回報問題的設定。<br />**重新執行：** `rerun_group=package`。                                                                             |
| QA parity           | **工作：** `Run QA Lab parity lane` 和 `Run QA Lab parity report`<br />**後備工作流程：** 直接工作<br />**測試：** 候選與基準的代理平價包，然後是平價報告。<br />**重新執行：** `rerun_group=qa-parity` 或 `rerun_group=qa`。                                                                                                                                                                                                                         |
| QA live Matrix      | **Job:** `Run QA Lab live Matrix lane`<br />**Backing workflow:** direct job<br />**Tests:** fast live Matrix QA profile in the `qa-live-shared` environment.<br />**Rerun:** `rerun_group=qa-live` or `rerun_group=qa`。                                                                                                                                                                                                                             |
| QA live Telegram    | **Job:** `Run QA Lab live Telegram lane`<br />**Backing workflow:** direct job<br />**Tests:** live Telegram QA with Convex CI credential leases.<br />**Rerun:** `rerun_group=qa-live` or `rerun_group=qa`。                                                                                                                                                                                                                                         |
| 版本驗證器          | **Job:** `Verify release checks`<br />**Backing workflow:** none<br />**Tests:** required release-check jobs for the selected rerun group.<br />**Rerun:** rerun after focused child jobs pass。                                                                                                                                                                                                                                                      |

## Docker 發布路徑區塊

當 `live_suite_filter` 為空時，Docker release-path 階段會執行這些區塊：

| 區塊                                                       | 覆蓋範圍                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| `core`                                                     | 核心 Docker 發布路徑 smoke lanes。                                       |
| `package-update-openai`                                    | OpenAI 套件安裝/更新行為、Codex 按需安裝以及 Chat Completions 工具呼叫。 |
| `package-update-anthropic`                                 | Anthropic 套件安裝和更新行為。                                           |
| `package-update-core`                                      | 提供者中立的套件和更新行為。                                             |
| `plugins-runtime-plugins`                                  | 執行插件行為的插件執行時 lanes。                                         |
| `plugins-runtime-services`                                 | 服務支援和即時插件執行時 lanes；視情況包含 OpenWebUI。                   |
| `plugins-runtime-install-a` 到 `plugins-runtime-install-h` | 為並行版本驗證分割的插件安裝/執行時批次。                                |

當只有一條 Docker 通道失敗時，請在可重複使用的 live/E2E 工作流程上使用目標 `docker_lanes=<lane[,lane]>`。發行成品包含針對每個通道的重新執行指令，並在可用時搭配套件成品和映像檔重複使用輸入。

## 版本設定檔

`release_profile` 主要控制 release checks 內部的 live/provider 廣度。它不會移除正常的完整 CI、Plugin Prerelease、install smoke、package acceptance 或 QA Lab。對於 `stable`，詳盡的 repo/live E2E 和 Docker release-path 區塊屬於 soak coverage，並在 `run_release_soak=true` 時執行。`full` 會強制開啟 soak coverage，並使 umbrella 在 `rerun_group=all` 時對父發行套件成品執行套件 Telegram E2E，以免完整的發布前候選版本無聲地跳過該 Telegram 套件通道。

| 設定檔    | 預期用途                 | 包含的即時/提供者覆蓋範圍                                                                                                                                            |
| --------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minimum` | 最快的發布關鍵冒煙測試。 | OpenAI/core 即時路徑、OpenAI 的 Docker 即時模型、原生閘道核心、原生 OpenAI 閘道設定檔、原生 OpenAI 外掛程式，以及 Docker 即時閘道 OpenAI。                           |
| `stable`  | 預設發布核准設定檔。     | `minimum` 加上 Anthropic smoke、Google、MiniMax、後端、原生即時測試框架、Docker 即時 CLI 後端、Docker ACP bind、Docker Codex 框架，以及一個 OpenCode Go smoke 分片。 |
| `full`    | 廣泛諮詢掃描。           | `stable` 加上 advisory 提供者、外掛即時分片和媒體即時分片。                                                                                                          |

## 僅完整版本新增項目

`stable` 會跳過這些套件，而 `full` 則包含它們：

| 區域                 | 僅完整版本覆蓋範圍                                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Docker 即時模型      | OpenCode Go、OpenRouter、xAI、Z.ai 和 Fireworks。                                                                       |
| Docker 即時閘道      | 諮詢提供者分為 DeepSeek/Fireworks、OpenCode Go/OpenRouter 和 xAI/Z.ai 分片。                                            |
| 原生閘道提供者設定檔 | 完整的 Anthropic Opus 和 Sonnet/Haiku 分片、Fireworks、DeepSeek、完整的 OpenCode Go 模型分片、OpenRouter、xAI 和 Z.ai。 |
| 原生外掛程式即時分片 | 外掛程式 A-K、L-N、O-Z 其他、Moonshot 和 xAI。                                                                          |
| 原生媒體即時分片     | 音訊、Google 音樂、MiniMax 音樂和視訊群組 A-D。                                                                         |

`stable` 包含 `native-live-src-gateway-profiles-anthropic-smoke` 和
`native-live-src-gateway-profiles-opencode-go-smoke`；`full` 則改用更廣泛的
Anthropic 和 OpenCode Go 模型分片。針對性重新執行仍可使用
彙總的 `native-live-src-gateway-profiles-anthropic` 或
`native-live-src-gateway-profiles-opencode-go` 處理程序。

## 專注重跑

使用 `rerun_group` 以避免重複不相關的發布框：

| 控制代碼            | 範圍                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------- |
| `all`               | 所有完整發布驗證階段。                                                                |
| `ci`                | 僅手動完整 CI 子項。                                                                  |
| `plugin-prerelease` | 僅外掛程式預發布子項。                                                                |
| `release-checks`    | 所有 OpenClaw 發布檢查階段。                                                          |
| `install-smoke`     | 從安裝冒煙測試到發布檢查。                                                            |
| `cross-os`          | 跨作業系統發布檢查。                                                                  |
| `live-e2e`          | Repo/live E2E 和 Docker release-path 驗證。                                           |
| `package`           | 套件驗收。                                                                            |
| `qa`                | QA parity 以及 QA live lanes。                                                        |
| `qa-parity`         | QA parity lanes 且僅報告。                                                            |
| `qa-live`           | 僅限 QA live Matrix 和 Telegram。                                                     |
| `npm-telegram`      | 已發布套件 Telegram E2E；需要 `release_package_spec` 或 `npm_telegram_package_spec`。 |

當一個即時套件失敗時，將 `live_suite_filter` 與 `rerun_group=live-e2e` 搭配使用。
有效的篩選 ID 定義於可重複使用的即時/E2E 工作流程中，包括
`docker-live-models`、`live-gateway-docker`、
`live-gateway-anthropic-docker`、`live-gateway-google-docker`、
`live-gateway-minimax-docker`、`live-gateway-advisory-docker`、
`live-cli-backend-docker`、`live-acp-bind-docker` 和
`live-codex-harness-docker`。

`live-gateway-advisory-docker` 處理程序是其三個提供者分片的彙總重新執行處理程序，因此仍會展開至所有 advisory Docker 閘道工作。

當某個跨 OS 通道失敗時，請使用 `cross_os_suite_filter` 搭配 `rerun_group=cross-os`。此過濾器接受 OS ID、套件 ID 或 OS/套件組合，例如 `windows/packaged-upgrade`、`windows` 或 `packaged-fresh`。跨 OS 摘要包含打包升級通道的各階段計時，而長時間執行的指令會輸出心跳行，以便在作業逾時前就能看到卡住的 Windows 更新。

QA release-check 軌道除標準執行時期工具覆蓋率閘道外均為建議性。標準層級中所需的 OpenClaw 動態工具漂移會阻擋 release-check 驗證器；其他僅限 QA 的失敗會被回報為警告。當您需要新的 QA 證據時，請重新執行 `rerun_group=qa`、`qa-parity` 或 `qa-live`。

## 需要保留的證據

請保留 `Full Release Validation` 摘要作為發布層級的索引。它會連結子執行的 ID 並包含最慢作業表格。若發生失敗，請先檢查子工作流程，然後重新執行上述最小且匹配的控制代碼。

有用的產出檔案：

- 來自完整發布驗證父項的 `release-package-under-test` 和 `OpenClaw Release Checks`
- `.artifacts/docker-tests/` 下的 Docker 發布路徑構件
- 套件驗收 `package-under-test` 和 Docker 驗收構件
- 每個 OS 和套件的跨 OS 發布檢查構件
- QA 對等性、Matrix 和 Telegram 構件

## 工作流程檔案

- `.github/workflows/full-release-validation.yml`
- `.github/workflows/openclaw-release-checks.yml`
- `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml`
- `.github/workflows/plugin-prerelease.yml`
- `.github/workflows/install-smoke.yml`
- `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- `.github/workflows/package-acceptance.yml`
