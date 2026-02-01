---
summary: "跨平台群聊行为（WhatsApp/Telegram/Discord/Slack/Signal/iMessage/Microsoft Teams）"
read_when:
  - 需要修改群聊行为或 mention gating
---
# Groups

OpenClaw 在各平台对群聊的处理一致：WhatsApp、Telegram、Discord、Slack、Signal、iMessage、Microsoft Teams。

## 新手简介（2 分钟）
OpenClaw 运行在你自己的消息账号上。没有单独的 WhatsApp bot 用户。
如果 **你** 在一个群里，OpenClaw 就能看到该群并在那里回复。

默认行为：
- 群聊受限（`groupPolicy: "allowlist"`）。
- 回复需要被 mention，除非你显式禁用 mention gating。

翻译：允许列表中的发送者可以通过 mention 触发 OpenClaw。

> TL;DR
> - **DM 访问** 由 `*.allowFrom` 控制。
> - **群访问** 由 `*.groupPolicy` + allowlists（`*.groups`、`*.groupAllowFrom`）控制。
> - **触发回复** 由 mention gating 控制（`requireMention`、`/activation`）。

快速流程（群消息会发生什么）：
```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
otherwise -> reply
```

![Group message flow](/images/groups-flow.svg)

如果你想...
| 目标 | 需要设置 |
|------|-------------|
| 允许所有群，但只在 @mentions 时回复 | `groups: { "*": { requireMention: true } }` |
| 禁用所有群回复 | `groupPolicy: "disabled"` |
| 只允许指定群 | `groups: { "<group-id>": { ... } }`（不含 `"*"`） |
| 只有你能在群中触发 | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |

## Session keys
- 群会话使用 `agent:<agentId>:<channel>:group:<id>` session key（房间/频道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram forum topic 会在 group id 后追加 `:topic:<threadId>`，每个话题有独立会话。
- 私聊使用 main 会话（或按发送者配置）。
- 群会话跳过心跳。

## 模式：个人 DMs + 公共群（单 agent）

可以 —— 当你的“个人”流量是 **DMs**，“公开”流量是 **群聊** 时非常合适。

原因：在单 agent 模式下，DM 通常进入 **main** session key（`agent:main:main`），而群聊总是使用 **非 main** session key（`agent:main:<channel>:group:<id>`）。如果启用 `mode: "non-main"` 的 sandbox，那么群会话在 Docker 中运行，main DM 会话仍在主机上运行。

这让你拥有一个 agent “大脑”（共享 workspace + memory），但有两种执行姿态：
- **DMs**：完整工具（主机）
- **Groups**：sandbox + 受限工具（Docker）

> 如果你需要真正独立的 workspace/persona（“personal” 与 “public” 不能混），请使用第二个 agent + bindings。见 [Multi-Agent Routing](/zh/concepts/multi-agent)。

示例（DMs 在主机、群聊 sandbox + 仅消息工具）：

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

想要“群聊只能看到文件夹 X”，而不是“无主机访问”？保持 `workspaceAccess: "none"`，并只挂载允许的路径到 sandbox：

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
- 排查工具被阻止原因：[Sandbox vs Tool Policy vs Elevated](/zh/gateway/sandbox-vs-tool-policy-vs-elevated)
- Bind mounts 细节：[Sandboxing](/zh/gateway/sandboxing#custom-bind-mounts)

## 显示标签
- UI 标签优先使用 `displayName`，格式为 `<channel>:<token>`。
- `#room` 保留给房间/频道；群聊使用 `g-<slug>`（小写，空格 -> `-`，保留 `#@+._-`）。

## 群策略

按频道控制群/房间消息的处理：

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
|--------|----------|
| `"open"` | 群聊绕过 allowlist；仍受 mention gating 约束。 |
| `"disabled"` | 完全阻止所有群消息。 |
| `"allowlist"` | 仅允许匹配 allowlist 的群/房间。 |

备注：
- `groupPolicy` 与 mention gating 分离（后者要求 @mentions）。
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams：使用 `groupAllowFrom`（回退到显式 `allowFrom`）。
- Discord：allowlist 使用 `channels.discord.guilds.<id>.channels`。
- Slack：allowlist 使用 `channels.slack.channels`。
- Matrix：allowlist 使用 `channels.matrix.groups`（房间 ID、别名或名称）。可用 `channels.matrix.groupAllowFrom` 限制发送者；也支持按房间的 `users` allowlist。
- Group DMs 单独控制（`channels.discord.dm.*`、`channels.slack.dm.*`）。
- Telegram allowlist 可匹配 user IDs（`"123456789"`、`"telegram:123456789"`、`"tg:123456789"`）或用户名（`"@alice"` 或 `"alice"`）；前缀不区分大小写。
- 默认 `groupPolicy: "allowlist"`；若 group allowlist 为空，群消息会被阻止。

群消息的快速心智模型（评估顺序）：
1) `groupPolicy`（open/disabled/allowlist）
2) group allowlists（`*.groups`、`*.groupAllowFrom`、频道特定 allowlist）
3) mention gating（`requireMention`、`/activation`）

