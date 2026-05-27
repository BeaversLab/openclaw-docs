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

Package Acceptance 通常會根據解析出的 `ref` 建構候選 tarball，包括透過 `pnpm ci:full-release` 分派的全 SHA 執行。在 beta 發佈後，請傳入 `release_package_spec=openclaw@YYYY.M.D-beta.N` 以在 release 檢查、Package Acceptance、跨作業系統、release-path Docker 和 package Telegram 之間重複使用已發佈的 npm 套件。僅當 Package Acceptance 應刻意驗證不同的套件時，才使用 `package_acceptance_package_spec`。Codex 外掛程式即時套件通道遵循相同的狀態：已發佈的 `release_package_spec` 值推導出 `codex_plugin_spec=npm:@openclaw/codex@<version>`；SHA/成品執行會從選取的 ref 打包 `extensions/codex`；操作員可以直接設定 `codex_plugin_spec` 用於 `npm:`、`npm-pack:` 或 `git:` 外掛程式來源。該通道會授予該外掛程式所需的明確 Codex CLI 安裝核准，然後執行 Codex CLI 預檢及同工作階段的 OpenAI agent 輪次。

## 頂層階段

| 階段             | 詳細資訊                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 目標解析         | **Job:** `Resolve target ref`<br />**Child workflow:** 無<br />**Proves:** 解析 release 分支、標籤或完整 commit SHA，並記錄選取的輸入。<br />**Rerun:** 如果失敗，請重新執行 umbrella。                                                                                                                                                                                                                                   |
| Vitest 和一般 CI | **Job:** `Run normal full CI`<br />**Child workflow:** `CI`<br />**Proves:** 針對目標 ref 進行的手動完整 CI 圖譜，包括 Linux Node 通道、捆綁的外掛程式分片、外掛程式與通道合約分片、Node 22 相容性、`check-*`、`check-additional-*`、已建構成品的煙霧測試、文件檢查、Python 技能、Windows、macOS、Control UI i18n，以及透過 umbrella 執行的 Android。<br />**Rerun:** `rerun_group=ci`。                                  |
| 插件發行前版本   | **Job:** `Run plugin prerelease validation`<br />**Child workflow:** `Plugin Prerelease`<br />**Proves:** 僅限 release 的外掛程式靜態檢查、agentic 外掛程式覆蓋率、完整擴充功能批次分片、外掛程式發佈前 Docker 通道，以及用於相容性分類的非阻塞性 `plugin-inspector-advisory` 成品。<br />**Rerun:** `rerun_group=plugin-prerelease`。                                                                                    |
| 發行檢查         | **工作：** `Run release/live/Docker/QA validation`<br />**子工作流程：** `OpenClaw Release Checks`<br />**證明：** 安裝冒煙測試、跨作業系統套件檢查、套件驗收、QA Lab 一致性、即時 Matrix 和即時 Telegram。當使用 `run_release_soak=true` 或 `release_profile=full` 時，也會執行完整的即時/E2E 測試套件和 Docker 發行路徑區塊。<br />**重新執行：** `rerun_group=release-checks` 或更窄的 release-checks 處理程序。       |
| 套件構件         | **工作：** `Prepare release package artifact`<br />**子工作流程：** 無<br />**證明：** 及早建立父級 `release-package-under-test` tarball，以便不需要等待 `OpenClaw Release Checks` 的面向套件檢查使用。<br />**重新執行：** 重新執行總管或為已發佈套件的重新執行提供 `release_package_spec`。                                                                                                                             |
| 套件 Telegram    | **工作：** `Run package Telegram E2E`<br />**子工作流程：** `NPM Telegram Beta E2E`<br />**證明：** 針對使用 `release_profile=full` 的 `rerun_group=all` 提供基於父級成果的 Telegram 套件證明，或在設定 `release_package_spec` 或 `npm_telegram_package_spec` 時提供基於已發佈套件的 Telegram 證明。<br />**重新執行：** 使用 `release_package_spec` 或 `npm_telegram_package_spec` 重新執行 `rerun_group=npm-telegram`。 |
| 總管驗證器       | **工作：** `Verify full validation`<br />**子工作流程：** 無<br />**證明：** 重新檢查記錄的子執行結論，並附加來自子工作流程的最慢工作表。<br />**重新執行：** 在重新執行失敗的子項至通過狀態後，僅重新執行此工作。                                                                                                                                                                                                        |

