---
summary: "用于列出会话、获取历史记录和发送跨会话消息的代理会话工具"
read_when:
  - Adding or modifying session tools
title: "会话工具"
---

# 会话工具

目标：提供一个小巧、难以误用的工具集，以便 Agent 能够列出会话、获取历史记录以及向其他会话发送消息。

## 工具名称

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

## 密钥模型

- 主要的直接聊天存储桶始终是字面键 `"main"`（解析为当前代理的主键）。
- 群组聊天使用 `agent:<agentId>:<channel>:group:<id>` 或 `agent:<agentId>:<channel>:channel:<id>`（传递完整键）。
- Cron 作业使用 `cron:<job.id>`。
- 除非明确设置，否则钩子使用 `hook:<uuid>`。
- 除非明确设置，否则节点会话使用 `node-<nodeId>`。

`global` 和 `unknown` 是保留值，从不列出。如果 `session.scope = "global"`，我们会为所有工具将其别名为 `main`，以便调用者永远不会看到 `global`。

## sessions_list

以行数组的形式列出会话。

参数：

- `kinds?: string[]` 筛选器：以下任意 `"main" | "group" | "cron" | "hook" | "node" | "other"`
- `limit?: number` 最大行数（默认：服务器默认值，限制例如 200）
- `activeMinutes?: number` 仅包含在 N 分钟内更新的会话
- `messageLimit?: number` 0 = 无消息（默认 0）；> 0 = 包含最后 N 条消息

行为：

- `messageLimit > 0` 获取每个会话的 `chat.history` 并包含最后 N 条消息。
- 工具结果在列表输出中会被过滤掉；对于工具消息，请使用 `sessions_history`。
- 在 **沙盒化** Agent 会话中运行时，会话工具默认为 **仅生成可见性**（见下文）。

行形状 (JSON)：

- `key`：会话键（字符串）
- `kind`：`main | group | cron | hook | node | other`
- `channel`：`whatsapp | telegram | discord | signal | imessage | webchat | internal | unknown`
- `displayName`（如果有可用的群组显示标签）
- `updatedAt`（毫秒）
- `sessionId`
- `model`、`contextTokens`、`totalTokens`
- `thinkingLevel`, `verboseLevel`, `systemSent`, `abortedLastRun`
- `sendPolicy`（如果设置，则覆盖会话）
- `lastChannel`, `lastTo`
- `deliveryContext`（如果有可用的 `{ channel, to, accountId }`，则为标准化值）
- `transcriptPath`（从存储目录 + sessionId 推导出的尽力而为路径）
- `messages?`（仅当 `messageLimit > 0` 时）

## sessions_history

获取单个会话的记录。

参数：

- `sessionKey`（必需；接受来自 `sessions_list` 的会话密钥或 `sessionId`）
- `limit?: number` 最大消息数（服务器限制）
- `includeTools?: boolean`（默认为 false）

行为：

- `includeTools=false` 过滤 `role: "toolResult"` 消息。
- 以原始记录格式返回消息数组。
- 当给定 `sessionId` 时，OpenClaw 会将其解析为相应的会话密钥（缺少 id 会报错）。

## Gateway 会话历史记录和实时记录文本 API

Control UI 和 Gateway 客户端可以直接使用底层的历史记录和实时记录文本接口。

HTTP：

- `GET /sessions/{sessionKey}/history`
- 查询参数：`limit`、`cursor`、`includeTools=1`、`follow=1`
- 未知会话返回 HTTP `404` 并带有 `error.type = "not_found"`
- `follow=1` 将响应升级为该会话记录文本更新的 SSE 流

WebSocket：

- `sessions.subscribe` 订阅客户端可见的所有会话生命周期和记录文本事件
- `sessions.messages.subscribe { key }` 仅订阅单个会话的 `session.message` 事件
- `sessions.messages.unsubscribe { key }` 移除该目标记录文本订阅
- `session.message` 承载附加的记录文本消息以及实时的使用情况元数据（如果可用）
- `sessions.changed` 为记录文本附加发出 `phase: "message"`，以便会话列表可以刷新计数器和预览

