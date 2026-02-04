---
summary: "聊天的会话管理规则、key 与持久化"
read_when:
  - 修改会话处理或存储
title: "Session 管理"
---

# 会话管理

OpenClaw 将**每个 agent 的一个私聊会话**视为主会话。私聊会折叠为 `agent:<agentId>:<mainKey>`（默认 `main`），群/频道聊天拥有自己的 key。`session.mainKey` 会被遵循。

使用 `session.dmScope` 控制**私聊**如何分组：

- `main`（默认）：所有 DM 共享主会话以保持连续性。
- `per-peer`：按发送者 id 跨渠道隔离。
- `per-channel-peer`：按渠道 + 发送者隔离（推荐多用户收件箱）。
- `per-account-channel-peer`：按账号 + 渠道 + 发送者隔离（推荐多账号收件箱）。
  使用 `session.identityLinks` 将 provider 前缀的 peer id 映射到统一身份，以便在 `per-peer`、`per-channel-peer` 或 `per-account-channel-peer` 下，同一人跨渠道共享 DM 会话。

## Gateway 是事实来源

所有会话状态由 **gateway** 持有（“master” OpenClaw）。UI 客户端（macOS app、WebChat 等）必须向 gateway 查询会话列表与 token 统计，而不是读取本地文件。

- 在 **remote mode** 下，真正的会话存储位于远端 gateway 主机，而不是你的 Mac。
- UI 中显示的 token 数来自 gateway 存储字段（`inputTokens`、`outputTokens`、`totalTokens`、`contextTokens`）。客户端不会解析 JSONL 转录来“修正”总量。

## 状态存放位置

- 在 **gateway 主机**上：
  - Store 文件：`~/.openclaw/agents/<agentId>/sessions/sessions.json`（每个 agent 一份）。
- 转录：`~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`（Telegram 话题会话使用 `.../<SessionId>-topic-<threadId>.jsonl`）。
- Store 是 `sessionKey -> { sessionId, updatedAt, ... }` 的 map。删除条目是安全的；按需会重建。
- 群条目可能包含 `displayName`、`channel`、`subject`、`room`、`space` 以在 UI 中标注会话。
- 会话条目包含 `origin` 元数据（标签 + 路由提示），以便 UI 解释会话来源。
- OpenClaw **不**读取旧版 Pi/Tau 会话目录。

## Session pruning

OpenClaw 默认会在 LLM 调用前，从内存上下文中裁剪**旧的工具结果**。
这**不会**改写 JSONL 历史。参见 [/concepts/session-pruning](/zh/concepts/session-pruning)。

## 预压缩 memory flush

当会话接近自动压缩时，OpenClaw 可运行**静默 memory flush**回合，提醒模型将持久化笔记写入磁盘。仅在工作区可写时执行。参见 [记忆](/zh/concepts/memory) 与
[压缩](/zh/concepts/compaction)。

## 传输 → session keys 映射

- 私聊遵循 `session.dmScope`（默认 `main`）。
  - `main`：`agent:<agentId>:<mainKey>`（跨设备/渠道连续）。
    - 多个电话号码与渠道可映射到同一 agent main key；它们是同一对话的不同入口。
  - `per-peer`：`agent:<agentId>:dm:<peerId>`。
  - `per-channel-peer`：`agent:<agentId>:<channel>:dm:<peerId>`。
  - `per-account-channel-peer`：`agent:<agentId>:<channel>:<accountId>:dm:<peerId>`（accountId 默认 `default`）。
  - 若 `session.identityLinks` 命中 provider 前缀的 peer id（如 `telegram:123`），则使用 canonical key 替换 `<peerId>`，使同一人跨渠道共享会话。
- 群聊隔离状态：`agent:<agentId>:<channel>:group:<id>`（房间/频道使用 `agent:<agentId>:<channel>:channel:<id>`）。
  - Telegram 论坛话题会将 `:topic:<threadId>` 追加到 group id 以隔离。
  - 旧版 `group:<id>` keys 仍可识别用于迁移。
- 入站上下文仍可能使用 `group:<id>`；渠道从 `Provider` 推断并规范化为 `agent:<agentId>:<channel>:group:<id>`。
- 其他来源：
  - Cron 作业：`cron:<job.id>`
  - Webhooks：`hook:<uuid>`（除非 hook 显式设置）
  - Node 运行：`node-<nodeId>`

