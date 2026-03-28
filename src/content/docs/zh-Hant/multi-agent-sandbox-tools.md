---
summary: "每個代理的沙箱 + 工具限制、優先順序和範例"
title: 多重代理沙箱與工具
read_when: "您想在多重代理閘道中設定每個代理的沙箱或每個代理的工具允許/拒絕原則。"
status: active
---

# 多重代理沙箱與工具組態

## 概觀

多重代理設定中的每個代理現在都可以擁有：

- **沙箱組態**（`agents.list[].sandbox` 會覆寫 `agents.defaults.sandbox`）
- **工具限制**（`tools.allow` / `tools.deny`，以及 `agents.list[].tools`）

這允許您以不同的安全設定檔執行多個代理：

- 具有完整存取權限的個人助理
- 具有受限制工具的家庭/工作代理
- 沙箱中的對外公開代理

`setupCommand` 屬於 `sandbox.docker`（全域或每個代理程式）的一部分，並在容器建立時執行一次。

驗證是每個代理程式獨立的：每個代理程式從其自己的 `agentDir` 驗證儲存區讀取，位於：

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

憑證**不**會在代理程式之間共享。切勿跨代理程式重複使用 `agentDir`。
如果您想共享憑證，請將 `auth-profiles.json` 複製到另一個代理程式的 `agentDir` 中。

關於沙盒機制在執行時期的行為，請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing)。
若要除錯「為什麼這被阻擋了？」，請參閱 [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) 和 `openclaw sandbox explain`。

---

## 設定範例

### 範例 1：個人 + 受限的家庭代理程式

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

**結果：**

- `main` 代理程式：在主機上執行，擁有完整工具存取權
- `family` agent: 在 Docker 中運行（每個代理一個容器），僅限 `read` 工具

---

### 範例 2：使用共用沙箱的工作代理

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

### 範例 2b：全域編寫設定檔 + 僅限傳訊的代理

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

**結果：**

- 預設代理會獲得編寫工具
- `support` 代理僅限傳訊（+ Slack 工具）

---

### 範例 3：每個代理不同的沙箱模式

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

## 設定優先順序

當同時存在全域（`agents.defaults.*`）和特定代理（`agents.list[].*`）設定時：

### 沙箱設定

特定代理的設定會覆寫全域設定：

```
agents.list[].sandbox.mode > agents.defaults.sandbox.mode
agents.list[].sandbox.scope > agents.defaults.sandbox.scope
agents.list[].sandbox.workspaceRoot > agents.defaults.sandbox.workspaceRoot
agents.list[].sandbox.workspaceAccess > agents.defaults.sandbox.workspaceAccess
agents.list[].sandbox.docker.* > agents.defaults.sandbox.docker.*
agents.list[].sandbox.browser.* > agents.defaults.sandbox.browser.*
agents.list[].sandbox.prune.* > agents.defaults.sandbox.prune.*
```

**註記：**

- `agents.list[].sandbox.{docker,browser,prune}.*` 會覆寫該代理的 `agents.defaults.sandbox.{docker,browser,prune}.*`（當沙箱範圍解析為 `"shared"` 時會被忽略）。

### 工具限制

篩選順序如下：

1. **工具設定檔** (`tools.profile` 或 `agents.list[].tools.profile`)
2. **供應商工具設定檔** (`tools.byProvider[provider].profile` 或 `agents.list[].tools.byProvider[provider].profile`)
3. **全域工具原則** (`tools.allow` / `tools.deny`)
4. **供應商工具原則** (`tools.byProvider[provider].allow/deny`)
5. **代理程式特定工具原則** (`agents.list[].tools.allow/deny`)
6. **代理程式供應商原則** (`agents.list[].tools.byProvider[provider].allow/deny`)
7. **沙箱工具原則** (`tools.sandbox.tools` 或 `agents.list[].tools.sandbox.tools`)
8. **子代理程式工具原則** (`tools.subagents.tools`，如果適用)

