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
9. 對於 beta 版，請標記 `vYYYY.M.D-beta.N`，然後從對應的 `release/YYYY.M.D` 分支執行 `OpenClaw Release Publish`。它會驗證 `pnpm plugins:sync:check`，將所有可發布的插件套件並行分發到 npm 和 ClawHub，然後在插件 npm 發布成功後，立即使用對應的 dist-tag 推廣準備好的 OpenClaw npm 預檢構件。在 OpenClaw npm 發布子任務成功後，它會根據完整的對應 `CHANGELOG.md` 部分建立或更新對應的 GitHub release/prerelease 頁面。發布到 npm `latest` 的穩定版會成為 GitHub latest release；保留在 npm `beta` 上的穩定維護版本則會使用 GitHub `latest=false` 建立。ClawHub 發布可能會在 OpenClaw npm 發布時仍在執行，但發布工作流程會立即列印子任務執行 ID。預設情況下，它在分發後不會等待 ClawHub，因此 OpenClaw npm 的可用性不會被較慢的 ClawHub 審核或註冊表工作阻擋；當 ClawHub 必須阻擋工作流程完成時，請設定 `wait_for_clawhub=true`。ClawHub 路徑會重試暫時性的 CLI 依賴安裝失敗，即使其中一個預覽單元出現不穩定，也會發布通過預覽的插件，並最終對每個預期的插件版本進行註冊表驗證，以便部分發布保持可見且可重試。發布後，請對已發布的 `openclaw@YYYY.M.D-beta.N` 或 `openclaw@beta` 套件執行發布後套件驗收。如果推送或發布的預發布版本需要修復，請切出下一個對應的預發布版本號；請勿刪除或重寫舊的預發布版本。
10. 對於穩定版，僅在經過審核的 Beta 版或候選發行版具備
    所需的驗證證據後繼續。穩定版 npm 發佈也會通過
    `OpenClaw Release Publish`，透過 `preflight_run_id` 重用成功的預檢
    產物；穩定版 macOS 發行準備工作還需要
    打包好的 `.zip`、`.dmg`、`.dSYM.zip`，以及 `main` 上
    更新的 `appcast.xml`。
    私有的 macOS 發佈工作流程會在發行資產驗證後自動將已簽名的 appcast 發佈到
    公共 `main`；如果分支保護阻擋了
    直接推送，它會開啟或更新 appcast PR。
11. 發佈後，執行 npm 發佈後驗證器，當您需要發佈後頻道證明時
    執行可選的獨立 published-npm Telegram E2E，視需要執行 dist-tag 推廣，驗證
    生成的 GitHub 發行頁面，並執行發佈公告步驟。

## 發布飛行前檢查

- 在發佈預檢之前執行 `pnpm check:test-types`，以便測試 TypeScript 保持
  在更快的本地 `pnpm check` 閘道之外被覆蓋
- 在發佈預檢之前執行 `pnpm check:architecture`，以便更廣泛的
  匯入迴圈和架構邊界檢查在更快的本地閘道之外通過
- 在 `pnpm release:check` 之前執行 `pnpm build && pnpm ui:build`，以便預期的
  `dist/*` 發行資產和 Control UI bundle 存在以用於打包
  驗證步驟
- 在根版本升級之後和標記之前執行 `pnpm release:prep`。
  它會執行每個確定性發行產生器，這些產生器通常在版本/設定/API
  變更後會發生偏移：plugin versions、plugin inventory、base config
  schema、bundled channel config metadata、config docs baseline、plugin SDK
  exports 和 plugin SDK API baseline。`pnpm release:check` 會以檢查模式
  重新執行這些防護，並在執行打包發行檢查之前，於一次通過中報告它發現的每個
  生成偏移失敗。
