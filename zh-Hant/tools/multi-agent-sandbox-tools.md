---
summary: 「Per-agent sandbox + tool restrictions, precedence, and examples」
title: Multi-Agent Sandbox & Tools
read_when: 「You want per-agent sandboxing or per-agent tool allow/deny policies in a multi-agent gateway.」
status: active
---

# Multi-Agent Sandbox & Tools Configuration

在多代理設定中，每個代理都可以覆寫全域沙箱和工具原則。本頁面涵蓋了每個代理的設定、優先順序規則和範例。

- **Sandbox backends and modes**：請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing)。
- **Debugging blocked tools**：請參閱 [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) 和 `openclaw sandbox explain`。
- **Elevated exec**：請參閱 [Elevated Mode](/zh-Hant/tools/elevated)。

驗證是針對每個代理獨立的：每個代理會從其位於 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 的自己的 `agentDir` 驗證儲存區讀取。
憑證在代理之間**不**共享。切勿在代理之間重複使用 `agentDir`。
如果您想共享憑證，請將 `auth-profiles.json` 複製到另一個代理的 `agentDir` 中。

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

**結果：**

- `main` 代理：在主機上執行，擁有完整工具存取權
- `family` 代理：在 Docker 中執行（每個代理一個容器），僅限 `read` 工具

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

**結果：**

- 預設代理獲得編碼工具
- `support` 代理僅限傳訊（+ Slack 工具）

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

當同時存在全域 (`agents.defaults.*`) 和代理特定 (`agents.list[].*`) 設定時：

### Sandbox Config

代理特定設定會覆寫全域設定：

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

- `agents.list[].sandbox.{docker,browser,prune}.*` 會覆寫該代理的 `agents.defaults.sandbox.{docker,browser,prune}.*`（當沙箱範圍解析為 `"shared"` 時會被忽略）。

### Tool Restrictions

篩選順序為：

1. **工具設定檔** (`tools.profile` 或 `agents.list[].tools.profile`)
2. **提供者工具設定檔** (`tools.byProvider[provider].profile` 或 `agents.list[].tools.byProvider[provider].profile`)
3. **全域工具政策** (`tools.allow` / `tools.deny`)
4. **提供者工具政策** (`tools.byProvider[provider].allow/deny`)
5. **代理程式特定工具政策** (`agents.list[].tools.allow/deny`)
6. **代理程式提供者政策** (`agents.list[].tools.byProvider[provider].allow/deny`)
7. **沙箱工具政策** (`tools.sandbox.tools` 或 `agents.list[].tools.sandbox.tools`)
8. **子代理程式工具政策** (`tools.subagents.tools`，如適用)

每個層級都可以進一步限制工具，但不能恢復前一層級已拒絕的工具。
如果設定了 `agents.list[].tools.sandbox.tools`，它會取代該代理程式的 `tools.sandbox.tools`。
如果設定了 `agents.list[].tools.profile`，它會覆寫該代理程式的 `tools.profile`。
提供者工具金鑰接受 `provider` (例如 `google-antigravity`) 或 `provider/model` (例如 `openai/gpt-5.2`)。

工具政策支援 `group:*` 簡寫，這些簡寫會展開為多個工具。完整清單請參閱 [工具群組](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated#tool-groups-shorthands)。

各代理程式的提權覆寫 (`agents.list[].tools.elevated`) 可以進一步限制特定代理程式的提權執行。詳情請參閱 [提權模式](/zh-Hant/tools/elevated)。

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

舊版 `agent.*` 設定會由 `openclaw doctor` 遷移；建議今後使用 `agents.defaults` + `agents.list`。

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

### 純通訊代理程式

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

## 常見陷阱："non-main"

`agents.defaults.sandbox.mode: "non-main"` 是基於 `session.mainKey` (預設為 `"main"`)，
而非代理程式 ID。群組/頻道會話總是會獲得自己的金鑰，因此它們
會被視為 non-main 並將會被沙箱化。如果您希望代理程式永不
使用沙箱，請設定 `agents.list[].sandbox.mode: "off"`。

---

## 測試

設定多代理程式沙箱與工具後：

1. **檢查代理程式解析：**

   ```exec
   openclaw agents list --bindings
   ```

2. **驗證沙箱容器：**

   ```exec
   docker ps --filter "name=openclaw-sbx-"
   ```

3. **測試工具限制：**
   - 傳送一則需要受限制工具的訊息
   - 驗證代理程式無法使用被拒絕的工具

4. **監控日誌：**

   ```exec
   tail -f "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/logs/gateway.log" | grep -E "routing|sandbox|tools"
   ```

---

## 疑難排解

### 儘管設定了 `mode: "all"`，代理程式仍未被沙箱化

- 檢查是否有全域 `agents.defaults.sandbox.mode` 覆蓋了它
- 代理程式專屬設定優先，請設定 `agents.list[].sandbox.mode: "all"`

### 儘管有拒絕清單，工具仍可使用

- 檢查工具過濾順序：全域 → 代理程式 → 沙箱 → 子代理程式
- 每個層級只能進一步限制，不能重新授予
- 透過日誌驗證：`[tools] filtering tools for agent:${agentId}`

### 容器未按代理程式隔離

- 在代理程式專屬沙箱設定中設定 `scope: "agent"`
- 預設值為 `"session"`，這會為每個工作階段建立一個容器

---

## 另請參閱

- [沙箱機制](/zh-Hant/gateway/sandboxing) -- 完整的沙箱參考（模式、範圍、後端、映像檔）
- [沙箱 vs 工具原則 vs 提升權限](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) -- 除錯「為什麼這被阻擋了？」
- [提升權限模式](/zh-Hant/tools/elevated)
- [多代理程式路由](/zh-Hant/concepts/multi-agent)
- [沙箱設定](/zh-Hant/gateway/configuration-reference#agents-defaults-sandbox)
- [工作階段管理](/zh-Hant/concepts/session)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
