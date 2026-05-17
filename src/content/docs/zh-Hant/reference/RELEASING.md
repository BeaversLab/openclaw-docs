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
6. 使用 `preflight_only=true` 執行 `OpenClaw NPM Release`。在標籤存在之前，允許使用完整的 40 個字元的 release-branch SHA 進行僅驗證預檢。請儲存成功的 `preflight_run_id`。
7. 針對發行分支、標籤或完整的提交 SHA，使用 `Full Release Validation` 啟動所有發行前測試。這是四大發行測試箱 Vitest、Docker、QA Lab 和 Package 的唯一手動進入點。
8. 如果驗證失敗，請在發布分支上修復，並重新執行能證明修復的最小失敗檔案、通道、工作流程作業、套件設定檔、提供者或模型允許清單。僅在變更的範圍使先前的證據失效時，才重新執行完整的整體測試。
9. 對於 Beta 版，標記 `vYYYY.M.D-beta.N`，然後從匹配的 `release/YYYY.M.D` 分支執行 `OpenClaw Release Publish`。它會驗證 `pnpm plugins:sync:check`，將所有可發布的插件套件並行分發至 npm 以及相同組的套件至 ClawHub，然後在插件 npm 發布成功後，立即使用匹配的 dist-tag 提升準備好的 OpenClaw npm preflight 成品。在 OpenClaw npm 發布子任務成功後，它會根據完整的匹配 `CHANGELOG.md` 區塊建立或更新匹配的 GitHub release/prerelease 頁面。發布至 npm `latest` 的 Stable 版本會成為 GitHub 的 latest release；保留在 npm `beta` 的 stable 維護版本則會使用 GitHub `latest=false` 建立。在 OpenClaw npm 發布時，ClawHub 發布可能仍在執行中，但 release publish 工作流程會立即列印子任務的執行 ID。預設情況下，它不會等待 ClawHub，因此 OpenClaw npm 的可用性不會因較慢的 ClawHub 審核或登錄庫工作而被阻擋；若 ClawHub 必須阻擋工作流程完成，請設定 `wait_for_clawhub=true`。ClawHub 路徑會重試暫時性的 CLI 依賴安裝失敗，即使其中一個 preview 格位發生不穩定也會發布通過預覽的插件，並會對每個預期的插件版本進行登錄庫驗證，以便部分發布保持可見且可重試。發布後，執行
   `pnpm release:verify-beta -- YYYY.M.D-beta.N --openclaw-npm-run <run-id> --plugin-npm-run <run-id> --plugin-clawhub-run <run-id>`
   以從單一指令驗證 GitHub prerelease、npm `beta` dist-tags、npm 完整性、已發布的安裝路徑、ClawHub 確切版本、ClawHub 成品以及子工作流程結論。當 ClawHub sidecar 僅在可重試的任務中失敗且應就地重新執行時，請新增 `--rerun-failed-clawhub`。然後對已發布的 `openclaw@YYYY.M.D-beta.N` 或
   `openclaw@beta` 套件執行發布後套件驗收。如果推送或發布的 prerelease 需要修復，請切出下一個匹配的 prerelease 編號；請勿刪除或重寫舊的 prerelease。
10. 對於穩定版，僅在經過審核的 Beta 或候選版本具備
    所需的驗證證據後繼續。穩定版 npm 發佈也會通過
    `OpenClaw Release Publish`，並透過 `preflight_run_id` 重用成功的 preflight 成品；
    穩定版 macOS 發佈準備工作還需要在 `main` 上
    打包好的 `.zip`、`.dmg`、`.dSYM.zip`，以及更新的 `appcast.xml`。
    私有 macOS 發佈工作流程會在發佈資產驗證後，自動將簽署的 appcast 發佈到公開的
    `main`；如果分支保護阻止
    直接推送，它將開啟或更新 appcast PR。
11. 發佈後，執行 npm 發佈後驗證器，當您需要發佈後頻道證明時
    執行可選的獨立 published-npm Telegram E2E，視需要執行 dist-tag 推廣，驗證
    生成的 GitHub 發行頁面，並執行發佈公告步驟。

## 發布飛行前檢查

- 在發佈 preflight 之前執行 `pnpm check:test-types`，以便測試 TypeScript
  在更快的本機 `pnpm check` 閘道之外保持覆蓋
- 在發佈 preflight 之前執行 `pnpm check:architecture`，以便更廣泛的匯入
  迴圈和架構邊界檢查在更快的本機閘道之外顯示為綠燈（通過）
