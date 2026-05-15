---
summary: "ClickClack 机器人令牌渠道设置和目标语法"
read_when:
  - Connecting OpenClaw to a ClickClack workspace
  - Testing ClickClack bot identities
title: "ClickClack"
---

ClickClack 通过一流的 ClickClack 机器人令牌将 OpenClaw 连接到自托管的 ClickClack 工作区。

当您希望 OpenClaw 代理显示为 ClickClack 机器人用户时，请使用此功能。ClickClack 支持独立的服务机器人和用户拥有的机器人；用户拥有的机器人保留一个 `owner_user_id`，并且仅接收您授予的令牌范围。

## 快速设置

在 ClickClack 中创建一个机器人令牌：

```bash
clickclack admin bot create \
  --workspace <workspace_id_or_slug> \
  --name "OpenClaw" \
  --handle openclaw \
  --scopes bot:write \
  --plain
```

对于用户拥有的机器人，添加 `--owner <user_id>`。

配置 OpenClaw：

```json5
{
  plugins: {
    entries: {
      clickclack: {
        llm: {
          allowAgentIdOverride: true,
        },
      },
    },
  },
  channels: {
    clickclack: {
      enabled: true,
      baseUrl: "https://app.clickclack.chat",
      token: { source: "env", provider: "default", id: "CLICKCLACK_BOT_TOKEN" },
      workspace: "default",
      defaultTo: "channel:general",
      agentId: "clickclack-bot",
      replyMode: "model",
    },
  },
}
```

然后运行：

```bash
export CLICKCLACK_BOT_TOKEN="ccb_..."
openclaw gateway
```

## 多个机器人

每个账户都会打开自己的 ClickClack 实时连接，并使用自己的机器人令牌。

```json5
{
  plugins: {
    entries: {
      clickclack: {
        llm: {
          allowAgentIdOverride: true,
        },
      },
    },
  },
  channels: {
    clickclack: {
      enabled: true,
      baseUrl: "https://app.clickclack.chat",
      defaultAccount: "service",
      accounts: {
        service: {
          token: { source: "env", provider: "default", id: "CLICKCLACK_SERVICE_BOT_TOKEN" },
          workspace: "default",
          defaultTo: "channel:general",
          agentId: "service-bot",
          replyMode: "model",
        },
        peter: {
          token: { source: "env", provider: "default", id: "CLICKCLACK_PETER_BOT_TOKEN" },
          workspace: "default",
          defaultTo: "dm:usr_...",
          agentId: "peter-bot",
          replyMode: "model",
        },
      },
    },
  },
}
```

`replyMode: "model"` 直接使用 `api.runtime.llm.complete` 进行简短的机器人回复。
当账户设置 `agentId` 时，OpenClaw 需要显式的
`plugins.entries.clickclack.llm.allowAgentIdOverride` 信任位，以便插件
可以为该机器人代理运行补全。如果您仅使用默认
代理路由，请将其保持关闭状态。

## 目标

- `channel:<name-or-id>` 发送到工作区渠道。裸目标默认为 `channel:`。
- `dm:<user_id>` 创建或重用与该用户的直接对话。
- `thread:<message_id>` 在现有主题中回复。

示例：

```bash
openclaw message send --channel clickclack --target channel:general --message "hello"
openclaw message send --channel clickclack --target dm:usr_123 --message "hello"
openclaw message send --channel clickclack --target thread:msg_123 --message "following up"
```

## 权限

ClickClack 令牌范围由 ClickClack API 强制执行。

- `bot:read`：读取工作区/渠道/消息/主题/私信/实时/个人资料数据。
- `bot:write`：`bot:read` 加上渠道消息、主题回复、私信和上传。
- `bot:admin`：`bot:write` 加上渠道创建。

OpenClaw 进行正常代理聊天只需要 `bot:write`。

## 故障排除

- `ClickClack is not configured`：设置 `channels.clickclack.token` 或 `CLICKCLACK_BOT_TOKEN`。
- `workspace not found`：将 `workspace` 设置为 ClickClack 返回的工作区 ID 或别名。
- 无传入回复：请确认令牌具有实时读取权限，且机器人未回复其自己的消息。
- 频道发送失败：请验证机器人是工作区成员并具有 `bot:write`。
