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
- 當您希望在發布工作持續進行的同時，為套件候選版本取得側通道證明時，請執行手動 `Package Acceptance` 工作流程。使用 `source=npm` 來指定 `openclaw@beta`、`openclaw@latest` 或確切的發布版本；使用 `source=ref` 將受信任的 `package_ref` 分支/標籤/SHA 與目前的 `workflow_ref` 測試套件一起打包；使用 `source=url` 指定具有所需 SHA-256 的 HTTPS tarball；或使用 `source=artifact` 指定由另一個 GitHub Actions 執行上傳的 tarball。該工作流程會將候選版本解析為 `package-under-test`，對該 tarball 重新使用 Docker E2E 發布排程器，並可以使用 `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier` 對同一 tarball 執行 Telegram QA。當選取的 Docker 通道包含 `published-upgrade-survivor` 時，套件成品即為候選版本，而 `published_upgrade_survivor_baseline` 會選擇已發布的基線。`update-restart-auth` 使用候選套件作為已安裝的 CLI 和受測套件，因此它會練習候選更新指令的受控重啟路徑。
  範例：`gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f published_upgrade_survivor_baseline=openclaw@2026.4.26 -f telegram_mode=mock-openai`
  常用設定檔：
  - `smoke`：install/channel/agent、gateway network 和 config reload 通道
  - `package`：不含 OpenWebUI 或即時 ClawHub 的 artifact-native package/update/restart/plugin 通道
  - `product`：package 設定檔加上 MCP channels、cron/subagent 清理、
    OpenAI web search 和 OpenWebUI
  - `full`：包含 OpenWebUI 的 Docker release-path 區塊
  - `custom`：用於專注重新執行的精確 `docker_lanes` 選擇
