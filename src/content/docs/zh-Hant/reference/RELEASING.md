---
title: "發布政策"
summary: "公開發布管道、版本命名與發布頻率"
read_when:
  - Looking for public release channel definitions
  - Looking for version naming and cadence
---

# 發布政策

OpenClaw 有三條公開發布管道：

- stable：發布至 npm 的標籤版本 `latest`
- beta：發布至 npm 的預先發布標籤 `beta`
- dev：`main` 的移動開發分支

## 版本命名

- 穩定發布版本：`YYYY.M.D`
  - Git 標籤：`vYYYY.M.D`
- 穩定修正發布版本：`YYYY.M.D-N`
  - Git 標籤：`vYYYY.M.D-N`
- Beta 預先發布版本：`YYYY.M.D-beta.N`
  - Git 標籤：`vYYYY.M.D-beta.N`
- 不要對月份或日期補零
- `latest` 代表當前的穩定 npm 發布版本
- `beta` 代表當前的預先發布 npm 版本
- 穩定修正發布版本也會發布至 npm `latest`
- 每次 OpenClaw 發布都會同時發布 npm 套件和 macOS 應用程式

## 發布頻率

- 發布流程採用 Beta 優先
- 只有在最新的 Beta 版本經過驗證後，才會進行穩定版發布
- 詳細的發布程序、審核、憑證與復原說明僅供維護者檢視

## 發布前檢查

- 在 `pnpm release:check` 之前執行 `pnpm build`，以便套件驗證步驟有預期的 `dist/*` 發布
  檔案存在
- 在每次標記發布之前執行 `pnpm release:check`
- 在批准之前執行 `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  (或對應的 beta/correction 標籤)
- 在 npm publish 之後，執行
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  (或對應的 beta/correction 版本)，以在全新的暫存字首中驗證已發布的註冊表
  安裝路徑
- 對於 `YYYY.M.D-N` 這類穩定修正發布版本，發布後驗證工具
  也會檢查從 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同暫存字首升級路徑，
  以確保發布修正不會在基礎穩定承載上無聲無息地遺留較舊的全域安裝
- npm release preflight fails closed unless the tarball includes both
  `dist/control-ui/index.html` and a non-empty `dist/control-ui/assets/` payload
  so we do not ship an empty browser dashboard again
- Stable macOS release readiness also includes the updater surfaces:
  - the GitHub release must end up with the packaged `.zip`, `.dmg`, and `.dSYM.zip`
  - `appcast.xml` on `main` must point at the new stable zip after publish
  - the packaged app must keep a non-debug bundle id, a non-empty Sparkle feed
    URL, and a `CFBundleVersion` at or above the canonical Sparkle build floor
    for that release version

## 公開參考

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

Maintainers use the private release docs in
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
for the actual runbook.