- 在 `pnpm release:check` 之前執行 `pnpm build && pnpm ui:build`，以便預期的
  `dist/*` 發佈資產和 Control UI bundle 存在於打包
  驗證步驟中
- 在根版本遞增之後和標記之前執行 `pnpm release:prep`。它
  會執行每個確定性發佈產生器，這些產生器通常在版本/設定/API
  變更後會發生偏移：外掛程式版本、外掛程式清單、基礎設定
  架構、捆綁的頻道設定元資料、設定文件基準、外掛程式 SDK
  匯出以及外掛程式 SDK API 基準。`pnpm release:check` 會以檢查模式
  重新執行這些守衛，並在執行套件發佈檢查之前，在一次通過中報告它找到的每個生成的偏移失敗。
- 在發布核准之前執行手動 `Full Release Validation` 工作流程，以便從單一入口點啟動所有發布前測試箱。它接受分支、標籤或完整的提交 SHA，觸發手動 `CI`，並觸發 `OpenClaw Release Checks` 以進行安裝冒煙測試、套件驗收、跨作業系統套件檢查、QA Lab 一致性、Matrix 和 Telegram 通道。Stable/預設執行會將詳盡的 live/E2E 和 Docker 發布路徑浸泡測試保留在 `run_release_soak=true` 之後；`release_profile=full` 會強制開啟浸泡測試。使用 `release_profile=full` 和 `rerun_group=all`，它也會針對來自發布檢查的 `release-package-under-test` 成果執行套件 Telegram E2E。在發布 beta 版之後提供 `release_package_spec`，以便在發布檢查、套件驗收和套件 Telegram E2E 之間重複使用已發布的 npm 套件，而無需重新建置發布 tarball。僅當 Telegram 應該使用與其餘發布驗證不同的已發布套件時，才提供 `npm_telegram_package_spec`。當套件驗收應該使用與發布套件規格不同的已發布套件時，提供 `package_acceptance_package_spec`。當私人證據報告應證明驗證與已發布的 npm 套件相符，而不強制執行 Telegram E2E 時，提供 `evidence_package_spec`。範例：
  `gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D`
- 當您希望在發布工作繼續進行時，為套件候選版本獲得側通道證明，請執行手動 `Package Acceptance` 工作流程。針對 `openclaw@beta`、`openclaw@latest` 或精確的發布版本，請使用 `source=npm`；使用 `source=ref` 以當前的 `workflow_ref` 測試套件打包受信任的 `package_ref` 分支/標籤/SHA；針對具有必要 SHA-256 的 HTTPS tarball，請使用 `source=url`；或是針對由其他 GitHub Actions 執行上傳的 tarball，請使用 `source=artifact`。此工作流程會將候選版本解析為 `package-under-test`，針對該 tarball 重用 Docker E2E 發布排程器，並可使用 `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier` 對同一 tarball 執行 Telegram QA。當選取的 Docker 通道包含 `published-upgrade-survivor` 時，套件產物即為候選版本，而 `published_upgrade_survivor_baseline` 會選取已發布的基準版本。`update-restart-auth` 使用候選套件作為已安裝的 CLI 和受測套件，因此它會執行候選更新命令的受控重啟路徑。
  範例：`gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f published_upgrade_survivor_baseline=openclaw@2026.4.26 -f telegram_mode=mock-openai`
  常用設定檔：
  - `smoke`：安裝/通道/代理程式、閘道網路和設定檔重載通道
  - `package`：不含 OpenWebUI 或即時 ClawHub 的產物原生套件/更新/重啟/外掛通道
  - `product`：套件設定檔加上 MCP 通道、cron/子代理程式清理、OpenAI 網路搜尋和 OpenWebUI
  - `full`：含 OpenWebUI 的 Docker 發布路徑區塊
  - `custom`：用於專注重新執行的精確 `docker_lanes` 選取
- 當您只需要釋放候選版本的完整正常 CI 覆蓋率時，請直接執行手動 `CI` 工作流程。手動 CI 調度會繞過變更範圍，並強制執行 Linux Node 分區、bundled-plugin 分區、通道合約、Node 22 相容性、`check`、`check-additional`、建置冒煙測試、文件檢查、Python 技能、Windows、macOS、Android 和 Control UI i18n 分區。
  範例：`gh workflow run ci.yml --ref release/YYYY.M.D`