- 在發布核准之前，請執行手動 `Full Release Validation` 工作流程，以便從單一進入點啟動所有發布前測試箱。它接受分支、標籤或完整的提交 SHA，分派手動 `CI`，並針對安裝冒煙測試、套件驗收、跨作業系統套件檢查、QA Lab 一致性、Matrix 和 Telegram 管道分派 `OpenClaw Release Checks`。穩定/預設執行會將徹底的即時/E2E 和 Docker 發布路徑浸泡測試保留在 `run_release_soak=true` 之後；`release_profile=full` 則強制開啟浸泡測試。搭配 `release_profile=full` 和 `rerun_group=all` 時，它也會針對來自發布檢查的 `release-package-under-test` 構件執行套件 Telegram E2E。當相同的 Telegram E2E 也應證明已發布的 npm 套件時，請在發布後提供 `npm_telegram_package_spec`。當套件驗收應針對已發運的 npm 套件而非 SHA 建置的構件執行其套件/更新矩陣時，請在發布後提供 `package_acceptance_package_spec`。當私有驗證報告應證明驗證與已發布的 npm 套件相符，而不強制執行 Telegram E2E 時，請提供 `evidence_package_spec`。範例：`gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D`
- 當您希望在發布工作持續進行時，獲得套件候選版本的側通道驗證時，請執行手動 `Package Acceptance` 工作流程。使用 `source=npm` 進行
  `openclaw@beta`、`openclaw@latest` 或確切的發布版本；使用 `source=ref`
  透過目前的 `workflow_ref` 測試套件，打包受信任的 `package_ref` 分支/標籤/SHA；使用 `source=url` 搭配必要
  的 SHA-256 來指定 HTTPS tarball；或使用 `source=artifact` 指定由另一個 GitHub
  Actions 執行上傳的 tarball。該工作流程會將候選版本解析為
  `package-under-test`，對該 tarball 重新使用 Docker E2E 發布排程器，並可透過
  `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier` 針對相同的 tarball 執行 Telegram QA。當
  選取的 Docker 通道包含 `published-upgrade-survivor` 時，套件
  成品即為候選版本，而 `published_upgrade_survivor_baseline` 會選取
  已發布的基準版本。`update-restart-auth` 會將候選套件同時作為已安裝的 CLI 和受測套件，以便測試
  候選更新指令的受控重啟路徑。
  範例：`gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f published_upgrade_survivor_baseline=openclaw@2026.4.26 -f telegram_mode=mock-openai`
  常用設定檔：
  - `smoke`：install/channel/agent、gateway network 和 config reload 通道
  - `package`：不包含 OpenWebUI 或即時 ClawHub 的 artifact-native package/update/restart/plugin 通道
  - `product`：套件設定檔加上 MCP 通道、cron/subagent 清理、
    OpenAI 網路搜尋和 OpenWebUI
  - `full`：包含 OpenWebUI 的 Docker 發布路徑區塊
  - `custom`：針對專注的重新執行進行精確的 `docker_lanes` 選擇
- 當您僅需針對發布候選版本取得完整的正常 CI 涵蓋範圍時，直接執行手動 `CI` 工作流程。手動 CI 分派會略過變更範圍限定，並強制執行 Linux Node 分片、bundled-plugin 分片、channel contracts、Node 22 相容性、`check`、`check-additional`、build smoke、docs checks、Python skills、Windows、macOS、Android 和 Control UI i18n 分片。
  範例：`gh workflow run ci.yml --ref release/YYYY.M.D`
