---
summary: "运行 ACP 网桥以用于 IDE 集成"
read_when:
  - 设置基于 ACP 的 IDE 集成
  - 调试 ACP 会话路由到网关
title: "acp"
---

# acp

运行 ACP (Agent Client Protocol) 网桥，该网桥与 OpenClaw 网关通信。

此命令通过 stdio 使用 ACP 与 IDE 通信，并通过 WebSocket 将提示转发给网关。
它保持 ACP 会话映射到网关会话密钥。

## 使用方法

```bash
openclaw acp

# 远程网关
openclaw acp --url wss://gateway-host:18789 --token <token>

# 附加到现有会话密钥
openclaw acp --session agent:main:main

# 通过标签附加（必须已存在）
openclaw acp --session-label "support inbox"

# 在第一次提示之前重置会话密钥
openclaw acp --session agent:main:main --reset-session
```

## ACP 客户端（调试）

使用内置的 ACP 客户端在没有 IDE 的情况下对网桥进行健全性检查。
它会生成 ACP 网桥并让您交互式地输入提示。

```bash
openclaw acp client

# 将生成的网桥指向远程网关
openclaw acp client --server-args --url wss://gateway-host:18789 --token <token>

# 覆盖服务器命令（默认：openclaw）
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

## 如何使用

当 IDE（或其他客户端）使用 Agent Client Protocol 并且您希望它驱动 OpenClaw 网关会话时，请使用 ACP。

1. 确保网关正在运行（本地或远程）。
2. 配置网关目标（配置或标志）。
3. 将您的 IDE 指向通过 stdio 运行 `openclaw acp`。

示例配置（持久化）：

```bash
openclaw config set gateway.remote.url wss://gateway-host:18789
openclaw config set gateway.remote.token <token>
```

示例直接运行（无配置写入）：

```bash
openclaw acp --url wss://gateway-host:18789 --token <token>
```

## 选择代理

ACP 不直接选择代理。它通过网关会话密钥进行路由。

使用代理范围的会话密钥来定位特定代理：

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

每个 ACP 会话映射到单个网关会话密钥。一个代理可以有许多会话；
除非您覆盖密钥或标签，否则 ACP 默认为隔离的 `acp:<uuid>` 会话。

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

要定位特定的网关或代理：

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

在 Zed 中，打开代理面板并选择"OpenClaw ACP"以启动线程。

## 会话映射

默认情况下，ACP 会话获得一个带有 `acp:` 前缀的隔离网关会话密钥。
要重用已知会话，请传递会话密钥或标签：

- `--session <key>`：使用特定的网关会话密钥。
- `--session-label <label>`：通过标签解析现有会话。
- `--reset-session`：为该密钥创建新的会话 ID（相同的密钥，新的对话记录）。

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

在 [/concepts/session](/zh/concepts/session) 了解有关会话密钥的更多信息。

## 选项

- `--url <url>`：网关 WebSocket URL（配置时默认为 gateway.remote.url）。
- `--token <token>`：网关身份验证令牌。
- `--password <password>`：网关身份验证密码。
- `--session <key>`：默认会话密钥。
- `--session-label <label>`：要解析的默认会话标签。
- `--require-existing`：如果会话密钥/标签不存在则失败。
- `--reset-session`：在首次使用之前重置会话密钥。
- `--no-prefix-cwd`：不要在工作目录之前添加提示。
- `--verbose, -v`：详细日志记录到 stderr。

### `acp client` 选项

- `--cwd <dir>`：ACP 会话的工作目录。
- `--server <command>`：ACP 服务器命令（默认：`openclaw`）。
- `--server-args <args...>`：传递给 ACP 服务器的额外参数。
- `--server-verbose`：在 ACP 服务器上启用详细日志记录。
- `--verbose, -v`：详细客户端日志记录。
