---
summary: "將 WhatsApp 訊息廣播給多個代理程式"
read_when:
  - Configuring broadcast groups
  - Debugging multi-agent replies in WhatsApp
status: experimental
title: "廣播群組"
---

# 廣播群組

**狀態：** 實驗性  
**版本：** 新增於 2026.1.9

## 概觀

廣播群組允許多個代理程式同時處理並回覆同一則訊息。這讓您能夠建立專業的代理程式團隊，在同一個 WhatsApp 群組或私訊中協作 — 全部使用同一個電話號碼。

目前範圍：**僅限 WhatsApp** (網頁頻道)。

廣播群組是在頻道允許清單和群組啟用規則之後進行評估的。在 WhatsApp 群組中，這意味著廣播會在 OpenClaw 通常會回覆的時候發生 (例如：在被提及時，取決於您的群組設定)。

## 使用案例

### 1. 專業代理程式團隊

部署具有原子化、明確職責的多個代理程式：

```
Group: "Development Team"
Agents:
  - CodeReviewer (reviews code snippets)
  - DocumentationBot (generates docs)
  - SecurityAuditor (checks for vulnerabilities)
  - TestGenerator (suggests test cases)
```

每個代理處理相同的訊息並提供其專業的觀點。

### 2. 多語言支援

```
Group: "International Support"
Agents:
  - Agent_EN (responds in English)
  - Agent_DE (responds in German)
  - Agent_ES (responds in Spanish)
```

### 3. 品質保證工作流程

```
Group: "Customer Support"
Agents:
  - SupportAgent (provides answer)
  - QAAgent (reviews quality, only responds if issues found)
```

### 4. 任務自動化

```
Group: "Project Management"
Agents:
  - TaskTracker (updates task database)
  - TimeLogger (logs time spent)
  - ReportGenerator (creates summaries)
```

## 配置

### 基本設定

新增一個頂層 `broadcast` 區塊（位於 `bindings` 旁邊）。鍵為 WhatsApp 對等 ID：

- 群組聊天：群組 JID（例如 `120363403215116621@g.us`）
- 私訊：E.164 電話號碼（例如 `+15551234567`）

```json
{
  "broadcast": {
    "120363403215116621@g.us": ["alfred", "baerbel", "assistant3"]
  }
}
```

**結果：** 當 OpenClaw 在此聊天中回覆時，它將運行所有三個代理。

### 處理策略

控制代理如何處理訊息：

#### 並行（預設）

所有代理同時處理：

```json
{
  "broadcast": {
    "strategy": "parallel",
    "120363403215116621@g.us": ["alfred", "baerbel"]
  }
}
```

#### 循序

代理按順序處理（一個等待前一個完成）：

```json
{
  "broadcast": {
    "strategy": "sequential",
    "120363403215116621@g.us": ["alfred", "baerbel"]
  }
}
```

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

## 運作方式

### 訊息流程

1. **傳入訊息** 到達 WhatsApp 群組
2. **廣播檢查**：系統檢查對等 ID 是否在 `broadcast` 中
3. **若位於廣播清單中**：
   - 所有列出的代理程式都會處理該訊息
   - 每個代理程式都有自己的會話金鑰和隔離的上下文
   - 代理程式以並行（預設）或順序方式處理
4. **若不在廣播清單中**：
   - 套用一般路由（第一個符合的綁定）

注意：廣播群組不會繞過頻道允許清單或群組啟用規則（提及/指令/等）。它們僅會在訊息符合處理資格時變更執行*哪些代理程式*。

### 會話隔離

廣播群組中的每個代理程式都會維持完全獨立的：

- **會話金鑰** (`agent:alfred:whatsapp:group:120363...` vs `agent:baerbel:whatsapp:group:120363...`)
- **對話歷程**（代理程式看不見其他代理程式的訊息）
- **工作區**（若已設定，則為獨立的沙盒）
- **工具存取**（不同的允許/拒絕清單）
- **記憶體/上下文**（獨立的 IDENTITY.md、SOUL.md 等）
- **群組上下文緩衝區**（用於上下文的近期群組訊息）是每個對等節點共享的，因此所有廣播代理在觸發時看到的都是相同的上下文

這允許每個代理擁有：

- 不同的個性
- 不同的工具存取權限（例如，唯讀 vs. 讀寫）
- 不同的模型（例如，opus vs. sonnet）
- 安裝不同的技能

### 範例：隔離的工作階段

在群組 `120363403215116621@g.us` 中，使用代理 `["alfred", "baerbel"]`：

**Alfred 的上下文：**

```
Session: agent:alfred:whatsapp:group:120363403215116621@g.us
History: [user message, alfred's previous responses]
Workspace: /Users/pascal/openclaw-alfred/
Tools: read, write, exec
```

**Bärbel 的上下文：**