- 驗證發布遙測時請執行 `pnpm qa:otel:smoke`。它透過本機 OTLP/HTTP 接收器來驗證 QA-lab，並驗證匯出的 trace span 名稱、有界屬性以及內容/識別碼資訊遮除，而不需要 Opik、Langfuse 或其他外部收集器。
- 在每次標記發布之前執行 `pnpm release:check`
- 在標記存在之後，為了變更發布序列，請執行 `OpenClaw Release Publish`。從 `release/YYYY.M.D` 分派它（當發布可觸及 main 的標記時則從 `main`），傳入發布標記和成功的 OpenClaw npm `preflight_run_id`，並保留預設的外掛程式發布範圍 `all-publishable`，除非您刻意執行專注的修復工作。此工作流程會序列化外掛程式 npm publish、外掛程式 ClawHub publish 和 OpenClaw npm publish，以便在核心套件發布之前，其外部化外掛程式已先發布。
- 發布檢查現在會在個別的手動工作流程中執行：
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` 也會在發布核准前執行 QA Lab mock parity 分片，以及快速即時 Matrix 設定檔和 Telegram QA 分片。即時分片使用 `qa-live-shared` 環境；Telegram 也會使用 Convex CI 憑證租用。當您想要完整的 Matrix 傳輸、媒體和 E2EE 清單（平行執行）時，請使用 `matrix_profile=all` 和 `matrix_shards=true` 執行手動 `QA-Lab - All Lanes` 工作流程。
- 跨作業系統安裝和升級執行時期驗證是公開 `OpenClaw Release Checks` 和 `Full Release Validation` 的一部分，它們會直接呼叫可重複使用的工作流程
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- 此區分是有意的：保持真正的 npm 發布路徑簡短、確定性並以構件為重點，而較慢的即時檢查則留在各自的通道中，以免它們阻滯或阻擋發布
- 承載機密資訊的發布檢查應透過 `Full Release
Validation` or from the `main`/release workflow ref 進行分派，以便工作流程邏輯和機密保持受控
- `OpenClaw Release Checks` 接受分支、標籤或完整的 commit SHA，只要解析出的 commit 可從 OpenClaw 分支或發布標籤存取即可
- `OpenClaw NPM Release` 僅驗證的預檢也接受當前完整的 40 字元工作流程分支 commit SHA，而不需要已推送的標籤
- 該 SHA 路徑僅用於驗證，無法升級為真正的發布
- 在 SHA 模式下，工作流程僅針對套件中繼資料檢查合成 `v<package.json version>`；真正的發布仍需要真正的發布標籤
- 這兩個工作流程都將真正的發布和升級路徑保留在 GitHub 託管的 Runner 上，而非變更的驗證路徑則可以使用更大的 Blacksmith Linux Runner
- 該工作流程使用 `OPENAI_API_KEY` 和 `ANTHROPIC_API_KEY` 工作流程機密來執行
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
- npm 發布預檢不再等待個別的發布檢查通道
- 在批准之前，執行 `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  （或對應的 beta/correction 標籤）
- 在 npm 發布後，執行
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  （或對應的 beta/correction 版本），以在全新的臨時前綴中驗證已發布 Registry 的安裝路徑
- 在 beta 發布後，執行 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`
  以利用共用的租用 Telegram 憑證池，針對已發布的 npm 套件驗證已安裝套件的導入、Telegram 設定以及真實的 Telegram E2E。本機維護者的單次操作可能會省略 Convex 變數，並直接傳遞三個
  `OPENCLAW_QA_TELEGRAM_*` 環境憑證。
- 若要從維護者機器執行完整的發布後 beta 冒煙測試，請使用 `pnpm release:beta-smoke -- --beta betaN`。此輔助工具會執行 Parallels npm update/fresh-target 驗證，分派 `NPM Telegram Beta E2E`，輪詢確切的工作流程執行，下載構件，並列印 Telegram 報告。
- 維護者可以透過手動 `NPM Telegram Beta E2E` 工作流程，從 GitHub Actions 執行相同的發布後檢查。該流程特意設定為僅限手動執行，且不會在每次合併時執行。
- 維護者的發布自動化現在使用「預檢後再推廣」的機制：
  - 實際的 npm 發布必須通過成功的 npm `preflight_run_id`
  - 實際的 npm 發布必須從與成功預檢執行相同的 `main` 或
    `release/YYYY.M.D` 分支進行分派
  - 穩定版 npm 發布預設為 `beta`
  - 穩定版 npm 發布可以透過工作流程輸入明確指定目標為 `latest`
  - 基於權杖的 npm dist-tag 變更現在位於
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    中以確保安全，因為 `npm dist-tag add` 仍然需要 `NPM_TOKEN`，而
    公用存放庫則保持僅限 OIDC 發布
  - 公用 `macOS Release` 僅用於驗證；當標籤僅存在於發布分支上，但工作流程是從 `main` 分派時，請設定
    `public_release_branch=release/YYYY.M.D`
  - 實際的私有 mac 發布必須通過成功的私有 mac
    `preflight_run_id` 和 `validate_run_id`
  - 實際的發布路徑會推廣已準備好的構件，而不是重新建構它們
- 對於像 `YYYY.M.D-N` 這樣的穩定版修正發布，發布後驗證器
  也會檢查從 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同暫存字首升級路徑，
  以確保發布修正不會在基礎穩定版本內容中靜默遺留較舊的全域安裝
- npm 發布預檢採取「失敗即關閉」策略，除非 tarball 同時包含
  `dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 內容，
  以免我們再次發送空白的瀏覽器儀表板
