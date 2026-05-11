---
summary: "發佈通道、操作員檢查清單、驗證環境、版本命名及發佈頻率"
title: "發佈策略"
read_when:
  - Looking for public release channel definitions
  - Running release validation or package acceptance
  - Looking for version naming and cadence
---

OpenClaw 有三個公開發佈通道：

- stable：預設發佈至 npm `beta` 的帶標籤發佈，或在明確要求時發佈至 npm `latest`
- beta：發佈至 npm `beta` 的預發佈標籤
- dev：`main` 的移動頂端

## 版本命名

- 穩定發佈版本：`YYYY.M.D`
  - Git 標籤：`vYYYY.M.D`
- 穩定修正發佈版本：`YYYY.M.D-N`
  - Git 標籤：`vYYYY.M.D-N`
- Beta 預發佈版本：`YYYY.M.D-beta.N`
  - Git 標籤：`vYYYY.M.D-beta.N`
- 請勿將月份或日期補零
- `latest` 表示當前已推廣的穩定 npm 發佈
- `beta` 表示當前的 beta 安裝目標
- 穩定版和穩定修正版發佈預設發佈至 npm `beta`；發佈操作員可以明確指定 `latest`，或稍後推廣已審核的 beta 版本
- 每個穩定版 OpenClaw 發佈同時發佈 npm 套件和 macOS 應用程式；
  beta 發佈通常先驗證並發佈 npm/套件路徑，除非有明確要求，
  否則 mac 應用程式的建置/簽署/公證僅保留給穩定版使用

## 發佈頻率

- 發佈流程優先進行 beta
- 僅在最新的 beta 版本通過驗證後才發佈穩定版
- 維護者通常從當前 `main` 剺建的 `release/YYYY.M.D` 分支
  剪裁發佈，因此發佈驗證和修復不會阻礙 `main` 上的新開發
- 如果 beta 標籤已推送或發佻並需要修復，維護者會剪裁
  下一個 `-beta.N` 標籤，而不是刪除或重建舊的 beta 標籤
- 詳細的發佈程序、批准、憑證和恢復說明僅供維護者使用

## 發佈操作員檢查清單

此檢查清單是發布流程的公開形式。私人憑證、簽署、公證、dist-tag 恢復以及緊急回滾詳細資訊保留在僅維護者可見的發展手冊中。

1. 從目前的 `main` 開始：拉取最新版本，確認目標提交已推送，並確認目前的 `main` CI 狀況良好足以從其建立分支。
2. 使用 `/changelog` 從真實的提交歷史重寫頂部 `CHANGELOG.md` 區塊，保持條目面向用戶，提交它，推送它，並在建立分支前再次 rebase/pull。
3. 審閱 `src/plugins/compat/registry.ts` 和 `src/commands/doctor/shared/deprecation-compat.ts` 中的發布相容性記錄。僅在升級路徑仍被覆蓋時移除過期的相容性，或記錄為何有意保留它。
4. 從目前的 `main` 建立 `release/YYYY.M.D`；請勿直接在 `main` 上進行正常的發布工作。
5. 為預期的標籤提升所有必要的版本位置，然後執行本地確定性預檢：`pnpm check:test-types`、`pnpm check:architecture`、`pnpm build && pnpm ui:build` 和 `pnpm release:check`。
6. 使用 `preflight_only=true` 執行 `OpenClaw NPM Release`。在標籤存在之前，允許使用完整的 40 字元發布分支 SHA 進行僅驗證預檢。儲存成功的 `preflight_run_id`。
7. 使用 `Full Release Validation` 針對發布分支、標籤或完整提交 SHA 啟動所有發布前測試。這是四個大型發布測試區塊的唯一手動進入點：Vitest、Docker、QA Lab 和 Package。
8. 如果驗證失敗，請在發布分支上修復，並重新執行能證明修復的最小失敗檔案、通道、工作流程作業、套件設定檔、提供者或模型允許清單。僅在變更的範圍使先前的證據失效時，才重新執行完整的整體測試。
9. 對於 beta 版，標記 `vYYYY.M.D-beta.N`，使用 npm dist-tag `beta` 發布，然後針對已發布的 `openclaw@YYYY.M.D-beta.N` 或 `openclaw@beta` 套件執行發布後套件驗收。如果已推送或已發布的 beta 版需要修復，請建立下一個 `-beta.N`；請勿刪除或重寫舊的 beta 版。
10. 對於穩定版，僅在經過審核的 beta 或候選版本具有所需的驗證證據後才繼續。穩定版 npm 發布透過 `preflight_run_id` 重複使用成功的飛行前構件；穩定版 macOS 發布準備情況還需要打包好的 `.zip`、`.dmg`、`.dSYM.zip`，以及 `main` 上更新後的 `appcast.xml`。
11. 發布後，執行 npm 發布後驗證器、在您需要發布後通道證明時執行可選的獨立 published-npm Telegram E2E、視需要進行 dist-tag 推廣、根據完整的對應 `CHANGELOG.md` 部分撰寫 GitHub release/prerelease 說明，以及執行發布公告步驟。

