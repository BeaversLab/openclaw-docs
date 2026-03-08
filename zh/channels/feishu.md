---
summary: "Feishu bot 概述、功能和配置"
read_when:
  - 您想要连接 Feishu/Lark bot
  - 您正在配置 Feishu channel
title: Feishu
---

# Feishu bot

Feishu（Lark）是企业用于消息传递和协作的团队聊天平台。该插件通过平台的 WebSocket 事件订阅将 OpenClaw 连接到 Feishu/Lark bot，无需公开公网 webhook URL 即可接收消息。

---

## Plugin required

安装 Feishu plugin：

```bash
openclaw plugins install @openclaw/feishu
```

本地检出（从 git repo 运行时）：

```bash
openclaw plugins install ./extensions/feishu
```

---

## Quickstart

有两种方式添加 Feishu channel：

### Method 1: onboarding wizard（推荐）

如果您刚刚安装 OpenClaw，运行向导：

```bash
openclaw onboard
```

向导会引导您完成：

1. 创建 Feishu app 并收集凭据
2. 在 OpenClaw 中配置 app 凭据
3. 启动 gateway

✅ **配置完成后**，检查 gateway 状态：

- `openclaw gateway status`
- `openclaw logs --follow`

### Method 2: CLI setup

如果您已经完成初始安装，通过 CLI 添加 channel：

```bash
openclaw channels add
```

选择 **Feishu**，然后输入 App ID 和 App Secret。

✅ **配置完成后**，管理 gateway：

- `openclaw gateway status`
- `openclaw gateway restart`
- `openclaw logs --follow`

---

## Step 1: Create a Feishu app

### 1. Open Feishu Open Platform