- 驗證釋放遙測時，請執行 `pnpm qa:otel:smoke`。它會透過本機 OTLP/HTTP 接收器執行 QA-lab，並驗證匯出的追蹤 span 名稱、有界屬性以及內容/識別符編輯，而無需 Opik、Langfuse 或其他外部收集器。
- 在每次標記釋放之前執行 `pnpm release:check`
- 在標記存在之後，執行 `OpenClaw Release Publish` 以進行變更發布序列。從 `release/YYYY.M.D` 調度它（或在發布可從 main 存取的標記時使用 `main`），傳入釋放標記和成功的 OpenClaw npm `preflight_run_id`，並保留預設的外掛發布範圍 `all-publishable`，除非您正在刻意執行專注的修復。該工作流程會序列化外掛 npm 發布、外掛 ClawHub 發布和 OpenClaw npm 發布，因此核心套件不會在其外部化外掛之前發布。
- 釋放檢查現今在獨立的手動工作流程中執行：
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` 也會在釋放核准前執行 QA Lab 模擬同位分區，以及快速即時 Matrix 設定檔和 Telegram QA 分區。即時分區使用 `qa-live-shared` 環境；Telegram 也使用 Convex CI 憑證租用。當您需要完整的 Matrix 傳輸、媒體和 E2EE 清單時，請執行手動 `QA-Lab - All Lanes` 工作流程，並啟用 `matrix_profile=all` 和 `matrix_shards=true`。
- 跨 OS 安裝和升級執行時期驗證是公用 `OpenClaw Release Checks` 和 `Full Release Validation` 的一部分，它們會直接呼叫
  可重複使用的工作流程
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- 此區分是有意的：保持真正的 npm 發布路徑簡短、確定性並以構件為重點，而較慢的即時檢查則留在各自的通道中，以免它們阻滯或阻擋發布
- 承載密鑰的發布檢查應透過 `Full Release
Validation` or from the `main`/release workflow ref 進行分派，以便工作流程邏輯
  和密鑰保持受控
- `OpenClaw Release Checks` 接受分支、標籤或完整的 commit SHA，只要
  解析出的 commit 可從 OpenClaw 分支或發布標籤到達即可
- `OpenClaw NPM Release` 僅驗證的預檢也接受當前
  完整的 40 字元工作流程分支 commit SHA，而無需推送標籤
- 該 SHA 路徑僅用於驗證，無法升級為真正的發布
- 在 SHA 模式下，工作流程僅針對
  套件元資料檢查合成 `v<package.json version>`；實際發布仍需要實際的發布標籤
- 這兩個工作流程都將真正的發布和升級路徑保留在 GitHub 託管的 Runner 上，而非變更的驗證路徑則可以使用更大的 Blacksmith Linux Runner
- 該工作流程使用
  `OPENAI_API_KEY` 和 `ANTHROPIC_API_KEY` 工作流程密鑰來執行
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
- npm 發布預檢不再等待個別的發布檢查通道
- 在本機標記發布候選版本之前，請執行
  `RELEASE_TAG=vYYYY.M.D-beta.N pnpm release:fast-pretag-check`。此輔助工具
  會依序執行快速發布防護機制、外掛 npm/ClawHub 發布檢查、建置、
  UI 建置和 `release:openclaw:npm:check`，以便在 GitHub 發布工作流程開始前
  攔截常見的阻礙審批的錯誤。
- 在審批前執行 `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  （或對應的 beta/correction 標籤）
- 在 npm 發布後，執行
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  （或對應的 beta/correction 版本），以在全新的暫存前綴中驗證已發布的註冊表
  安裝路徑
