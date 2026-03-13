---
summary: "飞书机器人概览、功能和配置"
read_when:
  - You want to connect a Feishu/Lark bot
  - You are configuring the Feishu channel
title: Feishu
---

# Feishu bot

Feishu (Lark) 是企业用于消息传递和协作的团队聊天平台。此插件通过平台的 WebSocket 事件订阅将 OpenClaw 连接到 Feishu/Lark bot，从而无需暴露公共 webhook URL 即可接收消息。

---

## Bundled plugin

Feishu 随当前的 OpenClaw 版本一起发布，因此无需单独安装插件。

如果您使用的是不包含捆绑 Feishu 的旧版本或自定义安装，请手动安装：

```bash
openclaw plugins install @openclaw/feishu
```

---

## Quickstart

有两种添加 Feishu 频道的方法：

### Method 1: onboarding wizard (recommended)

如果您刚刚安装 OpenClaw，请运行向导：

```bash
openclaw onboard
```

该向导将指导您完成以下步骤：

1. 创建 Feishu 应用并收集凭据
2. 在 OpenClaw 中配置应用凭据
3. 启动网关

✅ **配置完成后**，检查网关状态：

- `openclaw gateway status`
- `openclaw logs --follow`

### Method 2: CLI setup

如果您已经完成了初始安装，请通过 CLI 添加频道：

```bash
openclaw channels add
```

选择 **Feishu**，然后输入 App ID 和 App Secret。

✅ **配置完成后**，管理网关：

- `openclaw gateway status`
- `openclaw gateway restart`
- `openclaw logs --follow`

---

## Step 1: Create a Feishu app

### 1. Open Feishu Open Platform

