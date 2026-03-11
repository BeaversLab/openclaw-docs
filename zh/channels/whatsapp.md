---
summary: "WhatsApp（网络频道）集成：登录、收件箱、回复、媒体和操作"
read_when:
  - "Working on WhatsApp/web channel behavior or inbox routing"
title: "WhatsApp"
---

# WhatsApp（网络频道）

状态：仅支持通过 Baileys 使用 WhatsApp Web。Gateway 拥有会话。

## 快速设置（初学者）

1. 如果可能，请使用**单独的电话号码**（推荐）。
2. 在 `~/.openclaw/openclaw.json` 中配置 WhatsApp。
3. 运行 `openclaw channels login` 扫描二维码（已关联的设备）。
4. 启动 gateway。

最小配置：

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551234567"],
    },
  },
}
```

## 目标

- 在一个 Gateway 进程中支持多个 WhatsApp 账户（多账户）。
- 确定性路由：回复返回到 WhatsApp，不使用模型路由。
- 模型能看到足够的上下文以理解引用的回复。

## 配置写入

默认情况下，允许 WhatsApp 写入由 `/config set|unset` 触发的配置更新（需要 `commands.config: true`）。

禁用方式：

```json5
{
  channels: { whatsapp: { configWrites: false } },
}
```

## 架构（谁拥有什么）

- **Gateway** 拥有 Baileys socket 和收件箱循环。
- **CLI / macOS 应用**与 gateway 通信；不直接使用 Baileys。
- **活跃监听器**是出站发送所必需的；否则发送会快速失败。

## 获取电话号码（两种模式）

WhatsApp 需要真实的移动电话号码进行验证。VoIP 和虚拟号码通常会被阻止。有两种支持的方式在 WhatsApp 上运行 OpenClaw：

### 专用号码（推荐）

为 OpenClaw 使用**单独的电话号码**。最佳用户体验、清晰的路由、没有自聊的怪癖。理想设置：**备用/旧 Android 手机 + eSIM**。让它保持 Wi‑Fi 连接和电源，并通过二维码链接。

**WhatsApp Business：**您可以在同一设备上使用 WhatsApp Business 和不同的号码。非常适合将您的个人 WhatsApp 分开——安装 WhatsApp Business 并在那里注册 OpenClaw 号码。

**示例配置（专用号码，单用户允许列表）：**

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551234567"],
    },
  },
}
```

**配对模式（可选）：**
如果您想要配对而不是允许列表，请将 `channels.whatsapp.dmPolicy` 设置为 `pairing`。未知发件人将获得配对代码；使用以下命令批准：
`openclaw pairing approve whatsapp <code>`

### 个人号码（备用方案）

快速备用方案：在**您自己的号码**上运行 OpenClaw。给自己发送消息（WhatsApp 的"给自己发消息"）进行测试，这样您就不会骚扰联系人。在设置和实验期间，需要在主手机上读取验证码。**必须启用自聊模式。**
当向导询问您的个人 WhatsApp 号码时，请输入您将用于发送消息的电话（所有者/发件人），而不是助手号码。

**示例配置（个人号码，自聊）：**

```json
{
  "whatsapp": {
    "selfChatMode": true,
    "dmPolicy": "allowlist",
    "allowFrom": ["+15551234567"]
  }
}
```

如果未设置 `messages.responsePrefix`，自聊回复默认为 `[{identity.name}]`（如果已设置）（否则为 `[openclaw]`）。
显式设置它以自定义或禁用前缀（使用 `""` 来删除它）。

### 号码获取提示