- 在 beta 發布後，執行 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`
  以使用共用的租用 Telegram 憑證
  池，對已發布的 npm 套件驗證已安裝套件的上架、Telegram 設定和真實 Telegram E2E。
  本機維護者的臨時操作可能會省略 Convex 變數，並直接傳遞三個
  `OPENCLAW_QA_TELEGRAM_*` 環境憑證。
- 若要從維護者機器執行完整的發布後 beta 測試，請使用 `pnpm release:beta-smoke -- --beta betaN`。此輔助工具會執行 Parallels npm 更新/全新目標驗證、分派 `NPM Telegram Beta E2E`、輪詢確切的工作流程執行、下載成果並列印 Telegram 報告。
- 維護者可以透過
  手動 `NPM Telegram Beta E2E` 工作流程從 GitHub Actions 執行相同的發布後檢查。它被刻意設計為僅限手動，
  不會在每次合併時執行。
- 維護者發布自動化現在使用先預檢再升級的方式：
  - 真實的 npm 發布必須通過成功的 npm `preflight_run_id`
  - 真實的 npm 發布必須從與成功的預檢運行相同的 `main` 或
    `release/YYYY.M.D` 分派
  - 穩定版 npm 發布預設為 `beta`
  - 穩定版 npm 發布可以透過 workflow input 明確指定 `latest`
  - 基於 token 的 npm dist-tag 變更現位於
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    中，出於安全原因，因為 `npm dist-tag add` 仍然需要 `NPM_TOKEN`，而
    公共 repo 則保持僅限 OIDC 發布
  - 公共 `macOS Release` 僅用於驗證；當 tag 僅存在於
    發布分支上但工作流程是從 `main` 分派時，請設定
    `public_release_branch=release/YYYY.M.D`
  - 真實的私有 mac 發布必須通過成功的私有 mac
    `preflight_run_id` 和 `validate_run_id`
  - 真實的發布途徑會提升已準備的產物，而不是再次重建它們
- 對於像 `YYYY.M.D-N` 這樣的穩定版修正發布，發布後驗證器
  也會檢查從 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同 temp-prefix 升級途徑，
  以確保發布修正不會在基礎穩定版 payload 上無聲地留下較舊的全域安裝
- npm 發布預檢採取失敗關閉策略，除非 tarball 包含
  `dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` payload，
  以免我們再次發送空的瀏覽器儀表板
- 發布後驗證還會檢查已發布的插件入口點和
  套件元數據是否存在於已安裝的 registry layout 中。如果發布
  缺少插件運行時 payload，則無法通過發布後驗證器，
  並且無法升級到 `latest`。
- `pnpm test:install:smoke` 也會在候選更新 tarball 上執行 npm pack `unpackedSize` 預算限制，
  以便安裝程式 e2e 能在發布途徑之前捕獲意外的打包膨脹
- 如果發行工作涉及 CI 規劃、擴充功能時段清單或擴充功能測試矩陣，請在批准前重新生成並檢閱來自 `.github/workflows/plugin-prerelease.yml` 的計畫者擁有的 `plugin-prerelease-extension-shard` 矩陣輸出，以免發行說明描述過時的 CI 佈局
- 穩定版 macOS 發行準備工作還包括更新器表面：
  - GitHub 發行最終必須包含封裝好的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - `main` 上的 `appcast.xml` 在發佈後必須指向新的穩定版 zip；私人 macOS 發佈工作流程會自動提交它，或在無法直接推送時開啟 appcast PR
  - 封裝的應用程式必須保持非除錯 bundle id、非空白的 Sparkle feed URL，以及高於或等於該發行版本標準 Sparkle 建置底限的 `CFBundleVersion`

## 發行測試環境

`Full Release Validation` 是操作員從單一入口點啟動所有發行前測試的方式。若要在快速變動的分支上進行固定提交驗證，請使用輔助程式，讓每個子工作流程都從固定在目標 SHA 的暫存分支執行：

```bash
pnpm ci:full-release --sha <full-sha>
```

輔助程式會推送 `release-ci/<sha>-...`，從該分支使用 `ref=<sha>` 分派 `Full Release Validation`，驗證每個子工作流程 `headSha` 都符合目標，然後刪除暫存分支。這可以避免意外驗證較新的 `main` 子執行。

若要進行發行分支或標籤驗證，請從受信任的 `main` 工作流程 ref 執行它，並將發行分支或標籤作為 `ref` 傳遞：

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N
```

工作流程會解析目標引用，使用 `target_ref=<release-ref>` 手動觸發 `CI`，觸發 `OpenClaw Release Checks`，準備用於套件檢查的父級 `release-package-under-test` 成品，並在帶有 `rerun_group=all` 的 `release_profile=full` 時，或當設定 `release_package_spec` 或 `npm_telegram_package_spec` 時，觸發獨立的套件 Telegram E2E。`OpenClaw Release Checks` 然後會展開安裝冒煙測試、跨作業系統發布檢查、啟用 soak 時的即時/E2E Docker 發布路徑覆蓋率、包含 Telegram 套件 QA 的套件驗收、QA Lab 一致性、即時 Matrix 以及即時 Telegram。只有當 `Full Release Validation` 摘要顯示 `normal_ci` 和 `release_checks` 成功時，完整執行才被接受。在完整/全部模式下，`npm_telegram` 子項也必須成功；在完整/全部模式之外則會跳過，除非提供了已發布的 `release_package_spec` 或 `npm_telegram_package_spec`。最終驗證者摘要包含每個子項執行的最慢任務表，因此發布管理員可以在不下載日誌的情況下查看當前的關鍵路徑。請參閱 [完整發布驗證](/zh-Hant/reference/full-release-validation) 以了解完整的階段矩陣、精確的工作流程任務名稱、穩定版與完整設定檔的差異、成品以及專注的重新執行處理程序。子工作流程是從執行 `Full Release Validation`, normally `--ref main`, even when the target `ref` 的受信任引用所觸發，該引用指向較舊的發布分支或標籤。沒有獨立的 Full Release Validation workflow-ref 輸入；請透過選擇工作流程執行引用來選擇受信任的測試工具。請勿在移動 `main` 時使用 `--ref main -f ref=<sha>` 作為精確的提交證明；原始提交 SHA 不能作為工作流程觸發引用，因此請使用 `pnpm ci:full-release --sha <sha>` 來建立固定的臨時分支。

