---
summary: "YuanBao 机器人概览、功能和配置"
read_when:
  - You want to connect a YuanBao bot
  - You are configuring the YuanBao channel
title: YuanBao
---

# YuanBao

YuanBao 是腾讯的 AI 助手平台，支持通过即时通讯集成机器人。机器人可以通过私信和群聊与用户互动。

**状态：** 机器人私信和群聊已可用于生产环境。WebSocket 是唯一支持的连接模式。

---

## 快速开始

> **需要 OpenClaw 2026.4.10 或更高版本。** 运行 `openclaw --version` 进行检查。使用 `openclaw update` 升级。

<Steps>
  <Step title="使用您的凭据添加 YuanBao 渠道">
  ```bash
  openclaw channels add --channel yuanbao --token "appKey:appSecret"
  ```
  `--token` 值使用冒号分隔的 `appKey:appSecret` 格式。您可以通过在 YuanBao APP 的应用设置中创建机器人来获取这些信息。
  </Step>

  <Step title="设置完成后，重启网关以应用更改">
  ```bash
  openclaw gateway restart
  ```
  </Step>
</Steps>

### 交互式设置（替代方案）

您也可以使用交互式向导：

```bash
openclaw channels login --channel yuanbao
```

按照提示输入您的 App ID 和 App Secret。

---

## 访问控制

### 私信

配置 `dmPolicy` 以控制谁可以给机器人发私信：

- `"pairing"` — 未知用户会收到配对码；通过 CLI 批准
- `"allowlist"` — 只有 `allowFrom` 中列出的用户可以聊天
- `"open"` — 允许所有用户（默认）
- `"disabled"` — 禁用所有私信

**批准配对请求：**

```bash
openclaw pairing list yuanbao
openclaw pairing approve yuanbao <CODE>
```

### 群聊

**提及要求** (`channels.yuanbao.requireMention`)：

- `true` — 需要 @提及（默认）
- `false` — 无需 @提及即可回复

在群聊中回复机器人的消息被视为隐式提及。

---

## 配置示例

### 使用开放私信策略的基本设置

```json5
{
  channels: {
    yuanbao: {
      appKey: "your_app_key",
      appSecret: "your_app_secret",
      dm: {
        policy: "open",
      },
    },
  },
}
```

### 限制仅特定用户可发私信

```json5
{
  channels: {
    yuanbao: {
      appKey: "your_app_key",
      appSecret: "your_app_secret",
      dm: {
        policy: "allowlist",
        allowFrom: ["user_id_1", "user_id_2"],
      },
    },
  },
}
```

### 在群聊中禁用 @提及要求

```json5
{
  channels: {
    yuanbao: {
      requireMention: false,
    },
  },
}
```

### 优化出站消息投递

```json5
{
  channels: {
    yuanbao: {
      // Send each chunk immediately without buffering
      outboundQueueStrategy: "immediate",
    },
  },
}
```

### 调整合并文本策略

```json5
{
  channels: {
    yuanbao: {
      outboundQueueStrategy: "merge-text",
      minChars: 2800, // buffer until this many chars
      maxChars: 3000, // force split above this limit
      idleMs: 5000, // auto-flush after idle timeout (ms)
    },
  },
}
```

---

## 常用命令

| 命令       | 描述           |
| ---------- | -------------- |
| `/help`    | 显示可用命令   |
| `/status`  | 显示机器人状态 |
| `/new`     | 开始新会话     |
| `/stop`    | 停止当前运行   |
| `/restart` | 重启 OpenClaw  |
| `/compact` | 精简会话上下文 |

> YuanBao 支持原生斜杠命令菜单。网关启动时，命令会自动同步到平台。

---

## 故障排查

### 机器人在群聊中无响应

1. 确保机器人已添加到群组中
2. 确保你 @提及了机器人（默认情况下需要）
3. 检查日志：`openclaw logs --follow`

### 机器人未收到消息

1. 确保机器人已在 YuanBao APP 中创建并获批
2. 确保 `appKey` 和 `appSecret` 配置正确
3. 确保网关正在运行：`openclaw gateway status`
4. 检查日志：`openclaw logs --follow`

### 机器人发送空回复或回退回复

1. 检查 AI 模型是否返回了有效内容
2. 默认回退回复为：“暂时无法解答，你可以换个问题问问我哦”
3. 通过 `channels.yuanbao.fallbackReply` 自定义

### App Secret 泄露

1. 在 YuanBao APP 中重置 App Secret
2. 更新配置中的值
3. 重启网关：`openclaw gateway restart`

---

## 高级配置

### 多账号

```json5
{
  channels: {
    yuanbao: {
      defaultAccount: "main",
      accounts: {
        main: {
          appKey: "key_xxx",
          appSecret: "secret_xxx",
          name: "Primary bot",
        },
        backup: {
          appKey: "key_yyy",
          appSecret: "secret_yyy",
          name: "Backup bot",
          enabled: false,
        },
      },
    },
  },
}
```

当出站 API 未指定 `accountId` 时，`defaultAccount` 控制使用哪个账号。

### 消息限制

- `maxChars` — 单条消息最大字符数（默认：`3000` 个字符）
- `mediaMaxMb` — 媒体上传/下载限制（默认：`20` MB）
- `overflowPolicy` — 消息超出限制时的行为：`"split"`（默认）或 `"stop"`

### 流式传输

YuanBao 支持块级流式输出。启用后，机器人会在生成文本时分块发送。

```json5
{
  channels: {
    yuanbao: {
      disableBlockStreaming: false, // block streaming enabled (default)
    },
  },
}
```

设置 `disableBlockStreaming: true` 可在一条消息中发送完整回复。

### 群聊历史上下文

