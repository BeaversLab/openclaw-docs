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

## sessions_send

向另一个会话发送消息。

参数：

- `sessionKey`（必需；接受来自 `sessions_list` 的会话密钥或 `sessionId`）
- `message`（必需）
- `timeoutSeconds?: number`（默认 >0；0 = 发后即忘）

行为：

- `timeoutSeconds = 0`：加入队列并返回 `{ runId, status: "accepted" }`。
- `timeoutSeconds > 0`：最多等待 N 秒以完成，然后返回 `{ runId, status: "ok", reply }`。
- 如果等待超时：`{ runId, status: "timeout", error }`。运行继续；稍后调用 `sessions_history`。
- 如果运行失败：`{ runId, status: "error", error }`。
- 公告投递在主运行完成后运行，并且是尽力而为的；`status: "ok"` 不保证公告已投递。
- 通过网关 `agent.wait`（服务器端）等待，因此重新连接不会中断等待。
- 为主运行注入代理到代理的消息上下文。
- 会话间消息使用 `message.provenance.kind = "inter_session"` 持久化，以便抄本读取器可以区分路由的代理指令与外部用户输入。
- 主运行完成后，OpenClaw 运行 **回复循环**：
  - 第2轮及以后在请求者和目标代理之间交替进行。
  - 准确回复 `REPLY_SKIP` 以停止乒乓交互。
  - 最大回合数为 `session.agentToAgent.maxPingPongTurns`（0–5，默认为 5）。
- 一旦循环结束，OpenClaw 将运行 **代理到代理公告步骤**（仅限目标代理）：
  - 准确回复 `ANNOUNCE_SKIP` 以保持静默。
  - 任何其他回复都会发送到目标渠道。
  - 通告步骤包括原始请求 + 第1轮回复 + 最近的乒乓回复。

## 渠道字段

- 对于群组，`channel` 是记录在会话条目上的渠道。
- 对于直接聊天，`channel` 从 `lastChannel` 映射。
- 对于 cron/hook/node，`channel` 是 `internal`。
- 如果缺失，`channel` 为 `unknown`。

## 安全性 / 发送策略

基于策略的阻拦，按渠道/聊天类型（而非按会话 ID）。

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
- 可通过 `sessions.patch` 或仅限所有者的 `/send on|off|inherit`（独立消息）进行设置。

执行点：

- `chat.send` / `agent`（网关）
- 自动回复发送逻辑

## sessions_spawn

在隔离的会话中生成子代理运行，并将结果通告回请求者聊天渠道。

参数：

- `task`（必需）
- `label?`（可选；用于日志/UI）
- `agentId?`（可选；如果允许，则在另一个代理 ID 下生成）
- `model?`（可选；覆盖子代理模型；无效值将报错）
- `thinking?`（可选；覆盖子代理运行的思考级别）
- `runTimeoutSeconds?`（设置时默认为 `agents.defaults.subagents.runTimeoutSeconds`，否则为 `0`；设置时，会在 N 秒后中止子代理运行）
- `thread?`（默认为 false；当渠道/插件支持时，为此生成请求线程绑定路由）
- `mode?`（`run|session`；默认为 `run`，但当 `thread=true` 时默认为 `session`；`mode="session"` 需要 `thread=true`）
- `cleanup?`（`delete|keep`，默认 `keep`）
- `sandbox?`（`inherit|require`，默认 `inherit`；`require` 拒绝生成，除非目标子运行时是沙箱隔离的）
- `attachments?`（可选的内联文件数组；仅限子代理运行时，ACP 拒绝）。每个条目：`{ name, content, encoding?: "utf8" | "base64", mimeType? }`。文件被具体化到子工作空间的 `.openclaw/attachments/<uuid>/` 中。返回包含每个文件 sha256 的回执。
- `attachAs?`（可选；`{ mountPath? }` 提示保留用于未来的挂载实现）

允许列表：

- `agents.list[].subagents.allowAgents`：允许通过 `agentId` 的代理 ID 列表（`["*"]` 表示允许任意）。默认：仅请求者代理。
- 沙箱继承保护：如果请求者会话是沙箱隔离的，`sessions_spawn` 将拒绝将以非沙箱方式运行的目标。

设备发现：

- 使用 `agents_list` 来发现允许用于 `sessions_spawn` 的代理 ID。

行为：

- 启动一个新的 `agent:<agentId>:subagent:<uuid>` 会话，具有 `deliver: false`。
- 子代理默认使用完整的工具集**减去会话工具**（可通过 `tools.subagents.tools` 配置）。
- 子代理不允许调用 `sessions_spawn`（禁止子代理 → 子代理生成）。
- 始终非阻塞：立即返回 `{ status: "accepted", runId, childSessionKey }`。
- 使用 `thread=true`，渠道插件可以将交付/路由绑定到线程目标（Discord 支持由 `session.threadBindings.*` 和 `channels.discord.threadBindings.*` 控制）。
- 完成后，OpenClaw 会运行一个子代理的 **announce step** 并将结果发布到请求者的聊天渠道。
  - 如果助手的最终回复为空，则子代理历史记录中的最新 `toolResult` 将作为 `Result` 被包含在内。
- 在 announce step 期间准确回复 `ANNOUNCE_SKIP` 以保持静默。
- Announce 回复被标准化为 `Status`/`Result`/`Notes`；`Status` 来自运行时结果（而非模型文本）。
- 子代理会话在 `agents.defaults.subagents.archiveAfterMinutes` 后自动归档（默认：60）。
- Announce 回复包括一行统计信息（运行时间、tokens、sessionKey/sessionId、转录路径以及可选的成本）。

## 沙箱会话可见性

会话工具可以被设定范围以减少跨会话访问。

默认行为：

- `tools.sessions.visibility` 默认为 `tree`（当前会话 + 生成的子代理会话）。
- 对于沙箱隔离的会话，`agents.defaults.sandbox.sessionToolsVisibility` 可以强制限制可见性。

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

注意：

- `self`：仅当前会话密钥。
- `tree`：当前会话 + 由当前会话生成的会话。
- `agent`：属于当前代理 ID 的任何会话。
- `all`：任何会话（跨代理访问仍需 `tools.agentToAgent`）。
- 当会话处于沙箱隔离状态且 `sessionToolsVisibility="spawned"` 时，OpenClaw 会将可见性强制限制为 `tree`，即使您设置了 `tools.sessions.visibility="all"`。

import zh from '/components/footer/zh.mdx';

<zh />