使用 `release_profile` 來選擇即時/提供者的廣度：

- `minimum`：最快的發布關鍵 OpenAI/核心即時和 Docker 路徑
- `stable`：批准發布所需的最低要求加上穩定的供應商/後端覆蓋範圍
- `full`：穩定加上廣泛的諮詢供應商/媒體覆蓋範圍

當阻礙發布的通道顯示為綠色，並且您希望在發布前進行全面的即時/E2E、Docker 發布路徑和有界的已發布升級存留掃描時，請搭配使用 `run_release_soak=true` 與 `stable`。該掃描覆蓋最新的四個穩定版本套件，加上固定的 `2026.4.23` 和 `2026.5.2` 基準，以及較舊的 `2026.4.15` 覆蓋範圍，並移除重複的基準，將每個基準分片到各自的 Docker runner job 中。`full` 暗示 `run_release_soak=true`。

`OpenClaw Release Checks` 使用受信任的工作流程參照將目標參照解析一次作為 `release-package-under-test`，並在浸泡執行時於跨作業系統、套件驗收和發布路徑 Docker 檢查中重複使用該產出。這確保所有面向套件的測試箱使用相同的位元組，避免重複的套件建置。當 beta 版本已經在 npm 上時，設定 `release_package_spec=openclaw@YYYY.M.D-beta.N`，以便發布檢查下載已發布的套件一次，從 `dist/build-info.json` 提取其建置來源 SHA，並在跨作業系統、套件驗收、發布路徑 Docker 和套件 Telegram 通道中重複使用該產出。當設定 repo/org 變數時，跨作業系統 OpenAI 安裝冒煙測試使用 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否則使用 `openai/gpt-5.4`，因為此通道旨在驗證套件安裝、上線、閘道啟動和一次即時代理程序輪次，而不是對最慢的預設模型進行基準測試。更廣泛的即時供應商矩陣仍然是特定模型覆蓋範圍的所在位置。

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

在針對性修復後的第一次重新執行時，請勿使用完整的 umbrella。如果某個 box 失敗，請針對下一次驗證使用失敗的子工作流程、作業、Docker lane、套件設定檔、模型供應商或 QA lane。只有當修復變更了共用的發布協調流程，或導致先前的所有 box 證據過期時，才再次執行完整的 umbrella。Umbrella 的最終驗證器會重新檢查記錄的子工作流程執行 ID，因此當子工作流程重新執行成功後，僅需重新執行失敗的 `Verify full validation` 父作業。

若要進行有限度的恢復，請將 `rerun_group` 傳遞給 umbrella。`all` 是真正的發布候選版本執行，`ci` 僅執行正常的 CI 子項，`plugin-prerelease` 僅執行僅發布的外掛程式子項，`release-checks` 執行每個發布 box，而較狹隘的發布群組為 `install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 和 `npm-telegram`。針對性 `npm-telegram` 重新執行需要 `release_package_spec` 或 `npm_telegram_package_spec`；使用 `release_profile=full` 的完整/全部執行會使用 release-checks 套件構件。針對性的跨作業系統重新執行可以加入 `cross_os_suite_filter=windows/packaged-upgrade` 或其他作業系統/套件篩選器。QA release-check 失敗僅供參考；僅限 QA 的失敗不會阻擋發布驗證。

### Vitest

Vitest box 是手動 `CI` 子工作流程。手動 CI 會刻意略過變更範圍判定，並強制對發布候選版本執行正常測試圖：Linux Node 分片、打包外掛程式分片、通道合約、Node 22 相容性、`check`、`check-additional`、建置冒煙測試、文件檢查、Python 技能、Windows、macOS、Android 和 Control UI i18n。

使用此 box 來回答「原始碼樹是否通過了完整的正常測試套件？」。這與發布路徑產品驗證不同。需保留的證據：

- 顯示已分派 `CI` 執行 URL 的 `Full Release Validation` 摘要
- `CI` 在確切的目標 SHA 上運行成功
- 在調查回歸問題時，來自 CI 任務的失敗或緩慢的分片名稱
- 當運行需要效能分析時的 Vitest 計時構件，例如 `.artifacts/vitest-shard-timings.json`

僅當發版需要確定性的正常 CI，但不需要 Docker、QA Lab、live、跨作業系統或套件測試箱時，才直接執行手動 CI：

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

Docker 測試箱存在於 `OpenClaw Release Checks` 到 `openclaw-live-and-e2e-checks-reusable.yml` 之間，以及發版模式的 `install-smoke` 工作流程中。它透過打包的 Docker 環境來驗證發版候選版本，而不僅僅是原始碼層級的測試。

發版 Docker 涵蓋範圍包括：

- 完整安裝冒煙測試，並啟用緩慢的 Bun 全域安裝冒煙測試
- 依目標 SHA 準備/重用根 Dockerfile 冒煙測試映像，包含 QR、root/gateway 和 installer/Bun 冒煙測試任務作為獨立的 install-smoke 分片執行
- 儲存庫 E2E 通道
- 發版路徑 Docker 區塊：`core`、`package-update-openai`、
  `package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、
  `plugins-runtime-services`、
  `plugins-runtime-install-a`、`plugins-runtime-install-b`、
  `plugins-runtime-install-c`、`plugins-runtime-install-d`、
  `plugins-runtime-install-e`、`plugins-runtime-install-f`、
  `plugins-runtime-install-g` 和 `plugins-runtime-install-h`
