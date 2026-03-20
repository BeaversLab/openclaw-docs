---
summary: "CLI 参考，用于 `openclaw tui`（连接到 Gateway(网关) 的终端 UI）"
read_when:
  - 您需要一个 Gateway(网关) 的终端 UI（适合远程操作）
  - 您希望从脚本传递 url/token/会话
title: "tui"
---

# `openclaw tui`

打开连接到 Gateway(网关) 的终端 UI。

相关内容：

- TUI 指南：[TUI](/zh/web/tui)

注意事项：

- `tui` 在可能的情况下解析配置的 gateway auth SecretRefs 以进行 token/password 认证（`env`/`file`/`exec` 提供程序）。
- 当从已配置的 agent 工作区目录内启动时，TUI 会自动选择该 agent 作为会话密钥的默认值（除非 `--session` 被显式设置为 `agent:<id>:...`）。

## 示例

```bash
openclaw tui
openclaw tui --url ws://127.0.0.1:18789 --token <token>
openclaw tui --session main --deliver
# when run inside an agent workspace, infers that agent automatically
openclaw tui --session bugfix
```

import zh from "/components/footer/zh.mdx";

<zh />
