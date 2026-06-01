---
summary: "Release lanes, operator checklist, validation boxes, version naming, and cadence"
title: "Release policy"
read_when:
  - Looking for public release channel definitions
  - Running release validation or package acceptance
  - Looking for version naming and cadence
---

OpenClaw 有三個公開發佈通道：

- stable：預設發佈至 npm `beta` 的標記發行版，或在明確要求時發佈至 npm `latest`
- beta：發佈至 npm `beta` 的先行版標記
- dev：`main` 的移動頂端

## 版本命名

- 穩定版發行版本：`YYYY.M.D`
  - Git 標籤：`vYYYY.M.D`
- 穩定版修正發行版本：`YYYY.M.D-N`
  - Git 標籤：`vYYYY.M.D-N`
- Beta 先行版版本：`YYYY.M.D-beta.N`
  - Git 標籤：`vYYYY.M.D-beta.N`
- 請勿將月份或日期補零
- `latest` 表示目前推廣的穩定版 npm 發行版
- `beta` 表示目前的 beta 安裝目標
- 穩定版和穩定版修正發行版預設發佈至 npm `beta`；發行操作員可以明確指定 `latest`，或稍後推廣已審核的 beta 構建
- 每個穩定版 OpenClaw 發佈同時發佈 npm 套件和 macOS 應用程式；
  beta 發佈通常先驗證並發佈 npm/套件路徑，除非有明確要求，
  否則 mac 應用程式的建置/簽署/公證僅保留給穩定版使用

## 發佈頻率

- 發佈流程優先進行 beta
- 僅在最新的 beta 版本通過驗證後才發佈穩定版
- 維護者通常從基於當前 `main` 建立的 `release/YYYY.M.D` 分支切出發行版，因此發行驗證和修復不會阻礙 `main` 上的新開發
- 如果 beta 標籤已推送或發佈且需要修復，維護者應切出下一個 `-beta.N` 標籤，而不是刪除或重新建立舊的 beta 標籤
- 詳細的發佈程序、批准、憑證和恢復說明僅供維護者使用

## 發佈操作員檢查清單

此檢查清單是發布流程的公開形式。私人憑證、簽署、公證、dist-tag 恢復以及緊急回滾詳細資訊保留在僅維護者可見的發展手冊中。

1. 從當前 `main` 開始：拉取最新內容，確認目標提交已推送，並確認當前 `main` CI 狀態足夠綠燈以從其建立分支。
2. 根據合併的 PR 以及自上次可達到的發布標籤以來的所有直接提交，產生頂部的 `CHANGELOG.md` 區塊。保持條目為面向使用者，重複合併的 PR/直接提交條目去重，提交重寫，推送它，並在分支前再次 rebase/pull。
3. 審閱 `src/plugins/compat/registry.ts` 和
   `src/commands/doctor/shared/deprecation-compat.ts` 中的發布相容性記錄。僅在升級路徑仍被涵蓋時移除過期的相容性，或記錄為何有意保留它。
4. 從目前的 `main` 建立 `release/YYYY.M.D`；請勿直接在 `main` 上進行正常的發布工作。
5. 為預定標籤提升每個所需的版本位置，然後執行 `pnpm release:prep`。它會以正確順序重新整理外掛程式版本、外掛程式清單、配置 schema、捆綁頻道配置元資料、配置文件基準、外掛程式 SDK 匯出以及外掛程式 SDK API 基準。在打標籤之前提交任何產生的 drift。然後執行本機確定性 preflight：
   `pnpm check:test-types`、`pnpm check:architecture`、
   `pnpm build && pnpm ui:build` 和 `pnpm release:check`。
6. 使用 `preflight_only=true` 執行 `OpenClaw NPM Release`。在標籤存在之前，
   允許使用完整的 40 字元發布分支 SHA 進行僅驗證用的 preflight。Preflight 會為確切的簽出相依性圖產生相依性發布證據，並將其儲存在 npm preflight 構件中。儲存成功的 `preflight_run_id`。
7. 使用 `Full Release Validation` 對發布分支、標籤或完整提交 SHA 啟動所有發布前測試。這是四個大型發布測試區塊的單一人工進入點：Vitest、Docker、QA Lab 和 Package。
8. 如果驗證失敗，請在發布分支上修復，並重新執行能證明修復的最小失敗檔案、通道、工作流程作業、套件設定檔、提供者或模型允許清單。僅在變更的範圍使先前的證據失效時，才重新執行完整的整體測試。
9. 對於 beta 版本，打標籤 `vYYYY.M.D-beta.N`，然後在 `vYYYY.M.D-beta.N` from the matching `release/YYYY.M.D` 分支上執行 `pnpm release:candidate -- --tag`。此輔助工具會
   執行本機產生的版本檢查、派發或驗證完整的版本驗證和 npm preflight 證據、執行 Parallels 和 Telegram 套件
   驗證、記錄 plugin npm 和 ClawHub 計劃，並且僅在證據包
   為綠色時才印出確切的
   `OpenClaw Release Publish` 指令。
   `OpenClaw Release Publish` 會將選定的或所有可發布的 plugin
   套件並行派發至 npm 以及相同的一組至 ClawHub，然後在 plugin npm 發布成功後，儘快使用匹配的 dist-tag 推廣
   準備好的 OpenClaw npm preflight 成品。
   當 OpenClaw npm 發布子任務成功後，它會從完整匹配的
   `CHANGELOG.md` 區段建立或更新
   對應的 GitHub release/prerelease 頁面。發布至 npm `latest` 的穩定版本
   會成為 GitHub 最新版本；維持在 npm `beta` 的穩定維護版本
   則會使用 GitHub `latest=false` 建立。此工作流程也會將 preflight
   依賴證據作為
   `openclaw-<version>-dependency-evidence.zip` 上傳至 GitHub 發布版，
   以供發布後事故
   回應使用。發布工作流程會立即列印子執行 ID，自動批准
   工作流程 Token 有權批准的版本環境閘道，摘要
   失敗的子工作及其日誌尾部，在 OpenClaw npm 發布成功後立即結案 GitHub 發布版和依賴
   證據，當發布 OpenClaw npm 時會等待 ClawHub，然後執行 `pnpm release:verify-beta` 並
   上傳 GitHub 發布版、npm 套件、選定的
   plugin npm 套件、選定的 ClawHub 套件、子工作流程執行 ID，以及
   可選的 NPM Telegram 執行 ID 的 postpublish 證據。ClawHub 路徑會重試暫時性 CLI
   依賴安裝失敗，即使其中一個 preview 格發生錯誤仍會發布通過預覽的 plugins，並且對每個預期的
   plugin 版本進行登錄驗證，以便部分發布保持可見且可重試。然後對已發布的
   `openclaw@YYYY.M.D-beta.N` 或
   `openclaw@beta` 套件執行發布後
   套件驗收。如果推送或發布的 prerelease 需要修復，
   則建立下一個匹配的 prerelease 版本號；請勿刪除或改寫舊的
   prerelease。
