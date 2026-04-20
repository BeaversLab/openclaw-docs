---
summary: "每个代理的沙箱 + 工具限制、优先级和示例"
title: 多代理沙箱与工具
read_when: "您希望在多代理网关中配置每个代理的沙箱或每个代理的工具允许/拒绝策略。"
status: active
---

# 多代理沙箱与工具配置

## 概述

现在，多代理设置中的每个代理都可以拥有自己的：

- **沙箱配置** (`agents.list[].sandbox` 覆盖 `agents.defaults.sandbox`)
- **工具限制** (`tools.allow` / `tools.deny`，加上 `agents.list[].tools`)

这允许您运行具有不同安全配置文件的多个代理：

- 具有完全访问权限的个人助理
- 具有受限工具的家庭/工作代理
- 沙箱中的面向公众的代理

`setupCommand` 属于 `sandbox.docker` (全局或每个代理) 之下，并在创建容器时运行一次。

认证是针对每个代理的：每个代理从其自己的 `agentDir` 认证存储读取，位置位于：

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

凭据**不**在代理之间共享。切勿在代理之间重复使用 `agentDir`。
如果您想共享凭据，请将 `auth-profiles.json` 复制到其他代理的 `agentDir` 中。

有关沙箱隔离在运行时的行为方式，请参阅 [沙箱隔离](/zh/gateway/sandboxing)。
有关调试“为什么会被阻止？”，请参阅 [沙箱 vs 工具策略 vs 提升权限](/zh/gateway/sandbox-vs-tool-policy-vs-elevated) 和 `openclaw sandbox explain`。

---

## 配置示例

### 示例 1：个人 + 受限的家庭代理

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

- `main` 代理：在主机上运行，拥有完全的工具访问权限
- `family` 代理：在 Docker 中运行（每个代理一个容器），仅限 `read` 工具

---

### 示例 2：具有共享沙箱的工作代理

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

### 示例 2b：全局编码配置文件 + 仅消息传递代理

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

- 默认代理获取编码工具
- `support` 代理仅用于消息传递（+ Slack 工具）

---

### 示例 3：每个代理不同的沙箱模式

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

## 配置优先级

当同时存在全局 (`agents.defaults.*`) 和特定于代理的 (`agents.list[].*`) 配置时：

### 沙箱配置

特定于代理的设置会覆盖全局设置：

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

- `agents.list[].sandbox.{docker,browser,prune}.*` 会覆盖该代理的 `agents.defaults.sandbox.{docker,browser,prune}.*`（当沙箱范围解析为 `"shared"` 时忽略）。

### 工具限制

过滤顺序为：

1. **工具配置文件** (`tools.profile` 或 `agents.list[].tools.profile`)
2. **提供商工具配置文件** (`tools.byProvider[provider].profile` 或 `agents.list[].tools.byProvider[provider].profile`)
3. **全局工具策略** (`tools.allow` / `tools.deny`)
4. **提供商工具策略** (`tools.byProvider[provider].allow/deny`)
5. **特定于代理的工具策略** (`agents.list[].tools.allow/deny`)
6. **代理提供商策略** (`agents.list[].tools.byProvider[provider].allow/deny`)
7. **沙箱工具策略** (`tools.sandbox.tools` 或 `agents.list[].tools.sandbox.tools`)
8. **子代理工具策略** (`tools.subagents.tools`，如果适用)

每一层级都可以进一步限制工具，但不能恢复先前层级中被拒绝的工具。
如果设置了 `agents.list[].tools.sandbox.tools`，它将替换该代理的 `tools.sandbox.tools`。
如果设置了 `agents.list[].tools.profile`，它将覆盖该代理的 `tools.profile`。
提供商工具键接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.2`）。

### 工具组（简写）

工具策略（全局、代理、沙箱）支持 `group:*` 条目，这些条目可扩展为多个具体的工具：

- `group:runtime`：`exec`、`bash`、`process`
- `group:fs`：`read`、`write`、`edit`、`apply_patch`
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`
- `group:memory`：`memory_search`、`memory_get`
- `group:ui`：`browser`、`canvas`
- `group:automation`：`cron`、`gateway`
- `group:messaging`：`message`
- `group:nodes`：`nodes`
- `group:openclaw`：所有内置的 OpenClaw 工具（不包括提供商插件）

### 提升模式

`tools.elevated` 是全局基线（基于发件人的允许列表）。`agents.list[].tools.elevated` 可以针对特定代理进一步限制提升模式（两者都必须允许）。

缓解模式：

- 拒绝不受信任代理的 `exec`（`agents.list[].tools.deny: ["exec"]`）
- 避免将路由到受限代理的发件人加入允许列表
- 如果您只希望进行沙箱隔离执行，请全局禁用 elevated (`tools.elevated.enabled: false`)
- 针对敏感配置文件，请为每个代理禁用 elevated (`agents.list[].tools.elevated.enabled: false`)

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

旧的 `agent.*` 配置将由 `openclaw doctor` 迁移；今后建议使用 `agents.defaults` + `agents.list`。

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
    "allow": ["sessions_list", "sessions_send", "sessions_history", "session_status"],
    "deny": ["exec", "write", "edit", "apply_patch", "read", "browser"]
  }
}
```

---

## 常见误区："non-main"

`agents.defaults.sandbox.mode: "non-main"` 基于 `session.mainKey`（默认为 `"main"`），
而非代理 id。群组/渠道会话总是拥有自己的密钥，因此
它们被视为非主代理并将处于沙箱隔离中。如果您希望代理永不
进行沙箱隔离，请设置 `agents.list[].sandbox.mode: "off"`。

---

## 测试

配置多代理沙箱和工具后：

1. **检查代理解析：**

   ```bash
   openclaw agents list --bindings
   ```

2. **验证沙箱容器：**

   ```bash
   docker ps --filter "name=openclaw-sbx-"
   ```

3. **测试工具限制：**
   - 发送一条需要受限工具的消息
   - 验证代理无法使用被拒绝的工具

4. **监控日志：**
   ```bash
   tail -f "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/logs/gateway.log" | grep -E "routing|sandbox|tools"
   ```

---

## 故障排除

### 尽管有 `mode: "all"`，代理仍未沙箱隔离

- 检查是否存在覆盖它的全局 `agents.defaults.sandbox.mode`
- 代理特定配置优先级更高，因此请设置 `agents.list[].sandbox.mode: "all"`

### 尽管存在拒绝列表，工具仍然可用

- 检查工具过滤顺序：全局 → 代理 → 沙箱 → 子代理
- 每一层级只能进一步限制，不能恢复权限
- 通过日志验证：`[tools] filtering tools for agent:${agentId}`

### 容器未按代理隔离

- 在代理特定的沙箱配置中设置 `scope: "agent"`
- 默认值是 `"session"`，它会为每个会话创建一个容器

---

## 另请参阅

- [多代理路由](/zh/concepts/multi-agent)
- [沙箱配置](/zh/gateway/configuration#agentsdefaults-sandbox)
- [会话管理](/zh/concepts/session)