访问 [飞书开放平台](https://open.feishu.cn/app) 并登录。

Lark（海外版）租户应使用 [https://open.larksuite.com/app](https://open.larksuite.com/app) 并在飞书配置中设置 `domain: "lark"`。

### 2. Create an app

1. 点击 **Create enterprise app**
2. 填写应用名称 + 描述
3. 选择一个应用图标

![Create enterprise app](../images/feishu-step2-create-app.png)

### 3. Copy credentials

在 **Credentials & Basic Info** 中，复制：

- **App ID**（格式：`cli_xxx`）
- **App Secret**

❗ **重要提示：** 请妥善保管 App Secret，不要公开。

![Get credentials](../images/feishu-step3-credentials.png)

### 4. Configure permissions

在 **Permissions** 上，点击 **Batch import** 并粘贴：

```json
{
  "scopes": {
    "tenant": [
      "aily:file:read",
      "aily:file:write",
      "application:application.app_message_stats.overview:readonly",
      "application:application:self_manage",
      "application:bot.menu:write",
      "cardkit:card:read",
      "cardkit:card:write",
      "contact:user.employee_id:readonly",
      "corehr:file:download",
      "event:ip_list",
      "im:chat.access_event.bot_p2p_chat:read",
      "im:chat.members:bot_access",
      "im:message",
      "im:message.group_at_msg:readonly",
      "im:message.p2p_msg:readonly",
      "im:message:readonly",
      "im:message:send_as_bot",
      "im:resource"
    ],
    "user": ["aily:file:read", "aily:file:write", "im:chat.access_event.bot_p2p_chat:read"]
  }
}
```

![Configure permissions](../images/feishu-step4-permissions.png)

### 5. Enable bot capability

在 **App Capability**（应用能力） > **Bot**（机器人）中：

1. 启用机器人能力
2. 设置机器人名称

![Enable bot capability](../images/feishu-step5-bot-capability.png)

### 6. 配置事件订阅

⚠️ **重要提示：** 在设置事件订阅之前，请确保：

1. 你已经为飞书运行了 `openclaw channels add`
2. 网关正在运行（`openclaw gateway status`）

在 **Event Subscription**（事件订阅）中：

1. 选择 **Use long connection to receive events**（使用长连接接收事件）(WebSocket)
2. 添加事件：`im.message.receive_v1`

⚠️ 如果网关未运行，长连接设置可能无法保存。

![Configure event subscription](../images/feishu-step6-event-subscription.png)

### 7. 发布应用

1. 在 **Version Management & Release**（版本管理与发布）中创建版本
2. 提交审核并发布
3. 等待管理员批准（企业应用通常会自动批准）

---

## 步骤 2：配置 OpenClaw

### 使用向导进行配置（推荐）

```bash
openclaw channels add
```

选择 **Feishu** 并粘贴您的 App ID + App Secret。

### 通过配置文件进行配置

编辑 `~/.openclaw/openclaw.json`：

```json5
{
  channels: {
    feishu: {
      enabled: true,
      dmPolicy: "pairing",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          botName: "My AI assistant",
        },
      },
    },
  },
}
```

如果你使用 `connectionMode: "webhook"`，请同时设置 `verificationToken` 和 `encryptKey`。飞书 Webhook 服务器默认绑定到 `127.0.0.1`；仅当你有意需要不同的绑定地址时才设置 `webhookHost`。

#### 验证令牌和加密密钥（Webhook 模式）

使用 Webhook 模式时，请在配置中同时设置 `channels.feishu.verificationToken` 和 `channels.feishu.encryptKey`。获取这些值的方法：

1. 在飞书开放平台中，打开您的应用
2. 前往 **Development**（开发配置） → **Events & Callbacks**（事件与回调）
3. 打开 **Encryption**（加密策略）选项卡
4. 复制 **验证令牌** 和 **加密密钥**

下面的截图显示了在哪里可以找到 **验证令牌**。**加密密钥** 列在同一 **加密** 部分中。

![验证令牌位置](../images/feishu-verification-token.png)

### 通过环境变量配置

```bash
export FEISHU_APP_ID="cli_xxx"
export FEISHU_APP_SECRET="xxx"
```

### Lark（海外版）域名

如果你的租户位于 Lark（国际版），请将域名设置为 `lark`（或完整的域名字符串）。你可以在 `channels.feishu.domain` 或每个账户（`channels.feishu.accounts.<id>.domain`）中进行设置。

```json5
{
  channels: {
    feishu: {
      domain: "lark",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
        },
      },
    },
  },
}
```

### 配额优化标志

您可以使用两个可选标志来减少飞书 API 的使用：

- `typingIndicator`（默认 `true`）：当 `false` 时，跳过正在输入反应调用。
- `resolveSenderNames`（默认 `true`）：当 `false` 时，跳过发送者资料查找调用。

可以在顶层或每个帐户中设置它们：

```json5
{
  channels: {
    feishu: {
      typingIndicator: false,
      resolveSenderNames: false,
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          typingIndicator: true,
          resolveSenderNames: false,
        },
      },
    },
  },
}
```

---

## 步骤 3：启动 + 测试

### 1. 启动网关

```bash
openclaw gateway
```

### 2. 发送测试消息

在飞书中找到您的机器人并发送一条消息。

### 3. 批准配对

默认情况下，机器人会回复一个配对码。请批准它：

```bash
openclaw pairing approve feishu <CODE>
```

批准后，您即可正常聊天。

---

## 概述

- **飞书机器人通道**：由网关管理的飞书机器人
- **确定性路由**：回复始终返回飞书
- **会话隔离**：私信共享一个主会话；群组是隔离的
- **WebSocket 连接**：通过飞书 SDK 长连接，无需公网 URL

---

## 访问控制

### 私信

- **默认值**：`dmPolicy: "pairing"`（未知用户会收到配对码）
- **批准配对**：

  ```bash
  openclaw pairing list feishu
  openclaw pairing approve feishu <CODE>
  ```

- **白名单模式**：使用允许的 Open IDs 设置 `channels.feishu.allowFrom`

### 群聊

**1. 群组策略**（`channels.feishu.groupPolicy`）：

- `"open"` = 允许群组中的所有人（默认）
- `"allowlist"` = 仅允许 `groupAllowFrom`
- `"disabled"` = 禁用群组消息

**2. 提及要求** (`channels.feishu.groups.<chat_id>.requireMention`)：

- `true` = 需要 @提及（默认）
- `false` = 无需提及即可回复

---

## 群组配置示例

### 允许所有群组，需要 @提及（默认）

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
      // Default requireMention: true
    },
  },
}
```

### 允许所有群组，无需 @提及

```json5
{
  channels: {
    feishu: {
      groups: {
        oc_xxx: { requireMention: false },
      },
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
      // Feishu group IDs (chat_id) look like: oc_xxx
      groupAllowFrom: ["oc_xxx", "oc_yyy"],
    },
  },
}
```

### 限制群组中可以发送消息的发件人（发件人白名单）

除了允许群组本身之外，该群组中的**所有消息**都受发送者 open_id 的限制：只有列在 `groups.<chat_id>.allowFrom` 中的用户，其消息才会被处理；其他成员的消息将被忽略（这是完全的发送者级别限制，不仅限于 /reset 或 /new 等控制命令）。

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["oc_xxx"],
      groups: {
        oc_xxx: {
          // Feishu user IDs (open_id) look like: ou_xxx
          allowFrom: ["ou_user1", "ou_user2"],
        },
      },
    },
  },
}
```

