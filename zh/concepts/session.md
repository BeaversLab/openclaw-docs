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
- `per-account-channel-peer`：按账户 + 渠道 + 发送者隔离（推荐用于多账户收件箱）。
  使用 `session.identityLinks` 将带有提供商前缀的对等 ID 映射到规范身份，以便在使用 `per-peer`、`per-channel-peer` 或 `per-account-channel-peer` 时，同一个人可以在不同渠道间共享直接消息会话。

## 安全直接消息模式（推荐用于多用户设置）

> **安全警告：** 如果您的智能代理可以接收**多人**的直接消息，您应强烈考虑启用安全直接消息模式。如果不启用，所有用户将共享同一个对话上下文，这可能会导致用户之间的私人信息泄露。

**默认设置下的问题示例：**

- Alice (`<SENDER_A>`) 就一个私人话题（例如，医疗预约）向您的智能代理发送消息
- Bob (`<SENDER_B>`) 向您的智能代理发送消息询问“我们在谈论什么？”
- 由于这两条直接消息共享同一个会话，模型可能会使用 Alice 的先前上下文来回答 Bob。

**修复方法：** 将 `dmScope` 设置为按用户隔离会话：

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

- 您拥有多个发送者的配对批准
- 您使用了包含多个条目的直接消息允许列表
- 您设置了 `dmPolicy: "open"`
- 多个电话号码或账户可以向您的智能代理发送消息

注意：

- 默认为 `dmScope: "main"` 以保持连续性（所有直接消息共享主会话）。这适用于单用户设置。
- 本地 CLI 入门流程在未设置时默认写入 `session.dmScope: "per-channel-peer"`（现有的显式值将被保留）。
- 对于同一渠道上的多账户收件箱，建议使用 `per-account-channel-peer`。
- 如果同一人在多个渠道联系您，请使用 `session.identityLinks` 将其直接消息会话合并为一个规范身份。
- 您可以使用 `openclaw security audit` 验证您的直接消息设置（参见 [security](/zh/en/cli/security)）。

## Gateway 网关 是事实来源

所有会话状态均**由网关拥有**（即“主” OpenClaw）。UI 客户端（macOS 应用、WebChat 等）必须查询网关以获取会话列表和令牌计数，而不是读取本地文件。

- 在**远程模式**下，您关心的会话存储位于远程网关主机上，而不是您的 Mac 上。
- UI 中显示的 Token 计数来自网关的存储字段（`inputTokens`、`outputTokens`、`totalTokens`、`contextTokens`）。客户端不会解析 JSONL 脚本来“修正”总数。

## 状态所在位置

- 在**网关主机**上：
  - 存储文件：`~/.openclaw/agents/<agentId>/sessions/sessions.json`（每个 Agent）。
- 脚本：`~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`（Telegram 主题会话使用 `.../<SessionId>-topic-<threadId>.jsonl`）。
- 存储是一个映射 `sessionKey -> { sessionId, updatedAt, ... }`。删除条目是安全的；它们会根据需要重新创建。
- 群组条目可能包含 `displayName`、`channel`、`subject`、`room` 和 `space`，以便在 UI 中标记会话。
- 会话条目包含 `origin` 元数据（标签 + 路由提示），以便 UI 可以解释会话的来源。
- OpenClaw **不**读取旧的 Pi/Tau 会话文件夹。

## 维护

OpenClaw 应用会话存储维护，以使 `sessions.json` 和脚本产物随时间推移保持有界。

### 默认值

- `session.maintenance.mode`：`warn`
- `session.maintenance.pruneAfter`：`30d`
- `session.maintenance.maxEntries`：`500`
- `session.maintenance.rotateBytes`：`10mb`
- `session.maintenance.resetArchiveRetention`：默认为 `pruneAfter` (`30d`)
- `session.maintenance.maxDiskBytes`：未设置（已禁用）
- `session.maintenance.highWaterBytes`：启用预算时默认为 `80%` 的 `maxDiskBytes`

### 工作原理

维护在会话存储写入期间运行，您可以使用 `openclaw sessions cleanup` 按需触发它。