10. 對於穩定版，僅在經過審核的 Beta 版或候選發行版具備所需驗證證據後繼續。穩定版 npm 發佈也會通過 `OpenClaw Release Publish`，並透過 `preflight_run_id` 重複使用成功的事前檢查構件；穩定版 macOS 發行準備度還需要在 `main` 上具備打包好的 `.zip`、`.dmg`、`.dSYM.zip` 以及更新後的 `appcast.xml`。macOS 發佈工作流程會在發行資產驗證後自動將簽署的 appcast 發佈到公開的 `main`；如果分支保護阻止直接推送，它會開啟或更新 appcast PR。
11. 發佈後，執行 npm 發佈後驗證器，當您需要發佈後頻道證明時
    執行可選的獨立 published-npm Telegram E2E，視需要執行 dist-tag 推廣，驗證
    生成的 GitHub 發行頁面，並執行發佈公告步驟。

## 發布飛行前檢查

- 在發行事前檢查之前執行 `pnpm check:test-types`，以便測試 TypeScript 在更快的本地 `pnpm check` 閘道之外保持被覆蓋
- 在發行事前檢查之前執行 `pnpm check:architecture`，以便更廣泛的匯入週期和架構邊界檢查在更快的本地閘道之外通過
- 在 `pnpm release:check` 之前執行 `pnpm build && pnpm ui:build`，以便預期的 `dist/*` 發行構件和 Control UI 套件組合存在於套件驗證步驟中
- 在根版本更新之後和打標籤之前執行 `pnpm release:prep`。它會執行每個通常在版本/設定/API 變更後發生漂移的決定性發行產生器：外掛程式版本、外掛程式清單、基本設定架構、打包通道設定中繼資料、設定文件基準、外掛程式 SDK 匯出以及外掛程式 SDK API 基準。`pnpm release:check` 會以檢查模式重新執行這些守衛，並在執行套件發行檢查之前，一次報告它找到的所有產生漂移失敗。
- 外掛程式版本同步預設會將正式的外掛程式套件版本和現有的 `openclaw.compat.pluginApi` 下限更新為 OpenClaw 發行版本。將該欄位視為外掛程式 SDK/執行時 API 下限，而不僅僅是套件版本的副本：對於有意保持與較舊 OpenClaw 主機相容的僅外掛程式發行版本，請將下限保持在受支援的最舊主機 API，並在外掛程式發行證明中記錄該選擇。
- 在發布批准之前執行手動 `Full Release Validation` 工作流程，以便從單一入口點啟動所有發布前測試箱。它接受分支、標籤或完整的提交 SHA，派發手動 `CI`，並針對安裝冒煙測試、套件驗收、跨作業系統套件檢查、QA Lab 一致性、Matrix 和 Telegram 通道派發 `OpenClaw Release Checks`。穩定/預設執行會將詳盡的即時/E2E 和 Docker 發布路徑 soak 測試保留在 `run_release_soak=true` 之後；`release_profile=full` 會強制開啟 soak 測試。當同時使用 `release_profile=full` 和 `rerun_group=all` 時，它還會對發布檢查中的 `release-package-under-test` 構件執行套件 Telegram E2E。在發布 beta 版本後提供 `release_package_spec`，以便在發布檢查、套件驗收和套件 Telegram E2E 中重複使用已發布的 npm 套件，而無需重建發布 tarball。僅當 Telegram 應使用與其餘發布驗證不同的已發布套件時，才提供 `npm_telegram_package_spec`。當套件驗收應使用與發布套件規格不同的已發布套件時，提供 `package_acceptance_package_spec`。當發布證據報告應證明驗證與已發布的 npm 套件相符而不強制執行 Telegram E2E 時，提供 `evidence_package_spec`。範例：
  `gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D`
