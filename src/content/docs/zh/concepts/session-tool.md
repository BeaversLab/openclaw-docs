---
summary: "用于列出会话、读取历史记录和跨会话消息传递的代理工具"
read_when:
  - You want to understand what session tools the agent has
  - You want to configure cross-session access or sub-agent spawning
title: "会话工具"
---

# 会话工具

OpenClaw 为代理提供了跨会话工作的工具——列出对话、读取历史记录、向其他会话发送消息以及生成子代理。

## 可用工具

| 工具               | 功能                                     |
| ------------------ | ---------------------------------------- |
| `sessions_list`    | 使用可选过滤器（种类、最近时间）列出会话 |
| `sessions_history` | 读取特定会话的记录                       |
| `sessions_send`    | 向另一个会话发送消息并可选择等待         |
| `sessions_spawn`   | 为后台任务生成一个隔离的子代理会话       |

## 列出和读取会话

`sessions_list` 返回会话及其密钥、种类、渠道、模型、令牌计数和时间戳。可以按种类（`main`、`group`、`cron`、`hook`、`node`）或最近时间（`activeMinutes`）进行筛选。

`sessions_history` 获取特定会话的对话记录。默认情况下，工具结果被排除在外——传递 `includeTools: true` 以查看它们。

这两个工具都接受 **会话密钥**（如 `"main"`）或来自先前列表调用的 **会话 ID**。

## 发送跨会话消息

`sessions_send` 将消息传递到另一个会话并可选择等待响应：

- **发送后不管：** 设置 `timeoutSeconds: 0` 以立即入队并返回。
- **等待回复：** 设置超时时间并内联获取响应。

目标响应后，OpenClaw 可以运行 **回复循环**，其中代理交替发送消息（最多 5 轮）。目标代理可以回复 `REPLY_SKIP` 以提前停止。

## 生成子代理

`sessions_spawn` 为后台任务创建一个隔离的会话。它始终是非阻塞的——它立即返回 `runId` 和 `childSessionKey`。

关键选项：

- `runtime: "subagent"` (默认) 或 `"acp"` 用于外部 harness 代理。
- `model` 和 `thinking` 用于子会话的覆盖设置。
- `thread: true` 将生成绑定到聊天线程 (Discord, Slack 等)。
- `sandbox: "require"` 对子项强制执行沙箱隔离。

子代理获得完整的工具集，但不包括会话工具（无递归生成）。
完成后，通知步骤会将结果发布到请求者的渠道。

有关 ACP 特定的行为，请参阅 [ACP 代理](/en/tools/acp-agents)。

## 可见性

会话工具具有作用域，用于限制代理可以看到的内容：

| 级别    | 作用域                           |
| ------- | -------------------------------- |
| `self`  | 仅当前会话                       |
| `tree`  | 当前会话 + 生成的子代理          |
| `agent` | 此代理的所有会话                 |
| `all`   | 所有会话（如果已配置，则跨代理） |

默认为 `tree`。沙箱隔离的会话将被限制为 `tree`，而无论
配置如何。

## 延伸阅读

- [会话管理](/en/concepts/session) -- 路由、生命周期、维护
- [ACP 代理](/en/tools/acp-agents) -- 外部 harness 生成
- [多代理](/en/concepts/multi-agent) -- 多代理架构
- [Gateway(网关) 配置](/en/gateway/configuration) -- 会话工具配置项
