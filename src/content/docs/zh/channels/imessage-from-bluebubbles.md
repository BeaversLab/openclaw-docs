---
summary: "BlueBubblesiMessage将旧的 BlueBubbles 配置迁移到内置的 iMessage 插件，而不会丢失配对、允许列表或群组绑定。"
read_when:
  - Planning a move from BlueBubbles to the bundled iMessage plugin
  - Translating BlueBubbles config keys to iMessage equivalents
  - Verifying imsg before enabling the iMessage plugin
title: "BlueBubbles从 BlueBubbles 迁移"
---

内置的 `imessage` 插件现在通过 JSON-API 驱动 [`steipete/imsg`](https://github.com/steipete/imsg)，达到了与 BlueBubbles 相同的私有 RPC 表面（`react`、`edit`、`unsend`、`reply`、`sendWithEffect`、群组管理、附件）。如果您已经运行了一台安装了 `imsg` 的 Mac，您可以弃用 BlueBubbles 服务器，并让插件直接与 Messages.app 通信。

BlueBubbles 支持已被移除。OpenClaw 仅通过 `imsg` 支持 iMessage。本指南用于将旧的 `channels.bluebubbles` 配置迁移到 `channels.imessage`；没有其他支持的迁移路径。

<Note>有关简短公告和操作员摘要，请参阅 [BlueBubbles 移除和 imsg iMessage 路径](/zh/announcements/bluebubbles-imessage)。</Note>

## 迁移检查清单

当您已经了解旧的 BlueBubbles 配置并想要最短的安全路径时，请使用此检查清单：

1. 直接在运行 Messages.app 的 Mac 上验证 `imsg`（`imsg chats`，`imsg history`，`imsg send` 和 `imsg rpc --help`）。
2. 将行为键从 `channels.bluebubbles` 复制到 `channels.imessage`：`dmPolicy`，`allowFrom`，`groupPolicy`，`groupAllowFrom`，`groups`，`includeAttachments`，`attachmentRoots`，`mediaMaxMb`，`textChunkLimit`，`coalesceSameSenderDms` 和 `actions`。
3. 丢弃不再存在的传输键：`serverUrl`，`password`，webhook URL 和 BlueBubbles 服务器设置。
4. 如果 Gateway(网关) 未在运行 Messages.app 的 Mac 上运行，请将 `channels.imessage.cliPath` 设置为 SSH 包装器，并设置 `remoteHost` 以进行远程附件获取。
5. 停止 Gateway(网关) 后，启用 `channels.imessage`，然后运行 `openclaw channels status --probe --channel imessage`。
6. 测试一条私信，一个允许的群组，如果已启用则测试附件，以及你期望代理使用的每个私有 API 操作。
7. 在验证 iMessage 路径后，删除 BlueBubbles 服务器和旧的 BlueBubbles`channels.bluebubbles`iMessage 配置。

## 何时适合此迁移

- 你已经在登录了 Messages.app 的同一台 Mac（或可通过 SSH 访问的 Mac）上运行 `imsg`。
- 你希望减少一个变动部分 —— 不需要单独的 BlueBubbles 服务器，无需认证的 REST 端点，无需 webhook 管道。使用单个 CLI 二进制文件代替服务器 + 客户端应用 + 辅助工具。
- 您所处的 [支持的 macOS / `imsg` 版本](/zh/channels/imessage#requirements-and-permissions-macos) 中，私有 API 探测报告显示 `available: true`。

## imsg 的功能

`imsg`macOSCLIOpenClaw 是一个用于 Messages 的本地 macOS CLI。OpenClaw 将 `imsg rpc`RPC 作为子进程启动，并通过 stdin/stdout 进行 JSON-RPC 通信。没有 HTTP 服务器、webhook URL、后台守护进程、启动代理或需要暴露的端口。

- 读取操作来自 `~/Library/Messages/chat.db`，使用只读 SQLite 句柄。
- 实时传入的消息来自 `imsg watch` / `watch.subscribe`，它遵循 `chat.db` 文件系统事件，并具有轮询回退机制。
- 发送操作使用 Messages.app 自动化来发送普通文本和文件。
- 高级操作使用 `imsg launch` 将 `imsg` 辅助工具注入到 Messages.app 中。这正是解锁已读回执、输入指示器、富媒体发送、编辑、取消发送、串联回复、点回和群组管理的原因。
- Linux 构建版本可以检查复制的 Linux`chat.db`OpenClawiMessage，但无法发送、监视实时 Mac 数据库或驱动 Messages.app。对于 OpenClaw iMessage，请在登录的 Mac 上运行 `imsg` 或通过 SSH 包装器连接到该 Mac。

## 在开始之前

1. 在运行 Messages.app 的 Mac 上安装 `imsg`：

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg chats --limit 3
   ```

   如果 `imsg chats` 失败并报错 `unable to open database file`、输出为空或 `authorization denied`Gateway(网关)，请授予启动 `imsg` 的终端、编辑器、Node 进程、Gateway(网关) 服务或 SSH 父进程完全磁盘访问权限，然后重新打开该父进程。

2. 在更改 OpenClaw 配置之前，请验证读取、监视、发送和 RPC 接口：

   ```bash
   imsg chats --limit 10 --json | jq -s
   imsg history --chat-id 42 --limit 10 --attachments --json | jq -s
   imsg watch --chat-id 42 --reactions --json
   imsg send --chat-id 42 --text "OpenClaw imsg test"
   imsg rpc --help
   ```

   将 `42` 替换为来自 `imsg chats` 的真实聊天 ID。发送操作需要 Messages.app 的自动化权限。如果 OpenClawOpenClaw 将通过 SSH 运行，请通过 OpenClaw 将使用的同一 SSH 封装程序或用户上下文运行这些命令。如果读取/探测正常但发送因 AppleEvents `-1743` 失败，请检查自动化权限是否位于 `/usr/libexec/sshd-keygen-wrapper` 上；请参阅 [SSH 封装程序发送因 AppleEvents -1743 失败](/zh/channels/imessage#ssh-wrapper-sends-fail-with-appleevents-1743)。

3. 当您需要高级操作时，启用私有 API 桥接：

   ```bash
   imsg launch
   imsg status --json
   ```

   `imsg launch` 需要禁用 SIP。基本的发送、历史记录和监视功能可以在没有 `imsg launch` 的情况下工作；高级操作则不行。

4. 添加启用的 `channels.imessage` 配置后，通过 OpenClaw 验证网桥：

   ```bash
   openclaw channels status --probe
   ```

   你需要 `imessage.privateApi.available: true`。如果它报告 `false`，请先修复该问题 — 请参阅 [Capability detection](/zh/channels/imessage#private-api-actions)。`channels status --probe` 仅探测已配置且已启用的账户。

5. 备份您的配置：

   ```bash
   cp ~/.openclaw/openclaw.json5 ~/.openclaw/openclaw.json5.bak
   ```

## 配置转换

iMessage 和 BlueBubbles 共享许多渠道级别的配置。发生变化的键主要是传输方式（REST 服务器 vs 本地 CLI）。行为键（`dmPolicy`、`groupPolicy`、`allowFrom` 等）保持相同的含义。

| BlueBubbles                                                | 内置 iMessage                             | 备注                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `channels.bluebubbles.enabled`                             | `channels.imessage.enabled`               | 语义相同。                                                                                                                                                                                                                                                                                                      |
| `channels.bluebubbles.serverUrl`                           | _(已移除)_                                | 无 REST 服务器 —— 该插件通过 stdio 生成 `imsg rpc`。                                                                                                                                                                                                                                                            |
| `channels.bluebubbles.password`                            | _(已移除)_                                | 无需 Webhook 身份验证。                                                                                                                                                                                                                                                                                         |
| _(隐式)_                                                   | `channels.imessage.cliPath`               | `imsg` 的路径（默认为 `imsg`）；对于 SSH 请使用包装脚本。                                                                                                                                                                                                                                                       |
| _(隐式)_                                                   | `channels.imessage.dbPath`                | 可选的 Messages.app `chat.db` 覆盖；省略时自动检测。                                                                                                                                                                                                                                                            |
| _(隐式)_                                                   | `channels.imessage.remoteHost`            | `host` 或 `user@host` —— 仅当 `cliPath` 是 SSH 包装器且您想要 SCP 获取附件时才需要。                                                                                                                                                                                                                            |
| `channels.bluebubbles.dmPolicy`                            | `channels.imessage.dmPolicy`              | 相同的值 (`pairing` / `allowlist` / `open` / `disabled`)。                                                                                                                                                                                                                                                      |
| `channels.bluebubbles.allowFrom`                           | `channels.imessage.allowFrom`             | 配对批准通过句柄而不是令牌来传递。                                                                                                                                                                                                                                                                              |
| `channels.bluebubbles.groupPolicy`                         | `channels.imessage.groupPolicy`           | 相同的值 (`allowlist` / `open` / `disabled`)。                                                                                                                                                                                                                                                                  |
| `channels.bluebubbles.groupAllowFrom`                      | `channels.imessage.groupAllowFrom`        | 相同。                                                                                                                                                                                                                                                                                                          |
| `channels.bluebubbles.groups`                              | `channels.imessage.groups`                | **逐字复制此内容，包括任何 `groups: { "*": { ... } }` 通配符条目。** 每个组的 `requireMention`、`tools`、`toolsBySender` 均会保留。使用 `groupPolicy: "allowlist"` 时，如果缺少或为空的 `groups` 块，将会静默丢弃所有群组消息——请参阅下方的“Group registry footgun”。                                           |
| `channels.bluebubbles.sendReadReceipts`                    | `channels.imessage.sendReadReceipts`      | 默认 `true`。使用内置插件时，仅当私有 API 探针启动时才会触发此操作。                                                                                                                                                                                                                                            |
| `channels.bluebubbles.includeAttachments`                  | `channels.imessage.includeAttachments`    | 结构相同，**同样默认关闭**。如果您之前在 BlueBubbles 上启用了附件功能，则必须在 iMessage 区块上显式重新设置此选项——它不会自动继承，并且直到您进行设置之前，传入的照片/媒体将被静默丢弃，且没有 BlueBubblesiMessage`Inbound message` 日志行。                                                                    |
| `channels.bluebubbles.attachmentRoots`                     | `channels.imessage.attachmentRoots`       | 本地根；相同的通配符规则。                                                                                                                                                                                                                                                                                      |
| _(不适用)_                                                 | `channels.imessage.remoteAttachmentRoots` | 仅在设置了 `remoteHost` 以进行 SCP 获取时使用。                                                                                                                                                                                                                                                                 |
| `channels.bluebubbles.mediaMaxMb`                          | `channels.imessage.mediaMaxMb`            | iMessage 上默认为 16 MB（BlueBubbles 默认为 8 MB）。如果要保持较低的上限，请显式设置。                                                                                                                                                                                                                          |
| `channels.bluebubbles.textChunkLimit`                      | `channels.imessage.textChunkLimit`        | 两者默认均为 4000。                                                                                                                                                                                                                                                                                             |
| `channels.bluebubbles.coalesceSameSenderDms`               | `channels.imessage.coalesceSameSenderDms` | 同样的选择加入机制。仅限私信——群聊在两个通道上保持即时单条消息分发。如果在没有明确指定 `messages.inbound.byChannel.imessage` 的情况下启用，会将默认入站防抖时间扩大到 2500 毫秒。请参阅 [iMessage 文档 § 合并拆分发送的私信](/zh/channels/imessage#coalescing-split-send-dms-command--url-in-one-composition)。 |
| `channels.bluebubbles.enrichGroupParticipantsFromContacts` | _(不适用)_                                | iMessage 已经从 `chat.db` 读取发件人显示名称。                                                                                                                                                                                                                                                                  |
| `channels.bluebubbles.actions.*`                           | `channels.imessage.actions.*`             | 按动作切换：`reactions`、`edit`、`unsend`、`reply`、`sendWithEffect`、`renameGroup`、`setGroupIcon`、`addParticipant`、`removeParticipant`、`leaveGroup`、`sendAttachment`。                                                                                                                                    |

多账户配置 (`channels.bluebubbles.accounts.*`) 会一对一转换为 `channels.imessage.accounts.*`。

## 群组注册表陷阱

内置的 iMessage 插件连续运行**两个**独立的群组白名单关卡。群组消息必须通过这两项检查才能到达代理：

1. **发送者 / 聊天目标允许列表** (`channels.imessage.groupAllowFrom`) — 由 `isAllowedIMessageSender` 检查。根据发送者句柄、`chat_guid`、`chat_identifier` 或 `chat_id` 匹配传入消息。结构与 BlueBubbles 相同。
2. **Group registry** (`channels.imessage.groups`) — 由 `resolveChannelGroupPolicy` 从 `inbound-processing.ts:199` 检查。如果启用了 `groupPolicy: "allowlist"`，此门控需要满足以下条件之一：
   - 一个 `groups: { "*": { ... } }` 通配符条目（设置 `allowAll = true`），或者
   - 在 `groups` 下的显式 per-`chat_id` 条目。

如果通过了门控 1 但未通过门控 2，消息将被丢弃。插件会发出两个 `warn` 级别的信号，因此这在默认日志级别下不再静默发生：

- 每个帐户一次的启动 `warn`，当设置了 `groupPolicy: "allowlist"` 但 `channels.imessage.groups` 为空时（没有 `"*"` 通配符，没有 per-`chat_id` 条目）—— 在任何消息到达之前触发。
- 当在运行时首次放入特定 `chat_id` 时，每个 `chat_id` 会出现一次 `warn`，其中命名了 chat_id 以及要添加到 `groups` 以允许它的确切密钥。

私信继续工作，因为它们采用不同的代码路径。

这是最常见的 BlueBubbles → 捆绑版 iMessage 迁移失败模式：操作员复制了 `groupAllowFrom` 和 `groupPolicy`，但跳过了 `groups` 块，因为 BlueBubbles 的 `groups: { "*": { "requireMention": true } }` 看起来像是一个无关的提及设置。实际上它是注册表门控的承重组件。

在 `groupPolicy: "allowlist"` 后保持群组消息流畅的最低配置：

```json5
{
  channels: {
    imessage: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123", "chat_guid:any;-;..."],
      groups: {
        "*": { requireMention: true },
      },
    },
  },
}
```

当没有配置提及模式时，`*` 下的 `requireMention: true` 是无害的：运行时会设置 `canDetectMention = false` 并在 `inbound-processing.ts:512` 处短路提及丢弃逻辑。配置了提及模式（`agents.list[].groupChat.mentionPatterns`）后，它会按预期工作。

如果网关记录了 `imessage: dropping group message from chat_id=<id>` 或启动行 `imessage: groupPolicy="allowlist" but channels.imessage.groups is empty`，说明 gate 2 正在丢弃消息——请添加 `groups` 代码块。

## 逐步指南

1. 在现有的 iMessage 块旁边添加一个 BlueBubbles 块。在 Gateway(网关) 仍在路由 BlueBubbles 流量时，请保持其禁用状态：

   ```json5
   {
     channels: {
       bluebubbles: {
         enabled: true,
         // ... existing config ...
       },
       imessage: {
         enabled: false,
         cliPath: "/opt/homebrew/bin/imsg",
         dmPolicy: "pairing",
         allowFrom: ["+15555550123"], // copy from bluebubbles.allowFrom
         groupPolicy: "allowlist",
         groupAllowFrom: [], // copy from bluebubbles.groupAllowFrom
         groups: { "*": { requireMention: true } }, // copy from bluebubbles.groups — silently drops groups if missing, see "Group registry footgun" above
         actions: {
           reactions: true,
           edit: true,
           unsend: true,
           reply: true,
           sendWithEffect: true,
           sendAttachment: true,
         },
       },
     },
   }
   ```

2. **在流量切换前进行探测** — 停止 Gateway(网关)，临时启用 iMessage 块，并从 iMessage 确认 CLI 报告健康：

   ```bash
   openclaw gateway stop
   # edit config: channels.imessage.enabled = true
   openclaw channels status --probe --channel imessage   # expect imessage.privateApi.available: true
   ```

   `channels status --probe` 仅探测已配置且已启用的账户。除非您有意同时运行两个渠道监视器，否则不要在同时启用 Gateway(网关) 和 BlueBubbles 的情况下重启 iMessage。如果您不立即切换，请在重启 Gateway(网关) 之前将 `channels.imessage.enabled` 设置回 `false`。使用 [Before you start](#before-you-start) 中的直接 `imsg` 命令在启用 OpenClaw 流量之前验证 Mac。

3. **切换。** 一旦启用的 iMessage 账户报告健康，请移除 BlueBubbles 配置并保持 iMessage 启用：

   ```json5
   {
     channels: {
       imessage: { enabled: true /* ... */ },
     },
   }
   ```

   重启网关。传入的 iMessage 流量现在将通过内置插件。

4. **验证私信。** 向 agent 发送一条私信；确认回复已送达。

5. **单独验证群组。** 私信和群组采用不同的代码路径 — 私信成功并不能证明群组正在正常路由。向配对的群组聊天中的代理发送一条消息，并确认收到回复。如果群组没有响应（没有代理回复，没有错误），请检查网关日志中是否有 `imessage: dropping group message from chat_id=<id>` 或启动时的 `imessage: groupPolicy="allowlist" but channels.imessage.groups is empty` 行 — 这两者都会在默认日志级别下触发。如果出现其中任何一种情况，说明您的 `groups` 块缺失或为空 — 请参阅上面的“Group registry footgun”。

6. **验证操作功能** — 从已配对的私信中，让 agent 进行表情回应、编辑、撤回、回复、发送照片，以及（在群组中）重命名群组 / 添加或移除参与者。每个操作都应原生生效于 Messages.app。如果任何操作抛出 "iMessage iMessage`<action>`API requires the imsg private API bridge"，请再次运行 `imsg launch` 并刷新 `channels status --probe`。

7. 一旦 iMessage 私信、群组和操作经验证无误，**移除 BlueBubbles 服务器和配置**。OpenClaw 将不会使用 BlueBubblesiMessageOpenClaw`channels.bluebubbles`。

## 操作功能一览

| 操作                                | 旧版 BlueBubbles                 | 内置 iMessage                                                                                                             |
| ----------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 发送文本 / SMS 回退                 | ✅                               | ✅                                                                                                                        |
| 发送媒体（照片、视频、文件、语音）  | ✅                               | ✅                                                                                                                        |
| 串联回复 (`reply_to_guid`)          | ✅                               | ✅ (closes [#51892](https://github.com/openclaw/openclaw/issues/51892))                                                   |
| 表情回应 (`react`)                  | ✅                               | ✅                                                                                                                        |
| 编辑 / 撤回（macOS 13+ 接收方）     | ✅                               | ✅                                                                                                                        |
| 发送带屏幕特效                      | ✅                               | ✅ (closes part of [#9394](https://github.com/openclaw/openclaw/issues/9394))                                             |
| 富文本粗体 / 斜体 / 下划线 / 删除线 | ✅                               | ✅ (通过 attributedBody 进行 typed-run 格式化)                                                                            |
| 重命名群组 / 设置群组图标           | ✅                               | ✅                                                                                                                        |
| 添加 / 移除参与者，离开群组         | ✅                               | ✅                                                                                                                        |
| 已读回执和输入指示器                | ✅                               | ✅ (取决于私有 API 探测)                                                                                                  |
| 同一发送者的私信合并                | ✅                               | ✅（仅私信；通过 `channels.imessage.coalesceSameSenderDms` 选择加入）                                                     |
| 网关关闭时接收到的入站消息的追赶    | ✅ (webhook 重放 + 历史记录获取) | ✅（通过 `channels.imessage.catchup.enabled` 选择加入；关闭 [#78649](https://github.com/openclaw/openclaw/issues/78649)） |

iMessage 追赶现在作为内置插件的可选功能提供。在网关启动时，如果 `channels.imessage.catchup.enabled` 为 `true`，网关将针对 `imsg watch` 使用的同一 JSON-RPC 客户端运行一次 `chats.list` + 每个聊天的 `messages.history` 扫描，通过实时调度路径（允许列表、群组策略、防抖器、回显缓存）重放每个错过的入站行，并保存一个每个账户的游标，以便随后的启动从上次中断的地方继续。有关调优，请参阅 [网关停机后的追赶](/zh/channels/imessage#catching-up-after-gateway-downtime)。

## 配对、会话和 ACP 绑定

- **配对批准** 根据 handle 继承。您无需重新批准已知的发送者 —— `channels.imessage.allowFrom` 能识别 BlueBubbles 使用的相同 `+15555550123` / `user@example.com` 字符串。
- **会话** 仍按 agent + chat 范围限定。在默认 `session.dmScope=main` 下，私信会归入 agent 主会话；群组会话则按 `chat_id` 保持隔离。会话密钥不同（`agent:<id>:imessage:group:<chat_id>` 与 BlueBubbles 的等效项相比） —— BlueBubbles 会话密钥下的旧对话记录不会带入 iMessage 会话。
- **ACP bindings** 引用 `match.channel: "bluebubbles"` 需要更新为 `"imessage"`。`match.peer.id` 形状（`chat_id:`、`chat_guid:`、`chat_identifier:`、bare handle）完全相同。

## 无回滚 渠道

没有可支持的 BlueBubbles 运行时可供切回。如果 iMessage 验证失败，请设置 `channels.imessage.enabled: false`，重启 Gateway(网关)，修复 `imsg` 阻塞问题，然后重试切换。

回复缓存驻留在 SQLite 插件状态中。`openclaw doctor --fix` 会在存在时导入并归档旧的 `imessage/reply-cache.jsonl` sidecar。

## 相关

- [BlueBubbles 移除与 imsg iMessage 路径](/zh/announcements/bluebubbles-imessage) —— 简短公告与运维者摘要。
- [iMessage](/zh/channels/imessage) —— 完整的 iMessage 渠道参考，包括 `imsg launch` 设置与能力检测。
- `/channels/bluebubbles` — 重定向到此迁移指南的旧 URL。
- [Pairing](/zh/channels/pairing) — 私信认证和配对流程。
- [Channel Routing](/zh/channels/channel-routing) — 网关如何为出站回复选择渠道。
