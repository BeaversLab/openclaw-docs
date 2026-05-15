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

套件驗收通常會從解析的 `ref` 建構候選 tarball，包括使用 `pnpm ci:full-release` 分派的完整 SHA 執行。發布後，請傳入 `package_acceptance_package_spec=openclaw@YYYY.M.D` (或 `openclaw@beta`/`openclaw@latest`)，以便對已發布的 npm 套件執行相同的套件/更新矩陣。

## 頂層階段

| 階段             | 詳細資訊                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 目標解析         | **工作：** `Resolve target ref`<br />**子工作流程：** 無<br />**證明：** 解析發布分支、標籤或完整提交 SHA，並記錄選定的輸入。<br />**重新執行：** 如果此步驟失敗，請重新執行總管。                                                                                                                                                                                                                       |
| Vitest 和一般 CI | **工作：** `Run normal full CI`<br />**子工作流程：** `CI`<br />**證明：** 針對目標參照的手動完整 CI 圖，包括 Linux Node 軌道、捆綁插件分片、通道合約、Node 22 相容性、`check`、`check-additional`、組建冒煙、文件檢查、Python 技能、Windows、macOS、Control UI i18n 以及透過總管處理的 Android。<br />**重新執行：** `rerun_group=ci`。                                                                 |
| 插件發行前版本   | **工作：** `Run plugin prerelease validation`<br />**子工作流程：** `Plugin Prerelease`<br />**證明：** 僅限發行的靜態檢查、代理式插件覆蓋率、完整擴充套件批次分片以及插件發行前 Docker 軌道。<br />**重新執行：** `rerun_group=plugin-prerelease`。                                                                                                                                                     |
| 發行檢查         | **工作：** `Run release/live/Docker/QA validation`<br />**子工作流程：** `OpenClaw Release Checks`<br />**證明：** 安裝冒煙、跨作業系統套件檢查、套件驗收、QA Lab 對等性、即時 Matrix 以及即時 Telegram。配合 `run_release_soak=true` 或 `release_profile=full`，也會執行窮盡式即時/E2E 測試套件和 Docker 發行路徑區塊。<br />**重新執行：** `rerun_group=release-checks` 或範圍較小的發行檢查處理程序。 |
| 套件構件         | **工作：** `Prepare release package artifact`<br />**子工作流程：** 無<br />**證明：** 及早建立父層 `release-package-under-test` tarball，供不需要等待 `OpenClaw Release Checks` 的套件導向檢查使用。<br />**重新執行：** 重新執行總管或提供 `npm_telegram_package_spec` 給 `rerun_group=npm-telegram`。                                                                                                 |
| 套件 Telegram    | **工作：** `Run package Telegram E2E`<br />**子工作流程：** `NPM Telegram Beta E2E`<br />**證明：** 針對具備 `release_profile=full` 之 `rerun_group=all` 的父層構件支援 Telegram 套件證明，或在設定 `npm_telegram_package_spec` 時執行已發佈套件的 Telegram 證明。<br />**重新執行：** 使用 `npm_telegram_package_spec` 重新執行 `rerun_group=npm-telegram`。                                            |
| 總管驗證器       | **工作：** `Verify full validation`<br />**子工作流程：** 無<br />**證明：** 重新檢查記錄的子執行結論，並附加來自子工作流程的最慢任務表格。<br />**重新執行：** 在重新執行失敗的子項至綠燈狀態後，僅重新執行此工作。                                                                                                                                                                                     |

對於 `ref=main` 和 `rerun_group=all`，較新的總管會取代較舊的。
當父項被取消時，其監視器會取消任何它已分派的子工作流程。發行分支和標籤驗證執行預設不會互相取消。

## 發行檢查階段

`OpenClaw Release Checks` 是最大的子工作流程。它解析目標一次，並在套件或 Docker 面向階段需要時準備共享的 `release-package-under-test` 構件。

