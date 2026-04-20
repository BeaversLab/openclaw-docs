---
summary: “Per-agent sandbox + 工具 restrictions, precedence, and examples”
title: 多智能体沙箱与工具
read_when: “You want per-agent 沙箱隔离 or per-agent 工具 allow/deny policies in a multi-agent gateway.”
status: active
---

# 多智能体沙箱与工具配置

Each agent in a multi-agent setup can override the global sandbox and 工具
policy. This page covers per-agent configuration, precedence rules, and
examples.

- **沙箱后端和模式**：参见 [沙箱隔离](/zh/gateway/sandboxing)。
- **调试被阻止的工具**：参见 [沙箱 vs Tool Policy vs Elevated](/zh/gateway/sandbox-vs-tool-policy-vs-elevated) 和 `openclaw sandbox explain`。
- **Elevated exec**：参见 [Elevated Mode](/zh/tools/elevated)。

Auth is per-agent: each agent reads from its own `agentDir` auth store at
`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`.
Credentials are **not** shared between agents. Never reuse `agentDir` across agents.
If you want to share creds, copy `auth-profiles.json` into the other agent's `agentDir`.

---

## Configuration Examples

### Example 1: Personal + Restricted Family Agent

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "default": true,
        "name": "Personal Assistant",
        "workspace": "~/.openclaw/workspace",
        "sandbox": { "mode": "off" }
      },
      {
        "id": "family",
        "name": "Family Bot",
        "workspace": "~/.openclaw/workspace-family",
        "sandbox": {
          "mode": "all",
          "scope": "agent"
        },
        "tools": {
          "allow": ["read"],
          "deny": ["exec", "write", "edit", "apply_patch", "process", "browser"]
        }
      }
    ]
  },
  "bindings": [
    {
      "agentId": "family",
      "match": {
        "provider": "whatsapp",
        "accountId": "*",
        "peer": {
          "kind": "group",
          "id": "120363424282127706@g.us"
        }
      }
    }
  ]
}
```

**Result:**

- `main` agent: Runs on host, full 工具 access
- `family` agent: Runs in Docker (one container per agent), only `read` 工具

---

### Example 2: Work Agent with Shared 沙箱

```json
{
  "agents": {
    "list": [
      {
        "id": "personal",
        "workspace": "~/.openclaw/workspace-personal",
        "sandbox": { "mode": "off" }
      },
      {
        "id": "work",
        "workspace": "~/.openclaw/workspace-work",
        "sandbox": {
          "mode": "all",
          "scope": "shared",
          "workspaceRoot": "/tmp/work-sandboxes"
        },
        "tools": {
          "allow": ["read", "write", "apply_patch", "exec"],
          "deny": ["browser", "gateway", "discord"]
        }
      }
    ]
  }
}
```

---

### Example 2b: Global coding profile + messaging-only agent

```json
{
  "tools": { "profile": "coding" },
  "agents": {
    "list": [
      {
        "id": "support",
        "tools": { "profile": "messaging", "allow": ["slack"] }
      }
    ]
  }
}
```

**Result:**

- default agents get coding tools
- `support` agent is messaging-only (+ Slack 工具)

---

### Example 3: Different 沙箱 Modes per Agent

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main", // Global default
        "scope": "session"
      }
    },
    "list": [
      {
        "id": "main",
        "workspace": "~/.openclaw/workspace",
        "sandbox": {
          "mode": "off" // Override: main never sandboxed
        }
      },
      {
        "id": "public",
        "workspace": "~/.openclaw/workspace-public",
        "sandbox": {
          "mode": "all", // Override: public always sandboxed
          "scope": "agent"
        },
        "tools": {
          "allow": ["read"],
          "deny": ["exec", "write", "edit", "apply_patch"]
        }
      }
    ]
  }
}
```

---

## Configuration Precedence

When both global (`agents.defaults.*`) and agent-specific (`agents.list[].*`) configs exist:

### 沙箱 Config

Agent-specific settings override global:

```
agents.list[].sandbox.mode > agents.defaults.sandbox.mode
agents.list[].sandbox.scope > agents.defaults.sandbox.scope
agents.list[].sandbox.workspaceRoot > agents.defaults.sandbox.workspaceRoot
agents.list[].sandbox.workspaceAccess > agents.defaults.sandbox.workspaceAccess
agents.list[].sandbox.docker.* > agents.defaults.sandbox.docker.*
agents.list[].sandbox.browser.* > agents.defaults.sandbox.browser.*
agents.list[].sandbox.prune.* > agents.defaults.sandbox.prune.*
```

**Notes:**

- `agents.list[].sandbox.{docker,browser,prune}.*` overrides `agents.defaults.sandbox.{docker,browser,prune}.*` for that agent (ignored when sandbox scope resolves to `"shared"`).

### Tool Restrictions

The filtering order is:

1. **Tool profile** (`tools.profile` or `agents.list[].tools.profile`)
2. **Provider 工具 profile** (`tools.byProvider[provider].profile` or `agents.list[].tools.byProvider[provider].profile`)
3. **Global 工具 policy** (`tools.allow` / `tools.deny`)
4. **提供商工具策略** (`tools.byProvider[provider].allow/deny`)
5. **特定于代理的工具策略** (`agents.list[].tools.allow/deny`)
6. **代理提供商策略** (`agents.list[].tools.byProvider[provider].allow/deny`)
7. **沙箱工具策略** (`tools.sandbox.tools` 或 `agents.list[].tools.sandbox.tools`)
8. **子代理工具策略** (`tools.subagents.tools`，如适用)

