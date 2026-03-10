---
summary: "飞书机器人概述、功能和配置"
read_when:
  - "You want to connect a Feishu/Lark bot"
  - "You are configuring the Feishu channel"
title: "飞书"
---

# 飞书机器人

飞书（Lark）是公司用于消息传递和协作的团队聊天平台。此插件通过平台的 WebSocket 事件订阅将 OpenClaw 连接到飞书/Lark 机器人，以便无需暴露公共 webhook URL 即可接收消息。

---

## 需要插件

安装飞书插件：

```bash
openclaw plugins install @openclaw/feishu
```

本地检出（从 git 仓库运行时）：

```bash
openclaw plugins install ./extensions/feishu
```

---

## 快速开始

添加飞书频道有两种方式：

### 方式 1：入职向导（推荐）

如果您刚刚安装 OpenClaw，运行向导：

```bash
openclaw onboard
```

向导将引导您完成：

1. 创建飞书应用并收集凭证
2. 在 OpenClaw 中配置应用凭证
3. 启动 Gateway

✅ **配置完成后**，检查 Gateway 状态：

- `openclaw gateway status`
- `openclaw logs --follow`

### Method 2: CLI setup

如果您已完成初始安装，通过 CLI 添加频道：

```bash
openclaw channels add
```

选择**飞书**，然后输入 App ID 和 App Secret。

✅ **配置完成后**，管理 Gateway：

- `openclaw gateway status`
- `openclaw gateway restart`
- `openclaw logs --follow`

---

## 步骤 1：创建飞书应用

### 1. 打开飞书开放平台

