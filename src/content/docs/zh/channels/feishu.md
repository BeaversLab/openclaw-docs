---
summary: "飞书机器人概述、功能和配置"
read_when:
  - You want to connect a Feishu/Lark bot
  - You are configuring the Feishu channel
title: Feishu
---

Feishu/Lark 是一个一站式协作平台，团队可以在其中聊天、共享文档、管理日历并协同完成工作。

**状态：** 机器人私信 + 群聊已可用于生产环境。WebSocket 是默认模式；webhook 模式为可选。

---

## 快速开始

<Note>需要 OpenClaw 2026.5.29 或更高版本。运行 `openclaw --version` 进行检查。使用 `openclaw update` 升级。</Note>

<Steps>
  <Step title="运行渠道设置向导">```bash openclaw channels login --channel feishu ``` 选择手动设置以粘贴来自飞书开放平台的 App ID 和 App Secret，或者选择二维码设置以自动创建机器人。如果国内版飞书移动应用无法响应二维码，请重新运行设置并选择手动设置。</Step>

  <Step title="设置完成后，重启网关以应用更改">```bash openclaw gateway restart ```</Step>
</Steps>

---

## 访问控制

### 私信

配置 `dmPolicy` 以控制谁可以给机器人发送 ：

- `"pairing"` - 未知用户会收到配对码；通过 CLI 批准
- `"allowlist"` - 只有 `allowFrom` 中列出的用户可以聊天（默认：仅机器人所有者）
- `"open"` - 仅当 `allowFrom` 包含 `"*"` 时才允许公开 ；如果有限制性条目，则只有匹配的用户可以聊天
- `"disabled"` - 禁用所有

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
| `"allowlist"` | 仅响应 `groupAllowFrom` 中的群组或在 `groups.<chat_id>` 下显式配置的群组 |
| `"disabled"`  | 禁用所有群组消息；显式的 `groups.<chat_id>` 条目不会覆盖此项             |

默认值：`allowlist`

**提及要求** (`channels.feishu.requireMention`)：

- `true` - 需要 @提及（默认）
- `false` - 无需 @提及即可响应
- 按群组覆盖：`channels.feishu.groups.<chat_id>.requireMention`
- 仅广播 `@all` 和 `@_all` 不被视为对机器人的提及。即使消息同时提及了 `@all` 和直接提及了机器人，仍然算作对机器人的提及。

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

在 `allowlist` 模式下，您还可以通过添加显式的 `groups.<chat_id>` 条目来允许特定群组。显式条目不会覆盖 `groupPolicy: "disabled"`。`groups.*` 下的通配符默认值用于配置匹配的群组，但它们本身不足以允许群组。

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

在飞书/Lark 中打开群组，点击右上角的菜单图标，然后进入 **Settings（设置）**。群组 ID (`chat_id`) 列在设置页面上。

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
3. 验证 `groupPolicy` 不是 `"disabled"`
4. 检查日志：`openclaw logs --follow`

### 机器人未收到消息

1. 确保机器人已在飞书开放平台 / Lark Developer 中发布并审核通过
2. 确保事件订阅包含 `im.message.receive_v1`
3. 确保选择了 **持久连接** (WebSocket)
4. 确保已授予所有必需的权限范围
5. 确保网关正在运行：`openclaw gateway status`
6. 检查日志：`openclaw logs --follow`

### 飞书移动应用中二维码设置无反应

1. 重新运行设置：`openclaw channels login --channel feishu`
2. 选择手动设置
3. 在飞书开放平台中，创建一个自建应用并复制其 App ID 和 App Secret
4. 将这些凭据粘贴到设置向导中

### App Secret 泄露

1. 在飞书开放平台 / Lark Developer 中重置 App Secret
2. 更新配置中的值
3. 重启网关：`openclaw gateway restart`

---

## 高级配置

### 多账户

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

`defaultAccount` 控制当出站 API 未指定 `accountId` 时使用哪个账号。
`accounts.<id>.tts` 使用与 `messages.tts` 相同的结构，并与全局 TTS 配置进行深度合并，因此多机器人飞书设置可以在全局保留共享提供商凭据，同时仅为每个账号覆盖语音、模型、人格或自动模式。

### 消息限制

- `textChunkLimit` - 出站文本块大小（默认：`2000` 字符）
- `mediaMaxMb` - 媒体上传/下载限制（默认：`30` MB）

### 流式传输

飞书/Lark 支持通过交互式卡片进行流式回复。启用后，机器人会在生成文本时实时更新卡片。

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

