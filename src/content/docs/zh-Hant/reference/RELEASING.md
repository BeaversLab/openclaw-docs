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
- 每次 OpenClaw 發布都會同時發布 npm 套件和 macOS 應用程式

## 發布頻率

- 發布流程採用 Beta 優先
- 只有在最新的 Beta 版本經過驗證後，才會進行穩定版發布
- 詳細的發布程序、審核、憑證與復原說明僅供維護者檢視

## 發布前檢查

- 在 `pnpm release:check` 之前執行 `pnpm build && pnpm ui:build`，以便打包驗證步驟使用預期的
  `dist/*` 發布工件和控制 UI 捆綁包
- 在每次帶標籤的發布之前執行 `pnpm release:check`
- Release checks now run in a separate manual workflow:
  `OpenClaw Release Checks`
- Cross-OS install and upgrade runtime validation is dispatched from the
  private caller workflow
  `openclaw/releases-private/.github/workflows/openclaw-cross-os-release-checks.yml`,
  which invokes the reusable public workflow
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- This split is intentional: keep the real npm release path short,
  deterministic, and artifact-focused, while slower live checks stay in their
  own lane so they do not stall or block publish
- Release checks must be dispatched from the `main` workflow ref so the
  workflow logic and secrets stay canonical
- That workflow accepts either an existing release tag or the current full
  40-character `main` commit SHA
- In commit-SHA mode it only accepts the current `origin/main` HEAD; use a
  release tag for older release commits
- `OpenClaw NPM Release` validation-only preflight also accepts the current
  full 40-character `main` commit SHA without requiring a pushed tag
- That SHA path is validation-only and cannot be promoted into a real publish
- In SHA mode the workflow synthesizes `v<package.json version>` only for the
  package metadata check; real publish still requires a real release tag
- Both workflows keep the real publish and promotion path on GitHub-hosted
  runners, while the non-mutating validation path can use the larger
  Blacksmith Linux runners
- That workflow runs
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  using both `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` workflow secrets
- npm release preflight no longer waits on the separate release checks lane
- Run `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  (or the matching beta/correction tag) before approval
- After npm publish, run
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  (or the matching beta/correction version) to verify the published registry
  install path in a fresh temp prefix
- Maintainer release automation now uses preflight-then-promote:
  - real npm publish must pass a successful npm `preflight_run_id`
  - stable npm releases default to `beta`
  - stable npm publish can target `latest` explicitly via workflow input
  - 基於 token 的 npm dist-tag 變更現在位於
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    中，出於安全原因，因為 `npm dist-tag add` 在公用儲存庫僅保留 OIDC 發布時仍然需要 `NPM_TOKEN`
  - 公用 `macOS Release` 僅用於驗證
  - 真正的私人 mac 發布必須通過成功的私人 mac
    `preflight_run_id` 和 `validate_run_id`
  - 實際的發布路徑會推廣準備好的成品，而不是重新建置它們
- 對於像 `YYYY.M.D-N` 這樣的穩定修正版本，發布後驗證器
  也會檢查從 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同臨時字首升級路徑，
  以便修正版本不會在基礎穩定內容上無聲無息地留下較舊的全域安裝
- 除非 tarball 包含
  `dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 內容，
  否則 npm 發布預檢將失敗關閉，以免我們再次發送空的瀏覽器儀表板
- `pnpm test:install:smoke` 也會對候選更新 tarball 強制執行 npm pack `unpackedSize` 預算，
  以便安裝程式 e2e 能在發布發布路徑之前捕捉到意外的打包膨脹
- 如果發布工作涉及 CI 規劃、擴充功能時間顯示清單或
  擴充功能測試矩陣，請在批准前從 `.github/workflows/ci.yml` 重新產生並檢視規劃器擁有的
  `checks-node-extensions` 工作流程矩陣輸出，以免發布說明描述過時的 CI 版面配置
- 穩定 macOS 發布準備工作還包括更新程式表面：
  - GitHub 發布最終必須包含打包好的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - `main` 上的 `appcast.xml` 必須在發布後指向新的穩定 zip
  - 打包的應用程式必須保留非偵錯 bundle id、非空的 Sparkle feed
    URL，以及針對該發布版本等於或高於標準 Sparkle 建置底線的 `CFBundleVersion`

## NPM 工作流程輸入

`OpenClaw NPM Release` 接受這些操作員控制的輸入：

- `tag`：所需的版本標籤，例如 `v2026.4.2`、`v2026.4.2-1` 或
  `v2026.4.2-beta.1`；當 `preflight_only=true` 時，也可以是當前完整的 40 個字元的 `main` 提交 SHA，僅用於驗證預檢
- `preflight_only`：`true` 表示僅用於驗證/建置/打包，`false` 表示
  實際發布路徑
- `preflight_run_id`：實際發布路徑上必填，以便工作流程重複使用
  來自成​​功預檢運行所準備的 tarball
- `npm_dist_tag`：發布路徑的 npm 目標標籤；預設為 `beta`

`OpenClaw Release Checks` 接受這些操作員控制的輸入：

- `ref`：現有的版本標籤或當前完整的 40 個字元的 `main` 提交
  SHA 以進行驗證

規則：

- 穩定和更正標籤可以發布到 `beta` 或 `latest`
- Beta 預發布標籤只能發布到 `beta`
- 僅當 `preflight_only=true` 時，才允許輸入完整的提交 SHA
- 發布檢查 commit-SHA 模式還需要當前 `origin/main` HEAD
- 實際發布路徑必須使用與預檢期間使用的相同的 `npm_dist_tag`；
  工作流程會在繼續發布前驗證該元資料

## 穩定 npm 發布序列

當進行穩定 npm 發布時：

1. 使用 `preflight_only=true` 執行 `OpenClaw NPM Release`
   - 在標籤存在之前，您可以使用當前完整的 `main` 提交 SHA 進行
     預檢工作流程的僅驗證乾運行
2. 選擇 `npm_dist_tag=beta` 以進行正常的 beta 優先流程，或僅在
   您有意進行直接穩定發布時選擇 `latest`
3. 當您想要即時提示快取覆蓋時，使用相同的標籤或
   完整的當前 `main` 提交 SHA 分別執行 `OpenClaw Release Checks`
   - 這是有意分開的，以便即時覆蓋保持可用，而無需
     將長時間執行或不穩定的檢查重新耦合到發布工作流程
4. 儲存成功的 `preflight_run_id`
5. 使用 `preflight_only=false`、相同的
   `tag`、相同的 `npm_dist_tag` 以及已儲存的 `preflight_run_id` 再次執行 `OpenClaw NPM Release`
6. 如果發布版落在 `beta` 上，請使用私有
   `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
   工作流程將該穩定版本從 `beta` 推廣至 `latest`
7. 如果發布版刻意直接發布至 `latest`，且 `beta`
   應立即跟隨相同的穩定建置，請使用相同的私有
   工作流程將兩個 dist-tags 指向該穩定版本，或讓其排程的
   自我修復同步稍後移動 `beta`

出於安全考量，dist-tag 的變更位於私有儲存庫中，因為它仍然
需要 `NPM_TOKEN`，而公用儲存庫則保持僅限 OIDC 發布。

這樣能確保直接發布途徑和 beta 優先推廣途徑都有
文件記錄且對操作者可見。

## 公開參考資料

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`.github/workflows/openclaw-release-checks.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-release-checks.yml)
- [`.github/workflows/openclaw-cross-os-release-checks-reusable.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-cross-os-release-checks-reusable.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

維護者使用
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
中的私有發布文件作為實際的操作手冊。
