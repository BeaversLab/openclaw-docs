---
summary: "将 WhatsApp 消息广播给多个 agent"
read_when:
  - 配置广播组
  - 调试 WhatsApp 的多 agent 回复
status: experimental
title: "广播群组"
---

# 广播组
**状态：** 实验性  
**版本：** 2026.1.9 新增

## 概览

广播组允许多个 agent 同时处理并回复同一条消息。这样你可以在一个
WhatsApp 群聊或私聊中组建协作的专用 agent 团队——只用一个手机号。

当前范围：**仅 WhatsApp**（web 渠道）。

广播组会在渠道 allowlist 与群组激活规则之后评估。对 WhatsApp 群聊而言，
这表示只有在 OpenClaw 原本会回复的情况下（例如被提及，取决于群设置）才会触发广播。

## 使用场景

### 1. 专业分工的 Agent 团队
部署多个职责单一、聚焦的 agent：
```
Group: "Development Team"
Agents:
  - CodeReviewer (reviews code snippets)
  - DocumentationBot (generates docs)
  - SecurityAuditor (checks for vulnerabilities)
  - TestGenerator (suggests test cases)
```

每个 agent 处理同一条消息并给出自己的专业视角。

### 2. 多语言支持
```
Group: "International Support"
Agents:
  - Agent_EN (responds in English)
  - Agent_DE (responds in German)
  - Agent_ES (responds in Spanish)
```

### 3. 质量保障流程
```
Group: "Customer Support"
Agents:
  - SupportAgent (provides answer)
  - QAAgent (reviews quality, only responds if issues found)
```

### 4. 任务自动化
```
Group: "Project Management"
Agents:
  - TaskTracker (updates task database)
  - TimeLogger (logs time spent)
  - ReportGenerator (creates summaries)
```

## 配置

### 基础配置

在顶层添加 `broadcast`（与 `bindings` 同级）。键为 WhatsApp peer id：
- 群聊：群 JID（例如 `120363403215116621@g.us`）
- 私聊：E.164 电话号码（例如 `+15551234567`）

```json
{
  "broadcast": {
    "120363403215116621@g.us": ["alfred", "baerbel", "assistant3"]
  }
}
```

**结果：** 当 OpenClaw 在该聊天中本应回复时，会运行这三个 agent。

### 处理策略

控制 agent 如何处理消息：

#### 并行（默认）
所有 agent 同时处理：
```json
{
  "broadcast": {
    "strategy": "parallel",
    "120363403215116621@g.us": ["alfred", "baerbel"]
  }
}
```

#### 顺序
agent 按顺序处理（前一个完成后再开始）：
```json
{
  "broadcast": {
    "strategy": "sequential",
    "120363403215116621@g.us": ["alfred", "baerbel"]
  }
}
```

### 完整示例

```json
{
  "agents": {
    "list": [
      {
        "id": "code-reviewer",
        "name": "Code Reviewer",
        "workspace": "/path/to/code-reviewer",
        "sandbox": { "mode": "all" }
      },
      {
        "id": "security-auditor",
        "name": "Security Auditor",
        "workspace": "/path/to/security-auditor",
        "sandbox": { "mode": "all" }
      },
      {
        "id": "docs-generator",
        "name": "Documentation Generator",
        "workspace": "/path/to/docs-generator",
        "sandbox": { "mode": "all" }
      }
    ]
  },
  "broadcast": {
    "strategy": "parallel",
    "120363403215116621@g.us": ["code-reviewer", "security-auditor", "docs-generator"],
    "120363424282127706@g.us": ["support-en", "support-de"],
    "+15555550123": ["assistant", "logger"]
  }
}
```

## 工作原理

### 消息流程

1. **收到消息**：来自 WhatsApp 群聊
2. **广播检查**：系统检查 peer ID 是否在 `broadcast` 中
3. **若在广播列表中**：
   - 所有列出的 agent 都会处理消息
   - 每个 agent 拥有独立会话 key 与隔离上下文
   - 按并行（默认）或顺序处理
4. **若不在广播列表中**：
   - 走常规路由（首个匹配 binding）

注意：广播组不会绕过渠道 allowlist 或群组激活规则（提及/命令等）。
它们只改变 *在消息满足处理条件时，哪些 agent 会运行*。

### 会话隔离

广播组中的每个 agent 都完全独立：

- **会话 key**（`agent:alfred:whatsapp:group:120363...` vs `agent:baerbel:whatsapp:group:120363...`）
- **对话历史**（agent 不会看到其他 agent 的消息）
- **工作区**（若配置了独立 sandbox）
- **工具访问**（不同 allow/deny 列表）
- **记忆/上下文**（独立的 IDENTITY.md、SOUL.md 等）
- **群组上下文缓冲**（用于上下文的最近群消息）在每个 peer 级别共享，因此触发时所有广播 agent 都看到相同上下文

这使得每个 agent 可以拥有：
- 不同人格
- 不同工具权限（如只读 vs 读写）
- 不同模型（如 opus vs sonnet）
- 不同安装技能

### 示例：隔离会话

在群 `120363403215116621@g.us` 中有 agent `["alfred", "baerbel"]`：

**Alfred 的上下文：**
```
Session: agent:alfred:whatsapp:group:120363403215116621@g.us
History: [user message, alfred's previous responses]
Workspace: /Users/pascal/openclaw-alfred/
Tools: read, write, exec
```

**Bärbel 的上下文：**
```
Session: agent:baerbel:whatsapp:group:120363403215116621@g.us  
History: [user message, baerbel's previous responses]
Workspace: /Users/pascal/openclaw-baerbel/
Tools: read only
```

