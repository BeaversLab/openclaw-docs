---
summary: "聊天会话的管理规则、键和持久化"
read_when:
  - Modifying session handling or storage
title: "会话管理"
---

# 会话管理

OpenClaw 将**每个智能代理一个直接聊天会话**视为主要模式。直接聊天会合并到 `agent:<agentId>:<mainKey>`（默认为 `main`），而群组/频道聊天则拥有各自的键。`session.mainKey` 设置受到尊重。

使用 `session.dmScope` 来控制**直接消息 (DM)** 的分组方式：

- `main`（默认）：所有直接消息共享主会话以保持连续性。
- `per-peer`：跨渠道按发送者 ID 隔离。
- `per-channel-peer`：按渠道 + 发送者隔离（推荐用于多用户收件箱）。
- `per-account-channel-peer`: 按账号 + 渠道 + 发送者隔离（推荐用于多账号收件箱）。
  使用 `session.identityLinks` 将提供商前缀的对端 ID 映射到规范身份，以便在使用 `per-peer`、`per-channel-peer` 或 `per-account-channel-peer` 时，同一个人可以在不同渠道间共享私信会话。

## 安全私信模式（推荐用于多用户设置）

> **安全警告：** 如果您的代理可以接收来自**多人**的私信，您应强烈考虑启用安全私信模式。如果没有它，所有用户将共享同一个对话上下文，这可能会导致用户之间的私人信息泄露。

**默认设置下的问题示例：**

- Alice (`<SENDER_A>`) 就一个私人话题（例如，医疗预约）向您的代理发送消息
- Bob (`<SENDER_B>`) 向您的代理发送消息询问“我们刚才在谈论什么？”
- 由于两条私信共享同一个会话，模型可能会使用 Alice 的先前上下文来回答 Bob。

**解决方法：** 设置 `dmScope` 以按用户隔离会话：

```json5
// ~/.openclaw/openclaw.json
{
  session: {
    // Secure DM mode: isolate DM context per channel + sender.
    dmScope: "per-channel-peer",
  },
}
```

**何时启用此功能：**

- 您有多个发送者的配对批准
- 您使用了包含多个条目的私信允许列表
- 您设置了 `dmPolicy: "open"`
- 多个电话号码或账号可以向您的代理发送消息

注意：

- 默认为 `dmScope: "main"` 以保持连续性（所有私信共享主会话）。这对于单用户设置来说是可以的。
- Local CLI 新手引导 writes `session.dmScope: "per-channel-peer"` by default when unset (existing explicit values are preserved).
- 对于同一渠道上的多账号收件箱，首选 `per-account-channel-peer`。
- 如果同一个人通过多个渠道联系您，请使用 `session.identityLinks` 将他们的私信会话合并为一个规范身份。
- 您可以使用 `openclaw security audit` 验证您的私信设置（参见 [security](/en/cli/security)）。

## Gateway(网关) 是事实的唯一来源

All 会话 state is **owned by the gateway** (the “master” OpenClaw). UI clients (macOS app, WebChat, etc.) must query the gateway for 会话 lists and token counts instead of reading local files.

- 在**远程模式**下，您关心的会话存储位于远程网关主机上，而不是您的 Mac 上。
- UI 中显示的令牌计数来自网关的存储字段（`inputTokens`、`outputTokens`、`totalTokens`、`contextTokens`）。客户端不会解析 JSONL 脚本来“修正”总数。

## 状态所在位置

- 在**网关主机**上：
  - 存储文件：`~/.openclaw/agents/<agentId>/sessions/sessions.json`（每个代理）。
- Transcripts: `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl` (Telegram topic sessions use `.../<SessionId>-topic-<threadId>.jsonl`).
- 存储是一个映射 `sessionKey -> { sessionId, updatedAt, ... }`。删除条目是安全的；它们会按需重新创建。
- 群组条目可能包括 `displayName`、`channel`、`subject`、`room` 和 `space`，以便在 UI 中标记会话。
- 会话条目包括 `origin` 元数据（标签 + 路由提示），以便 UI 可以解释会话的来源。
- OpenClaw does **not** read legacy Pi/Tau 会话 folders.

