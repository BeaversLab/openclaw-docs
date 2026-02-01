---
summary: "WhatsApp（web 渠道）集成：登录、收件箱、回复、媒体与运维"
read_when:
  - 开发 WhatsApp/web 渠道行为或收件箱路由
---
# WhatsApp（web 渠道）


状态：仅支持基于 Baileys 的 WhatsApp Web。Gateway 持有会话。

## 快速设置（新手）
1) 尽量使用**独立手机号**（推荐）。
2) 在 `~/.openclaw/openclaw.json` 中配置 WhatsApp。
3) 运行 `openclaw channels login` 扫码（Linked Devices）。
4) 启动 gateway。

最小配置：
```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551234567"]
    }
  }
}
```

## 目标
- 单个 Gateway 进程支持多个 WhatsApp 账号（多账号）。
- 路由确定性：回复只回 WhatsApp，不走模型路由。
- 模型能看到足够上下文以理解引用回复。

## 配置写入
默认允许 WhatsApp 触发 `/config set|unset` 写入配置（需 `commands.config: true`）。

禁用：
```json5
{
  channels: { whatsapp: { configWrites: false } }
}
```

## 架构（谁负责什么）
- **Gateway** 持有 Baileys socket 与 inbox 循环。
- **CLI / macOS app** 与 gateway 通信；不直接使用 Baileys。
- **必须有活跃监听器**才能发出消息，否则发送会快速失败。

## 获取手机号（两种模式）

WhatsApp 需要真实手机号验证。VoIP 与虚拟号通常被拦截。OpenClaw 支持两种方式：

### 专用号码（推荐）
为 OpenClaw 使用**独立手机号**。体验更好、路由清晰、无自聊怪异。推荐配置：**备用/旧安卓 + eSIM**。保持 Wi‑Fi 与电源，扫码关联。

**WhatsApp Business：** 可在同一设备使用不同号码。建议将 OpenClaw 号码注册在 WhatsApp Business，以保持个人 WhatsApp 分离。

**示例配置（专用号码，单用户 allowlist）：**
```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551234567"]
    }
  }
}
```

**配对模式（可选）：**
若想用配对而非 allowlist，将 `channels.whatsapp.dmPolicy` 设为 `pairing`。未知发送者会收到配对码；批准命令：
`openclaw pairing approve whatsapp <code>`

### 个人号码（备选）
快速方案：用**自己的号码**运行 OpenClaw。测试时给自己发消息（WhatsApp “Message yourself”），避免骚扰联系人。设置/实验时需要在主手机读取验证码。**必须启用 self-chat 模式。**
当向导询问你的个人 WhatsApp 号码时，请填写你要发消息的号码（owner/发送者），而不是助手号码。

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

自聊回复默认使用 `[{identity.name}]`（若未设置则为 `[openclaw]`），前提是 `messages.responsePrefix` 未设置。你可以显式设置或用 `""` 关闭前缀。