- 當您僅需要釋放候選版本的完整正常 CI 覆蓋範圍時，請直接執行手動 `CI` 工作流程。手動 CI 呼叫會繞過變更範圍限定，並強制執行 Linux Node 分片、bundled-plugin 分片、plugin 和 channel contract 分片、Node 22 相容性、`check-*`、`check-additional-*`、建構成品冒煙測試、文件檢查、Python 技能、Windows、macOS、Android 和 Control UI i18n 通道。例如：`gh workflow run ci.yml --ref release/YYYY.M.D`
- 驗證釋放遙測時，執行 `pnpm qa:otel:smoke`。它透過本機 OTLP/HTTP 接收器來運作 QA-lab，並驗證匯出的追蹤 span 名稱、有界屬性以及內容/識別符資料遮除，而不需要 Opik、Langfuse 或其他外部收集器。
- 在每次標記釋放之前執行 `pnpm release:check`
- `OpenClaw NPM Release` preflight 會在封裝 npm tarball 之前產生相依性釋放證據。npm 諮詢弱點閘門會阻擋釋放。傳遞清單風險、相依性擁有權/安裝範圍以及相依性變更報告僅作為釋放證據。相依性變更報告會將釋候選版本與先前的可抵達釋放標籤進行比較。
- Preflight 會將相依性證據上傳為 `openclaw-release-dependency-evidence-<tag>`，並將其內嵌於準備好的 npm preflight 成品內的 `dependency-evidence/` 下。實際的發佈路徑會重複使用該 preflight 成品，然後將相同的證據作為 `openclaw-<version>-dependency-evidence.zip` 附加至 GitHub 釋放。
- 在標籤存在之後，執行 `OpenClaw Release Publish` 以進行變動發佈序列。從 `release/YYYY.M.D` 分派（或者在發佈 main-reachable 標籤時從 `main` 分派），傳遞釋放標籤和成功的 OpenClaw npm `preflight_run_id`，並保留預設的外掛程式發佈範圍 `all-publishable`，除非您刻意執行專注的修復。工作流程會序列化外掛程式 npm 發佈、外掛程式 ClawHub 發佈和 OpenClaw npm 發佈，以便核心套件不會在其外部化外掛程式之前發佈。
- 釋放檢查現在在獨立的手動工作流程中執行：
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` 也會在發布核准前執行 QA Lab 模擬對等通道，以及快速即時 Matrix 設定檔和 Telegram QA 通道。即時通道使用 `qa-live-shared` 環境；Telegram 也使用 Convex CI 憑證租用。當您想要完整的 Matrix 傳輸、媒體和 E2EE 清查時，請使用 `matrix_profile=all` 和 `matrix_shards=true` 執行手動 `QA-Lab - All Lanes` 工作流程。
- 跨平台安裝和升級執行時期驗證是公開 `OpenClaw Release Checks` 和 `Full Release Validation` 的一部分，它們會直接呼叫可重用工作流程 `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- 這種分離是刻意的：保持真正的 npm 發布路徑簡短、確定性且以構件為重點，而較慢的即時檢查則留在它們自己的通道中，以免拖延或阻擋發布
- 包含秘密的發布檢查應透過 `Full Release Validation` or from the `main`/release 工作流程參照進行調度，以便工作流程邏輯和秘密保持受控
- `OpenClaw Release Checks` 接受分支、標籤或完整的提交 SHA，只要解析出的提交可從 OpenClaw 分支或發布標籤觸及
- `OpenClaw NPM Release` 僅驗證的預檢也接受當前完整的 40 個字元的工作流程分支提交 SHA，而不需要推送的標籤
- 該 SHA 路徑僅用於驗證，無法提升為真正的發布
- 在 SHA 模式下，工作流程僅針對套件元資料檢查合成 `v<package.json version>`；真正的發布仍然需要真正的發布標籤
- 這兩個工作流程都將真正的發布和提升路徑保留在 GitHub 託管的執行器上，而非變更的驗證路徑則可以使用更大的 Blacksmith Linux 執行器
- 該工作流程使用 `OPENAI_API_KEY` 和 `ANTHROPIC_API_KEY` 工作流程秘密來執行 `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
- npm 發布預檢不再等待獨立的發布檢查通道
- 在本機標記發布候選版本之前，請執行
  `RELEASE_TAG=vYYYY.M.D-beta.N pnpm release:fast-pretag-check`。此輔助指令
  會依序執行快速發布防護、plugin npm/ClawHub 發布檢查、建置、
  UI 建置以及 `release:openclaw:npm:check`，以便在 GitHub 發布工作流程啟動前
  截獲常見的阻礙核准錯誤。
- 在核准前執行 `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  （或對應的 beta/correction 標籤）
- 在 npm publish 之後，執行
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  （或對應的 beta/correction 版本），以驗證全新暫存前綴中
  已發布 registry 的安裝路徑
- 在 beta 發布後，執行 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`
  以利用共享租用的 Telegram 憑證集區，針對已發布的 npm 套件驗證
  已安裝套件的上線程序、Telegram 設定，以及真實的 Telegram E2E。
  維護者的本機一次性作業可能會省略 Convex 變數，並直接傳遞三個
  `OPENCLAW_QA_TELEGRAM_*` 環境憑證。
- 若要從維護者機器執行完整的發布後 beta 煙霧測試，請使用 `pnpm release:beta-smoke -- --beta betaN`。此輔助指令會執行 Parallels npm 更新/全新目標驗證、觸發 `NPM Telegram Beta E2E`、輪詢確切的工作流程執行、下載構件，並列印 Telegram 報告。
- 維護者可以透過手動的 `NPM Telegram Beta E2E` 工作流程，在 GitHub Actions 中執行相同的發布後檢查。該工作流程僅限手動執行，
  不會在每次合併時執行。
- 維護者發布自動化現在使用先預檢後升級的機制：
  - 真實的 npm publish 必須通過成功的 npm `preflight_run_id`
  - 真實的 npm publish 必須從與成功預檢執行相同的 `main` 或
    `release/YYYY.M.D` 分支觸發
  - stable npm 發布預設為 `beta`
  - stable npm publish 可以透過工作流程輸入明確指定 `latest`
  - 基於權杖的 npm dist-tag 變更現在位於
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    以確保安全性，因為 `npm dist-tag add` 仍然需要 `NPM_TOKEN`，
    而公開 repo 則維持僅限 OIDC 的發布
  - public `macOS Release` 僅供驗證；當標籤僅存在於
    發布分支上，但工作流程是從 `main` 觸發時，請設定
    `public_release_branch=release/YYYY.M.D`
  - 真正的 private mac 發布必須通過成功的 private mac
    `preflight_run_id` 和 `validate_run_id`
  - 真正的發布路徑是提升已準備好的成品，而不是重新建構
    它們
- 對於像 `YYYY.M.D-N` 這樣的穩定修正版本，發布後驗證器
  也會檢查從 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同暫存前綴升級路徑，
  以確保發布修正不會在基礎穩定負載上無聲無息地留下舊的全域安裝
- npm 發布預檢採用「失敗關閉」原則，除非 tarball 同時包含
  `dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 負載，
  以免我們再次發布空的瀏覽器儀表板