- 發布後驗證也會檢查已發布的外掛程式進入點和
  套件中繼資料是否存在於已安裝的登錄佈局中。如果
  發布版本遺漏了外掛程式執行時內容，將無法通過發布後驗證器，
  且無法推廣至 `latest`。
- `pnpm test:install:smoke` 也會對候選更新 tarball 套用 npm pack `unpackedSize` 預算，以便安裝程式 e2e 在發布路徑之前捕捉到意外的打包膨脹
- 如果發布工作涉及了 CI 規劃、擴充功能時序清單或擴充功能測試矩陣，請在批准前從 `.github/workflows/plugin-prerelease.yml` 重新生成並檢閱規劃器擁有的 `plugin-prerelease-extension-shard` 矩陣輸出，以免發布說明描述過時的 CI 佈局
- 穩定版 macOS 發布準備工作也包括更新程式介面：
  - GitHub 發布最終必須包含打包好的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - `main` 上的 `appcast.xml` 在發布後必須指向新的穩定版 zip；私有的 macOS 發布工作流程會自動提交它，或者在無法直接推送時開啟 appcast PR
  - 打包好的應用程式必須保持非除錯 bundle id、非空白的 Sparkle feed URL，以及一個高於或等於該發布版本標準 Sparkle 建置底線的 `CFBundleVersion`

## 發布測試環境

`Full Release Validation` 是操作員從單一入口點啟動所有發布前測試的方式。若要在快速變動的分支上針對特定提交進行驗證，請使用此輔助程式，以便每個子工作流程都從固定於目標 SHA 的暫存分支執行：

```bash
pnpm ci:full-release --sha <full-sha>
```

此輔助程式會推送 `release-ci/<sha>-...`，從該分支使用 `ref=<sha>` 分派 `Full Release Validation`，驗證每個子工作流程 `headSha` 都符合目標，然後刪除暫存分支。這可以避免意外驗證到較新的 `main` 子執行。

若要進行發布分支或標籤驗證，請從受信任的 `main` 工作流程 ref 執行它，並將發布分支或標籤作為 `ref` 傳入：

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N
```

此工作流程解析目標引用，使用 `target_ref=<release-ref>` 分發手動 `CI`，分發 `OpenClaw Release Checks`，準備用於套件導向檢查的父級 `release-package-under-test` 構件，並在帶有 `rerun_group=all` 的 `release_profile=full` 時或設定了 `npm_telegram_package_spec` 時，分發獨立的套件 Telegram E2E。`OpenClaw Release
Checks` 接著會展開安裝冒煙測試、跨作業系統發布檢查、啟用 soak 時的即時/E2E Docker 發布路徑覆蓋率、包含 Telegram 套件 QA 的套件驗收、QA Lab 一致性、即時 Matrix 以及即時 Telegram。只有在 `Full Release Validation` 摘要顯示 `normal_ci` 和 `release_checks` 成功時，完整執行才是可接受的。在 full/all 模式下，`npm_telegram` 子級也必須成功；在 full/all 模式之外，除非提供了已發布的 `npm_telegram_package_spec`，否則會跳過它。最終驗證器摘要包含每次子級執行的最慢任務表，因此發布管理員無需下載日誌即可查看當前的關鍵路徑。
請參閱 [完整發布驗證](/zh-Hant/reference/full-release-validation) 以了解完整的階段矩陣、確切的工作流程任務名稱、stable 與 full 設定檔的差異、構件以及專注的重新執行處理程序。
子工作流程是從執行 `Full Release
Validation`, normally `--ref main`, even when the target `ref` 的受信任引用分發的，該 `ref` 指向較舊的發布分支或標籤。沒有單獨的 Full Release Validation workflow-ref 輸入；通過選擇工作流程執行引用來選擇受信任的測試線束。
不要對移動 `main` 時的確切提交證明使用 `--ref main -f ref=<sha>`；
原始提交 SHA 不能作為工作流程分發引用，因此請使用
`pnpm ci:full-release --sha <sha>` 來建立固定的臨時分支。

使用 `release_profile` 來選擇即時/提供者的廣度：

- `minimum`：最快的發布關鍵 OpenAI/核心即時和 Docker 路徑
- `stable`：最小化加上穩定提供者/後端覆蓋率，用於發布核准
- `full`：stable 加上廣泛的諮詢提供者/媒體報導

當阻擋發行的通道顯示為綠燈，且您希望在發布前進行全面的 live/E2E、Docker 發行路徑以及有界定的已發佈升級存留掃描時，請使用 `run_release_soak=true` 搭配 `stable`。該掃描涵蓋最新的四個 stable 套件加上固定的 `2026.4.23` 和 `2026.5.2` 基準，以及較舊的 `2026.4.15` 覆蓋範圍，並移除重複的基準，且每個基準被分片到其各自的 Docker runner 作業中。`full` 隱含 `run_release_soak=true`。

`OpenClaw Release Checks` 使用受信任的工作流程 ref 將目標 ref 解析一次為 `release-package-under-test`，並在 soak 執行期間於跨作業系統、套件驗收和發行路徑 Docker 檢查中重用該產物。這讓所有面對套件的檢測箱保持在相同的位元組上，並避免重複的套件建置。當設定 repo/org 變數時，跨作業系統的 OpenAI 安裝冒煙測試會使用 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否則使用 `openai/gpt-5.4`，因為此通道是為了證明套件安裝、上線、閘道啟動和單次 live agent 週轉，而不是對最慢的預設模型進行基準測試。更廣泛的 live 提供者矩陣仍然是模型特定覆蓋範圍的所在。

根據發行階段使用這些變體：

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
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N \
  -f npm_telegram_package_spec=openclaw@YYYY.M.D-beta.N \
  -f npm_telegram_provider_mode=mock-openai
```