## 發布飛行前檢查

- 在發布飛行前檢查之前執行 `pnpm check:test-types`，以便在更快的本地 `pnpm check` 閘道之外保持測試 TypeScript 的覆蓋
- 在發布飛行前檢查之前執行 `pnpm check:architecture`，以便在更快的本地閘道之外使更廣泛的匯入週期和架構邊界檢查保持通過
- 在 `pnpm release:check` 之前執行 `pnpm build && pnpm ui:build`，以便預期的 `dist/*` 發布構件和 Control UI 綁定存在於打包驗證步驟中
- 在發布批准之前執行手動 `Full Release Validation` 工作流程，以便從一個入口點啟動所有發布前測試箱。它接受分支、標籤或完整的 commit SHA，分派手動 `CI`，並分派 `OpenClaw Release Checks` 以進行安裝冒煙測試、套件驗收、Docker 發布路徑套件、即時/E2E、OpenWebUI、QA Lab 一致性、Matrix 和 Telegram 通道。僅在套件發布後提供 `npm_telegram_package_spec`，並且發布後 Telegram E2E 也應該執行。範例：`gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D`
- 當您希望在持續發行工作的同時取得套件候選版本的側通道驗證時，請執行手動 `Package Acceptance` 工作流程。使用 `source=npm` 搭配
  `openclaw@beta`、`openclaw@latest` 或確切的發行版本；使用 `source=ref`
  將受信任的 `package_ref` 分支/標籤/SHA 與目前的
  `workflow_ref` 測試工具一起打包；使用 `source=url` 搭配具有所需
  SHA-256 的 HTTPS tarball；或使用 `source=artifact` 搭配由另一個 GitHub
  Actions 執行上傳的 tarball。此工作流程會將候選版本解析為
  `package-under-test`，對該 tarball 重複使用 Docker E2E 發行排程器，並且可以使用
  `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier` 對同一個 tarball 執行 Telegram QA。
  範例：`gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f telegram_mode=mock-openai`
  常用設定檔：
  - `smoke`：install/channel/agent、gateway network 和 config reload 通道
  - `package`：不包含 OpenWebUI 或即時 ClawHub 的 artifact-native package/update/plugin 通道
  - `product`：套件設定檔加上 MCP 通道、cron/subagent 清理、
    OpenAI web search 和 OpenWebUI
  - `full`：包含 OpenWebUI 的 Docker 發行路徑區塊
  - `custom`：針對專注的重新執行進行精確 `docker_lanes` 選取
- 當您只需要對發行候選版本進行完整的標準 CI 涵蓋範圍時，請直接執行手動 `CI` 工作流程。手動 CI 分派會略過變更範圍限定，並強制執行 Linux Node 分片、bundled-plugin 分片、通道合約、Node 22 相容性、`check`、`check-additional`、build smoke、
  docs 檢查、Python skills、Windows、macOS、Android 和 Control UI i18n
  通道。
  範例：`gh workflow run ci.yml --ref release/YYYY.M.D`
- 驗證發行遙測時請執行 `pnpm qa:otel:smoke`。它透過本機 OTLP/HTTP 接收器來測試 QA-lab，並驗證匯出的 trace
  span 名稱、有界屬性以及內容/識別碼編輯，而不需要 Opik、Langfuse 或其他外部收集器。
