---
summary: "Bot-to-bot loop protection defaults and 渠道 overrides"
read_when:
  - Configuring bot-authored channel messages
  - Tuning bot-to-bot loop protection
title: "Bot loop protection"
sidebarTitle: "Bot loop protection"
---

# Bot loop protection

OpenClaw can accept messages written by other bots on channels that support `allowBots`.
When that path is enabled, pair loop protection prevents two bot identities from
replying to each other indefinitely.

该保护措施由核心入站回复运行器强制执行。每个支持的渠道将其入站事件映射为通用事实：账户或范围、对话ID、发送方机器人ID和接收方机器人ID。核心随后双向跟踪参与者对，应用滑动窗口预算，并在预算超限后的冷却期间抑制该对。

## Defaults

Pair loop protection is active when a 渠道 lets bot-authored messages reach
dispatch. Built-in defaults are:

- `maxEventsPerWindow: 20` - a bot pair can exchange 20 events within the window
- `windowSeconds: 60` - sliding window length
- `cooldownSeconds: 60` - suppression time after the pair exceeds the budget

The guard does not affect normal human-authored messages, single-bot deployments,
self-message filtering, or one-shot bot replies that stay under the budget.

## Configure shared defaults

Set `channels.defaults.botLoopProtection` once to give every supporting 渠道
the same baseline. Channel and account overrides can still tune individual
surfaces.

```json5
{
  channels: {
    defaults: {
      botLoopProtection: {
        maxEventsPerWindow: 20,
        windowSeconds: 60,
        cooldownSeconds: 60,
      },
    },
  },
}
```

Set `enabled: false` only when your 渠道 policy intentionally allows
bot-to-bot conversations without automatic suppression.

## Override per 渠道 or account

Supporting channels layer their own config over the shared default. Precedence is:

- `channels.<channel>.<room-or-space>.botLoopProtection`, when the 渠道 supports per-conversation overrides
- `channels.<channel>.accounts.<account>.botLoopProtection`, when the 渠道 supports accounts
- `channels.<channel>.botLoopProtection`, when the 渠道 supports top-level defaults
- `channels.defaults.botLoopProtection`
- built-in defaults

```json5
{
  channels: {
    defaults: {
      botLoopProtection: {
        maxEventsPerWindow: 20,
      },
    },
    discord: {
      botLoopProtection: {
        maxEventsPerWindow: 8,
      },
      accounts: {
        molty: {
          allowBots: "mentions",
          botLoopProtection: {
            maxEventsPerWindow: 5,
            cooldownSeconds: 90,
          },
        },
      },
    },
    slack: {
      allowBots: "mentions",
      botLoopProtection: {
        maxEventsPerWindow: 8,
      },
    },
    matrix: {
      allowBots: "mentions",
      groups: {
        "!roomid:example.org": {
          botLoopProtection: {
            maxEventsPerWindow: 5,
          },
        },
      },
    },
    googlechat: {
      allowBots: true,
      groups: {
        "spaces/AAAA": {
          botLoopProtection: {
            maxEventsPerWindow: 5,
          },
        },
      },
    },
  },
}
```

## Channel support

- Discord：原生 Discord`author.bot`Discord 事实，按 Discord 账户、渠道和机器人对进行键控。
- Slack：针对已接受的机器人编写消息的原生 Slack`bot_id`Slack 事实，按 Slack 账户、渠道和机器人对进行键控。
- Matrix：已配置的 Matrix 机器人账户，按 Matrix 账户、房间和已配置的机器人对进行键控。
- Google Chat：针对已接受的机器人编写消息的原生 Google Chat`sender.type=BOT` 事实，按账户、空间和机器人对进行键控。

那些无法提供可靠入站机器人身份的渠道将继续使用其正常的自消息和访问策略过滤器。在它们能够识别机器人对中的两个参与者之前，不应选择启用此防护。

有关插件实现的详细信息，请参阅 [SDK 运行时](/zh/plugins/sdk-runtime#reusable-runtime-utilities)。