| 階段                | 詳細資料                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 發行目標            | **工作：** `Resolve target ref`<br />**支援工作流程：** 無<br />**測試：** 選定的參照、可選的預期 SHA、設定檔、重新執行群組，以及專注的即時套件篩選器。<br />**重新執行：** `rerun_group=release-checks`。                                                                                                                                                                                                                                                                                 |
| 套件構件            | **工作：** `Prepare release package artifact`<br />**支援工作流程：** 無<br />**測試：** 打包或解析一個候選 tarball，並上傳 `release-package-under-test` 以供下游套件面向檢查使用。<br />**重新執行：** 受影響的套件、跨作業系統，或即時/E2E 群組。                                                                                                                                                                                                                                        |
| 安裝冒煙測試        | **工作：** `Run install smoke`<br />**支援工作流程：** `Install Smoke`<br />**測試：** 完整的安裝路徑，包含根 Dockerfile 冒煙映像重用、QR 套件安裝、根和閘道 Docker 冒煙測試、安裝程式 Docker 測試、Bun 全域安裝映像提供者冒煙測試，以及快速內嵌外掛安裝/解除安裝 E2E。<br />**重新執行：** `rerun_group=install-smoke`。                                                                                                                                                                  |
| 跨作業系統          | **工作：** `cross_os_release_checks`<br />**支援工作流程：** `OpenClaw Cross-OS Release Checks (Reusable)`<br />**測試：** 針對選定的提供者和模式，在 Linux、Windows 和 macOS 上進行全新和升級通道測試，使用候選 tarball 加上基準套件。<br />**重新執行：** `rerun_group=cross-os`。                                                                                                                                                                                                       |
| Repo 和即時 E2E     | **Job:** `Run repo/live E2E validation`<br />**Backing workflow:** `OpenClaw Live And E2E Checks (Reusable)`<br />**Tests:** repository E2E、live cache、OpenAI websocket streaming、native live provider 和 plugin shards，以及由 `release_profile` 選定的 Docker-backed live model/backend/gateway harnesses。<br />**Runs:** `run_release_soak=true`、`release_profile=full` 或 focused `rerun_group=live-e2e`。<br />**Rerun:** `rerun_group=live-e2e`，可選帶有 `live_suite_filter`。 |
| Docker release path | **Job:** `Run Docker release-path validation`<br />**Backing workflow:** `OpenClaw Live And E2E Checks (Reusable)`<br />**Tests:** 對照共享 package artifact 測試 release-path Docker chunks。<br />**Runs:** `run_release_soak=true`、`release_profile=full` 或 focused `rerun_group=live-e2e`。<br />**Rerun:** `rerun_group=live-e2e`。                                                                                                                                                 |
| Package Acceptance  | **Job:** `Run package acceptance`<br />**Backing workflow:** `Package Acceptance`<br />**Tests:** offline plugin package fixtures、plugin update、mock-OpenAI Telegram package acceptance，以及對照同一 tarball 的 published-upgrade survivor checks。Blocking release checks 使用預設的最新 published baseline；soak checks 擴展至 `2026.4.23` 或之後的每個 stable npm release，外加 reported-issue fixtures。<br />**Rerun:** `rerun_group=package`。                                    |
| QA parity           | **Job:** `Run QA Lab parity lane` 和 `Run QA Lab parity report`<br />**Backing workflow:** direct jobs<br />**Tests:** candidate 和 baseline agentic parity packs，然後是 parity report。<br />**Rerun:** `rerun_group=qa-parity` 或 `rerun_group=qa`。                                                                                                                                                                                                                                    |
| QA live Matrix      | **Job:** `Run QA Lab live Matrix lane`<br />**Backing workflow:** direct job<br />**Tests:** `qa-live-shared` 環境中的 fast live Matrix QA profile。<br />**Rerun:** `rerun_group=qa-live` 或 `rerun_group=qa`。                                                                                                                                                                                                                                                                           |
| QA live Telegram    | **Job:** `Run QA Lab live Telegram lane`<br />**Backing workflow:** direct job<br />**Tests:** 使用 Convex CI 憑證租約進行即時 Telegram QA。<br />**Rerun:** `rerun_group=qa-live` 或 `rerun_group=qa`。                                                                                                                                                                                                                                                                                   |
| 版本驗證器          | **Job:** `Verify release checks`<br />**Backing workflow:** none<br />**Tests:** 所選重新執行群組的必要版本檢查 jobs。<br />**Rerun:** 在專注的子 jobs 通過後重新執行。                                                                                                                                                                                                                                                                                                                    |

## Docker 發布路徑區塊

當 `live_suite_filter` 為空時，Docker 發布路徑階段會執行這些區塊：

| 區塊                                                       | 覆蓋範圍                                               |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| `core`                                                     | 核心 Docker 發布路徑 smoke lanes。                     |
| `package-update-openai`                                    | OpenAI 套件安裝/更新行為，包括 Codex 按需安裝。        |
| `package-update-anthropic`                                 | Anthropic 套件安裝和更新行為。                         |
| `package-update-core`                                      | 提供者中立的套件和更新行為。                           |
| `plugins-runtime-plugins`                                  | 執行插件行為的插件執行時 lanes。                       |
| `plugins-runtime-services`                                 | 服務支援和即時插件執行時 lanes；視情況包含 OpenWebUI。 |
| `plugins-runtime-install-a` 到 `plugins-runtime-install-h` | 為並行版本驗證分割的插件安裝/執行時批次。              |

當只有一個 Docker lane 失敗時，在可重複使用的即時/E2E workflow 上使用目標 `docker_lanes=<lane[,lane]>`。版本 artifacts 包含每個 lane 的重新執行指令，並在可用時包含套件 artifact 和映像檔重用輸入。

## 版本設定檔

`release_profile` 主要控制版本檢查內部的即時/提供者廣度。它不會移除正常的完整 CI、Plugin Prerelease、安裝 smoke、套件驗收或 QA Lab。對於 `stable`，窮盡的 repo/即時 E2E 和 Docker 發布路徑區塊屬於 soak 覆蓋範圍，並在 `run_release_soak=true` 時執行。`full` 會強制開啟 soak 覆蓋範圍，並讓 umbrella 在 `rerun_group=all` 時針對父版本套件 artifact 執行套件 Telegram E2E，因此完整的發布前候選版本不會無聲地跳過該 Telegram 套件 lane。