控制群聊的 AI 上下文中包含多少历史消息：

```json5
{
  channels: {
    yuanbao: {
      historyLimit: 100, // default: 100, set 0 to disable
    },
  },
}
```

### 回复模式

控制机器人在群聊中回复时如何引用消息：

```json5
{
  channels: {
    yuanbao: {
      replyToMode: "first", // "off" | "first" | "all" (default: "first")
    },
  },
}
```

| 值        | 行为                                 |
| --------- | ------------------------------------ |
| `"off"`   | 不引用回复                           |
| `"first"` | 每条传入消息仅引用第一次回复（默认） |
| `"all"`   | 引用每次回复                         |

### Markdown 提示注入

默认情况下，机器人会在系统提示词中注入指令，以防止 AI 模型将整个回复包裹在 markdown 代码块中。

```json5
{
  channels: {
    yuanbao: {
      markdownHintEnabled: true, // default: true
    },
  },
}
```

### 调试模式

为特定机器人 ID 启用未经过净化的日志输出：

```json5
{
  channels: {
    yuanbao: {
      debugBotIds: ["bot_user_id_1", "bot_user_id_2"],
    },
  },
}
```

### 多智能体路由

使用 `bindings` 将 YuanBao 私信或群组路由到不同的智能体。

```json5
{
  agents: {
    list: [{ id: "main" }, { id: "agent-a", workspace: "/home/user/agent-a" }, { id: "agent-b", workspace: "/home/user/agent-b" }],
  },
  bindings: [
    {
      agentId: "agent-a",
      match: {
        channel: "yuanbao",
        peer: { kind: "direct", id: "user_xxx" },
      },
    },
    {
      agentId: "agent-b",
      match: {
        channel: "yuanbao",
        peer: { kind: "group", id: "group_zzz" },
      },
    },
  ],
}
```

路由字段：

- `match.channel`: `"yuanbao"`
- `match.peer.kind`: `"direct"` (私信) 或 `"group"` (群聊)
- `match.peer.id`: 用户 ID 或群组代码

---

## 配置参考

完整配置：[Gateway(网关) configuration](/zh/gateway/configuration)

| 设置                                       | 描述                                   | 默认值                                 |
| ------------------------------------------ | -------------------------------------- | -------------------------------------- |
| `channels.yuanbao.enabled`                 | 启用/禁用渠道                          | `true`                                 |
| `channels.yuanbao.defaultAccount`          | 出站路由的默认账号                     | `default`                              |
| `channels.yuanbao.accounts.<id>.appKey`    | App Key（用于签名和票据生成）          | —                                      |
| `channels.yuanbao.accounts.<id>.appSecret` | App Secret（用于签名）                 | —                                      |
| `channels.yuanbao.accounts.<id>.token`     | 预签名令牌（跳过自动票据签名）         | —                                      |
| `channels.yuanbao.accounts.<id>.name`      | 账号显示名称                           | —                                      |
| `channels.yuanbao.accounts.<id>.enabled`   | 启用/禁用特定账号                      | `true`                                 |
| `channels.yuanbao.dm.policy`               | 私信策略                               | `open`                                 |
| `channels.yuanbao.dm.allowFrom`            | 私信白名单（用户 ID 列表）             | —                                      |
| `channels.yuanbao.requireMention`          | 群组中需要 @提及                       | `true`                                 |
| `channels.yuanbao.overflowPolicy`          | 长消息处理 (`split` 或 `stop`)         | `split`                                |
| `channels.yuanbao.replyToMode`             | 群组回复策略 (`off`, `first`, `all`)   | `first`                                |
| `channels.yuanbao.outboundQueueStrategy`   | 出站策略 (`merge-text` 或 `immediate`) | `merge-text`                           |
| `channels.yuanbao.minChars`                | 合并文本：触发发送的最小字符数         | `2800`                                 |
| `channels.yuanbao.maxChars`                | 合并文本：每条消息的最大字符数         | `3000`                                 |
| `channels.yuanbao.idleMs`                  | 合并文本：自动刷新前的空闲超时 (毫秒)  | `5000`                                 |
| `channels.yuanbao.mediaMaxMb`              | 媒体大小限制 (MB)                      | `20`                                   |
| `channels.yuanbao.historyLimit`            | 群聊历史上下文条目                     | `100`                                  |
| `channels.yuanbao.disableBlockStreaming`   | 禁用块级流式输出                       | `false`                                |
| `channels.yuanbao.fallbackReply`           | 当 AI 未返回内容时的备用回复           | `暂时无法解答，你可以换个问题问问我哦` |
| `channels.yuanbao.markdownHintEnabled`     | 注入 markdown 防换行指令               | `true`                                 |
| `channels.yuanbao.debugBotIds`             | 调试白名单机器人 ID (未清理的日志)     | `[]`                                   |

---

## 支持的消息类型

### 接收

- ✅ 文本
- ✅ 图片
- ✅ 文件
- ✅ 音频 / 语音
- ✅ 视频
- ✅ 表情符号 / 自定义表情
- ✅ 自定义元素 (链接卡片等)

### 发送

- ✅ 文本 (支持 markdown)
- ✅ 图片
- ✅ 文件
- ✅ 音频
- ✅ 视频
- ✅ 表情符号

### 主题和回复

- ✅ 引用回复 (可通过 `replyToMode` 配置)
- ❌ 主题回复 (平台不支持)

---

## 相关内容

- [渠道概述](/zh/channels) — 所有支持的渠道
- [配对](/zh/channels/pairing) — 私信认证和配对流程
- [群组](/zh/channels/groups) — 群聊行为和提及控制
- [渠道路由](/zh/channels/channel-routing) — 消息的会话路由
- [安全](/zh/gateway/security) — 访问模型和加固
