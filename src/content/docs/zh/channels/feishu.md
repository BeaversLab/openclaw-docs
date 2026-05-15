---
summary: "飞书机器人概览、功能和配置"
read_when:
  - You want to connect a Feishu/Lark bot
  - You are configuring the Feishu channel
title: Feishu
---

Feishu/Lark 是一个一站式协作平台，团队可以在其中聊天、共享文档、管理日历并协同完成工作。

**状态：** 机器人私信 + 群聊已可用于生产环境。WebSocket 是默认模式；webhook 模式为可选。

---

## 快速开始

<Note>需要 OpenClaw 2026.4.25 或更高版本。运行 `openclaw --version` 进行检查。使用 `openclaw update` 升级。</Note>

<Steps>
  <Step title="运行渠道设置向导">```bash openclaw channels login --channel feishu ``` 使用您的 Feishu/Lark 手机应用扫描二维码以自动创建 Feishu/Lark 机器人。</Step>

  <Step title="设置完成后，重启网关以应用更改">```bash openclaw gateway restart ```</Step>
</Steps>

---

## 访问控制

### 私信

配置 `dmPolicy` 以控制谁可以向机器人发送私信：

- `"pairing"` - 未知用户会收到配对码；通过 CLI 批准
- `"allowlist"` - 只有 `allowFrom` 中列出的用户可以聊天（默认：仅机器人所有者）
- `"open"` - 仅当 `allowFrom` 包含 `"*"` 时才允许公开私信；如果有限制性条目，则只有匹配的用户可以聊天
- `"disabled"` - 禁用所有私信

**批准配对请求：**

```bash
openclaw pairing list feishu
openclaw pairing approve feishu <CODE>
```

### 群聊

**群组策略** (`channels.feishu.groupPolicy`)：

| 值            | 行为                                                                     |
| ------------- | ------------------------------------------------------------------------ |
| `"open"`      | 响应群组中的所有消息                                                     |
| `"allowlist"` | 仅响应 `groupAllowFrom` 中的群组或在 `groups.<chat_id>` 下明确配置的群组 |
| `"disabled"`  | 禁用所有群组消息；明确的 `groups.<chat_id>` 条目不会覆盖此项             |

默认值：`allowlist`

**提及要求** (`channels.feishu.requireMention`)：

- `true` - 需要 @提及（默认）
- `false` - 无需 @提及 即可响应
- 按群组覆盖：`channels.feishu.groups.<chat_id>.requireMention`
- 仅 `@all` 和 `@_all` 不被视为机器人提及。如果一条消息同时提及了 `@all` 和直接提及机器人，仍然算作机器人提及。

---

## 群组配置示例

### 允许所有群组，不需要 @提及

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
    },
  },
}
```

### 允许所有群组，仍需 @提及

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
      requireMention: true,
    },
  },
}
```

### 仅允许特定群组

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      // Group IDs look like: oc_xxx
      groupAllowFrom: ["oc_xxx", "oc_yyy"],
    },
  },
}
```

在 `allowlist` 模式下，您还可以通过添加显式的 `groups.<chat_id>` 条目来允许一个群组。显式条目不会覆盖 `groupPolicy: "disabled"`。`groups.*` 下的通配符默认值配置匹配的群组，但它们本身不能用于允许群组。

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groups: {
        oc_xxx: {
          requireMention: false,
        },
      },
    },
  },
}
```

