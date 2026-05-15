---
summary: "BlueBubblesiMessage将旧的 BlueBubbles 配置迁移到内置的 iMessage 插件，而不会丢失配对、允许列表或群组绑定。"
read_when:
  - Planning a move from BlueBubbles to the bundled iMessage plugin
  - Translating BlueBubbles config keys to iMessage equivalents
  - Verifying imsg before enabling the iMessage plugin
title: "BlueBubbles从 BlueBubbles 迁移"
---

内置的 `imessage` 插件现在通过 JSON-API 驱动 [`steipete/imsg`](https://github.com/steipete/imsg)，达到了与 BlueBubbles 相同的私有 RPC 表面（`react`、`edit`、`unsend`、`reply`、`sendWithEffect`、群组管理、附件）。如果您已经运行安装了 `imsg` 的 Mac，则可以放弃 BlueBubbles 服务器，让插件直接与 Messages.app 通信。

BlueBubbles 支持已被移除。OpenClaw 仅通过 `imsg` 支持 iMessage。本指南用于将旧的 `channels.bluebubbles` 配置迁移到 `channels.imessage`；没有其他支持的迁移路径。

## 何时适合进行此迁移

- 您已经在同一台 Mac（或可通过 SSH 访问的 Mac）上运行 `imsg`，并且 Messages.app 已登录。
- 您希望减少一个变动环节——无需单独的 BlueBubbles 服务器，无需进行身份验证的 REST 端点，无需 webhook 管道。使用单个 CLI 二进制文件代替服务器 + 客户端应用 + 助手程序。
- 你使用的是 [受支持的 macOS / macOS`imsg` 版本](/zh/channels/imessage#requirements-and-permissions-macosAPI)，其中私有 API 探测报告 `available: true`。

## imsg 的作用

`imsg`macOSCLIOpenClaw 是一个用于“信息”的本地 macOS CLI。OpenClaw 将 `imsg rpc`RPC 作为子进程启动，并通过 stdin/stdout 进行 JSON-RPC 通信。没有 HTTP 服务器、webhook URL、后台守护进程、启动代理或需要暴露的端口。

- 读取操作使用只读 SQLite 句柄来自 `~/Library/Messages/chat.db`。
- 实时传入的消息来自 `imsg watch` / `watch.subscribe`，它通过轮询回退机制来跟踪 `chat.db` 文件系统事件。
- 发送操作使用 Messages.app 自动化来处理普通文本和文件发送。
- 高级操作使用 `imsg launch` 将 `imsg` 辅助工具注入到 Messages.app 中。这正是实现已读回执、输入指示器、富媒体发送、编辑、撤回、串联回复、点回和群组管理等功能的关键。
- Linux(网关) 构建可以检查复制的 Linux`chat.db`OpenClawiMessage，但无法发送、监视实时 Mac 数据库或驱动 Messages.app。对于 OpenClaw iMessage，请在已登录的 Mac 上运行 `imsg` 或通过该 Mac 的 SSH 包装器运行。

## 开始之前

1. 在运行 Messages.app 的 Mac 上安装 `imsg`：

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg chats --limit 3
   ```

   如果 `imsg chats` 失败并出现 `unable to open database file`、空输出或 `authorization denied`Gateway(网关)，请授予启动 `imsg` 的终端、编辑器、Node 进程、Gateway(网关) 服务或 SSH 父进程“完全磁盘访问”权限，然后重新打开该父进程。

2. 在更改 RPC 配置之前，请验证读取、监视、发送和 OpenClaw 接口：

   ```bash
   imsg chats --limit 10 --json | jq -s
   imsg history --chat-id 42 --limit 10 --attachments --json | jq -s
   imsg watch --chat-id 42 --reactions --json
   imsg send --chat-id 42 --text "OpenClaw imsg test"
   imsg rpc --help
   ```

   将 `42` 替换为来自 `imsg chats` 的真实聊天 ID。发送需要 Messages.app 的自动化权限。如果 OpenClawOpenClaw 将通过 SSH 运行，请通过 OpenClaw 将使用的同一 SSH 包装器或用户上下文运行这些命令。

3. 当您需要高级操作时，启用私有 API 桥接：

   ```bash
   imsg launch
   imsg status --json
   ```

   `imsg launch` 需要禁用 SIP。基本的发送、历史记录和监视功能无需 `imsg launch` 即可工作；高级操作则不行。

4. 通过 OpenClaw 验证桥接：

   ```bash
   openclaw channels status --probe
   ```

   您需要 `imessage.privateApi.available: true`。如果它报告 `false`，请先修复该问题 — 请参阅 [Capability detection](/zh/channels/imessage#private-api-actions)。

5. 备份您的配置：

   ```bash
   cp ~/.openclaw/openclaw.json5 ~/.openclaw/openclaw.json5.bak
   ```

## 配置转换

iMessage 和 BlueBubbles 共享许多渠道级别的配置。发生更改的密钥主要是传输方式（REST 服务器 vs 本地 CLI）。行为密钥（`dmPolicy`、`groupPolicy`、`allowFrom` 等）保持相同的含义。

| BlueBubbles                                                | 内置 iMessage                             | 说明                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `channels.bluebubbles.enabled`                             | `channels.imessage.enabled`               | 语义相同。                                                                                                                                                                                                                                                                                                        |
| `channels.bluebubbles.serverUrl`                           | _（已移除）_"                             | 无 REST 服务器 — 插件通过 stdio 生成 `imsg rpc`。                                                                                                                                                                                                                                                                 |
| `channels.bluebubbles.password`                            | _（已移除）_                              | 无需 Webhook 身份验证。                                                                                                                                                                                                                                                                                           |
| _（隐含）_                                                 | `channels.imessage.cliPath`               | `imsg` 的路径（默认为 `imsg`）；使用封装脚本进行 SSH 连接。                                                                                                                                                                                                                                                       |
| _（隐含）_                                                 | `channels.imessage.dbPath`                | 可选的 Messages.app `chat.db` 覆盖；省略时自动检测。                                                                                                                                                                                                                                                              |
| _（隐含）_                                                 | `channels.imessage.remoteHost`            | `host` 或 `user@host` — 仅当 `cliPath` 是 SSH 封装脚本且您希望使用 SCP 获取附件时才需要。                                                                                                                                                                                                                         |
| `channels.bluebubbles.dmPolicy`                            | `channels.imessage.dmPolicy`              | 相同的值（`pairing` / `allowlist` / `open` / `disabled`）。                                                                                                                                                                                                                                                       |
| `channels.bluebubbles.allowFrom`                           | `channels.imessage.allowFrom`             | 配对批准根据句柄（handle）转移，而非根据令牌（token）。                                                                                                                                                                                                                                                           |
| `channels.bluebubbles.groupPolicy`                         | `channels.imessage.groupPolicy`           | 相同的值（`allowlist` / `open` / `disabled`）。                                                                                                                                                                                                                                                                   |
| `channels.bluebubbles.groupAllowFrom`                      | `channels.imessage.groupAllowFrom`        | 相同。                                                                                                                                                                                                                                                                                                            |
| `channels.bluebubbles.groups`                              | `channels.imessage.groups`                | **逐字复制此内容，包括任何 `groups: { "*": { ... } }` 通配符条目。** 每个组的 `requireMention`、`tools`、`toolsBySender` 都会保留。使用 `groupPolicy: "allowlist"` 时，如果 `groups` 块为空或缺失，将静默丢弃所有组消息——请参阅下方的“Group registry footgun”。                                                   |
| `channels.bluebubbles.sendReadReceipts`                    | `channels.imessage.sendReadReceipts`      | 默认 `true`。使用捆绑插件时，仅当私有 API 探测器启动时才会触发。                                                                                                                                                                                                                                                  |
| `channels.bluebubbles.includeAttachments`                  | `channels.imessage.includeAttachments`    | 结构相同，**同样默认关闭**。如果您之前在 BlueBubbles 上启用了附件功能，则必须在 iMessage 模块上重新明确设置此功能——它不会隐式继承，在您设置之前，传入的照片/媒体将被静默丢弃，且不会有 BlueBubblesiMessage`Inbound message` 日志行。                                                                              |
| `channels.bluebubbles.attachmentRoots`                     | `channels.imessage.attachmentRoots`       | 本地根路径；相同的通配符规则。                                                                                                                                                                                                                                                                                    |
| _(不适用)_                                                 | `channels.imessage.remoteAttachmentRoots` | 仅在为 SCP 抓取设置了 `remoteHost` 时使用。                                                                                                                                                                                                                                                                       |
| `channels.bluebubbles.mediaMaxMb`                          | `channels.imessage.mediaMaxMb`            | iMessage 上默认为 16 MB（BlueBubbles 默认为 8 MB）。如果您想保持较低的上限，请明确设置。                                                                                                                                                                                                                          |
| `channels.bluebubbles.textChunkLimit`                      | `channels.imessage.textChunkLimit`        | 两者默认均为 4000。                                                                                                                                                                                                                                                                                               |
| `channels.bluebubbles.coalesceSameSenderDms`               | `channels.imessage.coalesceSameSenderDms` | 同样的可选加入。仅限私信——群聊在两个通道上均保持对每条消息的即时分发。如果在未显式设置 `messages.inbound.byChannel.imessage` 的情况下启用，则会将默认入站防抖时间扩大到 2500 毫秒。请参阅 [iMessage 文档 § 合并分批发送的私信](/zh/channels/imessage#coalescing-split-send-dms-command--url-in-one-composition)。 |
| `channels.bluebubbles.enrichGroupParticipantsFromContacts` | _(不适用)_                                | iMessage 已经从 `chat.db` 读取发件人显示名称。                                                                                                                                                                                                                                                                    |
| `channels.bluebubbles.actions.*`                           | `channels.imessage.actions.*`             | 按动作切换：`reactions`、`edit`、`unsend`、`reply`、`sendWithEffect`、`renameGroup`、`setGroupIcon`、`addParticipant`、`removeParticipant`、`leaveGroup`、`sendAttachment`。                                                                                                                                      |

多账户配置 (`channels.bluebubbles.accounts.*`) 与 `channels.imessage.accounts.*` 一一对应。

## 群组注册陷阱

内置的 iMessage 插件连续运行 **两个** 独立的群组允许列表检查关卡。群组消息必须通过这两项检查才能到达代理：

1. **发送者 / 聊天目标允许列表** (`channels.imessage.groupAllowFrom`) — 由 `isAllowedIMessageSender` 检查。根据发送者句柄、`chat_guid`、`chat_identifier` 或 `chat_id` 匹配入站消息。形状与 BlueBubbles 相同。
2. **群组注册表** (`channels.imessage.groups`) — 由 `resolveChannelGroupPolicy` 从 `inbound-processing.ts:199` 检查。使用 `groupPolicy: "allowlist"` 时，此门控需要满足以下任一条件：
   - 一个 `groups: { "*": { ... } }` 通配符条目（设置 `allowAll = true`），或
   - 在 `groups` 下有一个明确的针对每个 `chat_id` 的条目。

如果通过了第 1 道关卡但未通过第 2 道关卡，该消息将被丢弃。插件会发出两个 `warn` 级别的信号，因此在默认日志级别下不再静默：

- 当设置了 `groupPolicy: "allowlist"` 但 `channels.imessage.groups` 为空（没有 `"*"` 通配符，没有针对每个 `chat_id` 的条目）时，每个帐户在启动时会出现一次 `warn` —— 在任何消息到达之前触发。
- 在运行时特定群组第一次被丢弃时，会出现一次针对每个 `chat_id` 的 `warn`，指明 chat_id 以及需要添加到 `groups` 以允许它的确切键。

私信继续有效，因为它们走的是不同的代码路径。

这是最常见的 BlueBubbles → 捆绑式 iMessage 迁移失败模式：操作员复制了 `groupAllowFrom` 和 `groupPolicy`，但跳过了 `groups` 块，因为 BlueBubbles 的 `groups: { "*": { "requireMention": true } }` 看起来像是一个不相关的提及设置。它实际上是注册表网关的承重部件。

在 `groupPolicy: "allowlist"` 之后保持群组消息流动的最低配置：

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

当未配置提及模式时，`*` 下的 `requireMention: true` 是无害的：运行时会设置 `canDetectMention = false` 并在 `inbound-processing.ts:512` 处短路提及丢弃。配置了提及模式（`agents.list[].groupChat.mentionPatterns`）后，它会按预期工作。

如果网关记录了 `imessage: dropping group message from chat_id=<id>` 或启动行 `imessage: groupPolicy="allowlist" but channels.imessage.groups is empty`，说明网关 2 正在丢弃消息——请添加 `groups` 代码块。

## 分步操作

1. 在现有的 iMessage 代码块旁边添加一个 BlueBubbles 代码块。在验证新路径之前，请保留旧代码块仅作为复制来源：

   ```json5
   {
     channels: {
       bluebubbles: {
         enabled: true,
         // ... existing config ...
       },
       imessage: {
         enabled: false, // turn on after the dry run below
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

2. **试运行探测** — 启动网关并确认 iMessage 报告健康：

   ```bash
   openclaw gateway
   openclaw channels status
   openclaw channels status --probe   # expect imessage.privateApi.available: true
   ```

   由于 `imessage.enabled` 仍为 `false`，尚无入站 iMessage 流量被路由 — 但 `--probe` 会测试该桥接，以便您在切换前发现权限/安装问题。

3. **切换。** 删除 BlueBubbles 配置并在一次配置编辑中启用 iMessage：

   ```json5
   {
     channels: {
       imessage: { enabled: true /* ... */ },
     },
   }
   ```

   重启网关。入站 iMessage 流量现在通过内置插件传输。

4. **验证私信。** 向代理发送一条私信；确认收到回复。

5. **单独验证群组。** 私信和群组采用不同的代码路径——私信成功并不证明群组路由正常。向配对的群组聊天中的代理发送一条消息，并确认收到回复。如果群组没有反应（没有代理回复，没有错误），请检查网关日志中的 `imessage: dropping group message from chat_id=<id>` 或启动 `imessage: groupPolicy="allowlist" but channels.imessage.groups is empty` 行——两者都会在默认日志级别触发。如果出现其中任何一个，说明您的 `groups` 块缺失或为空——请参阅上面的“Group registry footgun”。

6. **验证操作表面** — 从一个配对的私信中，要求代理做出反应、编辑、撤回、回复、发送照片，以及（在群组中）重命名群组 / 添加或移除参与者。每个操作都应原生生效于 Messages.app。如果任何操作抛出“iMessage `<action>` 需要 imsg 私有 API 桥接”，请再次运行 `imsg launch` 并刷新 `channels status --probe`。

7. 一旦 BlueBubbles 私信、群组和操作经验证无误，**移除 iMessage 服务器和配置**。OpenClaw 将不会使用 `channels.bluebubbles`。

## 操作一致性概览

| 操作                                | 旧版 BlueBubbles                  | 内置 iMessage                                                                                                             |
| ----------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 发送文本 / 短信备用                 | ✅                                | ✅                                                                                                                        |
| 发送媒体（照片、视频、文件、语音）  | ✅                                | ✅                                                                                                                        |
| 线程回复 (`reply_to_guid`)          | ✅                                | ✅ (解决了 [#51892](https://github.com/openclaw/openclaw/issues/51892))                                                   |
| 点回 (`react`)                      | ✅                                | ✅                                                                                                                        |
| 编辑 / 撤销发送 (macOS 13+ 接收者)  | ✅                                | ✅                                                                                                                        |
| 发送并附带屏幕效果                  | ✅                                | ✅ (部分解决了 [#9394](https://github.com/openclaw/openclaw/issues/9394))                                                 |
| 富文本粗体 / 斜体 / 下划线 / 删除线 | ✅                                | ✅ (通过 attributedBody 进行类型化运行格式化)                                                                             |
| 重命名群组 / 设置群组图标           | ✅                                | ✅                                                                                                                        |
| 添加 / 移除参与者，退出群组         | ✅                                | ✅                                                                                                                        |
| 已读回执和正在输入指示器            | ✅                                | ✅ (取决于私有 API 探测)                                                                                                  |
| 同一发送者的私信合并                | ✅                                | ✅（仅限私信；通过 `channels.imessage.coalesceSameSenderDms` 选择加入）                                                   |
| 网关关闭时接收到的入站消息的追赶    | ✅（webhook 回放 + 历史记录获取） | ✅（通过 `channels.imessage.catchup.enabled` 选择加入；关闭 [#78649](https://github.com/openclaw/openclaw/issues/78649)） |

iMessage 消息追回现在作为内置插件的可选功能提供。在网关启动时，如果 `channels.imessage.catchup.enabled` 为 `true`，网关将针对与 `imsg watch` 使用的相同的 JSON-RPC 客户端运行一次 `chats.list` + 每个聊天的 `messages.history` 扫描，通过实时分发路径（允许列表、群组策略、防抖、回显缓存）重放每个错过的入站行，并持久化每个帐户的游标，以便后续启动从中断处继续。有关调优，请参阅 [网关停机后的消息追回](/zh/channels/imessage#catching-up-after-gateway-downtime)。

## 配对、会话和 ACP 绑定

- **配对批准** 按句柄（handle）延续。您无需重新批准已知的发送者 —— `channels.imessage.allowFrom` 能识别出与 BlueBubbles 使用的相同的 `+15555550123` / `user@example.com` 字符串。
- **会话** 的作用域保持为每个代理 + 聊天。在默认的 `session.dmScope=main` 下，私信会合并到代理主会话中；群组会话则按每个 `chat_id` 保持隔离。会话密钥有所不同（`agent:<id>:imessage:group:<chat_id>` 对比 BlueBubbles 的对应项） —— BlueBubbles 会话密钥下的旧对话历史记录不会延续到 iMessage 会话中。
- **ACP 绑定**中引用 `match.channel: "bluebubbles"` 的内容需要更新为 `"imessage"`。`match.peer.id` 的形状（`chat_id:`、`chat_guid:`、`chat_identifier:`、bare handle）是完全相同的。

## 无回退渠道

没有支持的 BlueBubbles 运行时可以切换回去了。如果 iMessage 验证失败，请设置 `channels.imessage.enabled: false`，重启 Gateway(网关)，修复 `imsg` 阻塞问题，然后重试切换。

回复缓存位于 `~/.openclaw/state/imessage/reply-cache.jsonl`（模式 `0600`，父目录 `0700`）。如果您想重新开始，可以安全地将其删除。

## 相关

- [iMessage](/zh/channels/imessage) — 完整的 iMessage 渠道参考，包括 `imsg launch` 设置和功能检测。
- `/channels/bluebubbles` — 重定向到此迁移指南的旧版 URL。
- [配对](/zh/channels/pairing) — 私信认证和配对流程。
- [渠道路由](/zh/channels/channel-routing) — 网关如何为出站回复选择渠道。
