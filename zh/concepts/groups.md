---
summary: "跨平台群聊行为（WhatsApp/Telegram/Discord/Slack/Signal/iMessage/Microsoft Teams）"
read_when:
  - 修改群聊行为或 mention 门控时
---
# 群组

OpenClaw 在各表面统一处理群聊：WhatsApp、Telegram、Discord、Slack、Signal、iMessage、Microsoft Teams。

## 新手入门（2 分钟）
OpenClaw “寄居”在你自己的消息账号上，不存在单独的 WhatsApp 机器人用户。
如果**你**在群里，OpenClaw 就能看到该群并在那里回复。

默认行为：
- 群聊默认受限（`groupPolicy: "allowlist"`）。
- 回复需要 mention，除非你显式关闭 mention 门控。

翻译成一句话：allowlist 的发送者需要提及 OpenClaw 才能触发。

> TL;DR
> - **DM 访问**由 `*.allowFrom` 控制。
> - **群聊访问**由 `*.groupPolicy` + allowlist（`*.groups`、`*.groupAllowFrom`）控制。
> - **回复触发**由 mention 门控控制（`requireMention`、`/activation`）。

快速流程（群消息如何处理）：
```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
otherwise -> reply
```

![Group message flow](/images/groups-flow.svg)

如果你想……
| 目标 | 要设置什么 |
|------|-------------|
| 允许所有群但仅在 @mentions 回复 | `groups: { "*": { requireMention: true } }` |
| 禁用全部群回复 | `groupPolicy: "disabled"` |
| 仅允许指定群 | `groups: { "<group-id>": { ... } }`（不含 `"*"`） |
| 只有你能在群里触发 | `groupPolicy: "allowlist"`，`groupAllowFrom: ["+1555..."]` |

## Session keys
- 群会话使用 `agent:<agentId>:<channel>:group:<id>`（房间/频道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 论坛话题会在 group id 后追加 `:topic:<threadId>`，使每个话题拥有独立会话。
- 私聊使用主会话（或按发送者配置）。
- 群会话会跳过 heartbeat。

## 模式：个人私聊 + 公共群（单 agent）

可以——这在“个人流量=DM、公共流量=群”时很好用。

原因：单 agent 模式下，DM 通常落到**主**会话 key（`agent:main:main`），而群聊始终使用**非主**会话 key（`agent:main:<channel>:group:<id>`）。如果你启用 `mode: "non-main"` 的 sandboxing，这些群会话会运行在 Docker 中，而你的主 DM 会话仍在主机上。

这会形成一个共享“脑”（同一工作区 + memory），但有两种执行姿态：
- **DMs**：完整工具（host）
- **Groups**：sandbox + 限制工具（Docker）

> 如果你需要真正隔离的工作区/人格（“个人”和“公共”绝不能混），请使用第二个 agent + bindings。参见 [Multi-Agent Routing](/zh/concepts/multi-agent)。

示例（DM 在 host，群在 sandbox + 仅消息工具）：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // groups/channels are non-main -> sandboxed
        scope: "session", // strongest isolation (one container per group/channel)
        workspaceAccess: "none"
      }
    }
  },
  tools: {
    sandbox: {
      tools: {
        // If allow is non-empty, everything else is blocked (deny still wins).
        allow: ["group:messaging", "group:sessions"],
        deny: ["group:runtime", "group:fs", "group:ui", "nodes", "cron", "gateway"]
      }
    }
  }
}
```

想让“群只能看到文件夹 X”而不是“无主机访问”？保持 `workspaceAccess: "none"` 并仅将允许的路径挂载到 sandbox：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        scope: "session",
        workspaceAccess: "none",
        docker: {
          binds: [
            // hostPath:containerPath:mode
            "~/FriendsShared:/data:ro"
          ]
        }
      }
    }
  }
}
```

