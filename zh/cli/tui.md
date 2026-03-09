---
summary: "`openclaw tui` 的 CLI 参考（连接到 Gateway 的终端 UI）"
read_when:
  - "You want a terminal UI for the Gateway (remote-friendly)"
  - "You want to pass url/token/session from scripts"
title: "tui"
---

# `openclaw tui`

打开连接到 Gateway 的终端 UI。

相关内容：

- TUI 指南：[TUI](/zh/tui)

## 示例

```bash
openclaw tui
openclaw tui --url ws://127.0.0.1:18789 --token <token>
openclaw tui --session main --deliver
```