每個層級可以進一步限制工具，但無法恢復先前層級中被拒絕的工具。
如果設定了 `agents.list[].tools.sandbox.tools`，它將取代該代理程式的 `tools.sandbox.tools`。
如果設定了 `agents.list[].tools.profile`，它將覆蓋該代理程式的 `tools.profile`。
提供者工具金鑰接受 `provider` (例如 `google-antigravity`) 或 `provider/model` (例如 `openai/gpt-5.2`)。

### 工具群組 (簡寫)

工具原則 (全域、代理程式、沙箱) 支援可擴展為多個具體工具的 `group:*` 項目：

- `group:runtime`: `exec`, `bash`, `process`
- `group:fs`：`read`、`write`、`edit`、`apply_patch`
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`
- `group:memory`：`memory_search`、`memory_get`
- `group:ui`：`browser`、`canvas`
- `group:automation`：`cron`、`gateway`
- `group:messaging`：`message`
- `group:nodes`：`nodes`
- `group:openclaw`：所有內建 OpenClaw 工具（不包括提供者外掛程式）

### 提昇模式

`tools.elevated` 是全域基準（基於發送者的允許清單）。`agents.list[].tools.elevated` 可以進一步限制特定代理程式的提昇權限（兩者都必須允許）。

緩解模式：

- 拒絕不受信任代理程式（`agents.list[].tools.deny: ["exec"]`）的 `exec`
- 避免將路由到受限制代理程式的發送者加入允許清單
- 如果您只想要沙箱執行，請全域停用提昇模式（`tools.elevated.enabled: false`）
- 針對敏感設定檔，停用各個代理程式的提昇模式（`agents.list[].tools.elevated.enabled: false`）

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

舊版 `agent.*` 設定由 `openclaw doctor` 負責遷移；建議今後改用 `agents.defaults` + `agents.list`。

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

## 常見陷阱：「non-main」

`agents.defaults.sandbox.mode: "non-main"` 是基於 `session.mainKey`（預設 `"main"`），
而非代理程式 ID。群組/頻道階段總是會取得自己的金鑰，因此
會被視為 non-main 並受到沙盒限制。如果您希望代理程式永遠
不受沙盒限制，請設定 `agents.list[].sandbox.mode: "off"`。

---

## 測試

設定好多代理程式沙盒與工具後：

1. **檢查代理程式解析：**

   ```exec
   openclaw agents list --bindings
   ```

2. **驗證沙盒容器：**

   ```exec
   docker ps --filter "name=openclaw-sbx-"
   ```

3. **測試工具限制：**
   - 傳送一則需要受限工具的訊息
   - 驗證代理程式無法使用被拒絕的工具

4. **監控日誌：**
   ```exec
   tail -f "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/logs/gateway.log" | grep -E "routing|sandbox|tools"
   ```

---

## 故障排除

### 儘管設定了 `mode: "all"`，Agent 仍未置入沙盒

- 檢查是否有全域的 `agents.defaults.sandbox.mode` 覆蓋了它
- Agent 特定設定優先，請設定 `agents.list[].sandbox.mode: "all"`

### 儘管有拒絕清單，工具仍然可用

- 檢查工具篩選順序：全域 → Agent → 沙盒 → 子 Agent
- 每個層級只能進一步限制，不能重新授權
- 透過日誌驗證：`[tools] filtering tools for agent:${agentId}`

### Container 未依 Agent 隔離

- 在 Agent 特定的沙盒設定中設定 `scope: "agent"`
- 預設為 `"session"`，這會為每個 Session 建立一個 Container

---

## 參見

- [Multi-Agent Routing](/zh-Hant/concepts/multi-agent)
- [Sandbox Configuration](/zh-Hant/gateway/configuration#agentsdefaults-sandbox)
- [Session Management](/zh-Hant/concepts/session)
