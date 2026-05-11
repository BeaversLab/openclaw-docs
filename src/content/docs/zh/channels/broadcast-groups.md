---
summary: "向多个代理广播 WhatsApp 消息"
read_when:
  - Configuring broadcast groups
  - Debugging multi-agent replies in WhatsApp
status: 实验性
title: "广播群组"
sidebarTitle: "广播群组"
---

<Note>**状态：** 实验性功能。添加于 2026.1.9。</Note>

## 概述

广播组允许多个代理同时处理并响应同一条消息。这使您能够创建专门的代理团队，他们在同一个 WhatsApp 群组或私信中协同工作——全部使用一个电话号码。

当前范围：**仅限 WhatsApp**（Web 端渠道）。

广播组在渠道允许列表和群组激活规则之后进行评估。在 WhatsApp 群组中，这意味着广播会在 OpenClaw 通常回复时发生（例如：在提及时，取决于您的群组设置）。

## 用例

<AccordionGroup>
  <Accordion title="1. 专业化代理团队">
    部署多个具有原子性、专注职责的代理：

    ```
    Group: "Development Team"
    Agents:
      - CodeReviewer (reviews code snippets)
      - DocumentationBot (generates docs)
      - SecurityAuditor (checks for vulnerabilities)
      - TestGenerator (suggests test cases)
    ```

    每个代理处理同一条消息并提供其专业视角。

  </Accordion>
  <Accordion title="2. 多语言支持">
    ```
    Group: "International Support"
    Agents:
      - Agent_EN (responds in English)
      - Agent_DE (responds in German)
      - Agent_ES (responds in Spanish)
    ```
  </Accordion>
  <Accordion title="3. 质量保证工作流">
    ```
    Group: "Customer Support"
    Agents:
      - SupportAgent (provides answer)
      - QAAgent (reviews quality, only responds if issues found)
    ```
  </Accordion>
  <Accordion title="4. 任务自动化">
    ```
    Group: "Project Management"
    Agents:
      - TaskTracker (updates task database)
      - TimeLogger (logs time spent)
      - ReportGenerator (creates summaries)
    ```
  </Accordion>
</AccordionGroup>

## 配置

### 基本设置

添加一个顶层的 `broadcast` 部分（紧邻 `bindings`）。键为 WhatsApp 对端 ID：

- 群聊：群组 JID（例如 `120363403215116621@g.us`）
- 私信：E.164 电话号码（例如 `+15551234567`）

```json
{
  "broadcast": {
    "120363403215116621@g.us": ["alfred", "baerbel", "assistant3"]
  }
}
```

**结果：** 当 OpenClaw 在此聊天中回复时，它将运行所有三个代理。

### 处理策略

控制代理如何处理消息：

<Tabs>
  <Tab title="parallel（默认）">
    所有代理同时处理：

    ```json
    {
      "broadcast": {
        "strategy": "parallel",
        "120363403215116621@g.us": ["alfred", "baerbel"]
      }
    }
    ```

  </Tab>
  <Tab title="sequential">
    代理按顺序处理（一个等待前一个完成）：

    ```json
    {
      "broadcast": {
        "strategy": "sequential",
        "120363403215116621@g.us": ["alfred", "baerbel"]
      }
    }
    ```

  </Tab>
</Tabs>

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

### 消息流

<Steps>
  <Step title="Incoming message arrives">一条 WhatsApp 群组或私信消息到达。</Step>
  <Step title="Broadcast check">系统检查对端 ID 是否在 `broadcast` 中。</Step>
  <Step title="If in broadcast list">- 列出的所有代理都会处理该消息。 - 每个代理都有自己的会话密钥和隔离的上下文。 - 代理并行处理（默认）或顺序处理。</Step>
  <Step title="If not in broadcast list">应用正常路由（第一个匹配的绑定）。</Step>
</Steps>

<Note>广播组不会绕过渠道白名单或组激活规则（提及/命令等）。它们仅改变当消息符合处理条件时_运行哪些代理_。</Note>

### 会话隔离

广播组中的每个代理都保持完全独立的：

- **会话密钥**（`agent:alfred:whatsapp:group:120363...` vs `agent:baerbel:whatsapp:group:120363...`）
- **对话历史**（代理看不到其他代理的消息）
- **工作空间**（如果配置了则为独立的沙箱）
- **工具访问权限**（不同的允许/拒绝列表）
- **记忆/上下文**（独立的 IDENTITY.md、SOUL.md 等）
- **组上下文缓冲区**（用于上下文的最近组消息）按对等方共享，因此所有广播代理在被触发时看到的上下文相同

这允许每个代理具有：

- 不同的个性
- 不同的工具访问权限（例如，只读与读写）
- 不同的模型（例如，opus 与 sonnet）
- 安装了不同的技能

### 示例：隔离的会话

在组 `120363403215116621@g.us` 中，代理为 `["alfred", "baerbel"]`：

<Tabs>
  <Tab title="Alfred's context">``` Session: agent:alfred:whatsapp:group:120363403215116621@g.us History: [user message, alfred's previous responses] Workspace: /Users/user/openclaw-alfred/ Tools: read, write, exec ```</Tab>
  <Tab title="Bärbel's context">``` Session: agent:baerbel:whatsapp:group:120363403215116621@g.us History: [user message, baerbel's previous responses] Workspace: /Users/user/openclaw-baerbel/ Tools: read only ```</Tab>
</Tabs>

## 最佳实践

