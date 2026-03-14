---
summary: "Zalo bot 支持状态、功能和配置"
read_when:
  - Working on Zalo features or webhooks
title: "Zalo"
---

# Zalo (Bot API)

状态：实验性。支持私信；在具有明确的群组策略控制的情况下，支持群组处理。

## 需要插件

Zalo 作为插件提供，不包含在核心安装中。

- 通过 CLI 安装： `openclaw plugins install @openclaw/zalo`
- 或者在入职期间选择 **Zalo** 并确认安装提示
- 详情：[插件](/zh/en/tools/plugin)

## 快速设置（初学者）

1. 安装 Zalo 插件：
   - 从源代码检出： `openclaw plugins install ./extensions/zalo`
   - 从 npm（如果已发布）： `openclaw plugins install @openclaw/zalo`
   - 或者在引导流程中选择 **Zalo** 并确认安装提示
2. 设置令牌：
   - 环境变量： `ZALO_BOT_TOKEN=...`
   - 或配置文件： `channels.zalo.botToken: "..."`。
3. 重启网关（或完成入职）。
4. 私信访问默认为配对模式；在首次联系时批准配对码。

最小配置：

```json5
{
  channels: {
    zalo: {
      enabled: true,
      botToken: "12345689:abc-xyz",
      dmPolicy: "pairing",
    },
  },
}
```

## 它是什么

Zalo 是一款专注于越南市场的消息应用程序；其 Bot API 允许 Gateway 网关 运行用于 1:1 对话的机器人。
它非常适合需要确定性地路由回 Zalo 的支持或通知场景。

- 由 Gateway 网关 拥有的 Zalo Bot API 通道。
- 确定性路由：回复将发回 Zalo；模型从不选择通道。
- 私信与代理的主会话共享。
- 群组支持策略控制（`groupPolicy` + `groupAllowFrom`）并默认为失效时关闭的允许列表行为。

## 设置（快速路径）

### 1) 创建机器人令牌 (Zalo Bot Platform)