## 生命周期

- 重置策略：会话会复用直到过期，过期在下一条入站消息时评估。
- 每日重置：默认是**gateway 主机本地时间 4:00 AM**。当会话最后更新时间早于最近一次每日重置时间时即视为过期。
- 空闲重置（可选）：`idleMinutes` 提供滑动空闲窗口。若同时配置了每日与空闲重置，**先过期者生效**。
- 旧版仅空闲：若仅设置 `session.idleMinutes` 而未配置 `session.reset`/`resetByType`，OpenClaw 为兼容会保持 idle-only 模式。
- 按类型覆盖（可选）：`resetByType` 可覆盖 `dm`、`group`、`thread` 会话的策略（thread = Slack/Discord 线程、Telegram 话题、Matrix 线程（若 connector 提供））。
- 按渠道覆盖（可选）：`resetByChannel` 覆盖某渠道的重置策略（作用于该渠道的全部会话类型，并优先于 `reset`/`resetByType`）。
- 重置触发：精确 `/new` 或 `/reset`（以及 `resetTriggers` 中的额外触发词）会启动新的 session id，并继续传递消息剩余内容。`/new <model>` 可接受模型别名、`provider/model` 或 provider 名称（模糊匹配）以设置新会话模型。若 `/new` 或 `/reset` 单独发送，OpenClaw 会执行简短 “hello” 问候回合以确认重置。
- 手动重置：删除 store 中的特定 keys 或移除 JSONL 转录；下一条消息会重建。
- 隔离 cron 作业每次运行都会生成新的 `sessionId`（无空闲复用）。

## Send policy（可选）

按会话类型阻止投递，无需列出单独 id。

```json5
{
  session: {
    sendPolicy: {
      rules: [
        { action: "deny", match: { channel: "discord", chatType: "group" } },
        { action: "deny", match: { keyPrefix: "cron:" } },
      ],
      default: "allow",
    },
  },
}
```

运行时覆盖（仅 owner）：

- `/send on` → 允许本会话
- `/send off` → 拒绝本会话
- `/send inherit` → 清除覆盖并使用配置规则
  以独立消息发送才会生效。

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
      dm: { mode: "idle", idleMinutes: 240 },
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

## Inspecting

- `openclaw status` — 显示 store 路径与最近会话。
- `openclaw sessions --json` — 输出所有条目（用 `--active <minutes>` 过滤）。
- `openclaw gateway call sessions.list --params '{}'` — 从运行中的 gateway 获取会话（远程访问用 `--url`/`--token`）。
- 在聊天中以独立消息发送 `/status` 查看 agent 是否可达、会话上下文使用量、当前 thinking/verbose 开关，以及 WhatsApp web 凭据上次刷新时间（有助于判断是否需要重新链接）。
- 发送 `/context list` 或 `/context detail` 查看 system prompt 与注入的 workspace 文件（及最大贡献者）。
- 发送 `/stop` 作为独立消息以中止当前运行、清空该会话的排队 followups，并停止其派生的子 agent 运行（回复中包含停止的数量）。
- 发送 `/compact`（可选指令）作为独立消息以总结旧上下文并释放窗口空间。参见 [/concepts/compaction](/zh/concepts/compaction)。
- 可直接打开 JSONL 转录查看完整回合。

## Tips

- 将主 key 专用于 1:1 流量；群聊保留各自 key。
- 自动化清理时，删除单独 keys 而非整个 store，以保留其他上下文。

## Session origin 元数据

每个会话条目在 `origin` 中记录来源（best‑effort）：

- `label`：人类标签（来自会话标签 + 群主题/频道）
- `provider`：规范化渠道 id（含扩展）
- `from`/`to`：入站信封中的原始路由 ids
- `accountId`：provider account id（多账号时）
- `threadId`：渠道支持时的 thread/topic id

  这些 origin 字段会为私聊、频道与群填充。若某 connector 仅更新投递路由（例如保持 DM main session 新鲜），仍应提供入站上下文，以便会话保留解释性元数据。扩展可通过在入站上下文中发送 `ConversationLabel`、`GroupSubject`、`GroupChannel`、`GroupSpace` 与 `SenderName` 并调用 `recordSessionMetaFromInbound`（或将同样上下文传给 `updateLastRoute`）来实现。