每个层级可以进一步限制工具，但不能恢复之前层级中拒绝的工具。
如果设置了 `agents.list[].tools.sandbox.tools`，它将替换该代理的 `tools.sandbox.tools`。
如果设置了 `agents.list[].tools.profile`，它将覆盖该代理的 `tools.profile`。
提供商工具键接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.4`）。

工具策略支持 `group:*` 简写，这些简写会扩展为多个工具。有关完整列表，请参阅 [Tool groups](/zh/gateway/sandbox-vs-tool-policy-vs-elevated#tool-groups-shorthands)。

每个代理的 elevated 覆盖项（`agents.list[].tools.elevated`）可以进一步限制特定代理的 elevated exec。有关详细信息，请参阅 [Elevated Mode](/zh/tools/elevated)。

---

## 从单一代理迁移

**之前（单一代理）：**

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/.openclaw/workspace",
      "sandbox": {
        "mode": "non-main"
      }
    }
  },
  "tools": {
    "sandbox": {
      "tools": {
        "allow": ["read", "write", "apply_patch", "exec"],
        "deny": []
      }
    }
  }
}
```

**之后（具有不同配置文件的多代理）：**

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "default": true,
        "workspace": "~/.openclaw/workspace",
        "sandbox": { "mode": "off" }
      }
    ]
  }
}
```

旧版 `agent.*` 配置由 `openclaw doctor` 迁移；今后建议使用 `agents.defaults` + `agents.list`。

---

## 工具限制示例

### 只读代理

```json
{
  "tools": {
    "allow": ["read"],
    "deny": ["exec", "write", "edit", "apply_patch", "process"]
  }
}
```

### 安全执行代理（无文件修改）

```json
{
  "tools": {
    "allow": ["read", "exec", "process"],
    "deny": ["write", "edit", "apply_patch", "browser", "gateway"]
  }
}
```

### 仅通讯代理

```json
{
  "tools": {
    "sessions": { "visibility": "tree" },
    "allow": ["sessions_list", "sessions_send", "sessions_history", "session_status"],
    "deny": ["exec", "write", "edit", "apply_patch", "read", "browser"]
  }
}
```

此配置文件中的 `sessions_history` 仍然返回有界的、经过清理的召回视图，而不是原始转储。Assistant 回调会去除思考标签、`<relevant-memories>` 脚手架、纯文本工具调用 XML 负载（包括 `<tool_call>...</tool_call>`、
`<function_call>...</function_call>`、 `<tool_calls>...</tool_calls>`、
`<function_calls>...</function_calls>` 和截断的工具调用块）、降级的工具调用脚手架、泄露的 ASCII/全角 模型控制令牌以及在编辑/截断之前格式错误的 MiniMax 工具调用 XML。

---

## 常见陷阱："non-main"

`agents.defaults.sandbox.mode: "non-main"` 基于 `session.mainKey`（默认为 `"main"`），
而不是代理 ID。组/渠道会话总是获得自己的密钥，因此它们被视为非主会话并将被沙箱隔离。如果您希望代理永不进行沙箱隔离，请设置 `agents.list[].sandbox.mode: "off"`。

---

## 测试

配置多代理沙箱和工具后：

1. **检查代理解析：**

   ```exec
   openclaw agents list --bindings
   ```

2. **验证沙箱容器：**

   ```exec
   docker ps --filter "name=openclaw-sbx-"
   ```

3. **测试工具限制：**
   - 发送一条需要受限工具的消息
   - 验证代理无法使用被拒绝的工具

4. **监控日志：**

   ```exec
   tail -f "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/logs/gateway.log" | grep -E "routing|sandbox|tools"
   ```

---

## 故障排除

### 尽管有 `mode: "all"`，代理仍未进行沙箱隔离

- 检查是否存在覆盖它的全局 `agents.defaults.sandbox.mode`
- 代理特定配置优先级更高，因此设置 `agents.list[].sandbox.mode: "all"`

### 尽管有拒绝列表，工具仍然可用

- 检查工具过滤顺序：全局 → 代理 → 沙箱 → 子代理
- 每个层级只能进一步限制，不能恢复权限
- 通过日志验证：`[tools] filtering tools for agent:${agentId}`

### 容器未按代理隔离

- 在代理特定的沙箱配置中设置 `scope: "agent"`
- 默认为 `"session"`，这会为每个会话创建一个容器

---

## 另请参阅

- [沙箱隔离](/zh/gateway/sandboxing) -- 完整的沙箱参考（模式、范围、后端、镜像）
- [沙箱 vs 工具策略 vs 提权模式](/zh/gateway/sandbox-vs-tool-policy-vs-elevated) -- 调试“为什么被阻止？”
- [提权模式](/zh/tools/elevated)
- [多代理路由](/zh/concepts/multi-agent)
- [沙箱配置](/zh/gateway/configuration-reference#agentsdefaultssandbox)
- [会话管理](/zh/concepts/session)
