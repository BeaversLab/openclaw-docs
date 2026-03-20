---
summary: "將 WhatsApp 訊息廣播給多個代理程式"
read_when:
  - 設定廣播群組
  - 偵錯 WhatsApp 中的多代理程式回覆
status: experimental
title: "Broadcast Groups"
---

# 廣播群組

**狀態：** 實驗性  
**版本：** 於 2026.1.9 新增

## 概覽

廣播群組讓多個代理能同時處理並回應同一則訊息。這讓您能夠建立專業的代理團隊，在單一 WhatsApp 群組或 DM 中協作 — 全部使用同一個電話號碼。

目前範圍：**僅限 WhatsApp**（網頁頻道）。

廣播群組是在頻道允許清單 和群組啟用規則 之後評估的。在 WhatsApp 群組中，這意味著廣播會在 OpenClaw 通常會回覆時發生（例如：在被提及時，取決於您的群組設定）。

## 使用案例

### 1. 專業代理團隊

部署多個具有原子化、專注責任的代理：

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

## 設定

### 基本設定

新增一個頂層 `broadcast` 區段（位於 `bindings` 旁）。鍵值為 WhatsApp 對等 ID：

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

## 運作原理

### 訊息流程

1. **傳入訊息** 到達 WhatsApp 群組
2. **廣播檢查**：系統檢查對等 ID 是否在 `broadcast` 中
3. **如果在廣播清單中**：
   - 所有列出的代理處理該訊息
   - 每個代理都有自己的金鑰和隔離的上下文
   - 代理並行處理（預設）或循序處理
4. **如果不在廣播清單中**：
   - 套用正常路由（第一個匹配的綁定）

注意：廣播群組並不會繞過頻道允許清單 或群組啟用規則（提及/指令/等）。它們只會在訊息有資格被處理時改變 _執行哪些代理_。

### 會話隔離

廣播群組中的每個智能體都維護完全獨立的：

- **Session 金鑰**（`agent:alfred:whatsapp:group:120363...` vs `agent:baerbel:whatsapp:group:120363...`）
- **Conversation history** (智能體看不見其他智能體的訊息)
- **Workspace** (若已設定，則為獨立的沙盒)
- **Tool access** (不同的允許/拒絕清單)
- **Memory/context** (獨立的 IDENTITY.md, SOUL.md 等)
- **Group context buffer** (用於作為情境的近期群組訊息) 會按節點共享，因此觸發時所有廣播智能體都會看到相同的情境

這讓每個智能體都能夠擁有：

- 不同的性格
- 不同的工具存取權 (例如：唯讀 vs. 讀寫)
- 不同的模型 (例如：opus vs. sonnet)
- 安裝不同的技能

### 範例：隔離的工作階段

在包含代理程式 `["alfred", "baerbel"]` 的群組 `120363403215116621@g.us` 中：

**Alfred's context:**

```
Session: agent:alfred:whatsapp:group:120363403215116621@g.us
History: [user message, alfred's previous responses]
Workspace: /Users/pascal/openclaw-alfred/
Tools: read, write, exec
```

**Bärbel's context:**

```
Session: agent:baerbel:whatsapp:group:120363403215116621@g.us
History: [user message, baerbel's previous responses]
Workspace: /Users/pascal/openclaw-baerbel/
Tools: read only
```

## 最佳實踐

### 1. 保持智能體專注

為每個智能體設計單一、明確的職責：

```json
{
  "broadcast": {
    "DEV_GROUP": ["formatter", "linter", "tester"]
  }
}
```

✅ **良好：** 每個代理程式有一項工作  
❌ **不良：** 一個通用的 "dev-helper" 代理程式

### 2. 使用描述性名稱

讓每個智能體的作用一目瞭然：

```json
{
  "agents": {
    "security-scanner": { "name": "Security Scanner" },
    "code-formatter": { "name": "Code Formatter" },
    "test-generator": { "name": "Test Generator" }
  }
}
```

### 3. 設定不同的工具存取權

僅給予智能體其所需的工具：

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

隨著智能體數量增加，請考慮：

- 使用 `"strategy": "parallel"`（預設）以提升速度
- 將廣播群組限制在 5-10 個智能體
- 為較簡單的智能體使用更快的模型

### 5. 優雅地處理失敗

智能體會獨立失敗。一個智能體的錯誤不會阻擋其他的：

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

廣播群組與現有路由並存運作：

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

- `GROUP_A`：僅 alfred 回應（正常路由）
- `GROUP_B`：agent1 與 agent2 均回應（廣播）

**優先順序：** `broadcast` 優先於 `bindings`。

## 疑難排解

### 智能體無回應

**檢查：**

1. 代理程式 ID 存在於 `agents.list`
2. 對等 ID 格式正確（例如 `120363403215116621@g.us`）
3. 智能體不在拒絕清單中

**除錯：**

```bash
tail -f ~/.openclaw/logs/gateway.log | grep broadcast
```

### 只有一個智能體回應

**原因：** 對等 ID 可能存在於 `bindings` 但不存在於 `broadcast`。

**修復：** 新增至廣播設定或從綁定中移除。

### 效能問題

**如果代理程式很多時速度變慢：**

- 減少每個群組的代理程式數量
- 使用更輕量的模型（用 sonnet 代替 opus）
- 檢查沙箱啟動時間

## 範例

### 範例 1：程式碼審查團隊

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

**使用者傳送：** 程式碼片段  
**回應：**

- code-formatter: "修復了縮排並新增了類型提示"
- security-scanner: "⚠️ 第 12 行存在 SQL 注入漏洞"
- test-coverage: "覆蓋率為 45%，缺少錯誤情況的測試"
- docs-checker: "函式 `process_data` 缺少文件字串"

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

- `strategy`（選用）：如何處理代理程式
  - `"parallel"`（預設）：所有代理程式同時處理
  - `"sequential"`：代理程式依陣列順序處理
- `[peerId]`：WhatsApp 群組 JID、E.164 號碼或其他對等 ID
  - 值：應處理訊息的代理程式 ID 陣列

## 限制

1. **最大代理程式數：** 沒有硬性限制，但 10 個以上的代理程式可能會變慢
2. **共享上下文：** 代理程式看不到彼此的回應（依設計）
3. **訊息排序：** 平行回應可能以任何順序到達
4. **速率限制：** 所有代理程式皆計入 WhatsApp 速率限制

## 未來增強功能

計畫中的功能：

- [ ] 共享上下文模式（代理程式能看到彼此的回應）
- [ ] 代理程式協調（代理程式可以互相傳送訊號）
- [ ] 動態代理程式選擇（根據訊息內容選擇代理程式）
- [ ] 代理程式優先順序（某些代理程式優先回應）

## 另請參閱

- [多代理程式設定](/zh-Hant/multi-agent-sandbox-tools)
- [路由設定](/zh-Hant/concepts/channel-routing)
- [Session 管理](/zh-Hant/concepts/sessions)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