不要在針對性修復後的第一次重新執行中使用完整的 umbrella。如果某個檢測箱失敗，請針對下一次驗證使用失敗的子工作流程、作業、Docker 通道、套件設定檔、模型提供者或 QA 通道。只有在修復改變了共享的發行協調流程，或導致先前所有檢測箱的證據失效時，才再次執行完整的 umbrella。Umbrella 的最終驗證器會重新檢查記錄的子工作流程執行 ID，因此在子工作流程成功重新執行後，僅重新執行失敗的 `Verify full validation` 父作業。

對於受限恢復，請將 `rerun_group` 傳遞給 umbrella。`all` 是真正的
release-candidate 執行，`ci` 僅執行正常的 CI 子任務，`plugin-prerelease`
僅執行 release-only 外掛子任務，`release-checks` 執行每個 release
box，而較狹窄的 release 群組為 `install-smoke`、`cross-os`、
`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 和 `npm-telegram`。
針對 `npm-telegram` 的專注重新執行需要 `npm_telegram_package_spec`；使用 `release_profile=full`
的完整/全部執行會使用 release-checks 套件構件。專注的跨 OS
重新執行可以新增 `cross_os_suite_filter=windows/packaged-upgrade` 或其他 OS/suite 過濾器。
QA release-check 失敗僅供參考；僅限 QA 的失敗不會阻擋 release 驗證。

### Vitest

Vitest box 是手動 `CI` 子工作流程。手動 CI 會刻意
繞過變更範圍判定，並強制對 release
candidate 執行正常測試圖譜：Linux Node 分片、bundled-plugin 分片、channel contracts、Node 22
相容性、`check`、`check-additional`、build smoke、docs checks、Python
skills、Windows、macOS、Android 和 Control UI i18n。

使用此 box 來回答「原始碼樹是否通過了完整正常測試套件？」
這不等於 release-path 產品驗證。需保留的證據：

- 顯示已分派 `CI` 執行 URL 的 `Full Release Validation` 摘要
- `CI` 在確切目標 SHA 上執行通過 (綠燈)
- 調查迴歸時，來自 CI 工作的失敗或緩慢分片名稱
- Vitest timing 構件，例如當執行需要效能分析時的 `.artifacts/vitest-shard-timings.json`

僅當 release 需要確定性正常 CI，但不需要 Docker、QA Lab、live、
cross-OS 或 package box 時，才直接執行手動 CI：

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

Docker 箱位存在於 `OpenClaw Release Checks` 至
`openclaw-live-and-e2e-checks-reusable.yml` 之間，以及 release-mode
`install-smoke` 工作流程。它透過打包的
Docker 環境來驗證發布候選版本，而不僅是僅進行原始碼層級的測試。

Release Docker 涵蓋範圍包括：

- 完整安裝冒煙測試，並啟用緩慢的 Bun 全域安裝冒煙測試
- 根據目標 SHA 準備/重用根 Dockerfile 冒煙測試映像，包含 QR、
  root/gateway 以及 installer/Bun 冒煙測試任務，作為獨立的 install-smoke
  分片執行
- 儲存庫 E2E 通道
- release-path Docker 區塊：`core`、`package-update-openai`、
  `package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、
  `plugins-runtime-services`、
  `plugins-runtime-install-a`、`plugins-runtime-install-b`、
  `plugins-runtime-install-c`、`plugins-runtime-install-d`、
  `plugins-runtime-install-e`、`plugins-runtime-install-f`、
  `plugins-runtime-install-g` 和 `plugins-runtime-install-h`
