---
summary: "廣播 WhatsApp 訊息給多個代理"
read_when:
  - Configuring broadcast groups
  - Debugging multi-agent replies in WhatsApp
status: experimental
title: "廣播群組"
sidebarTitle: "廣播群組"
---

<Note>**Status：** 實驗性功能。新增於 2026.1.9。</Note>

## 概覽

廣播群組讓多個代理能夠同時處理並回應同一則訊息。這讓您可以建立專業的代理團隊，在單一 WhatsApp 群組或私訊中協作——全部使用同一個電話號碼。

目前範圍：**僅限 WhatsApp**（網頁頻道）。

廣播群組是在頻道允許清單和群組啟用規則之後進行評估。在 WhatsApp 群組中，這意味著廣播會在 OpenClaw 通常會回覆時發生（例如：在被提及時，視您的群組設定而定）。

## 使用案例

<AccordionGroup>
  <Accordion title="1. 專門的代理團隊">
    部署多個具有原子化、專注職責的代理：

    ```
    Group: "Development Team"
    Agents:
      - CodeReviewer (reviews code snippets)
      - DocumentationBot (generates docs)
      - SecurityAuditor (checks for vulnerabilities)
      - TestGenerator (suggests test cases)
    ```

    每個代理處理相同的訊息並提供其專業的觀點。

  </Accordion>
  <Accordion title="2. 多語言支援">
    ```
    Group: "International Support"
    Agents:
      - Agent_EN (responds in English)
      - Agent_DE (responds in German)
      - Agent_ES (responds in Spanish)
    ```
  </Accordion>
  <Accordion title="3. 品質保證工作流程">
    ```
    Group: "Customer Support"
    Agents:
      - SupportAgent (provides answer)
      - QAAgent (reviews quality, only responds if issues found)
    ```
  </Accordion>
  <Accordion title="4. 任務自動化">
    ```
    Group: "Project Management"
    Agents:
      - TaskTracker (updates task database)
      - TimeLogger (logs time spent)
      - ReportGenerator (creates summaries)
    ```
  </Accordion>
</AccordionGroup>

## 設定

### 基本設定

新增一個頂層 `broadcast` 區段（位於 `bindings` 旁邊）。鍵為 WhatsApp peer ID：

- 群組聊天：群組 JID (例如 `120363403215116621@g.us`)
- DM：E.164 電話號碼 (例如 `+15551234567`)

```json
{
  "broadcast": {
    "120363403215116621@g.us": ["alfred", "baerbel", "assistant3"]
  }
}
```

**結果：** 當 OpenClaw 應在此聊天中回覆時，它將會執行所有三個代理。

### 處理策略

控制代理如何處理訊息：

<Tabs>
  <Tab title="parallel (預設)">
    所有代理同時處理：

    ```json
    {
      "broadcast": {
        "strategy": "parallel",
        "120363403215116621@g.us": ["alfred", "baerbel"]
      }
    }
    ```

  </Tab>
  <Tab title="sequential">
    代理依序處理（一個等待前一個完成）：

    ```json
    {
      "broadcast": {
        "strategy": "sequential",
        "120363403215116621@g.us": ["alfred", "baerbel"]
      }
    }
    ```

  </Tab>
</Tabs>

### 完整範例

```json
{
  "agents": {
    "list": [
      {
        "id": "code-reviewer",
        "name": "Code Reviewer",
        "workspace": "/path/to/code-reviewer",
        "sandbox": { "mode": "all" }
      },
      {
        "id": "security-auditor",
        "name": "Security Auditor",
        "workspace": "/path/to/security-auditor",
        "sandbox": { "mode": "all" }
      },
      {
        "id": "docs-generator",
        "name": "Documentation Generator",
        "workspace": "/path/to/docs-generator",
        "sandbox": { "mode": "all" }
      }
    ]
  },
  "broadcast": {
    "strategy": "parallel",
    "120363403215116621@g.us": ["code-reviewer", "security-auditor", "docs-generator"],
    "120363424282127706@g.us": ["support-en", "support-de"],
    "+15555550123": ["assistant", "logger"]
  }
}
```

## 運作原理

### 訊息流程

<Steps>
  <Step title="收到傳入訊息">
    收到 WhatsApp 群組或 DM 訊息。
  </Step>
  <Step title="廣播檢查">
    系統檢查 peer ID 是否在 `broadcast` 中。
  </Step>
  <Step title="If in broadcast list">
    - 列表中的所有代理都會處理該訊息。
    - 每個代理都有自己的會話金鑰和獨立的上下文。
    - 代理可以並行處理（預設）或循序處理。

  </Step>
  <Step title="If not in broadcast list">
    適用一般路由規則（第一個匹配的綁定）。
  </Step>