## Mention gating（默认）
群消息默认需要 mention，除非对单群覆盖。默认值在各子系统的 `*.groups."*"` 下。

回复 bot 消息也算隐式 mention（当频道支持回复元数据时）。适用于 Telegram、WhatsApp、Slack、Discord、Microsoft Teams。

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

备注：
- `mentionPatterns` 是不区分大小写的正则。
- 有原生 mention 的平台仍会通过；patterns 仅作兜底。
- 每 agent 覆盖：`agents.list[].groupChat.mentionPatterns`（多 agent 共用群时很有用）。
- mention gating 仅在可检测 mention 时生效（原生 mentions 或配置了 `mentionPatterns`）。
- Discord 默认值在 `channels.discord.guilds."*"` 下（可对 guild/channel 覆盖）。
- 群历史上下文在各频道统一封装，且 **仅 pending**（因 mention gating 被跳过的消息）；全局默认使用 `messages.groupChat.historyLimit`，覆盖使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）。设为 `0` 可禁用。

## 群/频道工具限制（可选）
部分频道支持在 **特定群/房间/频道内** 限制可用工具。

- `tools`：对整个群的 allow/deny。
- `toolsBySender`：群内按发送者覆盖（键为发送者 ID/用户名/邮箱/手机号，取决于频道）。使用 `"*"` 作为通配符。

解析顺序（越具体优先）：
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

备注：
- 群/频道工具限制会叠加在全局/agent 工具策略之上（deny 仍优先）。
- 不同频道对房间/频道的嵌套层级不同（如 Discord `guilds.*.channels.*`、Slack `channels.*`、MS Teams `teams.*.channels.*`）。

## 群 allowlists
当配置 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 时，键会作为群 allowlist。使用 `"*"` 可允许所有群，同时保留默认 mention 行为。

常见意图（可直接复制）：

1) 禁用所有群回复
```json5
{
  channels: { whatsapp: { groupPolicy: "disabled" } }
}
```

2) 仅允许特定群（WhatsApp）
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

3) 允许所有群但必须 mention（显式）
```json5
{
  channels: {
    whatsapp: {
      groups: { "*": { requireMention: true } }
    }
  }
}
```

4) 仅 owner 可在群中触发（WhatsApp）
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
群 owner 可切换每个群的激活模式：
- `/activation mention`
- `/activation always`

Owner 由 `channels.whatsapp.allowFrom` 决定（未设置时使用机器人自身 E.164）。请以独立消息发送该命令。其他平台目前忽略 `/activation`。

## Context fields
群入站 payload 会设置：
- `ChatType=group`
- `GroupSubject`（若已知）
- `GroupMembers`（若已知）
- `WasMentioned`（mention gating 结果）
- Telegram forum 话题还包含 `MessageThreadId` 与 `IsForum`。

Agent system prompt 在新群会话首回合会包含一段群聊提示，提醒模型以真人口吻回复，避免 Markdown 表格，并避免输出字面 `\n` 序列。

## iMessage 特性
- 路由或 allowlist 时优先使用 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群回复始终回到同一 `chat_id`。

## WhatsApp 特性
WhatsApp 专有行为（历史注入、mention 处理细节）见 [Group messages](/zh/concepts/group-messages)。
