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
2. 使用 `/changelog` 從真實提交歷史重寫頂部 `CHANGELOG.md` 部分，保留條目對用戶可見，提交並推送它，然後在建立分支前再次變基/拉取。
3. 審閱 `src/plugins/compat/registry.ts` 和 `src/commands/doctor/shared/deprecation-compat.ts` 中的發行相容性記錄。僅在升級路徑仍被覆蓋時移除過期的相容性，或記錄為何有意保留它。
4. 從當前的 `main` 建立 `release/YYYY.M.D`；請勿直接在 `main` 上進行正常的發行工作。
5. 將所有目標標籤所需的版本位置更新，然後執行 `pnpm release:prep`。它會以正確的順序重新整理插件版本、插件清單、設定架構、捆綁的通道設定元數據、設定文件基準、插件 SDK 匯出以及插件 SDK API 基準。在打標籤之前，先提交任何產生的變更。然後執行本地確定性預檢：`pnpm check:test-types`、`pnpm check:architecture`、`pnpm build && pnpm ui:build` 和 `pnpm release:check`。
6. 使用 `preflight_only=true` 執行 `OpenClaw NPM Release`。在標籤存在之前，允許使用完整的 40 字元 release-branch SHA 進行僅驗證的預檢。預檢會為確切簽出的依賴圖生成依賴發布證據，並將其儲存在 npm 預檢產品中。儲存成功的 `preflight_run_id`。
7. 針對發行分支、標籤或完整的提交 SHA，使用 `Full Release Validation` 啟動所有發行前測試。這是四大發行測試箱 Vitest、Docker、QA Lab 和 Package 的唯一手動進入點。
8. 如果驗證失敗，請在發布分支上修復，並重新執行能證明修復的最小失敗檔案、通道、工作流程作業、套件設定檔、提供者或模型允許清單。僅在變更的範圍使先前的證據失效時，才重新執行完整的整體測試。
9. 對於 beta，打標籤 `vYYYY.M.D-beta.N`，然後執行 `pnpm release:candidate -- --tag
vYYYY.M.D-beta.N` from the matching `release/YYYY.M.D` 分支。該輔助工具會執行
   本地生成版本的檢查，派發或驗證完整的版本
   驗證和 npm preflight 證據，執行 Parallels 和 Telegram 套件
   驗證，記錄外掛 npm 和 ClawHub 計劃，並且僅在證據包通過後才輸出精確的
   `OpenClaw Release Publish` 指令。
   `OpenClaw Release Publish` 會將選定的或所有可發布的外掛
   套件派發到 npm，並將相同的一組套件並行派發到 ClawHub，然後在
   外掛 npm 發布成功後，儘快使用匹配的 dist-tag 推廣
   已準備好的 OpenClaw npm preflight 成品。
   當 OpenClaw npm 發布子任務成功後，它會從完整的匹配
   `CHANGELOG.md` 區塊建立或更新
   匹配的 GitHub release/prerelease 頁面。發布到 npm `latest` 的穩定版本會成為
   GitHub 最新版本；保留在 npm `beta` 上的穩定維護版本則
   會使用 GitHub `latest=false` 建立。該工作流程也會將 preflight
   相依性證據上傳到 GitHub 發布作為
   `openclaw-<version>-dependency-evidence.zip`，以便進行發布後事故
   回應。發布工作流程會立即輸出子任務執行 ID，自動批准
   工作流程權杖有權批准的版本環境閘門，並以記錄結尾摘要
   失敗的子任務，在 OpenClaw npm 發布成功後立即關閉 GitHub 發布和相依性
   證據，每當正在發布 OpenClaw npm 時等待 ClawHub，然後執行 `pnpm release:verify-beta` 並
   上傳 GitHub 發布、npm 套件、選定的
   外掛 npm 套件、選定的 ClawHub 套件、子工作流程執行 ID 和
   選用的 NPM Telegram 執行 ID 的發布後證據。ClawHub 路徑會重試暫時性 CLI
   相依性安裝失敗，即使其中一個預覽單元出現不穩定也會發布通過預覽的外掛，並且會對每個預期的
   外掛版本進行註冊表驗證，以便部分發布保持可見且可重試。然後對已發布的
   `openclaw@YYYY.M.D-beta.N` 或
   `openclaw@beta` 套件執行發布後
   套件驗收。如果推送或發布的 prelease 需要修復，
   則建立下一個匹配的 prerelease 編號；請勿刪除或重寫舊的
   prerelease。
10. 對於穩定版，僅在經過審核的 Beta 或候選版本具備所需
    驗證證據後繼續。穩定版 npm 發布也會透過
    `OpenClaw Release Publish`，並透過 `preflight_run_id` 重複使用成功的前置檢查構件；
    穩定版 macOS 發布準備就緒還需要在 `main` 上具備打包好的
    `.zip`、`.dmg`、`.dSYM.zip`
    以及更新的 `appcast.xml`。
    私有的 macOS 發布工作流程會在發布資產驗證後自動將簽署的 appcast 發布到公開的
    `main`；如果分支保護阻止直接推送，
    它會開啟或更新 appcast PR。
