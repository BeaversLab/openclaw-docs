---
title: "發布政策"
summary: "公開發布管道、版本命名與發布頻率"
read_when:
  - Looking for public release channel definitions
  - Looking for version naming and cadence
---

# 發布政策

OpenClaw 有三條公開發布管道：

- stable：默認發布到 npm `beta` 的帶標籤版本，或在明確請求時發布到 npm `latest`
- beta：發布到 npm `beta` 的預發布標籤
- dev：`main` 的動態頂端

## 版本命名

- 穩定發布版本：`YYYY.M.D`
  - Git 標籤：`vYYYY.M.D`
- 穩定修正發布版本：`YYYY.M.D-N`
  - Git 標籤：`vYYYY.M.D-N`
- Beta 預發布版本：`YYYY.M.D-beta.N`
  - Git 標籤：`vYYYY.M.D-beta.N`
- 不要對月份或日期補零
- `latest` 表示當前推廣的穩定 npm 發布
- `beta` 表示當前的 beta 安裝目標
- 穩定版和穩定修正版默認發布到 npm `beta`；發布操作員可以明確指定 `latest` 作為目標，或在稍後推廣經過驗證的 beta 構建
- 每個穩定版 OpenClaw 發行版會同時發布 npm 套件和 macOS 應用程式；
  beta 發行版通常會先驗證並發布 npm 套件路徑，並保留
  mac 應用程式的建置/簽署/公證供穩定版使用，除非另有明確要求

## 發布頻率

- 發布流程採用 Beta 優先
- 只有在最新的 Beta 版本經過驗證後，才會進行穩定版發布
- 維護者通常會從當前 `main` 建立的 `release/YYYY.M.D` 分支進行發行，
  因此發行驗證與修復不會阻擋 `main` 上的新開發
- 如果 beta 標籤已推送或發佈且需要修復，維護者會
  切出下一個 `-beta.N` 標籤，而不是刪除或重建舊的 beta 標籤
- 詳細的發行程序、審核、憑證和復原說明僅限維護者查看

## 發行前檢查

- 在發行前檢查之前執行 `pnpm check:test-types`，以便測試 TypeScript
  在更快的本機 `pnpm check` 閘道之外保持覆蓋
- 在發行前檢查之前執行 `pnpm check:architecture`，以便更廣泛的
  匯入週期和架構邊界檢查在更快的本機閘道之外保持綠燈
- 在 `pnpm release:check` 之前執行 `pnpm build && pnpm ui:build`，以便預期的
  `dist/*` 發行構件和 Control UI 捆綁包存在，用於打包
  驗證步驟
- 在每次標記發行前執行 `pnpm release:check`
- 發行檢查現今在獨立的手動工作流中執行：
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` 也會在發布核准前執行 QA Lab mock parity gate 以及實時
  Matrix 和 Telegram QA lanes。實時 lanes 使用
  `qa-live-shared` 環境；Telegram 也使用 Convex CI credential leases。
- 跨平台安裝和升級執行時驗證是從
  私有呼叫者工作流程
  `openclaw/releases-private/.github/workflows/openclaw-cross-os-release-checks.yml`
  分派的，該工作流程會調用可重複使用的公開工作流程
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- 這種區分是有意的：保持真實的 npm 發布路徑簡短、
  確定性且以構件為重點，而較慢的實時檢查則保持在
  它們自己的通道中，以免延遲或阻礙發布
- 發布檢查必須從 `main` workflow ref 或從
  `release/YYYY.M.D` workflow ref 分派，以便工作流程邏輯和密鑰保持
  受控
- 該工作流程接受現有的發布標籤或當前的完整
  40 字元工作流程分支提交 SHA
- 在 commit-SHA 模式下，它僅接受當前工作流程分支的 HEAD；對於較舊的發布提交，請使用
  發布標籤
- `OpenClaw NPM Release` 僅驗證的 preflight 也接受當前
  完整的 40 字元工作流程分支提交 SHA，而不需要推送標籤
- 該 SHA 路徑僅用於驗證，無法提升為真實的發布
- 在 SHA 模式下，工作流程僅針對
  套件元資料檢查合成 `v<package.json version>`；真實發布仍然需要真實的發布標籤
- 這兩個工作流程都將真實的發布和提升路徑保留在 GitHub 託管的
  執行器上，而非變更的驗證路徑則可以使用更大的
  Blacksmith Linux 執行器
- 該工作流程使用
  `OPENAI_API_KEY` 和 `ANTHROPIC_API_KEY` 工作流程密鑰
  來執行
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
- npm release preflight 不再等待單獨的 release checks lane
- 在核准前執行 `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  （或符合的 beta/correction 標籤）
- npm publish 之後，執行
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  （或符合的 beta/correction 版本），以在全新的暫存字首中驗證已發布的 registry
  安裝路徑
- 維護者發布自動化現在使用 preflight-then-promote：
  - 真實的 npm publish 必須通過成功的 npm `preflight_run_id`
  - 真正的 npm 發佈必須從與成功的預檢運行相同的 `main` 或
    `release/YYYY.M.D` 分支調度
  - 穩定版 npm 發佈預設為 `beta`
  - 穩定版 npm 發佈可以透過工作流程輸入明確指定 `latest`
  - 基於令牌的 npm dist-tag 變更現在位於
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    中，出於安全原因，因為 `npm dist-tag add` 仍然需要 `NPM_TOKEN`，
    而公開儲存庫僅保留 OIDC 發佈
  - 公開 `macOS Release` 僅用於驗證
  - 真正的私有 mac 發佈必須通過成功的私有 mac
    `preflight_run_id` 和 `validate_run_id`
  - 實際的發佈路徑會推廣準備好的工件，而不是重新構建它們
