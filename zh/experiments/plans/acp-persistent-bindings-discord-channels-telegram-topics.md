# Discord 频道和 Telegram 话题的 ACP 持久绑定

状态：草稿

## 摘要

引入持久的 ACP 绑定，用于映射：

- Discord 频道（以及现有的帖子，如需要），以及
- 群组/超级群组中的 Telegram 论坛话题 (`chatId:topic:topicId`)

映射到长期存在的 ACP 会话，绑定状态存储在使用显式绑定类型的顶级 `bindings[]` 条目中。

这使得在高流量消息频道中使用 ACP 变得可预测且持久，因此用户可以创建专用频道/话题，例如 `codex`、`claude-1` 或 `claude-myrepo`。

## 原因

当前的帖子绑定 ACP 行为是针对短暂的 Discord 帖子工作流程进行优化的。Telegram 没有相同的帖子模型；它在群组/超级群组中有论坛话题。用户希望在聊天界面中获得稳定、始终在线的 ACP“工作区”，而不仅仅是临时的帖子会话。

## 目标

- 支持以下对象的持久 ACP 绑定：
  - Discord 频道/帖子
  - Telegram 论坛话题（群组/超级群组）
- 使绑定事实来源由配置驱动。
- 保持 `/acp`、`/new`、`/reset`、`/focus` 以及投递行为在 Discord 和 Telegram 之间保持一致。
- 保留现有的临时绑定流程以供临时使用。

## 非目标

- 完全重新设计 ACP 运行时/会话内部结构。
- 移除现有的临时绑定流程。
- 在第一次迭代中扩展到每个频道。
- 在此阶段实施 Telegram 频道直接消息话题 (`direct_messages_topic_id`)。
- 在此阶段实施 Telegram 私聊话题变体。

## 用户体验方向

### 1) 两种绑定类型

- **持久绑定**：保存在配置中，在启动时进行协调，旨在用于“命名工作区”频道/话题。
- **临时绑定**：仅限运行时，根据空闲/最长期限策略过期。

### 2) 命令行为

- `/acp spawn ... --thread here|auto|off` 仍然可用。
- 添加显式的绑定生命周期控制：
  - `/acp bind [session|agent] [--persist]`
  - `/acp unbind [--persist]`
  - `/acp status` 包括绑定是 `persistent` 还是 `temporary`。
- 在绑定的对话中，`/new` 和 `/reset` 会原地重置绑定的 ACP 会话，并保持绑定连接。

### 3) 对话身份

- 使用规范的对话 ID：
  - Discord：频道/线程 ID。
  - Telegram 话题：`chatId:topic:topicId`。
- 切勿仅使用原始话题 ID 作为 Telegram 绑定的键。

## 配置模型（提议）

在顶层的 `bindings[]` 中统一路由和持久化 ACP 绑定配置，并使用显式的 `type` 区分符：

```jsonc
{
  "agents": {
    "list": [
      {
        "id": "main",
        "default": true,
        "workspace": "~/.openclaw/workspace-main",
        "runtime": { "type": "embedded" },
      },
      {
        "id": "codex",
        "workspace": "~/.openclaw/workspace-codex",
        "runtime": {
          "type": "acp",
          "acp": {
            "agent": "codex",
            "backend": "acpx",
            "mode": "persistent",
            "cwd": "/workspace/repo-a",
          },
        },
      },
      {
        "id": "claude",
        "workspace": "~/.openclaw/workspace-claude",
        "runtime": {
          "type": "acp",
          "acp": {
            "agent": "claude",
            "backend": "acpx",
            "mode": "persistent",
            "cwd": "/workspace/repo-b",
          },
        },
      },
    ],
  },
  "acp": {
    "enabled": true,
    "backend": "acpx",
    "allowedAgents": ["codex", "claude"],
  },
  "bindings": [
    // Route bindings (existing behavior)
    {
      "type": "route",
      "agentId": "main",
      "match": { "channel": "discord", "accountId": "default" },
    },
    {
      "type": "route",
      "agentId": "main",
      "match": { "channel": "telegram", "accountId": "default" },
    },
    // Persistent ACP conversation bindings
    {
      "type": "acp",
      "agentId": "codex",
      "match": {
        "channel": "discord",
        "accountId": "default",
        "peer": { "kind": "channel", "id": "222222222222222222" },
      },
      "acp": {
        "label": "codex-main",
        "mode": "persistent",
        "cwd": "/workspace/repo-a",
        "backend": "acpx",
      },
    },
    {
      "type": "acp",
      "agentId": "claude",
      "match": {
        "channel": "discord",
        "accountId": "default",
        "peer": { "kind": "channel", "id": "333333333333333333" },
      },
      "acp": {
        "label": "claude-repo-b",
        "mode": "persistent",
        "cwd": "/workspace/repo-b",
      },
    },
    {
      "type": "acp",
      "agentId": "codex",
      "match": {
        "channel": "telegram",
        "accountId": "default",
        "peer": { "kind": "group", "id": "-1001234567890:topic:42" },
      },
      "acp": {
        "label": "tg-codex-42",
        "mode": "persistent",
      },
    },
  ],
  "channels": {
    "discord": {
      "guilds": {
        "111111111111111111": {
          "channels": {
            "222222222222222222": {
              "enabled": true,
              "requireMention": false,
            },
            "333333333333333333": {
              "enabled": true,
              "requireMention": false,
            },
          },
        },
      },
    },
    "telegram": {
      "groups": {
        "-1001234567890": {
          "topics": {
            "42": {
              "requireMention": false,
            },
          },
        },
      },
    },
  },
}
```

