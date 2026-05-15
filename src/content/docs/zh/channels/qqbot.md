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

状态：可下载插件。支持私信、群聊、频道消息以及媒体。不支持表情回应和串接。

## 安装

在设置之前安装 QQ 机器人：

```bash
openclaw plugins install @openclaw/qqbot
```

## Setup

1. 前往 [QQ 开放平台](https://q.qq.com/) 并使用手机 QQ 扫描二维码以注册 / 登录。
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

Env SecretRef AppSecret：

```json5
{
  channels: {
    qqbot: {
      enabled: true,
      appId: "YOUR_APP_ID",
      clientSecret: { source: "env", provider: "default", id: "QQBOT_CLIENT_SECRET" },
    },
  },
}
```

说明：

- Env 回退仅适用于默认的 QQ 机器人账户。
- `openclaw channels add --channel qqbot --token-file ...` 仅提供 AppSecret；AppID 必须已在配置或 `QQBOT_APP_ID` 中设置。
- `clientSecret` 也接受 SecretRef 输入，而不仅仅是纯文本字符串。
- 旧版 `secretref:/...` 标记字符串不是有效的 `clientSecret` 值；
  请使用结构化的 SecretRef 对象，如上面的示例所示。

### 多账户设置

在单个 OpenClaw 实例下运行多个 QQ 机器人：

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

通过 CLI 添加第二个机器人：

```bash
openclaw channels add --channel qqbot --account bot2 --token "222222222:secret-of-bot-2"
```

### 群聊

QQ 机器人群聊支持使用 QQ 群 OpenID，而不是显示名称。将机器人
添加到群组，然后提及它或将群组配置为无需提及即可运行。

```json5
{
  channels: {
    qqbot: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["member_openid"],
      groups: {
        "*": {
          requireMention: true,
          historyLimit: 50,
          toolPolicy: "restricted",
        },
        GROUP_OPENID: {
          name: "Release room",
          requireMention: false,
          ignoreOtherMentions: true,
          historyLimit: 20,
          prompt: "Keep replies short and operational.",
        },
      },
    },
  },
}
```

`groups["*"]` 为每个群组设置默认值，而具体的
`groups.GROUP_OPENID` 条目会覆盖单个群组的默认值。群组
设置包括：

- `requireMention`：机器人回复前需要 @提及。默认值：`true`。
- `ignoreOtherMentions`：丢弃提及其他人但不提及机器人的消息。
- `historyLimit`：将最近的非提及群组消息保留为下一次提及轮次的上下文。设置 `0` 以禁用。
- `toolPolicy`：用于群组范围工具的 `full`、`restricted` 或 `none`。
- `name`：在日志和群组上下文中使用的友好标签。
- `prompt`：附加到代理上下文的每个群组行为提示词。

激活模式为 `mention` 和 `always`。`requireMention: true` 映射到
`mention`；`requireMention: false` 映射到 `always`。如果存在会话级激活
覆盖，则优先于配置。

入站队列是针对每个对等方的。群组对等方获得更大的队列上限，并在队列满时将人类消息保留在机器人生成的聊天之前，并将 bursts 的正常群组合并到一个归属轮次中。斜杠命令仍然逐一运行。

### 语音 (STT / TTS)

STT 和 TTS 支持具有优先级回退的两级配置：

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
        "qq-main": {
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

在任一选项上设置 `enabled: false` 以禁用。
账号级 TTS 覆盖使用与 `messages.tts` 相同的形状，并与渠道/全局 TTS 配置进行深度合并。

传入的 QQ 语音附件作为音频媒体元数据暴露给代理，同时
将原始语音文件排除在通用 `MediaPaths` 之外。`[[audio_as_voice]]` 纯
文本回复会在配置 TTS 时合成 TTS 并发送原生 QQ 语音消息。

出站音频上传/转码行为也可以通过
`channels.qqbot.audioFormatPolicy` 进行调整：

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
> 用于通过机器人 B 发送消息。

## 斜杠命令

在 AI 队列之前截获的内置命令：

| 命令           | 描述                                                                        |
| -------------- | --------------------------------------------------------------------------- |
| `/bot-ping`    | 延迟测试                                                                    |
| `/bot-version` | 显示 OpenClaw 框架版本                                                      |
| `/bot-help`    | 列出所有命令                                                                |
| `/bot-me`      | 显示发送者的 QQ 用户 ID (openid) 以便进行 `allowFrom`/`groupAllowFrom` 设置 |
| `/bot-upgrade` | 显示 QQBot 升级指南链接                                                     |
| `/bot-logs`    | 将最近的网关日志导出为文件                                                  |
| `/bot-approve` | 通过原生流程批准待处理的 QQ Bot 操作（例如，确认 C2C 或群组上传）。         |

在任何命令后附加 `?` 以获取使用帮助（例如 `/bot-upgrade ?`）。

管理员命令（`/bot-me`、`/bot-upgrade`、`/bot-logs`、`/bot-clear-storage`、`/bot-streaming`、`/bot-approve`）仅限私信使用，并且要求发送者的 openid 位于明确的非通配符 `allowFrom` 列表中。通配符 `allowFrom: ["*"]` 允许聊天但不授予管理员命令访问权限。群组消息首先匹配 `groupAllowFrom`，然后回退到 `allowFrom`。在群组中运行管理员命令会返回提示，而不是静默丢弃。

## 引擎架构

QQ Bot 作为插件内的独立引擎提供：

- 每个账户拥有一个以 `appId` 为键的独立资源堆栈（WebSocket 连接、API 客户端、令牌缓存、媒体存储根目录）。账户从不共享入站/出站状态。
- 多账户记录器使用拥有账户标记日志行，因此当您在一个网关下运行多个机器人时，诊断信息保持可分离。
- 入站、出站和网关桥接路径在 `~/.openclaw/media` 下共享单个媒体负载根目录，因此上传、下载和转码缓存都落在一个受保护的目录下，而不是每个子系统的树结构中。
- 富媒体传递通过一条 `sendMedia` 路径用于 C2C 和群组目标。超过大文件阈值的本地文件和缓冲区使用 QQ 的分块上传端点，而较小的负载使用一次性媒体 API。
- 凭据可以作为标准 OpenClaw 凭据快照的一部分进行备份和还原；引擎在还原时会重新附加每个账户的资源堆栈，而无需重新进行二维码配对。

## 二维码新手引导

除了手动粘贴 `AppID:AppSecret`OpenClaw 之外，引擎还支持二维码新手引导流程，用于将 QQ 机器人连接到 OpenClaw：

1. 运行 QQ 机器人设置路径（例如 `openclaw channels add --channel qqbot`）并在提示时选择二维码流程。
2. 使用与目标 QQ 机器人绑定的手机应用扫描生成的二维码。
3. 在手机上批准配对。OpenClaw 会将返回的凭据持久化到相应账户作用域下的 OpenClaw`credentials/` 中。

由机器人本身生成的批准提示（例如，QQ 机器人 API 暴露的“允许此操作？”流程）会显示为原生的 OpenClaw 提示，您可以使用 APIOpenClaw`/bot-approve` 接受，而无需通过原始 QQ 客户端回复。

## 故障排除

- **机器人回复“gone to Mars”：** 未配置凭据或 Gateway(网关) 未启动。
- **没有收到传入消息：** 验证 `appId` 和 `clientSecret` 是否正确，以及
  机器人是否在 QQ 开放平台上已启用。
- **重复的自我回复：** OpenClaw 将 QQ 出站引用索引记录为
  机器人发送，并忽略当前 OpenClaw`msgIdx` 与
  该机器人账户相同的入站事件。这可以防止平台回声循环，同时仍然允许用户
  引用或回复之前的机器人消息。
- **使用 `--token-file` 设置仍显示未配置：** `--token-file` 仅设置
  AppSecret。您仍然需要在配置中设置 `appId` 或设置 `QQBOT_APP_ID`。
- **主动消息未到达：** 如果
  用户最近没有进行交互，QQ 可能会拦截机器人发起的消息。
- **语音未转录：** 确保 STT 已配置且提供商可达。

## 相关

- [配对](/zh/channels/pairing)
- [群组](/zh/channels/groups)
- [通道故障排除](/zh/channels/troubleshooting)