## sessions_send

向另一个会话发送消息。

参数：

- `sessionKey`（必需；接受会话密钥或来自 `sessions_list` 的 `sessionId`）
- `message`（必需）
- `timeoutSeconds?: number`（默认值 >0；0 = 即发即弃）

行为：

- `timeoutSeconds = 0`：排队并返回 `{ runId, status: "accepted" }`。
- `timeoutSeconds > 0`：等待最多 N 秒以完成，然后返回 `{ runId, status: "ok", reply }`。
- 如果等待超时：`{ runId, status: "timeout", error }`。运行继续；稍后调用 `sessions_history`。
- 如果运行失败：`{ runId, status: "error", error }`。
- 公告传送在主要运行完成后运行，并且是尽力而为的；`status: "ok"` 不保证公告已送达。
- 通过 Gateway `agent.wait`（服务端）等待，因此重新连接不会导致等待中断。
- 为主要运行注入 Agent-to-agent 消息上下文。
- 会话间消息使用 `message.provenance.kind = "inter_session"` 持久化，以便抄本读者可以区分路由代理指令与外部用户输入。
- 主运行完成后，OpenClaw 运行一个 **reply-back loop**：
  - 第 2 轮及以上在请求者和目标代理之间交替进行。
  - 准确回复 `REPLY_SKIP` 以停止乒乓交互。
  - 最大回合数为 `session.agentToAgent.maxPingPongTurns`（0–5，默认为 5）。
- 循环结束后，OpenClaw 运行 **agent‑to‑agent announce step**（仅限目标代理）：
  - 准确回复 `ANNOUNCE_SKIP` 以保持静默。
  - 任何其他回复都会发送到目标渠道。
  - 公告步骤包括原始请求 + 第 1 轮回复 + 最新的乒乓回复。

## 渠道字段

- 对于群组，`channel` 是记录在会话条目上的渠道。
- 对于直接聊天，`channel` 从 `lastChannel` 映射。
- 对于 cron/hook/node，`channel` 是 `internal`。
- 如果缺失，`channel` 为 `unknown`。

## 安全 / 发送策略

基于渠道/聊天类型的策略阻断（而非针对每个会话 ID）。

```json
{
  "session": {
    "sendPolicy": {
      "rules": [
        {
          "match": { "channel": "discord", "chatType": "group" },
          "action": "deny"
        }
      ],
      "default": "allow"
    }
  }
}
```

运行时覆盖（每个会话条目）：

- `sendPolicy: "allow" | "deny"`（未设置 = 继承配置）
- 可通过 `sessions.patch` 或仅限所有者的 `/send on|off|inherit`（独立消息）设置。

执行点：

- `chat.send` / `agent`（网关）
- 自动回复发送逻辑

## sessions_spawn

生成一个隔离的委托会话。

- 默认运行时：OpenClaw 子代理 (`runtime: "subagent"`)。
- ACP 挽具会话使用 `runtime: "acp"` 并遵循 ACP 特定的定位/策略规则。
- 除非另有说明，本节重点介绍子代理行为。有关 ACP 特定的行为，请参阅 [ACP Agents](/zh/tools/acp-agents)。

参数：

- `task` (必需)
- `runtime?` (`subagent|acp`; 默认为 `subagent`)
- `label?` (可选; 用于日志/UI)
- `agentId?` (可选)
  - `runtime: "subagent"`: 如果 `subagents.allowAgents` 允许，则以另一个 OpenClaw 代理 ID 为目标
  - `runtime: "acp"`: 如果 `acp.allowedAgents` 允许，则以一个 ACP 挽具 ID 为目标
