---
summary: "Agent 会话工具：列出会话、获取历史、跨会话发送消息"
read_when:
  - 添加或修改 session tools
title: "Session 工具"
---

# 会话工具

目标：提供一组小而难误用的工具，让 agent 可以列出会话、获取历史，并向另一个会话发送消息。

## Tool Names

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

## Key Model

- 主私聊桶键始终是字面量 `"main"`（解析为当前 agent 的main key）。
- 群聊使用 `agent:<agentId>:<channel>:group:<id>` 或 `agent:<agentId>:<channel>:channel:<id>`（传完整 key）。
- Cron 作业使用 `cron:<job.id>`。
- Hooks 使用 `hook:<uuid>`，除非显式设置。
- Node 会话使用 `node-<nodeId>`，除非显式设置。

`global` 与 `unknown` 为保留值且永不列出。若 `session.scope = "global"`，我们在所有工具中将其别名为 `main`，保证调用方不会看到 `global`。

## sessions_list

以行数组列出会话。

参数：

- `kinds?: string[]` 过滤：`"main" | "group" | "cron" | "hook" | "node" | "other"`
- `limit?: number` 最大行数（默认：服务器默认，可能上限如 200）
- `activeMinutes?: number` 仅显示 N 分钟内更新的会话
- `messageLimit?: number` 0 = 不带消息（默认 0）；>0 = 包含最近 N 条消息

行为：

- `messageLimit > 0` 会按会话读取 `chat.history` 并包含最近 N 条消息。
- 列表输出中过滤工具结果；工具消息请用 `sessions_history`。
- 在 **sandboxed** agent 会话中，session tools 默认仅可见 **spawned-only**（见下）。

行结构（JSON）：

- `key`：session key（string）
- `kind`：`main | group | cron | hook | node | other`
- `channel`：`whatsapp | telegram | discord | signal | imessage | webchat | internal | unknown`
- `displayName`（若可用，为群显示名）
- `updatedAt`（ms）
- `sessionId`
- `model`、`contextTokens`、`totalTokens`
- `thinkingLevel`、`verboseLevel`、`systemSent`、`abortedLastRun`
- `sendPolicy`（若设置了会话覆盖）
- `lastChannel`、`lastTo`
- `deliveryContext`（可用时的归一化 `{ channel, to, accountId }`）
- `transcriptPath`（由 store dir + sessionId 推导的 best‑effort 路径）
- `messages?`（仅当 `messageLimit > 0`）

## sessions_history

获取某个会话的转录。

参数：

- `sessionKey`（必填；接受 session key 或 `sessions_list` 返回的 `sessionId`）
- `limit?: number` 最大消息数（服务器会限制）
- `includeTools?: boolean`（默认 false）

行为：

- `includeTools=false` 会过滤 `role: "toolResult"` 消息。
- 返回原始转录格式的消息数组。
- 传入 `sessionId` 时，OpenClaw 会解析为对应 session key（缺失则报错）。

## sessions_send

向另一个会话发送消息。

参数：

- `sessionKey`（必填；接受 session key 或 `sessions_list` 返回的 `sessionId`）
- `message`（必填）
- `timeoutSeconds?: number`（默认 >0；0 = fire-and-forget）

行为：

- `timeoutSeconds = 0`：排队并返回 `{ runId, status: "accepted" }`。
- `timeoutSeconds > 0`：最多等待 N 秒完成，然后返回 `{ runId, status: "ok", reply }`。
- 超时：`{ runId, status: "timeout", error }`。运行继续；稍后用 `sessions_history` 查看。
- 运行失败：`{ runId, status: "error", error }`。
- 交付 announce 在主运行完成后 best‑effort；`status: "ok"` 不保证 announce 已送达。
- 通过 gateway `agent.wait` 等待（服务端），因此重连不会丢失等待。
- 主运行会注入 agent-to-agent 消息上下文。
- 主运行完成后，OpenClaw 执行**reply-back loop**：
  - 第 2 轮起在请求方与目标 agent 间交替。
  - 回复 `REPLY_SKIP` 可停止 ping‑pong。
  - 最大轮数为 `session.agentToAgent.maxPingPongTurns`（0–5，默认 5）。
- 循环结束后，OpenClaw 执行**agent‑to‑agent announce 步骤**（仅目标 agent）：
  - 回复 `ANNOUNCE_SKIP` 保持静默。
  - 其他回复将发送到目标渠道。
  - Announce 步骤包含原始请求 + 第 1 轮回复 + 最新的 ping‑pong 回复。

## Channel 字段

- 对群聊，`channel` 是会话条目记录的渠道。
- 对私聊，`channel` 从 `lastChannel` 映射。
- 对 cron/hook/node，`channel` 为 `internal`。
- 若缺失，`channel` 为 `unknown`。

## Security / Send Policy

基于渠道/聊天类型的策略阻止（不是 per session id）。

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

运行时覆盖（按会话条目）：

- `sendPolicy: "allow" | "deny"`（未设置 = 继承配置）
- 可通过 `sessions.patch` 或仅 owner 的 `/send on|off|inherit`（独立消息）设置。

执行点：

- `chat.send` / `agent`（gateway）
- 自动回复投递逻辑

## sessions_spawn

在隔离会话中启动子 agent 运行，并将结果回传到请求方聊天渠道。

参数：

- `task`（必填）
- `label?`（可选；用于日志/UI）
- `agentId?`（可选；若允许，可在其他 agent id 下启动）
- `model?`（可选；覆盖子 agent 模型；无效值报错）
- `runTimeoutSeconds?`（默认 0；设置后，N 秒后中止子 agent 运行）
- `cleanup?`（`delete|keep`，默认 `keep`）

Allowlist：

- `agents.list[].subagents.allowAgents`：允许通过 `agentId` 的 agent id 列表（`["*"]` 表示允许任意）。默认：仅请求方 agent。

Discovery：

- 使用 `agents_list` 发现允许 `sessions_spawn` 的 agent ids。

行为：

- 启动新的 `agent:<agentId>:subagent:<uuid>` 会话，`deliver: false`。
- 子 agents 默认使用完整工具集**但不含 session tools**（可通过 `tools.subagents.tools` 配置）。
- 子 agents 不允许调用 `sessions_spawn`（禁止子 agent 再起子 agent）。
- 始终非阻塞：立即返回 `{ status: "accepted", runId, childSessionKey }`。
- 完成后，OpenClaw 执行子 agent **announce 步骤**并将结果发送回请求方聊天渠道。
- 在 announce 步骤中回复 `ANNOUNCE_SKIP` 可保持静默。
- Announce 回复规范为 `Status`/`Result`/`Notes`；`Status` 来自运行时结果（不是模型文本）。
- 子 agent 会话会在 `agents.defaults.subagents.archiveAfterMinutes` 后自动归档（默认：60）。
- Announce 回复包含统计行（运行时长、tokens、sessionKey/sessionId、转录路径及可选成本）。

## Sandbox 会话可见性

Sandboxed 会话也可使用 session tools，但默认只看到它们通过 `sessions_spawn` 生成的会话。

配置：

```json5
{
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