- 根據請求，在 `plugins-runtime-services` 區塊內涵蓋 OpenWebUI
- 拆分的捆綁外掛程式安裝/解除安裝通道
  `bundled-plugin-install-uninstall-0` 至
  `bundled-plugin-install-uninstall-23`
- 當發布檢查包含 live 測試套件時，進行 live/E2E 提供者套件和 Docker live 模型涵蓋範圍測試

在重新執行之前使用 Docker 成品。release-path 排程器會上傳
`.artifacts/docker-tests/`（含通道日誌）、`summary.json`、`failures.json`、
階段計時、排程器計畫 JSON 以及重新執行指令。針對專注的修復，
請在可重複使用的 live/E2E 工作流程上使用 `docker_lanes=<lane[,lane]>`，而不是
重新執行所有發布區塊。產生的重新執行指令在可用時會包含先前的
`package_artifact_run_id` 和準備好的 Docker 映像輸入，因此
失敗的通道可以重複使用相同的 tarball 和 GHCR 映像。

### QA Lab

QA Lab 箱位也是 `OpenClaw Release Checks` 的一部分。它是代理行為
和通道層級的發布閘道，與 Vitest 和 Docker
打包機制分開。

Release QA Lab 涵蓋範圍包括：

- 使用 agentic parity pack 將 OpenAI 候選通道與 Opus 4.6 基線進行比較的 mock parity lane
- 使用 `qa-live-shared` 環境的快速即時 Matrix QA 配置文件
- 使用 Convex CI 憑證租約的即時 Telegram QA lane
- 當版本遙測需要明確的本地證明時，請使用 `pnpm qa:otel:smoke`

使用此 box 來回答「版本在 QA 場景和即時通道流程中是否運作正常？」。在批准版本時，請保留 parity、Matrix 和 Telegram lane 的成品 URL。完整的 Matrix 涵蓋範圍仍然可作為手動分片 QA-Lab 執行，而不是預設的關鍵版本 lane。

### 套件

Package box 是可安裝產品的閘道。它由 `Package Acceptance` 和解析器 `scripts/resolve-openclaw-package-candidate.mjs` 支援。解析器會將候選版本正規化為 Docker E2E 使用的 `package-under-test` tarball，驗證套件清單，記錄套件版本和 SHA-256，並將 workflow harness ref 與套件來源 ref 分開保存。

支援的候選來源：

- `source=npm`：`openclaw@beta`、`openclaw@latest` 或精確的 OpenClaw 發行版本
- `source=ref`：使用選定的 `workflow_ref` harness 打包受信任的 `package_ref` 分支、標籤或完整的 commit SHA
- `source=url`：下載具有所需 `package_sha256` 的 HTTPS `.tgz`
- `source=artifact`：重複使用另一個 GitHub Actions 執行上傳的 `.tgz`

`OpenClaw Release Checks` 使用 `source=artifact`（準備好的發行套件成品）、`suite_profile=custom`、
`docker_lanes=doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update`、
`telegram_mode=mock-openai` 執行套件驗收（Package Acceptance）。套件驗收會針對同一個解析出的 tarball，保留遷移、更新、設定驗證更新重啟、即時 ClawHub 技能安裝、舊版外掛相依性清理、離線外掛測試資料、外掛更新以及 Telegram 套件 QA。阻礙發行的檢查使用預設的最新已發布套件基準；`run_release_soak=true` 或
`release_profile=full` 會擴展成從 `2026.4.23` 到 `latest` 的每個穩定版 npm 已發布基準，外加回報問題的測試資料。對於已發布的候選版本，請搭配 `source=npm` 使用套件驗收；若要在發布前測試基於 SHA 的本機 npm tarball，請使用 `source=ref`/`source=artifact`。這是原本需要 Parallels 的大部分套件/更新測試覆蓋範圍的 GitHub 原生替代方案。跨 OS 發行檢查對於 OS 特定的入門、安裝程式和平台行為仍然重要，但套件/更新的產品驗證應優先使用套件驗收。

