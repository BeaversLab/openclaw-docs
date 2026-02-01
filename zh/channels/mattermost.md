---
summary: "Mattermost bot 设置与 OpenClaw 配置"
read_when:
  - 设置 Mattermost
  - 调试 Mattermost 路由
---

# Mattermost（插件）

状态：通过插件支持（bot token + WebSocket 事件）。支持频道、群组与私聊。
Mattermost 是可自托管的团队消息平台；产品与下载见官方站点
[mattermost.com](https://mattermost.com)。

## 需要插件
Mattermost 为插件形式，未随核心安装打包。

通过 CLI 安装（npm registry）：
```bash
openclaw plugins install @openclaw/mattermost
```

本地检出（从 git 仓库运行时）：
```bash
openclaw plugins install ./extensions/mattermost
```

若在配置/上手流程中选择 Mattermost 且检测到 git 检出，OpenClaw 会自动提供本地安装路径。

详情：[Plugins](/zh/plugin)

## 快速设置
1) 安装 Mattermost 插件。
2) 创建 Mattermost bot 账号并复制 **bot token**。
3) 复制 Mattermost **base URL**（例如 `https://chat.example.com`）。
4) 配置 OpenClaw 并启动 gateway。

最小配置：
```json5
{
  channels: {
    mattermost: {
      enabled: true,
      botToken: "mm-token",
      baseUrl: "https://chat.example.com",
      dmPolicy: "pairing"
    }
  }
}
```

## 环境变量（默认账号）
若偏好环境变量，在 gateway 主机上设置：

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

环境变量仅适用于 **default** 账号；其他账号必须在配置中设置。

## 聊天模式
Mattermost 会自动回复私聊。频道行为由 `chatmode` 控制：

- `oncall`（默认）：仅在频道中被 @ 提及时回复。
- `onmessage`：回复每条频道消息。
- `onchar`：当消息以触发前缀开头时回复。

配置示例：
```json5
{
  channels: {
    mattermost: {
      chatmode: "onchar",
      oncharPrefixes: [">", "!"]
    }
  }
}
```

说明：
- `onchar` 仍会响应显式 @ 提及。
- 兼容旧配置时仍尊重 `channels.mattermost.requireMention`，但推荐用 `chatmode`。

## 访问控制（私聊）
- 默认：`channels.mattermost.dmPolicy = "pairing"`（未知发送者会收到配对码）。
- 批准命令：
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- 公共私聊：`channels.mattermost.dmPolicy="open"` 且 `channels.mattermost.allowFrom=["*"]`。

## 频道（群组）
- 默认：`channels.mattermost.groupPolicy = "allowlist"`（提及门控）。
- 使用 `channels.mattermost.groupAllowFrom` allowlist 发送者（用户 ID 或 `@username`）。
- 公开频道：`channels.mattermost.groupPolicy="open"`（仍为提及门控）。

## 出站投递目标
使用以下格式配合 `openclaw message send` 或 cron/webhooks：

- `channel:<id>` 表示频道
- `user:<id>` 表示私聊
- `@username` 表示私聊（通过 Mattermost API 解析）

纯 ID 默认视为频道。

## 多账号
Mattermost 支持 `channels.mattermost.accounts` 多账号：

```json5
{
  channels: {
    mattermost: {
      accounts: {
        default: { name: "Primary", botToken: "mm-token", baseUrl: "https://chat.example.com" },
        alerts: { name: "Alerts", botToken: "mm-token-2", baseUrl: "https://alerts.example.com" }
      }
    }
  }
}
```

## 故障排查
- 频道无回复：确认 bot 已加入频道并 @ 提及（oncall），使用触发前缀（onchar），或设置 `chatmode: "onmessage"`。
- 鉴权错误：检查 bot token、base URL，以及账号是否启用。
- 多账号问题：环境变量仅作用于 `default` 账号。