设置 `streaming: false` 以在一条消息中发送完整回复。`blockStreaming` 默认关闭；仅当您希望在最终回复之前刷新已完成的助手块时才启用它。

### 配额优化

通过两个可选标志减少飞书/Lark API 调用的次数：

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

飞书/Lark 支持私信和群组线程消息的 ACP。飞书/Lark ACP 由文本命令驱动 - 没有原生斜杠命令菜单，因此请直接在对话中使用 `/acp ...` 消息。

#### 持久化 ACP 绑定

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

#### 从聊天启动 ACP

在飞书/Lark 私信或线程中：

```text
/acp spawn codex --thread here
```

`--thread here` 适用于私信和飞书/Lark 线程消息。绑定对话中的后续消息直接路由到该 ACP 会话。

### 多智能体路由

使用 `bindings` 将飞书/Lark 私信或群组路由到不同的 Agent。

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

## 每用户 Agent 隔离（动态 Agent 创建）

启用 `dynamicAgentCreation` 可自动为每个私信用户创建**隔离的 Agent 实例**。每个用户获得自己的：

- 独立的工作区目录
- 单独的 `USER.md` / `SOUL.md` / `MEMORY.md`
- 私有的对话历史记录
- 隔离的技能和状态

对于希望每个用户都拥有自己的私人 AI 助手体验的公共机器人来说，这一点至关重要。

