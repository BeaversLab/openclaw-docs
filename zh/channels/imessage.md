---
summary: "通过 imsg 支持 iMessage（stdio 上的 JSON-RPC）、设置与 chat_id 路由"
read_when:
  - 设置 iMessage 支持
  - 调试 iMessage 收发
title: "iMessage（imsg）"
---
# iMessage（imsg）


状态：外部 CLI 集成。Gateway 会拉起 `imsg rpc`（stdio 上的 JSON-RPC）。

## 快速设置（新手）
1) 确保此 Mac 上 Messages 已登录。
2) 安装 `imsg`：
   - `brew install steipete/tap/imsg`
3) 为 OpenClaw 配置 `channels.imessage.cliPath` 与 `channels.imessage.dbPath`。
4) 启动 gateway 并批准 macOS 提示（Automation + Full Disk Access）。

最小配置：
```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "/usr/local/bin/imsg",
      dbPath: "/Users/<you>/Library/Messages/chat.db"
    }
  }
}
```

## 这是什么
- 基于 macOS `imsg` 的 iMessage 渠道。
- 路由确定性：回复始终回到 iMessage。
- 私聊共享 agent 主会话；群聊隔离为 `agent:<agentId>:imessage:group:<chat_id>`。
- 若某个多参与者线程 `is_group=false` 到达，你仍可通过 `channels.imessage.groups` 按 `chat_id` 将其隔离（见下文“类群组线程”）。

## 配置写入
默认允许 iMessage 触发 `/config set|unset` 写入配置（需 `commands.config: true`）。

禁用：
```json5
{
  channels: { imessage: { configWrites: false } }
}
```

## 要求
- macOS 且 Messages 已登录。
- OpenClaw + `imsg` 需要 Full Disk Access（访问 Messages DB）。
- 发送时需要 Automation 权限。
- `channels.imessage.cliPath` 可指向任意代理 stdin/stdout 的命令（例如 SSH 到另一台 Mac 并运行 `imsg rpc` 的脚本）。

## 设置（快捷路径）
1) 确保此 Mac 上 Messages 已登录。
2) 配置 iMessage 并启动 gateway。

### 专用 bot macOS 用户（隔离身份）
若希望 bot 使用**独立 iMessage 身份**发送（并保持个人 Messages 干净），请使用专用 Apple ID + 专用 macOS 用户。

1) 创建专用 Apple ID（如 `my-cool-bot@icloud.com`）。
   - Apple 可能要求手机号验证/2FA。
2) 创建 macOS 用户（如 `openclawhome`）并登录。
3) 在该用户的 Messages 中登录该 bot Apple ID。
4) 启用 Remote Login（系统设置 → 通用 → 共享 → 远程登录）。
5) 安装 `imsg`：
   - `brew install steipete/tap/imsg`
6) 配置 SSH，使 `ssh <bot-macos-user>@localhost true` 无需密码。
7) 将 `channels.imessage.accounts.bot.cliPath` 指向一个 SSH wrapper，在 bot 用户下运行 `imsg`。

首次运行提示：发送/接收可能需要在 *bot macOS 用户* 中进行 GUI 授权（Automation + Full Disk Access）。若 `imsg rpc` 卡住或退出，登录该用户（可用屏幕共享），执行一次 `imsg chats --limit 1` / `imsg send ...`，批准弹窗后重试。

示例 wrapper（`chmod +x`）。将 `<bot-macos-user>` 替换为你的实际用户名：
```bash
#!/usr/bin/env bash
set -euo pipefail

# 先执行一次交互式 SSH 接受 host key：
#   ssh <bot-macos-user>@localhost true
exec /usr/bin/ssh -o BatchMode=yes -o ConnectTimeout=5 -T <bot-macos-user>@localhost \
  "/usr/local/bin/imsg" "$@"
```

