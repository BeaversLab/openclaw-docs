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
- 跨作業系統安裝和升級執行時驗證是從
  私有調用者工作流
  `openclaw/releases-private/.github/workflows/openclaw-cross-os-release-checks.yml`
  分派的，
  該工作流會呼叫可重複使用的公開工作流
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- 這種分拆是有意為之的：保持真正的 npm 發行路徑簡短、
  確定性並專注於構件，而較慢的即時檢查則留在
  自己的專用通道，以免延遲或阻擋發佈
- 必須從 `main` 工作流引用或從
  `release/YYYY.M.D` 工作流引用分派發行檢查，以便工作流邏輯和密鑰
  保持受控
- 該工作流程接受現有的發行標籤或當前完整的
  40 字元工作流分支提交 SHA
- 在提交 SHA 模式下，它僅接受當前工作流分支的 HEAD；對於較舊的發行提交，請使用發行標籤
- `OpenClaw NPM Release` validation-only preflight 也接受當前的
  完整 40 字元工作流程分支 commit SHA，而無需推送標籤
- 該 SHA 路徑僅用於驗證，無法升級為真正的發布
- 在 SHA 模式下，工作流程僅針對套件中繼資料檢查合成 `v<package.json version>`；真正的發布仍需真正的發布標籤
- 這兩個工作流程都將真正的發布和升級路徑保留在 GitHub 託管的
  執行器上，而非變異的驗證路徑則可使用更大的
  Blacksmith Linux 執行器
- 該工作流程使用 `OPENAI_API_KEY` 和 `ANTHROPIC_API_KEY` 工作流程密鑰執行
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
- npm 發布預檢不再等待獨立的發布檢查通道
- 在批准之前執行 `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  （或對應的 beta/correction 標籤）
- npm 發布後，執行
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  （或對應的 beta/correction 版本），以在全新的暫存字首中驗證已發布的註冊表
  安裝路徑
- 維護者發布自動化現在使用預檢後升級：
  - 真正的 npm 發布必須通過成功的 npm `preflight_run_id`
  - 真正的 npm 發布必須從與成功預檢執行相同的 `main` 或
    `release/YYYY.M.D` 分支分派
  - 穩定版 npm 發布預設為 `beta`
  - 穩定版 npm 發布可透過工作流程輸入明確指定 `latest`
  - 基於權杖的 npm dist-tag 變更現位於
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    中以確保安全，因為 `npm dist-tag add` 仍需要 `NPM_TOKEN`，同時
    公開儲存庫僅保留 OIDC 發布
  - 公開 `macOS Release` 僅用於驗證
  - 真正的私人 mac 發布必須通過成功的私人 mac
    `preflight_run_id` 和 `validate_run_id`
  - 真正的發布路徑會升級準備好的構件，而不是重建
    它們
- 對於像 `YYYY.M.D-N` 這樣的穩定修正版本，發布後驗證器
  還會檢查從 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同臨時前綴升級路徑，
  以確保發布修正不會在不被察覺的情況下將較舊的全局安裝留在
  基礎穩定負載上
- 除非 tarball 包含 `dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 負載，
  否則 npm 發布預檢將失敗（關閉），
  以確保我們不會再次發布空的瀏覽器儀表板
- `pnpm test:install:smoke` 還會對候選更新 tarball 強制執行 npm pack `unpackedSize` 預算，
  以便安裝程序 e2e 在發布路徑之前捕獲意外的打包膨脹
- 如果發布工作涉及 CI 規劃、擴展時期清單或
  擴展測試矩陣，請在批准之前從 `.github/workflows/ci.yml`
  重新生成並審查規劃器擁有的
  `checks-node-extensions` 工作流程矩陣輸出，
  以確保發布說明不會描述過時的 CI 佈局
- 穩定版 macOS 發布準備工作還包括更新程序介面：
  - GitHub 發布最終必須包含打包好的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - `main` 上的 `appcast.xml` 必須在發布後指向新的穩定版 zip
  - 打包的應用程式必須保持非調試 bundle id、非空的 Sparkle feed
    URL，以及針對該發布版本的高於或等於規範 Sparkle 構建基線的
    `CFBundleVersion`

## NPM 工作流程輸入

`OpenClaw NPM Release` 接受這些操作員控制的輸入：

- `tag`：必需的發布標籤，例如 `v2026.4.2`、`v2026.4.2-1` 或
  `v2026.4.2-beta.1`；當 `preflight_only=true` 時，它也可以是當前
  完整的 40 字元工作流程分支提交 SHA，僅用於驗證預檢
- `preflight_only`：`true` 僅用於驗證/構建/打包，`false` 用於
  實際的發布路徑
- `preflight_run_id`：在實際發布路徑上必需，以便工作流程重用
  來自成功預檢運行的已準備 tarball
- `npm_dist_tag`：發布路徑的 npm 目標標籤；預設為 `beta`

`OpenClaw Release Checks` 接受這些由操作員控制的輸入：

- `ref`：現有的發布標籤或當前完整的 40 字元 `main` 提交
  SHA，用於從 `main` 分派時進行驗證；如果是從發布分支，則使用
  現有的發布標籤或當前完整的 40 字元發布分支提交
  SHA

規則：

- 穩定版和修正標籤可以發布到 `beta` 或 `latest`
- Beta 預發布標籤只能發布到 `beta`
- 對於 `OpenClaw NPM Release`，僅當 `preflight_only=true` 時才允許輸入完整的提交 SHA
- `OpenClaw Release Checks` 始終僅用於驗證，並且也接受
  當前工作流分支的提交 SHA
- 發布檢查的 commit-SHA 模式還需要當前工作流分支的 HEAD
- 實際的發布路徑必須使用與發布前檢查期間相同的 `npm_dist_tag`；
  工作流會在繼續發布之前驗證該元資料

## 穩定版 npm 發布順序

當切出一個穩定版 npm 發布時：

1. 使用 `preflight_only=true` 運行 `OpenClaw NPM Release`
   - 在標籤存在之前，您可以使用當前完整的工作流分支提交
     SHA 來對發布前檢查工作流進行僅驗證的試運行
2. 選擇 `npm_dist_tag=beta` 以進行正常的 beta 優先流程，或者僅在
   您故意想要直接進行穩定版發布時選擇 `latest`
3. 當您需要實時提示快取覆蓋時，請單獨使用相同的標籤或
   當前完整的工作流分支提交 SHA 運行 `OpenClaw Release Checks`
   - 這是有意分開的，以便實時覆蓋保持可用，而無需
     將耗時或 不穩定的檢查重新耦合到發布工作流
4. 保存成功的 `preflight_run_id`
5. 使用 `preflight_only=false`、相同的
   `tag`、相同的 `npm_dist_tag` 以及保存的 `preflight_run_id` 再次運行 `OpenClaw NPM Release`
6. 如果發布版已落地至 `beta`，請使用私有的
   `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
   工作流程將該穩定版本從 `beta` 推廣至 `latest`
7. 如果發布版是有意直接發布到 `latest` 並且 `beta`
   應立即跟進同一個穩定構建版本，請使用相同的私有
   工作流程將這兩個 dist-tags 指向該穩定版本，或者讓其排程的
   自動修復同步稍後移動 `beta`

出於安全考量，dist-tag 的異動位於私有倉庫中，因為它仍然
需要 `NPM_TOKEN`，而公開倉庫則保持僅使用 OIDC 發布。

這樣可以確保直接發布路徑和 beta 優先推廣路徑都有
文件記錄且對操作員可見。

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