- 在每次標記發布前運行 `pnpm release:check`
- 發布檢查現在在單獨的手動工作流程中運行：
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` 還會在發布批准前運行 QA Lab 模擬奇偶校驗閘道以及快速
  即時 Matrix 設定檔和 Telegram QA 通道。即時
  通道使用 `qa-live-shared` 環境；Telegram 也使用 Convex CI
  憑證租賃。當您需要完整的 Matrix
  傳輸、媒體和 E2EE 清單並行時，請運行手動 `QA-Lab - All Lanes` 工作流程，
  並使用 `matrix_profile=all` 和 `matrix_shards=true`。
- 跨作業系統安裝和升級執行時驗證是公開
  `OpenClaw Release Checks` 和 `Full Release Validation` 的一部分，它們直接調用
  可重用工作流程
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- 這種分離是有意為之的：保持真正的 npm 發布路徑簡短、
  確定性並專注於構件，而較慢的即時檢查則保留在
  其自己的通道中，以免延遲或阻止發布
- 承載機密的發布檢查應通過 `Full Release
Validation` or from the `main`/release 工作流程引用進行調度，以便工作流程邏輯和
  機密保持受控
- `OpenClaw Release Checks` 接受分支、標籤或完整的提交 SHA，只要
  解析後的提交可從 OpenClaw 分支或發布標籤訪問
- `OpenClaw NPM Release` 僅驗證的預檢也接受當前
  完整的 40 字元工作流程分支提交 SHA，而無需推送標籤
- 該 SHA 路徑僅用於驗證，不能升級為真正的發布
- 在 SHA 模式下，工作流程僅為
  套件元數據檢查合成 `v<package.json version>`；真正的發布仍需要真正的發布標籤
- 這兩個工作流程都將真正的發布和升級路徑保留在 GitHub 託管的
  執行器上，而非變更的驗證路徑則可以使用更大的
  Blacksmith Linux 執行器
- 該工作流程運行
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  同時使用 `OPENAI_API_KEY` 和 `ANTHROPIC_API_KEY` 工作流程機密
- npm 發布預檢不再等待單獨的發布檢查通道
- 在批准前運行 `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  （或匹配的 beta/correction 標籤）
- 在執行 npm publish 之後，請執行
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  （或對應的 beta/correction 版本）以驗證在全新的暫存前綴中已發布註冊表的
  安裝路徑
- 在發布 beta 版之後，執行 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`
  以利用共享租用的 Telegram 憑證池，針對已發布的 npm 套件驗證已安裝套件的入門、Telegram 設定以及真實的 Telegram E2E。
  本地維護者的單次操作可以省略 Convex 變數，並直接傳遞三個 `OPENCLAW_QA_TELEGRAM_*` 環境憑證。
- 維護者可以透過手動 `NPM Telegram Beta E2E` 工作流程，從 GitHub Actions 執行相同的發布後檢查。此工作流程僅限手動觸發，
  不會在每次合併時執行。
- 維護者發布自動化現在使用先預檢後推廣（preflight-then-promote）的機制：
  - 真實的 npm publish 必須通過成功的 npm `preflight_run_id`
  - 真實的 npm publish 必須從與成功的預檢執行相同的 `main` 或
    `release/YYYY.M.D` 分派發送
  - 穩定版 npm 發布預設使用 `beta`
  - 穩定版 npm 發布可以透過工作流程輸入明確指定目標為 `latest`
  - 基於權杖的 npm dist-tag 變更現在位於
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    中，出於安全考量，因為 `npm dist-tag add` 仍然需要 `NPM_TOKEN`，而
    公用儲存庫則僅保留 OIDC 發布
  - 公用 `macOS Release` 僅供驗證
  - 真實的私有 mac 發布必須通過成功的私有 mac
    `preflight_run_id` 和 `validate_run_id`
  - 真實的發布路徑會推廣準備好的成品，而不是重新建置它們
- 對於像 `YYYY.M.D-N` 這樣的穩定版修正發布，發布後驗證器
  也會檢查從 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同暫存前綴升級路徑，
  以確保發布修正不會在基礎穩定版本上無聲無息地保留較舊的全域安裝
- 除非 tarball 同時包含
  `dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 內容，
  否則 npm 發布預檢將失敗並封閉，以免我們再次發布空的瀏覽器儀表板
- 發布後驗證也會檢查已發布的登錄檔安裝是否在根 `dist/*` 佈局下包含非空的捆綁插件運行時依賴項。如果發行版本缺少或捆綁插件依賴項有效載荷為空，則發布後驗證程式將失敗，並且該版本無法提升至 `latest`。
- `pnpm test:install:smoke` 也會對候選更新 tarball 執行 npm pack `unpackedSize` 預算檢查，以便安裝程式 e2e 在發布發布路徑之前捕獲意外增加的 pack 膨脹
- 如果發布工作涉及 CI 規劃、擴充功能時段清單或擴充功能測試矩陣，請在批准之前從 `.github/workflows/ci.yml` 重新生成並檢閱規劃器擁有的 `checks-node-extensions` 工作流程矩陣輸出，以免發布說明描述過時的 CI 佈局
- 穩定版 macOS 發布準備情況還包括更新程式介面：
  - GitHub 發布最終必須包含打包好的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - `main` 上的 `appcast.xml` 必須在發布後指向新的穩定版 zip
  - 打包好的應用程式必須保持非調試 bundle id、非空的 Sparkle feed URL，以及針對該發布版本的 `CFBundleVersion` 等於或高於規範 Sparkle 組建底線