對於 `ref=main` 和 `rerun_group=all`，較新的總管會取代較舊的總管。
當父項被取消時，其監視器會取消任何它已經分派的子工作流程。發行分支和標記驗證執行預設不會互相取消。

## 發行檢查階段

`OpenClaw Release Checks` 是最大的子工作流程。它會解析目標一次，並在面向套件或 Docker 的階段需要時，準備共用的 `release-package-under-test` 成果。

| 階段                | 詳細資料                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 發行目標            | **Job:** `Resolve target ref`<br />**Backing workflow:** 無<br />**Tests:** 已選取的 ref、可選的預期 SHA、設定檔 (profile)、重新執行群組以及專注的即時套件篩選器。<br />**Rerun:** `rerun_group=release-checks`。                                                                                                                                                                                                                                         |
| 套件構件            | **Job:** `Prepare release package artifact`<br />**Backing workflow:** 無<br />**Tests:** 封裝或解析一個候選 tarball 並上傳 `release-package-under-test` 以供下游面向套件的檢查使用。<br />**Rerun:** 受影響的套件、跨作業系統 (cross-OS) 或即時/E2E 群組。                                                                                                                                                                                               |
| 安裝冒煙測試        | **Job:** `Run install smoke`<br />**Backing workflow:** `Install Smoke`<br />**Tests:** 完整安裝路徑，包含重用根 Dockerfile 煙霧測試映像、QR 套件安裝、根層級與閘道 Docker 煙霧測試、安裝程式 Docker 測試、Bun 全域安裝映像提供者煙霧測試，以及快速內建外掛程式安裝/解除安裝 E2E。<br />**Rerun:** `rerun_group=install-smoke`。                                                                                                                          |
| 跨作業系統          | **Job:** `cross_os_release_checks`<br />**Backing workflow:** `OpenClaw Cross-OS Release Checks (Reusable)`<br />**Tests:** 針對所選提供者與模式，在 Linux、Windows 和 macOS 上進行全新安裝與升級路徑測試，使用候選 tarball 加上基準套件。<br />**Rerun:** `rerun_group=cross-os`。                                                                                                                                                                       |
| Repo 和即時 E2E     | **Job:** `Run repo/live E2E validation`<br />**Backing workflow:** `OpenClaw Live And E2E Checks (Reusable)`<br />**Tests:** 儲存庫 E2E、即時快取、OpenAI WebSocket 串流、原生即時提供者和外掛程式分片，以及由 `release_profile` 選取的 Docker 支援即時模型/後端/閘道測試工具。<br />**Runs:** `run_release_soak=true`、`release_profile=full` 或專注的 `rerun_group=live-e2e`。<br />**Rerun:** `rerun_group=live-e2e`，可選擇搭配 `live_suite_filter`。 |
| Docker release path | **Job:** `Run Docker release-path validation`<br />**Backing workflow:** `OpenClaw Live And E2E Checks (Reusable)`<br />**Tests:** 針對共用套件產物執行發行路徑 Docker 區塊。<br />**Runs:** `run_release_soak=true`、`release_profile=full` 或專注的 `rerun_group=live-e2e`。<br />**Rerun:** `rerun_group=live-e2e`。                                                                                                                                   |
| Package Acceptance  | **Job:** `Run package acceptance`<br />**Backing workflow:** `Package Acceptance`<br />**Tests:** 離線插件套件 fixtures、插件更新、模擬 OpenAI Telegram 套件驗收，以及針對相同 tarball 的發布升級存活檢查。阻塞性發布檢查使用預設的最新發布基線；浸泡檢查擴展到 `2026.4.23` 之後的每個穩定 npm 發行版以及回報問題的 fixtures。<br />**Rerun:** `rerun_group=package`。                                                                                    |
| QA parity           | **Job:** `Run QA Lab parity lane` 和 `Run QA Lab parity report`<br />**Backing workflow:** direct jobs<br />**Tests:** 候選版本與基線代理同義打包，然後是同義報告。<br />**Rerun:** `rerun_group=qa-parity` 或 `rerun_group=qa`。                                                                                                                                                                                                                         |
| QA live Matrix      | **Job:** `Run QA Lab live Matrix lane`<br />**Backing workflow:** direct job<br />**Tests:** `qa-live-shared` 環境中的快速即時 Matrix QA 配置文件。<br />**Rerun:** `rerun_group=qa-live` 或 `rerun_group=qa`。                                                                                                                                                                                                                                           |
| QA live Telegram    | **Job:** `Run QA Lab live Telegram lane`<br />**Backing workflow:** direct job<br />**Tests:** 使用 Convex CI 憑證租約的即時 Telegram QA。<br />**Rerun:** `rerun_group=qa-live` 或 `rerun_group=qa`。                                                                                                                                                                                                                                                    |
| 版本驗證器          | **Job:** `Verify release checks`<br />**Backing workflow:** none<br />**Tests:** 所選重新執行群組所需的發布檢查作業。<br />**Rerun:** 等待焦點子作業通過後重新執行。                                                                                                                                                                                                                                                                                      |

