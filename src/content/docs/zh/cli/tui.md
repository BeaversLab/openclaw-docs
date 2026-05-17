---
summary: "CLI 参考，用于 `openclaw tui`（Gateway（网关）支持或本地嵌入式终端 UI）"
read_when:
  - You want a terminal UI for the Gateway (remote-friendly)
  - You want to pass url/token/session from scripts
  - You want to run the TUI in local embedded mode without a Gateway
  - You want to use openclaw chat or openclaw tui --local
title: "TUI"
---

# `openclaw tui`

打开连接到 Gateway（网关）的终端 UI，或在本地嵌入式模式下运行它。

相关：

- TUI 指南：[TUI](/zh/web/tui)

## 选项

| 标志                  | 默认值                                  | 描述                                                       |
| --------------------- | --------------------------------------- | ---------------------------------------------------------- |
| `--local`             | `false`                                 | 针对本地嵌入式代理运行时运行，而不是 Gateway(网关)。       |
| `--url <url>`         | 来自配置的 `gateway.remote.url`         | Gateway(网关) WebSocket URL。                              |
| `--token <token>`     | （无）                                  | 如果需要，提供 Gateway(网关) 令牌。                        |
| `--password <pass>`   | （无）                                  | 如果需要，提供 Gateway(网关) 密码。                        |
| `--session <key>`     | `main`（或当作用域为全局时的 `global`） | 会话密钥。在代理工作区内，它会自动选择该代理，除非加前缀。 |
| `--deliver`           | `false`                                 | 通过配置的渠道发送助手回复。                               |
| `--thinking <level>`  | （模型默认值）                          | 思考级别覆盖。                                             |
| `--message <text>`    | （无）                                  | 连接后发送初始消息。                                       |
| `--timeout-ms <ms>`   | `agents.defaults.timeoutSeconds`        | 代理超时。无效值将记录警告并被忽略。                       |
| `--history-limit <n>` | `200`                                   | 附加时要加载的历史记录条目。                               |

别名：`openclaw chat` 和 `openclaw terminal` 调用相同的命令，并隐含 `--local`。

备注：

- `chat` 和 `terminal` 是 `openclaw tui --local` 的别名。
- `--local` 不能与 `--url`、`--token` 或 `--password` 组合使用。
- `tui` 尽可能解析配置的 Gateway 认证 SecretRefs 以进行令牌/密码认证（`env`/`file`/`exec` 提供商）。
- 当从已配置的代理工作区目录内启动时，TUI 会自动选择该代理作为会话密钥的默认值（除非明确将 TUI`--session` 设置为 `agent:<id>:...`）。
- 本地模式直接使用嵌入式代理运行时。大多数本地工具都可以使用，但仅 Gateway(网关) 支持的功能不可用。
- 本地模式在 TUI 命令界面内添加 `/auth [provider]`TUI。
- 在本地模式下，插件批准关卡仍然适用。需要批准的工具会在终端中提示您做出决定；没有任何内容会因为不涉及 Gateway(网关) 而被静默自动批准。

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

当当前配置已通过验证，并且您希望嵌入式代理检查它、将其与文档进行比较并帮助从同一终端修复它时，请使用本地模式：

如果 `openclaw config validate` 已经失败，请先使用 `openclaw configure` 或
`openclaw doctor --fix`。`openclaw chat` 不会绕过无效
配置保护。

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

## 相关

- [CLI 参考](/zh/cli)
- [TUI](/zh/web/tui)
