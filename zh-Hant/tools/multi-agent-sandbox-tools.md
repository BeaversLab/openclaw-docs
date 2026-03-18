---
summary: "Per-agent sandbox + tool restrictions, precedence, and examples"
title: Multi-Agent 沙盒與工具
read_when: "You want per-agent sandboxing or per-agent tool allow/deny policies in a multi-agent gateway."
status: active
---

# Multi-Agent 沙盒與工具設定

## 概覽

在 Multi-Agent 設定中，每個代理程式現在都可以擁有自己的：

- **沙盒設定** (`agents.list[].sandbox` 會覆寫 `agents.defaults.sandbox`)
- **工具限制** (`tools.allow` / `tools.deny`，加上 `agents.list[].tools`)

這讓您可以執行具有不同安全設定檔的多個代理程式：

- 具有完整存取權限的個人助理
- 具有受限制工具的家庭/工作代理程式
- 沙盒中的公開代理程式

`setupCommand` 屬於 `sandbox.docker` (全域或每個代理程式) 的一部分，並在
建立容器時執行一次。

驗證是針對每個代理程式的：每個代理程式都從自己的 `agentDir` 驗證儲存空間讀取：

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

憑證在代理程式之間**不**會共用。切勿跨代理程式重複使用 `agentDir`。
如果您想共用憑證，請將 `auth-profiles.json` 複製到另一個代理程式的 `agentDir` 中。

如需沙盒在執行時期的運作方式，請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing)。
若要除錯「為什麼這會被封鎖？」，請參閱 [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) 和 `openclaw sandbox explain`。

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

- `main` agent：在主機上執行，具有完整的工具存取權
- `family` agent：在 Docker 中執行 (每個代理程式一個容器)，僅限 `read` 工具

---

### 範例 2：具有共用沙盒的工作代理程式

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

- 預設代理程式會取得編碼工具
- `support` agent 僅限訊息傳遞 (+ Slack 工具)

---

### 範例 3：每個代理程式不同的沙盒模式

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

當同時存在全域（`agents.defaults.*`）和代理程式特定（`agents.list[].*`）設定時：

### 沙盒設定

代理程式特定設定會覆蓋全域設定：

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

- `agents.list[].sandbox.{docker,browser,prune}.*` 會覆蓋該代理程式的 `agents.defaults.sandbox.{docker,browser,prune}.*`（當沙盒範圍解析為 `"shared"` 時則忽略）。

### 工具限制

篩選順序為：

1. **工具設定檔**（`tools.profile` 或 `agents.list[].tools.profile`）
2. **提供者工具設定檔**（`tools.byProvider[provider].profile` 或 `agents.list[].tools.byProvider[provider].profile`）
3. **全域工具原則**（`tools.allow` / `tools.deny`）
4. **提供者工具原則**（`tools.byProvider[provider].allow/deny`）
5. **代理程式特定工具原則**（`agents.list[].tools.allow/deny`）
6. **代理程式提供者原則**（`agents.list[].tools.byProvider[provider].allow/deny`）
7. **沙盒工具原則**（`tools.sandbox.tools` 或 `agents.list[].tools.sandbox.tools`）
8. **子代理程式工具原則**（`tools.subagents.tools`，如適用）

每個層級都可以進一步限制工具，但不能恢復先前層級已拒絕的工具。
如果設定了 `agents.list[].tools.sandbox.tools`，它會取代該代理程式的 `tools.sandbox.tools`。
如果設定了 `agents.list[].tools.profile`，它會覆蓋該代理程式的 `tools.profile`。
提供者工具金鑰接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.2`）。

### 工具群組（簡寫）

工具原則（全域、代理程式、沙盒）支援可展開為多個具體工具的 `group:*` 項目：

- `group:runtime`：`exec`、`bash`、`process`
- `group:fs`：`read`、`write`、`edit`、`apply_patch`
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`
- `group:memory`: `memory_search`, `memory_get`
- `group:ui`: `browser`, `canvas`
- `group:automation`: `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:openclaw`: 所有內建的 OpenClaw 工具（不包括供應商插件）

### 提昇模式

`tools.elevated` 是全域基線（基於發送者的白名單）。 `agents.list[].tools.elevated` 可以進一步針對特定代理程式限制提昇權限（兩者都必須允許）。

緩解模式：

- 拒絕不受信任的代理程式使用 `exec` (`agents.list[].tools.deny: ["exec"]`)
- 避免將路由到受限制代理程式的發送者加入白名單
- 如果您只想要沙箱執行，請全域停用提昇模式 (`tools.elevated.enabled: false`)
- 針對敏感性設定檔，請停用特定代理程式的提昇模式 (`agents.list[].tools.elevated.enabled: false`)

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

## 常見陷阱："non-main"

`agents.defaults.sandbox.mode: "non-main"` 是基於 `session.mainKey`（預設為 `"main"`），
而非代理程式 ID。群組/頻道會話總是會獲得自己的金鑰，因此
它們會被視為 non-main 並將被置於沙箱中。如果您希望代理程式永遠
不要置於沙箱中，請設定 `agents.list[].sandbox.mode: "off"`。

---

## 測試

設定多代理程式沙箱和工具後：

1. **檢查代理程式解析：**

   ```exec
   openclaw agents list --bindings
   ```

2. **驗證沙箱容器：**

   ```exec
   docker ps --filter "name=openclaw-sbx-"
   ```

3. **測試工具限制：**
   - 發送一條需要受限工具的訊息
   - 驗證代理程式無法使用被拒絕的工具

4. **監控日誌：**

   ```exec
   tail -f "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/logs/gateway.log" | grep -E "routing|sandbox|tools"
   ```

---

## 疑難排解

### 儘管有 `mode: "all"`，代理程式仍未置於沙箱中

- 檢查是否有全域 `agents.defaults.sandbox.mode` 覆蓋了它
- Agent 特定的設定優先，因此設定 `agents.list[].sandbox.mode: "all"`

### 工具在拒絕清單中仍然可用

- 檢查工具過濾順序：全域 → agent → sandbox → 子 agent
- 每個層級只能進一步限制，不能恢復權限
- 使用日誌驗證：`[tools] filtering tools for agent:${agentId}`

### 容器未針對每個 agent 隔離

- 在 agent 特定的 sandbox 設定中設定 `scope: "agent"`
- 預設值為 `"session"`，這會為每個工作階段建立一個容器

---

## 參見

- [Multi-Agent 路由](/zh-Hant/concepts/multi-agent)
- [Sandbox 設定](/zh-Hant/gateway/configuration#agentsdefaults-sandbox)
- [工作階段管理](/zh-Hant/concepts/session)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
