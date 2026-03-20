---
summary: "由打包脚本生成的 macOS 调试版本的签名步骤"
read_when:
  - 构建或签名 mac 调试版本
title: "macOS 签名"
---

# mac 签名（调试版本）

此应用程序通常从 [`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 构建，现在它：

- 设置一个稳定的调试包标识符：`ai.openclaw.mac.debug`
- 使用该包 ID 写入 Info.plist（通过 `BUNDLE_ID=...` 覆盖）
- 调用 [`scripts/codesign-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/codesign-mac-app.sh) 对主二进制文件和应用程序包进行签名，以便 macOS 将每次重新构建视为同一个已签名的包，并保留 TCC 权限（通知、辅助功能、屏幕录制、麦克风、语音）。为了稳定的权限，请使用真实的签名身份；临时签名是可选的且脆弱（请参阅 [macOS 权限](/zh/platforms/mac/permissions)）。
- 默认使用 `CODESIGN_TIMESTAMP=auto`；它为 Developer ID 签名启用受信任的时间戳。设置 `CODESIGN_TIMESTAMP=off` 以跳过时间戳（离线调试版本）。
- 将构建元数据注入 Info.plist：`OpenClawBuildTimestamp` (UTC) 和 `OpenClawGitCommit`（短哈希），以便“关于”面板可以显示构建、git 和调试/发布渠道。
- **打包默认使用 Node 24**：该脚本运行 TS 构建和 Control UI 构建。Node 22 LTS，目前为 `22.16+`，为了兼容性仍然受支持。
- 从环境中读取 `SIGN_IDENTITY`。将 `export SIGN_IDENTITY="Apple Development: Your Name (TEAMID)"`（或您的 Developer ID Application 证书）添加到您的 shell rc 文件中，以便始终使用您的证书进行签名。临时签名需要通过 `ALLOW_ADHOC_SIGNING=1` 或 `SIGN_IDENTITY="-"` 显式选择加入（不建议用于权限测试）。
- 在签名后运行 Team ID 审计，如果应用程序包内的任何 Mach-O 由不同的 Team ID 签名，则失败。设置 `SKIP_TEAM_ID_CHECK=1` 以绕过。

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

使用 `SIGN_IDENTITY="-"`（临时签名）进行签名时，脚本会自动禁用 **Hardened Runtime**（`--options runtime`）。这是防止应用尝试加载不共享相同 Team ID 的嵌入式框架（如 Sparkle）时发生崩溃所必需的。临时签名还会破坏 TCC 权限的持久性；有关恢复步骤，请参阅 [macOS permissions](/zh/platforms/mac/permissions)。

## “关于”的构建元数据

`package-mac-app.sh` 会为 Bundle 添加以下标记：

- `OpenClawBuildTimestamp`：打包时的 ISO8601 UTC 时间
- `OpenClawGitCommit`：简短的 git 哈希值（如果不可用则为 `unknown`）

“关于”选项卡会读取这些键以显示版本、构建日期、git 提交以及是否为调试构建（通过 `#if DEBUG`）。在更改代码后，请运行打包器以刷新这些值。

## 原因

TCC 权限绑定到 Bundle 标识符 _和_ 代码签名。具有不断变化的 UUID 的未签名调试构建导致 macOS 在每次重建后忘记授权。对二进制文件进行签名（默认为临时签名）并保持固定的 bundle id/路径（`dist/OpenClaw.app`），可以在构建之间保留授权，这与 VibeTunnel 的方法一致。

import en from "/components/footer/en.mdx";

<en />
