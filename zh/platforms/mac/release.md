---
title: "OpenClaw macOS 发布（Sparkle）"
summary: "OpenClaw macOS 发布清单（Sparkle feed、打包、签名）"
read_when:
  - 发布或验证 OpenClaw macOS 版本
  - 更新 Sparkle appcast 或 feed 资源
---

# OpenClaw macOS 发布（Sparkle）

该应用现在使用 Sparkle 自动更新。发布构建必须使用 Developer ID 签名、打包为 zip，并发布带签名的 appcast 条目。

## 前置条件
- 已安装 Developer ID Application 证书（示例：`Developer ID Application: <Developer Name> (<TEAMID>)`）。
- 环境变量中设置 Sparkle 私钥路径 `SPARKLE_PRIVATE_KEY_FILE`（指向 Sparkle ed25519 私钥；公钥内嵌于 Info.plist）。若缺失，检查 `~/.profile`。
- 若需要 Gatekeeper 安全的 DMG/zip 分发，需要 `xcrun notarytool` 的公证凭据（钥匙串配置或 API key）。
  - 我们使用名为 `openclaw-notary` 的钥匙串配置，基于你 shell profile 中的 App Store Connect API key 环境变量创建：
    - `APP_STORE_CONNECT_API_KEY_P8`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`
    - `echo "$APP_STORE_CONNECT_API_KEY_P8" | sed 's/\n/
/g' > /tmp/openclaw-notary.p8`
    - `xcrun notarytool store-credentials "openclaw-notary" --key /tmp/openclaw-notary.p8 --key-id "$APP_STORE_CONNECT_KEY_ID" --issuer "$APP_STORE_CONNECT_ISSUER_ID"`
- 已安装 `pnpm` 依赖（`pnpm install --config.node-linker=hoisted`）。
- Sparkle 工具会通过 SwiftPM 自动获取，路径：`apps/macos/.build/artifacts/sparkle/Sparkle/bin/`（`sign_update`、`generate_appcast` 等）。

## 构建与打包
注意：
- `APP_BUILD` 映射到 `CFBundleVersion`/`sparkle:version`；保持纯数字且单调递增（不要用 `-beta`），否则 Sparkle 比较会相等。
- 默认使用当前架构（`$(uname -m)`）。发布/通用构建设置 `BUILD_ARCHS="arm64 x86_64"`（或 `BUILD_ARCHS=all`）。
- 发布产物用 `scripts/package-mac-dist.sh`（zip + DMG + notarization）。本地/开发打包用 `scripts/package-mac-app.sh`。

```bash
# 从仓库根目录；设置 release IDs 以启用 Sparkle feed。
# APP_BUILD 必须是纯数字 + 单调递增，供 Sparkle 比较。
BUNDLE_ID=bot.molt.mac APP_VERSION=2026.1.27-beta.1 APP_BUILD="$(git rev-list --count HEAD)" BUILD_CONFIG=release SIGN_IDENTITY="Developer ID Application: <Developer Name> (<TEAMID>)" scripts/package-mac-app.sh

# 用于分发的 zip（包含资源 fork，支持 Sparkle delta）
ditto -c -k --sequesterRsrc --keepParent dist/OpenClaw.app dist/OpenClaw-2026.1.27-beta.1.zip

# 可选：为人工下载安装创建带样式的 DMG（拖到 /Applications）
scripts/create-dmg.sh dist/OpenClaw.app dist/OpenClaw-2026.1.27-beta.1.dmg

# 推荐：构建 + 公证/钉住 zip + DMG
# 先创建一次钥匙串配置：
#   xcrun notarytool store-credentials "openclaw-notary" #     --apple-id "<apple-id>" --team-id "<team-id>" --password "<app-specific-password>"
NOTARIZE=1 NOTARYTOOL_PROFILE=openclaw-notary BUNDLE_ID=bot.molt.mac APP_VERSION=2026.1.27-beta.1 APP_BUILD="$(git rev-list --count HEAD)" BUILD_CONFIG=release SIGN_IDENTITY="Developer ID Application: <Developer Name> (<TEAMID>)" scripts/package-mac-dist.sh

# 可选：随发布一起提供 dSYM
ditto -c -k --keepParent apps/macos/.build/release/OpenClaw.app.dSYM dist/OpenClaw-2026.1.27-beta.1.dSYM.zip
```

## Appcast 条目
使用发布说明生成器，让 Sparkle 渲染格式化 HTML 说明：
```bash
SPARKLE_PRIVATE_KEY_FILE=/path/to/ed25519-private-key scripts/make_appcast.sh dist/OpenClaw-2026.1.27-beta.1.zip https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml
```
会从 `CHANGELOG.md` 生成 HTML 说明（通过 [`scripts/changelog-to-html.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/changelog-to-html.sh)），并嵌入到 appcast 条目中。
发布时将更新后的 `appcast.xml` 与发布资源（zip + dSYM）一起提交。

## 发布与验证
- 将 `OpenClaw-2026.1.27-beta.1.zip`（以及 `OpenClaw-2026.1.27-beta.1.dSYM.zip`）上传到 tag 为 `v2026.1.27-beta.1` 的 GitHub release。
- 确认 raw appcast URL 与内置 feed 一致：`https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml`。
- 可靠性检查：
  - `curl -I https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml` 返回 200。
  - 资源上传后，`curl -I <enclosure url>` 返回 200。
  - 在旧的公开版本中，从 About 页点击 “Check for Updates…” 并确认 Sparkle 可以正常更新。

完成定义：已发布签名应用与 appcast，旧版本更新流程正常，发布资源已附加到 GitHub release。
