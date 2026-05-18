---
summary: "Bot-to-bot loop protection defaults and channel overrides"
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

The guard is enforced by the core channel-turn kernel. Each supporting channel
maps its own inbound event into generic facts: account or scope, conversation id,
sender bot id, and receiver bot id. Core then tracks the participant pair in both
directions, applies a sliding-window budget, and suppresses the pair during a
cooldown after the budget is exceeded.

## Defaults

Pair loop protection is active when a channel lets bot-authored messages reach
dispatch. Built-in defaults are:

- `maxEventsPerWindow: 20` - a bot pair can exchange 20 events within the window
- `windowSeconds: 60` - sliding window length
- `cooldownSeconds: 60` - suppression time after the pair exceeds the budget

The guard does not affect normal human-authored messages, single-bot deployments,
self-message filtering, or one-shot bot replies that stay under the budget.

## Configure shared defaults

Set `channels.defaults.botLoopProtection` once to give every supporting channel
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

Set `enabled: false` only when your channel policy intentionally allows
bot-to-bot conversations without automatic suppression.

## Override per channel or account

Supporting channels layer their own config over the shared default. Precedence is:

- `channels.<channel>.<room-or-space>.botLoopProtection`, when the channel supports per-conversation overrides
- `channels.<channel>.accounts.<account>.botLoopProtection`, when the channel supports accounts
- `channels.<channel>.botLoopProtection`, when the channel supports top-level defaults
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

- Discord: native `author.bot` facts, keyed by Discord account, channel, and bot pair.
- Slack：針對接受的 Bot 建立訊息的原生 `bot_id` 事實，以 Slack 帳戶、頻道和 Bot 配對為鍵值。
- Matrix：已配置的 Matrix Bot 帳戶，以 Matrix 帳戶、房間和配置的 Bot 配對為鍵值。
- Google Chat：針對接受的 Bot 建立訊息的原生 `sender.type=BOT` 事實，以帳戶、空間和 Bot 配對為鍵值。

無法公開可靠輸入 Bot 身分的頻道會繼續使用其正常的自我訊息與存取原則過濾器。在它們能夠識別 Bot 配對中的兩個參與者之前，不應選擇加入此防護機制。

請參閱 [SDK 執行時期](/zh-Hant/plugins/sdk-runtime#reusable-runtime-utilities) 以了解外掛程式的實作細節。
