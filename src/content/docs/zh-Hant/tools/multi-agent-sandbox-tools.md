---
summary: 「各代理程式沙箱 + 工具限制、優先順序與範例」
title: 多代理程式沙箱與工具
read_when: 「您希望在多代理程式閘道中設定各代理程式的沙箱，或是各代理程式的工具允許/拒絕策略。」
status: active
---

# 多代理程式沙箱與工具設定

在多代理程式設定中，每個代理程式都可以覆寫全域沙箱和工具政策。本頁涵蓋各代理程式的設定、優先順序規則與範例。

- **Sandbox 後端與模式**：請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing)。
- **偵錯遭封鎖的工具**：請參閱 [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) 與 `openclaw sandbox explain`。
- **提權執行**：請參閱 [Elevated Mode](/zh-Hant/tools/elevated)。

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

每個層級都可以進一步限制工具，但無法恢復先前層級中被拒絕的工具。
如果設定了 `agents.list[].tools.sandbox.tools`，它將取代該代理程式的 `tools.sandbox.tools`。
如果設定了 `agents.list[].tools.profile`，它將覆寫該代理程式的 `tools.profile`。
提供者工具金鑰接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.4`）。

工具原則支援 `group:*` 簡寫，這些簡寫會展開為多個工具。完整列表請參閱 [Tool groups](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated#tool-groups-shorthands)。

各代理程式的提權覆寫（`agents.list[].tools.elevated`）可以進一步限制特定代理程式的提權執行。詳細資訊請參閱 [Elevated Mode](/zh-Hant/tools/elevated)。

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

此設定檔中的 `sessions_history` 仍然會傳回有邊界、經過清理的召回
檢視，而不是原始的記錄傾印。助理召回會移除思考標籤、
`<relevant-memories>` 鷹架、純文字工具呼叫 XML 載荷
（包括 `<tool_call>...</tool_call>`、
`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、
`<function_calls>...</function_calls>` 以及被截斷的工具呼叫區塊）、
降級的工具呼叫鷹架、外洩的 ASCII/全形模型控制
權杖，以及在編輯/截斷前的格式錯誤 MiniMax 工具呼叫 XML。

---

## 常見陷阱："non-main"

`agents.defaults.sandbox.mode: "non-main"` 是基於 `session.mainKey`（預設為 `"main"`），
而非代理程式 ID。群組/頻道工作階段總是會獲得自己的金鑰，因此
它們被視為非主要，並將會被沙箱化。如果您希望代理程式永不
進行沙箱化，請設定 `agents.list[].sandbox.mode: "off"`。

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
   - 傳送一條需要受限工具的訊息
   - 驗證代理無法使用被拒絕的工具

4. **監控日誌：**

   ```exec
   tail -f "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/logs/gateway.log" | grep -E "routing|sandbox|tools"
   ```

---

## 故障排除

### 儘管有 `mode: "all"`，代理仍未被放入沙盒

- 檢查是否有全域 `agents.defaults.sandbox.mode` 覆蓋了它
- 代理專用設定優先順序較高，因此請設定 `agents.list[].sandbox.mode: "all"`

### 儘管有拒絕清單，工具仍可使用

- 檢查工具篩選順序：全域 → 代理 → 沙盒 → 子代理
- 每個層級只能進一步限制，不能重新授權
- 使用日誌驗證：`[tools] filtering tools for agent:${agentId}`

### 容器未按代理隔離

- 在代理專用沙盒設定中設定 `scope: "agent"`
- 預設值是 `"session"`，它會為每個階段建立一個容器

---

## 另請參閱

- [沙盒機制](/zh-Hant/gateway/sandboxing) -- 完整的沙盒參考（模式、範圍、後端、映像檔）
- [沙盒 vs. 工具政策 vs. 提昇權限](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) -- 偵錯「為什麼這個被阻擋？」
- [提昇權限模式](/zh-Hant/tools/elevated)
- [多代理路由](/zh-Hant/concepts/multi-agent)
- [沙盒設定](/zh-Hant/gateway/configuration-reference#agentsdefaultssandbox)
- [階段管理](/zh-Hant/concepts/session)