11. 發佈後，執行 npm 發佈後驗證器，當您需要發佈後頻道證明時
    執行可選的獨立 published-npm Telegram E2E，視需要執行 dist-tag 推廣，驗證
    生成的 GitHub 發行頁面，並執行發佈公告步驟。

## 發布飛行前檢查

- 在發布前置檢查之前執行 `pnpm check:test-types`，以便測試 TypeScript
  在更快的本機 `pnpm check` 檢查門檻之外保持覆蓋
- 在發布前置檢查之前執行 `pnpm check:architecture`，以便更廣泛的導入
  週期和架構邊界檢查在更快的本機門檻之外顯示為通過（綠燈）
- 在 `pnpm release:check` 之前執行 `pnpm build && pnpm ui:build`，以便預期的
  `dist/*` 發布資產和 Control UI 套件組合存在於打包驗證步驟中
- 在根版本號遞增之後和標記之前執行 `pnpm release:prep`。它會執行每個
  在版本/配置/API 變更後經常偏移的確定性發布產生器：外掛版本、外掛清單、
  基礎配置架構、捆綁的通道配置元數據、配置文件基準、外掛 SDK 匯出以及外掛 SDK API 基準。
  `pnpm release:check` 會以檢查模式重新執行這些守衛，並在執行打包發布檢查之前，
  在一次過程中回報它發現的每個產生的偏移失敗。
- 在發布核准前執行手動 `Full Release Validation` 工作流程，以便從單一入口啟動所有發布前測試箱。它接受分支、標籤或完整的提交 SHA，分派手動 `CI`，並針對安裝冒煙測試、套件驗收、跨作業系統套件檢查、QA Lab 對應、Matrix 和 Telegram 管道分派 `OpenClaw Release Checks`。穩定版/預設執行會將詳盡的即時/E2E 和 Docker 發布路徑浸泡測試保持在 `run_release_soak=true` 之後；`release_profile=full` 會強制開啟浸泡測試。使用 `release_profile=full` 和 `rerun_group=all` 時，它也會對來自發布檢查的 `release-package-under-test` 成果執行套件 Telegram E2E。在發布 beta 版後提供 `release_package_spec`，以便在發布檢查、套件驗收和套件 Telegram E2E 中重複使用已發布的 npm 套件，而無需重建發布 tarball。僅當 Telegram 應使用與其餘發布驗證不同的已發布套件時，才提供 `npm_telegram_package_spec`。當套件驗收應使用與發布套件規格不同的已發布套件時，提供 `package_acceptance_package_spec`。當私有證據報告應證明驗證符合已發布的 npm 套件且不強制執行 Telegram E2E 時，提供 `evidence_package_spec`。範例：
  `gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D`
- 當您希望在發行工作繼續進行時，為套件候選版本取得側通道驗證，請執行手動 `Package Acceptance` 工作流程。針對 `openclaw@beta`、`openclaw@latest` 或確切的發行版本，使用 `source=npm`；使用 `source=ref` 以目前的 `workflow_ref` harness 打包受信任的 `package_ref` branch/tag/SHA；使用 `source=url` 以取得具必要 SHA-256 和嚴格公開 URL 原則的公開 HTTPS tarball；使用 `source=trusted-url` 以取得使用必要 `trusted_source_id` 和 SHA-256 的具名受信任來源原則；或使用 `source=artifact` 以取得由另一個 GitHub Actions 執行上傳的 tarball。該工作流程會將候選版本解析為 `package-under-test`，針對該 tarball 重新使用 Docker E2E 發行排程器，並可透過 `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier` 對同一 tarball 執行 Telegram QA。當選取的 Docker lanes 包含 `published-upgrade-survivor` 時，套件工件即為候選版本，而 `published_upgrade_survivor_baseline` 會選取已發行的基準。`update-restart-auth` 將候選套件同時作為已安裝的 CLI 和受測套件，因此它會執行候選更新指令的受控重啟路徑。
  範例：`gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f published_upgrade_survivor_baseline=openclaw@2026.4.26 -f telegram_mode=mock-openai`
  常用設定檔：
  - `smoke`：install/channel/agent、gateway network 與 config reload lanes
  - `package`：不包含 OpenWebUI 或即時 ClawHub 的 artifact-native package/update/restart/plugin lanes
  - `product`：package profile 加上 MCP channels、cron/subagent cleanup、
    OpenAI web search 與 OpenWebUI
  - `full`：包含 OpenWebUI 的 Docker release-path chunks
  - `custom`：針對專注的重新執行進行精確的 `docker_lanes` 選取
- 當您只需要對發布候選版本進行完整的正常 CI
  覆蓋時，直接執行手動 `CI` 工作流程。手動 CI 分派會繞過變更範圍限定，並強制執行 Linux Node 分片、bundled-plugin 分片、plugin 和
  channel contract 分片、Node 22 相容性、`check-*`、`check-additional-*`、
  建置成品冒煙測試、文件檢查、Python 技能、Windows、macOS、
  Android 和 Control UI i18n 通道。
  範例：`gh workflow run ci.yml --ref release/YYYY.M.D`