<AccordionGroup>
  <Accordion title="1. Keep agents focused">
    设计每个代理时赋予单一、明确的职责：

    ```json
    {
      "broadcast": {
        "DEV_GROUP": ["formatter", "linter", "tester"]
      }
    }
    ```

    ✅ **好：** 每个代理只有一个工作。 ❌ **坏：** 一个通用的“开发助手”代理。

  </Accordion>
  <Accordion title="2. Use descriptive names">
    明确每个代理的作用：

    ```json
    {
      "agents": {
        "security-scanner": { "name": "Security Scanner" },
        "code-formatter": { "name": "Code Formatter" },
        "test-generator": { "name": "Test Generator" }
      }
    }
    ```

  </Accordion>
  <Accordion title="3. 配置不同的工具访问权限">
    仅赋予代理所需的工具：

    ```json
    {
      "agents": {
        "reviewer": {
          "tools": { "allow": ["read", "exec"] } // Read-only
        },
        "fixer": {
          "tools": { "allow": ["read", "write", "edit", "exec"] } // Read-write
        }
      }
    }
    ```

  </Accordion>
  <Accordion title="4. 监控性能">
    拥有许多代理时，请考虑：

    - 使用 `"strategy": "parallel"`（默认）以提升速度
    - 将广播组的代理限制在 5-10 个
    - 为简单的代理使用更快的模型

  </Accordion>
  <Accordion title="5. 优雅地处理故障">
    代理独立失败。一个代理的错误不会阻止其他代理：

    ```
    Message → [Agent A ✓, Agent B ✗ error, Agent C ✓]
    Result: Agent A and C respond, Agent B logs error
    ```

  </Accordion>
</AccordionGroup>

## 兼容性

### 提供商

广播组目前适用于：

- ✅ WhatsApp（已实现）
- 🚧 Telegram（计划中）
- 🚧 Discord（计划中）
- 🚧 Slack（计划中）

### 路由

广播组与现有路由配合工作：

```json
{
  "bindings": [
    {
      "match": { "channel": "whatsapp", "peer": { "kind": "group", "id": "GROUP_A" } },
      "agentId": "alfred"
    }
  ],
  "broadcast": {
    "GROUP_B": ["agent1", "agent2"]
  }
}
```

- `GROUP_A`：仅 alfred 响应（常规路由）。
- `GROUP_B`：agent1 和 agent2 都响应（广播）。

<Note>**优先级：** `broadcast` 优先于 `bindings`。</Note>

## 故障排除

<AccordionGroup>
  <Accordion title="代理无响应">
    **检查：**

    1. 代理 ID 存在于 `agents.list` 中。
    2. 对等 ID 格式正确（例如 `120363403215116621@g.us`）。
    3. 代理不在拒绝列表中。

    **调试：**

    ```bash
    tail -f ~/.openclaw/logs/gateway.log | grep broadcast
    ```

  </Accordion>
  <Accordion title="仅有一个代理响应">
    **原因：** 对等 ID 可能位于 `bindings` 中，但不在 `broadcast` 中。

    **修复：** 添加到广播配置或从绑定中移除。

  </Accordion>
  <Accordion title="性能问题">
    如果代理众多导致缓慢：

    - 减少每组代理的数量。
    - 使用更轻量的模型（用 sonnet 代替 opus）。
    - 检查沙盒启动时间。

  </Accordion>
</AccordionGroup>

## 示例

<AccordionGroup>
  <Accordion title="示例 1：代码审查团队">
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
          {
            "id": "code-formatter",
            "workspace": "~/agents/formatter",
            "tools": { "allow": ["read", "write"] }
          },
          {
            "id": "security-scanner",
            "workspace": "~/agents/security",
            "tools": { "allow": ["read", "exec"] }
          },
          {
            "id": "test-coverage",
            "workspace": "~/agents/testing",
            "tools": { "allow": ["read", "exec"] }
          },
          { "id": "docs-checker", "workspace": "~/agents/docs", "tools": { "allow": ["read"] } }
        ]
      }
    }
    ```

    **用户发送：** 代码片段。

    **响应：**

    - code-formatter: "修复了缩进并添加了类型提示"
    - security-scanner: "⚠️ 第 12 行存在 SQL 注入漏洞"
    - test-coverage: "覆盖率为 45%，缺少错误情况的测试"
    - docs-checker: "函数 `process_data` 缺少文档字符串"

  </Accordion>
  <Accordion title="示例 2：多语言支持">
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
  </Accordion>
</AccordionGroup>

## API 参考

### 配置架构

```typescript
interface OpenClawConfig {
  broadcast?: {
    strategy?: "parallel" | "sequential";
    [peerId: string]: string[];
  };
}
```

### 字段

<ParamField path="strategy" type='"parallel" | "sequential"' default='"parallel"'>
  如何处理代理。`parallel` 同时运行所有代理；`sequential` 按数组顺序运行它们。
</ParamField>
<ParamField path="[peerId]" type="string[]">
  WhatsApp 组 JID、E.164 号码或其他对等 ID。该值是应处理消息的代理 ID 数组。
</ParamField>

## 限制

1. **最大代理数：** 没有硬性限制，但 10 个以上的代理可能会变慢。
2. **共享上下文：** 代理看不到彼此的响应（有意为之）。
3. **消息排序：** 并行响应可能以任何顺序到达。
4. **速率限制：** 所有代理都计入 WhatsApp 速率限制。

## 未来增强

计划中的功能：

- [ ] 共享上下文模式（代理可以看到彼此的响应）
- [ ] 代理协调（代理可以相互发信号）
- [ ] 动态代理选择（根据消息内容选择代理）
- [ ] 代理优先级（某些代理在其他代理之前响应）

## 相关

- [渠道路由](/zh/channels/channel-routing)
- [群组](/zh/channels/groups)
- [多代理沙盒工具](/zh/tools/multi-agent-sandbox-tools)
- [配对](/zh/channels/pairing)
- [会话管理](/zh/concepts/session)
