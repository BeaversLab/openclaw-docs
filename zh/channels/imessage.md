---
summary: "旧版 iMessage 支持（通过 imsg 以 stdio 进行 JSON-RPC）。新设置应使用 BlueBubbles。"
read_when:
  - 设置 iMessage 支持
  - 调试 iMessage 收发
title: "iMessage"
---

# iMessage（旧版：imsg）

> **推荐：** 新的 iMessage 设置请使用 [BlueBubbles](/zh/channels/bluebubbles)。
>
> `imsg` 渠道是旧版外部 CLI 集成，未来版本可能移除。

状态：旧版外部 CLI 集成。Gateway 会拉起 `imsg rpc`（stdio 上的 JSON-RPC）。

## 快速设置（新手）

1. 确保此 Mac 上 Messages 已登录。
2. 安装 `imsg`：
   - `brew install steipete/tap/imsg`
3. 为 OpenClaw 配置 `channels.imessage.cliPath` 与 `channels.imessage.dbPath`。
4. 启动 gateway 并批准 macOS 提示（Automation + Full Disk Access）。

最小配置：

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "/usr/local/bin/imsg",
      dbPath: "/Users/<you>/Library/Messages/chat.db",
    },
  },
}
```

## 这是什么

- 基于 macOS `imsg` 的 iMessage 渠道。
- 路由确定性：回复始终回到 iMessage。
- 私聊共享 agent 主会话；群聊隔离为 `agent:<agentId>:imessage:group:<chat_id>`。
- 若某个多参与者线程 `is_group=false` 到达，你仍可通过 `channels.imessage.groups` 按 `chat_id` 将其隔离（见下文"类群组线程"）。

## 配置写入

默认允许 iMessage 触发 `/config set|unset` 写入配置（需 `commands.config: true`）。

禁用：

```json5
{
  channels: { imessage: { configWrites: false } },
}
```

## 要求

- macOS 且 Messages 已登录。
- OpenClaw + `imsg` 需要 Full Disk Access（访问 Messages DB）。
- 发送时需要 Automation 权限。
- `channels.imessage.cliPath` 可指向任意代理 stdin/stdout 的命令（例如 SSH 到另一台 Mac 并运行 `imsg rpc` 的脚本）。

## 设置（快捷路径）

1. 确保此 Mac 上 Messages 已登录。
2. 配置 iMessage 并启动 gateway。

### 专用 bot macOS 用户（隔离身份）

若希望 bot 使用**独立 iMessage 身份**发送（并保持个人 Messages 干净），请使用专用 Apple ID + 专用 macOS 用户。

1. 创建专用 Apple ID（如 `my-cool-bot@icloud.com`）。
   - Apple 可能要求手机号验证/2FA。
2. 创建 macOS 用户（如 `openclawhome`）并登录。
3. 在该用户的 Messages 中登录该 bot Apple ID。
4. 启用 Remote Login（系统设置 → 通用 → 共享 → 远程登录）。
5. 安装 `imsg`：
   - `brew install steipete/tap/imsg`
6. 配置 SSH，使 `ssh <bot-macos-user>@localhost true` 无需密码。
7. 将 `channels.imessage.accounts.bot.cliPath` 指向一个 SSH wrapper，在 bot 用户下运行 `imsg`。

首次运行提示：发送/接收可能需要在 _bot macOS 用户_ 中进行 GUI 授权（Automation + Full Disk Access）。若 `imsg rpc` 卡住或退出，登录该用户（可用屏幕共享），执行一次 `imsg chats --limit 1` / `imsg send ...`，批准弹窗后重试。

示例 wrapper（`chmod +x`）。将 `<bot-macos-user>` 替换为你的实际用户名：

```bash
#!/usr/bin/env bash
set -euo pipefail

# Run an interactive SSH once first to accept host keys:
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
          dbPath: "/Users/<bot-macos-user>/Library/Messages/chat.db",
        },
      },
    },
  },
}
```

对于单账号配置，请使用扁平选项（`channels.imessage.cliPath`、`channels.imessage.dbPath`）而非 `accounts` 映射。

### Remote/SSH 变体（可选）

若想在其他 Mac 上使用 iMessage，将 `channels.imessage.cliPath` 设为通过 SSH 在远程 macOS 主机上运行 `imsg` 的 wrapper。OpenClaw 只需要 stdio。

示例 wrapper：

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

**远程附件：** 当 `cliPath` 通过 SSH 指向远程主机时，Messages 数据库中的附件路径引用的是远程机器上的文件。OpenClaw 可通过设置 `channels.imessage.remoteHost` 自动通过 SCP 获取这些文件：

```json5
{
  channels: {
    imessage: {
      cliPath: "~/imsg-ssh", // SSH wrapper to remote Mac
      remoteHost: "user@gateway-host", // for SCP file transfer
      includeAttachments: true,
    },
  },
}
```

若未设置 `remoteHost`，OpenClaw 会尝试通过解析 wrapper 脚本中的 SSH 命令自动检测。为确保可靠性，建议显式配置。

#### 通过 Tailscale 连接远程 Mac（示例）

若 Gateway 运行在 Linux 主机/VM 上，但 iMessage 必须在 Mac 上运行，Tailscale 是最简单的桥接：Gateway 通过 tailnet 与 Mac 通信，通过 SSH 运行 `imsg`，并通过 SCP 传回附件。

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

具体配置示例（Tailscale 主机名）：

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "~/.openclaw/scripts/imsg-ssh",
      remoteHost: "bot@mac-mini.tailnet-1234.ts.net",
      includeAttachments: true,
      dbPath: "/Users/bot/Library/Messages/chat.db",
    },
  },
}
```

