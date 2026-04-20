---
summary: "飞书机器人概览、功能和配置"
read_when:
  - You want to connect a Feishu/Lark bot
  - You are configuring the Feishu channel
title: Feishu
---

# 飞书 / Lark

飞书/Lark 是一个一站式协作平台，团队可以在其中聊天、共享文档、管理日历并协同完成工作。

**状态：** 机器人私信 + 群聊已可用于生产环境。WebSocket 是默认模式；webhook 模式为可选。

---

## 快速开始

> **需要 OpenClaw 2026.4.10 或更高版本。** 运行 `openclaw --version` 进行检查。使用 `openclaw update` 进行升级。

<Steps>
  <Step title="运行渠道设置向导">```bash openclaw channels login --channel feishu ``` 使用您的飞书/Lark 移动应用扫描二维码以自动创建飞书/Lark 机器人。</Step>

  <Step title="设置完成后，重启网关以应用更改">```bash openclaw gateway restart ```</Step>
</Steps>

---

## 访问控制

### 私信

配置 `dmPolicy` 以控制谁可以向机器人发送私信：

- `"pairing"` — 未知用户会收到配对码；通过 CLI 批准
- `"allowlist"` — 只有 `allowFrom` 中列出的用户可以聊天（默认：仅机器人所有者）
- `"open"` — 允许所有用户
- `"disabled"` — 禁用所有私信

**批准配对请求：**

```bash
openclaw pairing list feishu
openclaw pairing approve feishu <CODE>
```

### 群聊

**群组策略** (`channels.feishu.groupPolicy`)：

| 值            | 行为                             |
| ------------- | -------------------------------- |
| `"open"`      | 响应群组中的所有消息             |
| `"allowlist"` | 仅响应 `groupAllowFrom` 中的群组 |
| `"disabled"`  | 禁用所有群组消息                 |

默认：`allowlist`

**@提及 要求** (`channels.feishu.requireMention`)：

- `true` — 需要 @提及（默认）
- `false` — 无需 @提及 即可响应
- 按群组覆盖：`channels.feishu.groups.<chat_id>.requireMention`

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

## 获取群组/用户 ID

### 群组 ID (`chat_id`，格式：`oc_xxx`)

在飞书/Lark 中打开群组，点击右上角的菜单图标，然后进入 **Settings**。群组 ID (`chat_id`) 列在设置页面上。

![获取群组 ID](/images/feishu-get-group-id.png)

### 用户 ID (`open_id`，格式：`ou_xxx`)

启动网关，向机器人发送私信，然后检查日志：

```bash
openclaw logs --follow
```

在日志输出中查找 `open_id`。您还可以检查待处理的配对请求：

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

> 飞书/Lark 不支持原生的斜杠命令菜单，因此请将这些作为纯文本消息发送。

---

## 故障排除

### 机器人在群聊中无响应

1. 确保机器人已添加到群组中
2. 确保您 @提及 了机器人（默认需要）
3. 验证 `groupPolicy` 不为 `"disabled"`
4. 检查日志：`openclaw logs --follow`

### 机器人未收到消息

1. 确保机器人已在飞书开放平台 / Lark 开发者平台发布并审核通过
2. 确保事件订阅包含 `im.message.receive_v1`
3. 确保选择了 **persistent connection** (WebSocket)
4. 确保已授予所有必需的权限范围
5. 确保网关正在运行：`openclaw gateway status`
6. 检查日志：`openclaw logs --follow`

### App Secret 泄露

1. 在飞书开放平台 / Lark 开发者平台重置 App Secret
2. 更新配置中的值
3. 重启网关：`openclaw gateway restart`

---

## 高级配置

### 多个账号

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

### 消息限制

- `textChunkLimit` — 出站文本块大小（默认：`2000` 字符）
- `mediaMaxMb` — 媒体上传/下载限制（默认：`30` MB）

### 流式传输

飞书/Lark 支持通过交互卡片进行流式回复。启用后，机器人在生成文本时会实时更新卡片。

```json5
{
  channels: {
    feishu: {
      streaming: true, // enable streaming card output (default: true)
      blockStreaming: true, // enable block-level streaming (default: true)
    },
  },
}
```

设置 `streaming: false` 以在一条消息中发送完整回复。

### 配额优化

通过两个可选标志减少飞书/Lark API 调用次数：

- `typingIndicator`（默认为 `true`）：设置 `false` 以跳过正在输入反应调用
- `resolveSenderNames`（默认为 `true`）：设置 `false` 以跳过发送者资料查询

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