- 根據要求，在 `plugins-runtime-services` 區塊內涵蓋 OpenWebUI
- 分割的捆綁外掛程式安裝/解除安裝通道
  `bundled-plugin-install-uninstall-0` 到
  `bundled-plugin-install-uninstall-23`
- 當發版檢查包含 live 套件時的 live/E2E 提供者套件和 Docker live 模型涵蓋範圍

在重新執行之前使用 Docker 構件。release-path 排程器會上傳
`.artifacts/docker-tests/`，其中包含 lane 日誌、`summary.json`、`failures.json`、
階段計時、排程器計劃 JSON 以及重新執行指令。為了專注於恢復，
請在可重複使用的 live/E2E 工作流程上使用 `docker_lanes=<lane[,lane]>`，而不是
重新執行所有 release 區塊。生成的重新執行指令在可用時包含先前的
`package_artifact_run_id` 和準備好的 Docker 映像輸入，因此
失敗的 lane 可以重複使用相同的 tarball 和 GHCR 映像。

### QA Lab

QA Lab 方塊也是 `OpenClaw Release Checks` 的一部分。它是代理行為
和通道層級的 release 閘道，與 Vitest 和 Docker
封裝機制分開。

Release QA Lab 涵蓋範圍包括：

- mock parity lane，使用代理 parity 套件將 OpenAI 候選 lane 與 Opus 4.6
  基準進行比較
- 使用 `qa-live-shared` 環境的快速 live Matrix QA 設定檔
- 使用 Convex CI 憑證租約的 live Telegram QA lane
- 當 release 遙測需要明確的本機證明時，`pnpm qa:otel:smoke`

使用此方塊來回答「release 在 QA 情境和 live channel 流程中
的行為是否正確？」在批准 release 時，請保留 parity、Matrix 和 Telegram
lane 的構件 URL。完整的 Matrix 涵蓋範圍仍可作為
手動分片 QA-Lab 執行使用，而不是預設的 release-critical lane。

### 封裝

Package 方塊是可安裝產品的閘道。它由
`Package Acceptance` 和解析器
`scripts/resolve-openclaw-package-candidate.mjs` 支援。解析器會將
候選者正規化為 Docker E2E 使用的 `package-under-test` tarball，驗證
封裝清單，記錄封裝版本和 SHA-256，並將
workflow harness ref 與封裝來源 ref 分開保存。

支援的候選來源：

- `source=npm`：`openclaw@beta`、`openclaw@latest` 或確切的 OpenClaw release
  版本
- `source=ref`：使用選定的 `workflow_ref` harness 封裝受信任的 `package_ref` 分支、標籤或完整 commit SHA
- `source=url`：下載具有必要 `package_sha256` 的 HTTPS `.tgz`
- `source=artifact`：重用由另一個 GitHub Actions 執行上傳的 `.tgz`