用於更新和外掛驗證的正式檢查清單是
[Testing updates and plugins](/zh-Hant/help/testing-updates-plugins)。當您決定使用哪個本機、Docker、套件驗收或發行檢查通道來驗證外掛安裝/更新、doctor 清理或已發布套件的遷移變更時，請使用此清單。
從每個穩定版 `2026.4.23+` 套件進行完整的已發布更新遷移，是一個獨立的手動 `Update Migration` 工作流程，不屬於完整發行 CI 的一部分。

Legacy package-acceptance leniency is intentionally time boxed. Packages through
`2026.4.25` may use the compatibility path for metadata gaps already published
to npm: private QA inventory entries missing from the tarball, missing
`gateway install --wrapper`, missing patch files in the tarball-derived git
fixture, missing persisted `update.channel`, legacy plugin install-record
locations, missing marketplace install-record persistence, and config metadata
migration during `plugins update`. The published `2026.4.26` package may warn
for local build metadata stamp files that were already shipped. Later packages
must satisfy the modern package contracts; those same gaps fail release
validation.

Use broader Package Acceptance profiles when the release question is about an
actual installable package:

```bash
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f published_upgrade_survivor_baseline=openclaw@2026.4.26
```

Common package profiles:

- `smoke`: quick package install/channel/agent, gateway network, and config
  reload lanes
- `package`: install/update/restart/plugin package contracts plus live ClawHub
  skill install proof; this is the release-check default
- `product`: `package` plus MCP channels, cron/subagent cleanup, OpenAI web
  search, and OpenWebUI
- `full`: Docker release-path chunks with OpenWebUI
- `custom`: exact `docker_lanes` list for focused reruns

For package-candidate Telegram proof, enable `telegram_mode=mock-openai` or
`telegram_mode=live-frontier` on Package Acceptance. The workflow passes the
resolved `package-under-test` tarball into the Telegram lane; the standalone
Telegram workflow still accepts a published npm spec for post-publish checks.

## Release publish automation

`OpenClaw Release Publish` is the normal mutating publish entrypoint. It
orchestrates the trusted-publisher workflows in the order the release needs:

1. Check out the release tag and resolve its commit SHA.
2. Verify the tag is reachable from `main` or `release/*`.
3. Run `pnpm plugins:sync:check`.
4. 使用 `publish_scope=all-publishable` 和
   `ref=<release-sha>` 觸發 `Plugin NPM Release`。
5. 使用相同的範圍和 SHA 觸發 `Plugin ClawHub Release`。
6. 使用發行標籤、npm dist-tag 和
   已儲存的 `preflight_run_id` 觸發 `OpenClaw NPM Release`。

Beta 發行範例：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

穩定版發行到預設的 beta dist-tag：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