- 當您希望在發布工作持續進行時獲得套件候選版本的旁道驗證，請執行手動 `Package Acceptance` 工作流程。使用 `source=npm` 搭配 `openclaw@beta`、`openclaw@latest` 或確切的發布版本；使用 `source=ref` 以目前的 `workflow_ref` 測試框架打包受信任的 `package_ref` 分支/標籤/SHA；使用 `source=url` 搭配需要 SHA-256 及嚴格公開 URL 原則的公開 HTTPS tarball；使用 `source=trusted-url` 搭配使用所需 `trusted_source_id` 和 SHA-256 的具名受信任來源原則；或使用 `source=artifact` 搭配由另一個 GitHub Actions 執行上傳的 tarball。此工作流程會將候選版本解析為 `package-under-test`，針對該 tarball 重用 Docker E2E 發布排程器，並可使用 `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier` 對同一 tarball 執行 Telegram QA。當選取的 Docker 通道包含 `published-upgrade-survivor` 時，套件構件即為候選版本，而 `published_upgrade_survivor_baseline` 會選取已發布的基準。`update-restart-auth` 會將候選套件同時作為已安裝的 CLI 和受測套件，因此它會執行候選更新指令的受控重新啟動路徑。
  範例：`gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f published_upgrade_survivor_baseline=openclaw@2026.4.26 -f telegram_mode=mock-openai`
  常用設定檔：
  - `smoke`：install/channel/agent、gateway network 與 config reload 通道
  - `package`：不含 OpenWebUI 或即時 ClawHub 的 artifact-native package/update/restart/plugin 通道
  - `product`：套件設定檔加上 MCP 通道、cron/subagent 清理、OpenAI web search 與 OpenWebUI
  - `full`：含 OpenWebUI 的 Docker 發布路徑區塊
  - `custom`：針對專注重新執行的確切 `docker_lanes` 選取
- 當您只需要釋放候選版本的完整正常 CI 涵蓋範圍時，直接執行手動 `CI` 工作流程。手動 CI 排程會略過變更範圍設定，並強制執行 Linux Node 分片、bundled-plugin 分片、plugin 和 channel contract 分片、Node 22 相容性、`check-*`、`check-additional-*`、建置成品冒煙測試、文件檢查、Python 技能、Windows、macOS、Android 和 Control UI i18n 通道。
  範例：`gh workflow run ci.yml --ref release/YYYY.M.D`
