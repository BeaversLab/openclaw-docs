---
summary: "Zalo 机器人支持状态、功能和配置"
read_when:
  - "Working on Zalo features or webhooks"
title: "Zalo"
---

# Zalo (Bot API)

状态：实验性。仅支持直接消息；根据 Zalo 文档，群组即将推出。

## 需要插件

Zalo 作为插件提供，不与核心安装捆绑在一起。

- 通过 CLI 安装：`openclaw plugins install @openclaw/zalo`
- 或在入门期间选择 **Zalo** 并确认安装提示
- 详情：[Plugins](/zh/plugin)

## 快速设置（初学者）

1. 安装 Zalo 插件：
   - 从源代码 checkout：`openclaw plugins install ./extensions/zalo`
   - 从 npm（如果已发布）：`openclaw plugins install @openclaw/zalo`
   - 或在入门中选择 **Zalo** 并确认安装提示
2. 设置 token：
   - 环境变量：`ZALO_BOT_TOKEN=...`
   - 或配置：`channels.zalo.botToken: "..."`。
3. 重启 gateway（或完成入门）。
4. 直接消息访问默认为配对；在首次联系时批准配对码。

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

Zalo 是一个专注于越南的消息应用；其 Bot API 让 Gateway 可以为 1:1 对话运行机器人。
它非常适合支持或通知，因为你希望确定性地路由回 Zalo。

- 由 Gateway 拥有的 Zalo Bot API 通道。
- 确定性路由：回复回到 Zalo；模型从不选择通道。
- 直接消息共享代理的主会话。
- 尚不支持群组（Zalo 文档说明"即将推出"）。

## 设置（快速路径）

### 1) 创建机器人 token (Zalo Bot Platform)

1. 转到 **https://bot.zaloplatforms.com** 并登录。
2. 创建一个新机器人并配置其设置。
3. 复制机器人 token（格式：`12345689:abc-xyz`）。

### 2) 配置 token（环境变量或配置）

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

环境变量选项：`ZALO_BOT_TOKEN=...`（仅适用于默认账户）。

多账户支持：使用 `channels.zalo.accounts` 与每个账户的 token 和可选的 `name`。

3. 重启 gateway。Zalo 在解析 token（环境变量或配置）时启动。
4. 直接消息访问默认为配对。在机器人首次联系时批准代码。

## 工作原理（行为）

- 入站消息被规范化为带有媒体占位符的共享通道信封。
- 回复总是路由回同一个 Zalo 聊天。
- 默认长轮询；通过 `channels.zalo.webhookUrl` 可用 webhook 模式。

## 限制

- 出站文本被分块为 2000 个字符（Zalo API 限制）。
- 媒体下载/上传受 `channels.zalo.mediaMaxMb` 限制（默认 5）。
- 默认情况下阻止流式传输，因为 2000 字符限制使流式传输用处不大。

## 访问控制（直接消息）

### 直接消息访问

- 默认：`channels.zalo.dmPolicy = "pairing"`。未知发送者收到配对码；消息被忽略直到批准（代码在 1 小时后过期）。
- 通过以下方式批准：
  - `openclaw pairing list zalo`
  - `openclaw pairing approve zalo <CODE>`
- 配对是默认的 token 交换。详情：[Pairing](/zh/start/pairing)
- `channels.zalo.allowFrom` 接受数字用户 ID（没有可用的用户名查找）。

## 长轮询 vs webhook

- 默认：长轮询（不需要公共 URL）。
- Webhook 模式：设置 `channels.zalo.webhookUrl` 和 `channels.zalo.webhookSecret`。
  - webhook 密钥必须是 8-256 个字符。
  - Webhook URL 必须使用 HTTPS。
  - Zalo 发送带有 `X-Bot-Api-Secret-Token` 头的事件以进行验证。
  - Gateway HTTP 在 `channels.zalo.webhookPath` 处理 webhook 请求（默认为 webhook URL 路径）。

**注意：**根据 Zalo API 文档，getUpdates（轮询）和 webhook 互斥。

## 支持的消息类型

- **文本消息**：完全支持，具有 2000 字符分块。
- **图像消息**：下载和处理入站图像；通过 `sendPhoto` 发送图像。
- **贴纸**：已记录但未完全处理（没有代理响应）。
- **不支持的类型**：已记录（例如，来自受保护用户的消息）。

## 功能

| 功能         | 状态                         |
| --------------- | ------------------------------ |
| 直接消息 | ✅ 支持                   |
| 群组          | ❌ 即将推出（根据 Zalo 文档） |
| 媒体（图像）  | ✅ 支持                   |
| 反应       | ❌ 不支持               |
| 线程         | ❌ 不支持               |
| 投票           | ❌ 不支持               |
| 原生命令 | ❌ 不支持               |
| 流式传输       | ⚠️ 阻止（2000 字符限制）   |

## 传递目标（CLI/cron）

- 使用聊天 id 作为目标。
- 示例：`openclaw message send --channel zalo --target 123456789 --message "hi"`。

## 故障排除

**机器人不响应：**

- 检查 token 是否有效：`openclaw channels status --probe`
- 验证发送者是否已获批准（配对或 allowFrom）
- 检查 gateway 日志：`openclaw logs --follow`

**Webhook 未接收事件：**

- 确保 webhook URL 使用 HTTPS
- 验证密钥 token 为 8-256 个字符
- 确认 gateway HTTP 端点在配置的路径上可访问
- 检查 getUpdates 轮询是否未运行（它们互斥）

## 配置参考（Zalo）

完整配置：[Configuration](/zh/gateway/configuration)

提供程序选项：

- `channels.zalo.enabled`：启用/禁用通道启动。
- `channels.zalo.botToken`：来自 Zalo Bot Platform 的机器人 token。
- `channels.zalo.tokenFile`：从文件路径读取 token。
- `channels.zalo.dmPolicy`：`pairing | allowlist | open | disabled`（默认：配对）。
- `channels.zalo.allowFrom`：直接消息允许列表（用户 ID）。`open` 需要 `"*"`。向导将询问数字 ID。
- `channels.zalo.mediaMaxMb`：入站/出站媒体上限（MB，默认 5）。
- `channels.zalo.webhookUrl`：启用 webhook 模式（需要 HTTPS）。
- `channels.zalo.webhookSecret`：webhook 密钥（8-256 个字符）。
- `channels.zalo.webhookPath`：gateway HTTP 服务器上的 webhook 路径。
- `channels.zalo.proxy`：API 请求的代理 URL。

多账户选项：

- `channels.zalo.accounts.<id>.botToken`：每个账户的 token。
- `channels.zalo.accounts.<id>.tokenFile`：每个账户的 token 文件。
- `channels.zalo.accounts.<id>.name`：显示名称。
- `channels.zalo.accounts.<id>.enabled`：启用/禁用账户。
- `channels.zalo.accounts.<id>.dmPolicy`：每个账户的直接消息策略。
- `channels.zalo.accounts.<id>.allowFrom`：每个账户的允许列表。
- `channels.zalo.accounts.<id>.webhookUrl`：每个账户的 webhook URL。
- `channels.zalo.accounts.<id>.webhookSecret`：每个账户的 webhook 密钥。
- `channels.zalo.accounts.<id>.webhookPath`：每个账户的 webhook 路径。
- `channels.zalo.accounts.<id>.proxy`：每个账户的代理 URL。
