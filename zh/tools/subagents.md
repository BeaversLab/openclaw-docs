---
title: "子 Agent"
summary: "Sub-agents：启动隔离的 agent 运行，并将结果回传到请求聊天"
read_when:
  - 你希望通过 agent 做后台/并行工作
  - 你在修改 sessions_spawn 或子 agent 工具策略
---

# 子 agent

子 agent 是从现有 agent 运行中派生的后台运行。它们在独立会话中执行（`agent:<agentId>:subagent:<uuid>`），完成后会将结果 **公告** 回传到请求的聊天频道。

## 斜杠命令

使用 `/subagents` 查看或控制 **当前会话** 的子 agent 运行：

- `/subagents list`
- `/subagents stop <id|#|all>`
- `/subagents log <id|#> [limit] [tools]`
- `/subagents info <id|#>`
- `/subagents send <id|#> <message>`

`/subagents info` 显示运行元数据（状态、时间戳、session id、转录路径、清理状态）。

主要目标：

- 将“研究/长任务/慢工具”并行化，而不阻塞主运行。
- 默认隔离子 agent（会话隔离 + 可选沙箱）。
- 工具面尽量难以误用：子 agent 默认 **不** 拥有会话工具。
- 避免嵌套扩散：子 agent 不能再生成子 agent。

成本说明：每个子 agent 都有 **独立** 上下文与 token 用量。对重任务或重复任务，建议为子 agent 设置更便宜的模型，而主 agent 使用更高质量模型。可通过 `agents.defaults.subagents.model` 或按 agent 覆盖配置。

## 工具

使用 `sessions_spawn`：

- 启动子 agent 运行（`deliver: false`，全局车道：`subagent`）
- 然后执行公告步骤并将公告回复发送回请求聊天频道
- 默认模型：继承调用方，除非设置 `agents.defaults.subagents.model`（或 `agents.list[].subagents.model`）；显式 `sessions_spawn.model` 仍优先生效。
- 默认思考：继承调用方，除非设置 `agents.defaults.subagents.thinking`（或 `agents.list[].subagents.thinking`）；显式 `sessions_spawn.thinking` 仍优先生效。

工具参数：

- `task`（必填）
- `label?`（可选）
- `agentId?`（可选；若允许则在另一个 agent id 下启动）
- `model?`（可选；覆盖子 agent 模型；无效值会被跳过，并在工具结果中给出警告，子 agent 使用默认模型）
- `thinking?`（可选；覆盖子 agent 的思考级别）
- `runTimeoutSeconds?`（默认 `0`；设置后运行超过 N 秒会被中止）
- `cleanup?`（`delete|keep`，默认 `keep`）

Allowlist：

- `agents.list[].subagents.allowAgents`：允许通过 `agentId` 指定的 agent id 列表（`["*"]` 代表允许任意）。默认：仅请求方 agent。

发现：

- 使用 `agents_list` 查看 `sessions_spawn` 当前允许的 agent id。

自动归档：

- 子 agent 会话会在 `agents.defaults.subagents.archiveAfterMinutes`（默认：60）后自动归档。
- 归档使用 `sessions.delete` 并将转录重命名为 `*.deleted.<timestamp>`（同目录）。
- `cleanup: "delete"` 会在公告后立即归档（仍通过重命名保留转录）。
- 自动归档尽力而为；若 gateway 重启，待执行定时器会丢失。
- `runTimeoutSeconds` **不会** 自动归档；它只停止运行。会话仍会等待自动归档。

## 认证

子 agent 的认证按 **agent id** 解析，而不是会话类型：

- 子 agent 会话 key 为 `agent:<agentId>:subagent:<uuid>`。
- 认证存储从该 agent 的 `agentDir` 加载。
- 主 agent 的认证 profile 会作为 **回退** 合并；若冲突，子 agent 的配置覆盖主 agent。

注意：合并为叠加式，因此主 agent 的 profile 始终作为回退可用。目前尚不支持完全隔离的按 agent 认证。

## 公告

子 agent 通过公告步骤回传：

- 公告步骤在子 agent 会话中执行（不是请求者会话）。
- 若子 agent 回复正好为 `ANNOUNCE_SKIP`，则不发送。
- 否则公告回复会通过后续 `agent` 调用（`deliver=true`）发送到请求聊天频道。
- 公告回复在可用时保留线程/主题路由（Slack 线程、Telegram 话题、Matrix 线程）。
- 公告消息会规范化为稳定模板：
  - `Status:` 来自运行结果（`success`、`error`、`timeout` 或 `unknown`）。
  - `Result:` 来自公告步骤的摘要内容（缺失则为 `(not available)`）。
  - `Notes:` 错误细节与其他有用上下文。
- `Status` 不从模型输出推断，而由运行时结果信号提供。

公告 payload 末尾包含统计行（即使包裹发送）：

- 运行时间（如 `runtime 5m12s`）
- Token 用量（输入/输出/总计）
- 当配置模型价格时的估算成本（`models.providers.*.models[].cost`）
- `sessionKey`、`sessionId` 与转录路径（主 agent 可用 `sessions_history` 获取历史或在磁盘上查看）

## 工具策略（子 agent 工具）

默认情况下，子 agent 拥有 **除会话工具外的所有工具**：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

可通过配置覆盖：

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxConcurrent: 1,
      },
    },
  },
  tools: {
    subagents: {
      tools: {
        // deny wins
        deny: ["gateway", "cron"],
        // if allow is set, it becomes allow-only (deny still wins)
        // allow: ["read", "exec", "process"]
      },
    },
  },
}
```

## 并发

子 agent 使用专用的进程内队列车道：

- 车道名：`subagent`
- 并发数：`agents.defaults.subagents.maxConcurrent`（默认 `8`）

## 停止

- 在请求聊天中发送 `/stop` 会中止请求者会话，并停止由其派生的所有活动子 agent 运行。

## 限制

- 子 agent 公告为 **尽力而为**。若 gateway 重启，待发送的“回传公告”会丢失。
- 子 agent 仍共享同一 gateway 进程资源；`maxConcurrent` 应作为安全阀。
- `sessions_spawn` 始终非阻塞：会立即返回 `{ status: "accepted", runId, childSessionKey }`。
- 子 agent 上下文只注入 `AGENTS.md` + `TOOLS.md`（不含 `SOUL.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。
