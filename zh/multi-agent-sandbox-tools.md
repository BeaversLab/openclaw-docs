---
summary: "Per-agent sandbox + 工具 restrictions, precedence, and examples"
title: Multi-Agent 沙箱 & Tools
read_when: "You want per-agent 沙箱隔离 or per-agent 工具 allow/deny policies in a multi-agent gateway."
status: active
---

# Multi-Agent 沙箱 & Tools Configuration

## Overview

Each agent in a multi-agent setup can now have its own:

- **沙箱 configuration** (`agents.list[].sandbox` overrides `agents.defaults.sandbox`)
- **Tool restrictions** (`tools.allow` / `tools.deny`, plus `agents.list[].tools`)

This allows you to run multiple agents with different security profiles:

- Personal assistant with full access
- Family/work agents with restricted tools
- Public-facing agents in sandboxes

`setupCommand` belongs under `sandbox.docker` (global or per-agent) and runs once
when the container is created.

Auth is per-agent: each agent reads from its own `agentDir` auth store at:

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

Credentials are **not** shared between agents. Never reuse `agentDir` across agents.
If you want to share creds, copy `auth-profiles.json` into the other agent's `agentDir`.

For how 沙箱隔离 behaves at runtime, see [沙箱隔离](/zh/gateway/sandboxing).
For debugging “why is this blocked?”, see [沙箱 vs Tool Policy vs Elevated](/zh/gateway/sandbox-vs-tool-policy-vs-elevated) and `openclaw sandbox explain`.

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

- `agents.list[].sandbox.{docker,browser,prune}.*` 会覆盖该代理的 `agents.defaults.sandbox.{docker,browser,prune}.*`（当沙箱范围解析为 `"shared"` 时忽略）。

### 工具限制

过滤顺序为：

1. **工具配置**（`tools.profile` 或 `agents.list[].tools.profile`）
2. **提供商工具配置**（`tools.byProvider[provider].profile` 或 `agents.list[].tools.byProvider[provider].profile`）
3. **全局工具策略**（`tools.allow` / `tools.deny`）
4. **提供商工具策略**（`tools.byProvider[provider].allow/deny`）
5. **代理特定工具策略**（`agents.list[].tools.allow/deny`）
6. **代理提供商策略**（`agents.list[].tools.byProvider[provider].allow/deny`）
7. **沙箱工具策略**（`tools.sandbox.tools` 或 `agents.list[].tools.sandbox.tools`）
8. **子代理工具策略**（`tools.subagents.tools`，如适用）

每个层级都可以进一步限制工具，但不能恢复早期层级中被拒绝的工具。
如果设置了 `agents.list[].tools.sandbox.tools`，它将替换该代理的 `tools.sandbox.tools`。
如果设置了 `agents.list[].tools.profile`，它将覆盖该代理的 `tools.profile`。
提供商工具键接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.2`）。

### 工具组（简写）

工具策略（全局、代理、沙箱）支持扩展为多个具体工具的 `group:*` 条目：

- `group:runtime`：`exec`、`bash`、`process`
- `group:fs`：`read`、`write`、`edit`、`apply_patch`
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`
- `group:memory`：`memory_search`、`memory_get`
- `group:ui`：`browser`、`canvas`
- `group:automation`: `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:openclaw`: 所有内置 OpenClaw 工具（不包括提供商插件）

### 提升模式

`tools.elevated` 是全局基线（基于发送方的允许列表）。`agents.list[].tools.elevated` 可以针对特定代理进一步限制提升权限（两者必须均允许）。

缓解模式：

- 拒绝非受信代理的 `exec` (`agents.list[].tools.deny: ["exec"]`)
- 避免将路由到受限代理的发送方加入允许列表
- 如果您只希望沙箱隔离执行，请全局禁用提升模式 (`tools.elevated.enabled: false`)
- 针对敏感配置文件，逐个代理禁用提升模式 (`agents.list[].tools.elevated.enabled: false`)

---

## 从单代理迁移

**之前（单代理）：**

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

旧的 `agent.*` 配置由 `openclaw doctor` 迁移；今后请使用 `agents.defaults` + `agents.list`。

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

### 仅通信代理

```json
{
  "tools": {
    "allow": ["sessions_list", "sessions_send", "sessions_history", "session_status"],
    "deny": ["exec", "write", "edit", "apply_patch", "read", "browser"]
  }
}
```

---

## 常见陷阱："non-main"

`agents.defaults.sandbox.mode: "non-main"` 基于 `session.mainKey`（默认为 `"main"`），
而不是代理 ID。组/渠道会话总是获得自己的密钥，因此
它们被视为非主体，将被沙箱隔离。如果您希望代理永不
沙箱隔离，请设置 `agents.list[].sandbox.mode: "off"`。

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

### 尽管设置了 `mode: "all"`，代理仍未沙箱隔离

- 检查是否有覆盖它的全局 `agents.defaults.sandbox.mode`
- 代理特定配置优先级更高，因此请设置 `agents.list[].sandbox.mode: "all"`

### 尽管有拒绝列表，工具仍然可用

- 检查工具过滤顺序：全局 → 代理 → 沙箱 → 子代理
- 每一层只能进一步限制，不能恢复权限
- 通过日志验证：`[tools] filtering tools for agent:${agentId}`

### 容器未按代理隔离

- 在代理特定的沙箱配置中设置 `scope: "agent"`
- 默认值为 `"session"`，即为每个会话创建一个容器

---

## 另请参阅

- [多代理路由](/zh/concepts/multi-agent)
- [沙箱配置](/zh/gateway/configuration#agentsdefaults-sandbox)
- [会话管理](/zh/concepts/session)

import zh from "/components/footer/zh.mdx";

<zh />
