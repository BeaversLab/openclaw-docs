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
認證範圍是以代理程式為單位：每個代理程式在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 都有自己的 `agentDir` 認證存儲。切勿在不同代理程式之間重複使用 `agentDir`。當代理程式沒有本機設定檔時，可以讀取預設/主要代理程式的認證設定檔，但 OAuth 重新整理權杖不會複製到次要代理程式的存儲中。如果您手動複製憑證，請僅複製可攜帶的靜態 `api_key` 或 `token` 設定檔。
</Warning>

---

## 設定範例

<AccordionGroup>
  <Accordion title="範例 1：個人 + 受限的家庭代理程式">
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
              "allow": ["read", "message"],
              "deny": ["exec", "write", "edit", "apply_patch", "process", "browser"],
              "message": {
                "crossContext": {
                  "allowWithinProvider": false,
                  "allowAcrossProviders": false
                }
              }
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

    - `main` 代理程式：在主機上執行，具有完整的工具存取權限。
    - `family` 代理程式：在 Docker 中執行（每個代理程式一個容器），僅能 `read` 和傳送目前對話的訊息。

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
  <Accordion title="優先順序規則">
    - 每個層級都可以進一步限制工具，但無法恢復之前層級中已拒絕的工具。
    - 如果設定了 `agents.list[].tools.sandbox.tools`，它將取代該代理程式的 `tools.sandbox.tools`。
    - 如果設定了 `agents.list[].tools.profile`，它將覆蓋該代理程式的 `tools.profile`。
    - 提供者工具金鑰接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.4`）。

  </Accordion>
  <Accordion title="空許可清單行為">
    如果該鏈結中的任何明確許可清單導致執行時沒有可呼叫的工具，OpenClaw 將在將提示提交給模型之前停止。這是故意的：配置了遺失工具 (例如 `agents.list[].tools.allow: ["query_db"]`) 的代理程式應該在註冊 `query_db` 的外掛程式啟用前明確失敗，而不是繼續作為純文字代理程式運作。
  </Accordion>
</AccordionGroup>

工具原則支援可擴展為多個工具的 `group:*` 簡寫。請參閱 [工具群組](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated#tool-groups-shorthands) 以取得完整清單。

個別代理程式的提升權限覆寫（`agents.list[].tools.elevated`）可以進一步限制特定代理程式的提升執行權限。詳情請參閱 [提升模式](/zh-Hant/tools/elevated)。

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
  <Tab title="停用檔案系統工具的 Shell 執行">
    ```json
    {
      "tools": {
        "allow": ["read", "exec", "process"],
        "deny": ["write", "edit", "apply_patch", "browser", "gateway"]
      }
    }
    ```

    <Warning>
    此原則會停用 OpenClaw 檔案系統工具，但 `exec` 仍然是 shell，可以在所選主機或沙箱檔案系統允許的任何位置寫入檔案。對於唯讀代理程式，請拒絕 `exec` 和 `process`，或者將 shell 存取與沙箱檔案系統控制項（例如 `agents.defaults.sandbox.workspaceAccess: "ro"` 或 `"none"`）結合使用。
    </Warning>

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

    此設定檔中的 `sessions_history` 仍然會返回有界且經過清理的回顧檢視，而不是原始的記錄傾印。Assistant 回顧會移除思考標籤、`<relevant-memories>` 腳手架、純文字工具呼叫 XML 載荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及被截斷的工具呼叫區塊）、降級的工具呼叫腳手架、洩漏的 ASCII/全形模型控制權杖，以及在編輯/截斷之前的格式錯誤的 MiniMax 工具呼叫 XML。

  </Tab>
</Tabs>

---

## 常見陷阱：「非主要」

<Warning>`agents.defaults.sandbox.mode: "non-main"` 是基於 `session.mainKey`（預設為 `"main"`），而不是代理程式 ID。群組/頻道階段總是會獲得它們自己的金鑰，因此它們被視為非主要，並將會被放入沙箱。如果您希望代理程式永遠不進入沙箱，請設定 `agents.list[].sandbox.mode: "off"`。</Warning>

---

## 測試

配置多代理程式沙箱和工具後：

<Steps>
  <Step title="檢查代理程式解析">
    ```bash
    openclaw agents list --bindings
    ```
  </Step>
  <Step title="驗證沙箱容器">
    ```bash
    docker ps --filter "name=openclaw-sbx-"
    ```
  </Step>
  <Step title="測試工具限制">
    - 傳送一條需要受限工具的訊息。
    - 驗證代理程式無法使用被拒絕的工具。

  </Step>
  <Step title="監控日誌">
    ```bash
    tail -f "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/logs/gateway.log" | grep -E "routing|sandbox|tools"
    ```
  </Step>
</Steps>

---

## 故障排除

<AccordionGroup>
  <Accordion title="儘管設定了 `mode: 'all'`，代理程式仍未進入沙箱">
    - 檢查是否存在覆蓋它的全域 `agents.defaults.sandbox.mode`。
    - 代理程式專用配置具有優先權，因此請設定 `agents.list[].sandbox.mode: "all"`。

  </Accordion>
  <Accordion title="儘管有拒絕清單，工具仍可用">
    - 檢查工具過濾順序：global → agent → sandbox → subagent。
    - 每個層級只能進一步限制，不能重新授予權限。
    - 透過日誌驗證：`[tools] filtering tools for agent:${agentId}`。

  </Accordion>
  <Accordion title="容器未按代理程式隔離">
    - 在代理程式專用的沙箱設定中設定 `scope: "agent"`。
    - 預設值為 `"session"`，這會為每個 session 建立一個容器。

  </Accordion>
</AccordionGroup>

---

## 相關

- [提權模式](/zh-Hant/tools/elevated)
- [多代理程式路由](/zh-Hant/concepts/multi-agent)
- [沙箱設定](/zh-Hant/gateway/config-agents#agentsdefaultssandbox)
- [沙箱與工具政策與提權的比較](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) — 偵錯「為什麼被阻擋？」
- [沙箱機制](/zh-Hant/gateway/sandboxing) — 完整的沙箱參考（模式、範圍、後端、映像檔）
- [Session 管理](/zh-Hant/concepts/session)
