---
summary: "QQ 机器人设置、配置和使用"
read_when:
  - You want to connect OpenClaw to QQ
  - You need QQ Bot credential setup
  - You want QQ Bot group or private chat support
title: QQ 机器人
---

# QQ 机器人

QQ 机器人通过官方 QQ 机器人 API (WebSocket Gateway) 连接到 OpenClaw。该
插件支持 C2C 私聊、群 @消息 和频道消息，并支持
富媒体（图片、语音、视频、文件）。

状态：内置插件。支持私信、群聊、频道和媒体。不支持表情回应和话题串。

## 内置插件

当前的 OpenClaw 发行版已内置 QQ Bot，因此正常的打包构建不需要单独的 `openclaw plugins install` 步骤。

## 设置

1. 前往 [QQ 开放平台](https://q.qq.com/) 并使用手机 QQ 扫描二维码以注册 / 登录。
2. 点击 **创建机器人** 以创建一个新的 QQ 机器人。
3. 在机器人的设置页面找到 **AppID** 和 **AppSecret** 并复制它们。

> AppSecret 不会以明文存储 —— 如果您离开页面前未保存它，
> 您将不得不重新生成一个新的。

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

## 配置

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

默认账号环境变量：

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

说明：

- 环境变量回退仅适用于默认的 QQ 机器人账号。
- `openclaw channels add --channel qqbot --token-file ...` 仅提供
  AppSecret；AppID 必须已在配置或 `QQBOT_APP_ID` 中设置。
- `clientSecret` 也接受 SecretRef 输入，而不仅仅是明文字符串。

### 多账号设置

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

每个账号启动自己的 WebSocket 连接并维护独立的
令牌缓存（按 `appId` 隔离）。

通过 CLI 添加第二个机器人：

```bash
openclaw channels add --channel qqbot --account bot2 --token "222222222:secret-of-bot-2"
```

### 语音 (STT / TTS)

STT 和 TTS 支持具有优先级回退的两级配置：

| 设置 | 插件特定             | 框架回退                      |
| ---- | -------------------- | ----------------------------- |
| STT  | `channels.qqbot.stt` | `tools.media.audio.models[0]` |
| TTS  | `channels.qqbot.tts` | `messages.tts`                |

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
    },
  },
}
```

在任一选项上设置 `enabled: false` 以禁用。

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

- 每个帐户拥有一个以 `appId` 为键的隔离资源堆栈（WebSocket 连接、API 客户端、令牌缓存、媒体存储根目录）。帐户从不共享入站/出站状态。
- 多帐户记录器使用拥有帐户标记日志行，因此当您在一个网关下运行多个机器人时，诊断信息保持可分离。
- 入站、出站和网关桥接路径在 `~/.openclaw/media` 下共享一个单一的媒体负载根目录，因此上传、下载和转码缓存落地于一个受保护的目录下，而不是每个子系统的树状结构中。
- 凭据可以作为标准 OpenClaw 凭据快照的一部分进行备份和恢复；引擎在恢复时会重新附加每个帐户的资源堆栈，而无需重新进行二维码配对。

## 二维码新手引导

作为手动粘贴 `AppID:AppSecret` 的替代方案，该引擎支持二维码新手引导流程，用于将 QQ Bot 链接到 OpenClaw：

1. 运行 QQ Bot 设置路径（例如 `openclaw channels add --channel qqbot`）并在提示时选择二维码流程。
2. 使用与目标 QQ Bot 关联的手机应用程序扫描生成的二维码。
3. 在手机上批准配对。OpenClaw 将返回的凭据持久化到正确帐户作用域下的 `credentials/` 中。

由机器人本身生成的批准提示（例如，由 QQ Bot API 公开的“允许此操作？”流程）作为原生 OpenClaw 提示显示，您可以使用 `/bot-approve` 接受，而不是通过原始 QQ 客户端回复。

## 故障排除

- **Bot 回复“gone to Mars”：** 未配置凭据或 Gateway(网关)未启动。
- **没有入站消息：** 验证 `appId` 和 `clientSecret` 是否正确，并且
  在 QQ 开放平台上启用了该机器人。
- **使用 `--token-file` 设置仍显示未配置：** `--token-file` 仅设置
  AppSecret。您仍需在配置中添加 `appId` 或 `QQBOT_APP_ID`。
- **主动消息未送达：** 如果
  用户最近没有进行互动，QQ 可能会拦截机器人发起的消息。
- **语音未转录：** 请确保已配置 STT 并且提供商 可达。