## 维护

OpenClaw applies 会话-store maintenance to keep `sessions.json` and transcript artifacts bounded over time.

### 默认值

- `session.maintenance.mode`：`warn`
- `session.maintenance.pruneAfter`：`30d`
- `session.maintenance.maxEntries`：`500`
- `session.maintenance.rotateBytes`：`10mb`
- `session.maintenance.resetArchiveRetention`：默认为 `pruneAfter`（`30d`）
- `session.maintenance.maxDiskBytes`：未设置（已禁用）
- `session.maintenance.highWaterBytes`：启用预算时，默认为 `80%` 的 `maxDiskBytes`

### 工作原理

维护在会话存储写入期间运行，您也可以使用 `openclaw sessions cleanup` 按需触发它。

- `mode: "warn"`：报告将被驱逐的内容，但不会修改条目/记录。
- `mode: "enforce"`：按以下顺序应用清理：
  1. 清除超过 `pruneAfter` 的陈旧条目
  2. 将条目数量限制在 `maxEntries`（优先清除最早的）
  3. 对不再被引用的已移除条目的记录文件进行归档
  4. 根据保留策略清除旧的 `*.deleted.<timestamp>` 和 `*.reset.<timestamp>` 归档
  5. 当 `sessions.json` 超过 `rotateBytes` 时进行轮换
  6. 如果设置了 `maxDiskBytes`，则对 `highWaterBytes` 强制执行磁盘预算（优先删除最早的工件，然后是最旧的会话）

### 大型存储的性能注意事项

在高吞吐量的设置中，大型会话存储很常见。维护工作是写入路径工作，因此非常大的存储可能会增加写入延迟。

最能增加成本的因素：

- 非常高的 `session.maintenance.maxEntries` 值
- 很长的 `pruneAfter` 窗口，导致陈旧条目保留
- `~/.openclaw/agents/<agentId>/sessions/` 中有许多记录/归档工件
- 在未设置合理的修剪/上限限制的情况下启用磁盘预算 (`maxDiskBytes`)

应对措施：

- 在生产环境中使用 `mode: "enforce"`，以便自动限制增长
- 同时设置时间和计数限制 (`pruneAfter` + `maxEntries`)，而不仅仅是一个
- 为大型部署设置 `maxDiskBytes` + `highWaterBytes` 作为硬性上限
- 将 `highWaterBytes` 保持在显著低于 `maxDiskBytes` 的水平（默认为 80%）
- 在强制执行之前，配置更改后运行 `openclaw sessions cleanup --dry-run --json` 以验证预期影响
- 对于频繁的活跃会话，在运行手动清理时传递 `--active-key`

### 自定义示例

使用保守的强制执行策略：

```json5
{
  session: {
    maintenance: {
      mode: "enforce",
      pruneAfter: "45d",
      maxEntries: 800,
      rotateBytes: "20mb",
      resetArchiveRetention: "14d",
    },
  },
}
```

为会话目录启用硬盘预算：

```json5
{
  session: {
    maintenance: {
      mode: "enforce",
      maxDiskBytes: "1gb",
      highWaterBytes: "800mb",
    },
  },
}
```

针对大型安装进行调整（示例）：

```json5
{
  session: {
    maintenance: {
      mode: "enforce",
      pruneAfter: "14d",
      maxEntries: 2000,
      rotateBytes: "25mb",
      maxDiskBytes: "2gb",
      highWaterBytes: "1.6gb",
    },
  },
}
```

Preview or force maintenance from CLI:

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

## 会话修剪

OpenClaw 会在 OpenClaw 调用之前默认从内存上下文中修剪**旧的工具结果**。
这**不会**重写 JSONL 历史记录。请参见 [/concepts/会话-pruning](/en/concepts/session-pruning)。