- `mode: "warn"`：报告将被驱逐的内容但不改变条目/脚本。
- `mode: "enforce"`：按以下顺序应用清理：
  1. 清除早于 `pruneAfter` 的过期条目
  2. 将条目数量上限设为 `maxEntries`（优先清除最早的）
  3. 归档已删除且不再被引用的条目的记录文件
  4. 根据保留策略清除旧的 `*.deleted.<timestamp>` 和 `*.reset.<timestamp>` 归档
  5. 当 `sessions.json` 超过 `rotateBytes` 时轮换它
  6. 如果设置了 `maxDiskBytes`，则对 `highWaterBytes` 强制执行磁盘预算（优先清除最早的产物，然后是最旧的会话）

### 大型存储的性能注意事项

大型会话存储在高吞吐量设置中很常见。维护工作是写入路径工作，因此非常大的存储可能会增加写入延迟。

增加成本最多的因素：

- 非常高的 `session.maintenance.maxEntries` 值
- 会导致过期条目长期存在的 `pruneAfter` 长窗口
- `~/.openclaw/agents/<agentId>/sessions/` 中有大量记录/归档产物
- 在没有合理的清除/数量限制的情况下启用磁盘预算 (`maxDiskBytes`)

解决方案：

- 在生产环境中使用 `mode: "enforce"`，以便自动限制增长
- 同时设置时间和数量限制 (`pruneAfter` + `maxEntries`)，而不仅仅是其中之一
- 在大规模部署中，设置 `maxDiskBytes` + `highWaterBytes` 以作为硬性上限
- 将 `highWaterBytes` 保持在显著低于 `maxDiskBytes` 的水平（默认为 80%）
- 在强制执行配置更改后，运行 `openclaw sessions cleanup --dry-run --json` 以验证预期影响
- 对于频繁活动的会话，在运行手动清除时传递 `--active-key`

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

为会话目录启用硬磁盘预算：

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

针对大型安装进行调优（示例）：

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

从 CLI 预览或强制维护：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

## 会话清理

默认情况下，OpenClaw 会在 LLM 调用之前从内存上下文中修剪**旧的工具结果**。
这**不会**重写 JSONL 历史。请参阅 [/concepts/会话-pruning](/zh/en/concepts/会话-pruning)。

## 压缩前内存刷新

当会话接近自动压缩时，OpenClaw 可以执行一次**静默内存刷新**
轮次，提醒模型将持久化笔记写入磁盘。此操作仅在
工作区可写时运行。请参阅 [Memory](/zh/en/concepts/memory) 和
[Compaction](/zh/en/concepts/compaction)。

## 映射传输 → 会话密钥

- 直接聊天遵循 `session.dmScope`（默认为 `main`）。
  - `main`：`agent:<agentId>:<mainKey>`（跨设备/频道的连续性）。
    - 多个电话号码和频道可以映射到同一个代理主键；它们充当进入一个会话的传输方式。
  - `per-peer`：`agent:<agentId>:dm:<peerId>`。
  - `per-channel-peer`：`agent:<agentId>:<channel>:dm:<peerId>`。
  - `per-account-channel-peer`：`agent:<agentId>:<channel>:<accountId>:dm:<peerId>`（accountId 默认为 `default`）。
  - 如果 `session.identityLinks` 匹配带有提供商前缀的对等 ID（例如 `telegram:123`），则规范键将替换 `<peerId>`，以便同一个人跨频道共享一个会话。
- 群组聊天隔离状态：`agent:<agentId>:<channel>:group:<id>`（房间/频道使用 `agent:<agentId>:<channel>:channel:<id>`）。
  - Telegram 论坛主题将 `:topic:<threadId>` 附加到群组 ID 以进行隔离。
  - 旧的 `group:<id>` 键仍被识别用于迁移。
- 入站上下文可能仍使用 `group:<id>`；频道是从 `Provider` 推断出来的，并规范化为规范的 `agent:<agentId>:<channel>:group:<id>` 形式。
- 其他来源：
  - Cron 作业：`cron:<job.id>`
  - Webhooks：`hook:<uuid>`（除非由 hook 显式设置）
  - Node 运行：`node-<nodeId>`

## 生命周期