直接升級到 `latest` 的穩定版發行需要明確指定：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=latest
```

僅針對專門的修復或重新發行工作，使用較低層級的 `Plugin NPM Release` 和 `Plugin ClawHub Release` 工作流程。針對選定的外掛程式修復，將
`plugin_publish_scope=selected` 和 `plugins=@openclaw/name` 傳遞給
`OpenClaw Release Publish`，或當 OpenClaw 套件不可發行時直接觸發子工作流程。

## NPM 工作流程輸入

`OpenClaw NPM Release` 接受這些由操作員控制的輸入：

- `tag`：必要的發行標籤，例如 `v2026.4.2`、`v2026.4.2-1` 或
  `v2026.4.2-beta.1`；當 `preflight_only=true` 時，它也可以是當前
  完整的 40 字元工作流程分支提交 SHA，僅用於驗證預檢
- `preflight_only`：`true` 僅用於驗證/建置/打包，`false` 用於
  實際的發行路徑
- `preflight_run_id`：在實際發行路徑上為必填，以便工作流程重複使用
  來自成功預檢執行的準備好壓縮檔
- `npm_dist_tag`：發行路徑的 npm 目標標籤；預設為 `beta`

`OpenClaw Release Publish` 接受這些由操作員控制的輸入：

- `tag`：必要的發行標籤；必須已存在
- `preflight_run_id`：成功的 `OpenClaw NPM Release` 預檢執行 ID；
  當 `publish_openclaw_npm=true` 時為必填
- `npm_dist_tag`：OpenClaw 套件的 npm 目標標籤
- `plugin_publish_scope`：預設為 `all-publishable`；僅
  在專門的修復工作時使用 `selected`
- `plugins`：以逗號分隔的 `@openclaw/*` 套件名稱，當
  `plugin_publish_scope=selected`
- `publish_openclaw_npm`：預設為 `true`；僅在將
  工作流程作為僅外掛修復協調器時才設定 `false`

`OpenClaw Release Checks` 接受這些由操作員控制的輸入：

- `ref`：要驗證的分支、標籤或完整提交 SHA。承載密鑰的檢查
  要求解析出的提交必須可從 OpenClaw 分支或
  發布標籤觸達。
- `run_release_soak`：選擇加入完整的 live/E2E、Docker 發布路徑，以及
  在穩定/預設發布檢查上的 all-since 升級存留 soak。此選項被
  `release_profile=full` 強制開啟。

規則：

- 穩定和修正標籤可以發布到 `beta` 或 `latest`
- Beta 預發布標籤只能發布到 `beta`
- 對於 `OpenClaw NPM Release`，僅當
  `preflight_only=true` 時才允許輸入完整提交 SHA
- `OpenClaw Release Checks` 和 `Full Release Validation` 始終
  僅用於驗證
- 實際的發布路徑必須使用與預檢期間使用的相同 `npm_dist_tag`；
  工作流程會在發布繼續之前驗證該元資料

## 穩定 npm 發布順序

當建立穩定 npm 發布時：

1. 使用 `preflight_only=true` 執行 `OpenClaw NPM Release`
   - 在標籤存在之前，您可以使用當前完整的工作流程分支提交
     SHA 來進行預檢工作流程的僅驗證試執行
2. 選擇 `npm_dist_tag=beta` 進行正常的 Beta 優先流程，或者僅在
   您有意進行直接穩定發布時選擇 `latest`
3. 當您需要從一個手動工作流程中獲得正常 CI 加上即時提示快取、Docker、QA Lab、
   Matrix 和 Telegram 覆蓋率時，在發布分支、發布標籤或完整
   提交 SHA 上執行 `Full Release Validation`
4. 如果您確實只需要確定性的一般測試圖，請改為在發布 ref 上執行
   手動 `CI` 工作流程
5. 儲存成功的 `preflight_run_id`
6. 使用相同的 `tag`、相同的 `npm_dist_tag`
   以及儲存的 `preflight_run_id` 執行 `OpenClaw Release Publish`；它會在發佈 OpenClaw npm 套件之前，將外掛化外掛程式發佈到 npm
   和 ClawHub
7. 如果發行版發佈在 `beta` 上，請使用私有的
   `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
   工作流程將該穩定版本從 `beta` 推廣到 `latest`
8. 如果發行版刻意直接發佈到 `latest` 且 `beta`
   應立即跟隨相同的穩定建置，請使用相同的私有
   工作流程將兩個 dist-tags 指向該穩定版本，或者讓其排程的
   自我修復同步稍後移動 `beta`

出於安全原因，dist-tag 變更位於私有儲存庫中，因為它仍然
需要 `NPM_TOKEN`，而公用儲存庫則保持僅限 OIDC 的發佈。

這使得直接發佈路徑和 beta 優先推廣路徑都能被記錄下來，並且對操作員可見。

如果維護者必須回退到本機 npm 身份驗證，請僅在專用的 tmux 工作階段內執行任何 1Password
CLI (`op`) 指令。請勿直接從主要 agent shell 呼叫 `op`；將其保留在 tmux 中可讓提示、
警報和 OTP 處理過程可被觀察，並防止重複的主機警報。

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
中的私人發行文件作為實際的操作手冊。

## 相關

- [發佈管道](/zh-Hant/install/development-channels)