- 發布後驗證也會檢查已發布的外掛進入點和
  套件元資料是否存在於已安裝的註冊表佈局中。如果發布版本
  遺漏了外掛執行時負載，將無法通過發布後驗證器，
  並且無法被提升到 `latest`。
- `pnpm test:install:smoke` 也會對候選更新 tarball 強制執行 npm pack `unpackedSize` 預算，
  以便安裝程式 e2e 能在發布路徑之前捕捉到意外的打包膨脹
- 如果發布工作涉及 CI 規劃、擴充功能時期清單，或
  擴充功能測試矩陣，請在批准前從
  `.github/workflows/plugin-prerelease.yml` 重新產生並審查由規劃器擁有的
  `plugin-prerelease-extension-shard` 矩陣輸出，以免發布說明
  描述過時的 CI 佈局
- 穩定 macOS 發布準備工作還包括更新程式介面：
  - GitHub 發布最終必須包含打包好的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - `main` 上的 `appcast.xml` 必須在發布後指向新的穩定 zip 檔案；
    private macOS 發布工作流程會自動提交它，或在直接推送被阻擋時開啟 appcast PR
  - 封裝的應用程式必須保持非偵錯的 bundle ID、非空白的 Sparkle feed
    URL，以及一個 `CFBundleVersion`，且版本必須等於或高於該發行版本的
    標準 Sparkle 建置底限

## 發行測試環境

`Full Release Validation` 是操作員從單一入口點啟動所有發行前測試的
方式。若要在快速變動的分支上進行釘選提交的驗證，請使用此
輔助工具，讓每個子工作流程都從固定於目標
SHA 的暫時分支執行：

```bash
pnpm ci:full-release --sha <full-sha>
```

該輔助工具會推送 `release-ci/<sha>-...`，從該分支使用 `ref=<sha>`
分派 `Full Release Validation`，驗證每個子工作流程的 `headSha`
都符合目標，然後刪除暫時分支。這可以避免意外證明較新的
`main` 子執行。