示例配置：
```json5
{
  channels: {
    imessage: {
      enabled: true,
      accounts: {
        bot: {
          name: "Bot",
          enabled: true,
          cliPath: "/path/to/imsg-bot",
          dbPath: "/Users/<bot-macos-user>/Library/Messages/chat.db"
        }
      }
    }
  }
}
```

单账号使用扁平配置（`channels.imessage.cliPath`、`channels.imessage.dbPath`），而非 `accounts` map。

### 远程/SSH 方案（可选）
若在另一台 Mac 上运行 iMessage，可将 `channels.imessage.cliPath` 指向一个通过 SSH 在远程 macOS 主机上运行 `imsg` 的脚本。OpenClaw 只需要 stdio。

示例 wrapper：
```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

**远程附件：** 当 `cliPath` 通过 SSH 指向远程主机时，Messages 数据库里的附件路径指向远程机器上的文件。通过设置 `channels.imessage.remoteHost`，OpenClaw 可自动用 SCP 拉取：

```json5
{
  channels: {
    imessage: {
      cliPath: "~/imsg-ssh",                     // SSH wrapper 到远程 Mac
      remoteHost: "user@gateway-host",           // 用于 SCP 文件传输
      includeAttachments: true
    }
  }
}
```

若未设置 `remoteHost`，OpenClaw 会尝试从你的 wrapper 脚本中解析 SSH 命令自动检测。为可靠性建议显式配置。

#### 通过 Tailscale 访问远程 Mac（示例）
若 Gateway 运行在 Linux 主机/VM，但 iMessage 必须运行在 Mac 上，Tailscale 是最简单的桥接：Gateway 通过 tailnet SSH 到 Mac 执行 `imsg`，并通过 SCP 拉回附件。

架构：
```
┌──────────────────────────────┐          SSH (imsg rpc)          ┌──────────────────────────┐
│ Gateway host (Linux/VM)      │──────────────────────────────────▶│ Mac with Messages + imsg │
│ - openclaw gateway           │          SCP (attachments)        │ - Messages signed in     │
│ - channels.imessage.cliPath  │◀──────────────────────────────────│ - Remote Login enabled   │
└──────────────────────────────┘                                   └──────────────────────────┘
              ▲
              │ Tailscale tailnet (hostname or 100.x.y.z)
              ▼
        user@gateway-host
