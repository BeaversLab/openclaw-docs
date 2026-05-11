---
summary: "通过 BlueBubbles macOS 服务器实现 iMessage（REST 发送/接收、正在输入、反应、配对、高级操作）。"
read_when:
  - Setting up BlueBubbles channel
  - Troubleshooting webhook pairing
  - Configuring iMessage on macOS
title: "BlueBubbles"
sidebarTitle: "BlueBubbles"
---

状态：内置插件，通过 HTTP 与 BlueBubbles macOS 服务器通信。由于其拥有更丰富的 API 且相比旧版 imsg 渠道 设置更简单，**推荐用于 iMessage 集成**。

<Note>当前的 OpenClaw 版本已捆绑 BlueBubbles，因此常规打包版本不需要单独的 `openclaw plugins install` 步骤。</Note>

## 概述

- 通过 BlueBubbles 辅助应用程序在 macOS 上运行 ([bluebubbles.app](https://bluebubbles.app))。
- 推荐/测试环境：macOS Sequoia (15)。macOS Tahoe (26) 可用；但在 Tahoe 上编辑功能目前损坏，群组图标更新可能报告成功但不会同步。
- OpenClaw 通过其 REST API (`GET /api/v1/ping`, `POST /message/text`, `POST /chat/:id/*`) 与其通信。
- 传入消息通过 webhooks 到达；传出回复、正在输入指示器、已读回执和点回（tapbacks）均为 REST 调用。
- 附件和贴纸作为入站媒体被摄取（并在可能时呈现给代理）。
- 合成 MP3 或 CAF 音频的自动 TTS 回复将作为 iMessage 语音备忘录气泡传送，而不是普通文件附件。
- 配对/允许列表（allowlist）的工作方式与其他通道（`/channels/pairing` 等）相同，使用 `channels.bluebubbles.allowFrom` + 配对码。
- 反应会像 Slack/Telegram 一样作为系统事件呈现，因此座席可以在回复前“提及”它们。
- 高级功能：编辑、撤销、回复线程、消息效果、群组管理。

## 快速开始

<Steps>
  <Step title="安装 BlueBubbles">
    在您的 Mac 上安装 BlueBubbles 服务器（请遵循 [bluebubbles.app/install](https://bluebubbles.app/install) 上的说明）。
  </Step>
  <Step title="启用 web API">
    在 BlueBubbles 配置中，启用 web API 并设置密码。
  </Step>
  <Step title="配置 OpenClaw">
    运行 `openclaw onboard` 并选择 BlueBubbles，或手动配置：

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

  </Step>
  <Step title="将 webhooks 指向网关">
    将 BlueBubbles webhooks 指向您的网关（例如：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）。
  </Step>
  <Step title="启动网关">
    启动网关；它将注册 webhook 处理程序并开始配对。
  </Step>
</Steps>

<Warning>
**安全性**

- 始终设置 webhook 密码。
- Webhook 认证始终是必需的。OpenClaw 会拒绝 BlueBubbles 的 webhook 请求，除非它们包含与 `channels.bluebubbles.password` 匹配的密码/guid（例如 `?password=<password>` 或 `x-password`），无论是否为环回/代理拓扑。
- 密码认证会在读取/解析完整的 webhook 正文之前进行检查。
  </Warning>

## 保持 Messages.app 活跃（虚拟机 / 无头设置）

某些 macOS 虚拟机 / 始终开启设置可能会导致 Messages.app 进入“空闲”状态（传入事件停止，直到应用被打开/置于前台）。一个简单的解决方法是使用 AppleScript + LaunchAgent **每 5 分钟唤醒一次 Messages**。

<Steps>
  <Step title="保存 AppleScript">
    将此保存为 `~/Scripts/poke-messages.scpt`：

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

  </Step>
  <Step title="安装 LaunchAgent">
    将此保存为 `~/Library/LaunchAgents/com.user.poke-messages.plist`：

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

    这将 **每 300 秒运行一次** 并 **在登录时运行**。首次运行可能会触发 macOS **自动化** 提示（`osascript` → Messages）。请在运行 LaunchAgent 的同一用户会话中批准它们。

  </Step>
  <Step title="加载它">
    ```bash
    launchctl unload ~/Library/LaunchAgents/com.user.poke-messages.plist 2>/dev/null || true
    launchctl load ~/Library/LaunchAgents/com.user.poke-messages.plist
    ```
  </Step>
</Steps>

## 新手引导

BlueBubbles 可在交互式新手引导中使用：

```
openclaw onboard
```

向导将提示输入：

<ParamField path="Server URL" type="string" required>
  BlueBubbles 服务器地址（例如 `http://192.168.1.100:1234`）。
</ParamField>
<ParamField path="Password" type="string" required>
  来自 API 服务器设置的 BlueBubbles 密码。
</ParamField>
<ParamField path="Webhook path" type="string" default="/bluebubbles-webhook">
  Webhook 端点路径。
</ParamField>
<ParamField path="DM policy" type="string">
  `pairing`、`allowlist`、`open` 或 `disabled`。
</ParamField>
<ParamField path="Allow list" type="string[]">
  电话号码、电子邮件或聊天目标。
</ParamField>

您也可以通过 BlueBubbles 添加 CLI：

```
openclaw channels add bluebubbles --http-url http://192.168.1.100:1234 --password <password>
```

## 访问控制（私信 + 群组）

<Tabs>
  <Tab title="私信">
    - 默认：`channels.bluebubbles.dmPolicy = "pairing"`。
    - 未知发送者会收到配对码；在获得批准之前消息将被忽略（代码 1 小时后过期）。
    - 批准方式：
      - `openclaw pairing list bluebubbles`
      - `openclaw pairing approve bluebubbles <CODE>`
    - 配对是默认的令牌交换方式。详情：[配对](/zh/channels/pairing)
  </Tab>
  <Tab title="群组">
    - `channels.bluebubbles.groupPolicy = open | allowlist | disabled`（默认：`allowlist`）。
    - `channels.bluebubbles.groupAllowFrom` 控制当设置 `allowlist` 时谁可以在群组中触发。
  </Tab>
</Tabs>

### 联系人姓名充实（macOS，可选）

BlueBubbles 群组 webhook 通常只包含原始参与者地址。如果您希望 `GroupMembers` 上下文显示本地联系人姓名，可以选择在 macOS 上启用本地联系人充实功能：

- `channels.bluebubbles.enrichGroupParticipantsFromContacts = true` 启用查找。默认：`false`。
- 查找仅在群组访问权限、命令授权和提及限制均允许消息通过后运行。
- 仅未命名的电话参与者会被充实。
- 当未找到本地匹配项时，原始电话号码将作为备用选项保留。

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

BlueBubbles 支持群聊的提及限制，匹配 iMessage/WhatsApp 的行为：

- 使用 `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）来检测提及。
- 当为群组启用 `requireMention` 时，代理仅在收到提及时才会响应。
- 来自授权发送者的控制命令会绕过提及限制。

按群组配置：

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
- 授权发送者即使未在群组中提及，也可以运行控制命令。

### 按群组的系统提示词

`channels.bluebubbles.groups.*` 下的每个条目接受一个可选的 `systemPrompt` 字符串。该值会在处理该群组消息的每一轮对话中注入到代理的系统提示词中，因此您可以设置每个群组的人设或行为规则，而无需编辑代理提示词：

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

键匹配 BlueBubbles 为该群组报告的 `chatGuid` / `chatIdentifier` / 数字 `chatId`，而 `"*"` 通配符条目为每个没有精确匹配的群组提供默认值（与 `requireMention` 和按群组工具策略使用的模式相同）。精确匹配始终优先于通配符。私信会忽略此字段；请改用代理级或账户级的提示词自定义。

#### 实战示例：串联回复和点按反应（私有 API）

启用 BlueBubbles 私有 API 后，入站消息会带有短消息 ID（例如 `[[reply_to:5]]`），代理可以调用 `action=reply` 以串联回复特定消息，或调用 `action=react` 以发送点按反应。按群组 `systemPrompt` 是确保代理选择正确工具的可靠方法：

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

点按反应和串联回复都需要 BlueBubbles 私有 API；有关底层机制，请参阅[高级操作](#advanced-actions)和[消息 ID](#message-ids-short-vs-full)。

## ACP 会话绑定

BlueBubbles 聊天可以转换为持久的 ACP 工作区，而无需更改传输层。

快速操作流程：

- 在私信或允许的群聊中运行 `/acp spawn codex --bind here`。
- 同一 BlueBubbles 对话中的后续消息将路由到生成的 ACP 会话。
- `/new` 和 `/reset` 会原地重置同一绑定的 ACP 会话。
- `/acp close` 会关闭 ACP 会话并移除绑定。

还支持通过带有 `type: "acp"` 和 `match.channel: "bluebubbles"` 的顶级 `bindings[]` 条目来配置持久绑定。

`match.peer.id` 可以使用任何支持的 BlueBubbles 目标格式：

- 标准化的私信句柄，例如 `+15555550123` 或 `user@example.com`
- `chat_id:<id>`
- `chat_guid:<guid>`
- `chat_identifier:<identifier>`

对于稳定的群组绑定，建议优先使用 `chat_id:*` 或 `chat_identifier:*`。

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

- **正在输入指示器**：在生成响应之前和生成期间自动发送。
- **已读回执**：由 `channels.bluebubbles.sendReadReceipts` 控制（默认值：`true`）。
- **正在输入指示器**：OpenClaw 发送正在输入开始事件；BlueBubbles 会在发送或超时时自动清除正在输入状态（通过 DELETE 手动停止不可靠）。

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

<AccordionGroup>
  <Accordion title="可用操作">
    - **react**：添加/删除轻触反应（`messageId`、`emoji`、`remove`）。iMessage 原生的轻触反应集合为 `love`、`like`、`dislike`、`laugh`、`emphasize` 和 `question`。当代理选择了该集合之外的表情符号（例如 `👀`）时，反应工具会回退到 `love`，以便轻触反应仍能渲染，而不是导致整个请求失败。已配置的确认反应仍会进行严格验证，并在遇到未知值时报错。 - **edit**：编辑已发送的消息（`messageId`、`text`）。 -
    **unsend**：撤回一条消息（`messageId`）。 - **reply**：回复特定消息（`messageId`、`text`、`to`）。 - **sendWithEffect**：发送时带 iMessage 效果（`text`、`to`、`effectId`）。 - **renameGroup**：重命名群组聊天（`chatGuid`、`displayName`）。 - **setGroupIcon**：设置群组聊天的图标/照片（`chatGuid`、`media`） — 在 macOS 26 Tahoe 上不稳定（API 可能返回成功但图标不同步）。 -
    **addParticipant**：将某人添加到群组（`chatGuid`、`address`）。 - **removeParticipant**：从群组中移除某人（`chatGuid`、`address`）。 - **leaveGroup**：离开群组聊天（`chatGuid`）。 - **upload-file**：发送媒体/文件（`to`、`buffer`、`filename`、`asVoice`）。 - 语音备忘录：将 `asVoice: true` 设置为 **MP3** 或 **CAF** 音频，以作为 iMessage 语音消息发送。发送语音备忘录时，BlueBubbles 会将 MP3 转换为
    CAF。 - 旧版别名：`sendAttachment` 仍然有效，但 `upload-file` 是规范的操作名称。
  </Accordion>
</AccordionGroup>

### 消息 ID（短 ID 与完整 ID）

OpenClaw 可能会显示*短*消息 ID（例如，`1`、`2`）以节省 token。

- `MessageSid` / `ReplyToId` 可以是短 ID。
- `MessageSidFull` / `ReplyToIdFull` 包含提供商的完整 ID。
- 短 ID 存储在内存中；在重启或缓存驱逐后它们可能会过期。
- 操作接受短 ID 或完整 `messageId`，但如果短 ID 不再可用则会报错。

对于持久的自动化和存储，请使用完整 ID：

- 模板：`{{MessageSidFull}}`、`{{ReplyToIdFull}}`
- 上下文：入站负载中的 `MessageSidFull` / `ReplyToIdFull`

有关模板变量，请参阅[配置](/zh/gateway/configuration)。

<a id="coalescing-split-send-dms-command--url-in-one-composition"></a>

## 合并拆分发送的私信（一条消息中包含命令 + URL）

当用户在 iMessage 中同时输入命令和 URL 时——例如 `Dump https://example.com/article` —— Apple 会将发送拆分为**两次单独的 webhook 投递**：

1. 一条文本消息（`"Dump"`）。
2. 一个带有 OG 预览图像作为附件的 URL 预览气泡（`"https://..."`）。

在大多数设置中，这两个 webhook 到达 OpenClaw 的时间相隔约 0.8-2.0 秒。如果不合并，代理在第 1 轮仅收到命令，并回复（通常是“发送 URL 给我”），而在第 2 轮才看到 URL —— 此时命令上下文已丢失。

`channels.bluebubbles.coalesceSameSenderDms` 选择将私信中的连续相同发送者 webhook 合并为单个代理轮次。群聊继续按消息键入，以保留多用户轮次结构。

<Tabs>
  <Tab title="When to enable">
    在以下情况下启用：

    - 您构建的技能期望在一个消息中包含 `command + payload`（转储、粘贴、保存、队列等）。
    - 您的用户将 URL、图像或长内容与命令一起粘贴。
    - 您可以接受增加的私信轮次延迟（见下文）。

    在以下情况下保持禁用：

    - 您需要单字私信触发器的最小命令延迟。
    - 您的所有流程都是没有后续负载的一次性命令。

  </Tab>
  <Tab title="启用">
    ```json5
    {
      channels: {
        bluebubbles: {
          coalesceSameSenderDms: true, // opt in (default: false)
        },
      },
    }
    ```

    开启该标志且未显式指定 `messages.inbound.byChannel.bluebubbles` 时，去抖动窗口将扩大至 **2500 ms**（非合并的默认值为 500 ms）。需要更宽的窗口 — Apple 的分批发送节奏为 0.8-2.0 s，无法适应较紧凑的默认窗口。

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

  </Tab>
  <Tab title="权衡">
    - **私信控制命令的延迟增加。** 开启该标志后，私信控制命令消息（如 `Dump`、`Save` 等）现在会在发送前等待去抖动窗口的时间，以防有 payload webhook 到来。群聊命令保持即时发送。
    - **合并输出受限** — 合并文本上限为 4000 个字符，并带有明确的 `…[truncated]` 标记；附件上限为 20 个；源条目上限为 10 个（超过此数量后保留第一个和最新的）。每个源 `messageId` 仍会到达入站去重，因此稍后对任何单个事件的 MessagePoller 重放都会被识别为重复。
    - **可选，按渠道。** 其他渠道（Telegram、WhatsApp、Slack，…）不受影响。
  </Tab>
</Tabs>

### 场景及代理看到的内容

| 用户组合                                          | Apple 传送                 | 标志关闭（默认）                     | 标志开启 + 2500 ms 窗口                              |
| ------------------------------------------------- | -------------------------- | ------------------------------------ | ---------------------------------------------------- |
| `Dump https://example.com`（一次发送）            | 2 个 webhook，间隔约 1 秒  | 两次代理轮次：先是“Dump”，然后是 URL | 一次轮次：合并文本 `Dump https://example.com`        |
| `Save this 📎image.jpg caption`（附件 + 文本）    | 2 个 webhook               | 两次轮次                             | 一次轮次：文本 + 图片                                |
| `/status`（独立命令）                             | 1 个 webhook               | 即时发送                             | **等待至窗口结束，然后发送**                         |
| 单独粘贴 URL                                      | 1 个 webhook               | 即时发送                             | 即时发送（桶中仅有一个条目）                         |
| 文本 + URL 作为两条特意分开的消息发送，相隔数分钟 | 2 个 webhook，位于窗口之外 | 两次轮次                             | 两次轮次（窗口在它们之间过期）                       |
| 快速刷屏（窗口内有 >10 条小私信）                 | N 个 webhook               | N 次轮次                             | 一次轮次，输出受限（首个 + 最新，应用文本/附件上限） |

### 分批发送合并故障排除

如果标志已开启，但分批发送仍然作为两次轮次到达，请检查每一层：

<AccordionGroup>
  <Accordion title="配置实际已加载">
    ```
    grep coalesceSameSenderDms ~/.openclaw/openclaw.json
    ```

    然后 `openclaw gateway restart` —— 该标志在创建防抖注册表时被读取。

  </Accordion>
  <Accordion title="防抖窗口足够适应您的设置">
    查看 BlueBubbles 服务器日志下的 `~/Library/Logs/bluebubbles-server/main.log`：

    ```
    grep -E "Dispatching event to webhook" main.log | tail -20
    ```

    测量 `"Dump"` 风格文本发送与随后的 `"https://..."; Attachments:` 发送之间的间隔。提高 `messages.inbound.byChannel.bluebubbles` 以充分覆盖该间隔。

  </Accordion>
  <Accordion title="会话 JSONL 时间戳 ≠ Webhook 到达时间">
    会话事件时间戳 (`~/.openclaw/agents/<id>/sessions/*.jsonl`) 反映的是网关将消息传递给代理的时间，**而不是** webhook 到达的时间。标记为 `[Queued messages while agent was busy]` 的排队第二条消息意味着当第二个 webhook 到达时，第一轮对话仍在运行 —— 合并桶已经刷新了。请根据 BB 服务器日志而非会话日志来调整窗口。
  </Accordion>
  <Accordion title="内存压力导致回复发送变慢">
    在较小的机器（8 GB）上，代理轮次耗时可能较长，导致合并桶在回复完成前就已刷新，URL 作为排队的第二轮对话落地。检查 `memory_pressure` 和 `ps -o rss -p $(pgrep openclaw-gateway)`；如果网关 RSS 超过 ~500 MB 且压缩器处于活动状态，请关闭其他繁重进程或升级到更大的主机。
  </Accordion>
  <Accordion title="回复引用发送是不同的路径">
    如果用户点击 `Dump` 作为对现有 URL 气泡的 **回复**（iMessage 会在 Dump 气泡上显示“1 条回复”徽章），URL 位于 `replyToBody` 中，而不是在第二个 webhook 中。合并不适用 —— 这是技能/提示词的问题，而不是防抖器的问题。
  </Accordion>
</AccordionGroup>

## 分块流式传输

控制响应是作为单条消息发送还是以块的形式流式传输：

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
- 通过 `channels.bluebubbles.mediaMaxMb` 对入站和出站媒体进行容量限制（默认：8 MB）。
- 出站文本会被分块为 `channels.bluebubbles.textChunkLimit`（默认：4000 个字符）。

## 配置参考

完整配置：[Configuration](/zh/gateway/configuration)

<AccordionGroup>
  <Accordion title="连接和 Webhook">
    - `channels.bluebubbles.enabled`：启用/禁用该渠道。
    - `channels.bluebubbles.serverUrl`：BlueBubbles REST BlueBubbles 基础 URL。
    - `channels.bluebubbles.password`：API 密码。
    - `channels.bluebubbles.webhookPath`：Webhook 端点路径（默认：`/bluebubbles-webhook`）。
  </Accordion>
  <Accordion title="访问策略">
    - `channels.bluebubbles.dmPolicy`：`pairing | allowlist | open | disabled`（默认：`pairing`）。
    - `channels.bluebubbles.allowFrom`：私信允许列表（handles、emails、E.164 号码、`chat_id:*`、`chat_guid:*`）。
    - `channels.bluebubbles.groupPolicy`：`open | allowlist | disabled`（默认：`allowlist`）。
    - `channels.bluebubbles.groupAllowFrom`：群组发送者允许列表。
    - `channels.bluebubbles.enrichGroupParticipantsFromContacts`：在 macOS 上，可选地在网关通过后从本地联系人中获取未命名的群组参与者信息。默认：`false`。
    - `channels.bluebubbles.groups`：每组配置（`requireMention` 等）。
  </Accordion>
  <Accordion title="传递和分块">
    - `channels.bluebubbles.sendReadReceipts`：发送已读回执（默认：`true`）。
    - `channels.bluebubbles.blockStreaming`：启用分块流式传输（默认：`false`；流式回复所必需）。
    - `channels.bluebubbles.textChunkLimit`：出站分块大小，以字符为单位（默认：4000）。
    - `channels.bluebubbles.sendTimeoutMs`：通过 `/api/v1/message/text` 发送出站文本时的每个请求超时时间（毫秒）（默认：30000）。在 macOS 26 设置中，如果 Private API iMessage 发送在 iMessage 框架内停滞超过 60 秒，请提高此值；例如 `45000` 或 `60000`。探测、聊天查询、反应、编辑和健康检查目前保持较短的 10 秒默认值；计划作为后续工作将覆盖范围扩大到反应和编辑。每个账户的覆盖设置：`channels.bluebubbles.accounts.<accountId>.sendTimeoutMs`。
    - `channels.bluebubbles.chunkMode`：`length`（默认）仅在超过 `textChunkLimit` 时才拆分；`newline` 在按长度分块之前先在空行（段落边界）处拆分。
  </Accordion>
  <Accordion title="媒体和历史记录">
    - `channels.bluebubbles.mediaMaxMb`：入站/出站媒体上限，单位 MB（默认：8）。
    - `channels.bluebubbles.mediaLocalRoots`：允许用于出站本地媒体路径的绝对本地目录的显式允许列表。除非配置此项，否则默认拒绝本地路径发送。每个账户的覆盖设置：`channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`。
    - `channels.bluebubbles.coalesceSameSenderDms`：将连续的同发送者私信 webhook 合并为一个代理轮次，以便 Apple 的文本+URL 分开发送作为一条消息到达（默认：`false`）。有关场景、窗口调整和权衡，请参阅 [合并分开发送的私信](#coalescing-split-send-dms-command--url-in-one-composition)。在未指定 `messages.inbound.byChannel.bluebubbles` 的情况下启用时，将默认入站防抖窗口从 500 毫秒扩大到 2500 毫秒。
    - `channels.bluebubbles.historyLimit`：上下文的最大群组消息数（0 表示禁用）。
    - `channels.bluebubbles.dmHistoryLimit`：私信历史记录限制。
  </Accordion>
  <Accordion title="操作和账户">
    - `channels.bluebubbles.actions`：启用/禁用特定操作。
    - `channels.bluebubbles.accounts`：多账户配置。
  </Accordion>
</AccordionGroup>

相关的全局选项：

- `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）。
- `messages.responsePrefix`。

## 寻址 / 投递目标

为了稳定的路由，建议使用 `chat_guid`：

- `chat_guid:iMessage;-;+15555550123`（首选用于群组）
- `chat_id:123`
- `chat_identifier:...`
- 直接句柄：`+15555550123`，`user@example.com`
  - 如果直接句柄没有现有的私信聊天，OpenClaw 将通过 `POST /api/v1/chat/new` 创建一个。这需要启用 BlueBubbles 私有 API。

### iMessage 与 SMS 路由

当同一句柄在 Mac 上同时具有 iMessage 和 SMS 聊天时（例如，一个已注册 iMessage 但也收到过绿色气泡回退的电话号码），OpenClaw 优先选择 iMessage 聊天，且绝不会静默降级到 SMS。要强制使用 SMS 聊天，请使用显式的 `sms:` 目标前缀（例如 `sms:+15555550123`）。没有匹配 iMessage 聊天的句柄仍然通过 BlueBubbles 报告的任何聊天发送。

## 安全性

- Webhook 请求通过将 `guid`/`password` 查询参数或标头与 `channels.bluebubbles.password` 进行比较来验证身份。
- 请保持 API 密码和 webhook 端点的机密性（将它们视为凭据）。
- 对于 BlueBubbles webhook 验证，没有本地主机绕过机制。如果您代理 webhook 流量，请保持 BlueBubbles 密码在请求中端到端传递。在此处 `gateway.trustedProxies` 不会替换 `channels.bluebubbles.password`。参见 [Gateway(网关) 安全性](/zh/gateway/security#reverse-proxy-configuration)。
- 如果在局域网外暴露 BlueBubbles 服务器，请在其上启用 HTTPS 和防火墙规则。

## 故障排除

- 如果输入/已读事件停止工作，请检查 BlueBubbles webhook 日志并验证网关路径是否匹配 `channels.bluebubbles.webhookPath`。
- 配对码在一小时后过期；请使用 `openclaw pairing list bluebubbles` 和 `openclaw pairing approve bluebubbles <code>`。
- 表情回应需要 BlueBubbles 私有 API (`POST /api/v1/message/react`)；请确保服务器版本已将其公开。
- 编辑/取消发送需要 macOS 13+ 和兼容的 BlueBubbles 服务器版本。在 macOS 26 (Tahoe) 上，由于私有 API 变更，编辑功能目前无法使用。
- 在 macOS 26 (Tahoe) 上，群组图标更新可能不稳定：API 可能返回成功，但新图标不会同步。
- OpenClaw 会根据 BlueBubbles 服务器的 macOS 版本自动隐藏已知损坏的操作。如果在 macOS 26 (Tahoe) 上仍显示编辑选项，请使用 `channels.bluebubbles.actions.edit=false` 手动将其禁用。
- 已启用 `coalesceSameSenderDms`，但分段发送（例如 `Dump` + URL）仍然作为两个回合到达：请参阅 [分段发送合并故障排除](#split-send-coalescing-troubleshooting) 检查清单 —— 常见原因包括去抖动窗口过紧、会话日志时间戳被误读为 Webhook 到达时间，或者是回复引用发送（这使用 `replyToBody`，而不是第二个 Webhook）。
- 有关状态/健康信息：`openclaw status --all` 或 `openclaw status --deep`。

有关一般渠道工作流参考，请参阅 [渠道](/zh/channels) 和 [插件](/zh/tools/plugin) 指南。

## 相关

- [渠道路由](/zh/channels/channel-routing) — 消息的会话路由
- [渠道概述](/zh/channels) — 所有支持的渠道
- [群组](/zh/channels/groups) — 群聊行为和提及门控
- [配对](/zh/channels/pairing) — 私信认证和配对流程
- [安全](/zh/gateway/security) — 访问模型和加固
