---
summary: "CLI 参考，用于 `openclaw tui`（Gateway（网关）支持或本地嵌入式终端 UI）"
read_when:
  - You want a terminal UI for the Gateway (remote-friendly)
  - You want to pass url/token/session from scripts
  - You want to run the TUI in local embedded mode without a Gateway
  - You want to use openclaw chat or openclaw tui --local
title: "tui"
---

# `openclaw tui`

打开连接到 Gateway（网关）的终端 UI，或在本地嵌入式模式下运行它。

相关：

- TUI 指南：[TUI](/zh/web/tui)

注意：

- `chat` 和 `terminal` 是 `openclaw tui --local` 的别名。
- `--local` 不能与 `--url`、`--token` 或 `--password` 结合使用。
- `tui` 在可能的情况下解析配置的网关认证 SecretRefs，以便进行令牌/密码认证（`env`/`file`/`exec` 提供程序）。
- 当从配置的代理工作区目录内启动时，TUI 会自动选择该代理作为会话密钥的默认值（除非 `--session` 被显式设置为 `agent:<id>:...`）。
- 本地模式直接使用嵌入式代理运行时。大多数本地工具都可以使用，但仅限 Gateway(网关) 的功能不可用。
- 本地模式在 TUI 命令界面内添加了 `/auth [provider]`。
- 插件批准网关在本地模式下仍然适用。需要批准的工具会在终端中提示进行决策；没有任何内容会被静默自动批准，因为未涉及 Gateway(网关)。

## 示例

```bash
openclaw chat
openclaw tui --local
openclaw tui
openclaw tui --url ws://127.0.0.1:18789 --token <token>
openclaw tui --session main --deliver
openclaw chat --message "Compare my config to the docs and tell me what to fix"
# when run inside an agent workspace, infers that agent automatically
openclaw tui --session bugfix
```

## 配置修复循环

当当前配置已经通过验证，并且您希望嵌入式代理检查它、将其与文档进行比较，并帮助从同一终端修复它时，请使用本地模式：

如果 `openclaw config validate` 已经失败，请先使用 `openclaw configure` 或
`openclaw doctor --fix`。`openclaw chat` 不会绕过无效配置保护。

```bash
openclaw chat
```

然后在 TUI 内部：

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

使用 `openclaw config set` 或 `openclaw configure` 应用针对性修复，然后
重新运行 `openclaw config validate`。请参阅 [TUI](/zh/web/tui) 和 [Config](/zh/cli/config)。