- **本地 eSIM** 来自您所在国家/地区的移动运营商（最可靠）
  - 奥地利：[hot.at](https://www.hot.at)
  - 英国：[giffgaff](https://www.giffgaff.com) — 免费 SIM，无合同
- **预付费 SIM** — 便宜，只需要接收一条短信进行验证

**避免：** TextNow、Google Voice、大多数"免费短信"服务 — WhatsApp 会积极阻止这些服务。

**提示：** 该号码只需要接收一条验证短信。之后，WhatsApp Web 会话通过 `creds.json` 保持持久性。

## 为什么不使用 Twilio？

- 早期的 OpenClaw 版本支持 Twilio 的 WhatsApp Business 集成。
- WhatsApp Business 号码不适合个人助手。
- Meta 强制执行 24 小时回复窗口；如果您在过去 24 小时内没有回复，企业号码无法发起新消息。
- 高频或"健谈"的使用会触发激进的阻止，因为企业账户不适合发送数十条个人助手消息。
- 结果：交付不可靠且频繁阻止，因此已删除支持。

## 登录 + 凭证

- 登录命令：`openclaw channels login`（通过已关联的设备使用二维码）。
- 多账户登录：`openclaw channels login --account <id>`（`<id>` = `accountId`）。
- 默认账户（当省略 `--account` 时）：`default`（如果存在），否则是第一个配置的账户 id（已排序）。
- 凭证存储在 `~/.openclaw/credentials/whatsapp/<accountId>/creds.json` 中。
- 备份副本位于 `creds.json.bak`（在损坏时恢复）。
- 旧版兼容性：较旧的安装直接将 Baileys 文件存储在 `~/.openclaw/credentials/` 中。
- 注销：`openclaw channels logout`（或 `--account <id>`）删除 WhatsApp 认证状态（但保留共享的 `oauth.json`）。
- 已注销的 socket => 错误指示重新链接。
## 入站流程（私信 + 群组）

- WhatsApp 事件来自 `messages.upsert`（Baileys）。
- 收件箱监听器在关闭时分离，以避免在测试/重启中累积事件处理器。
- 状态/广播聊天被忽略。
- 直接聊天使用 E.164；群组使用群组 JID。
- **私信策略**：`channels.whatsapp.dmPolicy` 控制直接聊天访问（默认：`pairing`）。
  - 配对：未知发件人获得配对代码（通过 `openclaw pairing approve whatsapp <code>` 批准；代码在 1 小时后过期）。
  - 开放：要求 `channels.whatsapp.allowFrom` 包含 `"*"`。
  - 您关联的 WhatsApp 号码是隐式信任的，因此自我消息跳过 ⁠`channels.whatsapp.dmPolicy` 和 `channels.whatsapp.allowFrom` 检查。

### 个人号码模式（备用方案）

如果您在**个人 WhatsApp 号码**上运行 OpenClaw，请启用 `channels.whatsapp.selfChatMode`（请参阅上面的示例）。

行为：

- 出站私信永远不会触发配对回复（防止骚扰联系人）。
- 入站未知发件人仍然遵循 `channels.whatsapp.dmPolicy`。
- 自聊模式（allowFrom 包含您的号码）避免自动已读回执并忽略提及 JID。
- 为非自聊私信发送已读回执。

## 已读回执

默认情况下，gateway 在接受入站 WhatsApp 消息后将其标记为已读（蓝色勾号）。

全局禁用：

```json5
{
  channels: { whatsapp: { sendReadReceipts: false } },
}
```

按账户禁用：

```json5
{
  channels: {
    whatsapp: {
      accounts: {
        personal: { sendReadReceipts: false },
      },
    },
  },
}
```

注意：

- 自聊模式始终跳过已读回执。

## WhatsApp 常见问题：发送消息 + 配对

**当我关联 WhatsApp 时，OpenClaw 会给随机联系人发送消息吗？**
不会。默认私信策略是**配对**，因此未知发件人只会获得配对代码，其消息**不会被处理**。OpenClaw 仅回复它收到的聊天，或您明确触发的发送（代理/CLI）。

**WhatsApp 上的配对如何工作？**
配对是针对未知发件人的私信门：

- 来自新发件人的第一条私信返回一个短代码（消息不被处理）。
- 使用以下命令批准：`openclaw pairing approve whatsapp <code>`（使用 `openclaw pairing list whatsapp` 列出）。
- 代码在 1 小时后过期；待处理的请求每个频道最多为 3 个。

**多个人可以在一个 WhatsApp 号码上使用不同的 OpenClaw 实例吗？**
可以，通过 `bindings` 将每个发件人路由到不同的代理（peer `kind: "dm"`，发件人 E.164 如 `+15551234567`）。回复仍然来自**同一个 WhatsApp 账户**，直接聊天会折叠到每个代理的主会话，因此请**每人使用一个代理**。私信访问控制（`dmPolicy`/`allowFrom`）是每个 WhatsApp 账户的全局设置。请参阅[多代理路由](/zh/concepts/multi-agent)。
**为什么向导要询问我的电话号码？**
向导使用它来设置您的**允许列表/所有者**，以便允许您自己的私信。它不用于自动发送。如果您在个人 WhatsApp 号码上运行，请使用相同的号码并启用 `channels.whatsapp.selfChatMode`。

## 消息规范化（模型看到的内容）

- `Body` 是带有信封的当前消息正文。
- 引用回复上下文**始终附加**：
  ```
  [Replying to +1555 id:ABC123]
  <quoted text or <media:...>>
  [/Replying]
  ```
- 还设置了回复元数据：
  - `ReplyToId` = stanzaId
  - `ReplyToBody` = 引用的正文或媒体占位符
  - `ReplyToSender` = E.164（如果已知）
- 仅媒体的入站消息使用占位符：
  - `<media:image|video|audio|document|sticker>`

## 群组

- 群组映射到 `agent:<agentId>:whatsapp:group:<jid>` 会话。
- 群组策略：`channels.whatsapp.groupPolicy = open|disabled|allowlist`（默认 `allowlist`）。
- 激活模式：
  - `mention`（默认）：需要 @提及或正则匹配。
  - `always`：始终触发。
- `/activation mention|always` 仅所有者可用，必须作为独立消息发送。
- 所有者 = `channels.whatsapp.allowFrom`（如果未设置，则为自己的 E.164）。
- **历史注入**（仅待处理）：
  - 最近的_未处理_消息（默认 50 条）插入到：
    `[Chat messages since your last reply - for context]`（会话中已有的消息不会被重新注入）
  - 当前消息位于：
    `[Current message - respond to this]`
  - 附加发件人后缀：`[from: Name (+E164)]`
- 群组元数据缓存 5 分钟（主题 + 参与者）。

## 回复传递（线程化）

- WhatsApp Web 发送标准消息（当前 Gateway 中没有引用回复线程化）。
- 此频道上忽略回复标签。

## 确认反应（接收时自动反应）

WhatsApp 可以在收到传入消息后立即自动发送表情符号反应，在机器人生成回复之前。这向用户提供了其消息已收到的即时反馈。

**配置：**

```json
{
  "whatsapp": {
    "ackReaction": {
      "emoji": "👀",
      "direct": true,
      "group": "mentions"
    }
  }
}
```

**选项：**

- `emoji`（字符串）：用于确认的表情符号（例如，"👀"、"✅"、"📨"）。空或省略 = 禁用该功能。
- `direct`（布尔值，默认：`true`）：在直接/私信聊天中发送反应。
- `group`（字符串，默认：`"mentions"`）：群聊行为：
  - `"always"`：对所有群组消息做出反应（即使没有 @提及）
  - `"mentions"`：仅在机器人被 @提及时做出反应
  - `"never"`：永远不要在群组中做出反应
**按账户覆盖：**

```json
{
  "whatsapp": {
    "accounts": {
      "work": {
        "ackReaction": {
          "emoji": "✅",
          "direct": false,
          "group": "always"
        }
      }
    }
  }
}
```

**行为说明：**

- 反应在收到消息后**立即**发送，在输入指示器或机器人回复之前。
- 在具有 `requireMention: false` 的群组中（激活：始终），`group: "mentions"` 会对所有消息做出反应（不仅仅是 @提及）。
- 发后即忘：反应失败会被记录，但不会阻止机器人回复。
- 群组反应会自动包含参与者 JID。
- WhatsApp 忽略 `messages.ackReaction`；请改用 `channels.whatsapp.ackReaction`。

## 代理工具（反应）

- 工具：`whatsapp` 带有 `react` 操作（`chatJid`、`messageId`、`emoji`，可选 `remove`）。
- 可选：`participant`（群组发件人）、`fromMe`（对您自己的消息做出反应）、`accountId`（多账户）。
- 反应删除语义：请参阅[/tools/reactions](/zh/tools/reactions)。
- 工具限制：`channels.whatsapp.actions.reactions`（默认：启用）。

## 限制

- 出站文本被分块为 `channels.whatsapp.textChunkLimit`（默认 4000）。
- 可选的换行符分块：设置 `channels.whatsapp.chunkMode="newline"` 以在长度分块之前在空行（段落边界）上分割。
- 入站媒体保存受 `channels.whatsapp.mediaMaxMb` 限制（默认 50 MB）。
- 出站媒体项受 `agents.defaults.mediaMaxMb` 限制（默认 5 MB）。

## 出站发送（文本 + 媒体）

- 使用活跃的网络监听器；如果 gateway 未运行则会出错。
- 文本分块：每条消息最多 4k（可通过 `channels.whatsapp.textChunkLimit` 配置，可选 `channels.whatsapp.chunkMode`）。
- 媒体：
  - 支持图片/视频/音频/文档。
  - 音频作为 PTT 发送；`audio/ogg` => `audio/ogg; codecs=opus`。
  - 仅在第一个媒体项上显示标题。
  - 媒体获取支持 HTTP(S) 和本地路径。
  - 动画 GIF：WhatsApp 期望带有 `gifPlayback: true` 的 MP4 用于内联循环。
    - CLI：`openclaw message send --media <mp4> --gif-playback`
    - Gateway：`send` 参数包括 `gifPlayback: true`

## 语音笔记（PTT 音频）

WhatsApp 将音频作为**语音笔记**（PTT 气泡）发送。

- 最佳效果：OGG/Opus。OpenClaw 将 `audio/ogg` 重写为 `audio/ogg; codecs=opus`。
- 对于 WhatsApp，`[[audio_as_voice]]` 被忽略（音频已经作为语音笔记发送）。

## 媒体限制 + 优化

- 默认出站上限：5 MB（每个媒体项）。
- 覆盖：`agents.defaults.mediaMaxMb`。
- 图片在限制下自动优化为 JPEG（调整大小 + 质量扫描）。
- 超大媒体 => 错误；媒体回复回退到文本警告。
## 心跳

- **Gateway 心跳**记录连接运行状况（`web.heartbeatSeconds`，默认 60s）。
- **代理心跳**可以按代理（`agents.list[].heartbeat`）或全局配置
  通过 `agents.defaults.heartbeat`（当未设置按代理的条目时回退）。
  - 使用配置的心跳提示（默认：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）+ `HEARTBEAT_OK` 跳过行为。
  - 传递默认到最后使用的频道（或配置的目标）。

## 重连行为

- 退避策略：`web.reconnect`：
  - `initialMs`、`maxMs`、`factor`、`jitter`、`maxAttempts`。
- 如果达到 maxAttempts，网络监控停止（降级）。
- 已注销 => 停止并需要重新链接。

## 配置快速映射

- `channels.whatsapp.dmPolicy`（私信策略：pairing/allowlist/open/disabled）。
- `channels.whatsapp.selfChatMode`（同手机设置；机器人使用您的个人 WhatsApp 号码）。
- `channels.whatsapp.allowFrom`（私信允许列表）。WhatsApp 使用 E.164 电话号码（没有用户名）。
- `channels.whatsapp.mediaMaxMb`（入站媒体保存上限）。
- `channels.whatsapp.ackReaction`（消息接收时的自动反应：`{emoji, direct, group}`）。
- `channels.whatsapp.accounts.<accountId>.*`（按账户设置 + 可选 `authDir`）。
- `channels.whatsapp.accounts.<accountId>.mediaMaxMb`（按账户入站媒体上限）。
- `channels.whatsapp.accounts.<accountId>.ackReaction`（按账户确认反应覆盖）。
- `channels.whatsapp.groupAllowFrom`（群组发件人允许列表）。
- `channels.whatsapp.groupPolicy`（群组策略）。
- `channels.whatsapp.historyLimit` / `channels.whatsapp.accounts.<accountId>.historyLimit`（群组历史上下文；`0` 禁用）。
- `channels.whatsapp.dmHistoryLimit`（以用户轮次为单位的私信历史限制）。按用户覆盖：`channels.whatsapp.dms["<phone>"].historyLimit`。
- `channels.whatsapp.groups`（群组允许列表 + 提及门控默认值；使用 `"*"` 允许所有）
- `channels.whatsapp.actions.reactions`（限制 WhatsApp 工具反应）。
- `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）
- `messages.groupChat.historyLimit`
- `channels.whatsapp.messagePrefix`（入站前缀；按账户：`channels.whatsapp.accounts.<accountId>.messagePrefix`；已弃用：`messages.messagePrefix`）
- `messages.responsePrefix`（出站前缀）
- `agents.defaults.mediaMaxMb`
- `agents.defaults.heartbeat.every`
- `agents.defaults.heartbeat.model`（可选覆盖）
- `agents.defaults.heartbeat.target`
- `agents.defaults.heartbeat.to`
- `agents.defaults.heartbeat.session`
- `agents.list[].heartbeat.*`（按代理覆盖）
- `session.*`（scope、idle、store、mainKey）
- `web.enabled`（为 false 时禁用频道启动）
- `web.heartbeatSeconds`
- `web.reconnect.*`
## 日志 + 故障排除

- 子系统：`whatsapp/inbound`、`whatsapp/outbound`、`web-heartbeat`、`web-reconnect`。
- 日志文件：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`（可配置）。
- 故障排除指南：[Gateway 故障排除](/zh/gateway/troubleshooting)。

## 故障排除（快速）

**未关联 / 需要二维码登录**

- 症状：`channels status` 显示 `linked: false` 或警告"Not linked"。
- 修复：在 gateway 主机上运行 `openclaw channels login` 并扫描二维码（WhatsApp → Settings → Linked Devices）。

**已关联但已断开 / 重连循环**

- 症状：`channels status` 显示 `running, disconnected` 或警告"Linked but disconnected"。
- 修复：`openclaw doctor`（或重启 gateway）。如果问题仍然存在，请通过 `channels login` 重新关联并检查 `openclaw logs --follow`。

**Bun 运行时**

- **不推荐**使用 Bun。WhatsApp (Baileys) 和 Telegram 在 Bun 上不可靠。
  使用 **Node** 运行 gateway。（请参阅入门指南运行时说明。）