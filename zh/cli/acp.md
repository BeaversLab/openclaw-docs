---
summary: "运行 ACP 桥接以集成 IDE"
read_when:
  - 设置基于 ACP 的 IDE 集成
  - 调试 ACP 会话到 Gateway 的路由
---

# acp

运行与 OpenClaw Gateway 通信的 ACP（Agent Client Protocol）桥接。

该命令通过 stdio 与 IDE 进行 ACP 通信，并通过 WebSocket 将提示转发到 Gateway。
它会将 ACP 会话映射到 Gateway 的会话 key。

## 用法

```bash
openclaw acp

# 远程 Gateway
openclaw acp --url wss://gateway-host:18789 --token <token>

# 绑定到已有会话 key
openclaw acp --session agent:main:main

# 按 label 绑定（必须已存在）
openclaw acp --session-label "support inbox"

# 首次提示前重置会话 key
openclaw acp --session agent:main:main --reset-session
```

## ACP 客户端（调试）

使用内置 ACP client 在不依赖 IDE 的情况下检查桥接是否正常。
它会启动 ACP bridge 并允许交互式输入提示。

```bash
openclaw acp client

# 将桥接指向远程 Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token <token>

# 覆盖 server 命令（默认：openclaw）
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

## 如何使用

当 IDE（或其他客户端）支持 ACP 时，使用该命令驱动 OpenClaw Gateway 会话。

1. 确保 Gateway 正在运行（本地或远程）。
2. 配置 Gateway 目标（配置文件或 flags）。
3. 让 IDE 通过 stdio 运行 `openclaw acp`。

示例配置（持久化）：

```bash
openclaw config set gateway.remote.url wss://gateway-host:18789
openclaw config set gateway.remote.token <token>
```

直接运行（不写配置）：

```bash
openclaw acp --url wss://gateway-host:18789 --token <token>
```

## 选择 agent

ACP 不直接选择 agent，而是按 Gateway 会话 key 路由。

使用带 agent 的会话 key 来指定目标：

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

每个 ACP 会话映射到一个 Gateway 会话 key。一个 agent 可拥有多个会话；ACP 默认使用
隔离的 `acp:<uuid>` 会话，除非你覆盖 key 或 label。

## Zed 编辑器设置

在 `~/.config/zed/settings.json` 中添加自定义 ACP agent（或用 Zed 设置 UI）：

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

如需指向特定 Gateway 或 agent：

```json
{
  "agent_servers": {
    "OpenClaw ACP": {
      "type": "custom",
      "command": "openclaw",
      "args": [
        "acp",
        "--url", "wss://gateway-host:18789",
        "--token", "<token>",
        "--session", "agent:design:main"
      ],
      "env": {}
    }
  }
}
```

在 Zed 中打开 Agent 面板并选择 “OpenClaw ACP” 开始会话。

## 会话映射

默认情况下，ACP 会话会使用带 `acp:` 前缀的隔离 Gateway 会话 key。
若需复用已知会话，可传 session key 或 label：

- `--session <key>`：使用指定 Gateway 会话 key。
- `--session-label <label>`：按 label 解析已有会话。
- `--reset-session`：在首次使用前重置该 key（同 key，新 transcript）。

如果 ACP client 支持 metadata，可按会话覆盖：

```json
{
  "_meta": {
    "sessionKey": "agent:main:main",
    "sessionLabel": "support inbox",
    "resetSession": true
  }
}
```

更多会话 key 说明见 [/concepts/session](/zh/concepts/session)。

## 选项

- `--url <url>`：Gateway WebSocket URL（若已配置则默认 gateway.remote.url）。
- `--token <token>`：Gateway auth token。
- `--password <password>`：Gateway auth password。
- `--session <key>`：默认 session key。
- `--session-label <label>`：默认 session label。
- `--require-existing`：若会话 key/label 不存在则失败。
- `--reset-session`：首次使用前重置 session key。
- `--no-prefix-cwd`：不在提示前附加当前工作目录。
- `--verbose, -v`：输出详细日志到 stderr。

### `acp client` 选项

- `--cwd <dir>`：ACP 会话的工作目录。
- `--server <command>`：ACP server 命令（默认：`openclaw`）。
- `--server-args <args...>`：传给 ACP server 的额外参数。
- `--server-verbose`：启用 ACP server 端的详细日志。
- `--verbose, -v`：客户端详细日志。
