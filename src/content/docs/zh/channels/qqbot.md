---
summary: "QQ 机器人设置、配置和使用"
read_when:
  - You want to connect OpenClaw to QQ
  - You need QQ Bot credential setup
  - You want QQ Bot group or private chat support
title: QQ bot
---

QQ Bot 通过官方 QQ Bot OpenClaw (WebSocket gateway) 连接到 API。
该插件支持 C2C 私聊、群 @消息以及频道消息，包含富媒体（图片、语音、视频、文件）。

状态：内置插件。支持私信、群聊、频道和媒体。不支持表情回应（Reactions）和话题串（threads）。

## 内置插件

当前的 OpenClaw 版本已捆绑 QQ Bot，因此常规打包版本不需要单独的 `openclaw plugins install` 步骤。

## Setup

1. 前往 [QQ Open Platform](https://q.qq.com/) 并使用手机 QQ 扫描二维码以注册 / 登录。
2. 点击 **Create Bot** 以创建一个新的 QQ bot。
3. 在机器人设置页面找到 **AppID** 和 **AppSecret** 并将其复制。

> AppSecret 不会以明文形式存储 —— 如果您在未保存的情况下离开页面，
> 您将必须重新生成一个新的。

4. 添加渠道：

```bash
openclaw channels add --channel qqbot --token "AppID:AppSecret"
```

5. 重启 Gateway(网关)。

交互式设置路径：

```bash
openclaw channels add
openclaw configure --section channels
```

## Configure

最小配置：

```json5
{
  channels: {
    qqbot: {
      enabled: true,
      appId: "YOUR_APP_ID",
      clientSecret: "YOUR_APP_SECRET",
    },
  },
}
```

默认账户环境变量：

- `QQBOT_APP_ID`
- `QQBOT_CLIENT_SECRET`

文件支持的 AppSecret：

```json5
{
  channels: {
    qqbot: {
      enabled: true,
      appId: "YOUR_APP_ID",
      clientSecretFile: "/path/to/qqbot-secret.txt",
    },
  },
}
```

注：

- 环境变量回退仅适用于默认的 QQ Bot 账户。
- `openclaw channels add --channel qqbot --token-file ...` 仅提供
  AppSecret；AppID 必须已在配置或 `QQBOT_APP_ID` 中设置。
- `clientSecret` 也接受 SecretRef 输入，而不仅仅是明文字符串。

### Multi-account setup

在单个 OpenClaw 实例下运行多个 QQ bot：

```json5
{
  channels: {
    qqbot: {
      enabled: true,
      appId: "111111111",
      clientSecret: "secret-of-bot-1",
      accounts: {
        bot2: {
          enabled: true,
          appId: "222222222",
          clientSecret: "secret-of-bot-2",
        },
      },
    },
  },
}
```

每个账户启动自己的 WebSocket 连接并维护独立的
token 缓存（按 `appId` 隔离）。

通过 CLI 添加第二个 bot：

```bash
openclaw channels add --channel qqbot --account bot2 --token "222222222:secret-of-bot-2"
```

### Voice (STT / TTS)

STT 和 TTS 支持两层配置，并具有优先级回退机制：

| 设置 | 插件特定                                                 | 框架回退                      |
| ---- | -------------------------------------------------------- | ----------------------------- |
| STT  | `channels.qqbot.stt`                                     | `tools.media.audio.models[0]` |
| TTS  | `channels.qqbot.tts`, `channels.qqbot.accounts.<id>.tts` | `messages.tts`                |

```json5
{
  channels: {
    qqbot: {
      stt: {
        provider: "your-provider",
        model: "your-stt-model",
      },
      tts: {
        provider: "your-provider",
        model: "your-tts-model",
        voice: "your-voice",
      },
      accounts: {
        qq-main: {
          tts: {
            providers: {
              openai: { voice: "shimmer" },
            },
          },
        },
      },
    },
  },
}
```

在任一项上设置 `enabled: false` 即可禁用。
账户级别的 TTS 覆盖使用与 `messages.tts` 相同的形状，并与渠道/全局 TTS 配置进行深度合并。

传入的 QQ 语音附件作为音频媒体元数据暴露给代理，同时将原始语音文件排除在通用 `MediaPaths` 之外。当配置了 TTS 时，`[[audio_as_voice]]` 纯文本回复会合成 TTS 并发送原生的 QQ 语音消息。

传出音频的上传/转码行为也可以通过 `channels.qqbot.audioFormatPolicy` 进行调整：

- `sttDirectFormats`
- `uploadDirectFormats`
- `transcodeEnabled`

## 目标格式

| 格式                       | 描述         |
| -------------------------- | ------------ |
| `qqbot:c2c:OPENID`         | 私聊 (C2C)   |
| `qqbot:group:GROUP_OPENID` | 群聊         |
| `qqbot:channel:CHANNEL_ID` | 频道 (Guild) |

> 每个机器人都有自己的用户 OpenID 集。机器人 A 收到的 OpenID **不能**
> 通过机器人 B 用于发送消息。

## 斜杠命令

在 AI 队列之前拦截的内置命令：

| 命令           | 描述                                                                |
| -------------- | ------------------------------------------------------------------- |
| `/bot-ping`    | 延迟测试                                                            |
| `/bot-version` | 显示 OpenClaw 框架版本                                              |
| `/bot-help`    | 列出所有命令                                                        |
| `/bot-upgrade` | 显示 QQBot 升级指南链接                                             |
| `/bot-logs`    | 将最近的网关日志导出为文件                                          |
| `/bot-approve` | 通过原生流程批准待处理的 QQ Bot 操作（例如，确认 C2C 或群组上传）。 |

在任何命令后附加 `?` 以获取使用帮助（例如 `/bot-upgrade ?`）。

## 引擎架构

QQ Bot 作为插件内部的一个自包含引擎提供：

- 每个账户拥有一个由 `appId` 键控的隔离资源栈（WebSocket 连接、API 客户端、令牌缓存、媒体存储根目录）。账户绝不共享传入/传出状态。
- 多帐户记录器使用拥有帐户标记日志行，因此当您在一个网关下运行多个机器人时，诊断信息保持可分离。
- 传入、传出和网关桥接路径在 `~/.openclaw/media` 下共享一个媒体负载根目录，因此上传、下载和转码缓存都位于一个受保护的目录下，而不是按子系统分树的目录结构中。
- 凭据可以作为标准 OpenClaw 凭据快照的一部分进行备份和恢复；引擎在恢复时会重新附加每个帐户的资源堆栈，而无需重新进行二维码配对。

## 二维码新手引导

作为手动粘贴 `AppID:AppSecret` 的替代方案，引擎支持二维码新手引导流程，用于将 QQ 机器人连接到 OpenClaw：

1. 运行 QQ 机器人设置路径（例如 `openclaw channels add --channel qqbot`）并在提示时选择二维码流程。
2. 使用与目标 QQ Bot 关联的手机应用程序扫描生成的二维码。
3. 在手机上批准配对。OpenClaw 将返回的凭据持久化到相应账户作用域下的 `credentials/` 中。

由机器人本身生成的批准提示（例如，QQ 机器人 API 暴露的“允许此操作？”流程）会显示为原生 OpenClaw 提示，您可以使用 `/bot-approve` 接受，而无需通过原始 QQ 客户端回复。

## 故障排除

- **Bot 回复“gone to Mars”：** 未配置凭据或 Gateway(网关)未启动。
- **没有传入消息：** 验证 `appId` 和 `clientSecret` 是否正确，并且
  机器人在 QQ 开放平台上已启用。
- **重复的自我回复：** OpenClaw 将 QQ 出站引用索引记录为
  机器人作者，并忽略其当前 `msgIdx` 与
  该机器人帐户匹配的入站事件。这可以防止平台回显循环，同时仍允许用户
  引用或回复先前的机器人消息。
- **使用 `--token-file` 设置仍显示未配置：** `--token-file` 仅设置
  AppSecret。您仍然需要在配置中设置 `appId` 或 `QQBOT_APP_ID`。
- **主动消息未到达：** 如果用户最近没有进行交互，QQ 可能会拦截机器人发起的消息。
- **语音未转录：** 确保 STT 已配置并且提供商可达。

## 相关

- [配对](/zh/channels/pairing)
- [群组](/zh/channels/groups)
- [频道故障排除](/zh/channels/troubleshooting)