示例 wrapper（`~/.openclaw/scripts/imsg-ssh`）：

```bash
#!/usr/bin/env bash
exec ssh -T bot@mac-mini.tailnet-1234.ts.net imsg "$@"
```

说明：

- 确保 Mac 已登录 Messages，且已启用 Remote Login。
- 配置 SSH 密钥，使 `ssh bot@mac-mini.tailnet-1234.ts.net` 无需提示即可工作。
- `remoteHost` 应与 SSH 目标匹配，以便 SCP 可以获取附件。

多账号支持：使用 `channels.imessage.accounts` 配置每个账号的选项和可选的 `name`。通用模式参见 [`gateway/configuration`](/zh/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts)。请勿提交 `~/.openclaw/openclaw.json`（通常包含令牌）。

## 访问控制（私聊 + 群聊）

私聊：

- 默认：`channels.imessage.dmPolicy = "pairing"`。
- 未知发送者会收到配对码；在批准前消息将被忽略（配对码 1 小时后过期）。
- 批准方式：
  - `openclaw pairing list imessage`
  - `openclaw pairing approve imessage <CODE>`
- 配对是 iMessage 私聊的默认令牌交换。详情：[配对](/zh/start/pairing)

群聊：

- `channels.imessage.groupPolicy = open | allowlist | disabled`。
- 当设置为 `allowlist` 时，`channels.imessage.groupAllowFrom` 控制谁可以在群聊中触发。
- 提及门控使用 `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`），因为 iMessage 没有原生提及元数据。
- 多 agent 覆盖：在 `agents.list[].groupChat.mentionPatterns` 上设置每个 agent 的模式。

## 工作原理（行为）

- `imsg` 流式传输消息事件；gateway 将它们规范化为共享的 channel envelope。
- 回复始终路由回相同的 chat id 或 handle。

## 类群组线程（`is_group=false`）

某些 iMessage 线程可能有多个参与者，但根据 Messages 存储聊天标识符的方式，仍然以 `is_group=false` 到达。

若在 `channels.imessage.groups` 下显式配置了 `chat_id`，OpenClaw 会将该线程视为"群组"，用于：

- 会话隔离（独立的 `agent:<agentId>:imessage:group:<chat_id>` 会话密钥）
- 群组 allowlisting / 提及门控行为

示例：

```json5
{
  channels: {
    imessage: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123"],
      groups: {
        "42": { requireMention: false },
      },
    },
  },
}
```

当你想为特定线程提供独立的人格/模型时，这很有用（参见 [多 Agent 路由](/zh/concepts/multi-agent)）。关于文件系统隔离，参见 [沙盒隔离](/zh/gateway/sandboxing)。

## 媒体 + 限制

- 通过 `channels.imessage.includeAttachments` 可选附件引入。
- 通过 `channels.imessage.mediaMaxMb` 媒体上限。

## 限制

- 出站文本被分块为 `channels.imessage.textChunkLimit`（默认 4000）。
- 可选换行符分块：设置 `channels.imessage.chunkMode="newline"` 以在长度分块之前按空行（段落边界）分割。
- 媒体上传受 `channels.imessage.mediaMaxMb` 限制（默认 16）。

## 寻址 / 投递目标

优先使用 `chat_id` 进行稳定路由：

- `chat_id:123`（首选）
- `chat_guid:...`
- `chat_identifier:...`
- 直接 handles：`imessage:+1555` / `sms:+1555` / `user@example.com`

列出聊天：

```
imsg chats --limit 20
```

## 配置参考（iMessage）

完整配置：[配置](/zh/gateway/configuration)

Provider 选项：

- `channels.imessage.enabled`：启用/禁用渠道启动。
- `channels.imessage.cliPath`：`imsg` 的路径。
- `channels.imessage.dbPath`：Messages 数据库路径。
- `channels.imessage.remoteHost`：SSH 主机，用于当 `cliPath` 指向远程 Mac 时的 SCP 附件传输（如 `user@gateway-host`）。若未设置，则从 SSH wrapper 自动检测。
- `channels.imessage.service`：`imessage | sms | auto`。
- `channels.imessage.region`：SMS 区域。
- `channels.imessage.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.imessage.allowFrom`：DM allowlist（handles、邮箱、E.164 号码或 `chat_id:*`）。`open` 需要 `"*}`。iMessage 没有用户名；使用 handles 或聊天目标。
- `channels.imessage.groupPolicy`：`open | allowlist | disabled`（默认：allowlist）。
- `channels.imessage.groupAllowFrom`：群聊发送者 allowlist。
- `channels.imessage.historyLimit` / `channels.imessage.accounts.*.historyLimit`：作为上下文包含的最大群组消息数（0 表示禁用）。
- `channels.imessage.dmHistoryLimit`：DM 历史记录限制（以用户轮次为单位）。每个用户覆盖：`channels.imessage.dms["<handle>"].historyLimit`。
- `channels.imessage.groups`：每个群组的默认值 + allowlist（使用 `"*}` 表示全局默认值）。
- `channels.imessage.includeAttachments`：将附件引入上下文。
- `channels.imessage.mediaMaxMb`：入站/出站媒体上限（MB）。
- `channels.imessage.textChunkLimit`：出站分块大小（字符数）。
- `channels.imessage.chunkMode`：`length`（默认）或 `newline`，在长度分块之前按空行（段落边界）分割。

相关全局选项：

- `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）。
- `messages.responsePrefix`。