若要驗證發行分支或標籤，請從受信任的 `main` 工作流程
ref 執行，並將發行分支或標籤作為 `ref` 傳入：

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N
```

工作流程會解析目標引用，帶著 `target_ref=<release-ref>` 手動觸發 `CI`，觸發 `OpenClaw Release Checks`，為面向套件的檢查準備父層 `release-package-under-test` 構件，並且當設定 `release_profile=full` 且帶有 `rerun_group=all` 時，或當設定 `release_package_spec` 或 `npm_telegram_package_spec` 時，觸發獨立套件 Telegram E2E。`OpenClaw Release Checks` 接著會展開安裝冒煙測試、跨作業系統版本檢查、啟用 soak 時的即時/E2E Docker 版本路徑覆蓋率、含 Telegram 套件 QA 的套件驗收、QA Lab 一致性、即時 Matrix 以及即時 Telegram。只有當 `Full Release Validation` 摘要顯示 `normal_ci` 和 `release_checks` 成功時，完整執行才可接受。在完整/全部模式下，`npm_telegram` 子項也必須成功；在完整/全部模式之外則會跳過，除非提供了已發布的 `release_package_spec` 或 `npm_telegram_package_spec`。最終驗證器摘要包含每個子項執行的最慢任務表，因此發布管理員無需下載日誌即可查看目前的關鍵路徑。請參閱 [完整發布驗證](/zh-Hant/reference/full-release-validation) 以了解完整的階段矩陣、確切的工作流程任務名稱、穩定版與完整設定檔的差異、構件以及專注的重新執行控制代碼。子工作流程是從執行 `Full Release
Validation`, normally `--ref main`, even when the target `ref` 的受信任引用觸發的，該引用指向較舊的發布分支或標籤。沒有個別的 Full Release Validation workflow-ref 輸入；請透過選擇工作流程執行引用來選擇受信任的控制系統。請勿使用 `--ref main -f ref=<sha>` 來作為移動 `main` 的確切提交證明；原始提交 SHA 無法成為工作流程觸發引用，因此請使用 `pnpm ci:full-release --sha <sha>` 來建立固定的暫時分支。

使用 `release_profile` 來選擇即時/供應商的覆蓋範圍：

- `minimum`：最快的發布關鍵 OpenAI/核心即時和 Docker 路徑
- `stable`：最低限度的加上穩定的供應商/後端覆蓋範圍，以供發布核准
- `full`：穩定的加上廣泛的諮詢供應商/媒體覆蓋範圍

當阻礙發布的通道顯示為綠燈，且您希望在推廣前進行詳盡的 live/E2E、Docker 發布路徑以及有界發布升級存留掃描時，請使用 `run_release_soak=true` 搭配 `stable`。該掃描涵蓋最新的四個穩定套件，加上固定的 `2026.4.23` 和 `2026.5.2` 基準，以及較舊的 `2026.4.15` 覆蓋範圍，並移除重複的基準，且將每個基準分片到其自己的 Docker runner job 中。`full` 暗示 `run_release_soak=true`。

`OpenClaw Release Checks` 使用受信任的工作流程參照將目標參照解析一次為 `release-package-under-test`，並在 soak 執行時於跨作業系統、套件驗收和發布路徑 Docker 檢查中重複使用該產物。這讓所有面向套件的方塊都保持相同的位元組，並避免重複的套件建置。當 beta 版本已經在 npm 上時，設定 `release_package_spec=openclaw@YYYY.M.D-beta.N`，讓發布檢查下載已發布的套件一次，從 `dist/build-info.json` 提取其建置原始碼 SHA，並在跨作業系統、套件驗收、發布路徑 Docker 和套件 Telegram 通道中重複使用該產物。當 repo/org 變數已設定時，跨作業系統 OpenAI 安裝冒煙測試使用 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否則使用 `openai/gpt-5.4`，因為此通道正在驗證套件安裝、上手、閘道啟動和一次即時代理程式回合，而不是對最慢的預設模型進行基準測試。更廣泛的即時供應商矩陣仍是特定模型覆蓋範圍的地方。

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

在針對性修復後的第一次重新執行中，請勿使用完整的覆蓋範圍。如果某個測試區塊失敗，請針對下一次驗證使用失敗的子工作流程、作業、Docker 通道、套件設定檔、模型提供者或 QA 通道。僅當修復變更了共用的發行協調流程，或導致先前的所有區塊證據過期時，才再次執行完整的覆蓋範圍。覆蓋範圍的最終驗證器會重新檢查記錄的子工作流程執行 ID，因此在子工作流程成功重新執行後，僅需重新執行失敗的 `Verify full validation` 父作業。

對於受限恢復，請將 `rerun_group` 傳遞給 umbrella。`all` 是真正的 release-candidate 執行，`ci` 僅執行正常 CI 子任務，`plugin-prerelease` 僅執行 release-only plugin 子任務，`release-checks` 執行每個 release box，而較窄的 release 群組為 `install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 和 `npm-telegram`。專注的 `npm-telegram` 重新執行需要 `release_package_spec` 或 `npm_telegram_package_spec`；使用 `release_profile=full` 的完整/所有執行會使用 release-checks package 成品。專注的跨 OS 重新執行可以新增 `cross_os_suite_filter=windows/packaged-upgrade` 或其他 OS/suite 篩選器。QA release-check 失敗僅供參考，標準執行時期工具覆蓋範圍閘道除外，當所需的 OpenClaw 動態工具從標準層級摘要中漂移或消失時，該閘道會阻擋釋放驗證。

