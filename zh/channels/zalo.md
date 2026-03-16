---
summary: "Zalo bot 支持状态、功能和配置"
read_when:
  - Working on Zalo features or webhooks
title: "Zalo"
---

# Zalo (Bot API)

状态：实验性。支持私信。下面的 [Capabilities](#capabilities) 部分反映了当前 Marketplace-bot 的行为。

## 需要插件

Zalo 作为插件提供，不包含在核心安装中。

- 通过 CLI 安装： `openclaw plugins install @openclaw/zalo`
- 或者在入职期间选择 **Zalo** 并确认安装提示
- 详情：[Plugins](/en/tools/plugin)

## 快速设置（初学者）

1. 安装 Zalo 插件：
   - 从源代码检出：`openclaw plugins install ./extensions/zalo`
   - 从 npm（如果已发布）：`openclaw plugins install @openclaw/zalo`
   - 或者在新手引导中选择 **Zalo** 并确认安装提示
2. 设置 token：
   - 环境变量：`ZALO_BOT_TOKEN=...`
   - 或者配置：`channels.zalo.accounts.default.botToken: "..."`。
3. 重启 Gateway 网关（或完成新手引导）。
4. 私信访问默认为配对模式；在首次联系时批准配对码。

最小配置：

```json5
{
  channels: {
    zalo: {
      enabled: true,
      accounts: {
        default: {
          botToken: "12345689:abc-xyz",
          dmPolicy: "pairing",
        },
      },
    },
  },
}
```

## 简介

Zalo 是一款面向越南的通讯应用；其 Bot API 允许 Gateway(网关) 运行机器人以进行 1:1 对话。
它非常适合支持或通知场景，尤其是在您希望确定性地路由回 Zalo 时。

本页面反映了当前 OpenClaw 针对 **Zalo Bot Creator / Marketplace bots** 的行为。
**Zalo Official Account (OA) bots** 是不同的 Zalo 产品界面，其行为可能有所不同。

- 一个由 Gateway 拥有的 Zalo Bot API 渠道。
- 确定性路由：回复发回 Zalo；模型从不选择渠道。
- 私信共享代理的主会话。
- 下面的 [Capabilities](#capabilities) 部分显示了当前 Marketplace-bot 的支持情况。

## Setup (fast path)

### 1) Create a bot token (Zalo Bot Platform)

1. Go to [https://bot.zaloplatforms.com](https://bot.zaloplatforms.com) and sign in.
2. Create a new bot and configure its settings.
3. Copy the full bot token (typically `numeric_id:secret`). For Marketplace bots, the usable runtime token may appear in the bot's welcome message after creation.

### 2) Configure the token (env or config)

Example:

```json5
{
  channels: {
    zalo: {
      enabled: true,
      accounts: {
        default: {
          botToken: "12345689:abc-xyz",
          dmPolicy: "pairing",
        },
      },
    },
  },
}
```

If you later move to a Zalo bot surface where groups are available, you can add group-specific config such as `groupPolicy` and `groupAllowFrom` explicitly. For current Marketplace-bot behavior, see [Capabilities](#capabilities).

Env option: `ZALO_BOT_TOKEN=...` (works for the default account only).

Multi-account support: use `channels.zalo.accounts` with per-account tokens and optional `name`.

3. Restart the gateway. Zalo starts when a token is resolved (env or config).
4. 私信 access defaults to pairing. Approve the code when the bot is first contacted.

## How it works (behavior)

- Inbound messages are normalized into the shared 渠道 envelope with media placeholders.
- Replies always route back to the same Zalo chat.
- Long-polling by default; webhook mode available with `channels.zalo.webhookUrl`.

## Limits

- Outbound text is chunked to 2000 characters (Zalo API limit).
- Media downloads/uploads are capped by `channels.zalo.mediaMaxMb` (default 5).
- Streaming is blocked by default due to the 2000 char limit making streaming less useful.

## Access control (私信)

### 私信 access

- 默认值：`channels.zalo.dmPolicy = "pairing"`。未知发件人会收到配对码；消息在被批准前将被忽略（配对码 1 小时后过期）。
- 通过以下方式批准：
  - `openclaw pairing list zalo`
  - `openclaw pairing approve zalo <CODE>`
- 配对是默认的令牌交换。详情：[Pairing](/en/channels/pairing)
- `channels.zalo.allowFrom` 接受数字用户 ID（无法通过用户名查找）。

## 访问控制（群组）

对于 **Zalo Bot Creator / Marketplace bots**，实际上不支持群组，因为根本无法将 Bot 添加到群组中。

这意味着下面与群组相关的配置键存在于架构中，但对于 Marketplace bots 不可用：

- `channels.zalo.groupPolicy` 控制群组入站处理：`open | allowlist | disabled`。
- `channels.zalo.groupAllowFrom` 限制哪些发件人 ID 可以在群组中触发 Bot。
- 如果未设置 `groupAllowFrom`，Zalo 将回退到 `allowFrom` 进行发件人检查。
- 运行时说明：如果完全缺少 `channels.zalo`，为了安全起见，运行时仍然会回退到 `groupPolicy="allowlist"`。

群组策略值（当您的 Bot 表面支持群组访问时）包括：

- `groupPolicy: "disabled"` — 阻止所有群组消息。
- `groupPolicy: "open"` — 允许任何群组成员（提及控制）。
- `groupPolicy: "allowlist"` — 默认失败关闭；仅接受允许的发件人。

如果您使用的是不同的 Zalo Bot 产品表面并已验证了可用的群组行为，请单独记录该行为，而不是假设它与 Marketplace-bot 流程相匹配。

## 长轮询 vs Webhook

- 默认值：长轮询（不需要公共 URL）。
- Webhook 模式：设置 `channels.zalo.webhookUrl` 和 `channels.zalo.webhookSecret`。
  - Webhook 密钥必须是 8-256 个字符。
  - Webhook URL 必须使用 HTTPS。
  - Zalo 发送带有 `X-Bot-Api-Secret-Token` 标头的事件以进行验证。
  - Gateway(网关) HTTP 在 `channels.zalo.webhookPath` 处理 Webhook 请求（默认为 Webhook URL 路径）。
  - 请求必须使用 `Content-Type: application/json`（或 `+json` 媒体类型）。
  - 重复事件（`event_name + message_id`）在短时间内重放窗口内会被忽略。
  - 突发流量按路径/源进行速率限制，可能会返回 HTTP 429。

**注意：** 根据 Zalo API 文档，getUpdates（轮询）和 webhook 互斥。

## 支持的消息类型

有关支持情况的快速概览，请参阅 [功能](#capabilities)。下方的注释在行为需要额外上下文时添加了详细信息。

- **文本消息**：完全支持，支持 2000 字符的分块。
- **文本中的纯 URL**：行为与普通文本输入相同。
- **链接预览 / 富链接卡片**：请参阅 [功能](#capabilities) 中的 Marketplace-bot 状态；它们无法可靠地触发回复。
- **图片消息**：请参阅 [功能](#capabilities) 中的 Marketplace-bot 状态；入站图片处理不可靠（只有正在输入指示器，没有最终回复）。
- **表情贴纸**：请参阅 [功能](#capabilities) 中的 Marketplace-bot 状态。
- **语音笔记 / 音频文件 / 视频 / 通用文件附件**：请参阅 [功能](#capabilities) 中的 Marketplace-bot 状态。
- **不支持的类型**：已记录（例如，来自受保护用户的消息）。

## 功能

此表总结了当前 **Zalo Bot Creator / Marketplace bot** 在 OpenClaw 中的行为。

| 功能                   | 状态                               |
| ---------------------- | ---------------------------------- |
| 私信                   | ✅ 已支持                          |
| 群组                   | ❌ Marketplace bot 不可用          |
| 媒体（入站图片）       | ⚠️ 受限 / 请在你的环境中验证       |
| 媒体（出站图片）       | ⚠️ 未针对 Marketplace bot 重新测试 |
| 文本中的纯 URL         | ✅ 已支持                          |
| 链接预览               | ⚠️ 对于 Marketplace bot 不可靠     |
| 回应 (Reactions)       | ❌ 不支持                          |
| 表情贴纸               | ⚠️ Marketplace bot 无代理回复      |
| 语音笔记 / 音频 / 视频 | ⚠️ Marketplace bot 无代理回复      |
| 文件附件               | ⚠️ Marketplace bot 无代理回复      |
| 话题串 (Threads)       | ❌ 不支持                          |
| 投票 (Polls)           | ❌ 不支持                          |
| 原生命令               | ❌ 不支持                          |
| 流式传输 (Streaming)   | ⚠️ 受阻（2000 字符限制）           |

## 交付目标 (CLI/cron)

- 使用聊天 ID 作为目标。
- 示例：`openclaw message send --channel zalo --target 123456789 --message "hi"`。

## 故障排除

**Bot 不响应：**

- 检查 token 是否有效：`openclaw channels status --probe`
- 验证发件人是否已获批准（配对或 allowFrom）
- 检查网关日志：`openclaw logs --follow`

**Webhook 未接收事件：**

- 确保 webhook URL 使用 HTTPS
- 验证 secret token 为 8-256 个字符
- 确认网关 HTTP 端点在配置的路径上可访问
- 检查 getUpdates 轮询是否未运行（两者互斥）

## 配置参考 (Zalo)

完整配置：[Configuration](/en/gateway/configuration)

扁平的顶层键（`channels.zalo.botToken`、`channels.zalo.dmPolicy` 等）是旧版单帐户简写。对于新配置，建议使用 `channels.zalo.accounts.<id>.*`。由于这些形式存在于架构中，因此此处仍记录了这两种形式。

提供商选项：

- `channels.zalo.enabled`：启用/禁用渠道启动。
- `channels.zalo.botToken`：来自 Zalo Bot 平台的 bot token。
- `channels.zalo.tokenFile`：从常规文件路径读取 token。拒绝符号链接。
- `channels.zalo.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.zalo.allowFrom`：私信允许列表（用户 ID）。`open` 需要 `"*"`。向导将询问数字 ID。
- `channels.zalo.groupPolicy`：`open | allowlist | disabled`（默认：allowlist）。存在于配置中；有关当前 Marketplace-bot 行为，请参阅 [Capabilities](#capabilities) 和 [Access control (Groups)](#access-control-groups)。
- `channels.zalo.groupAllowFrom`：群组发件人允许列表（用户 ID）。未设置时回退到 `allowFrom`。
- `channels.zalo.mediaMaxMb`：入站/出站媒体上限（MB，默认 5）。
- `channels.zalo.webhookUrl`：启用 webhook 模式（需要 HTTPS）。
- `channels.zalo.webhookSecret`：webhook 密钥（8-256 个字符）。
- `channels.zalo.webhookPath`：网关 HTTP 服务器上的 webhook 路径。
- `channels.zalo.proxy`：用于 API 请求的代理 URL。

多帐户选项：

- `channels.zalo.accounts.<id>.botToken`：每个帐户的 token。
- `channels.zalo.accounts.<id>.tokenFile`：每个帐户的常规 token 文件。拒绝符号链接。
- `channels.zalo.accounts.<id>.name`：显示名称。
- `channels.zalo.accounts.<id>.enabled`：启用/禁用帐户。
- `channels.zalo.accounts.<id>.dmPolicy`：每个帐户的私信策略。
- `channels.zalo.accounts.<id>.allowFrom`: 每个账号的允许列表。
- `channels.zalo.accounts.<id>.groupPolicy`: 每个账号的群组策略。存在于配置中；有关当前 Marketplace 机器人行为，请参阅 [功能](#capabilities) 和 [访问控制（群组）](#access-control-groups)。
- `channels.zalo.accounts.<id>.groupAllowFrom`: 每个账号的群组发送者允许列表。
- `channels.zalo.accounts.<id>.webhookUrl`: 每个账号的 webhook URL。
- `channels.zalo.accounts.<id>.webhookSecret`: 每个账号的 webhook 密钥。
- `channels.zalo.accounts.<id>.webhookPath`: 每个账号的 webhook 路径。
- `channels.zalo.accounts.<id>.proxy`: 每个账号的代理 URL。

import zh from "/components/footer/zh.mdx";

<zh />
