---
summary: "Zalo bot 支持状态、功能和配置"
read_when:
  - Working on Zalo features or webhooks
title: "Zalo"
---

# Zalo (Bot API)

状态：实验性。支持私信。下面的 [Capabilities](#capabilities) 部分反映了当前 Marketplace 机器人的行为。

## 捆绑插件

在当前的 OpenClaw 版本中，Zalo 作为捆绑插件提供，因此正常的打包版本不需要单独安装。

如果您使用的是旧版本或排除了 Zalo 的自定义安装，请手动安装：

- 通过 CLI 安装：`openclaw plugins install @openclaw/zalo`
- 或者从源代码检出：`openclaw plugins install ./path/to/local/zalo-plugin`
- 详情：[Plugins](/en/tools/plugin)

## 快速设置（初学者）

1. 确保 Zalo 插件可用。
   - 当前的 OpenClaw 打包版本已将其包含在内。
   - 较旧的/自定义安装可以使用上述命令手动添加。
2. 设置 token：
   - 环境变量：`ZALO_BOT_TOKEN=...`
   - 或配置：`channels.zalo.accounts.default.botToken: "..."`。
3. 重启 Gateway（或完成设置）。
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
**Zalo Official Account (OA) bots** 是不同的 Zalo 产品界面，行为可能有所不同。

- 由 Gateway(网关) 拥有的 Zalo Bot API 渠道。
- 确定性路由：回复会发回给 Zalo；模型从不选择渠道。
- 私信共享代理的主会话。
- 下面的 [Capabilities](#capabilities) 部分显示了当前 Marketplace 机器人的支持情况。

## 设置（快速路径）

### 1) 创建 bot token (Zalo Bot Platform)

1. 转到 [https://bot.zaloplatforms.com](https://bot.zaloplatforms.com) 并登录。
2. 创建一个新的 bot 并配置其设置。
3. 复制完整的机器人令牌（通常是 `numeric_id:secret`）。对于 Marketplace 机器人，可用的运行时令牌可能会在创建后出现在机器人的欢迎消息中。

### 2) 配置 token (env 或 config)

示例：

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

如果您稍后转到可以使用群组的 Zalo 机器人界面，可以显式添加特定于群的配置，例如 `groupPolicy` 和 `groupAllowFrom`。有关当前 Marketplace 机器人的行为，请参阅 [Capabilities](#capabilities)。

环境变量选项：`ZALO_BOT_TOKEN=...`（仅适用于默认帐户）。

多帐户支持：使用 `channels.zalo.accounts` 配置每个帐户的令牌和可选的 `name`。

3. 重启 Gateway。当解析到 token（env 或 config）时，Zalo 会启动。
4. 私信访问默认为配对。首次联系 bot 时批准代码。

## 工作原理（行为）

- 入站消息会被标准化为带有媒体占位符的共享渠道信封。
- 回复总是路由回同一个 Zalo 聊天。
- 默认使用长轮询；可通过 `channels.zalo.webhookUrl` 使用 Webhook 模式。

## 限制

- 出站文本会被分块为 2000 个字符（Zalo API 限制）。
- 媒体下载/上传受 `channels.zalo.mediaMaxMb` 限制（默认为 5）。
- 由于 2000 个字符的限制，流式传输默认被阻止，因为流式传输的作用降低。

## 访问控制（私信）

### 私信访问

- 默认值：`channels.zalo.dmPolicy = "pairing"`。未知发件人将收到配对码；消息在获得批准前将被忽略（配对码在 1 小时后过期）。
- 通过以下方式批准：
  - `openclaw pairing list zalo`
  - `openclaw pairing approve zalo <CODE>`
- 配对是默认的令牌交换方式。详情：[Pairing](/en/channels/pairing)
- `channels.zalo.allowFrom` 接受数字用户 ID（无法进行用户名查找）。

## 访问控制（群组）

对于 **Zalo Bot Creator / Marketplace 机器人**，实际上无法提供群组支持，因为机器人根本无法添加到群组中。

这意味着以下与群组相关的配置键存在于架构中，但对于 Marketplace 机器人不可用：

- `channels.zalo.groupPolicy` 控制群组入站处理：`open | allowlist | disabled`。
- `channels.zalo.groupAllowFrom` 限制哪些发件人 ID 可以在群组中触发机器人。
- 如果 `groupAllowFrom` 未设置，Zalo 将回退到 `allowFrom` 进行发件人检查。
- 运行时注意：如果完全缺少 `channels.zalo`，为了安全起见，运行时仍会回退到 `groupPolicy="allowlist"`。

群组策略值（当您的机器人界面支持群组访问时）包括：

- `groupPolicy: "disabled"` — 阻止所有群组消息。
- `groupPolicy: "open"` — 允许任何群组成员（提及限制）。
- `groupPolicy: "allowlist"` — 默认失败关闭；仅接受允许的发件人。

如果您使用的是不同的 Zalo 机器人产品界面并已验证群组行为有效，请单独记录该情况，而不是假设它与 Marketplace 机器人流程匹配。

## 长轮询与 Webhook

- 默认值：长轮询（不需要公共 URL）。
- Webhook 模式：设置 `channels.zalo.webhookUrl` 和 `channels.zalo.webhookSecret`。
  - Webhook 密钥长度必须在 8 到 256 个字符之间。
  - Webhook URL 必须使用 HTTPS。
  - Zalo 发送的事件带有 `X-Bot-Api-Secret-Token` 标头用于验证。
  - Gateway HTTP 在 `channels.zalo.webhookPath` 处理 webhook 请求（默认为 webhook URL 路径）。
  - 请求必须使用 `Content-Type: application/json`（或 `+json` 媒体类型）。
  - 重复事件（`event_name + message_id`）在短暂的重放窗口内将被忽略。
  - 突发流量按路径/源进行速率限制，并可能返回 HTTP 429。

**注意：** 根据 Zalo API 文档，getUpdates（轮询）和 webhook 互斥。

## 支持的消息类型

有关快速支持的快照，请参阅[功能](#capabilities)。下面的注释在行为需要额外上下文的地方添加了详细信息。

- **文本消息**：完全支持，具有 2000 字符的分块功能。
- **文本中的纯 URL**：表现与普通文本输入类似。
- **链接预览 / 富链接卡片**：请参阅[功能](#capabilities)中的 Marketplace-bot 状态；它们无法可靠地触发回复。
- **图片消息**：请参阅[功能](#capabilities)中的 Marketplace-bot 状态；入站图片处理不可靠（有正在输入指示器但没有最终回复）。
- **贴纸**：请参阅[功能](#capabilities)中的 Marketplace-bot 状态。
- **语音笔记 / 音频文件 / 视频 / 通用文件附件**：请参阅[功能](#capabilities)中的 Marketplace-bot 状态。
- **不支持的类型**：已记录（例如，来自受保护用户的消息）。

## 功能

此表总结了 OpenClaw 中当前的 **Zalo Bot Creator / Marketplace bot** 行为。

| 功能                   | 状态                               |
| ---------------------- | ---------------------------------- |
| 私信                   | ✅ 支持                            |
| 群组                   | ❌ Marketplace bot 不可用          |
| 媒体（入站图片）       | ⚠️ 受限 / 请在您的环境中验证       |
| 媒体（出站图片）       | ⚠️ 未针对 Marketplace bot 重新测试 |
| 文本中的纯 URL         | ✅ 支持                            |
| 链接预览               | ⚠️ 对于 Marketplace bot 不可靠     |
| 回应                   | ❌ 不支持                          |
| 贴纸                   | ⚠️ Marketplace bot 无客服回复      |
| 语音笔记 / 音频 / 视频 | ⚠️ Marketplace bot 无客服回复      |
| 文件附件               | ⚠️ Marketplace bot 无客服回复      |
| 话题                   | ❌ 不支持                          |
| 投票                   | ❌ 不支持                          |
| 原生命令               | ❌ 不支持                          |
| 流式传输               | ⚠️ 受阻（2000 字符限制）           |

## 投递目标 (CLI/cron)

- 使用聊天 ID 作为目标。
- 示例：`openclaw message send --channel zalo --target 123456789 --message "hi"`。

## 故障排除

**Bot 不响应：**

- 检查令牌是否有效：`openclaw channels status --probe`
- 验证发送者已获批准（配对或 allowFrom）
- 检查网关日志：`openclaw logs --follow`

**Webhook 未接收事件：**

- 确保 Webhook URL 使用 HTTPS
- 验证密令为 8-256 个字符
- 确认网关 HTTP 端点在配置的路径上可访问
- 检查 getUpdates 轮询是否未运行（它们互斥）

## 配置参考 (Zalo)

完整配置：[配置](/en/gateway/configuration)

扁平的顶级键（`channels.zalo.botToken`、`channels.zalo.dmPolicy` 等）是旧版单账户简写形式。对于新配置，建议使用 `channels.zalo.accounts.<id>.*`。由于这两种形式都存在于 schema 中，因此此处均进行了记录。

提供商选项：

- `channels.zalo.enabled`：启用/禁用渠道启动。
- `channels.zalo.botToken`：来自 Zalo Bot Platform 的 bot 令牌。
- `channels.zalo.tokenFile`：从常规文件路径读取令牌。拒绝符号链接。
- `channels.zalo.dmPolicy`：`pairing | allowlist | open | disabled`（默认值：pairing）。
- `channels.zalo.allowFrom`：私信允许列表（用户 ID）。`open` 需要 `"*"`。向导将询问数字 ID。
- `channels.zalo.groupPolicy`：`open | allowlist | disabled`（默认值：allowlist）。存在于配置中；有关当前 Marketplace-bot 行为，请参阅 [Capabilities](#capabilities) 和 [Access control (Groups)](#access-control-groups)。
- `channels.zalo.groupAllowFrom`：群组发送者允许列表（用户 ID）。未设置时回退到 `allowFrom`。
- `channels.zalo.mediaMaxMb`：入站/出站媒体上限（MB，默认 5）。
- `channels.zalo.webhookUrl`：启用 webhook 模式（需要 HTTPS）。
- `channels.zalo.webhookSecret`：webhook 密钥（8-256 个字符）。
- `channels.zalo.webhookPath`：网关 HTTP 服务器上的 webhook 路径。
- `channels.zalo.proxy`：API 请求的代理 URL。

多账户选项：

- `channels.zalo.accounts.<id>.botToken`：每账户令牌。
- `channels.zalo.accounts.<id>.tokenFile`：每账户常规令牌文件。拒绝符号链接。
- `channels.zalo.accounts.<id>.name`：显示名称。
- `channels.zalo.accounts.<id>.enabled`：启用/禁用账户。
- `channels.zalo.accounts.<id>.dmPolicy`：每账户私信策略。
- `channels.zalo.accounts.<id>.allowFrom`：每账户允许列表。
- `channels.zalo.accounts.<id>.groupPolicy`：每账户群组策略。存在于配置中；有关当前 Marketplace-bot 行为，请参阅 [Capabilities](#capabilities) 和 [Access control (Groups)](#access-control-groups)。
- `channels.zalo.accounts.<id>.groupAllowFrom`：每账户群组发送者允许列表。
- `channels.zalo.accounts.<id>.webhookUrl`: 每个账户的 Webhook URL。
- `channels.zalo.accounts.<id>.webhookSecret`: 每个账户的 Webhook 密钥。
- `channels.zalo.accounts.<id>.webhookPath`: 每个账户的 Webhook 路径。
- `channels.zalo.accounts.<id>.proxy`: 每个账户的代理 URL。

## 相关

- [Channels Overview](/en/channels) — 所有支持的渠道
- [Pairing](/en/channels/pairing) — 私信身份验证和配对流程
- [Groups](/en/channels/groups) — 群聊行为和提及控制
- [Channel Routing](/en/channels/channel-routing) — 消息的会话路由
- [Security](/en/gateway/security) — 访问模型和加固
