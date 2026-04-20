---
summary: "Per-agent sandbox + tool restrictions, precedence, and examples"
title: Multi-Agent Sandbox & Tools
read_when: "You want per-agent sandboxing or per-agent tool allow/deny policies in a multi-agent gateway."
status: active
---

# Multi-Agent Sandbox & Tools Configuration

## Overview

Each agent in a multi-agent setup can now have its own:

- **Sandbox configuration** (`agents.list[].sandbox` overrides `agents.defaults.sandbox`)
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

For how sandboxing behaves at runtime, see [Sandboxing](/zh-Hant/gateway/sandboxing).
For debugging “why is this blocked?”, see [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) and `openclaw sandbox explain`.

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

- `main` agent: Runs on host, full tool access
- `family` agent: Runs in Docker (one container per agent), only `read` tool

---

### Example 2: Work Agent with Shared Sandbox

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
- `support` agent is messaging-only (+ Slack tool)

---

### Example 3: Different Sandbox Modes per Agent

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

當同時存在全域 (`agents.defaults.*`) 和特定代理程式 (`agents.list[].*`) 設定時：

### 沙箱設定

特定代理程式的設定會覆寫全域設定：

```
agents.list[].sandbox.mode > agents.defaults.sandbox.mode
agents.list[].sandbox.scope > agents.defaults.sandbox.scope
agents.list[].sandbox.workspaceRoot > agents.defaults.sandbox.workspaceRoot
agents.list[].sandbox.workspaceAccess > agents.defaults.sandbox.workspaceAccess
agents.list[].sandbox.docker.* > agents.defaults.sandbox.docker.*
agents.list[].sandbox.browser.* > agents.defaults.sandbox.browser.*
agents.list[].sandbox.prune.* > agents.defaults.sandbox.prune.*
```

**備註：**

- `agents.list[].sandbox.{docker,browser,prune}.*` 會針對該代理程式覆寫 `agents.defaults.sandbox.{docker,browser,prune}.*`（當沙箱範圍解析為 `"shared"` 時會被忽略）。

### 工具限制

篩選順序如下：

1. **工具設定檔** (`tools.profile` 或 `agents.list[].tools.profile`)
2. **提供者工具設定檔** (`tools.byProvider[provider].profile` 或 `agents.list[].tools.byProvider[provider].profile`)
3. **全域工具原則** (`tools.allow` / `tools.deny`)
4. **提供者工具原則** (`tools.byProvider[provider].allow/deny`)
5. **特定代理程式工具原則** (`agents.list[].tools.allow/deny`)
6. **代理程式提供者原則** (`agents.list[].tools.byProvider[provider].allow/deny`)
7. **沙箱工具原則** (`tools.sandbox.tools` 或 `agents.list[].tools.sandbox.tools`)
8. **子代理程式工具原則** (`tools.subagents.tools`，如適用)

每個層級都可以進一步限制工具，但不能恢復先前層級中被拒絕的工具。
如果設定了 `agents.list[].tools.sandbox.tools`，它會取代該代理程式的 `tools.sandbox.tools`。
如果設定了 `agents.list[].tools.profile`，它會覆寫該代理程式的 `tools.profile`。
提供者工具金鑰接受 `provider` (例如 `google-antigravity`) 或 `provider/model` (例如 `openai/gpt-5.2`)。

### 工具群組（簡寫）

工具原則（全域、代理程式、沙箱）支援展開為多個具體工具的 `group:*` 項目：

- `group:runtime`: `exec`、`bash`、`process`
- `group:fs`: `read`、`write`、`edit`、`apply_patch`
- `group:sessions`: `sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`
- `group:memory`: `memory_search`, `memory_get`
- `group:ui`: `browser`, `canvas`
- `group:automation`: `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:openclaw`: 所有內建的 OpenClaw 工具（不包含提供者外掛）

### 提升模式

`tools.elevated` 是全域基準（基於發送者的允許清單）。`agents.list[].tools.elevated` 可以進一步針對特定代理程式限制提升權限（兩者都必須允許）。

緩解模式：

- 拒絕不受信任代理程式的 `exec` (`agents.list[].tools.deny: ["exec"]`)
- 避免將路由至受限制代理程式的發送者加入允許清單
- 如果您只需要沙箱執行，請全域停用提升權限 (`tools.elevated.enabled: false`)
- 針對敏感設定檔，停用特定代理程式的提升權限 (`agents.list[].tools.elevated.enabled: false`)

---

## 從單一代理程式遷移

**之前（單一代理程式）：**

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

**之後（具有不同設定檔的多代理程式）：**

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

舊版 `agent.*` 設定由 `openclaw doctor` 遷移；今後建議使用 `agents.defaults` + `agents.list`。

---

## 工具限制範例

### 唯讀代理程式

```json
{
  "tools": {
    "allow": ["read"],
    "deny": ["exec", "write", "edit", "apply_patch", "process"]
  }
}
```

### 安全執行代理程式（無檔案修改）

```json
{
  "tools": {
    "allow": ["read", "exec", "process"],
    "deny": ["write", "edit", "apply_patch", "browser", "gateway"]
  }
}
```

### 僅通訊代理程式

```json
{
  "tools": {
    "allow": ["sessions_list", "sessions_send", "sessions_history", "session_status"],
    "deny": ["exec", "write", "edit", "apply_patch", "read", "browser"]
  }
}
```

---

## 常見陷阱：「非主要」

`agents.defaults.sandbox.mode: "non-main"` 基於 `session.mainKey` (預設為 `"main"`)，
而非代理程式 ID。群組/頻道工作階段總是會獲得自己的金鑰，因此
它們會被視為非主要並且會被沙箱化。如果您希望代理程式永遠
不進行沙箱化，請設定 `agents.list[].sandbox.mode: "off"`。

---

## 測試

設定多代理程式沙箱和工具後：

1. **檢查代理程式解析：**

   ```bash
   openclaw agents list --bindings
   ```

2. **驗證沙箱容器：**

   ```bash
   docker ps --filter "name=openclaw-sbx-"
   ```

3. **測試工具限制：**
   - 傳送一則需要受限工具的訊息
   - 驗證代理程式無法使用被拒絕的工具

4. **監控日誌：**
   ```bash
   tail -f "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/logs/gateway.log" | grep -E "routing|sandbox|tools"
   ```

---

## 故障排除

### 儘管設定了 `mode: "all"`，代理程式仍未被沙箱化

- 檢查是否有覆蓋它的全域 `agents.defaults.sandbox.mode`
- 代理程式專用設定優先，因此請設定 `agents.list[].sandbox.mode: "all"`

### 儘管有拒絕清單，工具仍然可用

- 檢查工具篩選順序：全域 → 代理程式 → 沙盒 → 子代理程式
- 每個層級只能進一步限制，無法恢復權限
- 透過日誌驗證：`[tools] filtering tools for agent:${agentId}`

### 容器未按代理程式隔離

- 在代理程式專用沙盒設定中設定 `scope: "agent"`
- 預設值是 `"session"`，這會為每個會話建立一個容器

---

## 參見

- [多代理程式路由](/zh-Hant/concepts/multi-agent)
- [沙盒設定](/zh-Hant/gateway/configuration#agentsdefaults-sandbox)
- [會話管理](/zh-Hant/concepts/session)