---

## 获取群组/用户 ID

### 群组 ID (chat_id)

群组 ID 类似于 `oc_xxx`。

**方法 1（推荐）**

1. 启动网关并在群组中 @提及 机器人
2. 运行 `openclaw logs --follow` 并查找 `chat_id`

**方法 2**

使用飞书 API 调试工具列出群组聊天。

### 用户 ID (open_id)

用户 ID 类似于 `ou_xxx`。

**方法 1（推荐）**

1. 启动网关并向机器人发送私信
2. 运行 `openclaw logs --follow` 并查找 `open_id`

**方法 2**

检查配对请求以获取用户 Open ID：

```bash
openclaw pairing list feishu
```

---

## 常用命令

| 命令   | 描述       |
| --------- | ----------------- |
| `/status` | 显示机器人状态   |
| `/reset`  | 重置会话 |
| `/model`  | 显示/切换模型 |

> 注意：飞书尚不支持原生命令菜单，因此必须以文本形式发送命令。

## 网关管理命令

| 命令                    | 描述                   |
| -------------------------- | ----------------------------- |
| `openclaw gateway status`  | 显示网关状态           |
| `openclaw gateway install` | 安装/启动网关服务 |
| `openclaw gateway stop`    | 停止网关服务          |
| `openclaw gateway restart` | 重启网关服务       |
| `openclaw logs --follow`   | 跟踪网关日志             |

---

## 故障排查

### 机器人在群聊中无响应

1. 确保机器人已添加到群组中
2. 确保您 @提及了机器人（默认行为）
3. 检查 `groupPolicy` 是否未设置为 `"disabled"`
4. 检查日志：`openclaw logs --follow`

### 机器人未收到消息

1. 确保应用已发布并审核通过
2. 确保事件订阅包含 `im.message.receive_v1`
3. 确保已启用 **长连接**
4. 确保应用权限配置完整
5. 确保网关正在运行：`openclaw gateway status`
6. 检查日志：`openclaw logs --follow`

### App Secret 泄露

1. 在飞书开放平台重置 App Secret
2. 更新配置中的 App Secret
3. 重启网关

### 消息发送失败

