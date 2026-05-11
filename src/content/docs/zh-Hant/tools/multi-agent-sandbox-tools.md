---
summary: "個別代理的沙箱 + 工具限制、優先順序及範例"
title: "多代理沙箱與工具"
sidebarTitle: "多代理沙箱與工具"
read_when: "您想要在多代理閘道中設定個別代理的沙箱或個別代理的工具允許/拒絕政策。"
status: active
---

在多代理設定中，每個代理都可以覆寫全域沙箱與工具政策。本頁涵蓋個別代理的設定、優先規則與範例。

<CardGroup cols={3}>
  <Card title="沙箱隔離" href="/zh-Hant/gateway/sandboxing">
    後端與模式 — 完整沙箱參考。
  </Card>
  <Card title="沙箱 vs 工具政策 vs 提升權限" href="/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated">
    偵錯「為什麼被阻擋？」
  </Card>
  <Card title="提升權限模式" href="/zh-Hant/tools/elevated">
    針對信任發送者的提升權限執行。
  </Card>
</CardGroup>

<Warning>
認證是依代理劃分：每個代理會從 `agentDir` 的 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 讀取自己的認證儲存。憑證**不**會在代理之間共享。切勿跨代理重複使用 `agentDir`。如果您想要共用憑證，請將 `auth-profiles.json` 複製到另一個代理的 `agentDir` 中。
</Warning>

---

## 設定範例