- 驗證釋放遙測時，請執行 `pnpm qa:otel:smoke`。它會透過本機 OTLP/HTTP 接收器來執行 QA-lab，並驗證追蹤、指標和日誌匯出，以及有界追蹤屬性和內容/識別碼編輯，而不需要 Opik、Langfuse 或其他外部收集器。
- 驗證收集器相容性時，請執行 `pnpm qa:otel:collector-smoke`。它會在本地接收器斷言之前，將相同的 QA-lab OTLP 匯出透過真實的 OpenTelemetry Collector Docker 容器進行路由。
- 驗證受保護的 Prometheus 抓取時，請執行 `pnpm qa:prometheus:smoke`。它會執行 QA-lab，拒絕未經驗證的抓取，並驗證釋放關鍵指標系列不包含提示內容、原始識別碼、驗證權杖和本地路徑。
- 當您想要連續執行原始碼檢出的 OpenTelemetry 和 Prometheus 冒煙通道時，請執行 `pnpm qa:observability:smoke`。
- 在每次標記釋放之前執行 `pnpm release:check`
- `OpenClaw NPM Release` preflight 會在打包 npm tarball 之前產生相依性釋放證據。npm 諮詢漏洞閘門會阻擋釋放。傳遞清單風險、相依性擁有權/安裝介面和相依性變更報告僅作為釋放證據。相依性變更報告會比較釋放候選版本與先前的可連線釋放標籤。
- preflight 會將相依性證據上傳為 `openclaw-release-dependency-evidence-<tag>`，並將其嵌入準備好的 npm preflight 成品內的 `dependency-evidence/` 下。真實的發布路徑會重用該 preflight 成品，然後將相同的證據作為 `openclaw-<version>-dependency-evidence.zip` 附加到 GitHub 釋放版本。
- 在標籤存在之後，針對變更發佈序列執行 `OpenClaw Release Publish`。從 `release/YYYY.M.D` 調度它（或在發佈可從 main 抵達的標籤時使用 `main`），傳入發佈標籤和成功的 OpenClaw npm `preflight_run_id`，並保留預設的外掛發佈範圍 `all-publishable`，除非您刻意執行專注的修復。該工作流程會序列化外掛 npm 發佈、外掛 ClawHub 發佈和 OpenClaw npm 發佈，因此核心套件不會在其外部化外掛之前發佈。
- 發佈檢查現今在獨立的手動工作流程中執行：
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` 也會在發佈核准前執行 QA Lab 模擬對等通道，以及快速即時 Matrix 設定檔和 Telegram QA 通道。即時通道使用 `qa-live-shared` 環境；Telegram 也使用 Convex CI 憑證租約。當您需要完整的 Matrix 傳輸、媒體和 E2EE 盤點並行時，請使用 `matrix_profile=all` 和 `matrix_shards=true` 執行手動 `QA-Lab - All Lanes` 工作流程。
- 跨作業系統安裝和升級執行時期驗證是公用 `OpenClaw Release Checks` 和 `Full Release Validation` 的一部分，它們會直接呼叫
  可重複使用的工作流程
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- 此拆分是有意為之的：保持真實的 npm 發佈路徑簡短、具確定性且著重於構件，而較慢的即時檢查則保留在自己的通道中，以免延遲或阻擋發佈
- 包含密碼的發佈檢查應透過 `Full Release
Validation` or from the `main`/release 工作流程參考進行調度，以確保工作流程邏輯和密碼受到控管
- 只要解析出的提交可從 OpenClaw 分支或發佈標籤抵達，`OpenClaw Release Checks` 即接受分支、標籤或完整的提交 SHA
- `OpenClaw NPM Release` 僅驗證的預檢也接受目前完整的 40 字元工作流程分支提交 SHA，而不需要已推送的標籤
- 該 SHA 路徑僅供驗證，無法升級為真實發佈
- 在 SHA 模式下，工作流僅針對套件元資料檢查合成 `v<package.json version>`；真正的發布仍然需要真正的發布標籤
- 這兩個工作流都將真正的發布和推廣路徑保留在 GitHub 託管的執行器上，而非變異驗證路徑則可以使用更大的 Blacksmith Linux 執行器
- 該工作流使用 `OPENAI_API_KEY` 和 `ANTHROPIC_API_KEY` 工作流密鑰來執行
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
- npm 發布預檢不再等待獨立的發布檢查通道
- 在本地標記發布候選版本之前，請執行
  `RELEASE_TAG=vYYYY.M.D-beta.N pnpm release:fast-pretag-check`。此輔助工具會按照在 GitHub 發布工作流啟動前攔截常見審核阻擋錯誤的順序，執行快速發布防護機制、外掛 npm/ClawHub 發布檢查、建置、UI 建置以及 `release:openclaw:npm:check`。
- 在審核之前執行 `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  （或對應的 beta/correction 標籤）
- 在 npm 發布後，執行
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  （或對應的 beta/correction 版本），以在全新的臨時字首中驗證已發布的註冊表安裝路徑
- 在 beta 發布後，執行 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`
  以使用共用的租用 Telegram 憑證池，針對已發布的 npm 套件驗證已安裝套件的入門指南、Telegram 設定以及真實的 Telegram E2E。本機維護者的單次操作可以省略 Convex 變數，並直接傳遞三個 `OPENCLAW_QA_TELEGRAM_*` 環境憑證。
- 若要從維護者機器執行完整的發布後 beta 冒煙測試，請使用 `pnpm release:beta-smoke -- --beta betaN`。此輔助工具會執行 Parallels npm 更新/全新目標驗證，觸發 `NPM Telegram Beta E2E`，輪詢確切的工作流執行，下載構件，並列印 Telegram 報告。
- 維護者可以透過手動 `NPM Telegram Beta E2E` 工作流從 GitHub Actions 執行相同的發布後檢查。它被特意設計為僅限手動，並不會在每次合併時執行。
- 維護者發布自動化現在使用預檢後推廣：
  - 真正的 npm 發布必須通過成功的 npm `preflight_run_id`
  - 真正的 npm 發布必須從與成功的預檢執行相同的 `main` 或
    `release/YYYY.M.D` 分支觸發
  - 穩定版 npm 發布預設為 `beta`
  - 穩定版 npm 發布可以透過 workflow 輸入明確指定目標為 `latest`
  - 基於 token 的 npm dist-tag 變更現在位於
    `openclaw/releases/.github/workflows/openclaw-npm-dist-tags.yml`，因為
    `npm dist-tag add` 仍然需要 `NPM_TOKEN`，而來源儲存庫保持
    僅使用 OIDC 發布
  - 公開 `macOS Release` 僅用於驗證；當標籤僅存在於
    發布分支但 workflow 是從 `main` 觸發時，請設定
    `public_release_branch=release/YYYY.M.D`
  - 真實的 macOS 發布必須通過成功的 macOS `preflight_run_id` 和
    `validate_run_id`
  - 真實的發布路徑會推廣準備好的成品，而不是重新建置
    它們
- 對於像 `YYYY.M.D-N` 這樣的穩定版修正發布，發布後驗證器
  也會檢查從 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同臨時前綴升級路徑，
  以便發布修正不會在
  基礎穩定版內容中無聲地留下較舊的全域安裝
- npm 發布預檢採用「失敗關閉」策略，除非 tarball 包含
  `dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 內容，
  以免我們再次發布空白的瀏覽器儀表板
- 發布後驗證也會檢查已發布的插件入口點和
  套件中繼資料是否存在於已安裝的註冊表佈局中。如果發布版本
  遺漏了插件執行期內容，將無法通過發布後驗證器，
  並且無法被推廣到 `latest`。
- `pnpm test:install:smoke` 也會對候選更新 tarball 執行 npm pack `unpackedSize` 預算限制，
  以便安裝程式 e2e 能在發布路徑之前
  攔截意外的打包膨脹
- 如果發布工作涉及 CI 規劃、擴充功能時期資訊清單或
  擴充功能測試矩陣，請在批准前從
  `.github/workflows/plugin-prerelease.yml` 重新生成並檢閱規劃器擁有的
  `plugin-prerelease-extension-shard` 矩陣輸出，
  以免發布說明描述過時的 CI 佈局
- 穩定版 macOS 發布的準備工作也包含更新程式介面：
  - GitHub 發布最終必須包含打包好的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - `appcast.xml` 上的 `main` 在發布後必須指向新的穩定版 zip 檔案；macOS 發布工作流程會自動提交它，或在無法直接推送時開啟 appcast PR
  - 打包好的應用程式必須保持非偵錯 bundle id、非空的 Sparkle feed URL，以及 `CFBundleVersion` 高於或等於該發行版本的標準 Sparkle 建置底線

## 發布測試環境

`Full Release Validation` 是操作員從單一入口點啟動所有發布前測試的方式。若要在快速變動的分支上進行固定提交驗證，請使用輔助工具，讓每個子工作流程都從鎖定於目標 SHA 的暫存分支執行：

```bash
pnpm ci:full-release --sha <full-sha>
```

