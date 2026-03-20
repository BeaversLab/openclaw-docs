---
summary: "每個代理沙箱 + 工具限制、優先順序與範例"
title: 多代理沙箱與工具
read_when: "您希望在多代理閘道中設定每個代理的沙箱或每個代理的工具允許/拒絕政策。"
status: active
---

# 多代理沙箱與工具設定

## 概覽

多代理設定中的每個代理現在都可以擁有：

- **沙箱設定**（`agents.list[].sandbox` 會覆蓋 `agents.defaults.sandbox`）
- **工具限制**（`tools.allow` / `tools.deny`，加上 `agents.list[].tools`）

這讓您可以執行具有不同安全設定檔的多個代理：

- 具有完整存取權限的個人助理
- 具有限制工具的家庭/工作代理
- 沙箱中的對外公開代理

`setupCommand` 屬於 `sandbox.docker` 的一部分（全域或每個代理），並且在建立容器時執行一次。

身分驗證是每個代理獨立的：每個代理從其自身的 `agentDir` 身分驗證儲存空間讀取：

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

憑證**不會**在代理之間共享。切勿跨代理重複使用 `agentDir`。
如果您想共享憑證，請將 `auth-profiles.json` 複製到另一個代理的 `agentDir` 中。

關於沙箱在執行時期的行為，請參閱 [沙箱機制](/zh-Hant/gateway/sandboxing)。
若要偵錯「為什麼這被封鎖？」，請參閱 [沙箱 vs 工具政策 vs 提升權限](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) 以及 `openclaw sandbox explain`。

---

## 設定範例

### 範例 1：個人 + 受限的家庭代理

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
- `family` 代理：在 Docker 中執行（每個代理一個容器），僅有 `read` 工具

---

### 範例 2：具有共享沙箱的工作代理

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

### 範例 2b：全域編碼設定檔 + 僅限訊息傳送的代理

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

- 預設代理會獲得編碼工具
- `support` 代理僅限訊息傳送（+ Slack 工具）

---

### 範例 3：每個代理的不同沙箱模式

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

當同時存在全域（`agents.defaults.*`）與代理特定（`agents.list[].*`）設定時：

### 沙箱設定

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

**備註：**

- `agents.list[].sandbox.{docker,browser,prune}.*` 會覆蓋該代理程式的 `agents.defaults.sandbox.{docker,browser,prune}.*`（當沙箱範圍解析為 `"shared"` 時會被忽略）。

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

每個層級都可以進一步限制工具，但不能恢復先前層級中被拒絕的工具。
如果設定了 `agents.list[].tools.sandbox.tools`，它會取代該代理程式的 `tools.sandbox.tools`。
如果設定了 `agents.list[].tools.profile`，它會覆蓋該代理程式的 `tools.profile`。
提供者工具金鑰接受 `provider` (例如 `google-antigravity`) 或 `provider/model` (例如 `openai/gpt-5.2`)。

### 工具群組 (簡寫)

工具原則 (全域、代理程式、沙箱) 支援可展開為多個具體工具的 `group:*` 項目：

- `group:runtime`：`exec`、`bash`、`process`
- `group:fs`：`read`、`write`、`edit`、`apply_patch`
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`
- `group:memory`：`memory_search`、`memory_get`
- `group:ui`：`browser`、`canvas`
- `group:automation`: `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:openclaw`: 所有內建 OpenClaw 工具（排除供應商插件）

### 提權模式

`tools.elevated` 是全域基準（基於傳送者的允許清單）。 `agents.list[].tools.elevated` 可以針對特定代理程式進一步限制提權（兩者都必須允許）。

緩解模式：

- 對於不受信任的代理程式（`agents.list[].tools.deny: ["exec"]`），拒絕 `exec`
- 避免將路由到受限制代理程式的傳送者加入允許清單
- 如果您只想要沙盒執行，請全域停用提權（`tools.elevated.enabled: false`）
- 針對敏感性設定檔，停用各代理程式的提權（`agents.list[].tools.elevated.enabled: false`）

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

舊版 `agent.*` 設定已由 `openclaw doctor` 遷移；今後建議使用 `agents.defaults` + `agents.list`。

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
    "sessions": { "visibility": "tree" },
    "allow": ["sessions_list", "sessions_send", "sessions_history", "session_status"],
    "deny": ["exec", "write", "edit", "apply_patch", "read", "browser"]
  }
}
```

---

## 常見陷阱：「non-main」

`agents.defaults.sandbox.mode: "non-main"` 是基於 `session.mainKey`（預設為 `"main"`），
而非代理程式 ID。群組/頻道階段作業總是會獲得自己的金鑰，因此
它們會被視為 non-main 並且將會被沙盒化。如果您希望代理程式永不
進行沙盒化，請設定 `agents.list[].sandbox.mode: "off"`。

---

## 測試

設定多代理程式沙盒和工具之後：

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

## 疑難排解

### 儘管設定了 `mode: "all"`，代理程式仍未被沙盒化

- 檢查是否有全域 `agents.defaults.sandbox.mode` 覆寫了它
- 代理程式特定設定具有優先權，因此請設定 `agents.list[].sandbox.mode: "all"`

### 儘管有拒絕清單，工具仍然可用

- 檢查工具篩選順序：global → agent → sandbox → subagent
- 每個層級只能進一步限制，無法恢復權限
- 使用日誌驗證：`[tools] filtering tools for agent:${agentId}`

### 容器未針對每個代理進行隔離

- 在代理特定的沙箱設定中設定 `scope: "agent"`
- 預設值為 `"session"`，這會為每個工作階段建立一個容器

---

## 另請參閱

- [多重代理路由](/zh-Hant/concepts/multi-agent)
- [沙箱設定](/zh-Hant/gateway/configuration#agentsdefaults-sandbox)
- [工作階段管理](/zh-Hant/concepts/session)

import en from "/components/footer/en.mdx";

<en />
