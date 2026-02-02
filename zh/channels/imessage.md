---
summary: "通过 imsg 支持 iMessage（stdio 上的 JSON-RPC）、设置与 chat_id 路由"
read_when:
  - 设置 iMessage 支持
  - 调试 iMessage 收发
title: iMessage
---

# iMessage (imsg)

状态：外部 CLI 集成。Gateway 会拉起 `imsg rpc`（stdio 上的 JSON-RPC）。

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
          dbPath: "/Users/<bot-macos-user>/Library/Messages/chat.db",
        },
      },
    },
  },
}
```

### 远程 Mac（可选）

将 `cliPath` 指向通过 SSH 连接到另一台 Mac 的 wrapper 脚本。

### 通过 Tailscale 连接远程 Mac（示例）

- 确保两台 Mac 都安装了 Tailscale 并已连接。
- 使用远程 Mac 的 Tailscale IP（例如 `100.x.y.z`）。
- 更新 wrapper 中的 SSH 主机。

### 访问控制（私聊 + 群聊）

默认：私聊启用配对（`dmPolicy: "pairing"`），群聊使用 allowlist（`groupPolicy: "allowlist"`）。

### 类群组线程（`is_group=false`）

某些多参与者线程可能以 `is_group=false` 到达（尤其是群组的 DM）。要将其隔离到独立会话，添加到 `channels.imessage.groups`：

```json5
{
  channels: {
    imessage: {
      groups: {
        "iMessage;-;+1234567890": { requireMention: false },
      },
    },
  },
}
```

### 配置参考（iMessage）

完整配置见：[Configuration](/zh/gateway/configuration)

Provider 选项：

- `channels.imessage.enabled`：启用/禁用渠道。
- `channels.imessage.cliPath`：`imsg` CLI 路径。
- `channels.imessage.dbPath`：Messages 数据库路径（可选；`imsg` 会自动查找）。
- `channels.imessage.configWrites`：允许 `/config` 写入配置（默认：`true`）。
- `channels.imessage.dmPolicy`：`pairing | allowlist | open | disabled`（默认：`pairing`）。
- `channels.imessage.allowFrom`：私聊 allowlist（handles、E.164 号码、`chat_id:*`、`chat_guid:*`）。
- `channels.imessage.groupPolicy`：`open | allowlist | disabled`（默认：`allowlist`）。
- `channels.imessage.groupAllowFrom`：群聊发送者 allowlist。
- `channels.imessage.groups`：按 `chat_id` 的会话配置（`requireMention` 等）。
- `channels.imessage.accounts`：多账号配置（`bot`、`personal`）。
- `channels.imessage.historyLimit`：私聊上下文的最大消息数（0 表示禁用）。
- `channels.imessage.dmHistoryLimit`：私聊历史上限。
