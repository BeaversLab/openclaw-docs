---
summary: "通过 BlueBubbles macOS 服务器实现 iMessage（REST 发送/接收、正在输入、反应、配对、高级操作）。"
read_when:
  - Setting up BlueBubbles channel
  - Troubleshooting webhook pairing
  - Configuring iMessage on macOS
title: "BlueBubbles"
---

# BlueBubbles (macOS REST)

状态：内置插件，通过 HTTP 与 BlueBubbles macOS 服务器通信。由于其拥有更丰富的 API 且相比旧版 imsg 渠道 设置更简单，**推荐用于 iMessage 集成**。

## 捆绑插件

当前的 OpenClaw 发布版本捆绑了 BlueBubbles，因此普通的打包版本不需要单独的 `openclaw plugins install` 步骤。

## 概述

- 通过 BlueBubbles 助手应用在 macOS 上运行 ([bluebubbles.app](https://bluebubbles.app))。
- 推荐/测试版本：macOS Sequoia (15)。macOS Tahoe (26) 也可以使用；但在 Tahoe 上目前编辑功能损坏，且群组图标更新可能报告成功但并未同步。
- OpenClaw 通过其 REST API 与其通信（`GET /api/v1/ping`、`POST /message/text`、`POST /chat/:id/*`）。
- 传入消息通过 webhook 到达；传出回复、正在输入指示器、已读回执和点回（tapbacks）均为 REST 调用。
- 附件和贴纸作为入站媒体被接收（并尽可能向代理展示）。
- 配对/允许列表的工作方式与其他渠道相同（`/channels/pairing` 等），使用 `channels.bluebubbles.allowFrom` + 配对码。
- 反应会像 Slack/Telegram 一样作为系统事件呈现，因此座席可以在回复前“提及”它们。
- 高级功能：编辑、撤销、回复线程、消息效果、群组管理。

## 快速开始

1. 在您的 Mac 上安装 BlueBubbles 服务器（请遵循 [bluebubbles.app/install](https://bluebubbles.app/install) 上的说明）。
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

4. 将 BlueBubbles webhooks 指向您的网关（例如：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）。
5. 启动网关；它将注册 webhook 处理程序并开始配对。

安全提示：

- 务必设置 webhook 密码。
- 始终需要 Webhook 身份验证。除非 BlueBubbles webhook 请求包含与 `channels.bluebubbles.password` 匹配的密码/guid（例如 `?password=<password>` 或 `x-password`），否则 OpenClaw 将拒绝这些请求，无论回环/代理拓扑如何。
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
- 首次运行可能会触发 macOS **自动化（Automation）** 提示（`osascript` → Messages）。请在运行 LaunchAgent 的同一用户会话中批准它们。

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

- **Server URL**（必填）：BlueBubbles 服务器地址（例如，`http://192.168.1.100:1234`）
- **密码**（必填）：来自 API 服务器设置的 BlueBubbles 密码
- **Webhook path**（可选）：默认为 `/bluebubbles-webhook`
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
- 配对是默认的令牌交换。详情：[配对](/zh/channels/pairing)

群组：

- `channels.bluebubbles.groupPolicy = open | allowlist | disabled`（默认：`allowlist`）。
- `channels.bluebubbles.groupAllowFrom` 控制在设置了 `allowlist` 的情况下谁可以在群组中触发。

### 联系人姓名填充（macOS，可选）

BlueBubbles 群组 Webhook 通常仅包含原始参与者地址。如果您希望 `GroupMembers` 上下文显示本地联系人姓名，可以选择在 macOS 上启用本地联系人联系人增强功能：

- `channels.bluebubbles.enrichGroupParticipantsFromContacts = true` 启用查找。默认值：`false`。
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

- 控制命令（例如 `/config`、`/model`）需要授权。
- 使用 `allowFrom` 和 `groupAllowFrom` 来确定命令授权。
- 授权发送者即使不在群组中提及也可以运行控制命令。

### Per-group system prompt

`channels.bluebubbles.groups.*` 下的每个条目都接受一个可选的 `systemPrompt` 字符串。该值会在处理该组消息的每一轮中注入到代理的系统提示中，因此您无需编辑代理提示即可设置针对每个组的人格或行为规则：

```json5
{
  channels: {
    bluebubbles: {
      groups: {
        "iMessage;-;chat123": {
          systemPrompt: "Keep responses under 3 sentences. Mirror the group's casual tone.",
        },
      },
    },
  },
}
```

键匹配 BlueBubbles 报告的组 `chatGuid` / `chatIdentifier` / 数字 `chatId`，而 `"*"` 通配符条目为没有精确匹配的每个组提供默认值（与 `requireMention` 和每组工具策略使用的模式相同）。精确匹配始终优先于通配符。私信忽略此字段；请改用代理级别或账户级别的提示自定义。

#### 实操示例： threaded replies 和 tapback reactions (Private API)

启用 BlueBubbles 私有 API 后，传入消息会带有短消息 ID（例如 `[[reply_to:5]]`），代理可以调用 `action=reply` 回复特定消息或调用 `action=react` 发送轻点回应。每组的 `systemPrompt` 是确保代理选择正确工具的一种可靠方法：

```json5
{
  channels: {
    bluebubbles: {
      groups: {
        "iMessage;+;chat-family": {
          systemPrompt: [
            "When replying in this group, always call action=reply with the",
            "[[reply_to:N]] messageId from context so your response threads",
            "under the triggering message. Never send a new unlinked message.",
            "",
            "For short acknowledgements ('ok', 'got it', 'on it'), use",
            "action=react with an appropriate tapback emoji (❤️, 👍, 😂, ‼️, ❓)",
            "instead of sending a text reply.",
          ].join(" "),
        },
      },
    },
  },
}
```

轻点回应和 threaded replies 都需要 BlueBubbles 私有 API；有关底层机制，请参阅 [Advanced actions](#advanced-actions) 和 [Message IDs](#message-ids-short-vs-full)。

## ACP conversation bindings

BlueBubbles 聊天可以转换为持久的 ACP 工作空间，而无需更改传输层。

快速操作流程：

- 在私信或允许的群组聊天中运行 `/acp spawn codex --bind here`。
- 该 BlueBubbles 对话中的后续消息将路由到生成的 ACP 会话。
- `/new` 和 `/reset` 原地重置相同的绑定 ACP 会话。
- `/acp close` 关闭 ACP 会话并移除绑定。

还通过带有 `type: "acp"` 和 `match.channel: "bluebubbles"` 的顶级 `bindings[]` 条目支持配置的持久绑定。

`match.peer.id` 可以使用任何支持的 BlueBubbles 目标格式：

- 规范化的私信句柄，例如 `+15555550123` 或 `user@example.com`
- `chat_id:<id>`
- `chat_guid:<guid>`
- `chat_identifier:<identifier>`

对于稳定的群组绑定，首选 `chat_id:*` 或 `chat_identifier:*`。

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

有关共享 ACP 绑定行为，请参阅 [ACP 代理](/zh/tools/acp-agents)。

## 正在输入 + 已读回执

- **正在输入指示器**：在生成响应之前和期间自动发送。
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

BlueBubbles 支持在配置中启用时使用高级消息操作：

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

- **react**：添加/删除轻触反应（`messageId`、`emoji`、`remove`）。iMessage 的原生轻触表情集是 `love`、`like`、`dislike`、`laugh`、`emphasize` 和 `question`。当代理选择该集合之外的表情符号（例如 `👀`）时，反应工具将回退到 `love`，以便轻触表情仍然能够渲染，而不是导致整个请求失败。配置的确认反应仍然会进行严格验证，并在遇到未知值时报错。
- **edit**：编辑已发送的消息（`messageId`、`text`）
- **unsend**：取消发送一条消息（`messageId`）
- **reply**：回复特定消息（`messageId`、`text`、`to`）
- **sendWithEffect**：使用 iMessage 特效发送（`text`、`to`、`effectId`）
- **renameGroup**：重命名群组聊天（`chatGuid`、`displayName`）
- **setGroupIcon**：设置群聊的图标/照片（`chatGuid`，`media`）—— 在 macOS 26 Tahoe 上不稳定（API 可能返回成功，但图标未同步）。
- **addParticipant**：将某人添加到群组（`chatGuid`，`address`）
- **removeParticipant**：从群组中移除某人（`chatGuid`，`address`）
- **leaveGroup**：退出群聊（`chatGuid`）
- **upload-file**：发送媒体/文件（`to`，`buffer`，`filename`，`asVoice`）
  - 语音备忘录：设置 `asVoice: true` 并带有 **MP3** 或 **CAF** 音频，以作为 iMessage 语音消息发送。当发送语音备忘录时，BlueBubbles 会将 MP3 转换为 CAF。
- 旧版别名：`sendAttachment` 仍然有效，但 `upload-file` 是规范的操作名称。

### 消息 ID（短 ID vs 完整 ID）

OpenClaw 可能会显示 _简短_ 的消息 ID（例如 `1`，`2`）以节省令牌。

- `MessageSid` / `ReplyToId` 可以是简短 ID。
- `MessageSidFull` / `ReplyToIdFull` 包含提供商的完整 ID。
- 短 ID 存储在内存中；它们可能会在重启或缓存清除时过期。
- 操作接受简短或完整的 `messageId`，但如果简短 ID 不再可用，则会报错。

对于持久的自动化和存储，请使用完整 ID：

- 模板：`{{MessageSidFull}}`，`{{ReplyToIdFull}}`
- 上下文：入站负载中的 `MessageSidFull` / `ReplyToIdFull`

有关模板变量，请参阅 [配置](/zh/gateway/configuration)。

<a id="coalescing-split-send-dms-command--url-in-one-composition"></a>

## 合并拆分发送的私信（一条消息中包含命令 + URL）

当用户在 iMessage 中同时输入命令和 URL 时——例如 `Dump https://example.com/article` —— Apple 会将发送拆分为 **两次单独的 webhook 传递**：

1. 一条文本消息（`"Dump"`）。
2. 一个 URL 预览气泡（`"https://..."`），其中 OG 预览图片作为附件。

在大多数设置中，这两个 webhook 到达 OpenClaw 的时间相隔约 0.8-2.0 秒。如果不进行合并，代理会在第 1 轮单独收到命令，进行回复（通常是“发送 URL 给我”），然后直到第 2 轮才看到 URL —— 此时命令上下文已经丢失。

`channels.bluebubbles.coalesceSameSenderDms` 选项将私信设置为将连续的同一发送者 webhook 合并为一个代理轮次。群聊继续按每条消息进行键控，以保留多用户轮次结构。

### 何时启用

在以下情况下启用：

- 您提供的技能期望 `command + payload` 出现在一条消息中（转储、粘贴、保存、队列等）。
- 您的用户在发送命令的同时粘贴 URL、图片或长内容。
- 您可以接受增加的私信轮次延迟（见下文）。

在以下情况下保持禁用：

- 您需要针对单字私信触发器的最低命令延迟。
- 您的所有流程都是一次性命令，没有后续负载。

### 启用

```json5
{
  channels: {
    bluebubbles: {
      coalesceSameSenderDms: true, // opt in (default: false)
    },
  },
}
```

开启该标志且未显式设置 `messages.inbound.byChannel.bluebubbles` 时，去抖动窗口将扩大至 **2500 ms**（非合并模式的默认值为 500 ms）。需要更宽的窗口 —— Apple 0.8-2.0 秒的分批发送节奏无法适应更紧凑的默认窗口。

要自行调整窗口：

```json5
{
  messages: {
    inbound: {
      byChannel: {
        // 2500 ms works for most setups; raise to 4000 ms if your Mac is slow
        // or under memory pressure (observed gap can stretch past 2 s then).
        bluebubbles: 2500,
      },
    },
  },
}
```

### 权衡

- **私信控制命令增加了延迟。** 开启该标志后，私信控制命令消息（如 `Dump`、`Save` 等）现在会在调度前等待去抖动窗口的时间，以防有负载 webhook 正在传来。群聊命令保持即时调度。
- **合并输出是有界的** —— 合并文本上限为 4000 个字符，并带有显式的 `…[truncated]` 标记；附件上限为 20 个；源条目上限为 10 个（超过此数量保留最早和最新的）。每个源 `messageId` 仍会到达入站去重，因此后续 MessagePoller 对任何单个事件的回放都会被识别为重复项。
- **选择性加入，按渠道。** 其他渠道（Telegram、WhatsApp、Slack 等）不受影响。

### 场景及代理看到的内容

| 用户编写                                          | Apple 投递                | 标志关闭（默认）                     | 标志开启 + 2500 ms 窗口                                    |
| ------------------------------------------------- | ------------------------- | ------------------------------------ | ---------------------------------------------------------- |
| `Dump https://example.com`（一次发送）            | 2 个 webhook，相隔约 1 秒 | 两个代理轮次：先是“Dump”，然后是 URL | 一个轮次：合并文本 `Dump https://example.com`              |
| `Save this 📎image.jpg caption`（附件 + 文本）    | 2 个 webhook              | 两个轮次                             | 一个轮次：文本 + 图片                                      |
| `/status` (独立命令)                              | 1 个 webhook              | 即时发送                             | **等待至窗口结束，然后发送**                               |
| 单独粘贴 URL                                      | 1 个 webhook              | 即时发送                             | 即时发送（桶中仅有一个条目）                               |
| 文本 + URL 作为两条有意分开的消息发送，间隔数分钟 | 窗口外 2 个 webhook       | 两次轮次                             | 两次轮次（窗口在它们之间过期）                             |
| 快速密集发送（窗口内 >10 条小私信）               | N 个 webhook              | N 次轮次                             | 一次轮次，受限制的输出（首条 + 最新，应用了文本/附件限制） |

### 拆分发送合并故障排除

如果该标志已开启且拆分发送仍作为两次轮次到达，请检查每一层：

1. **配置确实已加载。**

   ```
   grep coalesceSameSenderDms ~/.openclaw/openclaw.json
   ```

   然后 `openclaw gateway restart` — 该标志在创建 debouncer-registry 时被读取。

2. **防抖窗口对于您的设置来说足够宽。** 查看 BlueBubbles 服务器日志下的 `~/Library/Logs/bluebubbles-server/main.log`：

   ```
   grep -E "Dispatching event to webhook" main.log | tail -20
   ```

   测量 `"Dump"` 风格的文本发送与其后随的 `"https://..."; Attachments:` 发送之间的间隔。提高 `messages.inbound.byChannel.bluebubbles` 以便充分覆盖该间隔。

3. **会话 JSONL 时间戳 ≠ webhook 到达时间。** 会话事件时间戳（`~/.openclaw/agents/<id>/sessions/*.jsonl`）反映的是网关将消息交给代理的时间，**而非** webhook 到达的时间。标记为 `[Queued messages while agent was busy]` 的排队第二条消息意味着当第二个 webhook 到达时，第一次轮次仍在运行 —— 合并桶已经被刷新。请根据 BB 服务器日志而非会话日志来调整窗口。

4. **内存压力减缓回复发送。** 在较小的机器（8 GB）上，代理轮次可能耗时过长，导致合并桶在回复完成之前就已刷新，URL 从而作为排队的第二次轮次着陆。检查 `memory_pressure` 和 `ps -o rss -p $(pgrep openclaw-gateway)`；如果网关的 RSS 超过 ~500 MB 且压缩器处于活动状态，请关闭其他繁重进程或升级到更大的主机。

5. **回复引用发送是不同的路径。** 如果用户点击 `Dump` 作为对现有 URL 气泡的**回复**（iMessage 在 Dump 气泡上显示“1 回复”徽章），URL 位于 `replyToBody` 中，而不是第二个 webhook 中。合并不适用 —— 这是一个技能/提示词问题，而不是防抖器问题。

## 分块流式传输

控制响应是作为单条消息发送还是以分块方式流式传输：

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
- 通过 `channels.bluebubbles.mediaMaxMb` 设置入站和出站媒体的容量上限（默认：8 MB）。
- 出站文本会被分块至 `channels.bluebubbles.textChunkLimit`（默认：4000 个字符）。

## 配置参考

完整配置：[Configuration](/zh/gateway/configuration)

提供程序选项：

- `channels.bluebubbles.enabled`：启用/禁用该渠道。
- `channels.bluebubbles.serverUrl`：BlueBubbles REST API 基础 URL。
- `channels.bluebubbles.password`：API 密码。
- `channels.bluebubbles.webhookPath`：Webhook 端点路径（默认：`/bluebubbles-webhook`）。
- `channels.bluebubbles.dmPolicy`：`pairing | allowlist | open | disabled`（默认：`pairing`）。
- `channels.bluebubbles.allowFrom`：私信白名单（句柄、电子邮件、E.164 号码、`chat_id:*`、`chat_guid:*`）。
- `channels.bluebubbles.groupPolicy`：`open | allowlist | disabled`（默认：`allowlist`）。
- `channels.bluebubbles.groupAllowFrom`：群组发送方白名单。
- `channels.bluebubbles.enrichGroupParticipantsFromContacts`：在 macOS 上，在通过访问控制后，可选择性地从本地通讯录中丰富未命名的群组参与者。默认：`false`。
- `channels.bluebubbles.groups`：每群组配置（`requireMention` 等）。
- `channels.bluebubbles.sendReadReceipts`：发送已读回执（默认：`true`）。
- `channels.bluebubbles.blockStreaming`：启用分块流式传输（默认：`false`；流式回复所需）。
- `channels.bluebubbles.textChunkLimit`：出站分块大小（字符）（默认：4000）。
- `channels.bluebubbles.sendTimeoutMs`：通过 `/api/v1/message/text` 发送出站文本的每个请求超时时间（以毫秒为单位，默认：30000）。在 macOS 26 设置中，如果私有 API iMessage 发送在 iMessage 框架内停滞 60 秒以上，请调高此值；例如 `45000` 或 `60000`。探测、聊天查找、回应、编辑和健康检查目前保持较短的 10 秒默认值；后续计划将覆盖范围扩大到回应和编辑。每个账户的覆盖设置：`channels.bluebubbles.accounts.<accountId>.sendTimeoutMs`。
- `channels.bluebubbles.chunkMode`：`length`（默认）仅在超过 `textChunkLimit` 时拆分；`newline` 在按长度分块之前按空行（段落边界）拆分。
- `channels.bluebubbles.mediaMaxMb`：入站/出站媒体上限（MB，默认：8）。
- `channels.bluebubbles.mediaLocalRoots`：允许用于出站本地媒体路径的绝对本地目录的显式允许列表。除非配置此项，否则默认拒绝本地路径发送。每个账户的覆盖设置：`channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`。
- `channels.bluebubbles.coalesceSameSenderDms`：将连续的同发送者私信 Webhook 合并为一个代理轮次，以便 Apple 的文本+URL 分离发送作为单条消息到达（默认：`false`）。有关场景、窗口调整和权衡，请参阅 [Coalescing split-send 私信](#coalescing-split-send-dms-command--url-in-one-composition)。在没有显式 `messages.inbound.byChannel.bluebubbles` 的情况下启用时，将默认入站防抖窗口从 500 毫秒扩大到 2500 毫秒。
- `channels.bluebubbles.historyLimit`：上下文的最大群组消息数（0 表示禁用）。
- `channels.bluebubbles.dmHistoryLimit`：私信历史记录限制。
- `channels.bluebubbles.actions`：启用/禁用特定操作。
- `channels.bluebubbles.accounts`：多账户配置。

相关的全局选项：

- `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）。
- `messages.responsePrefix`。

## 寻址 / 传递目标

为了稳定的路由，建议使用 `chat_guid`：

- `chat_guid:iMessage;-;+15555550123`（群组首选）
- `chat_id:123`
- `chat_identifier:...`
- 直接句柄：`+15555550123`、`user@example.com`
  - 如果直接句柄没有现有的私信聊天，OpenClaw 将通过 `POST /api/v1/chat/new` 创建一个。这需要启用 BlueBubbles 私有 API。

### iMessage 与 SMS 路由

当同一句柄在 Mac 上同时具有 iMessage 和 SMS 聊天时（例如，已注册 iMessage 但也收到过绿色气泡回退的电话号码），OpenClaw 优先使用 iMessage 聊天，并且绝不会自动降级为 SMS。要强制使用 SMS 聊天，请使用显式的 `sms:` 目标前缀（例如 `sms:+15555550123`）。没有匹配 iMessage 聊天的句柄仍然通过 BlueBubbles 报告的任何聊天发送。

## 安全性

- 通过将 `guid`/`password` 查询参数或请求头与 `channels.bluebubbles.password` 进行比较来验证 Webhook 请求。
- 请保护好 API 密码和 webhook 端点（将它们视为凭据）。
- 对于 BlueBubbles webhook 身份验证，没有本地主机绕过功能。如果您代理 webhook 流量，请在请求中端到端保留 BlueBubbles 密码。`gateway.trustedProxies` 在此处不替换 `channels.bluebubbles.password`。请参阅 [Gateway(网关) 安全性](/zh/gateway/security#reverse-proxy-configuration)。
- 如果将 BlueBubbles 服务器暴露在局域网之外，请在该服务器上启用 HTTPS 和防火墙规则。

## 故障排除

- 如果正在输入/已读事件停止工作，请检查 BlueBubbles webhook 日志并验证网关路径是否与 `channels.bluebubbles.webhookPath` 匹配。
- 配对代码在一小时后过期；请使用 `openclaw pairing list bluebubbles` 和 `openclaw pairing approve bluebubbles <code>`。
- 反应需要 BlueBubbles 私有 API (`POST /api/v1/message/react`)；请确保服务器版本公开了它。
- 编辑/撤销需要 macOS 13+ 和兼容的 BlueBubbles 服务器版本。在 macOS 26 (Tahoe) 上，由于私有 API 更改，编辑目前无法使用。
- 在 macOS 26 (Tahoe) 上，群组图标更新可能不稳定：API 可能返回成功，但新图标未同步。
- OpenClaw 会根据 BlueBubbles 服务器的 macOS 版本自动隐藏已知损坏的操作。如果在 macOS 26 (Tahoe) 上仍显示编辑功能，请使用 `channels.bluebubbles.actions.edit=false` 手动将其禁用。
- `coalesceSameSenderDms` 已启用，但分段发送（例如 `Dump` + URL）仍然分两轮到达：请参阅[分段发送合并故障排除](#split-send-coalescing-troubleshooting)清单 —— 常见原因是防抖窗口过紧、会话日志时间戳被误读为 web 到达时间，或者是回复引用发送（使用 `replyToBody`，而不是第二个 webhook）。
- 有关状态/健康信息：`openclaw status --all` 或 `openclaw status --deep`。

有关一般渠道工作流程参考，请参阅[渠道](/zh/channels)和[插件](/zh/tools/plugin)指南。

## 相关

- [渠道概述](/zh/channels) — 所有支持的渠道
- [配对](/zh/channels/pairing) — 私信认证和配对流程
- [群组](/zh/channels/groups) — 群聊行为和提及控制
- [渠道路由](/zh/channels/channel-routing) — 消息的会话路由
- [安全](/zh/gateway/security) — 访问模型和强化
