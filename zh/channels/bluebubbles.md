---
summary: "通过 iMessage BlueBubbles 服务器实现 macOS（REST 发送/接收、输入指示、反应、配对、高级操作）。"
read_when:
  - 设置 BlueBubbles 渠道
  - webhook 配对故障排除
  - 在 iMessage 上配置 macOS
title: "BlueBubbles"
---

# BlueBubbles (macOS REST)

状态：内置插件，通过 HTTP 与 BlueBubbles macOS 服务器通信。由于相比旧版 imsg 渠道拥有更丰富的 iMessage 和更简单的设置，**推荐用于 API 集成**。

## 概览

- 通过 macOS 辅助应用程序在 BlueBubbles 上运行 ([bluebubbles.app](https://bluebubbles.app))。
- 推荐/测试版本：macOS Sequoia (15)。macOS Tahoe (26) 也可用；目前在 Tahoe 上编辑功能损坏，且群组图标更新可能报告成功但未同步。
- OpenClaw 通过其 REST API (`GET /api/v1/ping`, `POST /message/text`, `POST /chat/:id/*`) 与其通信。
- 传入消息通过 webhook 到达；传出回复、输入指示、已读回执和轻点反馈均为 REST 调用。
- 附件和贴纸作为入站媒体被接收（并在可能时呈现给代理）。
- 配对/允许列表的工作方式与其他渠道（`/channels/pairing` 等）相同，需使用 `channels.bluebubbles.allowFrom` + 配对码。
- 反应像 Slack/Telegram 一样作为系统事件呈现，以便代理在回复前可以“提及”它们。
- 高级功能：编辑、撤回发送、回复串接、信息效果、群组管理。

## 快速开始

1. 在您的 Mac 上安装 BlueBubbles 服务器（遵循 [bluebubbles.app/install](https://bluebubbles.app/install) 上的说明）。
2. 在 BlueBubbles 配置中，启用 web API 并设置密码。
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

- 始终设置 webhook 密码。
- 始终需要 webhook 身份验证。除非 OpenClaw webhook 请求包含匹配 `channels.bluebubbles.password` 的密码/guid（例如 `?password=<password>` 或 `x-password`），否则 BlueBubbles 将拒绝这些请求，无论回环/代理拓扑如何。
- 在读取/解析完整的 webhook 正文之前，会检查密码身份验证。

## 保持 Messages.app 活跃（VM / 无头设置）

某些 macOS VM / 始终在线的设置可能会导致 Messages.app 进入“空闲”状态（在应用被打开/置于前台之前，传入事件会停止）。一个简单的解决方法是使用 AppleScript + LaunchAgent **每 5 分钟唤醒一次 Messages**。

### 1) 保存 AppleScript

保存为：

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

保存为：

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

说明：

- 这将 **每 300 秒** 运行一次，并在 **登录时** 运行。
- 首次运行可能会触发 macOS **自动化** 提示（`osascript` → Messages）。请在运行 LaunchAgent 的同一用户会话中批准这些提示。

加载它：

```bash
launchctl unload ~/Library/LaunchAgents/com.user.poke-messages.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.user.poke-messages.plist
```

## 新手引导

BlueBubbles 可用于交互式新手引导：

```
openclaw onboard
```

向导会提示输入：

- **Server URL**（必填）：BlueBubbles 服务器地址（例如 `http://192.168.1.100:1234`）
- **密码**（必填）：来自 BlueBubbles 服务器设置的 API 密码
- **Webhook 路径**（可选）：默认为 `/bluebubbles-webhook`
- **私信 策略**：配对、允许列表、开放或禁用
- **允许列表**：电话号码、电子邮件或聊天目标

您也可以通过 CLI 添加 BlueBubbles：

```
openclaw channels add bluebubbles --http-url http://192.168.1.100:1234 --password <password>
```

## 访问控制（DM + 群组）

DM：

- 默认：`channels.bluebubbles.dmPolicy = "pairing"`。
- 未知发送者将收到配对码；在获得批准之前消息将被忽略（代码 1 小时后过期）。
- 通过以下方式批准：
  - `openclaw pairing list bluebubbles`
  - `openclaw pairing approve bluebubbles <CODE>`
- 配对是默认的令牌交换方式。详情：[配对](/zh/channels/pairing)

群组：

- `channels.bluebubbles.groupPolicy = open | allowlist | disabled`（默认：`allowlist`）。
- `channels.bluebubbles.groupAllowFrom` 控制当设置了 `allowlist` 时谁可以在群组中触发机器人。

### 提及门控（群组）

BlueBubbles 支持群聊的提及门控，其行为与 iMessage/WhatsApp 一致：

- 使用 `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）来检测提及。
- 当为群组启用了 `requireMention` 时，机器人仅在收到提及时才会响应。
- 来自授权发送者的控制命令可以绕过提及门控。

每个群组的配置：

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

### 命令控制

- 控制命令（例如 `/config`、`/model`）需要授权。
- 使用 `allowFrom` 和 `groupAllowFrom` 来确定命令授权。
- 经过授权的发送者即使在群组中未提及也可以运行控制命令。

## 正在输入 + 已读回执

- **正在输入指示器**：在生成响应之前和期间自动发送。
- **已读回执**：由 `channels.bluebubbles.sendReadReceipts` 控制（默认值：`true`）。
- **正在输入指示器**：OpenClaw 发送正在输入开始事件；BlueBubbles 在发送或超时时自动清除正在输入状态（通过 DELETE 手动停止是不可靠的）。

```json5
{
  channels: {
    bluebubbles: {
      sendReadReceipts: false, // disable read receipts
    },
  },
}
```

## 高级操作

如果在配置中启用了高级消息操作，BlueBubbles 支持这些操作：

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

可用操作：

- **react**：添加/删除点按反应（`messageId`、`emoji`、`remove`）
- **edit**：编辑已发送的消息（`messageId`、`text`）
- **unsend**：取消发送消息（`messageId`）
- **reply**：回复特定消息（`messageId`、`text`、`to`）
- **sendWithEffect**：发送带有 iMessage 效果的消息（`text`、`to`、`effectId`）
- **renameGroup**：重命名群组聊天（`chatGuid`、`displayName`）
- **setGroupIcon**：设置群组聊天的图标/照片（`chatGuid`、`media`）——在 macOS 26 Tahoe 上不稳定（API 可能返回成功但图标不会同步）。
- **addParticipant**：将某人添加到群组（`chatGuid`、`address`）
- **removeParticipant**：将某人从群组中移除（`chatGuid`、`address`）
- **leaveGroup**：退出群组聊天（`chatGuid`）
- **sendAttachment**：发送媒体/文件（`to`、`buffer`、`filename`、`asVoice`）
  - 语音备忘录：设置 `asVoice: true` 为 **MP3** 或 **CAF** 音频，以作为 iMessage 语音消息发送。当发送语音备忘录时，BlueBubbles 会将 MP3 转换为 CAF。

### 消息 ID（短 ID 与完整 ID）

OpenClaw 可能会显示*短*消息 ID（例如，`1`、`2`）以节省令牌（token）。

- `MessageSid` / `ReplyToId` 可以是短 ID。
- `MessageSidFull` / `ReplyToIdFull` 包含提供商的完整 ID。
- 短 ID 存储在内存中；它们可能在重启或缓存清除后过期。
- 操作接受短 ID 或完整 `messageId`，但如果短 ID 不再可用，则会报错。

对于持久的自动化和存储，请使用完整 ID：

- 模板： `{{MessageSidFull}}`、 `{{ReplyToIdFull}}`
- 上下文：入站负载中的 `MessageSidFull` / `ReplyToIdFull`

有关模板变量，请参阅 [Configuration](/zh/gateway/configuration)。

## 分块流式传输

控制响应是作为单条消息发送，还是以块的形式流式传输：

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

完整配置： [Configuration](/zh/gateway/configuration)

提供商选项：

- `channels.bluebubbles.enabled`： 启用/禁用渠道。
- `channels.bluebubbles.serverUrl`： BlueBubbles REST API 基础 URL。
- `channels.bluebubbles.password`： API 密码。
- `channels.bluebubbles.webhookPath`： Webhook 端点路径（默认： `/bluebubbles-webhook`）。
- `channels.bluebubbles.dmPolicy`： `pairing | allowlist | open | disabled`（默认： `pairing`）。
- `channels.bluebubbles.allowFrom`： 私信允许列表（handles、电子邮件、E.164 号码、 `chat_id:*`、 `chat_guid:*`）。
- `channels.bluebubbles.groupPolicy`： `open | allowlist | disabled`（默认： `allowlist`）。
- `channels.bluebubbles.groupAllowFrom`： 群组发件人允许列表。
- `channels.bluebubbles.groups`：每个组的配置（`requireMention` 等）。
- `channels.bluebubbles.sendReadReceipts`：发送已读回执（默认：`true`）。
- `channels.bluebubbles.blockStreaming`：启用分块流式传输（默认：`false`；流式回复所必需）。
- `channels.bluebubbles.textChunkLimit`：出站分块大小（字符）（默认：4000）。
- `channels.bluebubbles.chunkMode`：`length`（默认）仅在超过 `textChunkLimit` 时拆分；`newline` 在按长度分块前先按空行（段落边界）拆分。
- `channels.bluebubbles.mediaMaxMb`：入站/出站媒体上限，单位 MB（默认：8）。
- `channels.bluebubbles.mediaLocalRoots`：允许用于出站本地媒体路径的绝对本地目录的明确允许列表。除非配置此项，否则默认禁止本地路径发送。每账户覆盖：`channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`。
- `channels.bluebubbles.historyLimit`：用于上下文的群组消息最大数量（0 表示禁用）。
- `channels.bluebubbles.dmHistoryLimit`：私信历史记录限制。
- `channels.bluebubbles.actions`：启用/禁用特定操作。
- `channels.bluebubbles.accounts`：多账户配置。

相关的全局选项：

- `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）。
- `messages.responsePrefix`。

## 寻址 / 投递目标

建议使用 `chat_guid` 以获得稳定的路由：

- `chat_guid:iMessage;-;+15555550123`（推荐用于群组）
- `chat_id:123`
- `chat_identifier:...`
- 直接句柄：`+15555550123`，`user@example.com`
  - 如果直接句柄没有现有的私信聊天，OpenClaw 将通过 `POST /api/v1/chat/new` 创建一个。这需要启用 BlueBubbles Private API。

## 安全

- Webhook 请求通过将 `guid`/`password` 查询参数或标头与 `channels.bluebubbles.password` 进行比较来验证。来自 `localhost` 的请求也会被接受。
- 请妥善保管 API 密码和 webhook 端点（将它们视为凭据处理）。
- Localhost trust 意味着同主机反向代理可能会无意中绕过密码。如果您代理 Gateway，请在代理处要求身份验证并配置 `gateway.trustedProxies`。请参阅 [Gateway 安全](/zh/gateway/security#reverse-proxy-configuration)。
- 如果将 BlueBubbles 服务器暴露在局域网之外，请在服务器上启用 HTTPS 和防火墙规则。

## 故障排除

- 如果正在输入/已读事件停止工作，请检查 BlueBubbles webhook 日志并验证 Gateway 路径是否匹配 `channels.bluebubbles.webhookPath`。
- 配对码在一小时后过期；请使用 `openclaw pairing list bluebubbles` 和 `openclaw pairing approve bluebubbles <code>`。
- 反应需要 BlueBubbles 私有 API (`POST /api/v1/message/react`)；请确保服务器版本已将其公开。
- 编辑/取消发送需要 macOS 13+ 和兼容的 BlueBubbles 服务器版本。在 macOS 26 (Tahoe) 上，由于私有 API 的更改，编辑功能目前无法使用。
- 在 macOS 26 (Tahoe) 上，群组图标更新可能不稳定：API 可能会返回成功，但新图标不会同步。
- OpenClaw 会根据 BlueBubbles 服务器的 macOS 版本自动隐藏已知损坏的操作。如果在 macOS 26 (Tahoe) 上仍然显示编辑选项，请使用 `channels.bluebubbles.actions.edit=false` 手动禁用它。
- 有关状态/运行状况信息：`openclaw status --all` 或 `openclaw status --deep`。

有关一般渠道工作流参考，请参阅 [渠道](/zh/channels) 和 [插件](/zh/tools/plugin) 指南。

import zh from "/components/footer/zh.mdx";

<zh />