</Steps>

<Note>廣播群組不會繞過頻道允許清單或群組啟用規則（提及/指令等）。它們僅在訊息符合處理資格時改變「執行哪些代理」。</Note>

### 會話隔離

廣播群組中的每個代理都維持完全獨立的：

- **會話金鑰** (`agent:alfred:whatsapp:group:120363...` vs `agent:baerbel:whatsapp:group:120363...`)
- **對話記錄**（代理看不到其他代理的訊息）
- **工作區**（如果已配置，則為獨立的沙盒）
- **工具存取權**（不同的允許/拒絕清單）
- **記憶體/上下文**（分別獨立的 IDENTITY.md, SOUL.md 等）
- **群組上下文緩衝區**（用於上下文的近期群組訊息）是按對等方共享的，因此所有廣播代理在觸發時都能看到相同的上下文

這允許每個代理擁有：

- 不同的個性
- 不同的工具存取權（例如，唯讀 vs. 讀寫）
- 不同的模型（例如，opus vs. sonnet）
- 安裝不同的技能

### 範例：隔離的會話

在群組 `120363403215116621@g.us` 中，包含代理 `["alfred", "baerbel"]`：

<Tabs>
  <Tab title="Alfred's context">``` Session: agent:alfred:whatsapp:group:120363403215116621@g.us History: [user message, alfred's previous responses] Workspace: /Users/user/openclaw-alfred/ Tools: read, write, exec ```</Tab>
  <Tab title="Bärbel's context">``` Session: agent:baerbel:whatsapp:group:120363403215116621@g.us History: [user message, baerbel's previous responses] Workspace: /Users/user/openclaw-baerbel/ Tools: read only ```</Tab>
</Tabs>

## 最佳實踐

<AccordionGroup>
  <Accordion title="1. Keep agents focused">
    設計每個代理時，賦予其單一且明確的職責：

    ```json
    {
      "broadcast": {
        "DEV_GROUP": ["formatter", "linter", "tester"]
      }
    }
    ```

    ✅ **良好：** 每個代理只有一項工作。❌ **不佳：** 一個通用的「dev-helper」代理。

  </Accordion>
  <Accordion title="2. Use descriptive names">
    讓每個代理的用途清晰明了：

    ```json
    {
      "agents": {
        "security-scanner": { "name": "Security Scanner" },
        "code-formatter": { "name": "Code Formatter" },
        "test-generator": { "name": "Test Generator" }
      }
    }
    ```

  </Accordion>
  <Accordion title="3. Configure different tool access">
    僅授予代理所需的工具：

    ```json
    {
      "agents": {
        "reviewer": {
          "tools": { "allow": ["read", "exec"] }
        },
        "fixer": {
          "tools": { "allow": ["read", "write", "edit", "exec"] }
        }
      }
    }
    ```

    `reviewer` 是唯讀的。`fixer` 可以讀寫。

  </Accordion>
  <Accordion title="4. Monitor performance">
    當有多個代理時，請考慮：

    - 使用 `"strategy": "parallel"`（預設）以提高速度
    - 將廣播群組限制在 5-10 個代理
    - 為較簡單的代理使用更快的模型

  </Accordion>
  <Accordion title="5. 優雅地處理失敗">
    代理程式獨立運作。一個代理程式的錯誤不會阻擋其他的：

    ```
    Message → [Agent A ✓, Agent B ✗ error, Agent C ✓]
    Result: Agent A and C respond, Agent B logs error
    ```

  </Accordion>
</AccordionGroup>

## 相容性

### 供應商

廣播群組目前適用於：

- ✅ WhatsApp (已實作)
- 🚧 Telegram (計畫中)
- 🚧 Discord (計畫中)
- 🚧 Slack (計畫中)

### 路由

廣播群組可與現有路由並存：

```json
{
  "bindings": [
    {
      "match": { "channel": "whatsapp", "peer": { "kind": "group", "id": "GROUP_A" } },
      "agentId": "alfred"
    }
  ],
  "broadcast": {
    "GROUP_B": ["agent1", "agent2"]
  }
}
```

- `GROUP_A`：只有 alfred 回應（正常路由）。
- `GROUP_B`：agent1 和 agent2 都會回應（廣播）。