### 限制群组内的发送者

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["oc_xxx"],
      groups: {
        oc_xxx: {
          // User open_ids look like: ou_xxx
          allowFrom: ["ou_user1", "ou_user2"],
        },
      },
    },
  },
}
```

---

<a id="get-groupuser-ids"></a>

## 获取群组/用户 ID

### 群组 ID (`chat_id`，格式：`oc_xxx`)

在飞书/Lark 中打开群组，点击右上角的菜单图标，然后进入 **设置**。群组 ID (`chat_id`) 会列在设置页面上。

![获取群组 ID](/images/feishu-get-group-id.png)

### 用户 ID (`open_id`，格式：`ou_xxx`)

启动网关，向机器人发送一条私信，然后检查日志：

```bash
openclaw logs --follow
```

在日志输出中查找 `open_id`。您也可以检查待处理的配对请求：

```bash
openclaw pairing list feishu
```

---

## 常用命令

| 命令      | 描述               |
| --------- | ------------------ |
| `/status` | 显示机器人状态     |
| `/reset`  | 重置当前会话       |
| `/model`  | 显示或切换 AI 模型 |

<Note>飞书/Lark 不支持原生斜杠命令菜单，因此请将这些作为纯文本消息发送。</Note>

---

## 故障排除

### 机器人在群聊中无响应

1. 确保机器人已添加到群组中
2. 确保您 @提及 了机器人（默认情况下需要）
3. 验证 `groupPolicy` 未设置为 `"disabled"`
4. 检查日志：`openclaw logs --follow`

### 机器人未收到消息

1. 确保机器人已在飞书开放平台 / Lark Developer 中发布并审核通过
2. 确保事件订阅包含 `im.message.receive_v1`
3. 确保选择了 **持久连接** (WebSocket)
4. 确保已授予所有必需的权限范围
5. 确保网关正在运行：`openclaw gateway status`
6. 检查日志：`openclaw logs --follow`

### App Secret 泄露

1. 在飞书开放平台 / Lark Developer 中重置 App Secret
2. 更新配置中的值
3. 重启网关：`openclaw gateway restart`

---

## 高级配置

### 多个账户

```json5
{
  channels: {
    feishu: {
      defaultAccount: "main",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          name: "Primary bot",
          tts: {
            providers: {
              openai: { voice: "shimmer" },
            },
          },
        },
        backup: {
          appId: "cli_yyy",
          appSecret: "yyy",
          name: "Backup bot",
          enabled: false,
        },
      },
    },
  },
}
```

`defaultAccount` 控制当出站 API 未指定 `accountId` 时使用哪个账户。
`accounts.<id>.tts` 使用与 `messages.tts` 相同的结构，并与全局
TTS 配置进行深度合并，因此多机器人飞书设置可以在全局保留共享提供商
凭证，同时每个账户仅覆盖语音、模型、人设或自动模式。

### 消息限制

- `textChunkLimit` - 出站文本块大小（默认：`2000` 字符）
- `mediaMaxMb` - 媒体上传/下载限制（默认：`30` MB）

### 流式传输

Feishu/Lark 支持通过交互式卡片进行流式回复。启用后，机器人会在生成文本时实时更新卡片。

```json5
{
  channels: {
    feishu: {
      streaming: true, // enable streaming card output (default: true)
      blockStreaming: true, // opt into completed-block streaming
    },
  },
}
```

设置 `streaming: false` 以在一条消息中发送完整回复。`blockStreaming` 默认为关闭；仅当您希望在最终回复之前刷新已完成的助手块时才启用它。

### 配额优化

使用两个可选标志减少 Feishu/Lark API 调用次数：

- `typingIndicator`（默认 `true`）：设置 `false` 以跳过正在输入的反应调用
- `resolveSenderNames`（默认 `true`）：设置 `false` 以跳过发送者资料查找

```json5
{
  channels: {
    feishu: {
      typingIndicator: false,
      resolveSenderNames: false,
    },
  },
}
```

### ACP 会话

Feishu/Lark 支持私信和群组线程消息的 ACP。Feishu/Lark ACP 由文本命令驱动——没有原生的斜杠命令菜单，因此请直接在对话中使用 `/acp ...` 消息。

#### 持久 ACP 绑定

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "feishu",
        accountId: "default",
        peer: { kind: "direct", id: "ou_1234567890" },
      },
    },
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "feishu",
        accountId: "default",
        peer: { kind: "group", id: "oc_group_chat:topic:om_topic_root" },
      },
      acp: { label: "codex-feishu-topic" },
    },
  ],
}
```

#### 从聊天生成 ACP

在 Feishu/Lark 私信或线程中：

```text
/acp spawn codex --thread here
```

`--thread here` 适用于私信和 Feishu/Lark 线程消息。绑定对话中的后续消息直接路由到该 ACP 会话。

### 多智能体路由

使用 `bindings` 将 Feishu/Lark 私信或群组路由到不同的代理。

```json5
{
  agents: {
    list: [{ id: "main" }, { id: "agent-a", workspace: "/home/user/agent-a" }, { id: "agent-b", workspace: "/home/user/agent-b" }],
  },
  bindings: [
    {
      agentId: "agent-a",
      match: {
        channel: "feishu",
        peer: { kind: "direct", id: "ou_xxx" },
      },
    },
    {
      agentId: "agent-b",
      match: {
        channel: "feishu",
        peer: { kind: "group", id: "oc_zzz" },
      },
    },
  ],
}
```

路由字段：

- `match.channel`：`"feishu"`
- `match.peer.kind`：`"direct"`（私信）或 `"group"`（群聊）
- `match.peer.id`：用户 Open ID（`ou_xxx`）或群组 ID（`oc_xxx`）

