---
summary: "OpenClaw macOS 版本检查清单（Sparkle feed、打包、签名）"
read_when:
  - "Cutting or validating a OpenClaw macOS release"
  - "Updating the Sparkle appcast or feed assets"
title: "macOS Release"
---

# OpenClaw macOS 版本（Sparkle）

此应用程序现在附带 Sparkle 自动更新。版本版本必须使用 Developer ID 签名、压缩，并使用签名的 appcast 条目发布。

## 先决条件

- 安装了 Developer ID Application 证书（例如：`Developer ID Application: <Developer Name> (<TEAMID>)`）。
- Sparkle 私钥路径在环境中设置为 `SPARKLE_PRIVATE_KEY_FILE`（Sparkle ed25519 私钥的路径；公钥内置到 Info.plist 中）。如果缺失，请检查 `~/.profile`。
- 如果您想要 Gatekeeper-safe DMG/zip 分发，则需要 `xcrun notarytool` 的公证凭据（钥匙串配置文件或 API 密钥）。
  - 我们使用名为 `openclaw-notary` 的钥匙串配置文件，它从 Shell 配置文件中的 App Store Connect API 密钥环境变量创建：
    - `APP_STORE_CONNECT_API_KEY_P8`、`APP_STORE_CONNECT_KEY_ID`、`APP_STORE_CONNECT_ISSUER_ID`
    - `echo "$APP_STORE_CONNECT_API_KEY_P8" | sed 's/\\n/\n/g' > /tmp/openclaw-notary.p8`
    - `xcrun notarytool store-credentials "openclaw-notary" --key /tmp/openclaw-notary.p8 --key-id "$APP_STORE_CONNECT_KEY_ID" --issuer "$APP_STORE_CONNECT_ISSUER_ID"`
- 安装了 `pnpm` 依赖项（`pnpm install --config.node-linker=hoisted`）。
- Sparkle 工具在 `apps/macos/.build/artifacts/sparkle/Sparkle/bin/` 通过 SwiftPM 自动获取（`sign_update`、`generate_appcast` 等）。

## 构建和打包

注意：

- `APP_BUILD` 映射到 `CFBundleVersion`/`sparkle:version`；保持其为数字 + 单调（无 `-beta`），否则 Sparkle 将其视为相等。
- 默认为当前架构（`$(uname -m)`）。对于版本/通用版本，请设置 `BUILD_ARCHS="arm64 x86_64"`（或 `BUILD_ARCHS=all`）。
- 使用 `scripts/package-mac-dist.sh` 获取版本工件（zip + DMG + 公证）。使用 `scripts/package-mac-app.sh` 进行本地/开发打包。

```bash
# From repo root; set release IDs so Sparkle feed is enabled.
# APP_BUILD must be numeric + monotonic for Sparkle compare.
BUNDLE_ID=bot.molt.mac \
APP_VERSION=2026.2.3 \
APP_BUILD="$(git rev-list --count HEAD)" \
BUILD_CONFIG=release \
SIGN_IDENTITY="Developer ID Application: <Developer Name> (<TEAMID>)" \
scripts/package-mac-app.sh

# Zip for distribution (includes resource forks for Sparkle delta support)
ditto -c -k --sequesterRsrc --keepParent dist/OpenClaw.app dist/OpenClaw-2026.2.3.zip

# Optional: also build a styled DMG for humans (drag to /Applications)
scripts/create-dmg.sh dist/OpenClaw.app dist/OpenClaw-2026.2.3.dmg

# Recommended: build + notarize/staple zip + DMG
# First, create a keychain profile once:
#   xcrun notarytool store-credentials "openclaw-notary" \
#     --apple-id "<apple-id>" --team-id "<team-id>" --password "<app-specific-password>"
NOTARIZE=1 NOTARYTOOL_PROFILE=openclaw-notary \
BUNDLE_ID=bot.molt.mac \
APP_VERSION=2026.2.3 \
APP_BUILD="$(git rev-list --count HEAD)" \
BUILD_CONFIG=release \
SIGN_IDENTITY="Developer ID Application: <Developer Name> (<TEAMID>)" \
scripts/package-mac-dist.sh

# Optional: ship dSYM alongside the release
ditto -c -k --keepParent apps/macos/.build/release/OpenClaw.app.dSYM dist/OpenClaw-2026.2.3.dSYM.zip
```

## Appcast 条目

使用版本说明生成器，以便 Sparkle 呈现格式化的 HTML 说明：

```bash
SPARKLE_PRIVATE_KEY_FILE=/path/to/ed25519-private-key scripts/make_appcast.sh dist/OpenClaw-2026.2.3.zip https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml
```

从 `CHANGELOG.md` 生成 HTML 版本说明（通过 [`scripts/changelog-to-html.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/changelog-to-html.sh)）并将其嵌入到 appcast 条目中。
发布时，将更新的 `appcast.xml` 与版本工件（zip + dSYM）一起提交。

## 发布和验证

- 将 `OpenClaw-2026.2.3.zip`（和 `OpenClaw-2026.2.3.dSYM.zip`）上传到标签 `v2026.2.3` 的 GitHub 版本。
- 确保原始 appcast URL 与内置的 feed 匹配：`https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml`。
- 完整性检查：
  - `curl -I https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml` 返回 200。
  - `curl -I <enclosure url>` 在工件上传后返回 200。
  - 在以前的公共版本上，从"关于"选项卡运行"检查更新…"并验证 Sparkle 干净地安装新版本。

完成的定义：已签名应用程序 + appcast 已发布，更新流程从较旧的已安装版本运行，并且版本工件已附加到 GitHub 版本。