### 号码来源建议
- **本地运营商 eSIM**（最可靠）
  - 奥地利：[hot.at](https://www.hot.at)
  - 英国：[giffgaff](https://www.giffgaff.com) — 免费 SIM，无合约
- **预付费 SIM** — 便宜，只需接收一条短信验证码

**避免：** TextNow、Google Voice 等“免费短信”服务 — WhatsApp 通常会拦截。

**提示：** 号码只需接收一次验证码。之后 WhatsApp Web 会话通过 `creds.json` 持久化。

## 为什么不用 Twilio？
- 早期 OpenClaw 支持 Twilio 的 WhatsApp Business 集成。
- WhatsApp Business 号码不适合个人助手。
- Meta 强制 24 小时回复窗口；若 24 小时内未回复，业务号无法主动发送新消息。
- 高频/“聊天式”使用会被严格拦截，因为业务号不适合发送大量助手消息。
- 结果：投递不稳定且频繁封禁，因此移除支持。

## 登录 + 凭据
- 登录命令：`openclaw channels login`（Linked Devices 扫码）。
- 多账号登录：`openclaw channels login --account <id>`（`<id>` = `accountId`）。
- 默认账号（省略 `--account`）：若存在 `default` 则用它，否则使用排序后的首个账号。
- 凭据保存在 `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`。
- 备份文件：`creds.json.bak`（损坏时恢复）。
- 兼容旧版：早期安装将 Baileys 文件直接存于 `~/.openclaw/credentials/`。
- 登出：`openclaw channels logout`（或 `--account <id>`）会删除 WhatsApp 认证状态（保留共享 `oauth.json`）。
- 登出后的 socket 会报错并提示重新链接。

## 入站流程（私聊 + 群聊）
- WhatsApp 事件来自 `messages.upsert`（Baileys）。
- 测试/重启时会在关闭时解绑 inbox listener，避免事件处理器累积。
- 忽略状态/广播聊天。
- 私聊使用 E.164；群聊使用 group JID。
- **DM policy**：`channels.whatsapp.dmPolicy` 控制私聊访问（默认：`pairing`）。
  - 配对：未知发送者会收到配对码（`openclaw pairing approve whatsapp <code>` 批准；1 小时过期）。
  - Open：要求 `channels.whatsapp.allowFrom` 包含 `"*"`。
  - 你的绑定 WhatsApp 号码默认信任，因此自聊会跳过 `channels.whatsapp.dmPolicy` 与 `channels.whatsapp.allowFrom` 检查。

### 个人号码模式（备选）
若使用**个人 WhatsApp 号码**运行 OpenClaw，请启用 `channels.whatsapp.selfChatMode`（见上方示例）。

行为：
- 出站私聊不会触发配对回复（避免骚扰联系人）。
- 入站未知发送者仍遵循 `channels.whatsapp.dmPolicy`。
- 自聊模式（allowFrom 包含你的号码）避免自动已读回执，并忽略 mention JIDs。
- 非自聊私聊会发送已读回执。

## 已读回执
默认 gateway 会在接收并接受入站消息后标记已读（蓝勾）。

全局禁用：
```json5
{
  channels: { whatsapp: { sendReadReceipts: false } }
}
```

按账号禁用：
```json5
{
  channels: {
    whatsapp: {
      accounts: {
        personal: { sendReadReceipts: false }
      }
    }
  }
}
```

说明：
- 自聊模式始终跳过已读回执。

## WhatsApp FAQ：发送消息 + 配对

**链接 WhatsApp 后会给随机联系人发消息吗？**  
不会。默认 DM policy 是 **pairing**，未知发送者只会收到配对码，消息**不会处理**。OpenClaw 只会回复收到的聊天，或你明确触发的发送（agent/CLI）。

**WhatsApp 配对如何工作？**  
配对是给未知发送者的 DM 门控：
- 新发送者首次 DM 会收到短码（消息不处理）。
- 通过 `openclaw pairing approve whatsapp <code>` 批准（`openclaw pairing list whatsapp` 查看）。
- 配对码 1 小时过期；每个渠道待处理上限 3 个。

**一个 WhatsApp 号码能被多个 OpenClaw 实例使用吗？**  
可以，通过 `bindings` 将不同发送者路由到不同 agent（peer `kind: "dm"`，sender 为 E.164，例如 `+15551234567`）。回复仍来自**同一个 WhatsApp 账号**，且私聊会折叠到各自 agent 的主会话，因此建议**一人一 agent**。DM 访问控制（`dmPolicy`/`allowFrom`）对该 WhatsApp 账号全局生效。详见 [Multi-Agent Routing](/zh/concepts/multi-agent)。

**为什么向导要我手机号？**  
向导用它设置你的 **allowlist/owner** 以允许你的私聊。它不会用于自动发送。若使用个人号码运行 OpenClaw，请填写同一个号码并启用 `channels.whatsapp.selfChatMode`。

## 消息规范化（模型看到什么）
- `Body` 为当前消息正文（含 envelope）。
- 引用回复上下文**总是附加**：
  ```
  [Replying to +1555 id:ABC123]
  <quoted text or <media:...>>
  [/Replying]
  ```
- 也会设置回复元数据：
  - `ReplyToId` = stanzaId
  - `ReplyToBody` = 引用正文或媒体占位
  - `ReplyToSender` = E.164（若已知）
- 纯媒体入站消息使用占位：
  - `<media:image|video|audio|document|sticker>`

## 群聊
- 群聊映射到 `agent:<agentId>:whatsapp:group:<jid>` 会话。
- 群策略：`channels.whatsapp.groupPolicy = open|disabled|allowlist`（默认 `allowlist`）。
- 激活模式：
  - `mention`（默认）：需要 @mention 或正则匹配。
  - `always`：始终触发。
- `/activation mention|always` 仅 owner 可用，且必须独立消息发送。
- Owner = `channels.whatsapp.allowFrom`（若未设置则为自有 E.164）。
- **历史注入**（仅 pending）：
  - 最近*未处理*消息（默认 50）会插入到：
    `[Chat messages since your last reply - for context]`（已在会话中的消息不会重复注入）
  - 当前消息插入到：
    `[Current message - respond to this]`
  - 追加发送者后缀：`[from: Name (+E164)]`
- 群元数据缓存 5 分钟（主题 + 参与者）。

## 回复投递（线程）
- WhatsApp Web 目前只发送普通消息（当前 gateway 不支持引用回复线程）。
- 回复标签在该渠道被忽略。

## 确认反应（收到即回 emoji）

WhatsApp 可在收到消息后立即发送 emoji 反应，先于 bot 回复，让用户知道已收到。

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
- `emoji`（string）：确认用的 emoji（如 "👀"、"✅"、"📨"）。为空或省略则禁用。
- `direct`（boolean，默认：`true`）：在私聊发送反应。
- `group`（string，默认：`"mentions"`）：群聊行为：
  - `"always"`：群内所有消息都反应（即使未 @mention）
  - `"mentions"`：仅在 @mention 时反应
  - `"never"`：群内不反应

**按账号覆盖：**
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
- 反应会在消息收到后**立即**发送，早于 typing 或 bot 回复。
- 当群 `requireMention: false`（activation: always）时，`group: "mentions"` 会对所有消息反应（不仅 @mention）。
- Fire-and-forget：反应失败会记录日志，但不影响回复。
- 群聊反应会自动包含 participant JID。
- WhatsApp 忽略 `messages.ackReaction`；请使用 `channels.whatsapp.ackReaction`。

## Agent 工具（reactions）
- 工具：`whatsapp` 的 `react` 动作（`chatJid`、`messageId`、`emoji`，可选 `remove`）。
- 可选：`participant`（群发送者）、`fromMe`（对自己消息反应）、`accountId`（多账号）。
- Reaction 移除语义见 [/tools/reactions](/zh/tools/reactions)。
- 工具门控：`channels.whatsapp.actions.reactions`（默认启用）。

## 限制
- 出站文本按 `channels.whatsapp.textChunkLimit` 分块（默认 4000）。
- 可选按段落分块：设置 `channels.whatsapp.chunkMode="newline"`，先按空行分段再分块。
- 入站媒体保存上限 `channels.whatsapp.mediaMaxMb`（默认 50 MB）。
- 出站媒体项上限 `agents.defaults.mediaMaxMb`（默认 5 MB）。

## 出站发送（文本 + 媒体）
- 使用活跃 web listener；若 gateway 未运行会报错。
- 文本分块：每条消息 4k（可配置 `channels.whatsapp.textChunkLimit`，可选 `channels.whatsapp.chunkMode`）。
- 媒体：
  - 支持 image/video/audio/document。
  - 音频以 PTT 发送；`audio/ogg` => `audio/ogg; codecs=opus`。
  - 只有首个媒体项带 caption。
  - 媒体获取支持 HTTP(S) 与本地路径。
  - 动图 GIF：WhatsApp 期望 MP4 且 `gifPlayback: true` 才会循环播放。
    - CLI：`openclaw message send --media <mp4> --gif-playback`
    - Gateway：`send` 参数包含 `gifPlayback: true`

## 语音消息（PTT 音频）
WhatsApp 以**语音消息**（PTT 气泡）发送音频。
- 最佳：OGG/Opus。OpenClaw 会将 `audio/ogg` 重写为 `audio/ogg; codecs=opus`。
- `[[audio_as_voice]]` 在 WhatsApp 中会被忽略（音频本就以语音消息发送）。

## 媒体限制 + 优化
- 默认出站上限：5 MB（每个媒体项）。
- 可通过 `agents.defaults.mediaMaxMb` 覆盖。
- 图片会自动优化为 JPEG 以满足上限（缩放 + 质量扫描）。
- 超出上限会报错；媒体回复会降级为文本警告。

## Heartbeats
- **Gateway heartbeat** 记录连接健康（`web.heartbeatSeconds`，默认 60s）。
- **Agent heartbeat** 可按 agent 配置（`agents.list[].heartbeat`）或全局配置
  `agents.defaults.heartbeat`（无 per-agent 配置时回退）。
  - 使用配置的 heartbeat prompt（默认：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）+ `HEARTBEAT_OK` 跳过行为。
  - 默认投递到最近使用的渠道（或配置的 target）。

## 重连行为
- 回退策略：`web.reconnect`：
  - `initialMs`、`maxMs`、`factor`、`jitter`、`maxAttempts`。
- 达到 maxAttempts 后，web 监控停止（降级）。
- 登出后停止并要求重新链接。

## 配置速查
- `channels.whatsapp.dmPolicy`（DM policy：pairing/allowlist/open/disabled）。
- `channels.whatsapp.selfChatMode`（同号模式；bot 使用你的个人 WhatsApp）。
- `channels.whatsapp.allowFrom`（DM allowlist）。WhatsApp 使用 E.164（无用户名）。
- `channels.whatsapp.mediaMaxMb`（入站媒体保存上限）。
- `channels.whatsapp.ackReaction`（收消息自动反应：`{emoji, direct, group}`）。
- `channels.whatsapp.accounts.<accountId>.*`（按账号配置 + 可选 `authDir`）。
- `channels.whatsapp.accounts.<accountId>.mediaMaxMb`（按账号入站媒体上限）。
- `channels.whatsapp.accounts.<accountId>.ackReaction`（按账号确认反应覆盖）。
- `channels.whatsapp.groupAllowFrom`（群发送者 allowlist）。
- `channels.whatsapp.groupPolicy`（群策略）。
- `channels.whatsapp.historyLimit` / `channels.whatsapp.accounts.<accountId>.historyLimit`（群历史上下文；`0` 禁用）。
- `channels.whatsapp.dmHistoryLimit`（DM 历史上限，用户 turn）。每用户覆盖：`channels.whatsapp.dms["<phone>"].historyLimit`。
- `channels.whatsapp.groups`（群 allowlist + 提及门控默认；用 `"*"` 允许所有）
- `channels.whatsapp.actions.reactions`（门控 WhatsApp 工具 reactions）。
- `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）
- `messages.groupChat.historyLimit`
- `channels.whatsapp.messagePrefix`（入站前缀；按账号：`channels.whatsapp.accounts.<accountId>.messagePrefix`；已弃用：`messages.messagePrefix`）
- `messages.responsePrefix`（出站前缀）
- `agents.defaults.mediaMaxMb`
- `agents.defaults.heartbeat.every`
- `agents.defaults.heartbeat.model`（可选覆盖）
- `agents.defaults.heartbeat.target`
- `agents.defaults.heartbeat.to`
- `agents.defaults.heartbeat.session`
- `agents.list[].heartbeat.*`（按 agent 覆盖）
- `session.*`（scope、idle、store、mainKey）
- `web.enabled`（为 false 时禁用渠道启动）
- `web.heartbeatSeconds`
- `web.reconnect.*`

## 日志 + 故障排查
- 子系统：`whatsapp/inbound`、`whatsapp/outbound`、`web-heartbeat`、`web-reconnect`。
- 日志文件：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`（可配置）。
- 故障排查指南：[Gateway troubleshooting](/zh/gateway/troubleshooting)。

## 故障排查（快速）

**未链接 / 需要扫码**
- 症状：`channels status` 显示 `linked: false` 或提示 “Not linked”。
- 处理：在 gateway 主机运行 `openclaw channels login` 并扫码（WhatsApp → Settings → Linked Devices）。

**已链接但断连 / 重连循环**
- 症状：`channels status` 显示 `running, disconnected` 或提示 “Linked but disconnected”。
- 处理：运行 `openclaw doctor`（或重启 gateway）。若仍存在，重新登录并查看 `openclaw logs --follow`。

**Bun 运行时**
- 不推荐使用 Bun。WhatsApp（Baileys）与 Telegram 在 Bun 上不稳定。
  请使用 **Node** 运行 gateway。（见 Getting Started 的 runtime 说明）
