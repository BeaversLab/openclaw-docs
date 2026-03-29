---
summary: "廣播 WhatsApp 訊息至多個代理"
read_when:
  - Configuring broadcast groups
  - Debugging multi-agent replies in WhatsApp
status: experimental
title: "廣播群組"
---

# 廣播群組

**狀態：** 實驗性功能  
**版本：** 新增於 2026.1.9

## 概覽

廣播群組讓多個代理能同時處理並回應同一則訊息。這讓您能建立專業的代理團隊，在單一 WhatsApp 群組或私訊中協作 — 全部使用同一個電話號碼。

目前範圍：**僅限 WhatsApp**（網頁頻道）。

廣播群組會在頻道允許清單和群組啟用規則之後進行評估。在 WhatsApp 群組中，這意味著廣播會在 OpenClaw 通常會回覆的時候發生（例如：在被提及時，取決於您的群組設定）。

## 使用案例

### 1. �業化代理團隊

部署具有專一、專注職責的多個代理：

```
Group: "Development Team"
Agents:
  - CodeReviewer (reviews code snippets)
  - DocumentationBot (generates docs)
  - SecurityAuditor (checks for vulnerabilities)
  - TestGenerator (suggests test cases)
```

每個代理處理同一則訊息並提供其專業觀點。

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

## 設定

### 基本設定

新增一個頂層 `broadcast` 區段（旁邊是 `bindings`）。金鑰為 WhatsApp 對等 ID：

- 群組聊天：群組 JID（例如 `120363403215116621@g.us`）
- 私訊：E.164 電話號碼（例如 `+15551234567`）

```json
{
  "broadcast": {
    "120363403215116621@g.us": ["alfred", "baerbel", "assistant3"]
  }
}
```

**結果：** 當 OpenClaw 在此聊天中回覆時，它將會執行這三個代理。

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

代理按順序處理（一個等待上一個完成）：

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

1. **傳入訊息** 抵達 WhatsApp 群組
2. **廣播檢查**：系統檢查對等 ID 是否在 `broadcast` 中
3. **如果在廣播清單中**：
   - 所有列出的代理都會處理該訊息
   - 每個代理都有自己的會話金鑰和隔離的上下文
   - 代理並行處理（預設）或循序處理
4. **如果不在廣播清單中**：
   - 套用正常路由（第一個匹配的綁定）

注意：廣播群組不會繞過頻道允許清單或群組啟用規則（提及/指令/等）。它們僅在訊息符合處理資格時改變 _執行哪些代理_。

### 會話隔離

廣播群組中的每個代理都維護完全獨立的：

- **會話金鑰** (`agent:alfred:whatsapp:group:120363...` vs `agent:baerbel:whatsapp:group:120363...`)
- **對話記錄** (代理看不到其他代理的訊息)
- **工作區** (如果已配置，則為隔離沙箱)
- **工具存取權** (不同的允許/拒絕清單)
- **記憶/情境** (分開的 IDENTITY.md、SOUL.md 等)
- **群組情境緩衝區** (用於情境的近期群組訊息) 會按對等端共享，因此所有廣播代理在被觸發時都能看到相同的情境

這允許每個代理擁有：

- 不同的個性
- 不同的工具存取權 (例如：唯讀 vs. 讀寫)
- 不同的模型 (例如：opus vs. sonnet)
- 安裝不同的技能

### 範例：隔離會話

在包含代理 `["alfred", "baerbel"]` 的群組 `120363403215116621@g.us` 中：

**Alfred 的情境：**

```
Session: agent:alfred:whatsapp:group:120363403215116621@g.us
History: [user message, alfred's previous responses]
Workspace: /Users/pascal/openclaw-alfred/
Tools: read, write, exec
```

**Bärbel 的情境：**

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

✅ **良好：** 每個代理只有一項工作  
❌ **不佳：** 一個通用的「dev-helper」代理

### 2. 使用描述性名稱

清楚地表明每個代理的職責：

```json
{
  "agents": {
    "security-scanner": { "name": "Security Scanner" },
    "code-formatter": { "name": "Code Formatter" },
    "test-generator": { "name": "Test Generator" }
  }
}
```

### 3. 配置不同的工具存取權

僅提供代理所需的工具：

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

對於許多代理，請考慮：

- 使用 `"strategy": "parallel"` (預設) 以提升速度
- 將廣播群組限制在 5-10 個代理
- 為較簡單的代理使用更快的模型

### 5. 優雅地處理失敗

代理獨立失敗。一個代理的錯誤不會阻擋其他代理：

```
Message → [Agent A ✓, Agent B ✗ error, Agent C ✓]
Result: Agent A and C respond, Agent B logs error
```

## 相容性

### 供應商

廣播群組目前適用於：

- ✅ WhatsApp (已實作)
- 🚧 Telegram (計畫中)
- 🚧 Discord (計畫中)
- 🚧 Slack (計畫中)

### 路由

廣播群組與現有路由並存：

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

- `GROUP_A`: 只有 alfred 回應 (正常路由)
- `GROUP_B`: agent1 AND agent2 回應 (廣播)

**優先順序：** `broadcast` 優先於 `bindings`。

## 故障排除

### 代理無回應

**檢查：**

1. 代理 ID 存在於 `agents.list` 中
2. 對等 ID 格式正確 (例如 `120363403215116621@g.us`)
3. 代理未在拒絕清單中

**除錯：**

```bash
tail -f ~/.openclaw/logs/gateway.log | grep broadcast
```

### 只有一個代理回應

**原因：** 對等 ID 可能存在於 `bindings` 但不在 `broadcast` 中。

**修復方法：** 將其加入廣播設定或從綁定中移除。

### 效能問題

**如果代理程式多時速度變慢：**

- 減少每個群組的代理程式數量
- 使用較輕量的模型（使用 sonnet 而非 opus）
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

- code-formatter: 「修復了縮排並加入了型別提示」
- security-scanner: 「⚠️ 第 12 行存在 SQL 注入漏洞」
- test-coverage: 「覆蓋率為 45%，缺少錯誤情況的測試」
- docs-checker: 「函式 `process_data` 缺少文件字串」

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
  - `"parallel"` (預設)：所有代理程式同時處理
  - `"sequential"`：代理程式依陣列順序處理
- `[peerId]`：WhatsApp 群組 JID、E.164 號碼或其他對等 ID
  - 值：應處理訊息的代理程式 ID 陣列

## 限制

1. **最大代理程式數：** 沒有硬性限制，但 10 個以上的代理程式可能會變慢
2. **共享上下文：** 代理程式看不到彼此的回應（依設計而定）
3. **訊息排序：** 平行回應可能以任何順序抵達
4. **速率限制：** 所有代理程式都計入 WhatsApp 速率限制

## 未來增強功能

計畫中的功能：

- [ ] 共享上下文模式（代理程式可以看到彼此的回應）
- [ ] 代理程式協調（代理程式可以互相發送訊號）
- [ ] 動態代理程式選擇（根據訊息內容選擇代理程式）
- [ ] 代理程式優先順序（某些代理程式優先回應）

## 參見

- [多代理程式設定](/en/multi-agent-sandbox-tools)
- [路由設定](/en/concepts/channel-routing)
- [會話管理](/en/concepts/sessions)