1. 确保应用具有 `im:message:send_as_bot` 权限
2. 确保应用已发布
3. 检查日志以获取详细错误信息

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
          botName: "Primary bot",
        },
        backup: {
          appId: "cli_yyy",
          appSecret: "yyy",
          botName: "Backup bot",
          enabled: false,
        },
      },
    },
  },
}
```

当出站 API 未明确指定 `accountId` 时，`defaultAccount` 控制使用哪个飞书账号。

### 消息限制

- `textChunkLimit`：出站文本块大小（默认：2000 个字符）
- `mediaMaxMb`：媒体上传/下载限制（默认：30MB）

### 流式传输

飞书支持通过交互式卡片进行流式回复。启用后，机器人生成文本时会更新卡片。

```json5
{
  channels: {
    feishu: {
      streaming: true, // enable streaming card output (default true)
      blockStreaming: true, // enable block-level streaming (default true)
    },
  },
}
```

设置 `streaming: false` 以在发送前等待完整回复。

### 多代理路由

使用 `bindings` 将飞书私信或群组路由到不同的代理。

```json5
{
  agents: {
    list: [
      { id: "main" },
      {
        id: "clawd-fan",
        workspace: "/home/user/clawd-fan",
        agentDir: "/home/user/.openclaw/agents/clawd-fan/agent",
      },
      {
        id: "clawd-xi",
        workspace: "/home/user/clawd-xi",
        agentDir: "/home/user/.openclaw/agents/clawd-xi/agent",
      },
    ],
  },
  bindings: [
    {
      agentId: "main",
      match: {
        channel: "feishu",
        peer: { kind: "direct", id: "ou_xxx" },
      },
    },
    {
      agentId: "clawd-fan",
      match: {
        channel: "feishu",
        peer: { kind: "direct", id: "ou_yyy" },
      },
    },
    {
      agentId: "clawd-xi",
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
- `match.peer.kind`：`"direct"` 或 `"group"`
- `match.peer.id`：用户 Open ID (`ou_xxx`) 或群组 ID (`oc_xxx`)

有关查找提示，请参阅[获取群组/用户 ID](#get-groupuser-ids)。

---

## 配置参考

完整配置：[网关配置](/en/gateway/configuration)

关键选项：

| 设置                                           | 描述                             | 默认值          |
| ------------------------------------------------- | --------------------------------------- | ---------------- |
| `channels.feishu.enabled`                         | 启用/禁用频道                  | `true`           |
| `channels.feishu.domain`                          | API 域名 (`feishu` 或 `lark`)         | `feishu`         |
| `channels.feishu.connectionMode`                  | 事件传输模式                    | `websocket`      |
| `channels.feishu.defaultAccount`                  | 出站路由的默认账户 ID | `default`        |
| `channels.feishu.verificationToken`               | Webhook 模式必需               | -                |
| `channels.feishu.encryptKey`                      | Webhook 模式必需               | -                |
| `channels.feishu.webhookPath`                     | Webhook 路由路径                      | `/feishu/events` |
| `channels.feishu.webhookHost`                     | Webhook 绑定主机                       | `127.0.0.1`      |
| `channels.feishu.webhookPort`                     | Webhook 绑定端口                       | `3000`           |
| `channels.feishu.accounts.<id>.appId`             | App ID                                  | -                |
| `channels.feishu.accounts.<id>.appSecret`         | App Secret                              | -                |
| `channels.feishu.accounts.<id>.domain`            | 每个账户的 API 域名覆盖         | `feishu`         |
| `channels.feishu.dmPolicy`                        | 私信策略                               | `pairing`        |
| `channels.feishu.allowFrom`                       | 私信白名单 (open_id 列表)             | -                |
| `channels.feishu.groupPolicy`                     | 群组策略                            | `open`           |
| `channels.feishu.groupAllowFrom`                  | 群组白名单                         | -                |
| `channels.feishu.groups.<chat_id>.requireMention` | 需要 @提及                        | `true`           |
| `channels.feishu.groups.<chat_id>.enabled`        | 启用群组                            | `true`           |
| `channels.feishu.textChunkLimit`                  | 消息分块大小                      | `2000`           |
| `channels.feishu.mediaMaxMb`                      | 媒体大小限制                        | `30`             |
| `channels.feishu.streaming`                       | 启用流式卡片输出            | `true`           |
| `channels.feishu.blockStreaming`                  | 启用块流式传输                  | `true`           |

---

## dmPolicy 参考

| 值         | 行为                                                        |
| ------------- | --------------------------------------------------------------- |
| `"pairing"`   | **默认。** 未知用户获取配对码；必须经过批准 |
| `"allowlist"` | 仅 `allowFrom` 中的用户可以聊天                              |
| `"open"`      | 允许所有用户（需要在 allowFrom 中包含 `"*"`）                   |
| `"disabled"`  | 禁用私信                                                     |

---

## 支持的消息类型

### 接收

- ✅ 文本
- ✅ 富文本（帖子）
- ✅ 图片
- ✅ 文件
- ✅ 音频
- ✅ 视频
- ✅ 表情包

### 发送

- ✅ 文本
- ✅ 图片
- ✅ 文件
- ✅ 音频
- ⚠️ 富文本（部分支持）

import zh from '/components/footer/zh.mdx';

<zh />
