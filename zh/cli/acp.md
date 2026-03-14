---
summary: "运行用于 IDE 集成的 ACP 网桥"
read_when:
  - Setting up ACP-based IDE integrations
  - Debugging ACP session routing to the Gateway
title: "acp"
---

# acp

运行与 OpenClaw Gateway 网关 通信的 [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 网桥。

此命令通过 stdio 与 IDE 进行 ACP 通信，并通过 WebSocket 将提示转发给 Gateway 网关。
它将 ACP 会话映射到 Gateway 网关 会话密钥。

`openclaw acp` 是一个由 Gateway 网关 支持的 ACP 网桥，而非完整的 ACP 原生编辑器
运行时。它专注于会话路由、提示传递和基本的流式
更新。

## Matrix 兼容性Matrix

| ACP 区域 | 状态 | 备注 |
| --------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `initialize`, `newSession`, `prompt`, `cancel` | 已实现 | 通过 stdio 到 Gateway 网关 chat/send + abort 的核心桥接流程。 |
| `listSessions`, 斜杠命令 | 已实现 | 会话列表适用于 Gateway 网关 会话状态；命令通过 `available_commands_update` 进行通告。 |
| `loadSession` | 部分 | 将 ACP 会话重新绑定到 Gateway 网关 会话密钥并重放存储的用户/助手文本历史记录。工具/系统历史记录尚未重建。 |
| 提示内容 (`text`, 嵌入式 `resource`, 图像) | 部分 | 文本/资源被扁平化到聊天输入中；图像成为 Gateway 网关 附件。 |
| 会话模式 | 部分 | 支持 `session/set_mode`，桥接暴露了初始支持的 Gateway 网关 会话控制，包括思维级别、工具详细程度、推理、使用详情和提升的操作。更广泛的 ACP 原生模式/配置界面仍不在范围内。 |
| 会话信息和使用更新 | 部分 | 桥接从缓存的 Gateway 网关 会话快照发出 `session_info_update` 和尽力而为的 `usage_update` 通知。使用情况是近似的，仅当 Gateway 网关 token 总数被标记为最新时才发送。 |
| 工具流式传输 | 部分 | 当 Gateway 网关 工具参数/结果暴露它们时，`tool_call` / `tool_call_update` 事件包括原始 I/O、文本内容和尽力而为的文件位置。嵌入式终端和更丰富的 diff 原生输出仍未暴露。 |
| 每会话 MCP 服务器 (`mcpServers`) | 不支持 | 桥接模式拒绝每会话 MCP 服务器请求。改为在 OpenClaw gateway 或 agent 上配置 MCP。 |
| 客户端文件系统方法 (`fs/read_text_file`, `fs/write_text_file`) | 不支持 | 桥接不调用 ACP 客户端文件系统方法。 |
| 客户端终端方法 (`terminal/*`) | 不支持 | 桥接不创建 ACP 客户端终端或通过工具调用流式传输终端 ID。 |
| 会话计划 / 思维流式传输 | 不支持 | 桥接当前发出输出文本和工具状态，而不是 ACP 计划或思维更新。 |

## 已知限制

- `loadSession` 重放存储的用户和助手文本历史，但它并不
  不会重构历史工具调用、系统通知或更丰富的 ACP 原生事件
  类型。
- 如果多个 ACP 客户端共享同一个 Gateway 网关 会话密钥，事件和取消
  路由是尽力而为的，而不是严格按客户端隔离的。当您需要干净的编辑器本地
  轮次时，请首选默认隔离的 `acp:<uuid>` 会话。
- Gateway 网关 停止状态会转换为 ACP 停止原因，但这种映射
  的表达性不如完全 ACP 原生运行时。
- 初始会话控件目前展示了 Gateway 网关 控件的一个重点子集：
  思考级别、工具详细程度、推理、使用详情和提升
  操作。模型选择和执行主机控件尚未作为 ACP
  配置选项公开。
- `session_info_update` 和 `usage_update` 派生自 Gateway 网关 会话
 快照，而不是实时的 ACP 原生运行时统计。使用情况是近似的， 不携带成本数据，并且仅在 Gateway 网关 将总令牌 数据标记为新鲜时发出。
- 工具跟随数据是尽力而为的。桥接器可以显示
  出现在已知工具参数/结果中的文件路径，但它尚未发出 ACP 终端或
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

使用内置的 ACP 客户端在没有 IDE 的情况下对桥接器进行健全性检查。
它会生成 ACP 桥接器并允许您交互式地输入提示。

```bash
openclaw acp client

# Point the spawned bridge at a remote Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Override the server command (default: openclaw)
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

权限模型（客户端调试模式）：

- 自动批准是基于白名单的，并且仅适用于受信任的核心工具 ID。
- `read` 自动批准的作用域限定为当前工作目录（设置时为 `--cwd`）。
- 未知/非核心工具名称、范围外读取和危险工具始终需要明确的提示批准。
- 服务器提供的 `toolCall.kind` 被视为不受信任的元数据（而非授权来源）。

## 如何使用此功能

当 IDE（或其他客户端）使用 Agent Client Protocol 并且您希望
它驱动 OpenClaw Gateway 网关 会话时，请使用 ACP。

1. 确保 Gateway 网关 正在运行（本地或远程）。
2. 配置 Gateway 网关 目标（配置文件或标志）。
3. 将您的 IDE 指向运行通过 stdio 的 `openclaw acp`。

配置示例（持久化）：

```bash
openclaw config set gateway.remote.url wss://gateway-host:18789
openclaw config set gateway.remote.token <token>
```

直接运行示例（不写入配置）：

```bash
openclaw acp --url wss://gateway-host:18789 --token <token>
# preferred for local process safety
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token
```

## 选择代理

ACP 不直接选择代理。它通过 Gateway 网关 会话密钥进行路由。

使用代理范围的会话密钥来定位特定的代理：

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

每个 ACP 会话映射到单个 Gateway 网关 会话密钥。一个代理可以拥有许多
会话；除非您覆盖
密钥或标签，否则 ACP 默认为隔离的 `acp:<uuid>` 会话。

网桥模式不支持每个会话的 `mcpServers`。如果 ACP 客户端
在 `newSession` 或 `loadSession` 期间发送它们，网桥将返回明确的
错误，而不是静默忽略它们。

## 从 `acpx` (Codex, Claude, 其他 ACP 客户端) 使用

如果您希望编码代理（如 Codex 或 Claude Code）通过 ACP 与您的
OpenClaw 机器人对话，请使用 `acpx` 及其内置的 `openclaw` 目标。

典型流程：

1. 运行 Gateway 网关 并确保 ACP 桥接器可以访问它。
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

如果您希望 `acpx openclaw` 每次都
针对特定的 Gateway 网关 和会话密钥，请覆盖 `~/.acpx/config.json` 中的 `openclaw` 代理命令：

```json
{
  "agents": {
    "openclaw": {
      "command": "env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 openclaw acp --url ws://127.0.0.1:18789 --token-file ~/.openclaw/gateway.token --session agent:main:main"
    }
  }
}
```

对于仓库本地的 OpenClaw 检出版本，请使用直接 CLI 入口点而不是开发运行器，以保持 ACP 流程干净。例如：

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

要定位特定的 Gateway 网关 或代理：

```json
{
  "agent_servers": {
    "OpenClaw ACP": {
      "type": "custom",
      "command": "openclaw",
      "args": [
        "acp",
        "--url",
        "wss://gateway-host:18789",
        "--token",
        "<token>",
        "--session",
        "agent:design:main"
      ],
      "env": {}
    }
  }
}
```

在 Zed 中，打开 Agent 面板并选择“OpenClaw ACP”以启动线程。

## 会话映射

默认情况下，ACP 会话将获得带有 `acp:` 前缀的隔离 Gateway 网关 会话密钥。
要重用已知会话，请传递会话密钥或标签：

- `--session <key>`：使用特定的 Gateway 网关 会话密钥。
- `--session-label <label>`：通过标签解析现有会话。
- `--reset-session`：为该密钥生成一个新的会话 ID（相同的密钥，新的对话记录）。

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

在 [/concepts/会话](/zh/en/concepts/会话) 了解更多关于会话密钥的信息。

## 选项

- `--url <url>`：Gateway 网关 WebSocket URL（配置时默认为 gateway.remote.url）。
- `--token <token>`：Gateway 网关 认证令牌。
- `--token-file <path>`：从文件读取 Gateway 网关 认证令牌。
- `--password <password>`：Gateway 网关 认证密码。
- `--password-file <path>`：从文件读取 Gateway 网关 认证密码。
- `--session <key>`：默认会话密钥。
- `--session-label <label>`：要解析的默认会话标签。
- `--require-existing`：如果会话密钥/标签不存在则失败。
- `--reset-session`：在首次使用前重置会话密钥。
- `--no-prefix-cwd`：不要在提示前添加工作目录前缀。
- `--verbose, -v`：将详细日志输出到 stderr。

安全提示：

- 在某些系统上，`--token` 和 `--password` 可能在本地进程列表中可见。
- 建议使用 `--token-file`/`--password-file` 或环境变量（`OPENCLAW_GATEWAY_TOKEN`，`OPENCLAW_GATEWAY_PASSWORD`）。
- Gateway 网关 认证解析遵循其他 Gateway 网关 客户端使用的共享合约：
  - 本地模式：环境变量 (`OPENCLAW_GATEWAY_*`) -> `gateway.auth.*` -> `gateway.remote.*` 仅在 `gateway.auth.*` 未设置时进行回退（已配置但未解析的本地 SecretRefs 将失败关闭）
  - 远程模式：`gateway.remote.*` 根据远程优先级规则回退到环境变量/配置
  - `--url` 是覆盖安全的，不会重用隐式配置/环境凭据；请传递显式的 `--token`/`--password`（或文件变体）
- ACP 运行时后端子进程接收 `OPENCLAW_SHELL=acp`，可用于特定于上下文的 shell/profile 规则。
- `openclaw acp client` 在生成的桥接进程上设置 `OPENCLAW_SHELL=acp-client`。

### `acp client` 选项

- `--cwd <dir>`: ACP 会话的工作目录。
- `--server <command>`: ACP 服务器命令（默认值：`openclaw`）。
- `--server-args <args...>`: 传递给 ACP 服务器的额外参数。
- `--server-verbose`: 在 ACP 服务器上启用详细日志记录。
- `--verbose, -v`: 详细的客户端日志记录。

import zh from '/components/footer/zh.mdx';

<zh />