访问 [飞书开放平台](https://open.feishu.cn/app) 并登录。

Lark（全球）租户应使用 https://open.larksuite.com/app 并在飞书配置中设置 `domain: "lark"`。

### 2. 创建应用

1. 点击**创建企业应用**
2. 填写应用名称 + 描述
3. 选择应用图标

![Create enterprise app](../images/feishu-step2-create-app.png)

### 3. 复制凭证

从**凭证和基本信息**复制：

- **App ID**（格式：`cli_xxx`）
- **App Secret**

❗ **重要：**妥善保管 App Secret，不要泄露。

![Get credentials](../images/feishu-step3-credentials.png)

### 4. 配置权限

在**权限**上，点击**批量导入**并粘贴：

```json
{
  "scopes": {
    "tenant": [
      "aily:file:read",
      "aily:file:write",
      "application:application.app_message_stats.overview:readonly",
      "application:application:self_manage",
      "application:bot.menu:write",
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

### 5. 启用机器人能力

在**应用能力** > **机器人**中：

1. 启用机器人能力
2. 设置机器人名称

![Enable bot capability](../images/feishu-step5-bot-capability.png)

### 6. 配置事件订阅

⚠️ **重要：**在设置事件订阅之前，请确保：

1. 您已经为飞书运行了 `openclaw channels add`
2. Gateway 正在运行（`openclaw gateway status`）

在**事件订阅**中：

1. 选择**使用长连接接收事件**（WebSocket）
2. 添加事件：`im.message.receive_v1`

⚠️ 如果 Gateway 未运行，长连接设置可能无法保存。

![Configure event subscription](../images/feishu-step6-event-subscription.png)

### 7. 发布应用

1. 在**版本管理与发布**中创建版本
2. 提交审核并发布
3. 等待管理员批准（企业应用通常会自动批准）

---

## 步骤 2：配置 OpenClaw

### 使用向导配置（推荐）

```bash
openclaw channels add
```

选择**飞书**并粘贴您的 App ID + App Secret。

### 通过配置文件配置

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

### 通过环境变量配置

```bash
export FEISHU_APP_ID="cli_xxx"
export FEISHU_APP_SECRET="xxx"
```

### Lark（全球）域名

如果您的租户在 Lark（国际版），请将域名设置为 `lark`（或完整的域名字符串）。您可以在 `channels.feishu.domain` 或每个帐户（`channels.feishu.accounts.<id>.domain`）中设置。

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

---

## 步骤 3：启动 + 测试

### 1. 启动 Gateway

```bash
openclaw gateway
```

### 2. 发送测试消息

在飞书中找到您的机器人并发送消息。

### 3. 批准配对

默认情况下，机器人会回复配对码。批准它：

```bash
openclaw pairing approve feishu <CODE>
```

批准后，您可以正常聊天。

---

## 概述

- **飞书机器人频道**：由 Gateway 管理的飞书机器人
- **确定路由**：回复始终返回飞书
- **会话隔离**：私信共享主会话；群组是隔离的
- **WebSocket 连接**：通过飞书 SDK 的长连接，无需公共 URL

---

## 访问控制

### 私信

- **默认**：`dmPolicy: "pairing"`（未知用户会收到配对码）
- **批准配对**：
  ```bash
  openclaw pairing list feishu
  openclaw pairing approve feishu <CODE>
  ```
- **允许列表模式**：使用允许的 Open ID 设置 `channels.feishu.allowFrom`

### 群组聊天

**1. 群组策略**（`channels.feishu.groupPolicy`）：

- `"open"` = 允许群组中的所有人（默认）
- `"allowlist"` = 仅允许 `groupAllowFrom`
- `"disabled"` = 禁用群组消息

**2. 提及要求**（`channels.feishu.groups.<chat_id>.requireMention`）：

- `true` = 需要 @提及（默认）
- `false` = 无需提及即可响应

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

### 允许所有群组，不需要 @提及

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

### 仅允许群组中的特定用户

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["ou_xxx", "ou_yyy"],
    },
  },
}
```

---

## 获取群组/用户 ID

### 群组 ID（chat_id）

群组 ID 看起来像 `oc_xxx`。

**方式 1（推荐）**

1. 启动 Gateway 并在群组中 @提及机器人
2. 运行 `openclaw logs --follow` 并查找 `chat_id`

**方式 2**

使用飞书 API 调试器列出群组聊天。

### 用户 ID（open_id）

用户 ID 看起来像 `ou_xxx`。

**方式 1（推荐）**

1. 启动 Gateway 并私信机器人
2. 运行 `openclaw logs --follow` 并查找 `open_id`

**方式 2**

检查配对请求中的用户 Open ID：

```bash
openclaw pairing list feishu
```

---

## 常用命令

| Command   | Description       |
| --------- | ----------------- |
| `/status` | Show bot status   |
| `/reset`  | Reset the session |
| `/model`  | Show/switch model |

> 注意：飞书尚不支持原生命令菜单，因此命令必须作为文本发送。

## Gateway 管理命令

| Command                    | Description                   |
| -------------------------- | ----------------------------- |
| `openclaw gateway status`  | Show gateway status           |
| `openclaw gateway install` | Install/start gateway service |
| `openclaw gateway stop`    | Stop gateway service          |
| `openclaw gateway restart` | Restart gateway service       |
| `openclaw logs --follow`   | Tail gateway logs             |

---

## 故障排除

### 机器人在群组聊天中不响应

1. 确保机器人已添加到群组
2. 确保您 @提及了机器人（默认行为）
3. 检查 `groupPolicy` 是否未设置为 `"disabled"`
4. 检查日志：`openclaw logs --follow`

### 机器人未收到消息

1. 确保应用已发布并获批准
2. 确保事件订阅包含 `im.message.receive_v1`
3. 确保已启用**长连接**
4. 确保应用权限完整
5. 确保 Gateway 正在运行：`openclaw gateway status`
6. 检查日志：`openclaw logs --follow`

### App Secret 泄露

1. 在飞书开放平台中重置 App Secret
2. 更新配置中的 App Secret
3. 重启 Gateway

### 消息发送失败

1. 确保应用具有 `im:message:send_as_bot` 权限
2. 确保应用已发布
3. 检查日志以获取详细错误

---

## 高级配置

### 多个帐户

```json5
{
  channels: {
    feishu: {
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

### 消息限制

- `textChunkLimit`：出站文本块大小（默认：2000 字符）
- `mediaMaxMb`：媒体上传/下载限制（默认：30MB）

### 流式传输

飞书不支持消息编辑，因此默认启用块流式传输（`blockStreaming: true`）。机器人在发送之前会等待完整回复。

---

## 配置参考

完整配置：[Gateway 配置](/zh/gateway/configuration)

关键选项：

| Setting                                           | Description                     | Default   |
| ------------------------------------------------- | ------------------------------- | --------- |
| `channels.feishu.enabled`                         | Enable/disable channel          | `true`    |
| `channels.feishu.domain`                          | API domain (`feishu` or `lark`) | `feishu`  |
| `channels.feishu.accounts.<id>.appId`             | App ID                          | -         |
| `channels.feishu.accounts.<id>.appSecret`         | App Secret                      | -         |
| `channels.feishu.accounts.<id>.domain`            | Per-account API domain override | `feishu`  |
| `channels.feishu.dmPolicy`                        | DM policy                       | `pairing` |
| `channels.feishu.allowFrom`                       | DM allowlist (open_id list)     | -         |
| `channels.feishu.groupPolicy`                     | Group policy                    | `open`    |
| `channels.feishu.groupAllowFrom`                  | Group allowlist                 | -         |
| `channels.feishu.groups.<chat_id>.requireMention` | Require @mention                | `true`    |
| `channels.feishu.groups.<chat_id>.enabled`        | Enable group                    | `true`    |
| `channels.feishu.textChunkLimit`                  | Message chunk size              | `2000`    |
| `channels.feishu.mediaMaxMb`                      | Media size limit                | `30`      |
| `channels.feishu.blockStreaming`                  | Disable streaming               | `true`    |

---

## dmPolicy 参考

| Value         | Behavior                                                        |
| ------------- | --------------------------------------------------------------- |
| `"pairing"`   | **Default.** Unknown users get a pairing code; must be approved |
| `"allowlist"` | Only users in `allowFrom` can chat                              |
| `"open"`      | Allow all users (requires `"*"` in allowFrom)                   |
| `"disabled"`  | Disable DMs                                                     |

---

## 支持的消息类型

### 接收

- ✅ Text
- ✅ Images
- ✅ Files
- ✅ Audio
- ✅ Video
- ✅ Stickers

### 发送

- ✅ Text
- ✅ Images
- ✅ Files
- ✅ Audio
- ⚠️ Rich text (partial support)
