---
summary: "通过 BlueBubbles macOS 服务器实现 iMessage（REST 发送/接收、正在输入、回应、配对、高级操作）。"
read_when:
  - Setting up BlueBubbles channel
  - Troubleshooting webhook pairing
  - Configuring iMessage on macOS
title: "BlueBubbles"
---

# BlueBubbles (macOS REST)

状态：内置插件，通过 HTTP 与 BlueBubbles macOS 服务器通信。由于其拥有更丰富的 API 且相比旧版 imsg 渠道 设置更简单，**推荐用于 iMessage 集成**。

## 捆绑插件

当前的 OpenClaw 版本包含了 BlueBubbles，因此普通的打包版本不需要单独的 `openclaw plugins install` 步骤。

## 概述

- 通过 macOS 助手应用 ([bluebubbles.app](https://bluebubbles.app)) 在 BlueBubbles 上运行。
- 推荐/测试版本：macOS Sequoia (15)。macOS Tahoe (26) 也可以使用；但在 Tahoe 上目前编辑功能损坏，且群组图标更新可能报告成功但并未同步。
- OpenClaw 通过其 REST API (`GET /api/v1/ping`, `POST /message/text`, `POST /chat/:id/*`) 与其通信。
- 传入消息通过 webhook 到达；传出回复、正在输入指示器、已读回执和点回（tapbacks）均为 REST 调用。
- 附件和贴纸作为入站媒体被接收（并尽可能向代理展示）。
- 配对/允许列表的工作方式与其他渠道（`/channels/pairing` 等）相同，使用 `channels.bluebubbles.allowFrom` + 配对码。
- 反应会像 Slack/Telegram 一样作为系统事件呈现，因此座席可以在回复前“提及”它们。
- 高级功能：编辑、撤销、回复线程、消息效果、群组管理。

## 快速开始

1. 在你的 Mac 上安装 BlueBubbles 服务器（遵循 [bluebubbles.app/install](https://bluebubbles.app/install) 上的说明）。
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

4. 将 BlueBubbles webhooks 指向你的网关（例如：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）。
5. 启动网关；它将注册 webhook 处理程序并开始配对。

安全提示：

- 务必设置 webhook 密码。
- 始终需要 Webhook 身份验证。OpenClaw 会拒绝 BlueBubbles 的 webhook 请求，除非它们包含与 `channels.bluebubbles.password` 匹配的密码/guid（例如 `?password=<password>` 或 `x-password`），无论回环/代理拓扑如何。
- 密码身份验证会在读取/解析完整的 webhook 正文之前进行检查。

## 保持 Messages.app 活跃（虚拟机 / 无头设置）

某些 macOS 虚拟机/常开设置可能会导致 Messages.app 进入“空闲”状态（传入事件停止，直到应用被打开/置于前台）。一个简单的解决方法是使用 AppleScript + LaunchAgent **每 5 分钟唤醒一次 Messages**。

### 1) 保存 AppleScript

将此保存为：

- `~/Scripts/poke-messages.scpt`

示例脚本（非交互式；不会窃取焦点）：

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

将此保存为：

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

注意事项：

- 这将在**每 300 秒**和**登录时**运行。
- 首次运行可能会触发 macOS **自动化**提示（`osascript` → Messages）。请在运行 LaunchAgent 的同一用户会话中批准它们。

加载它：

```bash
launchctl unload ~/Library/LaunchAgents/com.user.poke-messages.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.user.poke-messages.plist
```

## 新手引导

BlueBubbles 可在交互式新手引导中使用：

```
openclaw onboard
```

向导会提示输入：

- **服务器 URL**（必填）：BlueBubbles 服务器地址（例如 `http://192.168.1.100:1234`）
- **密码**（必填）：来自 API 服务器设置的 BlueBubbles 密码
- **Webhook 路径**（可选）：默认为 `/bluebubbles-webhook`
- **私信策略**：配对、允许列表、开放或禁用
- **允许列表**：电话号码、电子邮件或聊天目标

你也可以通过 BlueBubbles 添加 CLI：

```
openclaw channels add bluebubbles --http-url http://192.168.1.100:1234 --password <password>
```

## 访问控制（私信 + 群组）

私信：

- 默认值：`channels.bluebubbles.dmPolicy = "pairing"`。
- 未知发件人会收到配对码；在获得批准之前消息将被忽略（代码将在 1 小时后过期）。
- 通过以下方式批准：
  - `openclaw pairing list bluebubbles`
  - `openclaw pairing approve bluebubbles <CODE>`
- 配对是默认的令牌交换方式。详情：[配对](/zh/channels/pairing)

群组：

- `channels.bluebubbles.groupPolicy = open | allowlist | disabled`（默认：`allowlist`）。
- `channels.bluebubbles.groupAllowFrom` 控制当设置 `allowlist` 时谁可以在群组中触发。

### 联系人姓名填充（macOS，可选）

BlueBubbles 群组 Webhook 通常只包含原始参与者地址。如果您希望 `GroupMembers` 上下文显示本地联系人姓名，您可以选择在 macOS 上启用本地联系人填充：

- `channels.bluebubbles.enrichGroupParticipantsFromContacts = true` 启用查找。默认：`false`。
- 查找仅在群组访问、命令授权和提及判定允许消息通过后运行。
- 仅未命名的电话参与者会被填充。
- 当未找到本地匹配项时，原始电话号码将作为后备选项。

```json5
{
  channels: {
    bluebubbles: {
      enrichGroupParticipantsFromContacts: true,
    },
  },
}
```

### 提及限制（群组）

BlueBubbles 支持群组聊天的提及限制，与 iMessage/WhatsApp 的行为相匹配：

- 使用 `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）来检测提及。
- 当为群组启用 `requireMention` 时，代理仅在收到提及时响应。
- 来自授权发送者的控制命令会绕过提及限制。

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

### 命令限制

- 控制命令（例如 `/config`，`/model`）需要授权。
- 使用 `allowFrom` 和 `groupAllowFrom` 来确定命令授权。
- 授权发送者即使不在群组中提及也可以运行控制命令。

## ACP 对话绑定

BlueBubbles 聊天可以转换为持久的 ACP 工作区，而无需更改传输层。

快速操作流程：

- 在私信或允许的群聊中运行 `/acp spawn codex --bind here`。
- 该同一 BlueBubbles 会话中的后续消息将路由到生成的 ACP 会话。
- `/new` 和 `/reset` 就地重置同一个绑定的 ACP 会话。
- `/acp close` 关闭 ACP 会话并移除绑定。

还通过顶级 `bindings[]` 条目支持配置的持久绑定，带有 `type: "acp"` 和 `match.channel: "bluebubbles"`。

`match.peer.id` 可以使用任何支持的 BlueBubbles 目标形式：

- 标准化的私信句柄，例如 `+15555550123` 或 `user@example.com`
- `chat_id:<id>`
- `chat_guid:<guid>`
- `chat_identifier:<identifier>`

为了稳定的群组绑定，建议优先使用 `chat_id:*` 或 `chat_identifier:*`。

示例：

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: { agent: "codex", backend: "acpx", mode: "persistent" },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "bluebubbles",
        accountId: "default",
        peer: { kind: "dm", id: "+15555550123" },
      },
      acp: { label: "codex-imessage" },
    },
  ],
}
```

有关共享 ACP 绑定行为，请参阅 [ACP Agents](/zh/tools/acp-agents)。

## 正在输入 + 已读回执

- **正在输入指示器**：在响应生成之前和期间自动发送。
- **已读回执**：由 `channels.bluebubbles.sendReadReceipts` 控制（默认：`true`）。
- **正在输入指示器**：OpenClaw 发送正在输入开始事件；BlueBubbles 会在发送或超时时自动清除正在输入状态（通过 DELETE 手动停止是不可靠的）。

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

如果在配置中启用，BlueBubbles 支持高级消息操作：

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

- **react**：添加/删除轻点反应 (`messageId`, `emoji`, `remove`)
- **edit**：编辑已发送的消息 (`messageId`, `text`)
- **unsend**：撤回消息 (`messageId`)
- **reply**：回复特定消息 (`messageId`, `text`, `to`)
- **sendWithEffect**：发送带 iMessage 特效的消息 (`text`, `to`, `effectId`)
- **renameGroup**：重命名群聊 (`chatGuid`, `displayName`)
- **setGroupIcon**：设置群聊的图标/照片（`chatGuid`，`media`）—— 在 macOS 26 Tahoe 上不稳定（API 可能返回成功，但图标不会同步）。
- **addParticipant**：将某人添加到群组（`chatGuid`，`address`）
- **removeParticipant**：从群组中移除某人（`chatGuid`，`address`）
- **leaveGroup**：退出群聊（`chatGuid`）
- **upload-file**：发送媒体/文件（`to`，`buffer`，`filename`，`asVoice`）
  - 语音备忘录：将 `asVoice: true` 设置为 **MP3** 或 **CAF** 音频，以作为 iMessage 语音消息发送。BlueBubbles 在发送语音备忘录时会将 MP3 转换为 CAF。
- 旧别名：`sendAttachment` 仍然有效，但 `upload-file` 是规范的操作名称。

### 消息 ID（短 ID 与完整 ID）

OpenClaw 可能会显示*短*消息 ID（例如 `1`，`2`）以节省令牌。

- `MessageSid` / `ReplyToId` 可以是短 ID。
- `MessageSidFull` / `ReplyToIdFull` 包含提供商的完整 ID。
- 短 ID 存储在内存中；它们可能在重启或缓存清除时过期。
- 操作接受短或完整的 `messageId`，但如果短 ID 不再可用则会报错。

对于持久的自动化和存储，请使用完整 ID：

- 模板：`{{MessageSidFull}}`，`{{ReplyToIdFull}}`
- 上下文：入站载荷中的 `MessageSidFull` / `ReplyToIdFull`

有关模板变量，请参阅[配置](/zh/gateway/configuration)。

## 分块流式传输

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

## 媒体与限制

- 入站附件会被下载并存储在媒体缓存中。
- 通过 `channels.bluebubbles.mediaMaxMb` 设置入站和出站媒体的媒体上限（默认：8 MB）。
- 出站文本会分块至 `channels.bluebubbles.textChunkLimit`（默认：4000 个字符）。

## 配置参考

完整配置：[配置](/zh/gateway/configuration)

提供商选项：

- `channels.bluebubbles.enabled`：启用/禁用渠道。
- `channels.bluebubbles.serverUrl`：BlueBubbles REST API 基础 URL。
- `channels.bluebubbles.password`：API 密码。
- `channels.bluebubbles.webhookPath`：Webhook 端点路径（默认：`/bluebubbles-webhook`）。
- `channels.bluebubbles.dmPolicy`： `pairing | allowlist | open | disabled`（默认： `pairing`）。
- `channels.bluebubbles.allowFrom`： 私信允许列表（句柄、电子邮件、E.164号码、 `chat_id:*`、 `chat_guid:*`）。
- `channels.bluebubbles.groupPolicy`： `open | allowlist | disabled`（默认： `allowlist`）。
- `channels.bluebubbles.groupAllowFrom`： 群组发送者允许列表。
- `channels.bluebubbles.enrichGroupParticipantsFromContacts`： 在 macOS 上，通过检查后可选择从本地联系人中填充未命名的群组成员。默认： `false`。
- `channels.bluebubbles.groups`： 每个群组的配置（ `requireMention`等）。
- `channels.bluebubbles.sendReadReceipts`： 发送已读回执（默认： `true`）。
- `channels.bluebubbles.blockStreaming`：启用分块流式传输（默认：`false`；流式回复所必需）。
- `channels.bluebubbles.textChunkLimit`：出站块大小（字符数，默认：4000）。
- `channels.bluebubbles.chunkMode`：`length`（默认）仅在超过 `textChunkLimit` 时分割；`newline` 会在按长度分割之前根据空行（段落边界）进行分割。
- `channels.bluebubbles.mediaMaxMb`：入站/出站媒体上限，单位 MB（默认：8）。
- `channels.bluebubbles.mediaLocalRoots`：允许用于出站本地媒体路径的绝对本地目录的显式允许列表。除非配置此项，否则默认拒绝本地路径发送。每账户覆盖：`channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`。
- `channels.bluebubbles.historyLimit`：用于上下文的群组消息最大数量（0 表示禁用）。
- `channels.bluebubbles.dmHistoryLimit`：私信历史记录限制。
- `channels.bluebubbles.actions`：启用/禁用特定操作。
- `channels.bluebubbles.accounts`：多账户配置。

相关的全局选项：

- `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）。
- `messages.responsePrefix`。

## 寻址 / 投递目标

为稳定路由首选 `chat_guid`：

- `chat_guid:iMessage;-;+15555550123`（首选用于群组）
- `chat_id:123`
- `chat_identifier:...`
- 直接句柄：`+15555550123`，`user@example.com`
  - 如果直接句柄没有现有的私信聊天，OpenClaw 将通过 `POST /api/v1/chat/new` 创建一个。这需要启用 BlueBubbles 私有 API。

## 安全性

- Webhook 请求通过将 `guid`/`password` 查询参数或标头与 `channels.bluebubbles.password` 进行比较来进行身份验证。
- 请妥善保管 API 密码和 webhook 端点（将它们视为凭据）。
- BlueBubbles webhook 身份验证没有 localhost 绕过机制。如果您代理 webhook 流量，请确保在请求中端到端保留 BlueBubbles 密码。此处 `gateway.trustedProxies` 不会替换 `channels.bluebubbles.password`。参见 [Gateway(网关) 安全](/zh/gateway/security#reverse-proxy-configuration)。
- 如果将 BlueBubbles 服务器暴露在局域网之外，请在服务器上启用 HTTPS 和防火墙规则。

## 故障排除

- 如果正在输入/已读事件停止工作，请检查 BlueBubbles webhook 日志，并验证网关路径是否匹配 `channels.bluebubbles.webhookPath`。
- 配对码在一小时后过期；请使用 `openclaw pairing list bluebubbles` 和 `openclaw pairing approve bluebubbles <code>`。
- 反应功能需要 BlueBubbles 私有 API (`POST /api/v1/message/react`)；请确保服务器版本已将其公开。
- 编辑/撤销需要 macOS 13+ 以及兼容的 BlueBubbles 服务器版本。在 macOS 26 (Tahoe) 上，由于私有 API 更改，编辑功能目前无法使用。
- 在 macOS 26 (Tahoe) 上，群组图标更新可能不稳定：API 可能返回成功，但新图标无法同步。
- OpenClaw 会根据 BlueBubbles 服务器的 macOS 版本自动隐藏已知损坏的操作。如果在 macOS 26 (Tahoe) 上仍然显示编辑功能，请使用 `channels.bluebubbles.actions.edit=false` 手动禁用它。
- 如需状态/健康信息：`openclaw status --all` 或 `openclaw status --deep`。

有关一般渠道工作流程的参考，请参阅 [渠道](/zh/channels) 和 [插件](/zh/tools/plugin) 指南。

## 相关

- [渠道概述](/zh/channels) — 所有支持的渠道
- [配对](/zh/channels/pairing) — 私信认证和配对流程
- [群组](/zh/channels/groups) — 群组聊天的行为和提及控制
- [渠道路由](/zh/channels/channel-routing) — 消息的会话路由
- [安全](/zh/gateway/security) — 访问模型和加固
