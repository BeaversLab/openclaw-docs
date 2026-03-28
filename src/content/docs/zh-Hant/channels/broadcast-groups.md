---
summary: "將 WhatsApp 訊息廣播給多個代理"
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

廣播群組允許多個代理同時處理並回應同一則訊息。這讓您能夠建立專業的代理團隊，在單一 WhatsApp 群組或 DM 中協作 — 全部使用同一個電話號碼。

目前範圍：**僅限 WhatsApp**（網頁頻道）。

廣播群組會在頻道允許清單和群組啟動規則之後進行評估。在 WhatsApp 群組中，這意味著當 OpenClaw 通常會回覆時才會進行廣播（例如：在被提及時，取決於您的群組設定）。

## 使用案例

### 1. 專業代理團隊

部署多個代理，各自負責原子化、專注的職責：

```
Group: "Development Team"
Agents:
  - CodeReviewer (reviews code snippets)
  - DocumentationBot (generates docs)
  - SecurityAuditor (checks for vulnerabilities)
  - TestGenerator (suggests test cases)
```

每個智能體處理相同的訊息並提供其專業的觀點。

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

新增一個頂層 `broadcast` 區塊（緊鄰 `bindings`）。鍵為 WhatsApp 對等 ID：

- 群組聊天：群組 JID（例如 `120363403215116621@g.us`）
- 私人訊息：E.164 電話號碼（例如 `+15551234567`）

```json
{
  "broadcast": {
    "120363403215116621@g.us": ["alfred", "baerbel", "assistant3"]
  }
}
```

**結果：** 當 OpenClaw 打算在此聊天中回覆時，它將會執行這全部三個智能體。

### 處理策略

控制智能體如何處理訊息：

#### 平行（預設）

所有智能體同時處理：

```json
{
  "broadcast": {
    "strategy": "parallel",
    "120363403215116621@g.us": ["alfred", "baerbel"]
  }
}
```

#### 循序

智能體依序處理（一個等待上一個完成）：

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

1. **傳入訊息** 抵達 WhatsApp 群組
2. **廣播檢查**：系統檢查對等 ID 是否在 `broadcast` 中
3. **如果在廣播清單中**：
   - 所有列出的代理程式都會處理該訊息
   - 每個代理程式都有自己的會話金鑰和隔離的上下文
   - 代理程式並行處理（預設）或順序處理
4. **如果不在廣播清單中**：
   - 應用正常路由（第一個匹配的綁定）

注意：廣播群組不會繞過通道允許清單或群組啟動規則（提及/指令等）。它們僅在訊息符合處理資格時改變*執行哪些代理程式*。

### 會話隔離

廣播群組中的每個代理程式都保持完全分離的：

- **會話金鑰**（`agent:alfred:whatsapp:group:120363...` vs `agent:baerbel:whatsapp:group:120363...`）
- **對話歷史**（代理程式看不到其他代理程式的訊息）
- **工作區**（如果已配置，則為獨立的沙盒）
- **工具存取權**（不同的允許/拒絕清單）
- **記憶/上下文**（獨立的 IDENTITY.md、SOUL.md 等）
- **群組上下文緩衝區**（用於上下文的最近群組訊息）是按對等節點共享的，因此在觸發時所有廣播代理程式都能看到相同的上下文

這允許每個代理程式擁有：

- 不同的個性
- 不同的工具存取權限（例如：唯讀 vs. 讀寫）
- 不同的模型（例如：opus vs. sonnet）
- 安裝不同的技能

### 範例：隔離的工作階段

在群組 `120363403215116621@g.us` 中，包含代理程式 `["alfred", "baerbel"]`：

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

### 1. 保持代理程式專注

設計每個代理程式時，應賦予其單一、明確的職責：

```json
{
  "broadcast": {
    "DEV_GROUP": ["formatter", "linter", "tester"]
  }
}
```

✅ **好：** 每個代理程式有一項工作  
❌ **壞：** 一個通用的「開發助手」代理程式

### 2. 使用描述性名稱

讓每個代理程式的職責一目了然：

```json
{
  "agents": {
    "security-scanner": { "name": "Security Scanner" },
    "code-formatter": { "name": "Code Formatter" },
    "test-generator": { "name": "Test Generator" }
  }
}
```

### 3. 設定不同的工具存取權限

僅給予代理程式其所需的工具：

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

若有多個代理程式，請考慮：

- 使用 `"strategy": "parallel"`（預設值）以提升速度
- 將廣播群組限制在 5-10 個代理程式
- 為較簡單的代理程式使用更快的模型

### 5. 優雅地處理失敗

代理程式獨立失敗。一個代理程式的錯誤不會阻擋其他的：

```
Message → [Agent A ✓, Agent B ✗ error, Agent C ✓]
Result: Agent A and C respond, Agent B logs error
```

## 相容性

### 提供者

廣播群組目前適用於：

- ✅ WhatsApp（已實作）
- 🚧 Telegram（計畫中）
- 🚧 Discord（計畫中）
- 🚧 Slack（計畫中）

### 路由

廣播群組可與現有路由並行運作：

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
- `GROUP_B`：agent1 與 agent2 回應（廣播）

**優先順序：**`broadcast` 優先於 `bindings`。

## 疑難排解

### 代理程式無回應

**檢查：**

1. 代理程式 ID 存在於 `agents.list`
2. Peer ID 格式正確（例如 `120363403215116621@g.us`）
3. 代理程式不在拒絕清單中

**除錯：**

```exec
tail -f ~/.openclaw/logs/gateway.log | grep broadcast
```

### 僅有一個代理程式回應

**原因：** Peer ID 可能位於 `bindings` 中，但不在 `broadcast` 中。

**修復：** 加入至廣播設定或從綁定中移除。

### 效能問題

**如果在使用多個代理程式時速度緩慢：**

- 減少每個群組的代理程式數量
- 使用較輕量的模型（使用 sonnet 而非 opus）
- 檢查沙箱啟動時間

## 範例

### 範例 1：Code Review 團隊

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

- code-formatter：「已修正縮排並新增型別提示」
- security-scanner：「⚠️ 第 12 行存在 SQL 注入漏洞」
- test-coverage：「覆蓋率為 45%，缺少錯誤處理的測試」
- docs-checker：「函式 `process_data` 缺少 docstring」

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
  - `"sequential"`: Agents 按陣列順序處理
- `[peerId]`: WhatsApp 群組 JID、E.164 號碼或其他對等 ID
  - 值：應處理訊息的 Agent ID 陣列

## 限制

1. **最大 Agent 數量：** 沒有硬性限制，但 10 個以上的 Agent 可能會變慢
2. **共享上下文：** Agent 看不到彼此的回應（依設計）
3. **訊息排序：** 平行回應可能以任何順序到達
4. **速率限制：** 所有 Agent 都計入 WhatsApp 速率限制

## 未來增強功能

計畫中的功能：

- [ ] 共享上下文模式 (Agent 看得到彼此的回應)
- [ ] Agent 協調 (Agent 可以互相發送訊號)
- [ ] 動態 Agent 選擇 (根據訊息內容選擇 Agent)
- [ ] Agent 優先順序 (部分 Agent 會優先回應)

## 另請參閱

- [多 Agent 配置](/zh-Hant/tools/multi-agent-sandbox-tools)
- [路由配置](/zh-Hant/channels/channel-routing)
- [會話管理](/zh-Hant/concepts/session)
