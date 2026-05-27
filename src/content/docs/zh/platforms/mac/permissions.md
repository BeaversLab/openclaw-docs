---
summary: "macOS 权限持久性 (TCC) 和签名要求"
read_when:
  - Debugging missing or stuck macOS permission prompts
  - Deciding whether to grant Accessibility to node or a CLI runtime
  - Packaging or signing the macOS app
  - Changing bundle IDs or app install paths
title: "macOS 权限"
---

macOS 权限授予是不稳定的。TCC 将权限授予与应用的代码签名、Bundle 标识符和磁盘路径相关联。如果其中任何一项发生变化，macOS 会将该应用视为新应用，并可能丢弃或隐藏提示。

## 保持权限稳定的条件

- 相同路径：从固定位置运行应用（对于 OpenClaw，`dist/OpenClaw.app`）。
- 相同的 Bundle 标识符：更改 Bundle ID 会创建一个新的权限身份。
- 已签名的应用：未签名或临时签名的构建无法持久保存权限。
- 一致的签名：使用真实的 Apple Development 或 Developer ID 证书，以便签名在重新构建之间保持稳定。

临时签名会在每次构建时生成一个新的身份。macOS 将忘记以前的授予，并且提示可能会完全消失，直到清除过时的条目。

## Node 和 CLI 运行时的辅助功能授权

相比于通用的 `node` 二进制文件，建议优先将辅助功能授权授予 OpenClaw.app、Peekaboo.app 或其他具有自己的包标识符的已签名辅助工具。

macOS TCC 会将辅助功能授权给它所看到的进程的代码身份。如果 Homebrew、nvm、pnpm 或 npm 工作流导致共享的 `node` 可执行文件获得了辅助功能，那么通过该同一可执行文件启动的任何 JavaScript 包都可能继承 GUI 自动化权限。

应将“系统设置”中的 `node` 条目视为对该 Node 运行时的广泛授权，而非仅针对一个 npm 包的授权。除非你信任通过该确切的 Node 安装版启动的每个脚本和包，否则请避免向 `node` 授予辅助功能。

如果你意外向 `node` 授予了辅助功能，请从“系统设置” -> “隐私与安全性” -> “辅助功能”中删除该条目。然后向应该拥有 UI 自动化功能的已签名应用或辅助工具进行授权。

## 当提示消失时的恢复检查清单

1. 退出应用。
2. 在“系统设置” -> “隐私与安全性”中删除应用条目。
3. 从同一路径重新启动应用并重新授予权限。
4. 如果提示仍未出现，请使用 `tccutil` 重置 TCC 条目，然后重试。
5. 某些权限只有在完全重启 macOS 后才会重新出现。

重置示例（根据需要替换包 ID）：

```bash
sudo tccutil reset Accessibility ai.openclaw.mac
sudo tccutil reset ScreenCapture ai.openclaw.mac
sudo tccutil reset AppleEvents
```

## 文件和文件夹权限（桌面/文稿/下载）

macOS 可能还会对终端/后台进程的桌面、文稿和下载文件夹进行限制。如果文件读取或目录列表挂起，请向执行文件操作的同一进程上下文授予访问权限（例如 Terminal/iTerm、LaunchAgent 启动的应用或 SSH 进程）。

变通方法：如果你想避免针对每个文件夹的授权，请将文件移动到 OpenClaw 工作区（`~/.openclaw/workspace`）中。

如果你正在测试权限，请务必使用真实证书进行签名。临时构建仅适用于权限不重要的快速本地运行。

## 相关

- [macOS 应用](macOS/en/platforms/macos)
- [macOS 签名](macOS/en/platforms/mac/signing)