| 設定檔    | 預期用途                 | 包含的即時/提供者覆蓋範圍                                                                                                                                           |
| --------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minimum` | 最快的發布關鍵冒煙測試。 | OpenAI/core 即時路徑、OpenAI 的 Docker 即時模型、原生閘道核心、原生 OpenAI 閘道設定檔、原生 OpenAI 外掛程式，以及 Docker 即時閘道 OpenAI。                          |
| `stable`  | 預設發布核准設定檔。     | `minimum` 加上 Anthropic 冒煙測試、Google、MiniMax、後端、原生即時測試線束、Docker 即時 CLI 後端、Docker ACP 繫結、Docker Codex 線束以及 OpenCode Go 冒煙測試分片。 |
| `full`    | 廣泛諮詢掃描。           | `stable` 加上諮詢提供者、外掛程式即時分片和媒體即時分片。                                                                                                           |

## 僅完整版本新增項目

這些套件會被 `stable` 跳過，並包含在 `full` 中：

| 區域                 | 僅完整版本覆蓋範圍                                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Docker 即時模型      | OpenCode Go、OpenRouter、xAI、Z.ai 和 Fireworks。                                                                       |
| Docker 即時閘道      | 諮詢提供者分為 DeepSeek/Fireworks、OpenCode Go/OpenRouter 和 xAI/Z.ai 分片。                                            |
| 原生閘道提供者設定檔 | 完整的 Anthropic Opus 和 Sonnet/Haiku 分片、Fireworks、DeepSeek、完整的 OpenCode Go 模型分片、OpenRouter、xAI 和 Z.ai。 |
| 原生外掛程式即時分片 | 外掛程式 A-K、L-N、O-Z 其他、Moonshot 和 xAI。                                                                          |
| 原生媒體即時分片     | 音訊、Google 音樂、MiniMax 音樂和視訊群組 A-D。                                                                         |

`stable` 包含 `native-live-src-gateway-profiles-anthropic-smoke` 和
`native-live-src-gateway-profiles-opencode-go-smoke`；`full` 改用更廣泛的
Anthropic 和 OpenCode Go 模型分片。專注重跑仍可使用
彙總的 `native-live-src-gateway-profiles-anthropic` 或
`native-live-src-gateway-profiles-opencode-go` 控制代碼。

## 專注重跑

使用 `rerun_group` 以避免重複不相關的發布箱：

| 控制代碼            | 範圍                                                          |
| ------------------- | ------------------------------------------------------------- |
| `all`               | 所有完整發布驗證階段。                                        |
| `ci`                | 僅手動完整 CI 子項。                                          |
| `plugin-prerelease` | 僅外掛程式預發布子項。                                        |
| `release-checks`    | 所有 OpenClaw 發布檢查階段。                                  |
| `install-smoke`     | 從安裝冒煙測試到發布檢查。                                    |
| `cross-os`          | 跨作業系統發布檢查。                                          |
| `live-e2e`          | Repo/live E2E 和 Docker release-path 驗證。                   |
| `package`           | 套件驗收。                                                    |
| `qa`                | QA parity 以及 QA live lanes。                                |
| `qa-parity`         | QA parity lanes 且僅報告。                                    |
| `qa-live`           | 僅限 QA live Matrix 和 Telegram。                             |
| `npm-telegram`      | 已發布套件的 Telegram E2E；需要 `npm_telegram_package_spec`。 |

當其中一個 live suite 失敗時，使用 `live_suite_filter` 搭配 `rerun_group=live-e2e`。
有效的 filter id 定義於可重複使用的 live/E2E workflow 中，包括
`docker-live-models`、`live-gateway-docker`、
`live-gateway-anthropic-docker`、`live-gateway-google-docker`、
`live-gateway-minimax-docker`、`live-gateway-advisory-docker`、
`live-cli-backend-docker`、`live-acp-bind-docker` 和
`live-codex-harness-docker`。

`live-gateway-advisory-docker` 控制碼是其三個 provider 分片的聚合重新執行控制碼，因此它仍會分流到所有 advisory Docker gateway 工作。

當其中一個跨 OS lane 失敗時，使用 `cross_os_suite_filter` 搭配 `rerun_group=cross-os`。
此過濾器接受 OS id、suite id 或 OS/suite 組合，例如 `windows/packaged-upgrade`、`windows` 或 `packaged-fresh`。
跨 OS 摘要包含打包升級 lane 的各階段時間，且長時間執行的指令會列印心跳行，以便在作業逾時前看到卡住的 Windows 更新。

QA release-check lanes 是建議性的。僅 QA 的失敗會被回報為警告，
且不會阻擋 release-check 驗證器；當您需要新的 QA 證據時，請重新執行
`rerun_group=qa`、`qa-parity` 或 `qa-live`。

## 需要保留的證據

保留 `Full Release Validation` 摘要作為發布層級的索引。它連結了子執行 id
並包含最慢工作表格。若發生失敗，請先檢查子工作流程，然後重新執行上方
符合的最小控制碼。

有用的產出檔案：

- 來自 Full Release Validation 父項的 `release-package-under-test` 和 `OpenClaw Release Checks`
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
