---
summary: "Zalo bot 支持状态、能力与配置"
read_when:
  - 开发 Zalo 功能或 webhook
---
# Zalo（Bot API）

状态：实验性。仅支持私聊；群聊根据 Zalo 文档即将支持。

## 需要插件
Zalo 为插件形式，未随核心安装打包。
- CLI 安装：`openclaw plugins install @openclaw/zalo`
- 或在 onboarding 中选择 **Zalo** 并确认安装
- 详情：[Plugins](/zh/plugin)

## 快速设置（新手）
1) 安装 Zalo 插件：
   - 源码检出：`openclaw plugins install ./extensions/zalo`
   - npm（若已发布）：`openclaw plugins install @openclaw/zalo`
   - 或在 onboarding 中选择 **Zalo** 并确认安装
2) 设置 token：
   - 环境变量：`ZALO_BOT_TOKEN=...`
   - 或配置：`channels.zalo.botToken: "..."`。
3) 重启 gateway（或完成 onboarding）。
4) 私聊默认需要配对；首次联系时批准配对码。

最小配置：
```json5
{
  channels: {
    zalo: {
      enabled: true,
      botToken: "12345689:abc-xyz",
      dmPolicy: "pairing"
    }
  }
}
```

## 这是什么
Zalo 是越南地区的消息平台；其 Bot API 允许 Gateway 运行 bot 进行 1:1 对话。
适合支持/通知等需要确定性路由回 Zalo 的场景。
- 由 Gateway 持有的 Zalo Bot API 渠道。
- 路由确定性：回复回到 Zalo；模型不会选择渠道。
- 私聊共享 agent 主会话。
- 群聊尚未支持（Zalo 文档标注 “coming soon”）。

## 设置（快捷路径）

### 1) 创建 bot token（Zalo Bot Platform）
1) 访问 **https://bot.zaloplatforms.com** 并登录。
2) 创建新 bot 并配置设置。
3) 复制 bot token（格式：`12345689:abc-xyz`）。

### 2) 配置 token（环境变量或配置）
示例：

```json5
{
  channels: {
    zalo: {
      enabled: true,
      botToken: "12345689:abc-xyz",
      dmPolicy: "pairing"
    }
  }
}
```

环境变量：`ZALO_BOT_TOKEN=...`（仅适用于默认账号）。

多账号支持：使用 `channels.zalo.accounts` 配置各账号 token 与可选 `name`。

3) 重启 gateway。解析到 token（env 或 config）后 Zalo 启动。
4) 私聊默认需要配对。首次联系时批准配对码。

## 工作方式（行为）
- 入站消息会被规范化为共享渠道 envelope，包含媒体占位。
- 回复始终回到同一 Zalo chat。
- 默认长轮询；设置 `channels.zalo.webhookUrl` 可用 webhook 模式。

## 限制
- 出站文本按 2000 字符分块（Zalo API 限制）。
- 媒体下载/上传上限为 `channels.zalo.mediaMaxMb`（默认 5）。
- 由于 2000 字符上限，流式默认关闭。

## 访问控制（私聊）

### 私聊访问
- 默认：`channels.zalo.dmPolicy = "pairing"`。未知发送者会收到配对码；未批准前消息被忽略（配对码 1 小时过期）。
- 批准命令：
  - `openclaw pairing list zalo`
  - `openclaw pairing approve zalo <CODE>`
- 配对是默认 token 交换机制。详情见 [Pairing](/zh/start/pairing)
- `channels.zalo.allowFrom` 仅接受数字用户 ID（无用户名解析）。

## 长轮询 vs webhook
- 默认：长轮询（无需公网 URL）。
- Webhook 模式：设置 `channels.zalo.webhookUrl` 与 `channels.zalo.webhookSecret`。
  - secret 必须 8-256 字符。
  - webhook URL 必须 HTTPS。
  - Zalo 会以 `X-Bot-Api-Secret-Token` header 发送事件用于校验。
  - gateway 在 `channels.zalo.webhookPath` 处理 webhook（默认取 webhook URL 路径）。

**注意：** 按 Zalo API 文档，getUpdates（轮询）与 webhook 互斥。

## 支持的消息类型
- **文本消息**：完整支持，按 2000 字符分块。
- **图片消息**：下载并处理入站图片；通过 `sendPhoto` 发送图片。
- **贴纸**：记录日志但不完全处理（不触发 agent 回复）。
- **不支持类型**：记录日志（如受保护用户的消息）。

## 能力
| 功能 | 状态 |
|---------|--------|
| 私聊 | ✅ 支持 |
| 群聊 | ❌ 即将支持（Zalo 文档） |
| 媒体（图片） | ✅ 支持 |
| Reactions | ❌ 不支持 |
| 线程 | ❌ 不支持 |
| 投票 | ❌ 不支持 |
| 原生命令 | ❌ 不支持 |
| 流式 | ⚠️ 禁用（2000 字符限制） |

## 投递目标（CLI/cron）
- 使用 chat id 作为 target。
- 示例：`openclaw message send --channel zalo --target 123456789 --message "hi"`。

## 故障排查

**Bot 不回复：**
- 检查 token 有效性：`openclaw channels status --probe`
- 确认发送者已批准（配对或 allowFrom）
- 查看 gateway 日志：`openclaw logs --follow`

**Webhook 收不到事件：**
- 确认 webhook URL 为 HTTPS
- 确认 secret 为 8-256 字符
- 确认 gateway HTTP 端点可在配置路径上访问
- 确认未启用 getUpdates 轮询（两者互斥）

## 配置参考（Zalo）
完整配置见：[Configuration](/zh/gateway/configuration)

Provider 选项：
- `channels.zalo.enabled`：启用/禁用渠道启动。
- `channels.zalo.botToken`：Zalo Bot Platform 的 bot token。
- `channels.zalo.tokenFile`：从文件读取 token。
- `channels.zalo.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.zalo.allowFrom`：DM allowlist（用户 ID）。`open` 需要 `"*"`. 向导会要求数字 ID。
- `channels.zalo.mediaMaxMb`：入站/出站媒体上限（MB，默认 5）。
- `channels.zalo.webhookUrl`：启用 webhook 模式（需 HTTPS）。
- `channels.zalo.webhookSecret`：webhook secret（8-256 字符）。
- `channels.zalo.webhookPath`：gateway HTTP 服务器上的 webhook 路径。
- `channels.zalo.proxy`：API 请求代理 URL。

多账号选项：
- `channels.zalo.accounts.<id>.botToken`：按账号 token。
- `channels.zalo.accounts.<id>.tokenFile`：按账号 token 文件。
- `channels.zalo.accounts.<id>.name`：显示名。
- `channels.zalo.accounts.<id>.enabled`：启用/禁用账号。
- `channels.zalo.accounts.<id>.dmPolicy`：按账号 DM policy。
- `channels.zalo.accounts.<id>.allowFrom`：按账号 allowlist。
- `channels.zalo.accounts.<id>.webhookUrl`：按账号 webhook URL。
- `channels.zalo.accounts.<id>.webhookSecret`：按账号 webhook secret。
- `channels.zalo.accounts.<id>.webhookPath`：按账号 webhook 路径。
- `channels.zalo.accounts.<id>.proxy`：按账号代理 URL。
