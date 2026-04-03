---
summary: "运行用于 IDE 集成的 ACP 网桥"
read_when:
  - Setting up ACP-based IDE integrations
  - Debugging ACP session routing to the Gateway
title: "acp"
---

# acp

运行与 OpenClaw Gateway(网关) 通信的 [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 网桥。

此命令通过 stdio 与 IDE 进行 ACP 通信，并通过 WebSocket 将提示转发给 Gateway(网关) 网关。
它将 ACP 会话映射到 Gateway(网关) 网关 会话密钥。

`openclaw acp` 是一个由 Gateway(网关) 网关 支持的 ACP 网桥，而非完整的 ACP 原生编辑器
运行时。它专注于会话路由、提示传递和基本的流式
更新。

如果您希望外部 MCP 客户端直接与 OpenClaw 渠道对话，而不是托管 ACP 驱动会话，请改用 [`openclaw mcp serve`](/en/cli/mcp)。

## 兼容性 Matrix

| ACP 区域                                                       | 状态   | 备注                                                                                                                                                                               |
| -------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialize`, `newSession`, `prompt`, `cancel`                 | 已实现 | 通过 stdio 连接到 Gateway(网关) chat/send + abort 的核心网桥流程。                                                                                                                 |
| `listSessions`, 斜杠命令                                       | 已实现 | 会话列表针对 Gateway(网关) 会话状态工作；命令通过 `available_commands_update` 公布。                                                                                               |
| `loadSession`                                                  | 部分   | 将 ACP 会话重新绑定到 Gateway(网关) 会话密钥，并回放存储的用户/助手文本历史记录。工具/系统历史记录尚未重建。                                                                       |
| 提示词内容（`text`、嵌入的 `resource`、图像）                  | 部分   | 文本/资源被扁平化到聊天输入中；图像变成 Gateway(网关) 附件。                                                                                                                       |
| 会话模式                                                       | 部分   | 支持 `session/set_mode`，并且桥接器暴露了初步的 Gateway(网关) 支持的会话控制，包括思考级别、工具详细程度、推理、使用详情和提升操作。更广泛的 ACP 原生模式/配置界面仍然不在范围内。 |
| 会话信息和使用更新                                             | 部分   | 桥接器根据缓存的 Gateway(网关) 会话快照发出 `session_info_update` 和尽力而为的 `usage_update` 通知。使用情况是近似的，仅当 Gateway(网关) token 总计被标记为最新时才会发送。        |
| 工具流式传输                                                   | 部分   | `tool_call` / `tool_call_update` 事件包含原始 I/O、文本内容，以及在 Gateway(网关) 工具参数/结果暴露这些内容时的尽力而为的文件位置。嵌入式终端和更丰富的原生差异输出仍未暴露。      |
| 每个会话的 MCP 服务器 (`mcpServers`)                           | 不支持 | 桥接模式会拒绝每个会话的 MCP 服务器请求。请在 OpenClaw gateway 或代理上配置 MCP。                                                                                                  |
| 客户端文件系统方法 (`fs/read_text_file`, `fs/write_text_file`) | 不支持 | 该网桥不调用 ACP 客户端文件系统方法。                                                                                                                                              |
| 客户端终端方法 (`terminal/*`)                                  | 不支持 | 该网桥不创建 ACP 客户端终端或通过工具调用流式传输终端 ID。                                                                                                                         |
| 会话计划 / 思维流式传输                                        | 不支持 | 该网桥当前发送输出文本和工具状态，而非 ACP 计划或思维更新。                                                                                                                        |

## 已知限制

- `loadSession` 会重放存储的用户和助手文本历史记录，但不会
  重构历史工具调用、系统通知或更丰富的 ACP 原生事件
  类型。
- 如果多个 ACP 客户端共享同一个 Gateway(网关) 会话密钥，事件和取消
  路由是尽力而为的，而不是按客户端严格隔离的。当您需要干净的编辑器本地
  轮次时，请首选默认隔离的 `acp:<uuid>` 会话。
- Gateway(网关) 停止状态会被转换为 ACP 停止原因，但这种映射
  不如完全 ACP 原生运行时那样具有表现力。
- 初始会话控制当前仅展示 Gateway(网关) 控件的一个聚焦子集：
  思维级别、工具详细程度、推理、使用详情和提升
  操作。模型选择和执行主机控制尚未作为 ACP
  配置选项公开。
- `session_info_update` 和 `usage_update` 派生自 Gateway(网关) 会话
  快照，而非实时的 ACP 原生运行时统计。使用情况是近似的，
  不包含成本数据，并且仅当 Gateway(网关) 将总令牌
  数据标记为最新时才会发出。
- 工具跟随数据是尽力而为的。该网桥可以显示已知
  工具参数/结果中出现的文件路径，但尚未发送 ACP 终端或
  结构化文件差异。

## 用法

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

使用内置 ACP 客户端在不使用 IDE 的情况下对网桥进行健全性检查。
它会生成 ACP 网桥并允许您以交互方式输入提示。

```bash
openclaw acp client

# Point the spawned bridge at a remote Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Override the server command (default: openclaw)
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

权限模型（客户端调试模式）：

- 自动批准基于允许列表，仅适用于受信任的核心工具 ID。
- `read` 自动批准仅限于当前工作目录（如果设置，则为 `--cwd`）。
- ACP 仅自动批准狭窄的只读类别：活动 cwd 下的作用域 `read` 调用以及只读搜索工具 (`search`、`web_search`、`memory_search`)。未知/非核心工具、范围外读取、具有执行能力的工具、控制平面工具、变异工具和交互式流程始终需要明确的提示批准。
- 服务器提供的 `toolCall.kind` 被视为不受信任的元数据（而非授权源）。
- 此 ACP 网桥策略与 ACPX 驱动权限是分开的。如果您通过 `acpx` 后端运行 OpenClaw，则 `plugins.entries.acpx.config.permissionMode=approve-all` 是该驱动会话的应急“yolo”开关。

## 如何使用此功能

当 IDE（或其他客户端）使用 Agent Client Protocol 并且您希望它驱动 OpenClaw Gateway(网关) 会话时，请使用 ACP。

1. 确保 Gateway(网关) 正在运行（本地或远程）。
2. 配置 Gateway(网关) 目标（配置或标志）。
3. 将您的 IDE 指向通过 stdio 运行 `openclaw acp`。

配置示例（已持久化）：

```bash
openclaw config set gateway.remote.url wss://gateway-host:18789
openclaw config set gateway.remote.token <token>
```

直接运行示例（无配置写入）：

```bash
openclaw acp --url wss://gateway-host:18789 --token <token>
# preferred for local process safety
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token
```

## 选择代理

ACP 不直接选择代理。它通过 Gateway(网关) 会话密钥进行路由。

使用代理作用域会话密钥来定位特定代理：

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

每个 ACP 会话映射到单个 Gateway(网关) 会话密钥。一个代理可以拥有多个会话；除非您覆盖密钥或标签，否则 ACP 默认为隔离的 `acp:<uuid>` 会话。

网桥模式下不支持每个会话的 `mcpServers`。如果 ACP 客户端在 `newSession` 或 `loadSession` 期间发送它们，网桥将返回明确的错误，而不是静默忽略它们。

如果您希望 ACPX 支持的会话能够看到 OpenClaw 插件工具，请启用网关端的 ACPX 插件网桥，而不是尝试传递每个会话的 `mcpServers`。请参阅 [ACP Agents](/en/tools/acp-agents#plugin-tools-mcp-bridge)。

## 从 `acpx` 使用（Codex、Claude 以及其他 ACP 客户端）

如果您希望编码代理（例如 Codex 或 Claude Code）通过 ACP 与您的
OpenClaw 机器人对话，请使用带有内置 `openclaw` 目标的 `acpx`。

典型流程：

1. 运行 Gateway(网关) 并确保 ACP 网桥可以访问它。
2. 将 `acpx openclaw` 指向 `openclaw acp`。
3. 指定您希望编码代理使用的 OpenClaw 会话密钥。

示例：

```bash
# One-shot request into your default OpenClaw ACP session
acpx openclaw exec "Summarize the active OpenClaw session state."

# Persistent named session for follow-up turns
acpx openclaw sessions ensure --name codex-bridge
acpx openclaw -s codex-bridge --cwd /path/to/repo \
  "Ask my OpenClaw work agent for recent context relevant to this repo."
```

如果您希望 `acpx openclaw` 每次都针对特定的 Gateway(网关) 和会话密钥，
请在 `~/.acpx/config.json` 中覆盖 `openclaw` 代理命令：

```json
{
  "agents": {
    "openclaw": {
      "command": "env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 openclaw acp --url ws://127.0.0.1:18789 --token-file ~/.openclaw/gateway.token --session agent:main:main"
    }
  }
}
```

对于仓库本地的 OpenClaw 副本，请使用直接的 CLI 入口点而不是
dev runner，以便 ACP 流保持干净。例如：

```bash
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

这是让 Codex、Claude Code 或其他支持 ACP 的客户端
从 OpenClaw 代理获取上下文信息而无需抓取终端的最简单方法。

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

在 Zed 中，打开 Agent 面板并选择“OpenClaw ACP”以启动线程。

## 会话映射

默认情况下，ACP 会话将获得带有 `acp:` 前缀的独立 Gateway(网关) 会话密钥。
要重用已知会话，请传递会话密钥或标签：

- `--session <key>`：使用特定的 Gateway(网关) 会话密钥。
- `--session-label <label>`：通过标签解析现有会话。
- `--reset-session`：为该密钥创建新的会话 ID（相同密钥，新记录）。

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

在 [/concepts/会话](/en/concepts/session) 了解有关会话密钥的更多信息。

## 选项

- `--url <url>`：Gateway(网关) WebSocket URL（配置时默认为 gateway.remote.url）。
- `--token <token>`：Gateway(网关) 身份验证令牌。
- `--token-file <path>`：从文件读取 Gateway(网关) 身份验证令牌。
- `--password <password>`：Gateway(网关) 身份验证密码。
- `--password-file <path>`：从文件读取 Gateway(网关) 身份验证密码。
- `--session <key>`：默认会话密钥。
- `--session-label <label>`：要解析的默认会话标签。
- `--require-existing`：如果会话键/标签不存在则失败。
- `--reset-session`：在首次使用前重置会话键。
- `--no-prefix-cwd`：不要在工作目录前为提示添加前缀。
- `--verbose, -v`：将详细日志输出到 stderr。

安全说明：

- 在某些系统上，`--token` 和 `--password` 在本地进程列表中可能是可见的。
- 优先使用 `--token-file`/`--password-file` 或环境变量（`OPENCLAW_GATEWAY_TOKEN`、`OPENCLAW_GATEWAY_PASSWORD`）。
- Gateway(网关) 身份验证解析遵循其他 Gateway(网关) 客户端使用的共享协议：
  - 本地模式：env（`OPENCLAW_GATEWAY_*`）-> `gateway.auth.*` -> `gateway.remote.*`，仅在 `gateway.auth.*` 未设置时回退（已配置但未解析的本地 SecretRefs 将执行失败关闭）
  - 远程模式：根据远程优先级规则，使用带有 env/config 回退的 `gateway.remote.*`
  - `--url` 是覆盖安全的，不会重用隐式配置/env 凭据；请传递显式的 `--token`/`--password`（或文件变体）
- ACP 运行时后端子进程接收 `OPENCLAW_SHELL=acp`，可用于特定于上下文的 shell/profile 规则。
- `openclaw acp client` 在生成的桥接进程上设置 `OPENCLAW_SHELL=acp-client`。

### `acp client` 选项

- `--cwd <dir>`：ACP 会话的工作目录。
- `--server <command>`：ACP 服务器命令（默认：`openclaw`）。
- `--server-args <args...>`：传递给 ACP 服务器的额外参数。
- `--server-verbose`：在 ACP 服务器上启用详细日志记录。
- `--verbose, -v`：详细的客户端日志记录。