```
Session: agent:baerbel:whatsapp:group:120363403215116621@g.us
History: [user message, baerbel's previous responses]
Workspace: /Users/pascal/openclaw-baerbel/
Tools: read only
```

## 最佳實踐

### 1. 保持代理專注

為每個代理設計單一、明確的職責：

```json
{
  "broadcast": {
    "DEV_GROUP": ["formatter", "linter", "tester"]
  }
}
```

✅ **好：** 每個代理有一項工作  
❌ **壞：** 一個通用的「開發輔助」代理

### 2. 使用描述性名稱

讓每個代理的功能清晰明瞭：

```json
{
  "agents": {
    "security-scanner": { "name": "Security Scanner" },
    "code-formatter": { "name": "Code Formatter" },
    "test-generator": { "name": "Test Generator" }
  }
}
```

### 3. 配置不同的工具存取權限

只給予代理所需的工具：

```json
{
  "agents": {
    "reviewer": {
      "tools": { "allow": ["read", "exec"] } // Read-only
    },
    "fixer": {
      "tools": { "allow": ["read", "write", "edit", "exec"] } // Read-write
    }
  }
}
```

### 4. 監控效能

若有多個代理，請考慮：

- 使用 `"strategy": "parallel"`（預設值）以提高速度
- 將廣播群組限制在 5-10 個代理程式之間
- 針對較簡單的代理程式使用更快的模型

### 5. 優雅地處理失敗

代理程式會獨立失敗。一個代理程式的錯誤不會阻擋其他的代理程式：

```
Message → [Agent A ✓, Agent B ✗ error, Agent C ✓]
Result: Agent A and C respond, Agent B logs error
```

## 相容性

### 供應商

廣播群組目前適用於：

- ✅ WhatsApp (已實作)
- 🚧 Telegram (計劃中)
- 🚧 Discord (計劃中)
- 🚧 Slack (計劃中)

### 路由

廣播群組與現有路由並行運作：

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

- `GROUP_A`: 僅 alfred 回應 (正常路由)
- `GROUP_B`: agent1 與 agent2 回應 (廣播)

**優先順序：** `broadcast` 優先於 `bindings`。

## 疑難排解

### 代理程式無回應

**檢查：**

1. 代理程式 ID 存在於 `agents.list` 中
2. Peer ID 格式正確 (例如 `120363403215116621@g.us`)
3. 代理程式未位於拒絕清單中

**除錯：**

```exec
tail -f ~/.openclaw/logs/gateway.log | grep broadcast
```

### 僅有一個代理程式回應

**原因：** Peer ID 可能位於 `bindings` 中，但不在 `broadcast` 中。

**修復方法：** 將其新增到廣播設定中，或從綁定中移除。

### 效能問題

**如果代理程式較多時速度變慢：**

- 減少每個群組的代理程式數量
- 使用輕量級模型（例如使用 sonnet 而非 opus）
- 檢查沙箱啟動時間

## 範例

### 範例 1：程式碼審查團隊

```json
{
  "broadcast": {
    "strategy": "parallel",
    "120363403215116621@g.us": ["code-formatter", "security-scanner", "test-coverage", "docs-checker"]
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

**使用者傳送：** 程式碼片段  
**回應：**

- code-formatter: "修正縮排並新增型別提示"
- security-scanner: "⚠️ 第 12 行存在 SQL 注入漏洞"
- test-coverage: "覆蓋率為 45%，缺少錯誤情況的測試"
- docs-checker: "函式 `process_data` 缺少 docstring"

### 範例 2：多語言支援

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

- `strategy` (選用)：如何處理代理程式
  - `"parallel"` (預設值)：所有代理程式同時處理
  - `"sequential"`：代理程式依照陣列順序處理
- `[peerId]`：WhatsApp 群組 JID、E.164 號碼或其他對等 ID
  - 值：應處理訊息的代理程式 ID 陣列

## 限制

1. **最大代理程式數量**：無硬性限制，但 10 個以上的代理程式可能會變慢
2. **共享內容**：代理程式看不到彼此的回應（依設計）
3. **訊息排序**：並行回應可能會以任何順序抵達
4. **速率限制**：所有代理程式皆計入 WhatsApp 速率限制

## 未來增強功能

規劃中的功能：

- [ ] 共享內容模式（代理程式可以看到彼此的回應）
- [ ] 代理程式協調（代理程式可以互相發送信號）
- [ ] 動態代理程式選擇（根據訊息內容選擇代理程式）
- [ ] 代理程式優先順序（部分代理程式優先回應）

## 另請參閱

- [多代理程式設定](/zh-Hant/multi-agent-sandbox-tools)
- [路由設定](/zh-Hant/concepts/channel-routing)
- [會話管理](/zh-Hant/concepts/sessions)