- 驗證發布遙測時執行 `pnpm qa:otel:smoke`。它會透過本機 OTLP/HTTP 接收器來執行 QA-lab，並驗證追蹤、指標和日誌
  匯出，以及有界的追蹤屬性和內容/識別符編輯，而不
  需要 Opik、Langfuse 或其他外部收集器。
- 驗證受保護的 Prometheus 抓取時執行 `pnpm qa:prometheus:smoke`。
  它會執行 QA-lab，拒絕未經驗證的抓取，並驗證
  發布關鍵的指標系列保持不含提示內容、原始識別符、
  授權權杖和本機路徑。
- 當您想要連續執行原始碼檢出 OpenTelemetry 和 Prometheus 冒煙通道時，執行 `pnpm qa:observability:smoke`。
- 在每次標記發布前執行 `pnpm release:check`
- `OpenClaw NPM Release` preflight 會在打包 npm tarball 之前產生相依性發布證據。
  npm 諮詢漏洞閘門是發布阻斷性的。傳遞清單風險、相依性擁有權/安裝
  範圍和相依性變更報告僅為發布證據。
  相依性變更報告會將發布候選版本與先前的
  可抵達發布標籤進行比較。
- preflight 會將相依性證據上傳為
  `openclaw-release-dependency-evidence-<tag>`，並將其嵌入在準備好的 npm preflight 成品內的
  `dependency-evidence/` 下。實際
  的發布路徑會重用該 preflight 成品，然後將相同的證據
  以 `openclaw-<version>-dependency-evidence.zip` 的形式附加至 GitHub 發布。
- 在標籤存在之後，執行 `OpenClaw Release Publish` 以進行變動的發布序列。從 `release/YYYY.M.D` 分派它（或在發布可從 main 到達的標籤時從 `main` 分派），傳遞發布標籤和成功的 OpenClaw npm `preflight_run_id`，並保留預設的外掛程式發布範圍 `all-publishable`，除非您刻意執行專注的修復。該工作流程會將外掛程式 npm 發布、外掛程式 ClawHub 發布和 OpenClaw npm 發布序列化，以便在核心套件的外掛程式外部化之前不會發布核心套件。
- 發布檢查現在在單獨的手動工作流程中執行：`OpenClaw Release Checks`
- `OpenClaw Release Checks` 也會在發布批准之前執行 QA Lab 模擬對等通道以及快速的即時 Matrix 設定檔和 Telegram QA 通道。即時通道使用 `qa-live-shared` 環境；Telegram 也使用 Convex CI 憑證租用。當您需要完整的 Matrix 傳輸、媒體和 E2EE 清單時，請使用 `matrix_profile=all` 和 `matrix_shards=true` 執行手動 `QA-Lab - All Lanes` 工作流程，以平行方式進行。
- 跨作業系統安裝和升級執行時驗證是公用 `OpenClaw Release Checks` 和 `Full Release Validation` 的一部分，它們直接呼叫可重複使用的工作流程 `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- 這種分拆是有意的：保持真實的 npm 發布路徑簡短、確定性並專注於構件，而較慢的即時檢查則保持在它們自己的通道中，以免延遲或阻礙發布
- 包含密鑰的發布檢查應透過 `Full Release
Validation` or from the `main`/release 工作流程參照進行分派，以便工作流程邏輯和密鑰保持受控
- `OpenClaw Release Checks` 接受分支、標籤或完整的提交 SHA，只要解析的提交可從 OpenClaw 分支或發布標籤到達即可
- `OpenClaw NPM Release` 僅驗證的預檢也接受當前完整的 40 個字元的工作流程分支提交 SHA，而不需要推送標籤
- 該 SHA 路徑僅用於驗證，無法升級為真實的發布
- 在 SHA 模式下，該工作流僅針對套件中繼資料檢查合成 `v<package.json version>`；實際發佈仍需要實際的發佈標籤
- 這兩個工作流都將實際發佈和推廣路徑保留在 GitHub 託管的執行器上，而非變更驗證路徑則可使用更大的 Blacksmith Linux 執行器
- 該工作流使用 `OPENAI_API_KEY` 和 `ANTHROPIC_API_KEY` 工作流密鑰來執行
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
- npm 發佈預檢不再等待獨立的發佈檢查通道
- 在本機標記發佈候選版本之前，請先執行
  `RELEASE_TAG=vYYYY.M.D-beta.N pnpm release:fast-pretag-check`。此輔助程式
  會依序執行快速發佈防護、外掛 npm/ClawHub 發佈檢查、建置、
  UI 建置和 `release:openclaw:npm:check`，以便在 GitHub 發佈工作流開始前捕捉常見的阻礙核准錯誤。
- 在核准之前執行 `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  （或對應的 beta/correction 標籤）
- 在 npm publish 之後，執行
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  （或對應的 beta/correction 版本）以在全新的暫存前綴中驗證已發佈的註冊表安裝路徑
- 在 beta 發佈之後，執行 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`
  以使用共用的租用 Telegram 憑證集區，對已發佈的 npm 套件驗證已安裝套件的導入流程、Telegram 設定以及真實的 Telegram E2E。本機維護者的單次操作可以省略 Convex 變數，直接傳遞三個 `OPENCLAW_QA_TELEGRAM_*` 環境憑證。
- 若要從維護者機器執行完整的發佈後 beta 偵測，請使用 `pnpm release:beta-smoke -- --beta betaN`。此輔助程式會執行 Parallels npm update/fresh-target 驗證、觸發 `NPM Telegram Beta E2E`、輪詢確切的工作流執行、下載構件並列印 Telegram 報告。
- 維護者可以透過手動 `NPM Telegram Beta E2E` 工作流，從 GitHub Actions 執行相同的發佈後檢查。它被特意設計為僅限手動執行，
  且不會在每次合併時執行。
- 維護者發佈自動化現在採用先預檢後推廣：
  - 實際的 npm publish 必須通過成功的 npm `preflight_run_id`
  - 實際的 npm publish 必須從與成功預檢執行相同的 `main` 或
    `release/YYYY.M.D` 分支觸發
  - 穩定版 npm 發布預設使用 `beta`
  - 穩定版 npm 發布可以透過 workflow input 明確指定目標為 `latest`
  - 基於安全性，基於 token 的 npm dist-tag 變更現在位於
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`，因為 `npm dist-tag add` 仍需要
    `NPM_TOKEN`，而公開儲存庫僅保留 OIDC 發布
  - 公開 `macOS Release` 僅用於驗證；當 tag 僅存在於發布分支上，但 workflow 是從
    `main` 觸發時，請設定 `public_release_branch=release/YYYY.M.D`
  - 真正的私人 mac 發布必須通過成功的私人 mac
    `preflight_run_id` 和 `validate_run_id`
  - 真正的發布路徑會推播準備好的構件，而不是重新建構它們