`OpenClaw Release Checks` 使用準備好的發布套件工件 `source=artifact`、`suite_profile=custom`、`docker_lanes=doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update`、`telegram_mode=mock-openai` 執行套件驗收。套件驗收會針對同一個解析出的 tarball 保持遷移、更新、配置驗證更新重啟、即時 ClawHub 技能安裝、過時的外掛相依性清理、離線外掛固定裝置、外掛更新和 Telegram 套件 QA。阻塞性發布檢查使用預設的最新發布套件基線；`run_release_soak=true` 或 `release_profile=full` 展開為從 `2026.4.23` 到 `latest` 的每個穩定 npm 發布基線加上回報問題的固定裝置。對於已發布的候選版本，請使用 `source=npm` 的套件驗收，或在發布前對於基於 SHA 的本機 npm tarball 使用 `source=ref`/`source=artifact`。這是先前需要 Parallels 的大部分套件/更新覆蓋範圍的 GitHub 原生替代方案。跨作業系統發布檢查對於特定作業系統的入門、安裝程式和平台行為仍然很重要，但套件/更新產品驗證應優先選擇套件驗收。

更新與外掛驗證的正式檢查清單位於[測試更新與外掛](/zh-Hant/help/testing-updates-plugins)。在決定使用哪個本機、Docker、套件驗收或發布檢查通道來證明外掛安裝/更新、doctor 清理或已發布套件的遷移變更時，請使用此清單。從每個穩定 `2026.4.23+` 套件進行詳盡的已發布更新遷移是一個獨立的手動 `Update Migration` 工作流程，不是完整發布 CI 的一部分。

傳統套件驗證的寬限期是刻意設定期限的。透過 `2026.4.25` 的套件可以使用相容性路徑來處理已發布至 npm 的元數據遺漏：tarball 中遺漏的私有 QA 清單項目、遺漏的 `gateway install --wrapper`、從 tarball 衍生的 git fixture 中遺漏的修補檔案、遺漏的已持久化 `update.channel`、傳統外掛程式安裝記錄位置、遺漏的市集安裝記錄持久化，以及在 `plugins update` 期間的配置元數據遷移。已發布的 `2026.4.26` 套件可能會針對已隨貨運出的本地建置元數據戳記檔案發出警告。後續的套件必須符合現代套件合約；這些相同的遺漏將導致發布驗證失敗。

當發布問題關乎實際可安裝的套件時，請使用更廣泛的套件驗證設定檔：

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

- `smoke`：快速套件安裝/通道/代理程式、閘道網路和配置
  重新載入通道
- `package`：安裝/更新/重新啟動/外掛程式套件合約，加上即時 ClawHub
  技能安裝驗證；這是發布檢查的預設值
- `product`：`package` 加上 MCP 通道、cron/子代理程式清理、OpenAI 網頁
  搜尋，以及 OpenWebUI
- `full`：包含 OpenWebUI 的 Docker 發布路徑區塊
- `custom`：專注重新執行的確切 `docker_lanes` 清單

若要進行套件候選版本的 Telegram 驗證，請在套件驗證上啟用 `telegram_mode=mock-openai` 或
`telegram_mode=live-frontier`。工作流程會將解析出的 `package-under-test` tarball 傳遞給 Telegram 通道；獨立的
Telegram 工作流程仍接受已發布的 npm 規格以進行發布後檢查。

## 發布發布自動化

`OpenClaw Release Publish` 是正常的變動發布入口點。它
會按照發布需求協調受信任發行者工作流程：

1. 檢出發布標籤並解析其提交 SHA。
2. 驗證標籤可從 `main` 或 `release/*` 抵達。
3. 執行 `pnpm plugins:sync:check`。
4. 使用 `publish_scope=all-publishable` 和
   `ref=<release-sha>` 觸發 `Plugin NPM Release`。
5. 使用相同的 scope 和 SHA 觸發 `Plugin ClawHub Release`。
6. 使用 release tag、npm dist-tag 和
   儲存的 `preflight_run_id` 觸發 `OpenClaw NPM Release`。

Beta 發佈範例：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

發佈到預設 beta dist-tag 的 Stable：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