### Vitest

Vitest box 是手動 `CI` 子工作流程。手動 CI 會刻意繞過變更範圍限定，並為釋放候選版本強制執行正常測試圖表：Linux Node 分片、bundled-plugin 分片、plugin 和 channel contract 分片、Node 22 相容性、`check-*`、`check-additional-*`、建構成品冒煙測試、文件檢查、Python 技能、Windows、macOS、Android 和 Control UI i18n。

請使用此測試區塊來回答「原始碼樹是否通過了完整的一般測試套件？」。這與發行路徑產品驗證不同。需保留的證據：

- `Full Release Validation` 摘要，顯示已分派的 `CI` 執行 URL
- `CI` 在確切的目標 SHA 上運行通過
- 在調查回歸時，來自 CI 作業的失敗或緩慢的分片名稱
- 當運行需要效能分析時的 Vitests 時間工件，例如 `.artifacts/vitest-shard-timings.json`

僅當發佈需要確定性的一般 CI 但不需要 Docker、QA Lab、即時、跨作業系統或套件盒時，才直接執行手動 CI：

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

Docker 盒位於 `OpenClaw Release Checks` 至
`openclaw-live-and-e2e-checks-reusable.yml`，加上發佈模式的
`install-smoke` 工作流程。它透過打包的
Docker 環境驗證發佈候選版本，而不僅僅是原始碼層級的測試。

發佈 Docker 涵蓋範圍包括：

- 完整安裝冒煙測試，並啟用緩慢的 Bun 全域安裝冒煙測試
- 透過目標 SHA 準備/重用根 Dockerfile 冒煙測試映像，並將 QR、
  根/閘道以及安裝程式/Bun 冒煙測試作業作為單獨的安裝冒煙測試
  分片執行