輔助工具會推送 `release-ci/<sha>-...`，使用 `ref=<sha>` 從該分支觸發 `Full Release Validation`，驗證每個子工作流程的 `headSha` 都符合目標，然後刪除暫存分支。這可避免意外驗證較新的 `main` 子執行。

若要進行發布分支或標籤驗證，請從受信任的 `main` 工作流程 ref 執行，並將發布分支或標籤作為 `ref` 傳入：

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N
```

工作流解析目標 ref，使用 `target_ref=<release-ref>` 手動觸發 `CI`，觸發 `OpenClaw Release Checks`，準備面向套件檢查的父級 `release-package-under-test` 構件，並在設定 `release_profile=full` 搭配 `rerun_group=all` 或設定 `release_package_spec` 或 `npm_telegram_package_spec` 時觸發獨立套件 Telegram E2E。`OpenClaw Release Checks` 隨後會在啟用 soak 時展開安裝冒煙測試、跨 OS 發行檢查、即時/E2E Docker 發行路徑覆蓋率，以及包含 Telegram 套件 QA、QA Lab 對應性、即時 Matrix 和即時 Telegram 的套件驗收。只有在 `Full Release Validation` 摘要顯示 `normal_ci` 和 `release_checks` 成功時，完整執行才可被接受。在 full/all 模式下，`npm_telegram` 子工作也必須成功；在 full/all 模式之外則會跳過，除非提供了已發布的 `release_package_spec` 或 `npm_telegram_package_spec`。最終驗證器摘要包含每個子執行的最慢作業表格，因此發行經理無需下載日誌即可查看當前的關鍵路徑。請參閱 [完整發行驗證](/zh-Hant/reference/full-release-validation) 以了解完整的階段矩陣、確切的工作流程作業名稱、stable 與 full 設定檔的差異、構件以及專用的重新執行控制代碼。子工作流程是從執行 `Full Release Validation`, normally `--ref main`, even when the target `ref` 的受信任 ref 觸發的，該 ref 指向較舊的發行分支或標籤。沒有單獨的 Full Release Validation workflow-ref 輸入；透過選擇工作流程執行 ref 來選擇受信任的掛載裝置。請勿使用 `--ref main -f ref=<sha>` 作為移動 `main` 的確切提交證明；原始提交 SHA 無法作為工作流程觸發 ref，因此請使用 `pnpm ci:full-release --sha <sha>` 來建立固定的暫時分支。

使用 `release_profile` 來選擇即時/提供者廣度：

- `minimum`：最快的發行關鍵 OpenAI/核心即時與 Docker 路徑
- `stable`：最低限度的穩定提供者/後端覆蓋率，用於發布核准
- `full`：穩定加上廣泛的諮詢提供者/媒體覆蓋率

當阻礙發布的通道變為綠色，且您希望在推廣前進行徹底的即時/E2E、Docker 發布路徑和有限範圍的已發布升級倖存掃描時，請將 `run_release_soak=true` 與 `stable` 搭配使用。該掃描涵蓋最新的四個穩定版本套件，加上固定的 `2026.4.23` 和 `2026.5.2` 基準，以及較舊的 `2026.4.15` 覆蓋率，其中重複的基準已被移除，且每個基準被分割到自己的 Docker 執行器工作中。`full` 意味著 `run_release_soak=true`。

`OpenClaw Release Checks` 使用受信任的工作流程引用，將目標引用解析一次作為 `release-package-under-test`，並在浸泡運行時，於跨作業系統、套件驗收和發布路徑 Docker 檢查中重用該構件。這使所有面向套件的測試箱保持位元組一致，並避免重複構建套件。當 beta 版本已經在 npm 上時，設定 `release_package_spec=openclaw@YYYY.M.D-beta.N`，以便發布檢查下載已發布的套件一次，從 `dist/build-info.json` 提取其建置原始碼 SHA，並在跨作業系統、套件驗收、發布路徑 Docker 和套件 Telegram 通道中重用該構件。當設定了 repo/org 變數時，跨作業系統 OpenAI 安裝測試會使用 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否則使用 `openai/gpt-5.4`，因為此通道旨在驗證套件安裝、入職、閘道啟動和一次即時代理程式回合，而不是對最慢的預設模型進行基準測試。更廣泛的即時提供者矩陣仍然是特定模型覆蓋率的地方。

根據發布階段使用這些變體：

```bash
# Validate an unpublished release candidate branch.
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable

# Validate an exact pushed commit.
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=<40-char-sha> \
  -f provider=openai \
  -f mode=both

# After publishing a beta, add published-package Telegram E2E.
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=full \
  -f release_package_spec=openclaw@YYYY.M.D-beta.N \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N \
  -f npm_telegram_provider_mode=mock-openai
```

針對專注修復後的首次重新執行，請勿使用完整的 umbrealla。如果某個 box 失敗，請使用失敗的子工作流程、job、Docker lane、package profile、模型提供者或 QA lane 進行下一次驗證。僅當修復變更了共享的發布協調流程或導致先前的全 box 證據過期時，才再次執行完整的 umbrella。Umbrella 的最終驗證器會重新檢查記錄的子工作流程執行 ID，因此在子工作流程成功重新執行後，僅需重新執行失敗的 `Verify full validation` parent job。

對於有限範圍的修復，請將 `rerun_group` 傳遞給 umbrella。`all` 是真正的發布候選版本執行，`ci` 僅執行一般的 CI 子任務，`plugin-prerelease` 僅執行僅限發布的插件子任務，`release-checks` 執行每個發布 box，而較狹窄的發布群組為 `install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 和 `npm-telegram`。專注的 `npm-telegram` 重新執行需要 `release_package_spec` 或 `npm_telegram_package_spec`；具有 `release_profile=full` 的完整/全部執行會使用 release-checks package artifact。專注的跨作業系統重新執行可以新增 `cross_os_suite_filter=windows/packaged-upgrade` 或其他作業系統/套件篩選器。QA release-check 失敗僅供參考，但標準執行階段工具覆蓋率閘道除外；當所需的 OpenClaw 動態工具從標準層級摘要中偏移或消失時，該閘道會阻擋發布驗證。