## 發布測試環境

`Full Release Validation` 是操作員從單一入口點啟動所有發布前測試的方式。請從受信任的 `main` 工作流程 ref 執行它，並將發布分支、標籤或完整提交 SHA 作為 `ref` 傳遞：

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both
```

工作流程會解析目標 ref，手動觸發 `CI` 並附帶
`target_ref=<release-ref>`，觸發 `OpenClaw Release Checks`，並可選地在
設定 `npm_telegram_package_spec` 時觸發獨立的發布後 Telegram E2E 測試。
`OpenClaw Release Checks` 接著會分發安裝冒煙測試、跨作業系統發布檢查、即時/E2E Docker 發布路徑覆蓋率、
包含 Telegram 套件 QA 的套件驗收、QA Lab 對等性、即時 Matrix 以及
即時 Telegram。只有在 `Full Release Validation`
摘要顯示 `normal_ci` 和 `release_checks` 成功，且任何可選的
`npm_telegram` 子項成功或刻意跳過時，完整執行才可接受。
子工作流程是從執行 `Full Release
Validation`, normally `--ref main`, even when the target `ref` 的受信任 ref
分派出來的，該 ref 指向較舊的發布分支或標籤。沒有獨立的 Full Release Validation
workflow-ref 輸入；請透過選擇工作流程執行 ref 來選擇受信任的 test harness。

請根據發布階段使用這些變體：

```bash
# Validate an unpublished release candidate branch.
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both

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
  -f npm_telegram_package_spec=openclaw@YYYY.M.D-beta.N \
  -f npm_telegram_provider_mode=mock-openai
