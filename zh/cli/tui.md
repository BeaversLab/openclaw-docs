---
summary: "`openclaw tui`（连接到 Gateway 的终端 UI）的 CLI 参考"
read_when:
  - You want a terminal UI for the Gateway (remote-friendly)
  - You want to pass url/token/session from scripts
title: "tui"
---

# `openclaw tui`

打开连接到 Gateway 的终端 UI。

相关：

- TUI 指南：[TUI](/zh/en/web/tui)

注意：

- `tui` 会尽可能解析配置的 gateway auth SecretRefs 以进行令牌/密码身份验证（`env`/`file`/`exec` 提供商）。
- 当从已配置的 agent 工作区目录内启动时，TUI 会自动选择该 agent 作为会话键的默认值（除非 `--session` 被显式设置为 `agent:<id>:...`）。

## 示例

```bash
openclaw tui
openclaw tui --url ws://127.0.0.1:18789 --token <token>
openclaw tui --session main --deliver
# when run inside an agent workspace, infers that agent automatically
openclaw tui --session bugfix
```

import zh from '/components/footer/zh.mdx';

<zh />