1. 前往 [https://bot.zaloplatforms.com](https://bot.zaloplatforms.com) 并登录。
2. 创建一个新机器人并配置其设置。
3. 复制 bot token（格式： `12345689:abc-xyz`）。

### 2) 配置令牌（环境变量或配置文件）

示例：

```json5
{
  channels: {
    zalo: {
      enabled: true,
      botToken: "12345689:abc-xyz",
      dmPolicy: "pairing",
    },
  },
}
```

环境变量选项： `ZALO_BOT_TOKEN=...` （仅适用于默认账户）。

多账户支持：使用 `channels.zalo.accounts` 配置每个账户的 token，并可选 `name`。

3. 重启网关。当令牌被解析（环境变量或配置文件）时，Zalo 将启动。
4. 私信访问默认为配对模式。当机器人首次被联系时，请批准该代码。

## 工作原理（行为）

- 传入消息被规范化为带有媒体占位符的共享通道信封。
- 回复始终路由回同一个 Zalo 聊天。
- 默认使用长轮询；Webhook 模式可通过 `channels.zalo.webhookUrl` 启用。

## 限制

- 发出的文本被分块为 2000 个字符（Zalo API 限制）。
- 媒体下载/上传受 `channels.zalo.mediaMaxMb` 限制（默认为 5）。
- 由于 2000 个字符的限制使得流式传输用处降低，因此默认阻止流式传输。

## 访问控制（私信）

### 私信访问

- 默认值： `channels.zalo.dmPolicy = "pairing"`。未知发送者将收到配对码；在批准之前消息将被忽略（配对码在 1 小时后过期）。
- 通过以下方式批准：
  - `openclaw pairing list zalo`
  - `openclaw pairing approve zalo <CODE>`
- 配对是默认的令牌交换方式。详情：[配对](/zh/en/channels/pairing)
- `channels.zalo.allowFrom` 接受数字用户 ID（无法进行用户名查找）。

## 访问控制（群组）

- `channels.zalo.groupPolicy` 控制群组入站处理： `open | allowlist | disabled`。
- 默认行为是失效时关闭： `allowlist`。
- `channels.zalo.groupAllowFrom` 限制哪些发送者 ID 可以在群组中触发 bot。
- 如果未设置 `groupAllowFrom`，Zalo 将回退到 `allowFrom` 进行发送者检查。
- `groupPolicy: "disabled"` 阻止所有群组消息。
- `groupPolicy: "open"` 允许任何群组成员（受提及限制）。
- 运行时注意：如果完全缺少 `channels.zalo`，为了安全起见，运行时仍会回退到 `groupPolicy="allowlist"`。

## 长轮询 vs Webhook

- 默认：长轮询（不需要公共 URL）。
- Webhook 模式：设置 `channels.zalo.webhookUrl` 和 `channels.zalo.webhookSecret`。
 - Webhook 密钥必须为 8-256 个字符。 - Webhook URL 必须使用 HTTPS。 - Zalo 发送带有 `X-Bot-Api-Secret-Token` header 的事件以进行验证。 - Gateway 网关 HTTP 在 `channels.zalo.webhookPath` 处处理 webhook 请求（默认为 webhook URL 路径）。 - 请求必须使用 `Content-Type: application/json`（或 `+json` 媒体类型）。 - 重复事件（`event_name + message_id`）在短时间内重放窗口内将被忽略。 - 突发流量会根据路径/源进行速率限制，并可能返回 HTTP 429。

**注意：** 根据 Zalo API 文档，getUpdates（轮询）和 webhook 互斥。

## 支持的消息类型

- **文本消息**：完全支持，支持 2000 字符分块。
- **图片消息**：下载和处理传入的图片；通过 `sendPhoto` 发送图片。
- **表情贴纸**：已记录但未完全处理（无代理回复）。
- **不支持的类型**：已记录（例如，来自受保护用户的消息）。

## 功能

| 功能         | 状态                                                   |
| --------------- | -------------------------------------------------------- |
| 直发消息 | ✅ 支持                                             |
| 群组          | ⚠️ 支持但需策略控制（默认为白名单） |
| 媒体（图片）  | ✅ 支持                                             |
| 反应       | ❌ 不支持                                         |
| 线程         | ❌ 不支持                                         |
| 投票           | ❌ 不支持                                         |
| 原生命令 | ❌ 不支持                                         |
| 流式传输       | ⚠️ 受阻（2000 字符限制）                             |

## 投递目标 (CLI/cron)

- 使用聊天 ID 作为目标。
- 示例：`openclaw message send --channel zalo --target 123456789 --message "hi"`。

## 故障排除

**Bot 无响应：**

- 检查 token 是否有效：`openclaw channels status --probe`
- 验证发件人是否已获批准（配对或 allowFrom）
- 检查网关日志：`openclaw logs --follow`

**Webhook 未接收到事件：**

- 确保 Webhook URL 使用 HTTPS
- 验证 Secret Token 为 8-256 个字符
- 确认网关 HTTP 端点在配置路径上可访问
- 检查 getUpdates 轮询是否未运行（它们互斥）

## 配置参考 (Zalo)

完整配置：[Configuration](/zh/en/gateway/configuration)

提供者选项：

- `channels.zalo.enabled`：启用/禁用通道启动。
- `channels.zalo.botToken`：来自 Zalo Bot Platform 的 bot token。
- `channels.zalo.tokenFile`：从常规文件路径读取 token。拒绝符号链接。
- `channels.zalo.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.zalo.allowFrom`：私信 白名单（用户 ID）。`open` 需要 `"*"`。向导会询问数字 ID。
- `channels.zalo.groupPolicy`：`open | allowlist | disabled`（默认：allowlist）。
- `channels.zalo.groupAllowFrom`：群组发送者白名单（用户 ID）。未设置时回退到 `allowFrom`。
- `channels.zalo.mediaMaxMb`：入站/出站媒体上限（MB，默认 5）。
- `channels.zalo.webhookUrl`：启用 webhook 模式（需要 HTTPS）。
- `channels.zalo.webhookSecret`：webhook 密钥（8-256 个字符）。
- `channels.zalo.webhookPath`：网关 HTTP 服务器上的 webhook 路径。
- `channels.zalo.proxy`: API 请求的代理 URL。

多账户选项：

- `channels.zalo.accounts.<id>.botToken`: 每个账号的令牌。
- `channels.zalo.accounts.<id>.tokenFile`: 每个账号的常规令牌文件。拒绝使用符号链接。
- `channels.zalo.accounts.<id>.name`: 显示名称。
- `channels.zalo.accounts.<id>.enabled`: 启用/禁用账号。
- `channels.zalo.accounts.<id>.dmPolicy`: 每个账号的私信（私信）策略。
- `channels.zalo.accounts.<id>.allowFrom`: 每个账号的允许列表。
- `channels.zalo.accounts.<id>.groupPolicy`: 每个账号的群组策略。
- `channels.zalo.accounts.<id>.groupAllowFrom`: 每个账号的群组发送者允许列表。
- `channels.zalo.accounts.<id>.webhookUrl`: 每个账号的 Webhook URL。
- `channels.zalo.accounts.<id>.webhookSecret`: 每个账号的 Webhook 密钥。
- `channels.zalo.accounts.<id>.webhookPath`: 每个账号的 Webhook 路径。
- `channels.zalo.accounts.<id>.proxy`: 每个账号的代理 URL。

import zh from '/components/footer/zh.mdx';

<zh />
