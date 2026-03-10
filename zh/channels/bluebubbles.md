---
summary: "通过 BlueBubbles macOS 服务器实现 iMessage（REST 发送/接收、输入指示器、反应、配对、高级操作）。"
read_when:
  - 设置 BlueBubbles 频道
  - 排除 webhook 配对故障
  - 在 macOS 上配置 iMessage
title: "BlueBubbles"
---

# BlueBubbles（macOS REST）

状态：通过 HTTP 与 BlueBubbles macOS 服务器通信的捆绑插件。**推荐用于 iMessage 集成**，因为与旧版 imsg 频道相比，它具有更丰富的 API 和更简单的设置。

## 概述

- 通过 BlueBubbles 助手应用在 macOS 上运行（[bluebubbles.app](https://bluebubbles.app)）。
- 推荐/测试：macOS Sequoia (15)。macOS Tahoe (26) 可用；编辑功能目前在 Tahoe 上损坏，群组图标更新可能报告成功但不同步。
- OpenClaw 通过其 REST API 与其通信（`GET /api/v1/ping`、`POST /message/text`、`POST /chat/:id/*`）。
- 传入消息通过 webhook 到达；传出回复、输入指示器、已读回执和 tapback 是 REST 调用。
- 附件和贴纸作为入站媒体导入（并在可能的情况下呈现给代理）。
- 配对/允许列表的工作方式与其他频道相同（`/start/pairing` 等），使用 `channels.bluebubbles.allowFrom` + 配对码。
- 反应作为系统事件呈现，就像 Slack/Telegram 一样，以便代理可以在回复前"提及"它们。
- 高级功能：编辑、撤回、回复线程、消息效果、群组管理。

## 快速开始

1. 在 Mac 上安装 BlueBubbles 服务器（按照 [bluebubbles.app/install](https://bluebubbles.app/install) 上的说明操作）。
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
4. 将 BlueBubbles webhook 指向您的网关（示例：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）。
5. 启动网关；它将注册 webhook 处理程序并开始配对。

## 保持 Messages.app 存活（VM / 无头设置）

某些 macOS VM / 始终在线的设置可能导致 Messages.app 进入"空闲"状态（传入事件停止，直到打开/前台化应用）。一个简单的解决方法是使用 AppleScript + LaunchAgent **每 5 分钟唤醒 Messages**。

### 1) 保存 AppleScript

将其保存为：

- `~/Scripts/poke-messages.scpt`

示例脚本（非交互式；不抢占焦点）：

```applescript
try
  tell application "Messages"
    if not running then
      launch
    end if

    -- 触摸脚本接口以保持进程响应。
    set _chatCount to (count of chats)
  end tell
on error
  -- 忽略暂时性故障（首次运行提示、锁定会话等）。
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

- 这**每 300 秒**和**登录时**运行。
- 首次运行可能触发 macOS **自动化**提示（`osascript` → Messages）。在运行 LaunchAgent 的同一用户会话中批准它们。

加载它：

```bash
launchctl unload ~/Library/LaunchAgents/com.user.poke-messages.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.user.poke-messages.plist
```

## 引导

BlueBubbles 在交互式设置向导中可用：

```
openclaw onboard
```

向导会提示：

- **服务器 URL**（必需）：BlueBubbles 服务器地址（例如 `http://192.168.1.100:1234`）
- **密码**（必需）：来自 BlueBubbles 服务器设置的 API 密码
- **Webhook 路径**（可选）：默认为 `/bluebubbles-webhook`
- **DM 策略**：pairing、allowlist、open 或 disabled
- **允许列表**：电话号码、电子邮件或聊天目标

您也可以通过 CLI 添加 BlueBubbles：

```
openclaw channels add bluebubbles --http-url http://192.168.1.100:1234 --password <password>
```

## 访问控制（DM + 群组）

DM：

- 默认：`channels.bluebubbles.dmPolicy = "pairing"`。
- 未知发送者收到配对码；消息在批准前被忽略（码在一小时后过期）。
- 通过以下方式批准：
  - `openclaw pairing list bluebubbles`
  - `openclaw pairing approve bluebubbles <CODE>`
- 配对是默认的令牌交换。详情：[配对](/zh/start/pairing)

群组：

- `channels.bluebubbles.groupPolicy = open | allowlist | disabled`（默认：`allowlist`）。
- `channels.bluebubbles.groupAllowFrom` 控制在设置 `allowlist` 时谁可以在群组中触发。

### 提及门控（群组）

BlueBubbles 支持群组聊天的提及门控，匹配 iMessage/WhatsApp 行为：

- 使用 `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）检测提及。
- 当为群组启用 `requireMention` 时，代理仅在提及时响应。
- 来自授权发送者的控制命令绕过提及门控。

每群组配置：

```json5
{
  channels: {
    bluebubbles: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123"],
      groups: {
        "*": { requireMention: true }, // 所有群组的默认值
        "iMessage;-;chat123": { requireMention: false }, // 特定群组的覆盖
      },
    },
  },
}
```

### 命令门控

- 控制命令（例如 `/config`、`/model`）需要授权。
- 使用 `allowFrom` 和 `groupAllowFrom` 确定命令授权。
- 授权发送者可以运行控制命令，即使在群组中没有提及。

## 输入指示器 + 已读回执

- **输入指示器**：在响应生成之前和期间自动发送。
- **已读回执**：由 `channels.bluebubbles.sendReadReceipts` 控制（默认：`true`）。
- **输入指示器**：OpenClaw 发送输入开始事件；BlueBubbles 在发送或超时时自动清除输入（通过 DELETE 手动停止不可靠）。

```json5
{
  channels: {
    bluebubbles: {
      sendReadReceipts: false, // 禁用已读回执
    },
  },
}
```

## 高级操作

BlueBubbles 在配置中启用时支持高级消息操作：

```json5
{
  channels: {
    bluebubbles: {
      actions: {
        reactions: true, // tapback（默认：true）
        edit: true, // 编辑已发送消息（macOS 13+，macOS 26 Tahoe 上损坏）
        unsend: true, // 撤回消息（macOS 13+）
        reply: true, // 按消息 GUID 回复线程
        sendWithEffect: true, // 消息效果（slam、loud 等）
        renameGroup: true, // 重命名群组聊天
        setGroupIcon: true, // 设置群组聊天图标/照片（macOS 26 Tahoe 上不稳定）
        addParticipant: true, // 向群组添加参与者
        removeParticipant: true, // 从群组删除参与者
        leaveGroup: true, // 离开群组聊天
        sendAttachment: true, // 发送附件/媒体
      },
    },
  },
}
```

可用操作：

- **react**：添加/删除 tapback 反应（`messageId`、`emoji`、`remove`）
- **edit**：编辑已发送消息（`messageId`、`text`）
- **unsend**：撤回消息（`messageId`）
- **reply**：回复特定消息（`messageId`、`text`、`to`）
- **sendWithEffect**：使用 iMessage 效果发送（`text`、`to`、`effectId`）
- **renameGroup**：重命名群组聊天（`chatGuid`、`displayName`）
- **setGroupIcon**：设置群组聊天的图标/照片（`chatGuid`、`media`）— 在 macOS 26 Tahoe 上不稳定（API 可能返回成功但图标不同步）。
- **addParticipant**：向群组添加某人（`chatGuid`、`address`）
- **removeParticipant**：从群组删除某人（`chatGuid`、`address`）
- **leaveGroup**：离开群组聊天（`chatGuid`）
- **sendAttachment**：发送媒体/文件（`to`、`buffer`、`filename`、`asVoice`）
  - 语音备忘录：使用 **MP3** 或 **CAF** 音频设置 `asVoice: true` 以作为 iMessage 语音消息发送。BlueBubbles 在发送语音备忘录时将 MP3 → CAF 转换。

### 消息 ID（短 vs 完整）

OpenClaw 可能向代理呈现_短_消息 ID（例如 `1`、`2`）以节省令牌。

- `MessageSid` / `ReplyToId` 可以是短 ID。
- `MessageSidFull` / `ReplyToIdFull` 包含提供者完整 ID。
- 短 ID 在内存中；它们可能在重启或缓存驱逐时过期。
- 操作接受短或完整 `messageId`，但如果不再可用，短 ID 将出错。

为持久自动化和存储使用完整 ID：

- 模板：`{{MessageSidFull}}`、`{{ReplyToIdFull}}`
- 上下文：入站负载中的 `MessageSidFull` / `ReplyToIdFull`

请参阅[配置](/zh/gateway/configuration)了解模板变量。

## 块流

控制响应是作为单个消息发送还是以块流式传输：

```json5
{
  channels: {
    bluebubbles: {
      blockStreaming: true, // 启用块流（默认关闭）
    },
  },
}
```

## 媒体 + 限制

- 入站附件被下载并存储在媒体缓存中。
- 通过 `channels.bluebubbles.mediaMaxMb` 设置媒体上限（默认：8 MB）。
- 出站文本被分块到 `channels.bluebubbles.textChunkLimit`（默认：4000 字符）。

## 配置参考

完整配置：[配置](/zh/gateway/configuration)

提供者选项：

- `channels.bluebubbles.enabled`：启用/禁用频道。
- `channels.bluebubbles.serverUrl`：BlueBubbles REST API 基础 URL。
- `channels.bluebubbles.password`：API 密码。
- `channels.bluebubbles.webhookPath`：Webhook 端点路径（默认：`/bluebubbles-webhook`）。
- `channels.bluebubbles.dmPolicy`：`pairing | allowlist | open | disabled`（默认：`pairing`）。
- `channels.bluebubbles.allowFrom`：DM 允许列表（句柄、电子邮件、E.164 号码、`chat_id:*`、`chat_guid:*`）。
- `channels.bluebubbles.groupPolicy`：`open | allowlist | disabled`（默认：`allowlist`）。
- `channels.bluebubbles.groupAllowFrom`：群组发送者允许列表。
- `channels.bluebubbles.groups`：每群组配置（`requireMention` 等）。
- `channels.bluebubbles.sendReadReceipts`：发送已读回执（默认：`true`）。
- `channels.bluebubbles.blockStreaming`：启用块流（默认：`false`；流式回复需要）。
- `channels.bluebubbles.textChunkLimit`：出站块大小（字符，默认：4000）。
- `channels.bluebubbles.chunkMode`：`length`（默认）仅在超过 `textChunkLimit` 时分块；`newline` 在长度分块之前按空行（段落边界）分块。
- `channels.bluebubbles.mediaMaxMb`：入站媒体上限（MB，默认：8）。
- `channels.bluebubbles.historyLimit`：上下文的最大群组消息数（0 禁用）。
- `channels.bluebubbles.dmHistoryLimit`：DM 历史限制。
- `channels.bluebubbles.actions`：启用/禁用特定操作。
- `channels.bluebubbles.accounts`：多账户配置。

相关全局选项：

- `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）。
- `messages.responsePrefix`。

## 寻址 / 投递目标

首选 `chat_guid` 进行稳定路由：

- `chat_guid:iMessage;-;+15555550123`（群组首选）
- `chat_id:123`
- `chat_identifier:...`
- 直接句柄：`+15555550123`、`user@example.com`
  - 如果直接句柄没有现有的 DM 聊天，OpenClaw 将通过 `POST /api/v1/chat/new` 创建一个。这需要启用 BlueBubbles Private API。

## 安全

- Webhook 请求通过将 `guid`/`password` 查询参数或头与 `channels.bluebubbles.password` 进行比较来认证。来自 `localhost` 的请求也被接受。
- 保持 API 密码和 webhook 端点机密（将它们视为凭据）。
- Localhost 信任意味着同主机反向代理可以无意中绕过密码。如果您代理网关，请在代理处要求认证并配置 `gateway.trustedProxies`。请参阅[网关安全](/zh/gateway/security#reverse-proxy-configuration)。
- 如果在 LAN 外部暴露，请在 BlueBubbles 服务器上启用 HTTPS + 防火墙规则。

## 故障排除

- 如果输入/已读事件停止工作，请检查 BlueBubbles webhook 日志并验证网关路径与 `channels.bluebubbles.webhookPath` 匹配。
- 配对码在一小时后过期；使用 `openclaw pairing list bluebubbles` 和 `openclaw pairing approve bluebubbles <code>`。
- 反应需要 BlueBubbles private API（`POST /api/v1/message/react`）；确保服务器版本暴露它。
- 编辑/撤回需要 macOS 13+ 和兼容的 BlueBubbles 服务器版本。在 macOS 26 (Tahoe) 上，由于私有 API 更改，编辑目前损坏。
- 群组图标更新在 macOS 26 (Tahoe) 上可能不稳定：API 可能返回成功但新图标不同步。
- OpenClaw 根据 BlueBubbles 服务器的 macOS 版本自动隐藏已知损坏的操作。如果编辑仍然出现在 macOS 26 (Tahoe) 上，请使用 `channels.bluebubbles.actions.edit=false` 手动禁用它。
- 对于状态/健康信息：`openclaw status --all` 或 `openclaw status --deep`。

有关一般频道工作流参考，请参阅[频道](/zh/channels)和[插件](/zh/plugins)指南。