- 對於像 `YYYY.M.D-N` 這樣的穩定修正版本，發佈後驗證器
  還會檢查從 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同臨時前綴升級路徑，
  以免發佈修正無聲無息地在基礎穩定負載上留下較舊的全局安裝
- 除非 tarball 同時包含
  `dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 負載，
  否則 npm 發佈預檢將失敗關閉，
  以免我們再次發佈空的瀏覽器儀表板
- 發佈後驗證還會檢查已發佈的 registry 安裝
  在根 `dist/*`
  佈局下是否包含非空的捆綁插件運行時依賴項。如果發佈的捆綁插件
  依賴負載缺失或為空，則無法通過發佈後驗證器，並且無法推廣
  到 `latest`。
- `pnpm test:install:smoke` 也會對候選更新 tarball 執行 npm pack `unpackedSize` 預算限制，
  以便安裝程式 e2e 在發佈路徑之前捕獲意外的打包膨脹
- 如果發佈工作涉及 CI 規劃、擴充計時清單或
  擴充測試矩陣，請在批准之前從 `.github/workflows/ci.yml`
  重新生成並審查規劃器擁有的 `checks-node-extensions` 工作流程矩陣輸出，
  以免發佈說明描述過時的 CI 佈局
- 穩定版 macOS 發佈準備情況還包括更新程式表面：
  - GitHub 發布最終必須包含打包好的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - 發布後，`appcast.xml` 上的 `main` 必須指向新的穩定版 zip 檔案
  - 打包好的應用程式必須保持非偵錯 bundle id、非空白的 Sparkle feed
    URL，以及高於或等於該發布版本正式 Sparkle 建置底線的 `CFBundleVersion`

## NPM 工作流程輸入

`OpenClaw NPM Release` 接受這些由操作員控制的輸入：

- `tag`：必要的發布標籤，例如 `v2026.4.2`、`v2026.4.2-1` 或
  `v2026.4.2-beta.1`；當 `preflight_only=true` 時，它也可以是目前完整的
  40 字元工作流程分支提交 SHA，僅用於驗證預檢
- `preflight_only`：`true` 僅用於驗證/建置/打包，`false` 用於
  實際發布路徑
- `preflight_run_id`：實際發布路徑上必填，以便工作流程重複使用
  來自成功預檢執行的準備好的 tarball
- `npm_dist_tag`：發布路徑的 npm 目標標籤；預設為 `beta`

`OpenClaw Release Checks` 接受這些由操作員控制的輸入：

- `ref`：現有的發布標籤或目前的完整 40 字元 `main` 提交
  SHA，用於從 `main` 派發時的驗證；從發布分支派發時，使用
  現有的發布標籤或目前的完整 40 字元發布分支提交
  SHA

規則：

- 穩定版和修正標籤可以發布到 `beta` 或 `latest`
- Beta 預發布標籤只能發布到 `beta`
- 對於 `OpenClaw NPM Release`，僅當
  `preflight_only=true` 時才允許輸入完整提交 SHA
- `OpenClaw Release Checks` 始終僅用於驗證，並且也接受
  目前的工作流程分支提交 SHA
- 發布檢查的 commit-SHA 模式還需要目前的工作流程分支 HEAD
- 實際發布路徑必須使用在發布前檢查期間使用的相同 `npm_dist_tag`；
  工作流程會在發布前驗證該元資料

## 穩定版 npm 發布流程

當發布穩定版 npm 時：

1. 使用 `preflight_only=true` 執行 `OpenClaw NPM Release`
   - 在標籤存在之前，您可以使用當前完整的工作流程分支提交
     SHA 來執行僅驗證的發布前檢查試運行
2. 選擇 `npm_dist_tag=beta` 進行正常的 Beta 優先流程，或者僅在您
   明確想要直接發布穩定版時選擇 `latest`
3. 當您需要即時提示快取、
   QA Lab 對等性、Matrix 和 Telegram 覆蓋率時，請單獨使用相同的標籤或
   完整的當前工作流程分支提交 SHA 執行 `OpenClaw Release Checks`
   - 這是有意分離的，以便即時覆蓋率保持可用，而無需
     將長時間運行或不穩定的檢查重新耦合到發布工作流程
4. 保存成功的 `preflight_run_id`
5. 再次使用 `preflight_only=false`、相同的
   `tag`、相同的 `npm_dist_tag` 和保存的 `preflight_run_id` 執行 `OpenClaw NPM Release`
6. 如果發布落地於 `beta`，請使用私有
   `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
   工作流程將該穩定版本從 `beta` 提升到 `latest`
7. 如果發布意圖直接發布到 `latest` 並且 `beta`
   應立即跟隨相同的穩定構建，請使用相同的私有
   工作流程將兩個 dist-tags 指向該穩定版本，或者讓其預定的
   自我修復同步稍後移動 `beta`

出於安全考慮，dist-tag 變更位於私有倉庫中，因為它仍然
需要 `NPM_TOKEN`，而公共倉庫僅保留 OIDC 發布。

這確保了直接發布路徑和 Beta 優先提升路徑都
有文件記錄且操作員可見。

## 公開參考

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`.github/workflows/openclaw-release-checks.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-release-checks.yml)
- [`.github/workflows/openclaw-cross-os-release-checks-reusable.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-cross-os-release-checks-reusable.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

維護者使用
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
中的私有發佈文檔作為實際的操作手冊。