## Docker 發布路徑區塊

當 `live_suite_filter` 為空時，Docker 發布路徑階段會執行這些區塊：

| 區塊                                                       | 覆蓋範圍                                                                                       |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `core`                                                     | 核心 Docker 發布路徑 smoke lanes。                                                             |
| `package-update-openai`                                    | OpenAI 套件安裝/更新行為、Codex 按需安裝、Codex 插件即時輪替，以及 Chat Completions 工具呼叫。 |
| `package-update-anthropic`                                 | Anthropic 套件安裝和更新行為。                                                                 |
| `package-update-core`                                      | 提供者中立的套件和更新行為。                                                                   |
| `plugins-runtime-plugins`                                  | 執行插件行為的插件執行時 lanes。                                                               |
| `plugins-runtime-services`                                 | 服務支援和即時插件執行時 lanes；視情況包含 OpenWebUI。                                         |
| `plugins-runtime-install-a` 到 `plugins-runtime-install-h` | 為並行版本驗證分割的插件安裝/執行時批次。                                                      |

當只有一個 Docker 通道失敗時，在可重複使用的即時/E2E 工作流程上使用目標 `docker_lanes=<lane[,lane]>`。發布產物包含每通道重新執行命令，並在可用時包含套件產物和映像檔重複使用輸入。

## 版本設定檔

`release_profile` 主要控制發行檢查中的 live/provider 範圍。它不會移除正常的完整 CI、Plugin Prerelease、安裝冒煙測試、套件驗收或 QA Lab。對於 `stable`，完整的 repo/live E2E 和 Docker release-path 區塊屬於浸入測試 覆蓋範圍，並在 `run_release_soak=true` 時執行。`full` 會強制開啟浸入測試覆蓋範圍，並且在 `rerun_group=all` 時讓總管工作流程針對父發行套件成品執行套件 Telegram E2E，這樣完整的發行前候選版本才不會在不知情的情況下跳過該 Telegram 套件通道。