- 對於像 `YYYY.M.D-N` 這樣的穩定版修正發布，發布後驗證器也會檢查從 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同暫時前綴升級路徑，以確保發布修正不會在基礎穩定版構件上無聲無息地留下舊的全域安裝
- 除非 tarball 同時包含 `dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 構件，否則 npm 發布預檢將失敗並關閉，以免我們再次發送空的瀏覽器儀表板
- 發布後驗證也會檢查已發布的插件進入點和套件元資料是否存在於已安裝的 registry 佈局中。如果發送的版本缺少插件運行時構件，將無法通過 postpublish 驗證器，且無法推廣至 `latest`。
- `pnpm test:install:smoke` 也會對候選更新 tarball 執行 npm pack `unpackedSize` 預算限制，以便安裝程式 e2e 能在發布路徑之前攔截意外的打包膨脹
- 如果發布工作涉及 CI 規劃、擴充功能時間表清單或擴充功能測試矩陣，請在批准前從 `.github/workflows/plugin-prerelease.yml` 重新產生並檢閱規劃器擁有的 `plugin-prerelease-extension-shard` 矩陣輸出，以免發布說明描述過時的 CI 佈局
- 穩定版 macOS 發布準備工作也包含更新程式介面：
  - GitHub 發布最終必須包含打包好的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - `main` 上的 `appcast.xml` 在發布後必須指向新的 stable zip；
    私有的 macOS 發布工作流程會自動提交它，或者在直接推送受阻時開啟 appcast PR
  - 打包好的應用程式必須保持非 debug 的 bundle id、非空的 Sparkle feed
    URL，以及一個高於或等於該發布版本正規 Sparkle 構建底限的 `CFBundleVersion`

## 發布測試箱

`Full Release Validation` 是操作人員從單一入口點啟動所有發布前測試的方式。
若要在快速變動的分支上進行固定提交證明，請使用此輔助工具，讓每個子工作流程
都從固定在目標 SHA 的暫存分支執行：

```bash
pnpm ci:full-release --sha <full-sha>
```

該輔助工具會推送 `release-ci/<sha>-...`，使用 `ref=<sha>` 從該分支
觸發 `Full Release Validation`，驗證每個子工作流程 `headSha`
都符合目標，然後刪除暫存分支。這可以避免意外證明較新的 `main` 子執行。

若要進行發布分支或標籤驗證，請從受信任的 `main` 工作流程 ref
執行它，並將發布分支或標籤作為 `ref` 傳入：

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N
```