### Vitest

Vitest box 是手動 `CI` 子工作流程。手動 CI 會刻意繞過變更範圍設定，並強制針對發布候選版本執行一般測試圖表：Linux Node 分片、打包插件分片、插件與通道合約分片、Node 22 相容性、`check-*`、`check-additional-*`、建構成果冒煙測試、文件檢查、Python 技能、Windows、macOS、Android 和 Control UI i18n。

使用此方塊來回答「來源樹是否通過了完整的正常測試套件？」
這與 release-path 產品驗證不同。要保留的證據：

- `Full Release Validation` 摘要，顯示已分派 `CI` 執行的 URL
- 在確切的目標 SHA 上 `CI` 執行通過
- 在調查回歸時，來自 CI 工作的失敗或緩慢的分片名稱
- 當執行需要效能分析時，Vitest 時間相關檔案，例如 `.artifacts/vitest-shard-timings.json`

僅當發布需要確定性的正常 CI 但不需要 Docker、QA Lab、live、cross-OS 或 package 方塊時，才直接執行手動 CI：

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

Docker 方塊存在於 `OpenClaw Release Checks` 到 `openclaw-live-and-e2e-checks-reusable.yml` 之間，加上 release-mode `install-smoke` 工作流程。它透過打包的 Docker 環境而不僅僅是原始碼層級的測試來驗證發布候選版本。

發布 Docker 涵蓋範圍包括：

