---
summary: "Tlon/Urbit 支持状态、能力与配置"
read_when:
  - 开发 Tlon/Urbit 渠道功能
title: "Tlon"
---
# Tlon（插件）

Tlon 是基于 Urbit 的去中心化消息应用。OpenClaw 连接到你的 Urbit ship，
可回复私聊与群聊消息。群聊默认需要 @mention 才回复，并可通过 allowlist 进一步限制。

状态：通过插件支持。支持私聊、群提及、线程回复，以及文本式媒体降级
（URL 附加到 caption）。不支持 reactions、投票与原生媒体上传。

## 需要插件

Tlon 为插件形式，未随核心安装打包。

通过 CLI 安装（npm registry）：

```bash
openclaw plugins install @openclaw/tlon
```

本地检出（从 git 仓库运行时）：

```bash
openclaw plugins install ./extensions/tlon
```

详情：[Plugins](/zh/plugin)

## 设置

1) 安装 Tlon 插件。
2) 准备 ship URL 与登录 code。
3) 配置 `channels.tlon`。
4) 重启 gateway。
5) 私聊 bot 或在群频道中提及它。

最小配置（单账号）：

```json5
{
  channels: {
    tlon: {
      enabled: true,
      ship: "~sampel-palnet",
      url: "https://your-ship-host",
      code: "lidlut-tabwed-pillex-ridrup"
    }
  }
}
```

## 群频道

默认启用自动发现。也可以手动固定频道：

```json5
{
  channels: {
    tlon: {
      groupChannels: [
        "chat/~host-ship/general",
        "chat/~host-ship/support"
      ]
    }
  }
}
```

禁用自动发现：

```json5
{
  channels: {
    tlon: {
      autoDiscoverChannels: false
    }
  }
}
```

## 访问控制

DM allowlist（空 = 允许全部）：

```json5
{
  channels: {
    tlon: {
      dmAllowlist: ["~zod", "~nec"]
    }
  }
}
```

群聊授权（默认限制）：

```json5
{
  channels: {
    tlon: {
      defaultAuthorizedShips: ["~zod"],
      authorization: {
        channelRules: {
          "chat/~host-ship/general": {
            mode: "restricted",
            allowedShips: ["~zod", "~nec"]
          },
          "chat/~host-ship/announcements": {
            mode: "open"
          }
        }
      }
    }
  }
}
```

## 投递目标（CLI/cron）

配合 `openclaw message send` 或 cron 投递使用：

- 私聊：`~sampel-palnet` 或 `dm/~sampel-palnet`
- 群聊：`chat/~host-ship/channel` 或 `group:~host-ship/channel`

## 备注

- 群聊回复需要提及（如 `~your-bot-ship`）。
- 线程回复：若入站消息在线程内，OpenClaw 会在线程内回复。
- 媒体：`sendMedia` 会降级为文本 + URL（无原生上传）。