工作流程解析目標 ref，使用 `target_ref=<release-ref>` 分發手動 `CI`，分發 `OpenClaw Release Checks`，準備一個用於軟體包檢查的父級 `release-package-under-test` 構件，並在設定 `release_profile=full` 搭配 `rerun_group=all` 時，或當設定了 `release_package_spec` 或 `npm_telegram_package_spec` 時，分發獨立的軟體包 Telegram E2E。`OpenClaw Release Checks` 接著會展開安裝冒煙測試、跨作業系統發布檢查、當啟用 soak 時的即時/E2E Docker 發布路徑覆蓋率、使用 Telegram 軟體包 QA 的軟體包驗收、QA Lab 一致性、即時 Matrix 以及即時 Telegram。只有當 `Full Release Validation` 摘要顯示 `normal_ci` 和 `release_checks` 成功時，完整運行才是可接受的。在完整/全部模式下，`npm_telegram` 子級也必須成功；在完整/全部模式之外，除非提供了已發布的 `release_package_spec` 或 `npm_telegram_package_spec`，否則會跳過它。最終驗證器摘要包含每個子級運行的最慢任務表，因此發布經理無需下載日誌即可查看當前的關鍵路徑。有關完整的階段矩陣、確切的工作流程作業名稱、穩定與完整設定檔的差異、構件和專注的重新運行處理程序，請參閱 [完整發布驗證](/zh-Hant/reference/full-release-validation)。子工作流程是從執行 `Full Release Validation`, normally `--ref main`, even when the target `ref` 的受信任 ref 分發的，該 ref 指向較舊的發布分支或標籤。沒有單獨的 Full Release Validation workflow-ref 輸入；通過選擇工作流程運行 ref 來選擇受信任的控制框架。不要使用 `--ref main -f ref=<sha>` 來作為移動 `main` 的精確提交證明；原始提交 SHA 不能作為工作流程分發 ref，因此請使用 `pnpm ci:full-release --sha <sha>` 來創建固定的臨時分支。

使用 `release_profile` 來選擇即時/提供者的廣度：

- `minimum`：最快的發布關鍵 OpenAI/核心即時和 Docker 路徑
- `stable`：最低限度加上穩定的提供商/後端覆蓋率，以用於發布核准
- `full`：穩定加上廣泛的諮詢提供商/媒體覆蓋率

當阻礙發布的通道顯示為綠燈，並且您希望在推廣前進行徹底的 live/E2E、Docker 發布路徑以及有界的已發布升級存留掃描時，請將 `run_release_soak=true` 與 `stable` 搭配使用。該掃描涵蓋了最新的四個穩定套件加上固定的 `2026.4.23` 和 `2026.5.2` 基線以及較舊的 `2026.4.15` 覆蓋率，並移除重複的基線，且每個基線被分片到自己的 Docker runner 作業中。`full` 意指 `run_release_soak=true`。

`OpenClaw Release Checks` 使用受信任的工作流程引用將目標引用解析一次為 `release-package-under-test`，並在浸泡執行時於跨作業系統、套件驗收和發布路徑 Docker 檢查中重用該構件。這使所有面向套件的測試箱保持在相同的位元組上，並避免重複的套件建置。當 beta 版本已經在 npm 上時，設定 `release_package_spec=openclaw@YYYY.M.D-beta.N`，以便發布檢查下載已發布的套件一次，從 `dist/build-info.json` 中提取其建置原始碼 SHA，並在跨作業系統、套件驗收、發布路徑 Docker 和套件 Telegram 通道中重用該構件。當設定 repo/org 變數時，跨作業系統 OpenAI 安裝冒煙測試會使用 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否則使用 `openai/gpt-5.4`，因為此通道旨在驗證套件安裝、上手、閘道啟動和一次即時代理轉動，而不是對最慢的預設模型進行基準測試。更廣泛的即時提供商矩陣仍然是特定模型覆蓋率的地方。

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

在針對性修復後的第一次重新執行中，請勿使用完整的 umbrella。如果某個 box 失敗，請針對下一次驗證使用失敗的子工作流程、job、Docker lane、package profile、模型提供者或 QA lane。僅當修復更改了共用的 release 協調流程或導致先前的全 box 證據失效時，才再次執行完整的 umbrella。Umbrella 的最終驗證器會重新檢查記錄的子工作流程執行 ID，因此當子工作流程成功重新執行後，僅需重新執行失敗的 `Verify full validation` parent job。