```

具体配置示例（Tailscale hostname）：
```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "~/.openclaw/scripts/imsg-ssh",
      remoteHost: "bot@mac-mini.tailnet-1234.ts.net",
      includeAttachments: true,
      dbPath: "/Users/bot/Library/Messages/chat.db"
    }
  }
}
```

示例 wrapper（`~/.openclaw/scripts/imsg-ssh`）：
```bash
#!/usr/bin/env bash
exec ssh -T bot@mac-mini.tailnet-1234.ts.net imsg "$@"
```

说明：
- 确保 Mac 已登录 Messages，并开启 Remote Login。
- 使用 SSH key，保证 `ssh bot@mac-mini.tailnet-1234.ts.net` 无需交互。
- `remoteHost` 应与 SSH 目标一致，便于 SCP 拉取附件。

多账号支持：使用 `channels.imessage.accounts` 配置各账号并可选 `name`。参见 [`gateway/configuration`](/zh/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts) 的通用模式。不要提交 `~/.openclaw/openclaw.json`（常含 token）。

## 访问控制（私聊 + 群聊）
私聊：
- 默认：`channels.imessage.dmPolicy = "pairing"`。
- 未知发送者会收到配对码；未批准前消息被忽略（配对码 1 小时过期）。
- 通过以下命令批准：
  - `openclaw pairing list imessage`
  - `openclaw pairing approve imessage <CODE>`
- 配对是 iMessage 私聊的默认 token 交换机制。详情见 [Pairing](/zh/start/pairing)

群聊：
- `channels.imessage.groupPolicy = open | allowlist | disabled`。
- `channels.imessage.groupAllowFrom` 控制在 `allowlist` 时群聊中谁可触发。
- 提及门控使用 `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`），因为 iMessage 无原生提及元数据。
- 多 agent 覆盖：在 `agents.list[].groupChat.mentionPatterns` 中设置每个 agent 的模式。

## 工作方式（行为）
- `imsg` 会流式传递消息事件；gateway 将其规范化为共享的渠道 envelope。
- 回复总是回到相同 chat id 或 handle。

## 类群组线程（`is_group=false`）
某些 iMessage 线程可能有多位参与者，但由于 Messages 的 chat 标识方式，仍会以 `is_group=false` 到达。

若你在 `channels.imessage.groups` 下显式配置 `chat_id`，OpenClaw 会将该线程视为“群聊”以进行：
- 会话隔离（独立 `agent:<agentId>:imessage:group:<chat_id>` session key）
- 群 allowlist / 提及门控行为

示例：
```json5
{
  channels: {
    imessage: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123"],
      groups: {
        "42": { "requireMention": false }
      }
    }
  }
}
```
当你需要为特定线程设置隔离人格/模型时，这很有用（见 [Multi-agent routing](/zh/concepts/multi-agent)）。若要文件系统隔离，见 [Sandboxing](/zh/gateway/sandboxing)。

## 媒体 + 限制
- 可选附件摄入：`channels.imessage.includeAttachments`。
- 媒体上限：`channels.imessage.mediaMaxMb`。

## 限制
- 出站文本按 `channels.imessage.textChunkLimit` 分块（默认 4000）。
- 可选按段落分块：设置 `channels.imessage.chunkMode="newline"`，先按空行分段再做长度分块。
- 媒体上传上限 `channels.imessage.mediaMaxMb`（默认 16）。

## Addressing / 投递目标
建议使用 `chat_id` 进行稳定路由：
- `chat_id:123`（推荐）
- `chat_guid:...`
- `chat_identifier:...`
- 直接 handle：`imessage:+1555` / `sms:+1555` / `user@example.com`

列出聊天：
```
imsg chats --limit 20
```

## 配置参考（iMessage）
完整配置见：[Configuration](/zh/gateway/configuration)

Provider 选项：
- `channels.imessage.enabled`：启用/禁用渠道。
- `channels.imessage.cliPath`：`imsg` 路径。
- `channels.imessage.dbPath`：Messages DB 路径。
- `channels.imessage.remoteHost`：当 `cliPath` 指向远程 Mac 时用于 SCP 附件传输的 SSH 主机（如 `user@gateway-host`）。若未设置，会从 SSH wrapper 中自动解析。
- `channels.imessage.service`：`imessage | sms | auto`。
- `channels.imessage.region`：SMS 区域。
- `channels.imessage.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.imessage.allowFrom`：DM allowlist（handles、emails、E.164 号码或 `chat_id:*`）。`open` 需要 `"*"`。iMessage 无用户名；用 handle 或 chat 目标。
- `channels.imessage.groupPolicy`：`open | allowlist | disabled`（默认：allowlist）。
- `channels.imessage.groupAllowFrom`：群聊发送者 allowlist。
- `channels.imessage.historyLimit` / `channels.imessage.accounts.*.historyLimit`：作为上下文包含的最大群消息数（0 禁用）。
- `channels.imessage.dmHistoryLimit`：私聊历史上限（用户 turn）。每用户覆盖：`channels.imessage.dms["<handle>"].historyLimit`。
- `channels.imessage.groups`：按群默认 + allowlist（`"*"` 为全局默认）。
- `channels.imessage.includeAttachments`：将附件摄入上下文。
- `channels.imessage.mediaMaxMb`：入站/出站媒体上限（MB）。
- `channels.imessage.textChunkLimit`：出站分块大小（字符）。
- `channels.imessage.chunkMode`：`length`（默认）或 `newline`（按空行分段再分块）。

相关全局选项：
- `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）。
- `messages.responsePrefix`。