相关：
- 配置键与默认值：[Gateway configuration](/zh/gateway/configuration#agentsdefaultssandbox)
- 调试工具被阻止原因：[Sandbox vs Tool Policy vs Elevated](/zh/gateway/sandbox-vs-tool-policy-vs-elevated)
- Bind mounts 细节：[Sandboxing](/zh/gateway/sandboxing#custom-bind-mounts)

## Display labels
- UI 标签在可用时使用 `displayName`，格式为 `<channel>:<token>`。
- `#room` 预留给 rooms/channels；群聊使用 `g-<slug>`（小写，空格 -> `-`，保留 `#@+._-`）。

## Group policy

按渠道控制群/房间消息如何处理：

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "disabled", // "open" | "disabled" | "allowlist"
      groupAllowFrom: ["+15551234567"]
    },
    telegram: {
      groupPolicy: "disabled",
      groupAllowFrom: ["123456789", "@username"]
    },
    signal: {
      groupPolicy: "disabled",
      groupAllowFrom: ["+15551234567"]
    },
    imessage: {
      groupPolicy: "disabled",
      groupAllowFrom: ["chat_id:123"]
    },
    msteams: {
      groupPolicy: "disabled",
      groupAllowFrom: ["user@org.com"]
    },
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        "GUILD_ID": { channels: { help: { allow: true } } }
      }
    },
    slack: {
      groupPolicy: "allowlist",
      channels: { "#general": { allow: true } }
    },
    matrix: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["@owner:example.org"],
      groups: {
        "!roomId:example.org": { allow: true },
        "#alias:example.org": { allow: true }
      }
    }
  }
}
```

| Policy | 行为 |
|--------|------|
| `"open"` | 群聊绕过 allowlist；mention 门控仍适用。 |
| `"disabled"` | 完全屏蔽所有群消息。 |
| `"allowlist"` | 仅允许匹配 allowlist 的群/房间。 |

注：
- `groupPolicy` 与 mention 门控分离（mention 门控要求 @mentions）。
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams：使用 `groupAllowFrom`（兜底：显式 `allowFrom`）。
- Discord：allowlist 使用 `channels.discord.guilds.<id>.channels`。
- Slack：allowlist 使用 `channels.slack.channels`。
- Matrix：allowlist 使用 `channels.matrix.groups`（room IDs、alias 或名称）。使用 `channels.matrix.groupAllowFrom` 限制发送者；也支持按房间 `users` allowlist。
- 群 DM 单独控制（`channels.discord.dm.*`、`channels.slack.dm.*`）。
- Telegram allowlist 可匹配用户 ID（`"123456789"`、`"telegram:123456789"`、`"tg:123456789"`）或用户名（`"@alice"` 或 `"alice"`）；前缀不区分大小写。
- 默认是 `groupPolicy: "allowlist"`；若群 allowlist 为空，则群消息被阻止。

快速心智模型（群消息评估顺序）：
1) `groupPolicy`（open/disabled/allowlist）
2) 群 allowlist（`*.groups`、`*.groupAllowFrom`、渠道特定 allowlist）
3) mention 门控（`requireMention`、`/activation`）

## Mention 门控（默认）

群消息默认需要 mention，除非按群覆盖。默认值位于 `*.groups."*"`。

回复机器人消息也算作隐式 mention（当渠道支持 reply 元数据时）。适用于 Telegram、WhatsApp、Slack、Discord、Microsoft Teams。

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "*": { requireMention: true },
        "123@g.us": { requireMention: false }
      }
    },
    telegram: {
      groups: {
        "*": { requireMention: true },
        "123456789": { requireMention: false }
      }
    },
    imessage: {
      groups: {
        "*": { requireMention: true },
        "123": { requireMention: false }
      }
    }
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          mentionPatterns: ["@openclaw", "openclaw", "\\+15555550123"],
          historyLimit: 50
        }
      }
    ]
  }
}
```

注：
- `mentionPatterns` 是不区分大小写的正则。
- 有原生 mentions 的表面仍可通过；patterns 作为兜底。
- 按 agent 覆盖：`agents.list[].groupChat.mentionPatterns`（多个 agent 共享同一群时有用）。
- 仅当可检测 mention（原生 mentions 或配置了 `mentionPatterns`）时才会执行 mention 门控。
- Discord 默认值位于 `channels.discord.guilds."*"`（可按 guild/channel 覆盖）。
- 群历史上下文在各渠道统一包裹且仅包含**待处理**消息（因 mention 门控被跳过的消息）；全局默认使用 `messages.groupChat.historyLimit`，覆盖使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）。设置 `0` 禁用。

## 群/频道工具限制（可选）

某些渠道配置支持**在特定群/房间/频道内**限制可用工具。

- `tools`：为整个群允许/禁止工具。
- `toolsBySender`：群内按发送者覆盖（键为 sender ID/用户名/邮箱/手机号，取决于渠道）。使用 `"*"` 作为通配符。

解析顺序（越具体越优先）：
1) 群/频道 `toolsBySender` 命中
2) 群/频道 `tools`
3) 默认（`"*"`）`toolsBySender` 命中
4) 默认（`"*"`）`tools`

示例（Telegram）：

```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { tools: { deny: ["exec"] } },
        "-1001234567890": {
          tools: { deny: ["exec", "read", "write"] },
          toolsBySender: {
            "123456789": { alsoAllow: ["exec"] }
          }
        }
      }
    }
  }
}
```

注：
- 群/频道工具限制会叠加到全局/agent 工具策略之上（deny 仍然优先）。
- 有些渠道对 rooms/channels 使用不同层级（例如 Discord `guilds.*.channels.*`、Slack `channels.*`、MS Teams `teams.*.channels.*`）。

## 群 allowlists

当配置 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 时，键会作为群 allowlist。使用 `"*"` 可允许所有群，同时仍设置默认 mention 行为。

常见意图（可复制）：

1) 禁用所有群回复
```json5
{
  channels: { whatsapp: { groupPolicy: "disabled" } }
}
```

2) 仅允许指定群（WhatsApp）
```json5
{
  channels: {
    whatsapp: {
      groups: {
        "123@g.us": { requireMention: true },
        "456@g.us": { requireMention: false }
      }
    }
  }
}
```

3) 允许全部群但要求 mention（显式）
```json5
{
  channels: {
    whatsapp: {
      groups: { "*": { requireMention: true } }
    }
  }
}
```

4) 只有 owner 可在群里触发（WhatsApp）
```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
      groups: { "*": { requireMention: true } }
    }
  }
}
```

## Activation（仅 owner）

群 owner 可按群切换激活：
- `/activation mention`
- `/activation always`

Owner 由 `channels.whatsapp.allowFrom` 决定（未设置时为 bot 自身 E.164）。以独立消息发送命令。其他表面目前会忽略 `/activation`。

## Context 字段

群入站载荷会设置：
- `ChatType=group`
- `GroupSubject`（若已知）
- `GroupMembers`（若已知）
- `WasMentioned`（mention 门控结果）
- Telegram 论坛话题还包含 `MessageThreadId` 与 `IsForum`。

Agent 的 system prompt 会在新群会话首回合包含群聊介绍，提醒模型像人类一样回复、避免 Markdown 表格，并避免输出字面 `\n` 序列。

## iMessage 特定
- 路由或 allowlist 时优先使用 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群回复始终回到同一 `chat_id`。

## WhatsApp 特定

WhatsApp 专属行为（历史注入、mention 处理细节）参见 [Group messages](/zh/concepts/group-messages)。
