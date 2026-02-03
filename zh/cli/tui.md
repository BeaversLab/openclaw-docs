---
summary: "`openclaw tui` 的 CLI 参考（连接 Gateway 的终端 UI）"
read_when:
  - 需要用于 Gateway 的终端 UI（适合远程）
  - 需要从脚本传递 url/token/session
title: "tui"
---

# `openclaw tui`

打开连接到 Gateway 的终端 UI。

相关：

- TUI 指南：[TUI](/zh/tui)

## 示例

```bash
openclaw tui
openclaw tui --url ws://127.0.0.1:18789 --token <token>
openclaw tui --session main --deliver
```