## 压缩前内存刷新

当会话接近自动压缩时，OpenClaw 可以运行一次**静默内存刷新**
操作，提醒模型将持久化的笔记写入磁盘。这仅在
工作区可写时运行。请参见 [Memory](/en/concepts/memory) 和
[Compaction](/en/concepts/compaction)。

## 映射传输 → 会话密钥

- 直接聊天遵循 `session.dmScope`（默认 `main`）。
  - `main`：`agent:<agentId>:<mainKey>`（跨设备/渠道的连续性）。
    - 多个电话号码和渠道可以映射到同一个代理主密钥；它们充当进入一个对话的传输方式。
  - `per-peer`: `agent:<agentId>:direct:<peerId>`。
  - `per-channel-peer`: `agent:<agentId>:<channel>:direct:<peerId>`。
  - `per-account-channel-peer`: `agent:<agentId>:<channel>:<accountId>:direct:<peerId>`（accountId 默认为 `default`）。
  - 如果 `session.identityLinks` 匹配提供商前缀的对端 ID（例如 `telegram:123`），则规范密钥将替换 `<peerId>`，以便同一个人跨渠道共享一个会话。
- 群组聊天隔离状态：`agent:<agentId>:<channel>:group:<id>`（房间/渠道使用 `agent:<agentId>:<channel>:channel:<id>`）。
  - Telegram 论坛主题将 `:topic:<threadId>` 附加到群组 ID 以进行隔离。
  - 遗留的 `group:<id>` 密钥仍会被识别以便迁移。
- 入站上下文可能仍使用 `group:<id>`；渠道是从 `Provider` 推断的，并规范化为规范的 `agent:<agentId>:<channel>:group:<id>` 形式。
- 其他来源：
  - Cron 作业：`cron:<job.id>`（隔离）或自定义 `session:<custom-id>`（持久）
  - Webhooks：`hook:<uuid>`（除非由 hook 显式设置）
  - Node 运行：`node-<nodeId>`

## 生命周期

- 重置策略：会话会被重复使用直到过期，过期评估将在下一条入站消息时进行。
- 每日重置：默认为网关主机本地时间 **凌晨 4:00**。一旦会话的最后更新时间早于最近的每日重置时间，该会话即被视为过期。
- 空闲重置（可选）：`idleMinutes` 添加了一个滑动空闲窗口。当同时配置了每日重置和空闲重置时，** whichever expires first ** 会强制开启一个新会话。
- 旧版仅空闲模式：如果您设置了 `session.idleMinutes` 但没有配置任何 `session.reset`/`resetByType`，为了向后兼容，OpenClaw 将保持仅空闲模式。
- 按类型覆盖（可选）：`resetByType` 允许您为 `direct`、`group` 和 `thread` 会话覆盖策略（thread = Slack/Discord 主题，Telegram 话题，以及连接器提供的 Matrix 主题）。
- 按渠道覆盖（可选）：`resetByChannel` 会覆盖渠道的重置策略（适用于该渠道的所有会话类型，并且优先于 `reset`/`resetByType`）。
- 重置触发器：精确匹配 `/new` 或 `/reset`（加上 `resetTriggers` 中的任何额外内容）将启动一个新的会话 ID 并传递消息的剩余部分。`/new <model>` 接受模型别名、`provider/model` 或提供商名称（模糊匹配）来设置新会话的模型。如果单独发送 `/new` 或 `/reset`，OpenClaw 会运行一个简短的“hello”问候轮次来确认重置。
- 手动重置：从存储中删除特定键或移除 JSONL 记录；下一条消息将重新创建它们。
- 隔离的 cron 作业每次运行时总是创建一个新的 `sessionId`（不重用空闲会话）。

## 发送策略（可选）

阻止特定会话类型的投递，而无需列出各个 ID。

