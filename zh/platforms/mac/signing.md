---
summary: 由打包脚本生成的 macOS 调试版本的签名步骤
read_when:
  - Building or signing mac debug builds
title: macOS 签名
---

# mac 签名（调试版本）

该应用通常从 [`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 构建，现在：

- 设置一个稳定的调试包标识符 (bundle identifier)：`ai.openclaw.mac.debug`
- 使用该包 ID 写入 Info.plist（可通过 `BUNDLE_ID=...` 覆盖）
- 调用 [`scripts/codesign-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/codesign-mac-app.sh) 对主二进制文件和应用包进行签名，以便 macOS 将每次重新构建视为同一个已签名的包，并保留 TCC 权限（通知、辅助功能、屏幕录制、麦克风、语音）。为了获得稳定的权限，请使用真实的签名身份；ad-hoc 签名是可选的且脆弱（请参阅 [macOS permissions](/zh/en/platforms/mac/permissions)）。
- 默认使用 `CODESIGN_TIMESTAMP=auto`；它为 Developer ID 签名启用受信任的时间戳。设置 `CODESIGN_TIMESTAMP=off` 以跳过时间戳（离线调试版本）。
- 将构建元数据注入 Info.plist：`OpenClawBuildTimestamp` (UTC) 和 `OpenClawGitCommit` (短哈希)，以便“关于”面板可以显示构建、git 和调试/发布渠道。
- **打包默认使用 Node 24**：该脚本运行 TS 构建和控制 UI 构建。Node 22 LTS，目前为 `22.16+`，仍受支持以确保兼容性。
- 从环境中读取 `SIGN_IDENTITY`。将 `export SIGN_IDENTITY="Apple Development: Your Name (TEAMID)"`（或您的 Developer ID Application 证书）添加到您的 shell rc 文件中，以便始终使用您的证书进行签名。Ad-hoc 签名需要通过 `ALLOW_ADHOC_SIGNING=1` 或 `SIGN_IDENTITY="-"` 显式选择加入（不建议用于权限测试）。
- 在签名后运行 Team ID 审计，如果应用程序包内的任何 Mach-O 文件由不同的 Team ID 签名，则会失败。设置 `SKIP_TEAM_ID_CHECK=1` 以绕过。

## 用法

```bash
# from repo root
scripts/package-mac-app.sh               # auto-selects identity; errors if none found
SIGN_IDENTITY="Developer ID Application: Your Name" scripts/package-mac-app.sh   # real cert
ALLOW_ADHOC_SIGNING=1 scripts/package-mac-app.sh    # ad-hoc (permissions will not stick)
SIGN_IDENTITY="-" scripts/package-mac-app.sh        # explicit ad-hoc (same caveat)
DISABLE_LIBRARY_VALIDATION=1 scripts/package-mac-app.sh   # dev-only Sparkle Team ID mismatch workaround
```

### Ad-hoc 签名说明

使用 `SIGN_IDENTITY="-"`（临时签名）进行签名时，脚本会自动禁用 **Hardened Runtime** (`--options runtime`)。这是为了防止应用尝试加载未共享同一 Team ID 的内嵌框架（如 Sparkle）时发生崩溃。临时签名还会破坏 TCC 权限的持久性；请参阅 [macOS permissions](/zh/en/platforms/mac/permissions) 了解恢复步骤。

## “关于”的构建元数据

`package-mac-app.sh` 会将以下信息标记到 bundle 中：

- `OpenClawBuildTimestamp`：打包时的 ISO8601 UTC 时间
- `OpenClawGitCommit`：简短的 git 哈希值（如果不可用，则为 `unknown`）

“关于”选项卡会读取这些键以显示版本、构建日期、git 提交以及是否为调试构建（通过 `#if DEBUG`）。更改代码后，请运行打包器以刷新这些值。

## 原因

TCC 权限与包标识符 _以及_ 代码签名绑定。具有变化 UUID 的未签名调试构建导致 macOS 在每次重新构建后忘记授权。对二进制文件进行签名（默认为 ad‑hoc）并保持固定的包 id/路径 (`dist/OpenClaw.app`) 可以在构建之间保留授权，这与 VibeTunnel 方法相匹配。

import zh from '/components/footer/zh.mdx';

<zh />