有关查找提示，请参阅 [获取群组/用户 ID](#get-groupuser-ids)。

---

## 配置参考

完整配置：[Gateway(网关) 配置](/zh/gateway/configuration)

| 设置                                              | 描述                                                                             | 默认值           |
| ------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------- |
| `channels.feishu.enabled`                         | 启用/禁用渠道                                                                    | `true`           |
| `channels.feishu.domain`                          | API 域名（`feishu` 或 `lark`）                                                   | `feishu`         |
| `channels.feishu.connectionMode`                  | 事件传输（`websocket` 或 `webhook`）                                             | `websocket`      |
| `channels.feishu.defaultAccount`                  | 出站路由的默认账号                                                               | `default`        |
| `channels.feishu.verificationToken`               | Webhook 模式必需                                                                 | -                |
| `channels.feishu.encryptKey`                      | Webhook 模式必需                                                                 | -                |
| `channels.feishu.webhookPath`                     | Webhook 路由路径                                                                 | `/feishu/events` |
| `channels.feishu.webhookHost`                     | Webhook 绑定主机                                                                 | `127.0.0.1`      |
| `channels.feishu.webhookPort`                     | Webhook 绑定端口                                                                 | `3000`           |
| `channels.feishu.accounts.<id>.appId`             | App ID                                                                           | -                |
| `channels.feishu.accounts.<id>.appSecret`         | App Secret                                                                       | -                |
| `channels.feishu.accounts.<id>.domain`            | 按账号覆盖域名                                                                   | `feishu`         |
| `channels.feishu.accounts.<id>.tts`               | 按账号覆盖 TTS                                                                   | `messages.tts`   |
| `channels.feishu.dmPolicy`                        | 私信策略                                                                         | `allowlist`      |
| `channels.feishu.allowFrom`                       | 私信白名单 (open_id 列表)                                                        | [BotOwnerId]     |
| `channels.feishu.groupPolicy`                     | 群组策略                                                                         | `allowlist`      |
| `channels.feishu.groupAllowFrom`                  | 群组白名单                                                                       | -                |
| `channels.feishu.requireMention`                  | 群组中需要 @提及                                                                 | `true`           |
| `channels.feishu.groups.<chat_id>.requireMention` | Per-group @mention override; explicit IDs also admit the group in allowlist mode | inherited        |
| `channels.feishu.groups.<chat_id>.enabled`        | 启用/禁用特定群组                                                                | `true`           |
| `channels.feishu.textChunkLimit`                  | 消息分块大小                                                                     | `2000`           |
| `channels.feishu.mediaMaxMb`                      | 媒体大小限制                                                                     | `30`             |
| `channels.feishu.streaming`                       | 流式卡片输出                                                                     | `true`           |
| `channels.feishu.blockStreaming`                  | Completed-block reply streaming                                                  | `false`          |
| `channels.feishu.typingIndicator`                 | 发送正在输入反应                                                                 | `true`           |
| `channels.feishu.resolveSenderNames`              | 解析发送者显示名称                                                               | `true`           |

---

## 支持的消息类型

### 接收

- ✅ 文本
- ✅ 富文本（帖子）
- ✅ 图片
- ✅ 文件
- ✅ 音频
- ✅ 视频/媒体
- ✅ 表情包

Inbound Feishu/Lark audio messages are normalized as media placeholders instead
of raw `file_key` JSON. When `tools.media.audio`OpenClaw is configured, OpenClaw
downloads the voice-note resource and runs shared audio transcription before the
agent turn, so the agent receives the spoken transcript. If Feishu includes
transcript text directly in the audio payload, that text is used without another
ASR call. Without an audio transcription 提供商, the agent still receives a
`<media:audio>` placeholder plus the saved attachment, not the raw Feishu
resource payload.

### 发送

- ✅ 文本
- ✅ 图片
- ✅ 文件
- ✅ 音频
- ✅ 视频/媒体
- ✅ 交互式卡片（包括流式更新）
- ⚠️ 富文本（帖子样式格式；不支持完整的飞书/Lark 创作功能）

飞书/Lark 原生语音气泡使用飞书 `audio` 消息类型，并且需要
Ogg/Opus 上传媒体（`file_type: "opus"`）。现有的 `.opus` 和 `.ogg` 媒体
将直接作为原生音频发送。MP3/WAV/M4A 和其他可能的音频格式
仅当回复请求语音投递（`audioAsVoice` / 消息工具 `asVoice`，包括 TTS 语音笔记
回复）时，才会通过 `ffmpeg` 转码为 48kHz Ogg/Opus。普通的 MP3 附件仍为常规文件。如果 `ffmpeg`OpenClaw 缺失或
转换失败，OpenClaw 将回退到文件附件并记录原因。

### 主题和回复

- ✅ 内联回复
- ✅ 主题回复
- ✅ 在回复主题消息时，媒体回复会保持线程感知能力

对于 `groupSessionScope: "group_topic"` 和 `"group_topic_sender"`，原生
飞书/Lark 话题组使用事件 `thread_id` (`omt_*`) 作为规范
话题会话密钥。如果原生话题发起事件省略了 `thread_id`OpenClawOpenClaw，OpenClaw
会在路由该轮次之前从飞书补充它。OpenClaw 转换为话题的普通群组回复继续使用回复根消息 ID (`om_*`)，以便
第一轮和后续轮次保持在同一会话中。

---

## 相关

- [Channels Overview](/zh/channels) - 所有支持的渠道
- [Pairing](/zh/channels/pairing) - 私信认证和配对流程
- [Groups](/zh/channels/groups) - 群聊行为和提及门控
- [Channel Routing](/zh/channels/channel-routing) - 消息的会话路由
- [Security](/zh/gateway/security) - 访问模型和加固