```json5
{
  session: {
    sendPolicy: {
      rules: [
        { action: "deny", match: { channel: "discord", chatType: "group" } },
        { action: "deny", match: { keyPrefix: "cron:" } },
        // Match the raw session key (including the `agent:<id>:` prefix).
        { action: "deny", match: { rawKeyPrefix: "agent:main:discord:" } },
      ],
      default: "allow",
    },
  },
}
```

运行时覆盖（仅所有者）：

- `/send on` → 允许此会话
- `/send off` → 拒绝此会话
- `/send inherit` → 清除覆盖并使用配置规则
  将这些作为独立消息发送，以便它们能够注册。

## 配置（可选重命名示例）

```json5
// ~/.openclaw/openclaw.json
{
  session: {
    scope: "per-sender", // keep group keys separate
    dmScope: "main", // DM continuity (set per-channel-peer/per-account-channel-peer for shared inboxes)
    identityLinks: {
      alice: ["telegram:123456789", "discord:987654321012345678"],
    },
    reset: {
      // Defaults: mode=daily, atHour=4 (gateway host local time).
      // If you also set idleMinutes, whichever expires first wins.
      mode: "daily",
      atHour: 4,
      idleMinutes: 120,
    },
    resetByType: {
      thread: { mode: "daily", atHour: 4 },
      direct: { mode: "idle", idleMinutes: 240 },
      group: { mode: "idle", idleMinutes: 120 },
    },
    resetByChannel: {
      discord: { mode: "idle", idleMinutes: 10080 },
    },
    resetTriggers: ["/new", "/reset"],
    store: "~/.openclaw/agents/{agentId}/sessions/sessions.json",
    mainKey: "main",
  },
}
```

## 检查

- `openclaw status` — 显示存储路径和最近的会话。
- `openclaw sessions --json` — 转储每个条目（使用 `--active <minutes>` 过滤）。
- `openclaw gateway call sessions.list --params '{}'` — 从正在运行的网关获取会话（对于远程网关访问，使用 `--url`/`--token`）。
- 在聊天中发送 `/status` 作为独立消息，以查看代理是否可访问、使用了多少会话上下文、当前的思考/快速/详细切换状态，以及您的 WhatsApp web 凭证上次刷新的时间（有助于发现需要重新链接的情况）。
- 发送 `/context list` 或 `/context detail` 以查看系统提示词和注入的工作区文件中的内容（以及最大的上下文贡献者）。
- 发送 `/stop`（或独立的中止短语，如 `stop`、`stop action`、`stop run`、`stop openclaw`）以中止当前运行，清除该会话的排队后续操作，并停止从中产生的任何子代理运行（回复包括已停止的计数）。
- 发送 `/compact`（可选指令）作为独立消息，以总结较旧的上下文并释放窗口空间。请参阅 [/concepts/compaction](/en/concepts/compaction)。
- 可以直接打开 JSONL 副本来查看完整的对话轮次。

## 提示

- 将主键专门用于 1:1 流量；让群组保留它们自己的键。
- 在自动化清理时，请删除单个键而不是整个存储，以保留其他地方的上下文。

## 会话来源元数据

每个会话条目都会在 `origin` 中记录其来源（尽力而为）：

- `label`：人类可读标签（由对话标签 + 群组主题/渠道解析得出）
- `provider`：标准化的渠道 ID（包含扩展）
- `from`/`to`：来自入站信封的原始路由 ID
- `accountId`：提供商账户 ID（多账户情况下）
- `threadId`：当渠道支持时的线程/话题 ID
  这些源字段填充于私信、渠道和群组中。如果
  连接器仅更新投递路由（例如，为了保持私信主会话
  处于最新状态），它仍应提供入站上下文，以便会话保留其
  说明性元数据。扩展可以通过在入站
  上下文中发送 `ConversationLabel`、
  `GroupSubject`、`GroupChannel`、`GroupSpace` 和 `SenderName` 并调用 `recordSessionMetaFromInbound`（或将相同的上下文
  传递给 `updateLastRoute`）来实现此目的。

import zh from "/components/footer/zh.mdx";

<zh />