- 儲存庫 E2E 通道
- 發佈路徑 Docker 區塊：`core`、`package-update-openai`、
  `package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、
  `plugins-runtime-services`、
  `plugins-runtime-install-a`、`plugins-runtime-install-b`、
  `plugins-runtime-install-c`、`plugins-runtime-install-d`、
  `plugins-runtime-install-e`、`plugins-runtime-install-f`、
  `plugins-runtime-install-g` 以及 `plugins-runtime-install-h`
- 在要求時，`plugins-runtime-services` 區塊內的 OpenWebUI 涵蓋範圍
- 拆分的捆綁外掛程式安裝/解除安裝通道
  `bundled-plugin-install-uninstall-0` 至
  `bundled-plugin-install-uninstall-23`
- 當發佈檢查包含即時套件時的即時/E2E 提供者套件和 Docker 即時模型涵蓋範圍

在重新執行之前使用 Docker 成品。release-path 排程器會上傳 `.artifacts/docker-tests/`，其中包含通道日誌、`summary.json`、`failures.json`、階段計時、排程器計畫 JSON 和重新執行指令。若要專注於修復，請在可重複使用的 live/E2E 工作流程上使用 `docker_lanes=<lane[,lane]>`，而不是重新執行所有 release 區塊。產生的重新執行指令會在可用時包含先前的 `package_artifact_run_id` 和準備好的 Docker 映像檔輸入，因此失敗的通道可以重複使用相同的 tarball 和 GHCR 映像檔。

### QA Lab

QA Lab 方塊也是 `OpenClaw Release Checks` 的一部分。它是代理行為和通道層級的 release 閘道，與 Vitest 和 Docker 打包機制分開。

Release QA Lab 涵蓋範圍包括：

- mock parity lane，使用代理 parity pack 將 OpenAI 候選通道與 Opus 4.6 基準進行比較
- 使用 `qa-live-shared` 環境的快速 live Matrix QA 設定檔
- 使用 Convex CI 憑證租約的 live Telegram QA 通道
- 當 release 遙測需要明確的本機證明時 `pnpm qa:otel:smoke`

使用此方塊來回答「release 在 QA 情境和 live channel 流程中是否表現正常？」在批准 release 時，請保留 parity、Matrix 和 Telegram 通道的成品 URL。完整的 Matrix 涵蓋範圍仍然可作為手動分片 QA-Lab 執行使用，而非預設的 release 關鍵通道。

### Package

Package 方塊是可安裝產品的閘道。它由 `Package Acceptance` 和解析器 `scripts/resolve-openclaw-package-candidate.mjs` 支援。解析器會將候選版本正規化為 Docker E2E 使用的 `package-under-test` tarball，驗證套件庫存，記錄套件版本和 SHA-256，並將工作流程 harness ref 與套件來源 ref 分開保存。

支援的候選來源：

- `source=npm`：`openclaw@beta`、`openclaw@latest` 或確切的 OpenClaw release 版本
- `source=ref`：使用選定的 `workflow_ref` harness 封裝受信任的 `package_ref` 分支、標籤或完整 commit SHA
- `source=url`：下載具有必要 `package_sha256` 的 HTTPS `.tgz`
- `source=artifact`：重複使用另一個 GitHub Actions 執行上傳的 `.tgz`

`OpenClaw Release Checks` 使用 `source=artifact`（準備好的發布套件成品）、`suite_profile=custom`、`docker_lanes=doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update` 和 `telegram_mode=mock-openai` 執行套件驗收。套件驗收會針對同一個已解析的 tarball 保留遷移、更新、已配置身份驗證更新重啟、即時 ClawHub 技能安裝、過時外掛相依性清理、離線外掛固定裝置、外掛更新以及 Telegram 套件 QA。阻斷式發布檢查使用預設的最新發布套件基準；`run_release_soak=true` 或 `release_profile=full` 會展開從 `2026.4.23` 到 `latest` 的每一個穩定 npm 發布基準，再加上回報問題的固定裝置。對於已發布的候選版本，請搭配 `source=npm` 使用套件驗收；對於發布前以 SHA 支援的本地 npm tarball，請搭配 `source=ref`/`source=artifact` 使用。這是原生 GitHub 解決方案，取代了先前大多需要 Parallels 的套件/更新覆蓋率。跨 OS 發布檢查對於 OS 特定的上手、安裝程式和平台行為仍然很重要，但套件/更新產品驗證應優先使用套件驗收。

更新和外掛驗證的正式檢查清單是[測試更新和外掛](/zh-Hant/help/testing-updates-plugins)。在決定使用哪個本地、Docker、套件驗收或發布檢查通道來證明外掛安裝/更新、doctor 清理或已發布套件遷移變更時，請使用此清單。從每個穩定 `2026.4.23+` 套件進行徹底的已發布更新遷移，是一個獨立的手動 `Update Migration` 工作流程，並非完整發布 CI 的一部分。

舊版套件接納的寬限期是刻意設定時間限制的。透過
`2026.4.25` 的套件可以使用相容性路徑來處理已發布至 npm 的元數據缺漏：tarball 中缺少的私有 QA 清單項目、缺少的
`gateway install --wrapper`、從 tarball 衍生的 git fixture 中缺少的 patch 檔案、缺少已保存的
`update.channel`、舊版外掛程式安裝記錄位置、缺少的市集安裝記錄持久性，以及在 `plugins update` 期間的設定元數據遷移。已發布的
`2026.4.26` 套件可能會針對已隨附的本地建置元數據戳記檔案發出警告。後續的套件必須符合現代套件合約；這些相同的缺漏將導致發布驗證失敗。

當發布問題涉及實際可安裝的套件時，請使用更廣泛的套件接納設定檔：

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

- `smoke`：快速套件安裝/通道/代理程式、閘道網路和設定
  重新載入通道
- `package`：安裝/更新/重新啟動/外掛程式套件合約加上即時 ClawHub
  技能安裝證明；這是發布檢查的預設值
- `product`：`package` 加上 MCP 通道、cron/子代理程式清理、OpenAI 網頁
  搜尋和 OpenWebUI
- `full`：包含 OpenWebUI 的 Docker 發布路徑區塊
- `custom`：用於專注重新執行的確切 `docker_lanes` 列表

若要進行套件候選版本的 Telegram 證明，請在套件接納上啟用
`telegram_mode=mock-openai` 或
`telegram_mode=live-frontier`。工作流程會將解析後的
`package-under-test` tarball 傳遞至 Telegram 通道；獨立的 Telegram
工作流程仍然接受已發布的 npm 規格以進行發布後檢查。

## 發布發布自動化

`OpenClaw Release Publish` 是正常的變更發布進入點。它
會按照發布所需的順序協調受信任發布者工作流程：

1. 检出發布標籤並解析其提交 SHA。
2. 驗證標籤是否可從 `main` 或 `release/*` 抵達。
3. 執行 `pnpm plugins:sync:check`。
4. 使用 `Plugin NPM Release` 和
   `ref=<release-sha>` 觸發 `publish_scope=all-publishable`。
5. 使用相同的 scope 和 SHA 觸發 `Plugin ClawHub Release`。
6. 使用 release tag、npm dist-tag 和
   儲存的 `preflight_run_id` 觸發 `OpenClaw NPM Release`。

Beta 發布範例：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

發布到預設 beta dist-tag 的穩定版：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

直接推廣到 `latest` 的穩定版是明確指定的：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=latest
```

僅針對特定的修復或重新發布工作，使用底層的 `Plugin NPM Release` 和 `Plugin ClawHub Release` 工作流程。
對於選定的外掛修復，將 `plugin_publish_scope=selected` 和 `plugins=@openclaw/name` 傳遞給
`OpenClaw Release Publish`，或者當
OpenClaw 套件絕不能發布時，直接觸發子工作流程。

## NPM 工作流程輸入

`OpenClaw NPM Release` 接受這些由操作員控制的輸入：

- `tag`：必需的 release tag，例如 `v2026.4.2`、`v2026.4.2-1` 或
  `v2026.4.2-beta.1`；當 `preflight_only=true` 時，它也可以是目前完整的
  40 字元 workflow-branch commit SHA，僅用於驗證用途的 preflight
- `preflight_only`：`true` 僅用於驗證/建置/打包，`false` 用於
  真實的發布途徑
- `preflight_run_id`：在真實發布途徑上為必需項，以便工作流程重複使用
  來自成功 preflight 執行的已準備 tarball
- `npm_dist_tag`：發布途徑的 npm 目標 tag；預設為 `beta`

`OpenClaw Release Publish` 接受這些由操作員控制的輸入：

- `tag`：必需的 release tag；必須已經存在
- `preflight_run_id`：成功的 `OpenClaw NPM Release` preflight 執行 id；
  當 `publish_openclaw_npm=true` 時為必需項
- `npm_dist_tag`：OpenClaw 套件的 npm 目標 tag
- `plugin_publish_scope`：預設為 `all-publishable`；僅針對
  特定的修復工作使用 `selected`
- `plugins`：以逗號分隔的 `@openclaw/*` 套件名稱，當
  `plugin_publish_scope=selected`
- `publish_openclaw_npm`：預設為 `true`；僅當將工作流程
  作為僅限外掛程式的修補協調器時，才設定 `false`
- `wait_for_clawhub`：預設為 `false`，因此 npm 的可用性不會被
  ClawHub sidecar 阻擋；僅當工作流程完成必須包含
  ClawHub 完成時，才設定 `true`

`OpenClaw Release Checks` 接受這些由操作員控制的輸入：

- `ref`：要驗證的分支、標籤或完整提交 SHA。承載密鑰的檢查
  要求解析出的提交必須可從 OpenClaw 分支或
  發布標籤抵達。
- `run_release_soak`：選擇加入詳盡的 live/E2E、Docker 發布路徑，以及
  對穩定/預設發布檢查進行 all-since 升級存留 soak。它被
  `release_profile=full` 強制開啟。

規則：

- 穩定版和修正版標籤可以發布到 `beta` 或 `latest`
- Beta 發布前標籤只能發布到 `beta`
- 對於 `OpenClaw NPM Release`，僅當
  `preflight_only=true` 時才允許輸入完整的提交 SHA
- `OpenClaw Release Checks` 和 `Full Release Validation` 始終
  僅用於驗證
- 實際的發布路徑必須使用與飛行前檢查期間使用的相同 `npm_dist_tag`；
  工作流程會在繼續發布前驗證該元資料

## 穩定 npm 發布程序

當建立穩定 npm 發布時：

1. 使用 `preflight_only=true` 執行 `OpenClaw NPM Release`
   - 在標籤存在之前，您可以使用當前完整的工作流程分支提交
     SHA 來對飛行前檢查工作流程進行僅驗證的試執行
2. 為正常的 beta 優先流程選擇 `npm_dist_tag=beta`，或者僅當
   您有意要進行直接穩定發布時才選擇 `latest`
3. 當您想要從一個手動工作流程獲得標準 CI 以及即時提示快取、Docker、QA Lab、Matrix 和 Telegram 的覆蓋範圍時，請在發布分支、發布標籤或完整的
   提交 SHA 上執行 `Full Release Validation`
4. 如果您有意只需要確定性的標準測試圖表，請改為在發布 ref 上執行
   手動的 `CI` 工作流程
5. 儲存成功的 `preflight_run_id`
6. 使用相同的 `tag`、相同的 `npm_dist_tag` 和儲存的 `preflight_run_id` 執行 `OpenClaw Release Publish`；它會在推廣 OpenClaw npm 套件之前將外掛化外掛程式發布到 npm
   和 ClawHub
7. 如果發布落在了 `beta` 上，請使用私有的
   `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
   工作流程將該穩定版本從 `beta` 推廣到 `latest`
8. 如果發布刻意直接發布到 `latest` 且 `beta` 應立即跟進相同的穩定建置，請使用該相同的私有
   工作流程將兩個 dist-tags 指向該穩定版本，或者讓其排程的
   自動修復同步稍後移動 `beta`

出於安全考量，dist-tag 變更位於私有存放庫中，因為它仍
需要 `NPM_TOKEN`，而公開存放庫則保持僅限 OIDC 發布。

這樣可以確保直接發布路徑和 beta 優先推廣路徑都有
文件記錄並且對操作員可見。

如果維護者必須回退到本機 npm 認證，請僅在專用的 tmux 工作階段內執行任何 1Password
CLI (`op`) 指令。請勿直接從主要代理程式 shell 呼叫 `op`；將其保留在 tmux 內可讓提示、
警報和 OTP 處理可被觀察，並防止重複的主機警報。

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
中的私有發佈文件作為實際的操作手冊。

## 相關

- [發佈通道](/zh-Hant/install/development-channels)
