> [!NOTE]
> 本页正在翻译中。

---
summary: "按 agent 的 sandbox + 工具限制、优先级与示例"
title: Multi-Agent Sandbox & Tools
read_when: "你想在多 agent gateway 中启用按 agent 的 sandbox 或工具 allow/deny 策略。"
status: active
---

# Multi-Agent Sandbox & Tools Configuration

## Overview

在多 agent 配置中，每个 agent 现在可以有自己的：
- **Sandbox 配置**（`agents.list[].sandbox` 覆盖 `agents.defaults.sandbox`）
- **工具限制**（`tools.allow` / `tools.deny`，以及 `agents.list[].tools`）

这样你就能让多个 agent 运行在不同安全配置下：
- 具备完整权限的个人助手
- 受限工具的家庭/工作 agent
- 运行在 sandbox 中的公共 agent

`setupCommand` 放在 `sandbox.docker` 下（全局或按 agent），并在容器创建时只运行一次。

Auth 是按 agent 分离的：每个 agent 读取自身 `agentDir` 的 auth 存储：

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

凭据**不会**在 agent 之间共享。不要在多个 agent 间复用 `agentDir`。
如果需要共享凭据，把 `auth-profiles.json` 复制到另一个 agent 的 `agentDir`。

关于 sandboxing 运行时行为，见 [Sandboxing](/zh/gateway/sandboxing)。
关于“为什么被阻止”，见 [Sandbox vs Tool Policy vs Elevated](/zh/gateway/sandbox-vs-tool-policy-vs-elevated) 和 `openclaw sandbox explain`。

---

## 配置示例

### 示例 1：个人 + 受限家庭 Agent

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

**结果：**
- `main` agent：在宿主机上运行，工具权限完整
- `family` agent：在 Docker 中运行（每 agent 一个容器），只有 `read` 工具

---

### 示例 2：共享 sandbox 的工作 Agent

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

### 示例 2b：全局 coding profile + 仅消息 agent

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

**结果：**
- 默认 agents 使用 coding 工具
- `support` agent 仅消息（+ Slack 工具）

---

