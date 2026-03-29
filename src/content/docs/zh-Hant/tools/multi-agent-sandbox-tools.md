---
summary: 「各代理程式沙箱 + 工具限制、優先順序與範例」
title: 多代理程式沙箱與工具
read_when: 「您希望在多代理程式閘道中設定各代理程式的沙箱，或是各代理程式的工具允許/拒絕策略。」
status: active
---

# 多代理程式沙箱與工具設定

在多代理程式設定中，每個代理程式都可以覆寫全域沙箱和工具政策。本頁涵蓋各代理程式的設定、優先順序規則與範例。

- **沙箱後端與模式**：請參閱 [沙箱隔離](/en/gateway/sandboxing)。
- **除錯被阻擋的工具**：請參閱 [沙箱 vs 工具政策 vs 提升權限](/en/gateway/sandbox-vs-tool-policy-vs-elevated) 與 `openclaw sandbox explain`。
- **提升權限執行**：請參閱 [提升權限模式](/en/tools/elevated)。

身分驗證是以代理程式為單位：每個代理程式會從其位於
`~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 的 `agentDir` 驗證儲存庫中讀取。
憑證**不會**在代理程式之間共享。切勿跨代理程式重複使用 `agentDir`。
如果您想共享憑證，請將 `auth-profiles.json` 複製到另一個代理程式的 `agentDir` 中。

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

- `main` 代理程式：在主機上執行，完整工具存取權
- `family` 代理程式：在 Docker 中執行（每個代理程式一個容器），僅限 `read` 工具

---

### 範例 2：具有共用沙箱的工作代理程式

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

### 範例 2b：全域編碼設定檔 + 僅限訊息傳遞的代理程式

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

- 預設代理程式取得編碼工具
- `support` 代理程式僅限訊息傳遞（+ Slack 工具）

---

### 範例 3：每個代理程式不同的沙箱模式

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

當同時存在全域 (`agents.defaults.*`) 和代理程式特定 (`agents.list[].*`) 設定時：

### 沙箱設定

代理程式特定設定會覆寫全域設定：

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

- `agents.list[].sandbox.{docker,browser,prune}.*` 會覆寫該代理程式的 `agents.defaults.sandbox.{docker,browser,prune}.*`（當沙箱範圍解析為 `"shared"` 時會被忽略）。

### 工具限制

篩選順序如下：

1. **工具設定檔** (`tools.profile` 或 `agents.list[].tools.profile`)
2. **提供者工具設定檔** (`tools.byProvider[provider].profile` 或 `agents.list[].tools.byProvider[provider].profile`)
3. **全域工具原則** (`tools.allow` / `tools.deny`)
4. **提供者工具原則** (`tools.byProvider[provider].allow/deny`)
5. **代理程式特定工具原則** (`agents.list[].tools.allow/deny`)
6. **代理程式提供者原則** (`agents.list[].tools.byProvider[provider].allow/deny`)
7. **沙箱工具原則** (`tools.sandbox.tools` 或 `agents.list[].tools.sandbox.tools`)
8. **子代理程式工具原則** (`tools.subagents.tools`，如適用)

每個層級都可以進一步限制工具，但無法恢復先前層級中已拒絕的工具。
如果設定了 `agents.list[].tools.sandbox.tools`，它將取代該代理程式的 `tools.sandbox.tools`。
如果設定了 `agents.list[].tools.profile`，它將覆寫該代理程式的 `tools.profile`。
提供者工具金鑰接受 `provider` (例如 `google-antigravity`) 或 `provider/model` (例如 `openai/gpt-5.2`)。

工具原則支援 `group:*` 簡寫，可擴展為多個工具。完整列表請參閱 [工具群組](/en/gateway/sandbox-vs-tool-policy-vs-elevated#tool-groups-shorthands)。

各代理程式的提升權限覆寫 (`agents.list[].tools.elevated`) 可以針對特定代理程式進一步限制提升權限執行。詳細資訊請參閱 [提升模式](/en/tools/elevated)。

---

## 從單一代理程式遷移

**之前 (單一代理程式)：**

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

**之後 (使用不同設定檔的多代理程式)：**

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

舊版 `agent.*` 設定會由 `openclaw doctor` 遷移；今後建議優先使用 `agents.defaults` + `agents.list`。

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

### 安全執行代理程式 (無檔案修改)

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
    "sessions": { "visibility": "tree" },
    "allow": ["sessions_list", "sessions_send", "sessions_history", "session_status"],
    "deny": ["exec", "write", "edit", "apply_patch", "read", "browser"]
  }
}
```

---

## 常見陷阱：「non-main」

`agents.defaults.sandbox.mode: "non-main"` 是基於 `session.mainKey` (預設為 `"main"`)，
而非代理程式 ID。群組/頻道工作階段總是會獲得自己的金鑰，因此
它們會被視為 non-main 並將受到沙箱限制。如果您希望代理程式永遠
不要使用沙箱，請設定 `agents.list[].sandbox.mode: "off"`。

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
   - 傳送需要受限工具的訊息
   - 驗證代理程式無法使用被拒絕的工具

4. **監控日誌：**

   ```bash
   tail -f "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/logs/gateway.log" | grep -E "routing|sandbox|tools"
   ```

---

## 疑難排解

### 代理程式未受沙箱保護，儘管有 `mode: "all"`

- 檢查是否有全域 `agents.defaults.sandbox.mode` 覆蓋了它
- 代理程式特定設定具有優先權，因此請設定 `agents.list[].sandbox.mode: "all"`

### 儘管有拒絕列表，工具仍然可用

- 檢查工具過濾順序：全域 → 代理程式 → 沙箱 → 子代理程式
- 每個層級只能進一步限制，無法恢復權限
- 使用日誌驗證：`[tools] filtering tools for agent:${agentId}`

### 容器未依代理程式隔離

- 在代理程式特定的沙箱設定中設定 `scope: "agent"`
- 預設值為 `"session"`，這會為每個階段建立一個容器

---

## 另請參閱

- [Sandboxing](/en/gateway/sandboxing) -- 完整的沙箱參考（模式、範圍、後端、映像檔）
- [Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated) -- 除錯「為什麼這被阻擋？」
- [Elevated Mode](/en/tools/elevated)
- [Multi-Agent Routing](/en/concepts/multi-agent)
- [Sandbox Configuration](/en/gateway/configuration-reference#agentsdefaultssandbox)
- [Session Management](/en/concepts/session)