### 最小示例（无按绑定覆盖的 ACP 设置）

```jsonc
{
  "agents": {
    "list": [
      { "id": "main", "default": true, "runtime": { "type": "embedded" } },
      {
        "id": "codex",
        "runtime": {
          "type": "acp",
          "acp": { "agent": "codex", "backend": "acpx", "mode": "persistent" },
        },
      },
      {
        "id": "claude",
        "runtime": {
          "type": "acp",
          "acp": { "agent": "claude", "backend": "acpx", "mode": "persistent" },
        },
      },
    ],
  },
  "acp": { "enabled": true, "backend": "acpx" },
  "bindings": [
    {
      "type": "route",
      "agentId": "main",
      "match": { "channel": "discord", "accountId": "default" },
    },
    {
      "type": "route",
      "agentId": "main",
      "match": { "channel": "telegram", "accountId": "default" },
    },

    {
      "type": "acp",
      "agentId": "codex",
      "match": {
        "channel": "discord",
        "accountId": "default",
        "peer": { "kind": "channel", "id": "222222222222222222" },
      },
    },
    {
      "type": "acp",
      "agentId": "claude",
      "match": {
        "channel": "discord",
        "accountId": "default",
        "peer": { "kind": "channel", "id": "333333333333333333" },
      },
    },
    {
      "type": "acp",
      "agentId": "codex",
      "match": {
        "channel": "telegram",
        "accountId": "default",
        "peer": { "kind": "group", "id": "-1009876543210:topic:5" },
      },
    },
  ],
}
```

说明：

- `bindings[].type` 是显式的：
  - `route`：普通代理路由。
  - `acp`：针对匹配对话的持久化 ACP 挂载绑定。
- 对于 `type: "acp"`，`match.peer.id` 是规范的对话键：
  - Discord 频道/线程：原始频道/线程 ID。
  - Telegram 话题：`chatId:topic:topicId`。
- `bindings[].acp.backend` 是可选的。后端回退顺序：
  1. `bindings[].acp.backend`
  2. `agents.list[].runtime.acp.backend`
  3. 全局 `acp.backend`
- `mode`、`cwd` 和 `label` 遵循相同的覆盖模式（`binding override -> agent runtime default -> global/default behavior`）。
- 保留现有的 `session.threadBindings.*` 和 `channels.discord.threadBindings.*` 用于临时绑定策略。
- 持久化条目声明所需状态；运行时协调至实际的 ACP 会话/绑定。
- 每个对话节点一个活动的 ACP 绑定是预期模型。
- 向后兼容：对于旧版条目，缺少的 `type` 被解释为 `route`。

### 后端选择

- ACP 会话初始化在生成期间已使用配置的后端选择（目前为 `acp.backend`）。
- 本提案扩展了生成/协调逻辑，以优先使用类型化的 ACP 绑定覆盖：
  - `bindings[].acp.backend` 用于对话本地覆盖。
  - `agents.list[].runtime.acp.backend` 用于按代理的默认设置。
