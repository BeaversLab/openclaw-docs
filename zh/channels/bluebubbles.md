---
summary: "通过 BlueBubbles macOS 服务器实现 iMessage（REST 发送/接收、正在输入、回应、配对、高级操作）。"
read_when:
  - Setting up BlueBubbles channel
  - Troubleshooting webhook pairing
  - Configuring iMessage on macOS
title: "BlueBubbles"
---

# BlueBubbles (macOS REST)

状态：内置插件，通过 HTTP 与 BlueBubbles macOS 服务器通信。由于其拥有更丰富的 API 且相比旧版 imsg channel 设置更简单，**推荐用于 iMessage 集成**。

## 概览

- 通过 BlueBubbles 辅助应用程序在 macOS 上运行 ([bluebubbles.app](https://bluebubbles.app))。
- 推荐/测试版本：macOS Sequoia (15)。macOS Tahoe (26) 可用；但在 Tahoe 上编辑功能目前有问题，且群组图标更新可能报告成功但实际上未同步。
- OpenClaw 通过其 REST API 与其通信 (`GET /api/v1/ping`, `POST /message/text`, `POST /chat/:id/*`)。
- 传入消息通过 webhook 到达；传出回复、正在输入指示器、已读回执和轻点是 REST 调用。
- 附件和贴纸作为入站媒体接收（并尽可能显示给代理）。
- 配对/允许列表的工作方式与其他频道相同 (`/channels/pairing` 等)，使用 `channels.bluebubbles.allowFrom` + 配对码。
- 回应作为系统事件呈现，就像 Slack/Telegram 一样，以便代理可以在回复前“提及”它们。
- 高级功能：编辑、撤销发送、回复串接、消息效果、群组管理。

## 快速开始

1. 在您的 Mac 上安装 BlueBubbles 服务器（按照 [bluebubbles.app/install](https://bluebubbles.app/install) 的说明操作）。
2. 在 BlueBubbles 配置中，启用 Web API 并设置密码。
3. 运行 `openclaw onboard` 并选择 BlueBubbles，或手动配置：

   ```json5
   {
     channels: {
       bluebubbles: {
         enabled: true,
         serverUrl: "http://192.168.1.100:1234",
         password: "example-password",
         webhookPath: "/bluebubbles-webhook",
       },
     },
   }
   ```

4. 将 BlueBubbles webhook 指向您的网关（例如：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）。
5. 启动网关；它将注册 webhook 处理程序并开始配对。

安全提示：

- 务必设置 webhook 密码。
- 始终需要 Webhook 身份验证。除非 BlueBubbles webhook 请求包含与 `channels.bluebubbles.password` 匹配的密码/guid（例如 `?password=<password>` 或 `x-password`），否则 OpenClaw 将拒绝这些请求，无论是否使用环回/代理拓扑。
- 在读取/解析完整的 Webhook 主体之前会检查密码身份验证。

## 保持 Messages.app 活跃（VM / 无头设置）

某些 macOS VM / 常开设置可能会导致 Messages.app 进入“空闲”状态（传入事件停止，直到打开/激活应用程序）。一个简单的解决方法是使用 AppleScript + LaunchAgent **每 5 分钟唤醒一次 Messages**。

### 1) 保存 AppleScript

将其保存为：

- `~/Scripts/poke-messages.scpt`

示例脚本（非交互式；不会抢占焦点）：

```applescript
try
  tell application "Messages"
    if not running then
      launch
    end if

    -- Touch the scripting interface to keep the process responsive.
    set _chatCount to (count of chats)
  end tell
on error
  -- Ignore transient failures (first-run prompts, locked session, etc).
end try
```

### 2) 安装 LaunchAgent

将其保存为：

- `~/Library/LaunchAgents/com.user.poke-messages.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.user.poke-messages</string>

    <key>ProgramArguments</key>
    <array>
      <string>/bin/bash</string>
      <string>-lc</string>
      <string>/usr/bin/osascript &quot;$HOME/Scripts/poke-messages.scpt&quot;</string>
    </array>

    <key>RunAtLoad</key>
    <true/>

    <key>StartInterval</key>
    <integer>300</integer>

    <key>StandardOutPath</key>
    <string>/tmp/poke-messages.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/poke-messages.err</string>
  </dict>
</plist>
```

注意：

- 这将在**登录时**以及**每 300 秒**运行一次。
- 首次运行可能会触发 macOS **自动化** 提示（`osascript` → Messages）。请在运行 LaunchAgent 的同一用户会话中批准它们。

加载它：

```bash
launchctl unload ~/Library/LaunchAgents/com.user.poke-messages.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.user.poke-messages.plist
```

## 入门

BlueBubbles 可在交互式设置向导中使用：

```
openclaw onboard
```

向导会提示输入：

- **Server URL**（必填）：BlueBubbles 服务器地址（例如 `http://192.168.1.100:1234`）
- **Password**（必填）：来自 BlueBubbles 服务器设置的 API 密码
- **Webhook path**（可选）：默认为 `/bluebubbles-webhook`
- **DM policy**（私聊策略）：pairing（配对）、allowlist（白名单）、open（开放）或 disabled（禁用）
- **Allow list**（允许列表）：电话号码、电子邮件或聊天目标

您也可以通过 CLI 添加 BlueBubbles：

```
openclaw channels add bluebubbles --http-url http://192.168.1.100:1234 --password <password>
```

## 访问控制（私聊 + 群组）

私聊（DMs）：

- 默认：`channels.bluebubbles.dmPolicy = "pairing"`。
- 未知发送者会收到配对码；消息在获得批准前将被忽略（代码在 1 小时后过期）。
- 通过以下方式批准：
  - `openclaw pairing list bluebubbles`
  - `openclaw pairing approve bluebubbles <CODE>`
- 配对是默认的令牌交换方式。详情：[配对](/zh/en/channels/pairing)

群组：

- `channels.bluebubbles.groupPolicy = open | allowlist | disabled`（默认：`allowlist`）。
- 当设置 `allowlist` 时，`channels.bluebubbles.groupAllowFrom` 控制谁可以在群组中触发响应。

### 提及门控（群组）

BlueBubbles 支持群聊的提及门控，与 iMessage/WhatsApp 的行为一致：

- 使用 `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）来检测提及。
- 当为群组启用 `requireMention` 时，Agent 仅在被提及时才会响应。
- 来自授权发送者的控制命令会绕过提及门控。

Per-group configuration:

```json5
{
  channels: {
    bluebubbles: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123"],
      groups: {
        "*": { requireMention: true }, // default for all groups
        "iMessage;-;chat123": { requireMention: false }, // override for specific group
      },
    },
  },
}
```

### Command gating

- Control commands (e.g., `/config`, `/model`) require authorization.
- Uses `allowFrom` and `groupAllowFrom` to determine command authorization.
- Authorized senders can run control commands even without mentioning in groups.

## Typing + read receipts

- **Typing indicators**: Sent automatically before and during response generation.
- **Read receipts**: Controlled by `channels.bluebubbles.sendReadReceipts` (default: `true`).
- **Typing indicators**: OpenClaw sends typing start events; BlueBubbles clears typing automatically on send or timeout (manual stop via DELETE is unreliable).

```json5
{
  channels: {
    bluebubbles: {
      sendReadReceipts: false, // disable read receipts
    },
  },
}
```

## Advanced actions

BlueBubbles supports advanced message actions when enabled in config:

```json5
{
  channels: {
    bluebubbles: {
      actions: {
        reactions: true, // tapbacks (default: true)
        edit: true, // edit sent messages (macOS 13+, broken on macOS 26 Tahoe)
        unsend: true, // unsend messages (macOS 13+)
        reply: true, // reply threading by message GUID
        sendWithEffect: true, // message effects (slam, loud, etc.)
        renameGroup: true, // rename group chats
        setGroupIcon: true, // set group chat icon/photo (flaky on macOS 26 Tahoe)
        addParticipant: true, // add participants to groups
        removeParticipant: true, // remove participants from groups
        leaveGroup: true, // leave group chats
        sendAttachment: true, // send attachments/media
      },
    },
  },
}
```

Available actions:

- **react**: Add/remove tapback reactions (`messageId`, `emoji`, `remove`)
- **edit**: Edit a sent message (`messageId`, `text`)
- **unsend**: Unsend a message (`messageId`)
- **reply**: Reply to a specific message (`messageId`, `text`, `to`)
- **sendWithEffect**: Send with iMessage effect (`text`, `to`, `effectId`)
- **renameGroup**: Rename a group chat (`chatGuid`, `displayName`)
- **setGroupIcon**: Set a group chat's icon/photo (`chatGuid`, `media`) — flaky on macOS 26 Tahoe (API may return success but the icon does not sync).
- **addParticipant**: Add someone to a group (`chatGuid`, `address`)
- **removeParticipant**: Remove someone from a group (`chatGuid`, `address`)
- **leaveGroup**: Leave a group chat (`chatGuid`)
- **sendAttachment**: Send media/files (`to`, `buffer`, `filename`, `asVoice`)
  - Voice memos: set `asVoice: true` with **MP3** or **CAF** audio to send as an iMessage voice message. BlueBubbles converts MP3 → CAF when sending voice memos.

### Message IDs (short vs full)

OpenClaw 可能会显示_短_消息 ID（例如 `1`、`2`）以节省令牌。

- `MessageSid` / `ReplyToId` 可以是短 ID。
- `MessageSidFull` / `ReplyToIdFull` 包含提供商的完整 ID。
- 短 ID 存储在内存中；它们可能在重启或缓存清除时失效。
- 操作接受短 ID 或完整 `messageId`，但如果短 ID 不再可用，则会报错。

对于持久化的自动化和存储，请使用完整 ID：

- 模板：`{{MessageSidFull}}`、`{{ReplyToIdFull}}`
- 上下文：入站负载中的 `MessageSidFull` / `ReplyToIdFull`

有关模板变量，请参阅[配置](/zh/en/gateway/configuration)。

## 阻止流式传输

控制响应是作为单条消息发送还是分块流式传输：

```json5
{
  channels: {
    bluebubbles: {
      blockStreaming: true, // enable block streaming (off by default)
    },
  },
}
```

## 媒体 + 限制

- 入站附件会被下载并存储在媒体缓存中。
- 通过 `channels.bluebubbles.mediaMaxMb` 设置入站和出站媒体的媒体上限（默认：8 MB）。
- 出站文本被分块为 `channels.bluebubbles.textChunkLimit`（默认：4000 个字符）。

## 配置参考

完整配置：[配置](/zh/en/gateway/configuration)

提供商选项：

- `channels.bluebubbles.enabled`：启用/禁用通道。
- `channels.bluebubbles.serverUrl`：BlueBubbles REST API 基础 URL。
- `channels.bluebubbles.password`：API 密码。
- `channels.bluebubbles.webhookPath`：Webhook 端点路径（默认：`/bluebubbles-webhook`）。
- `channels.bluebubbles.dmPolicy`：`pairing | allowlist | open | disabled`（默认：`pairing`）。
- `channels.bluebubbles.allowFrom`：私信白名单（handles、电子邮件、E.164 号码、`chat_id:*`、`chat_guid:*`）。
- `channels.bluebubbles.groupPolicy`：`open | allowlist | disabled`（默认：`allowlist`）。
- `channels.bluebubbles.groupAllowFrom`：群组发送者白名单。
- `channels.bluebubbles.groups`：每群组配置（`requireMention` 等）。
- `channels.bluebubbles.sendReadReceipts`：发送已读回执（默认：`true`）。
- `channels.bluebubbles.blockStreaming`：启用阻止流式传输（默认：`false`；流式回复所必需）。
- `channels.bluebubbles.textChunkLimit`：出站分块大小（字符）（默认：4000）。
- `channels.bluebubbles.chunkMode`: `length`（默认）仅在超过 `textChunkLimit` 时分割；`newline` 在长度分块前按空行（段落边界）分割。
- `channels.bluebubbles.mediaMaxMb`: 入站/出站媒体上限，单位为 MB（默认：8）。
- `channels.bluebubbles.mediaLocalRoots`: 允许用于出站本地媒体路径的绝对本地目录的显式允许列表。除非配置此项，否则默认拒绝本地路径发送。每账户覆盖设置：`channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`。
- `channels.bluebubbles.historyLimit`: 用于上下文的最大群组消息数（0 表示禁用）。
- `channels.bluebubbles.dmHistoryLimit`: 私聊历史记录限制。
- `channels.bluebubbles.actions`: 启用/禁用特定操作。
- `channels.bluebubbles.accounts`: 多账户配置。

相关全局选项：

- `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）。
- `messages.responsePrefix`。

## 寻址 / 投递目标

为稳定路由建议使用 `chat_guid`：

- `chat_guid:iMessage;-;+15555550123`（群组推荐）
- `chat_id:123`
- `chat_identifier:...`
- 直接句柄：`+15555550123`, `user@example.com`
  - 如果直接句柄没有现有的私聊对话，OpenClaw 将通过 `POST /api/v1/chat/new` 创建一个。这需要启用 BlueBubbles 私有 API。

## 安全性

- Webhook 请求通过将 `guid`/`password` 查询参数或标头与 `channels.bluebubbles.password` 进行比较来验证身份。来自 `localhost` 的请求也会被接受。
- 请妥善保管 API 密码和 webhook 端点（将它们视为凭据）。
- Localhost 信任意味着同主机反向代理可能会意外绕过密码。如果您代理了网关，请在代理层要求身份验证并配置 `gateway.trustedProxies`。参见 [网关安全](/zh/gateway/security#reverse-proxy-configuration)。
- 如果在局域网外暴露 BlueBubbles 服务器，请启用 HTTPS 和防火墙规则。

## 故障排除

- 如果正在输入/已读事件停止工作，请检查 BlueBubbles webhook 日志并验证网关路径是否与 `channels.bluebubbles.webhookPath` 匹配。
- 配对码在一小时后过期；请使用 `openclaw pairing list bluebubbles` 和 `openclaw pairing approve bluebubbles <code>`。
- 反应需要 BlueBubbles 私有 API (`POST /api/v1/message/react`)；请确保服务器版本已将其公开。
- 编辑/撤销需要 macOS 13+ 和兼容的 BlueBubbles 服务器版本。在 macOS 26 (Tahoe) 上，由于私有 API 变更，编辑功能目前无法使用。
- 在 macOS 26 (Tahoe) 上，群组图标更新可能不稳定：API 可能会返回成功，但新图标不会同步。
- OpenClaw 会根据 BlueBubbles 服务器的 macOS 版本自动隐藏已知损坏的操作。如果在 macOS 26 (Tahoe) 上编辑功能仍然出现，请使用 `channels.bluebubbles.actions.edit=false` 手动将其禁用。
- 有关状态/健康信息：`openclaw status --all` 或 `openclaw status --deep`。

有关通用通道工作流参考，请参阅 [Channels](/zh/en/channels) 和 [Plugins](/zh/en/tools/plugin) 指南。

import zh from '/components/footer/zh.mdx';

<zh />