<Note>**優先順序：** `broadcast` 優先於 `bindings`。</Note>

## 疑難排解

<AccordionGroup>
  <Accordion title="Agents not responding">
    **檢查：**

    1. Agent IDs 存在於 `agents.list` 中。
    2. Peer ID 格式正確（例如 `120363403215116621@g.us`）。
    3. 代理未被列入拒絕清單中。

    **除錯：**

    ```bash
    tail -f ~/.openclaw/logs/gateway.log | grep broadcast
    ```

  </Accordion>
  <Accordion title="Only one agent responding">
    **原因：** Peer ID 可能位於 `bindings` 中，但不在 `broadcast` 中。

    **解決方法：** 新增至廣播設定或從綁定中移除。

  </Accordion>
  <Accordion title="效能問題">
    如果有多個代理程式時速度變慢：

    - 減少每個群組的代理程式數量。
    - 使用輕量級模型 (用 sonnet 代替 opus)。
    - 檢查沙箱啟動時間。

  </Accordion>
</AccordionGroup>

## 範例

<AccordionGroup>
  <Accordion title="Example 1: Code review team">
    ```json
    {
      "broadcast": {
        "strategy": "parallel",
        "120363403215116621@g.us": [
          "code-formatter",
          "security-scanner",
          "test-coverage",
          "docs-checker"
        ]
      },
      "agents": {
        "list": [
          {
            "id": "code-formatter",
            "workspace": "~/agents/formatter",
            "tools": { "allow": ["read", "write"] }
          },
          {
            "id": "security-scanner",
            "workspace": "~/agents/security",
            "tools": { "allow": ["read", "exec"] }
          },
          {
            "id": "test-coverage",
            "workspace": "~/agents/testing",
            "tools": { "allow": ["read", "exec"] }
          },
          { "id": "docs-checker", "workspace": "~/agents/docs", "tools": { "allow": ["read"] } }
        ]
      }
    }
    ```

    **使用者傳送：** 程式碼片段。

    **回應：**

    - code-formatter：「已修正縮排並新增類型提示」
    - security-scanner：「⚠️ 第 12 行存在 SQL 注入漏洞」
    - test-coverage：「覆蓋率為 45%，缺少錯誤情況的測試」
    - docs-checker：「函式 `process_data` 缺少 docstring」

  </Accordion>
  <Accordion title="範例 2：多語言支援">
    ```json
    {
      "broadcast": {
        "strategy": "sequential",
        "+15555550123": ["detect-language", "translator-en", "translator-de"]
      },
      "agents": {
        "list": [
          { "id": "detect-language", "workspace": "~/agents/lang-detect" },
          { "id": "translator-en", "workspace": "~/agents/translate-en" },
          { "id": "translator-de", "workspace": "~/agents/translate-de" }
        ]
      }
    }
    ```
  </Accordion>
</AccordionGroup>

## API 參考

### 設定架構

```typescript
interface OpenClawConfig {
  broadcast?: {
    strategy?: "parallel" | "sequential";
    [peerId: string]: string[];
  };
}
```

### 欄位

<ParamField path="strategy" type='"parallel" | "sequential"' default='"parallel"'>
  如何處理代理程式。`parallel` 會同時執行所有代理程式；`sequential` 則會依陣列順序執行。
</ParamField>
<ParamField path="[peerId]" type="string[]">
  WhatsApp 群組 JID、E.164 號碼或其他對等 ID。數值為應處理訊息的代理程式 ID 陣列。
</ParamField>

## 限制

1. **最大代理程式數：** 沒有硬性限制，但 10 個以上的代理程式可能會變慢。
2. **共享上下文：** 代理程式看不到彼此的回應（依設計）。
3. **訊息排序：** 平行回應可能以任何順序到達。
4. **速率限制：** 所有代理程式都會計入 WhatsApp 速率限制。

## 未來增強功能

計畫中的功能：

- [ ] 共享上下文模式（代理程式可以看到彼此的回應）
- [ ] 代理程式協調（代理程式可以相互發送信號）
- [ ] 動態代理程式選擇（根據訊息內容選擇代理程式）
- [ ] 代理程式優先順序（部分代理程式優先回應）

## 相關

- [通道路由](/zh-Hant/channels/channel-routing)
- [群組](/zh-Hant/channels/groups)
- [多代理程式沙箱工具](/zh-Hant/tools/multi-agent-sandbox-tools)
- [配對](/zh-Hant/channels/pairing)
- [會話管理](/zh-Hant/concepts/session)
