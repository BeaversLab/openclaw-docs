---
summary: "运行用于 IDE 集成的 ACP 网桥"
read_when:
  - Setting up ACP-based IDE integrations
  - Debugging ACP session routing to the Gateway
title: "ACP"
---

运行与 OpenClaw Gateway(网关) 通信的 [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 网桥。

此命令通过 stdio 为 IDE 讲述 ACP，并通过 WebSocket 将提示转发到 Gateway(网关)。它将 ACP 会话映射到 Gateway(网关) 会话密钥。

`openclaw acp` 是一个由 Gateway(网关) 支持的 ACP 网桥，而不是一个完整的 ACP 原生编辑器
运行时。它专注于会话路由、提示传递和基本流式
更新。

如果您希望外部 MCP 客户端直接与 OpenClaw 渠道对话，而不是托管 ACP harness 会话，请改用 [`openclaw mcp serve`](/zh/cli/mcp)。

## 这不是什么

此页面常与 ACP harness 会话混淆。

`openclaw acp` 的意思是：

- OpenClaw 充当 ACP 服务器
- IDE 或 ACP 客户端连接到 OpenClaw
- OpenClaw 将该工作转发到 Gateway(网关) 会话

这与 [ACP Agents](/zh/tools/acp-agents) 不同，后者由 OpenClaw 通过 `acpx` 运行外部 harness（如 Codex 或 Claude Code）。

快速规则：

- 编辑器/客户端想要通过 ACP 与 OpenClaw 通信：请使用 OpenClaw`openclaw acp`
- OpenClaw 应将 Codex/Claude/Gemini 作为 ACP harness 启动：请使用 `/acp spawn` 和 [ACP Agents](/zh/tools/acp-agents)

## 兼容性 Matrix

| ACP 区域                                                       | 状态     | 备注                                                                                                                                                                                           |
| -------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialize`，`newSession`，`prompt`，`cancel`                 | 已实现   | 通过 stdio 到 Gateway(网关) chat/send + abort 的核心桥接流程。                                                                                                                                 |
| `listSessions`，斜杠命令                                       | 已实现   | 会话列表通过有界游标分页和 Gateway(网关)`cwd`Gateway(网关) 筛选来处理 Gateway(网关) 会话状态，其中 Gateway(网关) 会话行携带工作区元数据；命令通过 `available_commands_update` 公布。           |
| 会话沿袭元数据                                                 | 已实现   | 会话列表和会话信息快照在 `_meta` 中包含 OpenClaw 父级和子级谱系，以便 ACP 客户端可以在无需私有 Gateway(网关) 侧信道的情况下渲染子代理图。                                                      |
| `resumeSession`, `closeSession`                                | 已实现   | Resume 将 ACP 会话重新绑定到现有的 Gateway(网关) 会话，而无需重放历史记录。Close 取消活动的桥接工作，将待处理的提示解析为已取消，并释放桥接会话状态。                                          |
| `loadSession`                                                  | 部分实现 | 将 ACP 会话重新绑定到 Gateway(网关) 会话密钥，并为桥接创建的会话重放 ACP 事件账本历史。较旧的/无账本的会话将回退到存储的用户/助手文本。                                                        |
| 提示内容（`text`、嵌入的 `resource`、图像）                    | 部分     | 文本/资源被扁平化到聊天输入中；图片变成 Gateway(网关) 附件。                                                                                                                                   |
| 会话模式                                                       | 部分     | 支持 `session/set_mode`，桥接器公开了基于 Gateway(网关) 的初始会话控制，包括思考级别、工具详细度、推理、使用详情和提升操作。更广泛的 ACP 原生模式/配置界面仍不在范围内。                       |
| 会话信息和使用更新                                             | 部分支持 | 桥接器从缓存的 Gateway(网关) 会话快照发出 `session_info_update` 和尽力而为的 `usage_update` 通知。使用情况是近似的，仅当 Gateway(网关) 令牌总数被标记为最新时才发送。                          |
| 工具流式传输                                                   | 部分支持 | `tool_call` / `tool_call_update`Gateway(网关) 事件包括原始 I/O、文本内容，以及当 Gateway(网关) 工具参数/结果暴露这些内容时的尽力而为的文件位置。嵌入式终端和更丰富的差异原生输出仍然不会暴露。 |
| 执行审批                                                       | 部分     | 活动 ACP 提示轮次期间的 Gateway(网关) 执行审批提示会通过 Gateway(网关)`session/request_permission` 中继到 ACP 客户端。                                                                         |
| 每个会话的 MCP 服务器 (`mcpServers`)                           | 不支持   | 网桥模式拒绝每个会话的 MCP 服务器请求。请在 OpenClaw Gateway(网关) 或代理上配置 MCP。                                                                                                          |
| 客户端文件系统方法 (`fs/read_text_file`, `fs/write_text_file`) | 不支持   | 网桥不调用 ACP 客户端文件系统方法。                                                                                                                                                            |
| 客户端终端方法 (`terminal/*`)                                  | 不支持   | 此网桥不创建 ACP 客户端终端，也不通过工具调用流式传输终端 ID。                                                                                                                                 |
| 会话计划 / 思维流式传输                                        | 不支持   | 该网桥目前发出输出文本和工具状态，而不是 ACP 计划或思维更新。                                                                                                                                  |

## 已知限制

- `loadSession` 只能为网桥创建的会话重放完整的 ACP 事件账本历史。较旧的或无账本的会话仍使用脚本回退，并且不会重建历史工具调用或系统通知。
- 如果多个 ACP 客户端共享同一个 Gateway(网关) 会话密钥，事件和取消路由是尽力而为的，而不是按客户端严格隔离的。当您需要干净的编辑器本地轮次时，请使用默认隔离的 `acp:<uuid>` 会话。
- Gateway(网关) 停止状态被转换为 ACP 停止原因，但这种映射不如完全 ACP 原生运行时那样具有表现力。
- 初始会话控制目前展示了 Gateway(网关) 调优项的一个重点子集：
  思考级别、工具详细程度、推理、使用详情和提升操作。
  模型选择和执行主机控制尚未作为 ACP 配置选项公开。
- `session_info_update` 和 `usage_update` 源自 Gateway(网关) 会话
  快照，而非实时的 ACP 原生运行时统计。使用情况是近似的，
  不包含成本数据，并且仅当 Gateway(网关) 将总 token
  数据标记为最新时才会发出。
- 工具跟随数据是尽力而为的。桥接器可以显示出现在已知工具参数/结果中的
  文件路径，但它尚未发出 ACP 终端或结构化文件差异。
- 执行批准中继仅限于活动的 ACP 提示轮次；来自其他 Gateway(网关) 会话的批准将被忽略。

## 使用方法

```bash
openclaw acp

# Remote Gateway
openclaw acp --url wss://gateway-host:18789 --token <token>

# Remote Gateway (token from file)
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Attach to an existing session key
openclaw acp --session agent:main:main

# Attach by label (must already exist)
openclaw acp --session-label "support inbox"

# Reset the session key before the first prompt
openclaw acp --session agent:main:main --reset-session
```

## ACP 客户端（调试）

使用内置的 ACP 客户端在没有 IDE 的情况下对网桥进行完整性检查。它会生成 ACP 网桥并允许你以交互方式输入提示。

```bash
openclaw acp client

# Point the spawned bridge at a remote Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Override the server command (default: openclaw)
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

权限模型（客户端调试模式）：

- 自动批准基于允许列表，且仅适用于受信任的核心工具 ID。
- `read` 自动批准仅限于当前工作目录（如果设置了 `--cwd` 则为其值）。
- ACP 仅自动批准狭义的只读类：活动 cwd 下的限定 `read` 调用以及只读搜索工具（`search`、`web_search`、`memory_search`）。未知/非核心工具、范围外读取、具备执行能力的工具、控制平面工具、变更性工具和交互式流程始终需要明确的提示批准。
- 服务器提供的 `toolCall.kind` 被视为不受信任的元数据（而非授权来源）。
- 此 ACP 桥接策略与 ACPX 工具权限是分开的。如果您通过 `acpx` 后端运行 OpenClaw，则 `plugins.entries.acpx.config.permissionMode=approve-all` 是该工具会话的应急“孤注一掷”开关。

## 协议冒烟测试

对于协议级别的调试，请启动一个具有隔离状态的 Gateway(网关) 并使用 ACP JSON-RPC 客户端通过 stdio 驱动 `openclaw acp`。覆盖 `initialize`、
`session/new`、`session/list` 并包含绝对的 `cwd`、`session/resume`、
`session/close`、重复关闭以及缺失恢复。

证明应包含通告的生命周期功能、一个由Gateway(网关)支持的会话行、更新通知以及Gateway(网关) Gateway(网关)Gateway(网关)`sessions.list` 日志：

```json
{
  "initialize": {
    "protocolVersion": 1,
    "agentCapabilities": {
      "sessionCapabilities": {
        "list": {},
        "resume": {},
        "close": {}
      }
    }
  },
  "listSessions": {
    "sessions": [
      {
        "sessionId": "agent:main:acp-smoke",
        "cwd": "/path/to/workspace",
        "_meta": {
          "sessionKey": "agent:main:acp-smoke",
          "kind": "direct"
        }
      }
    ],
    "nextCursor": null
  },
  "notifications": ["session_info_update", "available_commands_update", "usage_update"],
  "gatewayLogTail": ["[gateway] ready", "[ws] ⇄ res ✓ sessions.list 305ms"]
}
```

避免将 `openclaw gateway call sessions.list`CLIGateway(网关) 作为唯一的ACP证明。该CLI路径可能会请求新令牌的操作员范围升级；ACP桥接的正确性由ACP stdio帧加上Gateway(网关) `sessions.list` 日志来证明。

## 如何使用此功能

当IDE（或其他客户端）使用Agent Client Protocol并且您希望其驱动OpenClaw Gateway(网关)会话时，请使用ACP。

1. 确保Gateway(网关)正在运行（本地或远程）。
2. 配置Gateway(网关)目标（配置或标志）。
3. 将您的IDE设置为通过stdio运行 `openclaw acp`。

示例配置（持久化）：

```bash
openclaw config set gateway.remote.url wss://gateway-host:18789
openclaw config set gateway.remote.token <token>
```

示例直接运行（不写入配置）：

```bash
openclaw acp --url wss://gateway-host:18789 --token <token>
# preferred for local process safety
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token
```

## 选择代理

ACP 不直接选择代理。它通过 Gateway(网关) 会话密钥进行路由。

使用代理范围的会话密钥来定位特定代理：

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

每个 ACP 会话映射到单个 Gateway(网关) 会话密钥。一个代理可以拥有多个会话；除非您覆盖密钥或标签，否则 ACP 默认使用隔离的 Gateway(网关)`acp:<uuid>` 会话。

桥接模式不支持每会话 `mcpServers`。如果 ACP 客户端在 `newSession` 或 `loadSession` 期间发送它们，桥接将返回明确的错误，而不是静默忽略它们。

如果您希望由 ACPX 支持的会话能够看到 OpenClaw 插件工具或选定的内置工具（例如 `cron`），请启用 Gateway 端的 ACPX MCP 桥接器，而不是尝试传递每个会话的 `mcpServers`。请参阅 [ACP 代理](/zh/tools/acp-agents-setup#plugin-tools-mcp-bridge) 和 [OpenClaw 工具 MCP 桥接器](/zh/tools/acp-agents-setup#openclaw-tools-mcp-bridge)。

## 从 `acpx` (Codex, Claude, 其他 ACP 客户端) 使用

如果您希望让诸如 Codex 或 Claude Code 之类的编码代理通过 ACP 与您的 OpenClaw 机器人对话，请使用 `acpx` 及其内置的 `openclaw` 目标。

典型流程：

1. 运行 Gateway(网关) 并确保 ACP 桥接器能够访问到它。
2. 将 `acpx openclaw` 指向 `openclaw acp`。
3. 指定您希望编程代理使用的 OpenClaw 会话密钥。

示例：

```bash
# One-shot request into your default OpenClaw ACP session
acpx openclaw exec "Summarize the active OpenClaw session state."

# Persistent named session for follow-up turns
acpx openclaw sessions ensure --name codex-bridge
acpx openclaw -s codex-bridge --cwd /path/to/repo \
  "Ask my OpenClaw work agent for recent context relevant to this repo."
```

如果您希望 `acpx openclaw` 每次都针对特定的 Gateway(网关) 和会话密钥，请覆盖 `~/.acpx/config.json` 中的 `openclaw` 代理命令：

```json
{
  "agents": {
    "openclaw": {
      "command": "env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 openclaw acp --url ws://127.0.0.1:18789 --token-file ~/.openclaw/gateway.token --session agent:main:main"
    }
  }
}
```

对于本地仓库中的 OpenClaw 检出副本，请使用直接 CLI 入口点而不是 dev runner，以便保持 ACP 流的清洁。例如：

```bash
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

这是让 Codex、Claude Code 或其他支持 ACP 的客户端从 OpenClaw 代理获取上下文信息而无需抓取终端的最简单方法。

## Zed 编辑器设置

在 `~/.config/zed/settings.json` 中添加自定义 ACP 代理（或使用 Zed 的设置 UI）：

```json
{
  "agent_servers": {
    "OpenClaw ACP": {
      "type": "custom",
      "command": "openclaw",
      "args": ["acp"],
      "env": {}
    }
  }
}
```

要针对特定的 Gateway(网关) 或代理：

```json
{
  "agent_servers": {
    "OpenClaw ACP": {
      "type": "custom",
      "command": "openclaw",
      "args": ["acp", "--url", "wss://gateway-host:18789", "--token", "<token>", "--session", "agent:design:main"],
      "env": {}
    }
  }
}
```

在 Zed 中，打开 Agent 面板并选择“OpenClaw ACP”以启动一个线程。

## 会话映射

默认情况下，ACP 会话会获得一个带有 `acp:` 前缀的独立 Gateway(网关) 会话密钥。
要重用已知会话，请传递会话密钥或标签：

- `--session <key>`：使用特定的 Gateway(网关) 会话密钥。
- `--session-label <label>`：通过标签解析现有会话。
- `--reset-session`：为该密钥生成一个新的会话 ID（相同的密钥，新的记录）。

如果您的 ACP 客户端支持元数据，您可以按会话覆盖：

```json
{
  "_meta": {
    "sessionKey": "agent:main:main",
    "sessionLabel": "support inbox",
    "resetSession": true
  }
}
```

在 [/concepts/会话](/zh/concepts/session) 了解更多关于会话密钥的信息。

## 选项

- `--url <url>`：Gateway(网关) WebSocket URL（配置时默认为 gateway.remote.url）。
- `--token <token>`Gateway(网关)： Gateway(网关) 认证令牌。
- `--token-file <path>`Gateway(网关)：从文件读取 Gateway(网关) 认证令牌。
- `--password <password>`Gateway(网关)： Gateway(网关) 认证密码。
- `--password-file <path>`Gateway(网关)：从文件读取 Gateway(网关) 认证密码。
- `--session <key>`：默认会话密钥。
- `--session-label <label>`：要解析的默认会话标签。
- `--require-existing`：如果会话密钥/标签不存在则失败。
- `--reset-session`：在首次使用前重置会话密钥。
- `--no-prefix-cwd`：不要在提示词前加工作目录前缀。
- `--provenance <off|meta|meta+receipt>`：包含 ACP 来源元数据或回执。
- `--verbose, -v`：详细的 stderr 日志记录。

安全提示：

- 在某些系统上，`--token` 和 `--password` 可能在本地进程列表中可见。
- 建议使用 `--token-file`/`--password-file` 或环境变量（`OPENCLAW_GATEWAY_TOKEN`，`OPENCLAW_GATEWAY_PASSWORD`）。
- Gateway(网关) 认证解析遵循其他 Gateway(网关) 客户端使用的共享合约：
  - local 模式：env (`OPENCLAW_GATEWAY_*`) -> `gateway.auth.*` -> `gateway.remote.*` 仅在 `gateway.auth.*` 未设置时回退（已配置但未解析的本地 SecretRefs 将失败关闭）
  - remote 模式：`gateway.remote.*` 配合根据远程优先级规则的 env/config 回退
  - `--url` 是覆盖安全的，不会重用隐式配置/环境凭据；请传递显式的 `--token`/`--password`（或文件变体）
- ACP 运行时后端子进程接收 `OPENCLAW_SHELL=acp`，可用于特定于上下文的 shell/profile 规则。
- `openclaw acp client` 在生成的桥接进程上设置 `OPENCLAW_SHELL=acp-client`。

### `acp client` 选项

- `--cwd <dir>`：ACP 会话的工作目录。
- `--server <command>`：ACP 服务器命令（默认：`openclaw`）。
- `--server-args <args...>`：传递给 ACP 服务器的额外参数。
- `--server-verbose`：在 ACP 服务器上启用详细日志记录。
- `--verbose, -v`：详细的客户端日志记录。

## 相关

- [CLI 参考](CLI/en/cli)
- [ACP 代理](/zh/tools/acp-agents)
