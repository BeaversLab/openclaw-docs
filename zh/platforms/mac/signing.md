---
title: "macOS 签名"
summary: "打包脚本生成的 macOS debug 构建签名步骤"
read_when:
  - 构建或签名 mac debug 版本
---

# mac 签名（debug 构建）

该应用通常通过 [`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 构建，该脚本现在会：

- 设置稳定的 debug bundle identifier：`ai.openclaw.mac.debug`
- 用该 bundle id 写入 Info.plist（可用 `BUNDLE_ID=...` 覆盖）
- 调用 [`scripts/codesign-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/codesign-mac-app.sh) 签名主二进制与 app bundle，使 macOS 将每次重建视为同一签名包并保留 TCC 权限（通知、辅助功能、屏幕录制、麦克风、语音）。要稳定权限，请使用真实签名身份；ad-hoc 需显式启用且不稳定（参见 [macOS permissions](/zh/platforms/mac/permissions)）。
- 默认使用 `CODESIGN_TIMESTAMP=auto`；为 Developer ID 签名启用可信时间戳。设置 `CODESIGN_TIMESTAMP=off` 可跳过时间戳（离线 debug 构建）。
- 将构建元数据注入 Info.plist：`OpenClawBuildTimestamp`（UTC）与 `OpenClawGitCommit`（短 hash），便于 About 页显示构建、git 与 debug/release 通道。
- **打包需要 Node 22+**：脚本会运行 TS 构建与 Control UI 构建。
- 从环境读取 `SIGN_IDENTITY`。在 shell rc 中添加 `export SIGN_IDENTITY="Apple Development: Your Name (TEAMID)"`（或 Developer ID Application 证书）以默认使用你的证书签名。ad-hoc 需显式启用 `ALLOW_ADHOC_SIGNING=1` 或 `SIGN_IDENTITY="-"`（不推荐用于权限测试）。
- 签名后执行 Team ID 审计，若 app bundle 内任何 Mach-O 的 Team ID 不一致则失败。可设置 `SKIP_TEAM_ID_CHECK=1` 跳过。

## 使用方式

```bash
# 从仓库根目录
scripts/package-mac-app.sh               # 自动选择签名身份；若未找到则报错
SIGN_IDENTITY="Developer ID Application: Your Name" scripts/package-mac-app.sh   # 真证书
ALLOW_ADHOC_SIGNING=1 scripts/package-mac-app.sh    # ad-hoc（权限不会持久）
SIGN_IDENTITY="-" scripts/package-mac-app.sh        # 明确 ad-hoc（同样注意）
DISABLE_LIBRARY_VALIDATION=1 scripts/package-mac-app.sh   # 仅开发：Sparkle Team ID 不匹配的规避方案
```

### Ad-hoc 签名说明

使用 `SIGN_IDENTITY="-"`（ad-hoc）签名时，脚本会自动禁用 **Hardened Runtime**（`--options runtime`）。这是为了避免应用加载 Team ID 不同的内嵌框架（如 Sparkle）时崩溃。ad-hoc 也会破坏 TCC 权限持久化；恢复步骤见 [macOS permissions](/zh/platforms/mac/permissions)。

## About 页的构建元数据

`package-mac-app.sh` 会写入：

- `OpenClawBuildTimestamp`：打包时的 ISO8601 UTC
- `OpenClawGitCommit`：短 git hash（或不可用时为 `unknown`）

About 页读取这些键以显示版本、构建日期、git commit，以及是否为 debug 构建（通过 `#if DEBUG`）。代码变更后请重新运行打包脚本更新这些值。

## 原因

TCC 权限与 bundle identifier **以及** 代码签名绑定。未签名的 debug 构建带有变化的 UUID，导致 macOS 每次重建后忘记授权。签名二进制（默认 ad-hoc）并保持固定 bundle id/path（`dist/OpenClaw.app`）可在构建间保留授权，符合 VibeTunnel 的做法。