直接升級到 `latest` 的 Stable 是明確指定的：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=latest
```

僅針對專注的修復或重新發佈工作使用較低層級的 `Plugin NPM Release` 和 `Plugin ClawHub Release` 工作流程。對於選定的外掛修復，將
`plugin_publish_scope=selected` 和 `plugins=@openclaw/name` 傳遞給
`OpenClaw Release Publish`，或者在 OpenClaw 套件不能發佈時直接觸發子工作流程。

## NPM 工作流程輸入

`OpenClaw NPM Release` 接受這些由操作者控制的輸入：

- `tag`：必需的 release tag，例如 `v2026.4.2`、`v2026.4.2-1` 或
  `v2026.4.2-beta.1`；當 `preflight_only=true` 時，它也可以是當前的
  完整 40 字元工作流程分支 commit SHA，僅用於驗證預檢
- `preflight_only`：`true` 僅用於驗證/建置/打包，`false` 用於
  實際發佈路徑
- `preflight_run_id`：在實際發佈路徑上為必需項，以便工作流程重複使用
  來自成功預檢運行的準備壓縮檔
- `npm_dist_tag`：發佈路徑的 npm 目標 tag；預設為 `beta`

`OpenClaw Release Publish` 接受這些由操作者控制的輸入：

- `tag`：必需的 release tag；必須已存在
- `preflight_run_id`：成功的 `OpenClaw NPM Release` 預檢運行 ID；
  當 `publish_openclaw_npm=true` 時為必需項
- `npm_dist_tag`：OpenClaw 套件的 npm 目標 tag
- `plugin_publish_scope`：預設為 `all-publishable`；僅在
  專注修復工作時使用 `selected`
- `plugins`：以逗號分隔的 `@openclaw/*` 套件名稱，當
  `plugin_publish_scope=selected`
- `publish_openclaw_npm`：預設為 `true`；僅當將
  工作流程作為僅插件的修補協調器時才設定 `false`
- `wait_for_clawhub`：預設為 `false`，因此 npm 可用性不會被
  ClawHub sidecar 阻擋；僅當工作流程完成必須包含
  ClawHub 完成時才設定 `true`

`OpenClaw Release Checks` 接受這些由操作員控制的輸入：

- `ref`：要驗證的分支、標籤或完整 commit SHA。承載秘密的檢查
  要求解析的 commit 必須可從 OpenClaw 分支或
  發布標籤到達。
- `run_release_soak`：選擇加入在穩定/預設發布檢查時進行徹底的 live/E2E、Docker 發布路徑以及
  all-since upgrade-survivor soak。這會被 `release_profile=full` 強制開啟。

規則：

- 穩定和修正標籤可以發布到 `beta` 或 `latest`
- Beta 預發布標籤只能發布到 `beta`
- 對於 `OpenClaw NPM Release`，僅當 `preflight_only=true` 時才允許輸入完整 commit SHA
- `OpenClaw Release Checks` 和 `Full Release Validation` 始終
  僅用於驗證
- 實際的發布路徑必須使用與 preflight 期間使用的相同 `npm_dist_tag`；
  工作流程會在發布繼續之前驗證該元資料

## 穩定 npm 發布順序

當發布穩定 npm 版本時：

1. 使用 `preflight_only=true` 執行 `OpenClaw NPM Release`
   - 在標籤存在之前，您可以使用當前完整的工作流程分支 commit
     SHA 進行僅驗證的 preflight 工作流程試運
2. 對於正常的 beta-first 流程請選擇 `npm_dist_tag=beta`，或者僅當
   您故意想要直接穩定發布時才選擇 `latest`
3. 當您需要正常 CI 以及即時提示快取、Docker、QA Lab、Matrix 和 Telegram 的覆蓋範圍時，請在 release 分支、release tag 或完整的 commit SHA 上執行 `Full Release Validation`，這可透過一個手動工作流程完成
4. 如果您特意只需要確定性的一般測試圖表，請改在 release ref 上執行手動 `CI` 工作流程
5. 儲存成功的 `preflight_run_id`
6. 使用相同的 `tag`、相同的 `npm_dist_tag` 以及儲存的 `preflight_run_id` 執行 `OpenClaw Release Publish`；它會在發佈 OpenClaw npm 套件之前，將外掛程式發佈至 npm 和 ClawHub
7. 如果版本發佈於 `beta`，請使用私人的 `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml` 工作流程，將該穩定版本從 `beta` 提升至 `latest`
8. 如果版本刻意直接發佈至 `latest`，且 `beta` 應立即跟隨相同的穩定版本，請使用相同的私人工作流程將兩個 dist-tags 指向該穩定版本，或者讓其排程的自我修復同步稍後移動 `beta`

出於安全考量，dist-tag 變更位於私人存放庫中，因為它仍然需要 `NPM_TOKEN`，而公開存放庫則保持僅使用 OIDC 發佈。

這樣可確保直接發佈路徑和 beta 優先提升路徑皆有文件記載且可讓操作員檢視。

如果維護者必須回退至本機 npm 身份驗證，請僅在專用的 tmux session 中執行任何 1Password CLI (`op`) 指令。請勿直接從主要 agent shell 呼叫 `op`；將其保留在 tmux 中可讓提示、警示和 OTP 處理過程可被觀察，並防止重複的主機警示。

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
中的私有發行文件作為實際的操作手冊。

## 相關

- [發行管道](/zh-Hant/install/development-channels)
