---
summary: "macOS 权限持久性 (TCC) 和签名要求"
read_when:
  - Debugging missing or stuck macOS permission prompts
  - Packaging or signing the macOS app
  - Changing bundle IDs or app install paths
title: "macOS 权限"
---

# macOS 权限 (TCC)

macOS 权限授予非常脆弱。TCC 将权限授予与
应用的代码签名、Bundle 标识符和磁盘上的路径相关联。如果其中任何一项发生变化，
macOS 会将该应用视为新应用，并可能会丢弃或隐藏提示。

## 稳定权限的要求

- 相同路径：从固定位置运行应用程序（对于 OpenClaw，`dist/OpenClaw.app`）。
- 相同的 Bundle 标识符：更改 Bundle ID 会创建一个新的权限身份。
- 已签名的应用：未签名或临时签名的构建无法持久化权限。
- 一致的签名：使用真实的 Apple Development 或 Developer ID 证书，以便签名在重新构建之间保持稳定。

临时签名会在每次构建时生成新的身份。macOS 会忘记之前的授权，并且提示可能会完全消失，直到清除过时的条目。

## 提示消失时的恢复检查清单

1. 退出应用。
2. 在系统设置 -> 隐私与安全性中移除应用条目。
3. 从相同路径重新启动应用并重新授权。
4. 如果提示仍未出现，请使用 `tccutil` 重置 TCC 条目，然后重试。
5. 某些权限仅在完全重启 macOS 后才会重新出现。

重置示例（根据需要替换 Bundle ID）：

```bash
sudo tccutil reset Accessibility ai.openclaw.mac
sudo tccutil reset ScreenCapture ai.openclaw.mac
sudo tccutil reset AppleEvents
```

## 文件和文件夹权限（桌面/文档/下载）

macOS 可能还会对终端/后台进程限制桌面、文档和下载文件夹的访问。如果文件读取或目录列表挂起，请向执行文件操作的同一进程上下文（例如 Terminal/iTerm、LaunchAgent 启动的应用程序或 SSH 进程）授予访问权限。

变通方法：如果您想避免对每个文件夹的授权，请将文件移动到 OpenClaw 工作区 (`~/.openclaw/workspace`) 中。

如果您正在测试权限，请务必使用真实证书进行签名。Ad-hoc 构建仅适用于不需要权限的快速本地运行。