- 完整安裝冒煙測試，並啟用緩慢的 Bun 全域安裝冒煙測試
- 依目標 SHA 準備/重複使用根 Dockerfile 冒煙測試映像，並使用 QR、root/gateway 和 installer/Bun 冒煙測試工作作為獨立的 install-smoke 分片執行
- 儲存庫 E2E 通道
- release-path Docker 區塊：`core`、`package-update-openai`、
  `package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、
  `plugins-runtime-services`、
  `plugins-runtime-install-a`、`plugins-runtime-install-b`、
  `plugins-runtime-install-c`、`plugins-runtime-install-d`、
  `plugins-runtime-install-e`、`plugins-runtime-install-f`、
  `plugins-runtime-install-g` 和 `plugins-runtime-install-h`
- 在請求時，`plugins-runtime-services` 區塊內的 OpenWebUI 涵蓋範圍
- 拆分的捆綁外掛程式安裝/解除安裝通道
  `bundled-plugin-install-uninstall-0` 到
  `bundled-plugin-install-uninstall-23`
- 當發布檢查包含 live 套件時的 live/E2E 提供者套件和 Docker live 模型涵蓋範圍

在重新執行之前使用 Docker 成果。release-path 排程器會上傳包含 lane 日誌、`summary.json`、`failures.json`、階段計時、排程器計畫 JSON 以及重新執行指令的 `.artifacts/docker-tests/`。為了進行專注的復原，請在可重複使用的 live/E2E 工作流程上使用 `docker_lanes=<lane[,lane]>`，而不是重新執行所有 release 區塊。生成的重新執行指令在可用時會包含先前的 `package_artifact_run_id` 和準備好的 Docker 映像檔輸入，因此失敗的 lane 可以重複使用相同的 tarball 和 GHCR 映像檔。

### QA Lab

QA Lab 盒子也是 `OpenClaw Release Checks` 的一部分。它是代理 行為和通道層級的 release 閘道，與 Vitest 和 Docker 打包機制分開。

Release QA Lab 涵蓋範圍包括：

- 使用代理 parity 套件將 OpenAI 候選 lane 與 Opus 4.6 基準進行比較的 mock parity lane
- 使用 `qa-live-shared` 環境的快速 live Matrix QA 設定檔
- 使用 Convex CI 憑證租約的 live Telegram QA lane
- 當 release 遙測需要明確的本機證明時，使用 `pnpm qa:otel:smoke`、`pnpm qa:otel:collector-smoke`、
  `pnpm qa:prometheus:smoke` 或
  `pnpm qa:observability:smoke`

使用此盒子來回答「release 在 QA 情境和 live channel 流程中是否運作正常？」。在批准 release 時，請保留 parity、Matrix 和 Telegram lane 的成果 URL。完整的 Matrix 涵蓋範圍仍可作為手動分片 QA-Lab 執行使用，而非預設的 release-critical lane。

### 套件

套件 盒子是可安裝產品的閘道。它由 `Package Acceptance` 和解析器 `scripts/resolve-openclaw-package-candidate.mjs` 支援。解析器會將候選版本正規化為 Docker E2E 所使用的 `package-under-test` tarball，驗證套件清單，記錄套件版本和 SHA-256，並將工作流程 harness ref 與套件來源 ref 分開保存。

支援的候選來源：

- `source=npm`：`openclaw@beta`、`openclaw@latest` 或精確的 OpenClaw release 版本
- `source=ref`：打包受信任的 `package_ref` 分支、標籤或完整提交 SHA，
  並搭配選定的 `workflow_ref` 套件
- `source=url`：下載具有所需 `package_sha256` 的公開 HTTPS `.tgz`；
  會拒絕 URL 憑證、非預設 HTTPS 連接埠、私有/內部/特殊用途
  主機名稱或解析位址，以及不安全的重新導向
- `source=trusted-url`：從 `.github/package-trusted-sources.json` 中的具名原則下載具有所需
  `package_sha256` 和 `trusted_source_id` 的 HTTPS `.tgz`；
  請將此用於維護者擁有的企業鏡像或私有軟體庫，而不是新增
  輸入層級的私有網路繞過至 `source=url`
- `source=artifact`：重複使用另一個 GitHub Actions 執行所上傳的 `.tgz`

`OpenClaw Release Checks` 使用準備好的發布套件產出檔 `source=artifact`、`suite_profile=custom`、
`docker_lanes=doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update`、
`telegram_mode=mock-openai` 執行套件驗收。套件驗收會針對同一個解析出的 tarball，保留遷移、更新、
配置式驗證更新重新啟動、即時 ClawHub 技能安裝、過時的外掛依賴清理、離線外掛
固定裝置、外掛更新以及 Telegram 套件 QA。阻塞性發布檢查使用預設的最新已發布套件
基準；`run_release_soak=true` 或
`release_profile=full` 會擴展為從 `2026.4.23` 到 `latest` 的每個穩定 npm 已發布基準，加上回報問題的固定裝置。若要針對已發布的候選版本，請搭配 `source=npm` 使用套件驗收；
若要在發布前針對 SHA 支援的本地 npm tarball，請使用 `source=ref`；
若要針對維護者擁有的企業/私有鏡像，請使用 `source=trusted-url`；
或是若要針對由另一個 GitHub Actions 執行上傳的準備好的 tarball，請使用 `source=artifact`。
這是 GitHub 原生的
替代方案，用以取代以往需要 Parallels 的大部分套件/更新涵蓋範圍。跨作業系統發布檢查對於 OS 特定的上手、
安裝程式和平台行為仍然重要，但套件/更新產品驗證應優先使用套件驗收。

更新與外掛驗證的正式檢查清單是
[測試更新與外掛](/zh-Hant/help/testing-updates-plugins)。在決定使用哪個本機、Docker、套件驗收或發布檢查通道來證明
外掛安裝/更新、doctor 清理或已發布套件遷移變更時，請使用此清單。
從每個穩定 `2026.4.23+` 套件進行的完整已發布更新遷移
是一個獨立的手動 `Update Migration` 工作流程，並非完整發布 CI 的一部分。

舊版套件接受的寬限期是刻意設定的時間限制。透過 `2026.4.25` 的套件可能會針對已發佈至 npm 的元數據缺口使用相容性路徑：壓縮檔中缺少的私有 QA 清單項目、缺少的 `gateway install --wrapper`、從壓縮檔衍生的 git 測試裝置中缺少的修補檔案、缺少的持久化 `update.channel`、舊版外掛程式安裝記錄位置、缺少的市集安裝記錄持久化，以及在 `plugins update` 期間的組態元數據遷移。已發佈的 `2026.4.26` 套件可能會針對已發運的本機建置元數據戳記檔案發出警告。後續的套件必須符合現代套件合約；這些相同的缺口將導致發佈驗證失敗。

當發佈問題關於實際的可安裝套件時，請使用更廣泛的套件接受設定檔：

```bash
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f published_upgrade_survivor_baseline=openclaw@2026.4.26
```

常見套件設定檔：

- `smoke`：快速套件安裝/通道/代理程式、閘道網路和組態重新載入通道
- `package`：安裝/更新/重新啟動/外掛程式套件合約，加上即時 ClawHub 技能安裝驗證；這是發佈檢查的預設值
- `product`：`package` 加上 MCP 通道、cron/子代理程式清理、OpenAI 網路搜尋和 OpenWebUI
- `full`：包含 OpenWebUI 的 Docker 發佈路徑區塊
- `custom`：用於專注重新執行的確切 `docker_lanes` 清單

針對套件候選版本的 Telegram 驗證，請在套件接受上啟用 `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier`。此工作流程會將解析的 `package-under-test` 壓縮檔傳遞至 Telegram 通道；獨立的 Telegram 工作流程仍接受已發佈的 npm 規格以進行發佈後檢查。

## 發佈自動化

`OpenClaw Release Publish` 是正常的變動性發佈進入點。它會按照發佈所需的順序協調受信任發行者工作流程：

1. 檢出發佈標籤並解析其提交 SHA。
2. 驗證標籤是否可從 `main` 或 `release/*` 抵達。
3. 執行 `pnpm plugins:sync:check`。
4. 使用 `publish_scope=all-publishable` 和
   `ref=<release-sha>` 觸發 `Plugin NPM Release`。
5. 使用相同的 scope 和 SHA 觸發 `Plugin ClawHub Release`。
6. 使用 release tag、npm dist-tag 和儲存的
   `preflight_run_id` 觸發 `OpenClaw NPM Release`。

Beta 發佈範例：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

穩定版發佈到預設的 beta dist-tag：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

直接推廣到 `latest` 的穩定版操作是明確的：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=latest
```

僅將較低層級的 `Plugin NPM Release` 和 `Plugin ClawHub Release` 工作流程用於特定的修復或重新發佈工作。當 `publish_openclaw_npm=true` 時，`OpenClaw Release Publish` 會拒絕 `plugin_publish_scope=selected`，因此核心套件若無法包含所有可發佈的官方外掛（包括 `@openclaw/diffs-language-pack`）將無法發佈。針對特定外掛的修復，請設定 `publish_openclaw_npm=false` 為 `plugin_publish_scope=selected` 和
`plugins=@openclaw/name`，或直接觸發子工作流程。

## NPM 工作流程輸入

`OpenClaw NPM Release` 接受這些操作員控制的輸入：

- `tag`：必需的發佈標籤，例如 `v2026.4.2`、`v2026.4.2-1` 或
  `v2026.4.2-beta.1`；當 `preflight_only=true` 時，它也可以是目前完整的 40 字元工作流程分支 commit SHA，用於僅驗證的 preflight
- `preflight_only`：`true` 表示僅用於驗證/建置/打包，`false` 表示用於
  真實的發佈流程
- `preflight_run_id`：在真實發佈流程中是必需的，以便工作流程重複使用
  來自成功 preflight 執行的準備好壓縮包
- `npm_dist_tag`：發佈流程的 npm 目標標籤；預設為 `beta`

`OpenClaw Release Publish` 接受這些操作員控制的輸入：

- `tag`：必需的發佈標籤；必須已經存在
- `preflight_run_id`：成功的 `OpenClaw NPM Release` preflight 執行 ID；
  當 `publish_openclaw_npm=true` 時為必需項
- `npm_dist_tag`：OpenClaw 套件的 npm 目標標籤
- `plugin_publish_scope`：預設為 `all-publishable`；僅在針對 `publish_openclaw_npm=false` 進行專注的外掛修復工作時使用 `selected`
- `plugins`：當 `plugin_publish_scope=selected` 時，以逗號分隔的 `@openclaw/*` 套件名稱
- `publish_openclaw_npm`：預設為 `true`；僅當將工作流程用作僅限外掛修復的協調器時，才設定 `false`
- `wait_for_clawhub`：預設為 `false`，因此 npm 的可用性不會被 ClawHub 側車阻擋；僅當工作流程完成必須包含 ClawHub 完成時，才設定 `true`

`OpenClaw Release Checks` 接受這些由操作員控制的輸入：

- `ref`：要驗證的分支、標籤或完整提交 SHA。承載密碼的檢查要求解析出的提交必須可從 OpenClaw 分支或發布標籤存取。
- `run_release_soak`：選擇在穩定/預設發布檢查中加入詳盡的 live/E2E、Docker 發布路徑，以及 all-since 升級存留 soak。這會被 `release_profile=full` 強制開啟。

規則：

- 穩定和修正標籤可以發布到 `beta` 或 `latest`
- Beta 預發布標籤只能發布到 `beta`
- 對於 `OpenClaw NPM Release`，僅當 `preflight_only=true` 時才允許輸入完整提交 SHA
- `OpenClaw Release Checks` 和 `Full Release Validation` 始終
  僅用於驗證
- 實際的發布路徑必須使用與準備階段期間相同的 `npm_dist_tag`；
  工作流程會在發布繼續之前驗證該元數據

## 穩定 npm 發布順序

當發布穩定 npm 版本時：

1. 使用 `preflight_only=true` 執行 `OpenClaw NPM Release`
   - 在標籤存在之前，您可以使用當前完整的工作流程分支提交
     SHA 進行準備工作流程的僅驗證試運
2. 選擇 `npm_dist_tag=beta` 以進行一般的 beta-first 流程，或者僅在您刻意想要直接發布穩定版時選擇 `latest`
3. 當您需要一般的 CI 以及即時提示快取、Docker、QA Lab、Matrix 和 Telegram 覆蓋率時，請在 release 分支、release tag 或完整的 commit SHA 上執行 `Full Release Validation`，透過一個手動工作流程完成
4. 如果您刻意只需要確定性的一般測試圖，請改在 release ref 上執行手動的 `CI` 工作流程
5. 儲存成功的 `preflight_run_id`
6. 使用相同的 `tag`、相同的 `npm_dist_tag` 以及儲存的 `preflight_run_id` 來執行 `OpenClaw Release Publish`；它會在推廣 OpenClaw npm 套件之前，將外掛程式發布到 npm 和 ClawHub
7. 如果發布版已推送至 `beta`，請使用 `openclaw/releases/.github/workflows/openclaw-npm-dist-tags.yml` 工作流程將該穩定版本從 `beta` 推廣至 `latest`
8. 如果該發布版刻意直接發布至 `latest` 且 `beta` 應立即跟隨相同的穩定建置，請使用相同的發布工作流程將兩個 dist-tags 指向該穩定版本，或者讓其排程的自我修復同步稍後移動 `beta`

dist-tag 的變更位於 release ledger repo 中，因為它仍然需要 `NPM_TOKEN`，而來源 repo 則維持僅限 OIDC 的發布。

這樣可以確保直接發布路徑和 beta-first 推廣路徑都有文件記載且對操作員可見。

如果維護者必須回退到本地 npm 認證，請僅在專用的 tmux session 中執行任何 1Password CLI (`op`) 指令。請勿直接從主要的 agent shell 呼叫 `op`；將其保留在 tmux 中可使提示、警報和 OTP 處理可被觀察，並防止重複的主機警報。

## 公開參考資料

- [`.github/workflows/full-release-validation.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/full-release-validation.yml)
- [`.github/workflows/package-acceptance.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/package-acceptance.yml)
- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`.github/workflows/openclaw-release-checks.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-release-checks.yml)
- [`.github/workflows/openclaw-cross-os-release-checks-reusable.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-cross-os-release-checks-reusable.yml)
- [`scripts/resolve-openclaw-package-candidate.mjs`](https://github.com/openclaw/openclaw/blob/main/scripts/resolve-openclaw-package-candidate.mjs)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

維護者使用
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
中的私有發布文檔來獲取實際的操作手冊。

## 相關

- [發布管道](/zh-Hant/install/development-channels)
