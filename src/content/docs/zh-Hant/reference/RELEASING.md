---
title: "發布政策"
summary: "公開發布管道、版本命名與發布頻率"
read_when:
  - Looking for public release channel definitions
  - Looking for version naming and cadence
---

# 發布政策

OpenClaw 有三條公開發布管道：

- stable：發佈到 npm `latest` 的已標記版本，並將相同版本鏡像到 `beta`，除非 `beta` 已指向較新的預發佈版本
- beta：發佈到 npm `beta` 的預發佈標籤
- dev：`main` 的移動頭部

## 版本命名

- 穩定發佈版本：`YYYY.M.D`
  - Git 標籤：`vYYYY.M.D`
- 穩定修正發佈版本：`YYYY.M.D-N`
  - Git 標籤：`vYYYY.M.D-N`
- Beta 預發佈版本：`YYYY.M.D-beta.N`
  - Git 標籤：`vYYYY.M.D-beta.N`
- 不要對月份或日期補零
- `latest` 表示當前的穩定 npm 發佈
- `beta` 表示當前的 beta 安裝目標，它可能指向當前活動的預發佈版本或最新已晉升的穩定版本
- 穩定版和穩定修正版發佈會發佈到 npm `latest`，並在晉升後將 npm `beta` 重新標籤為同一個非 beta 版本，除非 `beta` 已指向較新的預發佈版本
- 每次 OpenClaw 發布都會同時發布 npm 套件和 macOS 應用程式

## 發布頻率

- 發布流程採用 Beta 優先
- 只有在最新的 Beta 版本經過驗證後，才會進行穩定版發布
- 詳細的發布程序、審核、憑證與復原說明僅供維護者檢視

## 發布前檢查

- 在 `pnpm release:check` 之前執行 `pnpm build && pnpm ui:build`，以便預期的
  `dist/*` 發佈構件和 Control UI 包存在於打包
  驗證步驟中
- 在每次標記發佈之前執行 `pnpm release:check`
- 在批准之前執行 `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  （或匹配的 beta/correction 標籤）
- 在 npm publish 之後，執行
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  （或匹配的 beta/correction 版本）以在全新的臨時前綴中驗證已發佈的註冊表
  安裝路徑
- 維護者工作流程可以重用成功的預檢運行用於實際
  發佈，以便發佈步驟晉升準備好的發佈構件而不是
  重新構建它們
- 對於穩定修正發佈（如 `YYYY.M.D-N`），發佈後驗證器
  還會檢查從 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同臨時前綴升級路徑，
  以確保發佈修正不會無聲地將較舊的全局安裝留在
  基礎穩定版本有效載荷上
- npm release preflight fails closed unless the tarball includes both
  `dist/control-ui/index.html` and a non-empty `dist/control-ui/assets/` payload
  so we do not ship an empty browser dashboard again
- If the release work touched CI planning, extension timing manifests, or fast
  test matrices, regenerate and review the planner-owned `checks-fast-extensions`
  shard plan via `node scripts/ci-write-manifest-outputs.mjs --workflow ci`
  before approval so release notes do not describe a stale CI layout
- Stable macOS release readiness also includes the updater surfaces:
  - the GitHub release must end up with the packaged `.zip`, `.dmg`, and `.dSYM.zip`
  - `appcast.xml` on `main` must point at the new stable zip after publish
  - the packaged app must keep a non-debug bundle id, a non-empty Sparkle feed
    URL, and a `CFBundleVersion` at or above the canonical Sparkle build floor
    for that release version

## Public references

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

Maintainers use the private release docs in
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
for the actual runbook.