| 設定檔    | 預期用途                 | 包含的即時/提供者覆蓋範圍                                                                                                                                                 |
| --------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minimum` | 最快的發布關鍵冒煙測試。 | OpenAI/core 即時路徑、OpenAI 的 Docker 即時模型、原生閘道核心、原生 OpenAI 閘道設定檔、原生 OpenAI 外掛程式，以及 Docker 即時閘道 OpenAI。                                |
| `stable`  | 預設發布核准設定檔。     | `minimum` 加上 Anthropic 冒煙測試、Google、MiniMax、後端、原生 live 測試框架、Docker live CLI 後端、Docker ACP bind、Docker Codex 框架以及一個 OpenCode Go 冒煙測試分片。 |
| `full`    | 廣泛諮詢掃描。           | `stable` 加上 advisory providers、plugin live 分片和 media live 分片。                                                                                                    |

## 僅完整版本新增項目

這些測試套件會被 `stable` 跳過，並被 `full` 包含：

| 區域                 | 僅完整版本覆蓋範圍                                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Docker 即時模型      | OpenCode Go、OpenRouter、xAI、Z.ai 和 Fireworks。                                                                       |
| Docker 即時閘道      | 諮詢提供者分為 DeepSeek/Fireworks、OpenCode Go/OpenRouter 和 xAI/Z.ai 分片。                                            |
| 原生閘道提供者設定檔 | 完整的 Anthropic Opus 和 Sonnet/Haiku 分片、Fireworks、DeepSeek、完整的 OpenCode Go 模型分片、OpenRouter、xAI 和 Z.ai。 |
| 原生外掛程式即時分片 | 外掛程式 A-K、L-N、O-Z 其他、Moonshot 和 xAI。                                                                          |
| 原生媒體即時分片     | 音訊、Google 音樂、MiniMax 音樂和視訊群組 A-D。                                                                         |

`stable` 包含 `native-live-src-gateway-profiles-anthropic-smoke` 和
`native-live-src-gateway-profiles-opencode-go-smoke`；`full` 則改用更廣泛的
Anthropic 和 OpenCode Go 模型分片。專注的重新執行仍可使用
彙總的 `native-live-src-gateway-profiles-anthropic` 或
`native-live-src-gateway-profiles-opencode-go` 處理程序。

## 專注重跑

使用 `rerun_group` 以避免重複執行無關的發行任務方塊：

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

當其中一個 live suite 失敗時，使用 `live_suite_filter` 搭配 `rerun_group=live-e2e`。
有效的 filter id 定義在可重複使用的 live/E2E workflow 中，包括
`docker-live-models`、`live-gateway-docker`、
`live-gateway-anthropic-docker`、`live-gateway-google-docker`、
`live-gateway-minimax-docker`、`live-gateway-advisory-docker`、
`live-cli-backend-docker`、`live-acp-bind-docker` 和
`live-codex-harness-docker`。

`live-gateway-advisory-docker` handle 是針對其三個 provider shards 的彙總重新執行 handle，因此它仍然會分發到所有 advisory Docker gateway jobs。

當其中一個 cross-OS lane 失敗時，使用 `cross_os_suite_filter` 搭配 `rerun_group=cross-os`。此 filter 接受 OS id、suite id 或 OS/suite 組合，
例如 `windows/packaged-upgrade`、`windows` 或 `packaged-fresh`。Cross-OS
摘要包含打包升級 lanes 的各階段時間，而長時間執行的指令會印出 heartbeat lines，
因此在作業逾時前可以看到卡住的 Windows 更新。

QA release-check lanes 屬於 advisory，但標準 runtime tool coverage gate 除外。標準層級中所需的 OpenClaw dynamic tool drift 會阻擋 release-check verifier；其他僅限 QA 的失敗會回報為警告。當您需要新的 QA 證據時，請重新執行
`rerun_group=qa`、`qa-parity` 或 `qa-live`。

## 需要保留的證據

將 `Full Release Validation` 摘要保留為發布層級的索引。它會連結子執行 ID 並包含最慢作業表格。若發生失敗，請先檢查子工作流程，然後重新執行上述符合條件的最小 handle。

有用的產出檔案：

- 來自 Full Release Validation 父項的 `release-package-under-test` 和 `OpenClaw Release Checks`
- `.artifacts/docker-tests/` 下的 Docker release-path 構件
- Package Acceptance `package-under-test` 和 Docker acceptance 構件
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