### 示例 3：不同 agent 的 Sandbox 模式

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main",  // 全局默认
        "scope": "session"
      }
    },
    "list": [
      {
        "id": "main",
        "workspace": "~/.openclaw/workspace",
        "sandbox": {
          "mode": "off"  // 覆盖：main 从不 sandbox
        }
      },
      {
        "id": "public",
        "workspace": "~/.openclaw/workspace-public",
        "sandbox": {
          "mode": "all",  // 覆盖：public 始终 sandbox
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

## 配置优先级

当同时存在全局（`agents.defaults.*`）与按 agent（`agents.list[].*`）配置时：

### Sandbox 配置

按 agent 配置覆盖全局：
```
agents.list[].sandbox.mode > agents.defaults.sandbox.mode
agents.list[].sandbox.scope > agents.defaults.sandbox.scope
agents.list[].sandbox.workspaceRoot > agents.defaults.sandbox.workspaceRoot
agents.list[].sandbox.workspaceAccess > agents.defaults.sandbox.workspaceAccess
agents.list[].sandbox.docker.* > agents.defaults.sandbox.docker.*
agents.list[].sandbox.browser.* > agents.defaults.sandbox.browser.*
agents.list[].sandbox.prune.* > agents.defaults.sandbox.prune.*
```

**注意：**
- `agents.list[].sandbox.{docker,browser,prune}.*` 会覆盖 `agents.defaults.sandbox.{docker,browser,prune}.*`（当 sandbox scope 解析为 `"shared"` 时忽略）。

### 工具限制

过滤顺序：
1. **工具 profile**（`tools.profile` 或 `agents.list[].tools.profile`）
2. **Provider 工具 profile**（`tools.byProvider[provider].profile` 或 `agents.list[].tools.byProvider[provider].profile`）
3. **全局工具策略**（`tools.allow` / `tools.deny`）
4. **Provider 工具策略**（`tools.byProvider[provider].allow/deny`）
5. **按 agent 工具策略**（`agents.list[].tools.allow/deny`）
6. **按 agent 的 provider 策略**（`agents.list[].tools.byProvider[provider].allow/deny`）
7. **Sandbox 工具策略**（`tools.sandbox.tools` 或 `agents.list[].tools.sandbox.tools`）
8. **子 agent 工具策略**（适用时为 `tools.subagents.tools`）

每一层都只能进一步限制工具，**不能**把前面层级已拒绝的工具重新放行。
如果设置了 `agents.list[].tools.sandbox.tools`，它会替代该 agent 的 `tools.sandbox.tools`。
如果设置了 `agents.list[].tools.profile`，它会覆盖该 agent 的 `tools.profile`。
Provider 工具键支持 `provider`（如 `google-antigravity`）或 `provider/model`（如 `openai/gpt-5.2`）。

### 工具组（简写）

工具策略（全局、agent、sandbox）支持 `group:*` 形式，展开为多个具体工具：

- `group:runtime`：`exec`, `bash`, `process`
- `group:fs`：`read`, `write`, `edit`, `apply_patch`
- `group:sessions`：`sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status`
- `group:memory`：`memory_search`, `memory_get`
- `group:ui`：`browser`, `canvas`
- `group:automation`：`cron`, `gateway`
- `group:messaging`：`message`
- `group:nodes`：`nodes`
- `group:openclaw`：所有内置 OpenClaw 工具（不包含 provider 插件）

### Elevated Mode

`tools.elevated` 是全局基线（基于发送者 allowlist）。`agents.list[].tools.elevated` 可进一步限制某些 agent 的 elevated（必须同时允许）。

缓解模式：
- 对不可信 agent 禁用 `exec`（`agents.list[].tools.deny: ["exec"]`）
- 避免 allowlist 的发送者被路由到受限 agent
- 全局禁用 elevated（`tools.elevated.enabled: false`），若你只想要 sandbox 执行
- 对敏感 agent 单独禁用 elevated（`agents.list[].tools.elevated.enabled: false`）

---

## 从单 agent 迁移

**之前（单 agent）：**
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

**之后（多 agent + 不同 profile）：**
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

旧的 `agent.*` 配置会由 `openclaw doctor` 迁移；未来请优先使用 `agents.defaults` + `agents.list`。

---

## 工具限制示例

### 只读 Agent
```json
{
  "tools": {
    "allow": ["read"],
    "deny": ["exec", "write", "edit", "apply_patch", "process"]
  }
}
```

### 安全执行 Agent（禁止修改文件）
```json
{
  "tools": {
    "allow": ["read", "exec", "process"],
    "deny": ["write", "edit", "apply_patch", "browser", "gateway"]
  }
}
```

### 仅通信 Agent
```json
{
  "tools": {
    "allow": ["sessions_list", "sessions_send", "sessions_history", "session_status"],
    "deny": ["exec", "write", "edit", "apply_patch", "read", "browser"]
  }
}
```

---

## 常见坑：“non-main”

`agents.defaults.sandbox.mode: "non-main"` 取决于 `session.mainKey`（默认 "main"），
而不是 agent id。群组/频道会话总是使用独立 key，因此会被视为 non-main 并被 sandbox。
如果你希望某个 agent 永不 sandbox，设置 `agents.list[].sandbox.mode: "off"`。

---

## 测试

配置好多 agent sandbox 与工具后：

1. **检查 agent 解析：**
   ```exec
   openclaw agents list --bindings
   ```

2. **验证 sandbox 容器：**
   ```exec
   docker ps --filter "name=openclaw-sbx-"
   ```

3. **测试工具限制：**
   - 发送一条需要受限工具的消息
   - 验证该 agent 无法使用被拒绝的工具

4. **观察日志：**
   ```exec
   tail -f "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/logs/gateway.log" | grep -E "routing|sandbox|tools"
   ```

---

## Troubleshooting

### Agent 没有按 `mode: "all"` sandbox
- 检查是否有全局 `agents.defaults.sandbox.mode` 覆盖了它
- 按 agent 配置优先级更高，请设置 `agents.list[].sandbox.mode: "all"`

### deny 列表里的工具仍可用
- 检查工具过滤顺序：全局 → agent → sandbox → subagent
- 各层只能进一步限制，不能放行
- 日志验证：`[tools] filtering tools for agent:${agentId}`

### 容器未按 agent 隔离
- 在该 agent 的 sandbox 配置中设置 `scope: "agent"`
- 默认是 `"session"`，会为每个会话创建一个容器

---

## See Also

- [Multi-Agent Routing](/zh/concepts/multi-agent)
- [Sandbox Configuration](/zh/gateway/configuration#agentsdefaults-sandbox)
- [Session Management](/zh/concepts/session)