```

在針對性修復後的第一次重新執行，請勿使用完整的 umbrella。如果某個 box
失敗，請針對下一次驗證使用失敗的子工作流程、工作、Docker lane、套件設定檔、
模型供應商或 QA lane。只有在修復變更了共享發布協調流程，或導致先前的全 box 證據
過時時，才再次執行完整 umbrella。Umbrella 的最終驗證程式會重新檢查記錄的子工作流程執行
id，因此當子工作流程成功重新執行後，只需重新執行失敗的
`Verify full validation` 父項工作。

### Vitest

Vitest box 是手動 `CI` 子工作流程。手動 CI 會刻意
繞過變更範圍限制，並強制對發布候選版本執行一般測試圖譜：Linux Node 分片、bundled-plugin 分片、通道合約、Node 22
相容性、`check`、`check-additional`、建置冒煙測試、文件檢查、Python
skills、Windows、macOS、Android 和 Control UI i18n。

使用此 box 來回答「原始碼樹是否通過了完整的一般測試套件？」
這與發布路徑產品驗證不同。需保留的證據：

- `Full Release Validation` 摘要顯示已分派的 `CI` 執行 URL
- `CI` 執行在確切的目標 SHA 上通過（green）
- 調查回歸時，來自 CI 工作的失敗或緩慢分片名稱
- Vitest 時間分析檔案，例如當執行需要效能分析時的
  `.artifacts/vitest-shard-timings.json`

僅在發布版本需要確定性的正常 CI 但不需要
Docker、QA Lab、live、跨作業系統或 package boxes 時，直接執行手動 CI：

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

Docker box 存在於 `OpenClaw Release Checks` 到
`openclaw-live-and-e2e-checks-reusable.yml` 中，以及 release-mode
`install-smoke` 工作流程。它透過打包的
Docker 環境驗證發布候選版本，而不僅僅是原始碼層級的測試。

發布 Docker 涵蓋範圍包括：

- 完整安裝冒煙測試，並啟用緩慢的 Bun 全域安裝冒煙測試
- 倉庫 E2E 通道
- 發布路徑 Docker 區塊：`core`、`package-update`、`plugins-runtime` 和
  `bundled-channels`
- 當有要求時，`plugins-runtime` 區塊內的 OpenWebUI 涵蓋範圍
- 分割的 bundled-channel 依賴通道位於其自己的 `bundled-channels` 區塊中
  而非序列化的一體式 bundled-channel 通道
- 分割的 bundled plugin 安裝/解除安裝通道
  `bundled-plugin-install-uninstall-0` 到
  `bundled-plugin-install-uninstall-7`
- 當發布檢查包含 live 套件時的 live/E2E 提供者套件和 Docker live model 涵蓋範圍

在重新執行之前使用 Docker 檔案。發布路徑排程器會上傳
`.artifacts/docker-tests/`（含通道日誌）、`summary.json`、`failures.json`、
階段時間、排程器計畫 JSON 和重新執行指令。為了專注恢復，
請在可重複使用的 live/E2E 工作流程上使用 `docker_lanes=<lane[,lane]>`，而不是
重新執行所有發布區塊。產生的重新執行指令在可用時包含先前的
`package_artifact_run_id` 和準備好的 Docker 映像檔輸入，因此
失敗的通道可以重複使用相同的 tarball 和 GHCR 映像檔。

### QA Lab

QA Lab box 也是 `OpenClaw Release Checks` 的一部分。它是代理
行為和通道層級的發布閘門，與 Vitest 和 Docker
打包機制分開。

Release QA Lab 涵蓋範圍包括：

- 使用 agentic parity pack 將 OpenAI 候選通道與 Opus 4.6 基準進行比較的 mock parity gate
- 使用 `qa-live-shared` 環境的快速即時 Matrix QA 設定檔
- 使用 Convex CI 憑證租用的即時 Telegram QA 通道
- 當發布遙測需要明確的本地證明時 `pnpm qa:otel:smoke`

使用此方塊來回答「發布在 QA 情境和即時通道流程中是否表現正確？」在核准發布時，請保留 parity、Matrix 和 Telegram 通道的 artifact URL。完整的 Matrix 涵蓋範圍仍可作為手動分片 QA-Lab 執行使用，而非預設的發布關鍵通道。

### 套件

Package 方塊是可安裝產品的閘道。它由 `Package Acceptance` 和解析器 `scripts/resolve-openclaw-package-candidate.mjs` 支援。解析器會將候選版本正規化為 Docker E2E 使用的 `package-under-test` tarball，驗證套件清單，記錄套件版本和 SHA-256，並將 workflow harness ref 與套件來源 ref 分開儲存。

支援的候選來源：

- `source=npm`： `openclaw@beta`、`openclaw@latest` 或精確的 OpenClaw 發布版本
- `source=ref`： 使用選定的 `workflow_ref` harness 打包受信任的 `package_ref` 分支、標籤或完整 commit SHA
- `source=url`： 下載具有所需 `package_sha256` 的 HTTPS `.tgz`
- `source=artifact`： 重複使用由另一個 GitHub Actions 執行上傳的 `.tgz`

`OpenClaw Release Checks` 會使用 `source=ref`、
`package_ref=<release-ref>`、`suite_profile=custom`、
`docker_lanes=bundled-channel-deps-compat plugins-offline` 和
`telegram_mode=mock-openai` 執行套件驗收。release-path Docker 片段涵蓋了
重疊的 install、update 和 plugin-update 通道；套件驗收則針對
同一個解析出的 tarball，維護原生物件的 bundled-channel 相容性、
離線外掛夾具以及 Telegram 套件 QA。它是 GitHub 原生的
替代方案，取代了以往大多需要 Parallels 的套件/更新測試範圍。
跨 OS 發布檢查對於特定於 OS 的入門、安裝程式和平台行為仍然重要，
但套件/更新的產品驗證應優先使用套件驗收。

舊版套件驗收的寬限期是經過刻意設定時限的。`2026.4.25` 之前的套件
可以針對已發布至 npm 的中繼資料落差使用相容性路徑：tarball 中缺少的
私有 QA 清冊項目、缺少的
`gateway install --wrapper`、tarball 衍生 git 夾具中缺少的修補檔案、
缺少的已保存 `update.channel`、舊版外掛安裝記錄
位置、缺少的市集安裝記錄持久性，以及 `plugins update` 期間
的設定中繼資料移轉。`2026.4.25` 之後的套件必須滿足
現代套件契約；這些相同的落差將導致發布驗證失敗。

當發布問題涉及實際的可安裝套件時，請使用更廣泛的套件驗收設定檔：

```bash
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product
```

常見套件設定檔：

- `smoke`：快速的套件 install/channel/agent、gateway 網路，以及設定
  重新載入通道
- `package`：不使用即時 ClawHub 的 install/update/plugin 套件契約；這是 release-check
  的預設值
- `product`：`package` 加上 MCP 通道、cron/subagent 清理、OpenAI 網頁
  搜尋以及 OpenWebUI
- `full`：Docker release-path 片段，搭配 OpenWebUI
- `custom`：用於專注重新執行的精確 `docker_lanes` 列表

若要進行套件候選版本 Telegram 驗證，請在套件驗收（Package Acceptance）上啟用 `telegram_mode=mock-openai` 或
`telegram_mode=live-frontier`。此工作流程會將解析後的 `package-under-test` tarball 傳遞至 Telegram 通道；獨立的 Telegram 工作流程仍接受已發布的 npm 規格以進行發布後檢查。

## NPM 工作流程輸入

`OpenClaw NPM Release` 接受這些由操作者控制的輸入：

- `tag`：必要的發布標籤，例如 `v2026.4.2`、`v2026.4.2-1` 或
  `v2026.4.2-beta.1`；當 `preflight_only=true` 時，也可以是目前完整的 40 字元工作流程分支提交 SHA，僅用於僅驗證的預檢
- `preflight_only`：`true` 表示僅用於驗證/建置/打包，`false` 表示用於
  真實的發布路徑
- `preflight_run_id`：在真實發布路徑上為必填，以便工作流程重複使用
  來自成功預檢執行的準備就緒 tarball
- `npm_dist_tag`：發布路徑的 npm 目標標籤；預設為 `beta`

`OpenClaw Release Checks` 接受這些由操作者控制的輸入：

- `ref`：要驗證的分支、標籤或完整提交 SHA。承載密碼的檢查
  要求解析出的提交必須可從 OpenClaw 分支或
  發布標籤抵達。

規則：

- 穩定版與修正標籤可以發布至 `beta` 或 `latest`
- Beta 預發布標籤僅能發布至 `beta`
- 對於 `OpenClaw NPM Release`，僅在
  `preflight_only=true` 時才允許輸入完整提交 SHA
- `OpenClaw Release Checks` 和 `Full Release Validation` 始終
  僅供驗證
- 真實發布路徑必須使用與預檢期間使用的相同 `npm_dist_tag`；
  工作流程會在發布繼續之前驗證該元資料

## 穩定版 npm 發布順序

當發布穩定版 npm 版本時：

1. 使用 `preflight_only=true` 執行 `OpenClaw NPM Release`
   - 在標籤存在之前，您可以使用當前完整的工作流程分支提交
     SHA 來進行發布前工作流程的僅驗證試運行
2. 選擇 `npm_dist_tag=beta` 進行正常的優先 beta 流程，或者僅在您
   故意想要直接發布穩定版本時選擇 `latest`
3. 當您希望從一個手動工作流程中獲得正常 CI 以及即時提示快取、Docker、QA Lab、
   Matrix 和 Telegram 覆蓋範圍時，在發布分支、發布標籤或完整
   提交 SHA 上執行 `Full Release Validation`
4. 如果您故意只需要確定性的一般測試圖，請改在發布引用上
   執行手動 `CI` 工作流程
5. 儲存成功的 `preflight_run_id`
6. 使用 `preflight_only=false`、相同的 `tag`、相同的
   `npm_dist_tag` 以及儲存的 `preflight_run_id` 再次執行 `OpenClaw NPM Release`
7. 如果發布落地在 `beta` 上，請使用私用
   `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
   工作流程將該穩定版本從 `beta` 推廣至 `latest`
8. 如果發布故意直接發布到 `latest` 並且 `beta`
   應立即遵循相同的穩定版本，請使用該相同的私用
   工作流程將這兩個 dist-tags 指向穩定版本，或者讓其排程的
   自我修復同步稍後移動 `beta`

出於安全原因，dist-tag 變更位於私用倉庫中，因為它仍然
需要 `NPM_TOKEN`，而公開倉庫僅保留 OIDC 發布權限。

這樣可以保持直接發布路徑和優先 beta 推廣路徑都有文檔記錄
且對操作員可見。

如果維護者必須回退到本機 npm 身份驗證，請僅在專用的 tmux 工作階段內執行任何 1Password
CLI (`op`) 指令。請勿直接從主要代理 shell 呼叫 `op`；
將其保持在 tmux 中可以使提示、警報和 OTP 處理可觀察，並防止重複的主機警報。

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

維護者使用私有發佈文件
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
來取得實際的操作手冊。

## 相關

- [發佈頻道](/zh-Hant/install/development-channels)