- 重置策略：会话会被重复使用直到过期，过期评估会在下一条入站消息时进行。
- 每日重置：默认为网关主机当地时间**凌晨 4:00**。一旦会话的最后更新时间早于最近的每日重置时间，该会话即被视为过期。
- 空闲重置（可选）：`idleMinutes` 添加了一个滑动空闲窗口。当同时配置了每日重置和空闲重置时，** whichever expires first **（哪个先到期）会强制开启新会话。
- 旧的仅限空闲模式：如果您设置了 `session.idleMinutes` 而没有任何 `session.reset`/`resetByType` 配置，OpenClaw 将为了向后兼容而保持仅限空闲模式。
- 按类型覆盖（可选）：`resetByType` 允许您覆盖 `direct`、`group` 和 `thread` 会话的策略（thread = Slack/Discord 主题帖、Telegram 话题、以及连接器提供的 Matrix 主题帖）。
- 按频道覆盖（可选）：`resetByChannel` 会覆盖某个频道的重置策略（应用于该频道的所有会话类型，并优先于 `reset`/`resetByType`）。
- 重置触发器：准确的 `/new` 或 `/reset`（加上 `resetTriggers` 中的任何额外内容）将启动一个新的会话 ID 并传递消息的剩余部分。`/new <model>` 接受模型别名、`provider/model` 或提供商名称（模糊匹配）来设置新的会话模型。如果单独发送 `/new` 或 `/reset`，OpenClaw 会运行一个简短的“你好”问候回合以确认重置。
- 手动重置：从存储中删除特定键或删除 JSONL 脚本；下一条消息将重新创建它们。
- 隔离的 cron 任务每次运行都会生成一个新的 `sessionId`（不进行空闲重用）。

## 发送策略（可选）

阻止特定会话类型的交付，而无需列出单个 ID。

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

运行时覆盖（仅限所有者）：

- `/send on` → 允许此会话
- `/send off` → 拒绝此会话
- `/send inherit` → 清除覆盖并使用配置规则
  请将这些作为独立消息发送，以便它们被注册。

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
- `openclaw sessions --json` — 转储每个条目（使用 `--active <minutes>` 进行过滤）。
- `openclaw gateway call sessions.list --params '{}'` — 从正在运行的网关获取会话（使用 `--url`/`--token` 进行远程网关访问）。
- 在聊天中作为独立消息发送 `/status`，以查看代理是否可访问、使用了多少会话上下文、当前的思考/快速/详细切换状态，以及您的 WhatsApp Web 凭据上次刷新的时间（有助于发现重新链接的需求）。
- 发送 `/context list` 或 `/context detail` 以查看系统提示和注入的工作区文件中的内容（以及最大的上下文贡献者）。
- 发送 `/stop`（或独立的中止短语，如 `stop`、`stop action`、`stop run`、`stop openclaw`）以中止当前运行，清除该会话的排队后续跟进，并停止从中产生的任何子代理运行（回复包含已停止的计数）。
- 发送 `/compact`（可选指令）作为独立消息，以汇总较旧的上下文并释放窗口空间。请参阅 [/concepts/compaction](/zh/en/concepts/compaction)。
- 可以直接打开 JSONL 脚本来查看完整的回合。

## 提示

- 保持主键专用于 1:1 流量；让组保持其自己的键。
- 在自动化清理时，删除单个键而不是整个存储，以保留其他地方的上下文。

## 会话来源元数据

每个会话条目都在 `origin` 中记录其来源（尽力而为）：

- `label`：人类标签（从对话标签 + 组主题/频道解析得出）
- `provider`：规范化频道 ID（包括扩展）
- `from`/`to`：来自入站信封的原始路由 ID
- `accountId`：提供商账户 ID（当为多账户时）
- `threadId`：当频道支持时的主题/话题 ID
  源字段将为直接消息、频道和组填充。如果连接器仅更新传送路由
  （例如，为了保持 私信 主会话处于最新状态），它仍应提供入站上下文，以便会话保留其
  解释器元数据。扩展可以通过在入站上下文中发送 `ConversationLabel`、
  `GroupSubject`、`GroupChannel`、`GroupSpace` 和 `SenderName`
  并调用 `recordSessionMetaFromInbound`（或将相同的上下文传递给 `updateLastRoute`）
  来实现这一点。

import zh from '/components/footer/zh.mdx';

<zh />