- `model?` (可选; 覆盖子代理模型; 无效值将报错)
- `thinking?` (可选; 覆盖子代理运行的思考层级)
- `runTimeoutSeconds?` (设置时默认为 `agents.defaults.subagents.runTimeoutSeconds`，否则为 `0`; 设置时，在 N 秒后中止子代理运行)
- `thread?` (默认为 false; 当渠道/插件支持时，请求为此生成使用线程绑定路由)
- `mode?` (`run|session`; 默认为 `run`，但当 `thread=true` 时默认为 `session`; `mode="session"` 需要 `thread=true`)
- `cleanup?` (`delete|keep`, 默认 `keep`)
- `sandbox?` (`inherit|require`, 默认 `inherit`; 除非目标子运行时是沙箱隔离的，否则 `require` 拒绝生成)
- `attachments?`（可选的内联文件数组；仅限子代理运行时，ACP 拒绝）。每个条目：`{ name, content, encoding?: "utf8" | "base64", mimeType? }`。文件被具体化到子工作空间的 `.openclaw/attachments/<uuid>/`。返回包含每个文件 sha256 的收据。
- `attachAs?`（可选；`{ mountPath? }` 提示保留用于未来的挂载实现）

允许列表：

- `runtime: "subagent"`：`agents.list[].subagents.allowAgents` 控制允许哪些 OpenClaw 代理 ID 通过 `agentId`（`["*"]` 表示允许任意）。默认：仅请求者代理。
- `runtime: "acp"`：`acp.allowedAgents` 控制允许哪些 ACP 驱动 ID。这是与 `subagents.allowAgents` 分开的策略。
- 沙箱继承守卫：如果请求者会话是沙箱隔离的，`sessions_spawn` 将拒绝会以非沙箱方式运行的目标。

设备发现：

- 使用 `agents_list` 来发现 `runtime: "subagent"` 的允许目标。
- 对于 `runtime: "acp"`，使用已配置的 ACP 驱动 ID 和 `acp.allowedAgents`；`agents_list` 不会列出 ACP 驱动目标。

行为：

- 使用 `deliver: false` 启动一个新的 `agent:<agentId>:subagent:<uuid>` 会话。
- 子代理默认使用完整的工具集 **减去** 会话工具（可通过 `tools.subagents.tools` 配置）。
- 子代理不允许调用 `sessions_spawn`（禁止子代理 → 子代理衍生）。
- 始终非阻塞：立即返回 `{ status: "accepted", runId, childSessionKey }`。
- 使用 `thread=true` 时，渠道插件可以将传递/路由绑定到线程目标（Discord 支持由 `session.threadBindings.*` 和 `channels.discord.threadBindings.*` 控制）。
- 完成后，OpenClaw 运行子代理 **公告步骤**，并将结果发布到请求者聊天渠道。
  - 如果助手最终回复为空，子代理历史记录中的最新 `toolResult` 将作为 `Result` 包含在内。
- 在 announce 步骤中准确回复 `ANNOUNCE_SKIP` 以保持静默。
- Announce 回复被规范化为 `Status`/`Result`/`Notes`；`Status` 来自运行时结果（而非模型文本）。
- 子代理会话在 `agents.defaults.subagents.archiveAfterMinutes` 后自动归档（默认：60）。
- Announce 回复包含统计行（运行时、令牌、sessionKey/sessionId、转录路径和可选成本）。

## 沙箱会话可见性

会话工具可以限定范围以减少跨会话访问。

默认行为：

- `tools.sessions.visibility` 默认为 `tree`（当前会话 + 生成的子代理会话）。
- 对于沙箱隔离的会话，`agents.defaults.sandbox.sessionToolsVisibility` 可以硬性限制可见性。

配置：

```json5
{
  tools: {
    sessions: {
      // "self" | "tree" | "agent" | "all"
      // default: "tree"
      visibility: "tree",
    },
  },
  agents: {
    defaults: {
      sandbox: {
        // default: "spawned"
        sessionToolsVisibility: "spawned", // or "all"
      },
    },
  },
}
```

说明：

- `self`：仅当前会话密钥。
- `tree`：当前会话 + 当前会话生成的会话。
- `agent`：属于当前代理 ID 的任何会话。
- `all`：任何会话（跨代理访问仍需 `tools.agentToAgent`）。
- 当会话被沙箱隔离且 `sessionToolsVisibility="spawned"` 时，OpenClaw 会将可见性限制为 `tree`，即使您设置了 `tools.sessions.visibility="all"`。