访问 [Feishu Open Platform](https://open.feishu.cn/app) 并登录。

Lark（全球版）租户应使用 https://open.larksuite.com/app 并在 Feishu 配置中设置 `domain: "lark"`。

### 2. Create an app

1. 点击 **Create enterprise app**
2. 填写 app 名称 + 描述
3. 选择 app 图标

![Create enterprise app](../images/feishu-step2-create-app.png)

### 3. Copy credentials

从 **Credentials & Basic Info**，复制：

- **App ID**（格式：`cli_xxx`）
- **App Secret**

❗ **Important：** 请妥善保管 App Secret，不要泄露。

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

在 **App Capability** > **Bot** 中：

1. 启用 bot 功能
2. 设置 bot 名称

![Enable bot capability](../images/feishu-step5-bot-capability.png)

### 6. Configure event subscription

⚠️ **Important：** 在设置事件订阅之前，请确保：

1. 您已经为 Feishu 运行了 `openclaw channels add`
2. gateway 正在运行（`openclaw gateway status`）

在 **Event Subscription** 中：

1. 选择 **Use long connection to receive events**（WebSocket）
2. 添加事件：`im.message.receive_v1`

⚠️ 如果 gateway 未运行，长连接设置可能无法保存。

![Configure event subscription](../images/feishu-step6-event-subscription.png)

### 7. Publish the app

1. 在 **Version Management & Release** 中创建版本
2. 提交审核并发布
3. 等待管理员批准（企业 app 通常自动批准）

---

## Step 2: Configure OpenClaw

### Configure with the wizard（推荐）

```bash
openclaw channels add
```

选择 **Feishu** 并粘贴您的 App ID + App Secret。

### Configure via config file

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

### Configure via environment variables

```bash
export FEISHU_APP_ID="cli_xxx"
export FEISHU_APP_SECRET="xxx"
```

### Lark（全球版）domain

如果您的租户在 Lark（国际版），将 domain 设置为 `lark`（或完整的 domain 字符串）。您可以在 `channels.feishu.domain` 或每个 account（`channels.feishu.accounts.<id>.domain`）设置。

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

## Step 3: Start + test

### 1. Start the gateway

```bash
openclaw gateway
```

### 2. Send a test message

在 Feishu 中，找到您的 bot 并发送消息。

### 3. Approve pairing

默认情况下，bot 会回复配对代码。批准它：

```bash
openclaw pairing approve feishu <CODE>
```

批准后，您可以正常聊天。

---

## Overview

- **Feishu bot channel**：由 gateway 管理的 Feishu bot
- **Deterministic routing**：回复始终返回到 Feishu
- **Session isolation**：DM 共享主 session；groups 是隔离的
- **WebSocket connection**：通过 Feishu SDK 长连接，无需公网 URL

---

## Access control

### Direct messages

- **Default**：`dmPolicy: "pairing"`（未知用户获得配对代码）
- **Approve pairing**：
  ```bash
  openclaw pairing list feishu
  openclaw pairing approve feishu <CODE>
  ```
- **Allowlist mode**：设置 `channels.feishu.allowFrom` 与允许的 Open ID

### Group chats

**1. Group policy**（`channels.feishu.groupPolicy`）：

- `"open"` = 允许 groups 中的所有人（默认）
- `"allowlist"` = 仅允许 `groupAllowFrom`
- `"disabled"` = 禁用 group 消息

**2. Mention requirement**（`channels.feishu.groups.<chat_id>.requireMention`）：

- `true` = 需要 @mention（默认）
- `false` = 无需 mention 即可回复

---

## Group configuration examples

### Allow all groups, require @mention（默认）

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

### Allow all groups, no @mention required

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

### Allow specific users in groups only

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

## Get group/user IDs

### Group IDs（chat_id）

Group IDs 看起来像 `oc_xxx`。

**Method 1（推荐）**

1. 启动 gateway 并在 group 中 @mention bot
2. 运行 `openclaw logs --follow` 并查找 `chat_id`

**Method 2**

使用 Feishu API debugger 列出 group chats。

### User IDs（open_id）

User IDs 看起来像 `ou_xxx`。

**Method 1（推荐）**

1. 启动 gateway 并向 bot 发送 DM
2. 运行 `openclaw logs --follow` 并查找 `open_id`

**Method 2**

检查配对请求以获取用户 Open ID：

```bash
openclaw pairing list feishu
```

---

## Common commands

| Command   | Description       |
| --------- | ----------------- |
| `/status` | Show bot status   |
| `/reset`  | Reset the session |
| `/model`  | Show/switch model |

> Note: Feishu 尚不支持原生命令菜单，因此命令必须作为文本发送。

## Gateway management commands

| Command                    | Description                   |
| -------------------------- | ----------------------------- |
| `openclaw gateway status`  | Show gateway status           |
| `openclaw gateway install` | Install/start gateway service |
| `openclaw gateway stop`    | Stop gateway service          |
| `openclaw gateway restart` | Restart gateway service       |
| `openclaw logs --follow`   | Tail gateway logs             |

---

## Troubleshooting

### Bot does not respond in group chats

1. 确保 bot 已添加到 group
2. 确保您 @mention 了 bot（默认行为）
3. 检查 `groupPolicy` 未设置为 `"disabled"`
4. 检查日志：`openclaw logs --follow`

### Bot does not receive messages

1. 确保 app 已发布并批准
2. 确保事件订阅包含 `im.message.receive_v1`
3. 确保已启用 **long connection**
4. 确保 app 权限完整
5. 确保 gateway 正在运行：`openclaw gateway status`
6. 检查日志：`openclaw logs --follow`

### App Secret leak

1. 在 Feishu Open Platform 中重置 App Secret
2. 更新配置中的 App Secret
3. 重启 gateway

### Message send failures

1. 确保 app 具有 `im:message:send_as_bot` 权限
2. 确保 app 已发布
3. 检查日志以获取详细错误

---

## Advanced configuration

### Multiple accounts

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

### Message limits

- `textChunkLimit`：outbound text 块大小（默认：2000 字符）
- `mediaMaxMb`：媒体上传/下载限制（默认：30MB）

### Streaming

Feishu 不支持消息编辑，因此默认启用块流式传输（`blockStreaming: true`）。bot 会等待完整回复后再发送。

---

## Configuration reference

完整配置：[Gateway configuration](/zh/gateway/configuration)

关键选项：

| Setting                                           | Description                     | Default   |
| ------------------------------------------------- | ------------------------------- | --------- |
| `channels.feishu.enabled`                         | Enable/disable channel          | `true`    |
| `channels.feishu.domain`                          | API domain（`feishu` 或 `lark`） | `feishu`  |
| `channels.feishu.accounts.<id>.appId`             | App ID                          | -         |
| `channels.feishu.accounts.<id>.appSecret`         | App Secret                      | -         |
| `channels.feishu.accounts.<id>.domain`            | Per-account API domain override | `feishu`  |
| `channels.feishu.dmPolicy`                        | DM policy                       | `pairing` |
| `channels.feishu.allowFrom`                       | DM allowlist（open_id list）     | -         |
| `channels.feishu.groupPolicy`                     | Group policy                    | `open`    |
| `channels.feishu.groupAllowFrom`                  | Group allowlist                 | -         |
| `channels.feishu.groups.<chat_id>.requireMention` | Require @mention                | `true`    |
| `channels.feishu.groups.<chat_id>.enabled`        | Enable group                    | `true`    |
| `channels.feishu.textChunkLimit`                  | Message chunk size              | `2000`    |
| `channels.feishu.mediaMaxMb`                      | Media size limit                | `30`      |
| `channels.feishu.blockStreaming`                  | Disable streaming               | `true`    |

---

## dmPolicy reference

| Value         | Behavior                                                        |
| ------------- | --------------------------------------------------------------- |
| `"pairing"`   | **Default。** 未知用户获得配对代码；必须批准                     |
| `"allowlist"` | 仅 `allowFrom` 中的用户可以聊天                                 |
| `"open"`      | 允许所有用户（需要在 allowFrom 中添加 `"*"`）                   |
| `"disabled"`  | 禁用 DM                                                         |

---

## Supported message types

### Receive

- ✅ Text
- ✅ Images
- ✅ Files
- ✅ Audio
- ✅ Video
- ✅ Stickers

### Send

- ✅ Text
- ✅ Images
- ✅ Files
- ✅ Audio
- ⚠️ Rich text（部分支持）
