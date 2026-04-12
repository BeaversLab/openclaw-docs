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
- 主分支 npm 預檢還會在打包 tarball 之前執行
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`，
  使用 `OPENAI_API_KEY` 和
  `ANTHROPIC_API_KEY` 工作流程密鑰
- 在批准之前執行 `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  （或匹配的 beta/correction 標籤）
- npm 發布後，執行
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  （或匹配的 beta/correction 版本）以在新的臨時前綴中驗證已發布的註冊表
  安裝路徑
- 維護者發布自動化現在使用預檢後推廣模式：
  - 真實的 npm 發布必須通過成功的 npm `preflight_run_id`
  - 穩定 npm 發布默認使用 `beta`
  - 穩定 npm 發布可以通過工作流程輸入明確指定 `latest` 作為目標
  - 從 `beta` 到 `latest` 的穩定 npm 推廣仍可作為受信任 `OpenClaw NPM Release` 工作流程上的一種明確手動模式使用
  - 該升級模式仍需在 `npm-release` 環境中擁有有效的 `NPM_TOKEN`，因為 npm `dist-tag` 管理與信任發布是分離的
  - 公開 `macOS Release` 僅用於驗證
  - 真實的私有 mac 發布必須通過成功的私有 mac
    `preflight_run_id` 和 `validate_run_id`
  - 真實的發布路徑會推廣準備好的產出工件，而不是
    重新建置它們
- 對於像 `YYYY.M.D-N` 這樣的穩定修正版本，發布後驗證器
  也會檢查從 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同暫存前綴升級路徑，
  以確保發布修正不會在基礎穩定承載上無聲無息地留下較舊的全域安裝
- 除非壓縮包同時包含
  `dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 承載，
  否則 npm 發布預檢會以失敗關閉，
  以免我們再次發布空的瀏覽器儀表板
- 如果發布工作涉及 CI 規劃、擴充功能時間清單或擴充功能測試矩陣，請在批准前重新產生並審閱來自 `.github/workflows/ci.yml` 的規劃器擁有的 `checks-node-extensions` 工作流程矩陣輸出，以免發布說明描述過時的 CI 版面配置
- 穩定 macOS 發布準備就緒也包括更新介面：
  - GitHub 發布最終必須包含打包好的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - `main` 上的 `appcast.xml` 必須在發布後指向新的穩定 zip 檔案
  - 打包的應用程式必須保持非除錯 bundle id、非空 Sparkle feed
    URL，以及高於或等於該發布版本的正式 Sparkle 建置底線的
    `CFBundleVersion`

## NPM 工作流程輸入

`OpenClaw NPM Release` 接受這些操作員控制的輸入：

- `tag`：必要的發布標籤，例如 `v2026.4.2`、`v2026.4.2-1` 或
  `v2026.4.2-beta.1`
- `preflight_only`：`true` 僅用於驗證/建置/打包，`false` 用於
  真實發布路徑
- `preflight_run_id`：在實際發布路徑上為必需項，以便工作流程重複使用
  來自成功預檢運行的準備好的 tarball
- `npm_dist_tag`：發布路徑的 npm 目標標籤；預設為 `beta`
- `promote_beta_to_latest`：`true` 以跳過發布並將已發布的
  穩定 `beta` 組建移動到 `latest`

規則：

- 穩定和修正標籤可以發布到 `beta` 或 `latest`
- Beta 預發布標籤僅可發布到 `beta`
- 實際發布路徑必須使用預檢期間使用的相同 `npm_dist_tag`；
  工作流程會在繼續發布之前驗證該元資料
- 升級模式必須使用穩定或修正標籤、`preflight_only=false`、
  空的 `preflight_run_id` 以及 `npm_dist_tag=beta`
- 升級模式還需要在 `npm-release` 環境中提供有效的 `NPM_TOKEN`，
  因為 `npm dist-tag add` 仍需要常規 npm 身份驗證

## 穩定 npm 發布順序

當發布穩定 npm 版本時：

1. 使用 `preflight_only=true` 執行 `OpenClaw NPM Release`
2. 選擇 `npm_dist_tag=beta` 以進行正常的 beta 優先流程，或者僅當您
   有意進行直接穩定發布時選擇 `latest`
3. 保存成功的 `preflight_run_id`
4. 使用 `preflight_only=false`、相同的 `tag`、
   相同的 `npm_dist_tag` 以及保存的 `preflight_run_id` 再次執行 `OpenClaw NPM Release`
5. 如果發布發布在 `beta` 上，請稍後使用相同的穩定 `tag`、
   `promote_beta_to_latest=true`、`preflight_only=false`、空的 `preflight_run_id`
   和 `npm_dist_tag=beta` 執行 `OpenClaw NPM Release`，當您想要將該
   已發布的組建移動到 `latest` 時

昇級模式仍需要 `npm-release` 環境的核准以及該環境中有效的 `NPM_TOKEN`。

這樣可以確保直接發布路徑和優先發布 beta 的昇級路徑都有文件記載，並讓操作員可見。

## 公開參考資料

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

維護者使用
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
中的私有發布文件來作為實際的操作手冊。