## 最佳实践

### 1. 保持 Agent 聚焦

让每个 agent 只负责一个清晰任务：

```json
{
  "broadcast": {
    "DEV_GROUP": ["formatter", "linter", "tester"]
  }
}
```

✅ **好：** 每个 agent 只负责一件事  
❌ **坏：** 一个泛化的 “dev-helper” agent

### 2. 使用描述性名称

让每个 agent 的职责一目了然：

```json
{
  "agents": {
    "security-scanner": { "name": "Security Scanner" },
    "code-formatter": { "name": "Code Formatter" },
    "test-generator": { "name": "Test Generator" }
  }
}
```

### 3. 配置不同的工具权限

仅给 agent 必要的工具权限：

```json
{
  "agents": {
    "reviewer": {
      "tools": { "allow": ["read", "exec"] }  // Read-only
    },
    "fixer": {
      "tools": { "allow": ["read", "write", "edit", "exec"] }  // Read-write
    }
  }
}
```

### 4. 监控性能

当 agent 数量较多时：
- 使用 `"strategy": "parallel"`（默认）提升速度
- 将每个广播组限制在 5-10 个 agent
- 为简单 agent 使用更快的模型

### 5. 优雅处理失败

agent 失败互不影响，一个 agent 的错误不会阻塞其他人：

```
Message → [Agent A ✓, Agent B ✗ error, Agent C ✓]
Result: Agent A and C respond, Agent B logs error
```

## 兼容性

### Providers

广播组当前支持：
- ✅ WhatsApp（已实现）
- 🚧 Telegram（计划中）
- 🚧 Discord（计划中）
- 🚧 Slack（计划中）

### Routing

广播组可与现有路由并存：

```json
{
  "bindings": [
    { "match": { "channel": "whatsapp", "peer": { "kind": "group", "id": "GROUP_A" } }, "agentId": "alfred" }
  ],
  "broadcast": {
    "GROUP_B": ["agent1", "agent2"]
  }
}
```

- `GROUP_A`：只有 alfred 回复（常规路由）
- `GROUP_B`：agent1 和 agent2 都回复（广播）

**优先级：** `broadcast` 高于 `bindings`。

## 故障排查

### Agent 没有响应

**检查：**
1. `agents.list` 中存在 agent ID
2. peer ID 格式正确（例如 `120363403215116621@g.us`）
3. agent 不在 deny 列表中

**调试：**
```bash
tail -f ~/.openclaw/logs/gateway.log | grep broadcast
```

### 只有一个 Agent 回复

**原因：** peer ID 可能在 `bindings` 中但不在 `broadcast` 中。

**修复：** 加入 broadcast 配置，或从 bindings 移除。

### 性能问题

**当很多 agent 很慢时：**
- 减少每组 agent 数量
- 使用更轻量模型（sonnet 替代 opus）
- 检查 sandbox 启动时间

## 示例

### 示例 1：代码审查团队

```json
{
  "broadcast": {
    "strategy": "parallel",
    "120363403215116621@g.us": [
      "code-formatter",
      "security-scanner",
      "test-coverage",
      "docs-checker"
    ]
  },
  "agents": {
    "list": [
      { "id": "code-formatter", "workspace": "~/agents/formatter", "tools": { "allow": ["read", "write"] } },
      { "id": "security-scanner", "workspace": "~/agents/security", "tools": { "allow": ["read", "exec"] } },
      { "id": "test-coverage", "workspace": "~/agents/testing", "tools": { "allow": ["read", "exec"] } },
      { "id": "docs-checker", "workspace": "~/agents/docs", "tools": { "allow": ["read"] } }
    ]
  }
}
```

**用户发送：** 代码片段  
**回复：**
- code-formatter: "Fixed indentation and added type hints"
- security-scanner: "⚠️ SQL injection vulnerability in line 12"
- test-coverage: "Coverage is 45%, missing tests for error cases"
- docs-checker: "Missing docstring for function `process_data`"

### 示例 2：多语言支持

```json
{
  "broadcast": {
    "strategy": "sequential",
    "+15555550123": ["detect-language", "translator-en", "translator-de"]
  },
  "agents": {
    "list": [
      { "id": "detect-language", "workspace": "~/agents/lang-detect" },
      { "id": "translator-en", "workspace": "~/agents/translate-en" },
      { "id": "translator-de", "workspace": "~/agents/translate-de" }
    ]
  }
}
```

## API 参考

### Config Schema

```typescript
interface OpenClawConfig {
  broadcast?: {
    strategy?: "parallel" | "sequential";
    [peerId: string]: string[];
  };
}
```

### 字段

- `strategy`（可选）：agent 处理策略
  - `"parallel"`（默认）：所有 agent 同时处理
  - `"sequential"`：按数组顺序处理
  
- `[peerId]`：WhatsApp 群 JID、E.164 号码或其他 peer ID
  - 值：应处理消息的 agent ID 数组

## 限制

1. **最大 agent 数**：无硬限制，但 10+ 可能较慢
2. **共享上下文**：agent 不会看到彼此回复（设计如此）
3. **消息顺序**：并行回复可能乱序到达
4. **速率限制**：所有 agent 计入 WhatsApp 速率限制

## 未来增强

计划特性：
- [ ] 共享上下文模式（agent 可见彼此回复）
- [ ] agent 协作（agent 可互相通知）
- [ ] 动态 agent 选择（根据消息内容挑选 agent）