對於有限恢復，請將 `rerun_group` 傳遞給 umbrella。`all` 是實際的 release-candidate 執行，`ci` 僅執行正常的 CI 子項，`plugin-prerelease` 僅執行 release-only plugin 子項，`release-checks` 執行每個 release box，而較狹窄的 release 群組為 `install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 和 `npm-telegram`。針對性 `npm-telegram` 重新執行需要 `release_package_spec` 或 `npm_telegram_package_spec`；帶有 `release_profile=full` 的完整/所有執行使用 release-checks package 構件。針對性跨 OS 重新執行可以新增 `cross_os_suite_filter=windows/packaged-upgrade` 或其他 OS/suite 篩選器。QA release-check 失敗僅供參考，但標準執行時期工具覆蓋率閘道除外，當所需的 OpenClaw 動態工具從標準層級摘要中偏移或消失時，該閘道會阻擋 release 驗證。

### Vitest

Vitest box 是手動 `CI` 子工作流程。手動 CI 會刻意繞過變更範圍限定，並強制針對 release candidate 執行正常的測試圖表：Linux Node 分片、bundled-plugin 分片、plugin 和 channel contract 分片、Node 22 相容性、`check-*`、`check-additional-*`、構件檢查、文件檢查、Python 技能、Windows、macOS、Android 和 Control UI i18n。

使用此方塊來回答「原始碼樹是否通過了完整的正常測試套件？」
這與 release-path 產品驗證不同。需保留的證據：

- 顯示已分派 `CI` 執行 URL 的 `Full Release Validation` 摘要
- `CI` 在確切的目標 SHA 上執行結果為綠燈（通過）
- 調查回歸時，來自 CI 作業的失敗或緩慢分片名稱
- 當執行需要效能分析時的 Vitesting 時間構件，例如 `.artifacts/vitest-shard-timings.json`

僅當發布需要確定性的正常 CI，但不需要 Docker、QA Lab、live、cross-OS 或 package 方塊時，才直接執行手動 CI：

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

Docker 方塊位於 `OpenClaw Release Checks` 至
`openclaw-live-and-e2e-checks-reusable.yml` 中，加上 release-mode
`install-smoke` 工作流程。它透過打包的 Docker 環境來驗證發布候選版本，而不僅僅是原始碼層級的測試。

Release Docker 涵蓋範圍包括：

- 啟用緩慢 Bun 全域安裝冒煙測試的完整安裝冒煙測試
- 根據目標 SHA 準備/重用根 Dockerfile 冒煙映像，並將 QR、
  root/gateway 以及 installer/Bun 冒煙作業作為獨立的 install-smoke
  分片執行
- 儲存庫 E2E 通道
- release-path Docker 區塊： `core`、 `package-update-openai`、
  `package-update-anthropic`、 `package-update-core`、 `plugins-runtime-plugins`、
  `plugins-runtime-services`、
  `plugins-runtime-install-a`、 `plugins-runtime-install-b`、
  `plugins-runtime-install-c`、 `plugins-runtime-install-d`、
  `plugins-runtime-install-e`、 `plugins-runtime-install-f`、
  `plugins-runtime-install-g` 和 `plugins-runtime-install-h`
- 當有要求時，`plugins-runtime-services` 區塊內的 OpenWebUI 涵蓋範圍
- 分割的捆綁外掛程式安裝/解除安裝通道
  `bundled-plugin-install-uninstall-0` 至
  `bundled-plugin-install-uninstall-23`
- 當發布檢查包含 live 套件時的 live/E2E 提供者套件和 Docker live 模型涵蓋範圍

在重新執行之前使用 Docker 成品。release-path 排程器會上傳包含 lane 日誌、`summary.json`、`failures.json`、階段計時、排程器計畫 JSON 和重新執行指令的 `.artifacts/docker-tests/`。為了進行專注的復原，請在可重複使用的 live/E2E 工作流程上使用 `docker_lanes=<lane[,lane]>`，而不是重新執行所有 release 區塊。產生的重新執行指令包含先前的 `package_artifact_run_id` 和準備好的 Docker 映像輸入（如果有的話），因此失敗的 lane 可以重複使用相同的 tarball 和 GHCR 映像。

### QA Lab

QA Lab 盒子也是 `OpenClaw Release Checks` 的一部分。它是代理行為和通道層級的 release 閘道，與 Vitest 和 Docker 打包機制分開。

Release QA Lab 涵蓋範圍包括：

- mock parity lane，使用代理 parity 套件將 OpenAI 候選 lane 與 Opus 4.6 基線進行比較
- 使用 `qa-live-shared` 環境的快速 live Matrix QA 設定檔
- 使用 Convex CI 憑證租約的 live Telegram QA lane
- 當 release 遙測需要明確的本機證明時，使用 `pnpm qa:otel:smoke`、`pnpm qa:prometheus:smoke` 或
  `pnpm qa:observability:smoke`

使用此盒子來回答「release 在 QA 情境和 live channel 流程中是否運作正常？」。在批准 release 時，請保留 parity、Matrix 和 Telegram lane 的成品 URL。完整的 Matrix 涵蓋範圍仍可作為手動分片的 QA-Lab 執行使用，而不是預設的 release-critical lane。

### Package

Package 盒子是可安裝產品的閘道。它由 `Package Acceptance` 和解析器 `scripts/resolve-openclaw-package-candidate.mjs` 支援。解析器會將候選版本正規化為 Docker E2E 使用的 `package-under-test` tarball，驗證套件清單，記錄套件版本和 SHA-256，並將 workflow harness ref 與套件來源 ref 分開保存。

支援的候選來源：

- `source=npm`：`openclaw@beta`、`openclaw@latest` 或精確的 OpenClaw release 版本
- `source=ref`：使用選定的 `workflow_ref` harness 打包受信任的 `package_ref` 分支、標籤或完整 commit SHA
- `source=url`：下載具有所需 `package_sha256` 的公用 HTTPS `.tgz`；
  會拒絕 URL 憑證、非預設 HTTPS 連接埠、私有/內部/特殊用途
  主機名稱或已解析位址，以及不安全的重新導向
- `source=trusted-url`：從 `.github/package-trusted-sources.json` 中的命名原則下載具有所需
  `package_sha256` 和 `trusted_source_id` 的 HTTPS `.tgz`；對於維護者擁有的
  企業鏡像或私有套件儲存庫，請使用此選項，而不要將輸入層級的私有網路略過加入 `source=url`
- `source=artifact`：重複使用由另一個 GitHub Actions 執行上傳的 `.tgz`

`OpenClaw Release Checks` 使用 `source=artifact`、已準備的發行套件成品、`suite_profile=custom`、
`docker_lanes=doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update`、
`telegram_mode=mock-openai` 執行套件驗收。套件驗收會針對同一個已解析的
tarball，持續進行遷移、更新、
設定授權更新重新啟動、即時 ClawHub 技能安裝、過時外掛相依性清理、離線外掛
固定裝置、外掛更新和 Telegram 套件 QA。阻斷式發行檢查使用預設的最新已發布套件
基準；`run_release_soak=true` 或
`release_profile=full` 會展開從 `2026.4.23` 到 `latest` 的每個穩定 npm 已發布基準
加上回報問題的固定裝置。對於已發布的候選版本，請搭配 `source=npm` 使用套件驗收，
對於發布前以 SHA 為基礎的本地 npm tarball，請搭配 `source=ref`，
對於維護者擁有的企業/私有鏡像，請搭配 `source=trusted-url`，或
對於由另一個 GitHub Actions 執行上傳的已準備 tarball，請搭配 `source=artifact`。
這是先前需要 Parallels 的大部分套件/更新覆蓋率的 GitHub 原生
替代方案。跨 OS 發行檢查對於特定於 OS 的上架、
安裝程式和平台行為仍然很重要，但套件/更新產品驗證應
優先使用套件驗收。

更新和外掛驗證的正式檢查清單為
[測試更新與外掛](/zh-Hant/help/testing-updates-plugins)。在決定使用哪個本機、Docker、套件驗收或 release-check 通道來驗證
外掛安裝/更新、doctor 清理或已發布套件遷移變更時，請使用此清單。
從每個穩定 `2026.4.23+` 套件進行詳盡的已發布更新遷移
是一個獨立的手動 `Update Migration` 工作流程，並非完整版 CI 的一部分。

舊版套件驗收的寬限期是有意設定期限的。 `2026.4.25` 及之前的套件可以使用相容性路徑來處理已發布至 npm 的中繼資料缺失：壓縮檔中遺漏的私有 QA 清單項目、遺漏的
`gateway install --wrapper`、從壓縮檔衍生的 git fixture 中遺漏的修補檔、遺漏的持久化 `update.channel`、舊版外掛安裝記錄
位置、遺漏的市集安裝記錄持久化，以及在 `plugins update` 期間的設定中繼資料
遷移。已發布的 `2026.4.26` 套件可能會針對已隨貨運出的本機建置中繼資料戳記檔發出警告。之後的套件
必須符合現代套件合約；這些相同的缺失將導致版本
驗證失敗。

當發布問題關乎實際的可安裝套件時，請使用更廣泛的套件驗收設定檔：

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

- `smoke`：快速套件安裝/通道/代理程式、閘道網路，以及設定
  重新載入通道
- `package`：安裝/更新/重新啟動/外掛套件合約，加上即時 ClawHub
  技能安裝驗證；這是 release-check 的預設值
- `product`： `package` 加上 MCP 通道、cron/子代理程式清理、OpenAI 網頁
  搜尋，以及 OpenWebUI
- `full`：包含 OpenWebUI 的 Docker 版本路徑區塊
- `custom`：用於專注重新執行的確切 `docker_lanes` 清單

若要進行套件候選版本的 Telegram 驗證，請在套件驗收 上啟用 `telegram_mode=mock-openai` 或
`telegram_mode=live-frontier`。此工作流程會將解析出的 `package-under-test` tarball 傳入 Telegram 通道；獨立的
Telegram 工作流程仍接受已發布的 npm spec 以進行發布後檢查。

## 發布發布自動化

`OpenClaw Release Publish` 是標準的變動發布進入點。它
會依照發布需求協調受信任發布者 工作流程：

1. 檢出發布標籤 並解析其提交 SHA。
2. 驗證該標籤可從 `main` 或 `release/*` 抵達。
3. 執行 `pnpm plugins:sync:check`。
4. 使用 `publish_scope=all-publishable` 和
   `ref=<release-sha>` 觸發 `Plugin NPM Release`。
5. 使用相同的範圍 和 SHA 觸發 `Plugin ClawHub Release`。
6. 使用發布標籤、npm dist-tag 和
   已儲存的 `preflight_run_id` 觸發 `OpenClaw NPM Release`。

Beta 發布範例：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

發布至預設 beta dist-tag 的穩定版：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

直接升級至 `latest` 的穩定版需明確指定：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=latest
```

僅針對特定的修補或重新發布工作，使用較低層級的 `Plugin NPM Release` 和 `Plugin ClawHub Release` 工作流程。
若要修補選定的外掛，請將
`plugin_publish_scope=selected` 和 `plugins=@openclaw/name` 傳遞給
`OpenClaw Release Publish`，或在
OpenClaw 套件不可發布時直接觸發子工作流程。

## NPM 工作流程輸入

`OpenClaw NPM Release` 接受這些由操作員控制的輸入：

- `tag`：必要的發布標籤，例如 `v2026.4.2`、`v2026.4.2-1` 或
  `v2026.4.2-beta.1`；當 `preflight_only=true` 時，也可以是當前
  完整的 40 字元工作流程分支提交 SHA，用於僅驗證的預檢
- `preflight_only`：`true` 僅用於驗證/建置/打包，`false` 用於
  實際的發布路徑
- `preflight_run_id`：在實際發布路徑上為必需，以便工作流程重用
  來自成功預檢執行的準備好 tarball
- `npm_dist_tag`：發布路徑的 npm 目標標籤；預設為 `beta`

`OpenClaw Release Publish` 接受這些操作員控制的輸入：

- `tag`：必需的發布標籤；必須已存在
- `preflight_run_id`：成功的 `OpenClaw NPM Release` 預檢執行 ID；
  當 `publish_openclaw_npm=true` 時為必需
- `npm_dist_tag`：OpenClaw 套件的 npm 目標標籤
- `plugin_publish_scope`：預設為 `all-publishable`；僅針對
  專注修復工作使用 `selected`
- `plugins`：當 `plugin_publish_scope=selected` 時，以逗號分隔的
  `@openclaw/*` 套件名稱
- `publish_openclaw_npm`：預設為 `true`；僅當將
  工作流程用作僅外掛修復協調器時設定 `false`
- `wait_for_clawhub`：預設為 `false`，以免 npm 可用性被
  ClawHub sidecar 阻塞；僅當工作流程完成必須包含
  ClawHub 完成時設定 `true`

`OpenClaw Release Checks` 接受這些操作員控制的輸入：

- `ref`：要驗證的分支、標籤或完整提交 SHA。承載機密的檢查
  要求解析後的提交可從 OpenClaw 分支或
  發布標籤抵達。
- `run_release_soak`：選擇在穩定/預設發布檢查上進行徹底的即時/E2E、Docker 發布路徑，
  以及 all-since upgrade-survivor soak。它會被
  `release_profile=full` 強制開啟。

規則：

- 穩定和修正標籤可以發布到 `beta` 或 `latest`
- Beta 預發布標籤只能發布到 `beta`
- 對於 `OpenClaw NPM Release`，僅當 `preflight_only=true` 時才允許輸入完整提交 SHA
- `OpenClaw Release Checks` 和 `Full Release Validation` 始終
  僅用於驗證
- 實際的發布路徑必須使用與 preflight 期間相同的 `npm_dist_tag`；
  該工作流程會在發布持續之前驗證該元數據

## Stable npm 發布序列

當建立一個 stable npm 發布時：

1. 使用 `preflight_only=true` 執行 `OpenClaw NPM Release`
   - 在標籤存在之前，你可以使用當前的完整工作流程分支提交
     SHA 來對 preflight 工作流程進行僅驗證的試運行
2. 選擇 `npm_dist_tag=beta` 以進行正常的 beta-first 流程，或者僅在
   你有意進行直接的 stable 發布時選擇 `latest`
3. 當你希望從一個手動工作流程中獲得正常的 CI 加上即時 prompt cache、Docker、QA Lab、
   Matrix 和 Telegram 覆蓋率時，在發布分支、發布標籤或完整
   提交 SHA 上執行 `Full Release Validation`
4. 如果你確實只需要確定性的正常測試圖，請改為在發布引用上
   執行手動的 `CI` 工作流程
5. 儲存成功的 `preflight_run_id`
6. 使用相同的 `tag`、相同的 `npm_dist_tag`
   和儲存的 `preflight_run_id` 執行 `OpenClaw Release Publish`；它會在推廣 OpenClaw npm 套件之前
   將外部化插件發布到 npm 和 ClawHub
7. 如果發布到達了 `beta`，請使用私有的
   `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
   工作流程將該穩定版本從 `beta` 推廣到 `latest`
8. 如果發布有意直接發布到 `latest` 並且 `beta`
   應該立即跟隨相同的穩定建置，請使用該相同的私有
   工作流程將兩個 dist-tags 指向穩定版本，或者讓其排程的
   自我修復同步稍後移動 `beta`

出於安全考慮，dist-tag 變更位於私有倉庫中，因為它仍然
需要 `NPM_TOKEN`，而公共倉庫則僅保留 OIDC 發布。

這樣可以確保直接發布路徑和 beta-first 推廣路徑都
被記錄在案並且對操作員可見。

如果維護者必須回退到本機 npm 身份驗證，請僅在專用的 tmux 會話內執行任何 1Password
CLI (`op`) 指令。請勿直接從主要代理程式 shell 呼叫 `op`；
將其保留在 tmux 中可讓提示、警報和 OTP 處理變得可觀察，並防止重複的主機警報。

## 公開參考

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
中的私有發佈文件作為實際的操作手冊。

## 相關

- [發佈通道](/zh-Hant/install/development-channels)