<Note>**账户限制**：`dynamicAgentCreation` 目前仅适用于**默认的飞书账户**。命名账户/多账户设置尚未完全支持 —— 动态绑定是在没有 `accountId` 的情况下创建的，因此发送到命名账户的消息仍可能路由到 `agent:main`。请在 [Issue #42837](https://github.com/openclaw/openclaw/issues/42837) 中跟踪进度。</Note>

### 快速设置

```json5
{
  channels: {
    feishu: {
      dmPolicy: "open",
      allowFrom: ["*"],
      dynamicAgentCreation: {
        enabled: true,
        workspaceTemplate: "~/.openclaw/workspace-{agentId}",
        agentDirTemplate: "~/.openclaw/agents/{agentId}/agent",
      },
    },
  },
  session: {
    // Critical: makes each user's DM their "main session"
    // Automatically loads USER.md / SOUL.md / MEMORY.md
    // For stronger isolation, use "per-channel-peer" instead
    dmScope: "main",
  },
}
```

### 工作原理

当新用户发送其第一条私信时：

1. 渠道生成一个唯一的 `agentId` = `feishu-{user_open_id}`
2. 在 `workspaceTemplate` 路径下创建一个新的工作区
3. 注册代理并为该用户创建绑定
4. 工作区助手确保在首次访问时引导文件（`AGENTS.md`、`SOUL.md`、`USER.md` 等）
5. 将来自该用户的所有后续消息路由到其专用代理

### 配置选项

| 设置                                                     | 描述                       | 默认值                               |
| -------------------------------------------------------- | -------------------------- | ------------------------------------ |
| `channels.feishu.dynamicAgentCreation.enabled`           | 启用自动按用户创建代理     | `false`                              |
| `channels.feishu.dynamicAgentCreation.workspaceTemplate` | 动态代理工作区的路径模板   | `~/.openclaw/workspace-{agentId}`    |
| `channels.feishu.dynamicAgentCreation.agentDirTemplate`  | 代理目录名称模板           | `~/.openclaw/agents/{agentId}/agent` |
| `channels.feishu.dynamicAgentCreation.maxAgents`         | 要创建的动态代理的最大数量 | 无限制                               |

模板变量：

- `{agentId}` - 生成的代理 ID（例如 `feishu-ou_xxxxxx`）
- `{userId}` - 发送者的飞书 open_id（例如 `ou_xxxxxx`）

### 会话范围

`session.dmScope` 控制如何将私信映射到代理会话。这是一个影响所有渠道的**全局设置**。

| 值                   | 行为                                      | 最适用于                                            |
| -------------------- | ----------------------------------------- | --------------------------------------------------- |
| `"main"`             | 每个用户的私信映射到其代理的主会话        | 您希望 `USER.md` / `SOUL.md` 自动加载的单用户机器人 |
| `"per-channel-peer"` | 每个（渠道 + 用户）组合都有一个单独的会话 | 需要更强隔离的公共多用户机器人                      |

**权衡**：使用 `"main"` 可以启用引导文件的自动加载（`USER.md`、`SOUL.md`、`MEMORY.md`），但这意味着所有渠道的所有私信都共享相同的会话密钥模式。对于隔离性比引导文件自动加载更重要的公共多用户机器人，请考虑使用 `"per-channel-peer"` 并手动管理引导文件。

<Note>不建议将 `"per-account-channel-peer"` 与 `dynamicAgentCreation` 结合使用，因为动态绑定是在没有 `accountId` 的情况下创建的。请仅在手动绑定时使用它。</Note>

```json5
{
  session: {
    // For single-user personal bots: enables auto bootstrap loading
    dmScope: "main",

    // For public multi-user bots: stronger isolation
    // dmScope: "per-channel-peer",
  },
}
```

### 典型的多用户部署

```json5
{
  channels: {
    feishu: {
      appId: "cli_xxx",
      appSecret: "xxx",
      dmPolicy: "open",
      allowFrom: ["*"],
      groupPolicy: "open",
      requireMention: true,
      dynamicAgentCreation: {
        enabled: true,
        workspaceTemplate: "~/.openclaw/workspace-{agentId}",
        agentDirTemplate: "~/.openclaw/agents/{agentId}/agent",
      },
    },
  },
  session: {
    // Choose dmScope based on your isolation needs:
    // "main" for bootstrap auto-loading, "per-channel-peer" for stronger isolation
    dmScope: "main",
  },
  bindings: [], // Empty - dynamic agents auto-bind
}
```

### 验证

检查 Gateway(网关) 日志以确认动态创建是否正常工作：

```
feishu: creating dynamic agent "feishu-ou_xxxxxx" for user ou_xxxxxx
workspace: /Users/you/.openclaw/workspace-feishu-ou_xxxxxx
feishu: dynamic agent created, new route: agent:feishu-ou_xxxxxx:main
```

列出所有已创建的工作区：

```bash
ls -la ~/.openclaw/workspace-*
```

### 注意事项

- **工作区隔离**：每个用户都有自己的工作区目录和代理实例。在正常消息流中，用户无法看到彼此的对话历史或文件。
- **安全边界**：这是一种消息上下文隔离机制，而非针对恶意租户的安全边界。代理进程和主机环境是共享的。
- **`bindings` 应为空**：动态代理会自动注册其自身的绑定
- **升级路径**：现有的手动绑定将继续与动态代理一起工作
- **`session.dmScope` 是全局的**：这会影响所有渠道，而不仅仅是飞书

---

## 配置参考

完整配置：[Gateway(网关) 配置](<Gateway(网关)/en/gateway/configuration>)

| 设置                                                     | 描述                                                                              | 默认值                               |
| -------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------ |
| `channels.feishu.enabled`                                | 启用/禁用该渠道                                                                   | `true`                               |
| `channels.feishu.domain`                                 | API 域名（API`feishu` 或 `lark`）                                                 | `feishu`                             |
| `channels.feishu.connectionMode`                         | 事件传输方式（`websocket` 或 `webhook`）                                          | `websocket`                          |
| `channels.feishu.defaultAccount`                         | 出站路由的默认账号                                                                | `default`                            |
| `channels.feishu.verificationToken`                      | Webhook 模式所需                                                                  | -                                    |
| `channels.feishu.encryptKey`                             | Webhook 模式所必需                                                                | -                                    |
| `channels.feishu.webhookPath`                            | Webhook 路由路径                                                                  | `/feishu/events`                     |
| `channels.feishu.webhookHost`                            | Webhook 绑定主机                                                                  | `127.0.0.1`                          |
| `channels.feishu.webhookPort`                            | Webhook 绑定端口                                                                  | `3000`                               |
| `channels.feishu.accounts.<id>.appId`                    | App ID                                                                            | -                                    |
| `channels.feishu.accounts.<id>.appSecret`                | App Secret                                                                        | -                                    |
| `channels.feishu.accounts.<id>.domain`                   | 每个账号的域名覆盖                                                                | `feishu`                             |
| `channels.feishu.accounts.<id>.tts`                      | 每个账号的 TTS 覆盖                                                               | `messages.tts`                       |
| `channels.feishu.dmPolicy`                               | 私信策略                                                                          | `allowlist`                          |
| `channels.feishu.allowFrom`                              | 私信白名单（open_id 列表）                                                        | [BotOwnerId]                         |
| `channels.feishu.groupPolicy`                            | 群组策略                                                                          | `allowlist`                          |
| `channels.feishu.groupAllowFrom`                         | 群组白名单                                                                        | -                                    |
| `channels.feishu.requireMention`                         | 在群组中要求 @提及                                                                | `true`                               |
| `channels.feishu.groups.<chat_id>.requireMention`        | 每个群组的 @提及覆盖；在白名单模式下，显式 ID 也会允许该群组                      | inherited                            |
| `channels.feishu.groups.<chat_id>.enabled`               | 启用/禁用特定群组                                                                 | `true`                               |
| `channels.feishu.dynamicAgentCreation.enabled`           | 启用自动创建每个用户的代理                                                        | `false`                              |
| `channels.feishu.dynamicAgentCreation.workspaceTemplate` | 动态代理工作空间的路径模板                                                        | `~/.openclaw/workspace-{agentId}`    |
| `channels.feishu.dynamicAgentCreation.agentDirTemplate`  | 代理目录名称模板                                                                  | `~/.openclaw/agents/{agentId}/agent` |
| `channels.feishu.dynamicAgentCreation.maxAgents`         | 要创建的动态代理的最大数量                                                        | unlimited                            |
| `channels.feishu.textChunkLimit`                         | 消息分块大小                                                                      | `2000`                               |
| `channels.feishu.mediaMaxMb`                             | 媒体大小限制                                                                      | `30`                                 |
| `channels.feishu.streaming`                              | 流式卡片输出                                                                      | `true`                               |
| `channels.feishu.blockStreaming`                         | 已完成块回复流式传输                                                              | `false`                              |
| `channels.feishu.typingIndicator`                        | 发送正在输入反应                                                                  | `true`                               |
| `channels.feishu.resolveSenderNames`                     | 解析发送者显示名称                                                                | `true`                               |
| `channels.feishu.tools.bitable`                          | 启用 Bitable/Base 工具                                                            | `true`                               |
| `channels.feishu.tools.base`                             | `channels.feishu.tools.bitable` 的别名；如果两者均已设置，则显式的 `bitable` 优先 | `true`                               |
| `channels.feishu.accounts.<id>.tools.bitable`            | 每个账户的 Bitable/Base 工具开关                                                  | inherited                            |
| `channels.feishu.accounts.<id>.tools.base`               | `tools.bitable` 的每个账户的别名                                                  | inherited                            |

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

入站的飞书/Lark 音频消息被规范化为媒体占位符，而不是原始 `file_key` JSON。当配置了 `tools.media.audio`OpenClaw 时，OpenClaw 会下载语音消息资源并在智能体回合之前运行共享的音频转录，因此智能体会接收口语转录文本。如果飞书直接在音频负载中包含转录文本，则使用该文本而无需再次调用 ASR。如果没有音频转录提供商，智能体仍然会收到 `<media:audio>` 占位符以及保存的附件，而不是原始的飞书资源负载。

### 发送

- ✅ 文本
- ✅ 图片
- ✅ 文件
- ✅ 音频
- ✅ 视频/媒体
- ✅ 交互式卡片（包括流式更新）
- ⚠️ 富文本（帖子样式格式；不支持完整的飞书/Lark 创作功能）

飞书/Lark 原生语音气泡使用飞书 `audio` 消息类型，并要求
上传 Ogg/Opus 媒体 (`file_type: "opus"`)。现有的 `.opus` 和 `.ogg` 媒体
将作为原生音频直接发送。MP3/WAV/M4A 和其他常见音频格式
仅在回复请求语音传递 (`audioAsVoice` / 消息工具 `asVoice`，包括 TTS 语音笔记
回复) 时，才会通过 `ffmpeg` 转码为 48kHz Ogg/Opus。普通的 MP3 附件保持为常规文件。如果 `ffmpeg`OpenClaw 缺失或
转换失败，OpenClaw 将回退到文件附件并记录原因。

### 串和回复

- ✅ 内联回复
- ✅ 串回复
- ✅ 回复串消息时，媒体回复保持串上下文感知

对于 `groupSessionScope: "group_topic"` 和 `"group_topic_sender"`，飞书/Lark 原生
话题组使用事件 `thread_id` (`omt_*`) 作为规范的话题会话密钥。如果原生话题发起事件省略了 `thread_id`OpenClawOpenClaw，OpenClaw
会在路由该轮次之前从飞书中获取它。OpenClaw 转换为串的普通群组回复继续使用回复根消息 ID (`om_*`)，这样
第一轮和后续轮次就会保持在同一会话中。

---

## 相关

- [Channels Overview](/zh/channels) - 所有支持的渠道
- [Pairing](/zh/channels/pairing) - 私信认证和配对流程
- [Groups](/zh/channels/groups) - 群聊行为和提及控制
- [Channel Routing](/zh/channels/channel-routing) - 消息的会话路由
- [Security](/zh/gateway/security) - 访问模型和安全加固