<AccordionGroup>
  <Accordion title="範例 1：個人 + 受限的家庭代理">
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

    - `main` 代理：在主機上執行，完整工具存取權。
    - `family` 代理：在 Docker 中執行（每個代理一個容器），僅限 `read` 工具。

  </Accordion>
  <Accordion title="範例 2：具有共用沙箱的工作代理">
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
  </Accordion>
  <Accordion title="範例 2b：全域編碼設定檔 + 僅訊息代理程式">
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

    - 預設代理程式取得編碼工具。
    - `support` 代理程式僅用於傳訊 (+ Slack 工具)。

  </Accordion>
  <Accordion title="範例 3：每個代理程式的不同沙箱模式">
    ```json
    {
      "agents": {
        "defaults": {
          "sandbox": {
            "mode": "non-main",
            "scope": "session"
          }
        },
        "list": [
          {
            "id": "main",
            "workspace": "~/.openclaw/workspace",
            "sandbox": {
              "mode": "off"
            }
          },
          {
            "id": "public",
            "workspace": "~/.openclaw/workspace-public",
            "sandbox": {
              "mode": "all",
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
  </Accordion>
</AccordionGroup>

---

## 設定優先順序

當全域 (`agents.defaults.*`) 與特定代理程式 (`agents.list[].*`) 設定同時存在時：

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

<Note>
`agents.list[].sandbox.{docker,browser,prune}.*` 會覆寫該代理程式的 `agents.defaults.sandbox.{docker,browser,prune}.*` (當沙箱範圍解析為 `"shared"` 時會被忽略)。
</Note>

### 工具限制

篩選順序如下：

<Steps>
  <Step title="工具設定檔">`tools.profile` 或 `agents.list[].tools.profile`。</Step>
  <Step title="提供者工具設定檔">`tools.byProvider[provider].profile` 或 `agents.list[].tools.byProvider[provider].profile`。</Step>
  <Step title="全域工具原則">`tools.allow` / `tools.deny`。</Step>
  <Step title="提供者工具原則">`tools.byProvider[provider].allow/deny`。</Step>
  <Step title="特定代理程式工具原則">`agents.list[].tools.allow/deny`。</Step>
  <Step title="代理程式提供者原則">`agents.list[].tools.byProvider[provider].allow/deny`。</Step>
  <Step title="沙箱工具原則">`tools.sandbox.tools` 或 `agents.list[].tools.sandbox.tools`。</Step>
  <Step title="子代理程式工具原則">`tools.subagents.tools`，若適用。</Step>
</Steps>

<AccordionGroup>
  <Accordion title="優先順序規則">- 每個層級都可以進一步限制工具，但無法恢復先前層級中被拒絕的工具。 - 如果設定了 `agents.list[].tools.sandbox.tools`，它將取代該代理程式的 `tools.sandbox.tools`。 - 如果設定了 `agents.list[].tools.profile`，它將覆寫該代理程式的 `tools.profile`。 - 提供者工具金鑰接受 `provider` (例如 `google-antigravity`) 或 `provider/model` (例如 `openai/gpt-5.4`)。</Accordion>
  <Accordion title="空許可清單行為">如果該鏈結中的任何明確許可清單導致執行時沒有可呼叫的工具，OpenClaw 將在將提示提交給模型之前停止。這是故意的：配置了遺失工具 (例如 `agents.list[].tools.allow: ["query_db"]`) 的代理程式應該在註冊 `query_db` 的外掛程式啟用前明確失敗，而不是繼續作為純文字代理程式運作。</Accordion>
</AccordionGroup>

工具政策支援擴展為多個工具的 `group:*` 簡寫。請參閱 [工具群組](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated#tool-groups-shorthands) 以取得完整清單。

各個代理程式的提權覆寫 (`agents.list[].tools.elevated`) 可以進一步限制特定代理程式的提權執行。詳情請參閱 [提權模式](/zh-Hant/tools/elevated)。

---

## 從單一代理程式遷移

<Tabs>
  <Tab title="之前 (單一代理程式)">
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
  </Tab>
  <Tab title="之後 (多代理程式)">
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
  </Tab>
</Tabs>

<Note>舊版 `agent.*` 設定會由 `openclaw doctor` 遷移；未來建議使用 `agents.defaults` + `agents.list`。</Note>

---

## 工具限制範例

<Tabs>
  <Tab title="唯讀代理程式">
    ```json
    {
      "tools": {
        "allow": ["read"],
        "deny": ["exec", "write", "edit", "apply_patch", "process"]
      }
    }
    ```
  </Tab>
  <Tab title="安全執行 (無檔案修改)">
    ```json
    {
      "tools": {
        "allow": ["read", "exec", "process"],
        "deny": ["write", "edit", "apply_patch", "browser", "gateway"]
      }
    }
    ```
  </Tab>
  <Tab title="Communication-only">
    ```json
    {
      "tools": {
        "sessions": { "visibility": "tree" },
        "allow": ["sessions_list", "sessions_send", "sessions_history", "session_status"],
        "deny": ["exec", "write", "edit", "apply_patch", "read", "browser"]
      }
    }
    ```

    在此設定檔中，`sessions_history` 仍然會傳回有界限且經過清理的召回檢視，而不是原始的文字記錄傾印。Assistant recall 會在編輯/截斷之前移除 thinking 標籤、`<relevant-memories>` scaffolding、純文字工具呼叫 XML 載荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和被截斷的工具呼叫區塊）、降級的工具呼叫 scaffolding、洩漏的 ASCII/全形模型控制權杖，以及格式錯誤的 MiniMax 工具呼叫 XML。

  </Tab>
</Tabs>

---

## 常見陷阱：「非主要」

<Warning>`agents.defaults.sandbox.mode: "non-main"` 是基於 `session.mainKey`（預設為 `"main"`），而不是 agent id。群組/頻道工作階段總是會獲得自己的金鑰，因此它們會被視為非主要並將會被沙箱化。如果您希望 agent 永不被沙箱化，請設定 `agents.list[].sandbox.mode: "off"`。</Warning>

---

## 測試

設定多代理沙箱和工具後：

<Steps>
  <Step title="Check agent resolution">
    ```bash
    openclaw agents list --bindings
    ```
  </Step>
  <Step title="Verify sandbox containers">
    ```bash
    docker ps --filter "name=openclaw-sbx-"
    ```
  </Step>
  <Step title="Test tool restrictions">
    - 傳送需要受限制工具的訊息。
    - 驗證 agent 無法使用被拒絕的工具。
  </Step>
  <Step title="Monitor logs">
    ```bash
    tail -f "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/logs/gateway.log" | grep -E "routing|sandbox|tools"
    ```
  </Step>
</Steps>

---

## 疑難排解

<AccordionGroup>
  <Accordion title="Agent not sandboxed despite `mode: 'all'`">- 檢查是否有全域 `agents.defaults.sandbox.mode` 覆寫了它。 - Agent 特定設定具有優先權，因此請設定 `agents.list[].sandbox.mode: "all"`。</Accordion>
  <Accordion title="Tools still available despite deny list">- 檢查工具篩選順序：global → agent → sandbox → subagent。 - 每個層級只能進一步限制，無法恢復權限。 - 使用日誌驗證：`[tools] filtering tools for agent:${agentId}`。</Accordion>
  <Accordion title="Container not isolated per agent">- 在特定代理的沙箱設定中設定 `scope: "agent"`。 - 預設值為 `"session"`，這會為每個工作階段建立一個容器。</Accordion>
</AccordionGroup>

---

## 相關

- [提權模式](/zh-Hant/tools/elevated)
- [多代理路由](/zh-Hant/concepts/multi-agent)
- [沙箱設定](/zh-Hant/gateway/config-agents#agentsdefaultssandbox)
- [沙箱 vs 工具策略 vs 提權](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) — 偵錯「為什麼被封鎖？」
- [沙箱機制](/zh-Hant/gateway/sandboxing) — 完整沙箱參考（模式、範圍、後端、映像檔）
- [工作階段管理](/zh-Hant/concepts/session)
