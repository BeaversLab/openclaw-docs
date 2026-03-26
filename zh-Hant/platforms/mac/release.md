---
summary: "OpenClaw macOS 版本發佈檢查清單（Sparkle feed、打包、簽署）"
read_when:
  - Cutting or validating a OpenClaw macOS release
  - Updating the Sparkle appcast or feed assets
title: "macOS 版本發佈"
---

# OpenClaw macOS 版本發佈（Sparkle）

此應用程式現已內建 Sparkle 自動更新功能。發佈版本必須經過 Developer ID 簽署、壓縮，並附帶已簽署的 appcast 條目進行發佈。

## 先決條件

- 已安裝 Developer ID Application 憑證（例如：`Developer ID Application: <Developer Name> (<TEAMID>)`）。
- 已在環境變數中設定 Sparkle 私鑰路徑為 `SPARKLE_PRIVATE_KEY_FILE`（您的 Sparkle ed25519 私鑰路徑；公鑰已內建於 Info.plist 中）。如果缺失，請檢查 `~/.profile`。
- 如果您需要通過 Gatekeeper 的安全 DMG/zip 發佈，請準備 `xcrun notarytool` 的公證憑證（鑰匙圈設定檔或 API 金鑰）。
  - 我們使用一個名為 `openclaw-notary` 的鑰匙圈設定檔，它是從您 shell 設定檔中的 App Store Connect API 金鑰環境變數建立的：
    - `APP_STORE_CONNECT_API_KEY_P8`、`APP_STORE_CONNECT_KEY_ID`、`APP_STORE_CONNECT_ISSUER_ID`
    - `echo "$APP_STORE_CONNECT_API_KEY_P8" | sed 's/\\n/\n/g' > /tmp/openclaw-notary.p8`
    - `xcrun notarytool store-credentials "openclaw-notary" --key /tmp/openclaw-notary.p8 --key-id "$APP_STORE_CONNECT_KEY_ID" --issuer "$APP_STORE_CONNECT_ISSUER_ID"`
- 已安裝 `pnpm` 相依套件（`pnpm install --config.node-linker=hoisted`）。
- Sparkle 工具會透過 SwiftPM 在 `apps/macos/.build/artifacts/sparkle/Sparkle/bin/` 自動取得（`sign_update`、`generate_appcast` 等）。

## 建置與打包

備註：

- `APP_BUILD` 對應到 `CFBundleVersion`/`sparkle:version`；請保持其為數字且單調遞增（無 `-beta`），否則 Sparkle 會將其視為相同版本。
- 如果省略了 `APP_BUILD`，`scripts/package-mac-app.sh` 會從 `APP_VERSION` 推導出適用於 Sparkle 的預設值（`YYYYMMDDNN`：穩定版預設為 `90`，預發布版使用源自後綴的通道），並使用該值與 git 提交計數中較高的一個。
- 當發佈工程需要特定的單調遞增值時，您仍然可以明確覆寫 `APP_BUILD`。
- 對於 `BUILD_CONFIG=release`，`scripts/package-mac-app.sh` 現在會自動預設為通用（`arm64 x86_64`）版本。您仍然可以使用 `BUILD_ARCHS=arm64` 或 `BUILD_ARCHS=x86_64` 進行覆寫。對於本機/開發構建（`BUILD_CONFIG=debug`），它預設為當前架構（`$(uname -m)`）。
- 使用 `scripts/package-mac-dist.sh` 進行發行版產物（zip + DMG + notarization）的處理。使用 `scripts/package-mac-app.sh` 進行本地/開發打包。

```bash
# From repo root; set release IDs so Sparkle feed is enabled.
# This command builds release artifacts without notarization.
# APP_BUILD must be numeric + monotonic for Sparkle compare.
# Default is auto-derived from APP_VERSION when omitted.
SKIP_NOTARIZE=1 \
BUNDLE_ID=ai.openclaw.mac \
APP_VERSION=2026.3.13 \
BUILD_CONFIG=release \
SIGN_IDENTITY="Developer ID Application: <Developer Name> (<TEAMID>)" \
scripts/package-mac-dist.sh

# `package-mac-dist.sh` already creates the zip + DMG.
# If you used `package-mac-app.sh` directly instead, create them manually:
# If you want notarization/stapling in this step, use the NOTARIZE command below.
ditto -c -k --sequesterRsrc --keepParent dist/OpenClaw.app dist/OpenClaw-2026.3.13.zip

# Optional: build a styled DMG for humans (drag to /Applications)
scripts/create-dmg.sh dist/OpenClaw.app dist/OpenClaw-2026.3.13.dmg

# Recommended: build + notarize/staple zip + DMG
# First, create a keychain profile once:
#   xcrun notarytool store-credentials "openclaw-notary" \
#     --apple-id "<apple-id>" --team-id "<team-id>" --password "<app-specific-password>"
NOTARIZE=1 NOTARYTOOL_PROFILE=openclaw-notary \
BUNDLE_ID=ai.openclaw.mac \
APP_VERSION=2026.3.13 \
BUILD_CONFIG=release \
SIGN_IDENTITY="Developer ID Application: <Developer Name> (<TEAMID>)" \
scripts/package-mac-dist.sh

# Optional: ship dSYM alongside the release
ditto -c -k --keepParent apps/macos/.build/release/OpenClaw.app.dSYM dist/OpenClaw-2026.3.13.dSYM.zip
```

## Appcast 條目

使用發行說明產生器，讓 Sparkle 呈現格式化的 HTML 說明：

```bash
SPARKLE_PRIVATE_KEY_FILE=/path/to/ed25519-private-key scripts/make_appcast.sh dist/OpenClaw-2026.3.13.zip https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml
```

從 `CHANGELOG.md`（透過 [`scripts/changelog-to-html.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/changelog-to-html.sh)）產生 HTML 發行說明，並將其嵌入 appcast 條目中。
發佈時，將更新後的 `appcast.xml` 與發行資產（zip + dSYM）一起提交。

## 發佈與驗證

- 將 `OpenClaw-2026.3.13.zip`（和 `OpenClaw-2026.3.13.dSYM.zip`）上傳到標籤 `v2026.3.13` 的 GitHub 發行版。
- 確保原始 appcast URL 與 baked feed 相符：`https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml`。
- 健全性檢查：
  - `curl -I https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml` 傳回 200。
  - `curl -I <enclosure url>` 在上傳資產後傳回 200。
  - 在先前的公開建置版本上，從「關於」分頁執行「檢查更新…」，並驗證 Sparkle 是否乾淨地安裝了新版本。

完成定義：已發佈簽署的 App + appcast，更新流程可從舊版本運作，且發佈資源已附加至 GitHub release。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
