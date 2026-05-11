---
summary: "Zalo bot 支持状态、功能和配置"
read_when:
  - Working on Zalo features or webhooks
title: "Zalo"
---

状态：实验性。支持私信。下面的[功能](#capabilities)部分反映了当前 Marketplace 机器人的行为。

## 捆绑插件

Zalo 作为捆绑插件包含在当前的 OpenClaw 版本中，因此正常的打包版本不需要单独安装。

如果您使用的是旧版本或排除了 Zalo 的自定义安装，请手动安装：

- 通过 CLI 安装：`openclaw plugins install @openclaw/zalo`
- 或者从源代码检出安装：`openclaw plugins install ./path/to/local/zalo-plugin`
- 详情：[插件](/zh/tools/plugin)

## 快速设置（初学者）

1. 确保 Zalo 插件可用。
   - 当前的打包 OpenClaw 版本已将其捆绑在内。
   - 旧版本或自定义安装可以使用上述命令手动添加。
2. 设置令牌：
   - 环境变量：`ZALO_BOT_TOKEN=...`
   - 或配置文件：`channels.zalo.accounts.default.botToken: "..."`。
3. 重启网关（或完成设置）。
4. 私信访问默认为配对模式；首次联系时批准配对码。

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

Zalo 是一款专注于越南市场的消息应用；其机器人 API 允许 Gateway(网关) 运行用于 1:1 对话的机器人。
它非常适合支持或通知场景，尤其是当您希望确定性地路由回 Zalo 时。

本页面反映了当前 OpenClaw 针对 **Zalo 机器人创建者 / Marketplace 机器人** 的行为。
**Zalo 官方账号 (OA) 机器人** 是不同的 Zalo 产品界面，行为可能有所不同。

- 一个由 Zalo 拥有的 API 机器人 Gateway(网关) 渠道。
- 确定性路由：回复将发回 Zalo；模型永远不会选择渠道。
- 私信共享代理的主会话。
- 下面的[功能](#capabilities)部分显示了当前 Marketplace 机器人的支持情况。

## 设置（快速路径）

### 1) 创建机器人令牌 (Zalo 机器人平台)

1. 前往 [https://bot.zaloplatforms.com](https://bot.zaloplatforms.com) 并登录。
2. 创建一个新机器人并配置其设置。
3. 复制完整的机器人令牌（通常为 `numeric_id:secret`）。对于 Marketplace 机器人，可用的运行时令牌可能会在创建后显示在机器人的欢迎消息中。

### 2) 配置令牌（环境变量或配置文件）

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

如果您之后迁移到支持群组的 Zalo 机器人界面，可以显式添加特定于群组的配置，例如 `groupPolicy` 和 `groupAllowFrom`。有关当前 Marketplace 机器人的行为，请参阅[功能](#capabilities)。

环境变量选项：`ZALO_BOT_TOKEN=...`（仅适用于默认账户）。

多账户支持：使用 `channels.zalo.accounts` 配置针对每个账户的令牌以及可选的 `name`。

3. 重启网关。当令牌（环境变量或配置）解析成功后，Zalo 即会启动。
4. 私信访问默认为配对模式。当首次联系机器人时，请批准验证码。

## 工作原理（行为）

- 入站消息被标准化为带有媒体占位符的共享渠道信封格式。
- 回复始终路由回同一个 Zalo 聊天。
- 默认使用长轮询；通过 `channels.zalo.webhookUrl` 可使用 Webhook 模式。

## 限制

- 出站文本被分块为 2000 个字符（Zalo API 限制）。
- 媒体下载/上传受 `channels.zalo.mediaMaxMb` 限制（默认为 5）。
- 由于 2000 字符的限制使得流式传输用处不大，因此默认情况下阻止流式传输。

## 访问控制（私信）

### 私信访问

- 默认值：`channels.zalo.dmPolicy = "pairing"`。未知发送者会收到配对码；在批准之前消息将被忽略（验证码在 1 小时后过期）。
- 批准方式：
  - `openclaw pairing list zalo`
  - `openclaw pairing approve zalo <CODE>`
- 配对是默认的令牌交换方式。详情：[配对](/zh/channels/pairing)
- `channels.zalo.allowFrom` 接受数字用户 ID（无法查找用户名）。

## 访问控制（群组）

对于 **Zalo 机器人创建者 / Marketplace 机器人**，实际上不支持群组，因为机器人根本无法被添加到群组中。

这意味着虽然以下与群组相关的配置键存在于架构中，但对于 Marketplace 机器人是不可用的：

- `channels.zalo.groupPolicy` 控制群组入站处理：`open | allowlist | disabled`。
- `channels.zalo.groupAllowFrom` 限制哪些发送者 ID 可以在群组中触发机器人。
- 如果未设置 `groupAllowFrom`，Zalo 将回退到 `allowFrom` 进行发送者检查。
- 运行时说明：如果完全缺少 `channels.zalo`，出于安全考虑，运行时仍会回退到 `groupPolicy="allowlist"`。

群组策略值（当您的机器人表面可用群组访问时）包括：

- `groupPolicy: "disabled"` — 阻止所有群组消息。
- `groupPolicy: "open"` — 允许任何群组成员（需提及触发）。
- `groupPolicy: "allowlist"` — 默认为 fail-closed（拒绝未授权）；仅接受允许的发件人。

如果您使用不同的 Zalo 机器人产品界面并已验证群组行为正常，请单独记录该行为，而不是假设其与 Marketplace 机器人的流程一致。

## 长轮询与 Webhook

- 默认：长轮询（无需公共 URL）。
- Webhook 模式：设置 `channels.zalo.webhookUrl` 和 `channels.zalo.webhookSecret`。
  - Webhook 密钥必须是 8-256 个字符。
  - Webhook URL 必须使用 HTTPS。
  - Zalo 发送带有 `X-Bot-Api-Secret-Token` 标头的事件以进行验证。
  - Gateway HTTP 在 `channels.zalo.webhookPath` 处理 Webhook 请求（默认为 Webhook URL 路径）。
  - 请求必须使用 `Content-Type: application/json`（或 `+json` 媒体类型）。
  - 重复事件（`event_name + message_id`）在短暂的重放窗口内将被忽略。
  - 突发流量会按路径/来源进行速率限制，并可能返回 HTTP 429。

**注意：** 根据 Zalo API 文档，getUpdates（轮询）和 webhook 是互斥的。

## 支持的消息类型

有关快速支持快照，请参阅 [Capabilities](#capabilities)。下文注释在行为需要额外背景的地方添加了详细信息。

- **文本消息**：完全支持，包含 2000 字符的分块。
- **文本中的纯 URL**：行为类似于普通文本输入。
- **链接预览 / 富链接卡片**：请参阅 [Capabilities](#capabilities) 中的 Marketplace 机器人状态；它们不能可靠地触发回复。
- **图片消息**：请参阅 [Capabilities](#capabilities) 中的 Marketplace 机器人状态；入站图片处理不可靠（有正在输入指示器但没有最终回复）。
- **贴纸**：请参阅 [Capabilities](#capabilities) 中的 Marketplace 机器人状态。
- **语音笔记 / 音频文件 / 视频 / 通用文件附件**：请参阅 [Capabilities](#capabilities) 中的 Marketplace 机器人状态。
- **不支持的类型**：已记录（例如，来自受保护用户的消息）。

## 功能

下表总结了 OpenClaw 中当前的 **Zalo Bot Creator / Marketplace 机器人**的行为。

| 功能                   | 状态                                     |
| ---------------------- | ---------------------------------------- |
| 私信                   | ✅ 支持                                  |
| 群组                   | ❌ Marketplace 机器人不可用              |
| 媒体（入站图片）       | ⚠️ 有限 / 请在你的环境中验证             |
| 媒体（出站图片）       | ⚠️ 未针对 Marketplace 机器人进行重新测试 |
| 文本中的纯 URL         | ✅ 已支持                                |
| 链接预览               | ⚠️ 对于 Marketplace 机器人不可靠         |
| 反应                   | ❌ 不支持                                |
| 贴纸                   | ⚠️ Marketplace 机器人无代理回复          |
| 语音笔记 / 音频 / 视频 | ⚠️ Marketplace 机器人无代理回复          |
| 文件附件               | ⚠️ Marketplace 机器人无代理回复          |
| 线程                   | ❌ 不支持                                |
| 投票                   | ❌ 不支持                                |
| 原生命令               | ❌ 不支持                                |
| 流式传输               | ⚠️ 已阻止（2000 字符限制）               |

## 投递目标 (CLI/cron)

- 使用聊天 ID 作为目标。
- 示例：`openclaw message send --channel zalo --target 123456789 --message "hi"`。

## 故障排除

**机器人无响应：**

- 检查令牌是否有效：`openclaw channels status --probe`
- 验证发件人是否已获批准（配对或 allowFrom）
- 检查网关日志：`openclaw logs --follow`

**Webhook 未接收到事件：**

- 确保 Webhook URL 使用 HTTPS
- 验证密钥令牌长度为 8-256 个字符
- 确认网关 HTTP 端点在配置的路径上可访问
- 检查 getUpdates 轮询是否未运行（两者互斥）

## 配置参考 (Zalo)

完整配置：[配置](/zh/gateway/configuration)

扁平的顶级键（`channels.zalo.botToken`、`channels.zalo.dmPolicy` 等）是传统的单账户简写形式。对于新配置，建议使用 `channels.zalo.accounts.<id>.*`。由于这两种形式都存在于模式中，因此此处都进行了记录。

提供商选项：

- `channels.zalo.enabled`：启用/禁用渠道启动。
- `channels.zalo.botToken`：来自 Zalo 机器人平台的机器人令牌。
- `channels.zalo.tokenFile`：从常规文件路径读取令牌。拒绝符号链接。
- `channels.zalo.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.zalo.allowFrom`：私信允许列表（用户 ID）。`open` 需要 `"*"`。向导将询问数字 ID。
- `channels.zalo.groupPolicy`: `open | allowlist | disabled`（默认：allowlist）。存在于配置中；有关当前 Marketplace-bot 行为，请参阅 [Capabilities](#capabilities) 和 [Access control (Groups)](#access-control-groups)。
- `channels.zalo.groupAllowFrom`: 群组发送者白名单（用户 ID）。未设置时回退到 `allowFrom`。
- `channels.zalo.mediaMaxMb`: 入站/出站媒体限制（MB，默认为 5）。
- `channels.zalo.webhookUrl`: 启用 webhook 模式（需要 HTTPS）。
- `channels.zalo.webhookSecret`: webhook 密钥（8-256 个字符）。
- `channels.zalo.webhookPath`: 网关 HTTP 服务器上的 webhook 路径。
- `channels.zalo.proxy`: API 请求的代理 URL。

多账户选项：

- `channels.zalo.accounts.<id>.botToken`: 每个账户的令牌。
- `channels.zalo.accounts.<id>.tokenFile`: 每个账户的常规令牌文件。拒绝符号链接。
- `channels.zalo.accounts.<id>.name`: 显示名称。
- `channels.zalo.accounts.<id>.enabled`: 启用/禁用账户。
- `channels.zalo.accounts.<id>.dmPolicy`: 每个账户的私信策略。
- `channels.zalo.accounts.<id>.allowFrom`: 每个账户的白名单。
- `channels.zalo.accounts.<id>.groupPolicy`: 每个账户的群组策略。存在于配置中；有关当前 Marketplace-bot 行为，请参阅 [Capabilities](#capabilities) 和 [Access control (Groups)](#access-control-groups)。
- `channels.zalo.accounts.<id>.groupAllowFrom`: 每个账户的群组发送者白名单。
- `channels.zalo.accounts.<id>.webhookUrl`: 每个账户的 webhook URL。
- `channels.zalo.accounts.<id>.webhookSecret`: 每个账户的 webhook 密钥。
- `channels.zalo.accounts.<id>.webhookPath`: 每个账户的 webhook 路径。
- `channels.zalo.accounts.<id>.proxy`: 每个账户的代理 URL。

## 相关

- [Channels Overview](/zh/channels) — 所有支持的渠道
- [Pairing](/zh/channels/pairing) — 私信认证和配对流程
- [Groups](/zh/channels/groups) — 群聊行为和提及控制
- [Channel Routing](/zh/channels/channel-routing) — 消息的会话路由
- [Security](/zh/gateway/security) — 访问模型和加固