- 如果不存在覆盖，则保持当前行为（`acp.backend` 默认值）。

## 当前系统中的架构适配

### 复用现有组件

- `SessionBindingService` 已经支持与频道无关的对话引用。
- ACP 生成/绑定流程已支持通过服务 API 进行绑定。
- Telegram 已经通过 `MessageThreadId` 和 `chatId` 传递话题/线程上下文。

### 新增/扩展组件

- **Telegram 绑定适配器**（与 Discord 适配器并行）：
  - 为每个 Telegram 账户注册适配器，
  - 通过规范对话 ID 进行解析/列出/绑定/解绑定/触摸（touch）。
- **类型化绑定解析器/索引**：
  - 将 `bindings[]` 拆分为 `route` 和 `acp` 视图，
  - 仅在 `route` 绑定上保留 `resolveAgentRoute`，
  - 仅从 `acp` 绑定中解析持久化 ACP 意图。
- **Telegram 的入站绑定解析**：
  - 在路由完成之前解析绑定的会话（Discord 已经这样做了）。
- **持久化绑定协调器**：
  - 启动时：加载配置的顶级 `type: "acp"` 绑定，确保 ACP 会话存在，确保绑定存在。
  - 配置更改时：安全地应用增量（deltas）。
- **切换模型**：
  - 不读取通道本地 ACP 绑定回退，
  - 持久化 ACP 绑定仅源自顶级 `bindings[].type="acp"` 条目。

## 分阶段交付

### 第一阶段：类型化绑定模式基础

- 扩展配置模式以支持 `bindings[].type` 鉴别器：
  - `route`，
  - `acp` 带有可选 `acp` 覆盖对象（`mode`, `backend`, `cwd`, `label`）。
- 使用运行时描述符扩展代理模式，以标记 ACP 原生代理（`agents.list[].runtime.type`）。
- 为路由绑定和 ACP 绑定添加解析器/索引器拆分。

### 第二阶段：运行时解析 + Discord/Telegram 功能对等

- 从顶级 `type: "acp"` 条目解析持久化 ACP 绑定，用于：
  - Discord 频道/线程，
  - Telegram 论坛话题（`chatId:topic:topicId` 规范 ID）。
- 实现 Telegram 绑定适配器和入站绑定会话覆盖，以与 Discord 功能对等。
- 在此阶段不包括 Telegram 直接/私人话题变体。

### 第三阶段：命令对等和重置

- 在已绑定的 Telegram/Discord 对话中统一 `/acp`、`/new`、`/reset` 和 `/focus` 的行为。
- 确保绑定按照配置在重置流程中得以保留。

### 第 4 阶段：加固

- 更完善的诊断功能（`/acp status`、启动对齐日志）。
- 冲突处理和健康检查。

## 防护措施与策略

- 完全按照目前的标准遵守 ACP 启用和沙箱限制。
- 保留显式账户范围划分（`accountId`）以避免跨账户泄露。
- 在路由模棱两可时采取“失败关闭”策略。
- 保持针对每个通道配置的提及/访问策略行为显式化。

## 测试计划

- 单元测试：
  - 对话 ID 归一化（尤其是 Telegram 话题 ID），
  - 协调器创建/更新/删除路径，
  - `/acp bind --persist` 和解绑流程。
- 集成测试：
  - 入站 Telegram 话题 -> 已绑定 ACP 会话解析，
  - 入站 Discord 频道/线程 -> 持久绑定优先级。
- 回归测试：
  - 临时绑定继续有效，
  - 未绑定频道/话题保持当前路由行为。

## 未决问题

- Telegram 话题中的 `/acp spawn --thread auto` 是否应默认为 `here`？
- 持久绑定是否应在绑定对话中始终绕过提及限制，还是需要显式的 `requireMention=false`？
- `/focus` 是否应将 `--persist` 作为 `/acp bind --persist` 的别名？

## 发布

- 作为按对话选择加入的功能发布（存在 `bindings[].type="acp"` 条目）。
- 首先支持 Discord + Telegram。
- 添加包含以下示例的文档：
  - “每个 Agent 一个频道/话题”
  - “同一 Agent 拥有多个频道/话题且具有不同的 `cwd`”
  - “团队命名模式（`codex-1`、`claude-repo-x`）”。