飞书/Lark 支持私信和群组回复消息的 ACP。飞书/Lark ACP 由文本命令驱动——没有原生的斜杠命令菜单，因此请在对话中直接使用 `/acp ...` 消息。

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

#### 从聊天中启动 ACP

在飞书/Lark 私信或话题回复中：

```text
/acp spawn codex --thread here
```

`--thread here` 适用于私信和飞书/Lark 话题回复。绑定对话中的后续消息直接路由到该 ACP 会话。

### 多智能体路由

使用 `bindings` 将飞书/Lark 私信或群组路由到不同的智能体。

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

有关查询提示，请参阅 [获取群组/用户 ID](#get-groupuser-ids)。

---

## 配置参考

完整配置：[Gateway(网关) 配置](/en/gateway/configuration)

| 设置                                              | 描述                                 | 默认值           |
| ------------------------------------------------- | ------------------------------------ | ---------------- |
| `channels.feishu.enabled`                         | 启用/禁用渠道                        | `true`           |
| `channels.feishu.domain`                          | API 域名（`feishu` 或 `lark`）       | `feishu`         |
| `channels.feishu.connectionMode`                  | 事件传输（`websocket` 或 `webhook`） | `websocket`      |
| `channels.feishu.defaultAccount`                  | 出站路由的默认账号                   | `default`        |
| `channels.feishu.verificationToken`               | Webhook 模式必需                     | —                |
| `channels.feishu.encryptKey`                      | Webhook 模式必需                     | —                |
| `channels.feishu.webhookPath`                     | Webhook 路由路径                     | `/feishu/events` |
| `channels.feishu.webhookHost`                     | Webhook 绑定主机                     | `127.0.0.1`      |
| `channels.feishu.webhookPort`                     | Webhook 绑定端口                     | `3000`           |
| `channels.feishu.accounts.<id>.appId`             | App ID                               | —                |
| `channels.feishu.accounts.<id>.appSecret`         | App Secret                           | —                |
| `channels.feishu.accounts.<id>.domain`            | 每个账号的域名覆盖                   | `feishu`         |
| `channels.feishu.dmPolicy`                        | 私信策略                             | `allowlist`      |
| `channels.feishu.allowFrom`                       | 私信白名单 (open_id 列表)            | [BotOwnerId]     |
| `channels.feishu.groupPolicy`                     | 群组策略                             | `allowlist`      |
| `channels.feishu.groupAllowFrom`                  | 群组白名单                           | —                |
| `channels.feishu.requireMention`                  | 群内需要 @提及                       | `true`           |
| `channels.feishu.groups.<chat_id>.requireMention` | 每个群组的 @提及 覆盖设置            | inherited        |
| `channels.feishu.groups.<chat_id>.enabled`        | 启用/禁用特定群组                    | `true`           |
| `channels.feishu.textChunkLimit`                  | 消息分块大小                         | `2000`           |
| `channels.feishu.mediaMaxMb`                      | 媒体大小限制                         | `30`             |
| `channels.feishu.streaming`                       | 流式卡片输出                         | `true`           |
| `channels.feishu.blockStreaming`                  | 块级流式传输                         | `true`           |
| `channels.feishu.typingIndicator`                 | 发送正在输入反应                     | `true`           |
| `channels.feishu.resolveSenderNames`              | 解析发送者显示名称                   | `true`           |

---

## 支持的消息类型

### 接收

- ✅ 文本
- ✅ 富文本
- ✅ 图片
- ✅ 文件
- ✅ 音频
- ✅ 视频/媒体
- ✅ 表情贴图

### 发送

- ✅ 文本
- ✅ 图片
- ✅ 文件
- ✅ 音频
- ✅ 视频/媒体
- ✅ 交互式卡片（包括流式更新）
- ⚠️ 富文本（帖子格式样式；不支持完整的飞书/Lark 创作功能）

### 主题和回复

- ✅ 内联回复
- ✅ 主题回复
- ✅ 在回复主题消息时，媒体回复会保持主题感知

---

## 相关

- [渠道概览](/en/channels) — 所有支持的渠道
- [配对](/en/channels/pairing) — 私信认证与配对流程
- [群组](/en/channels/groups) — 群聊行为与提及（@）控制
- [渠道路由](/en/channels/channel-routing) — 消息的会话路由
- [安全性](/en/gateway/security) — 访问模型与安全加固
