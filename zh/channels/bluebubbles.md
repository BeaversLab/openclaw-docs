---
summary: "通过 BlueBubbles macOS 服务器接入 iMessage（REST 收发、输入中、回应、配对与高级动作）。"
read_when:
  - 设置 BlueBubbles 渠道
  - 排查 webhook 配对问题
  - 在 macOS 上配置 iMessage
title: "BlueBubbles"
---

# BlueBubbles (macOS REST)

状态：内置插件，通过 HTTP 连接 BlueBubbles macOS 服务器。**推荐用于 iMessage 集成**，
相比旧的 imsg 渠道，API 更丰富、配置更简单。

## 概览

- 运行在 macOS 上，通过 BlueBubbles helper 应用（[bluebubbles.app](https://bluebubbles.app)）。
- 推荐/测试：macOS Sequoia (15)。macOS Tahoe (26) 可用；但 Tahoe 上编辑目前不可用，群头像更新可能显示成功但实际不生效。
- OpenClaw 通过 REST API 交互（`GET /api/v1/ping`、`POST /message/text`、`POST /chat/:id/*`）。
- 入站消息通过 webhook 到达；出站回复、输入中指示、已读回执与 tapback 使用 REST 调用。
- 附件与贴纸会作为入站媒体被摄入（尽可能呈现给 agent）。
- 配对/allowlist 与其他渠道一致（`/start/pairing` 等），使用 `channels.bluebubbles.allowFrom` + 配对码。
- Reactions 以 system event 形式呈现（类似 Slack/Telegram），agent 可在回复前"提及"它们。
- 高级功能：编辑、撤回、回复线程、消息效果、群管理。

## 快速开始

1. 在你的 Mac 上安装 BlueBubbles 服务器（按 [bluebubbles.app/install](https://bluebubbles.app/install) 的说明）。
2. 在 BlueBubbles 配置中启用 Web API 并设置密码。
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

## 保持 Messages.app 活跃（VM / 无头设置）

某些 macOS VM / always-on 设置可能会导致 Messages.app 进入"闲置"状态（传入事件停止，直到应用被打开/切换到前台）。一个简单的解决方法是使用 AppleScript + LaunchAgent **每 5 分钟唤醒一次 Messages**。

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
      <string>/usr/bin/osascript "$HOME/Scripts/poke-messages.scpt"</string>
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

- 这将**每 300 秒运行一次**并在**登录时**运行。
- 首次运行可能会触发 macOS **Automation** 提示（`osascript` → Messages）。在与运行 LaunchAgent 相同的用户会话中批准这些提示。

加载它：

```bash
launchctl unload ~/Library/LaunchAgents/com.user.poke-messages.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.user.poke-messages.plist
```

4. 将 BlueBubbles webhook 指向你的 gateway（例如：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）。
5. 启动 gateway；它会注册 webhook 处理器并开始配对。

## Onboarding

BlueBubbles 在交互式设置向导中可用：

```
openclaw onboard
```

向导会询问：

- **Server URL**（必填）：BlueBubbles 服务器地址（如 `http://192.168.1.100:1234`）
- **Password**（必填）：BlueBubbles Server 设置中的 API 密码
- **Webhook path**（可选）：默认 `/bluebubbles-webhook`
- **DM policy**：配对、allowlist、开放或禁用
- **Allow list**：手机号、邮箱或聊天目标

你也可以通过 CLI 添加 BlueBubbles：

```
openclaw channels add bluebubbles --http-url http://192.168.1.100:1234 --password <password>
```

## 访问控制（私聊 + 群聊）

私聊：

- 默认：`channels.bluebubbles.dmPolicy = "pairing"`。
- 未知发送者会收到配对码；在批准之前消息会被忽略（配对码 1 小时过期）。
- 通过以下方式批准：
  - `openclaw pairing list bluebubbles`
  - `openclaw pairing approve bluebubbles <CODE>`
- 配对是默认的 token 交换机制。详情见 [配对](/zh/start/pairing)

群聊：

- `channels.bluebubbles.groupPolicy = open | allowlist | disabled`（默认：`allowlist`）。
- `channels.bluebubbles.groupAllowFrom` 在 `allowlist` 时控制群聊中谁可触发。

### 提及门控（群聊）

BlueBubbles 支持群聊提及门控，行为与 iMessage/WhatsApp 一致：

- 使用 `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）检测提及。
- 当某个群启用 `requireMention` 时，只有被提及时才会回复。
- 来自授权发送者的控制命令会绕过提及门控。

按群配置：

```json5
{
  channels: {
    bluebubbles: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123"],
      groups: {
        "*": { requireMention: true }, // 默认对所有群生效
        "iMessage;-;chat123": { requireMention: false }, // 覆盖特定群
      },
    },
  },
}
```

### 命令门控

- 控制命令（如 `/config`、`/model`）需要授权。
- 使用 `allowFrom` 和 `groupAllowFrom` 判断命令授权。
- 授权发送者可在群聊中无需提及也能执行控制命令。

## 输入中 + 已读回执

- **输入中指示**：在生成回复前和生成过程中自动发送。
- **已读回执**：由 `channels.bluebubbles.sendReadReceipts` 控制（默认：`true`）。
- **输入中指示**：OpenClaw 发送 typing start；BlueBubbles 在发送或超时后自动清除（手动 stop via DELETE 不可靠）。

```json5
{
  channels: {
    bluebubbles: {
      sendReadReceipts: false, // disable read receipts
    },
  },
}
```

## 高级动作

在配置中启用后，BlueBubbles 支持高级消息动作：

```json5
{
  channels: {
    bluebubbles: {
      actions: {
        reactions: true, // tapbacks (default: true)
        edit: true, // 编辑已发送消息（macOS 13+，macOS 26 Tahoe 上不可用）
        unsend: true, // 撤回消息（macOS 13+）
        reply: true, // 按消息 GUID 回复线程
        sendWithEffect: true, // 消息效果（slam、loud 等）
        renameGroup: true, // 重命名群聊
        setGroupIcon: true, // 设置群聊头像/图标（macOS 26 Tahoe 上不稳定）
        addParticipant: true, // 添加群成员
        removeParticipant: true, // 移除群成员
        leaveGroup: true, // 离开群聊
        sendAttachment: true, // 发送附件/媒体
      },
    },
  },
}
```

可用动作：

- **react**：添加/移除 tapback 反应（`messageId`、`emoji`、`remove`）
- **edit**：编辑已发送消息（`messageId`、`text`）
- **unsend**：撤回消息（`messageId`）
- **reply**：回复指定消息（`messageId`、`text`、`to`）
- **sendWithEffect**：以 iMessage 效果发送（`text`、`to`、`effectId`）
- **renameGroup**：重命名群聊（`chatGuid`、`displayName`）
- **setGroupIcon**：设置群聊头像/图标（`chatGuid`、`media`）— 在 macOS 26 Tahoe 上不稳定（API 可能返回成功但图标不生效）。
- **addParticipant**：向群聊添加成员（`chatGuid`、`address`）
- **removeParticipant**：从群聊移除成员（`chatGuid`、`address`）
- **leaveGroup**：离开群聊（`chatGuid`）
- **sendAttachment**：发送媒体/文件（`to`、`buffer`、`filename`、`asVoice`）
  - 语音备忘：设置 `asVoice: true` 并使用 **MP3** 或 **CAF** 音频发送 iMessage 语音。BlueBubbles 会在发送语音时将 MP3 → CAF。

### Message IDs（短 ID vs 完整 ID）

OpenClaw 可能会提供*短*消息 ID（例如 `1`、`2`）以节省 token。

- `MessageSid` / `ReplyToId` 可能为短 ID。
- `MessageSidFull` / `ReplyToIdFull` 包含 provider 的完整 ID。
- 短 ID 保存在内存中；重启或缓存驱逐后可能失效。
- 动作支持短 ID 与完整 ID，但短 ID 在失效后会报错。

要做持久自动化与存储，请使用完整 ID：

- 模板：`{{MessageSidFull}}`、`{{ReplyToIdFull}}`
- 上下文：`MessageSidFull` / `ReplyToIdFull` 出现在入站 payload 中

参见 [配置](/zh/gateway/configuration) 了解模板变量。

## 分块流式

控制回复是一次性发送还是分块流式发送：

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

- 入站附件会下载并存入媒体缓存。
- 媒体上限由 `channels.bluebubbles.mediaMaxMb` 控制（默认：8 MB）。
- 出站文本会按 `channels.bluebubbles.textChunkLimit` 分块（默认：4000 字符）。

## 配置参考

完整配置见：[配置](/zh/gateway/configuration)

Provider 选项：

- `channels.bluebubbles.enabled`：启用/禁用渠道。
- `channels.bluebubbles.serverUrl`：BlueBubbles REST API 基础 URL。
- `channels.bluebubbles.password`：API 密码。
- `channels.bluebubbles.webhookPath`：Webhook 端点路径（默认：`/bluebubbles-webhook`）。
- `channels.bluebubbles.dmPolicy`：`pairing | allowlist | open | disabled`（默认：`pairing`）。
- `channels.bluebubbles.allowFrom`：私聊 allowlist（handles、emails、E.164 号码、`chat_id:*`、`chat_guid:*`）。
- `channels.bluebubbles.groupPolicy`：`open | allowlist | disabled`（默认：`allowlist`）。
- `channels.bluebubbles.groupAllowFrom`：群聊发送者 allowlist。
- `channels.bluebubbles.groups`：按群配置（`requireMention` 等）。
- `channels.bluebubbles.sendReadReceipts`：发送已读回执（默认：`true`）。
- `channels.bluebubbles.blockStreaming`：启用分块流式（默认：`false`；需要流式回复时必需）。
- `channels.bluebubbles.textChunkLimit`：出站分块阈值（默认：4000 字符）。
- `channels.bluebubbles.chunkMode`：`length`（默认）只在超出 `textChunkLimit` 时分块；`newline` 在分块前按空行分割（段落边界）。
- `channels.bluebubbles.mediaMaxMb`：入站媒体上限（默认：8 MB）。
- `channels.bluebubbles.historyLimit`：群聊上下文的最大消息数（0 表示禁用）。
- `channels.bluebubbles.dmHistoryLimit`：私聊历史上限。
- `channels.bluebubbles.actions`：启用/禁用具体动作。
- `channels.bluebubbles.accounts`：多账号配置。

相关全局选项：

- `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）。
- `messages.responsePrefix`。

## Addressing / 投递目标

建议用 `chat_guid` 进行稳定路由：

- `chat_guid:iMessage;-;+15555550123`（推荐用于群聊）
- `chat_id:123`
- `chat_identifier:...`
- 直接 handle：`+15555550123`、`user@example.com`
  - 若直接 handle 没有现成 DM 聊天，OpenClaw 会通过 `POST /api/v1/chat/new` 创建。此操作需要启用 BlueBubbles Private API。

## 安全

- Webhook 请求通过比较 `guid`/`password` 查询参数或 header 与 `channels.bluebubbles.password` 验证。来自 `localhost` 的请求也会被接受。
- 保持 API 密码与 webhook 端点私密（视为凭据）。
- Localhost 信任意味着同机反向代理可能意外绕过密码。若你代理 gateway，请在代理层启用鉴权并配置 `gateway.trustedProxies`。参见 [Gateway 安全](/zh/gateway/security#reverse-proxy-configuration)。
- 若 BlueBubbles 服务器暴露到 LAN 外，开启 HTTPS 与防火墙规则。

## 故障排查

- 若输入中/已读事件停止工作，检查 BlueBubbles webhook 日志并确认 gateway 路径与 `channels.bluebubbles.webhookPath` 一致。
- 配对码 1 小时过期；使用 `openclaw pairing list bluebubbles` 与 `openclaw pairing approve bluebubbles <code>`。
- Reactions 依赖 BlueBubbles Private API（`POST /api/v1/message/react`）；确保服务器版本支持。
- 编辑/撤回需要 macOS 13+ 与兼容的 BlueBubbles 版本。macOS 26 (Tahoe) 因私有 API 变更导致编辑失效。
- macOS 26 (Tahoe) 上群头像更新可能不稳定：API 返回成功但图标不同步。
- OpenClaw 会根据 BlueBubbles 服务器的 macOS 版本自动隐藏已知不可用动作。若在 macOS 26 (Tahoe) 上仍显示 edit，请手动设置 `channels.bluebubbles.actions.edit=false`。
- 查看状态/健康信息：`openclaw status --all` 或 `openclaw status --deep`。

通用渠道工作流参考见 [通道](/zh/channels) 与 [插件](/zh/plugins) 指南。
