---
summary: "OpenClaw macOS 发布检查清单（Sparkle feed、打包、签名）"
read_when:
  - Cutting or validating a OpenClaw macOS release
  - Updating the Sparkle appcast or feed assets
title: "macOS 发布"
---

# OpenClaw macOS 发布 (Sparkle)

该应用现在附带 Sparkle 自动更新。发布版本必须使用 Developer ID 签名、打包为 zip，并发布带有签名的 appcast 条目。

## 先决条件

- 已安装 Developer ID Application 证书（例如：`Developer ID Application: <Developer Name> (<TEAMID>)`）。
- 已在环境中设置 Sparkle 私钥路径为 `SPARKLE_PRIVATE_KEY_FILE`（即您的 Sparkle ed25519 私钥路径；公钥已内置在 Info.plist 中）。如果缺失，请检查 `~/.profile`。
- 如果您需要 Gatekeeper 安全的 DMG/zip 分发，请准备 `xcrun notarytool` 的公证凭证（钥匙串配置文件或 API 密钥）。
  - 我们使用一个名为 `openclaw-notary` 的钥匙串配置文件，它根据您的 Shell 配置文件中的 App Store Connect API 密钥环境变量创建：
    - `APP_STORE_CONNECT_API_KEY_P8`、`APP_STORE_CONNECT_KEY_ID`、`APP_STORE_CONNECT_ISSUER_ID`
    - `echo "$APP_STORE_CONNECT_API_KEY_P8" | sed 's/\\n/\n/g' > /tmp/openclaw-notary.p8`
    - `xcrun notarytool store-credentials "openclaw-notary" --key /tmp/openclaw-notary.p8 --key-id "$APP_STORE_CONNECT_KEY_ID" --issuer "$APP_STORE_CONNECT_ISSUER_ID"`
- 已安装 `pnpm` 依赖项（`pnpm install --config.node-linker=hoisted`）。
- Sparkle 工具通过 SwiftPM 在 `apps/macos/.build/artifacts/sparkle/Sparkle/bin/` 处自动获取（`sign_update`、`generate_appcast` 等）。

## 构建与打包

注意：

- `APP_BUILD` 映射到 `CFBundleVersion`/`sparkle:version`；保持其为数字且单调递增（无 `-beta`），否则 Sparkle 会将其视为相等。
- 如果省略 `APP_BUILD`，`scripts/package-mac-app.sh` 会根据 `APP_VERSION` 推导出一个兼容 Sparkle 的默认值（`YYYYMMDDNN`：stable 默认为 `90`，预发布版本使用派生自后缀的通道），并使用该值与 git 提交计数中的较大者。
- 当版本发布工程需要特定的单调递增值时，您仍然可以显式覆盖 `APP_BUILD`。
- 对于 `BUILD_CONFIG=release`，`scripts/package-mac-app.sh` 现在默认自动设置为通用二进制（`arm64 x86_64`）。您仍然可以使用 `BUILD_ARCHS=arm64` 或 `BUILD_ARCHS=x86_64` 进行覆盖。对于本地/开发构建（`BUILD_CONFIG=debug`），它默认为当前架构（`$(uname -m)`）。
- 对发布产物（zip + DMG + 公证）使用 `scripts/package-mac-dist.sh`。对本地/开发打包使用 `scripts/package-mac-app.sh`。

```exec
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

## Appcast 条目

使用发布说明生成器，以便 Sparkle 渲染格式化的 HTML 说明：

```exec
SPARKLE_PRIVATE_KEY_FILE=/path/to/ed25519-private-key scripts/make_appcast.sh dist/OpenClaw-2026.3.13.zip https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml
```

从 `CHANGELOG.md` 生成 HTML 发布说明（通过 [`scripts/changelog-to-html.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/changelog-to-html.sh)），并将其嵌入到 appcast 条目中。
在发布时，将更新后的 `appcast.xml` 与发布资源（zip + dSYM）一起提交。

## 发布与验证

- 将 `OpenClaw-2026.3.13.zip`（和 `OpenClaw-2026.3.13.dSYM.zip`）上传到标签 `v2026.3.13` 的 GitHub release 中。
- 确保原始 appcast URL 与 baked feed 匹配：`https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml`。
- 完整性检查：
  - `curl -I https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml` 返回 200。
  - 资源上传后，`curl -I <enclosure url>` 返回 200。
  - 在之前的公开版本上，从“关于”选项卡运行“检查更新…”，并验证 Sparkle 是否干净地安装了新版本。

完成标准：已签名的应用程序和 appcast 已发布，从旧版本开始的更新流程正常工作，且发布资源已附加到 GitHub 版本中。
