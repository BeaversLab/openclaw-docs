---
summary: "將 WhatsApp 訊息廣播給多個代理程式"
read_when:
  - Configuring broadcast groups
  - Debugging multi-agent replies in WhatsApp
status: experimental
title: "廣播群組"
---

# 廣播群組

**狀態：** 實驗性功能  
**版本：** 於 2026.1.9 新增

## 概覽

廣播群組讓多個代理程式能夠同時處理並回應同一則訊息。這讓您能夠建立專業的代理程式團隊，在單一 WhatsApp 群組或私訊中共同運作 — 全部使用同一個電話號碼。

目前範圍：**僅限 WhatsApp** (web channel)。

廣播群組會在管道允許清單 和群組啟用規則 之後進行評估。在 WhatsApp 群組中，這意味著廣播會在 OpenClaw 通常會回覆時發生 (例如：在被提及時，取決於您的群組設定)。

## 使用案例

### 1. 專業代理程式團隊

部署多個具有原子性、專注責任的代理程式：

```
Group: "Development Team"
Agents:
  - CodeReviewer (reviews code snippets)
  - DocumentationBot (generates docs)
  - SecurityAuditor (checks for vulnerabilities)
  - TestGenerator (suggests test cases)
```

每個代理程式處理相同的訊息並提供其專業的觀點。

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

新增一個頂層 `broadcast` 區塊 (位於 `bindings` 旁)。鍵值為 WhatsApp 對等 ID (peer id)：

- 群組聊天：群組 JID (例如 `120363403215116621@g.us`)
- 私訊 (DM)：E.164 電話號碼 (例如 `+15551234567`)

```json
{
  "broadcast": {
    "120363403215116621@g.us": ["alfred", "baerbel", "assistant3"]
  }
}
```

**結果：** 當 OpenClaw 在此聊天中回覆時，它將會執行所有三個代理程式。

### 處理策略

控制代理程式如何處理訊息：

#### 並行 (預設)

所有代理程式同時處理：

```json
{
  "broadcast": {
    "strategy": "parallel",
    "120363403215116621@g.us": ["alfred", "baerbel"]
  }
}
```

#### 循序

代理程式依序處理 (一個等待前一個完成)：

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
2. **廣播檢查**：系統檢查對等 ID 是否位於 `broadcast` 中
3. **若在廣播清單中**：
   - 所有列出的代理程式皆會處理該訊息
   - 每個代理程式都有自己的金鑰和隔離的上下文
   - 代理程式會並行 (預設) 或循序處理
4. **若不在廣播清單中**：
   - 套用正常路由 (第一個符合的綁定)

注意：廣播群組並不會繞過管道允許清單或群組啟用規則 (提及/指令/等)。它們僅在訊息符合處理資格時改變 _執行哪些代理程式_。

### 工作階段隔離

廣播群組中的每個代理都維護完全獨立的：

- **Session keys** (`agent:alfred:whatsapp:group:120363...` vs `agent:baerbel:whatsapp:group:120363...`)
- **Conversation history** (agent doesn't see other agents' messages)
- **Workspace** (separate sandboxes if configured)
- **Tool access** (different allow/deny lists)
- **Memory/context** (separate IDENTITY.md, SOUL.md, etc.)
- **Group context buffer** (recent group messages used for context) is shared per peer, so all broadcast agents see the same context when triggered

這允許每個代理擁有：

- 不同的個性
- 不同的工具存取權限 (e.g., read-only vs. read-write)
- 不同的模型 (e.g., opus vs. sonnet)
- 安裝不同的技能

### 範例：隔離的工作階段

In group `120363403215116621@g.us` with agents `["alfred", "baerbel"]`:

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

### 1. 讓代理保持專注

為每個代理設計單一、明確的職責：

```json
{
  "broadcast": {
    "DEV_GROUP": ["formatter", "linter", "tester"]
  }
}
```

✅ **Good:** Each agent has one job  
❌ **Bad:** One generic "dev-helper" agent

### 2. 使用描述性名稱

讓每個代理的職責一目瞭然：

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

當使用多個代理時，請考慮：

- Using `"strategy": "parallel"` (default) for speed
- 將廣播群組限制在 5-10 個代理
- 為較簡單的代理使用更快的模型

### 5. 優雅地處理失敗

代理各自獨立地失敗。一個代理的錯誤不會阻擋其他代理：

```
Message → [Agent A ✓, Agent B ✗ error, Agent C ✓]
Result: Agent A and C respond, Agent B logs error
```

## 相容性

### 提供商

廣播群組目前適用於：

- ✅ WhatsApp (implemented)
- 🚧 Telegram (planned)
- 🚧 Discord (planned)
- 🚧 Slack (planned)

### 路由

廣播群組與現有的路由並行運作：

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

- `GROUP_A`: Only alfred responds (normal routing)
- `GROUP_B`: agent1 AND agent2 respond (broadcast)

**Precedence:** `broadcast` takes priority over `bindings`.

## 故障排除

### 代理沒有回應

**檢查：**

1. Agent IDs exist in `agents.list`
2. Peer ID format is correct (e.g., `120363403215116621@g.us`)
3. 代理不在拒絕清單中

**偵錯：**

```bash
tail -f ~/.openclaw/logs/gateway.log | grep broadcast
```

### 只有一個代理有回應

**原因：** Peer ID 可能位於 `bindings` 中但不在 `broadcast` 中。

**修復方法：** 新增至廣播配置或從綁定中移除。

### 效能問題

**如果使用多個代理程式時速度緩慢：**

- 減少每個群組的代理程式數量
- 使用較輕量的模型（使用 sonnet 而非 opus）
- 檢查沙盒啟動時間

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

- code-formatter: "修正縮排並新增類型提示"
- security-scanner: "⚠️ 第 12 行存在 SQL 注入弱點"
- test-coverage: "覆蓋率為 45%，缺少錯誤處理案例的測試"
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

### 配置架構

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
- `[peerId]`：WhatsApp 群組 JID、E.164 號碼或其他 Peer ID
  - 值：應處理訊息的代理程式 ID 陣列

## 限制

1. **代理程式數量上限：** 無硬性限制，但 10 個以上代理程式可能會變慢
2. **共用上下文：** 代理程式無法看見彼此的回應（依設計）
3. **訊息順序：** 並行回應可能以任何順序抵達
4. **速率限制：** 所有代理程式皆計入 WhatsApp 速率限制

## 未來增強功能

計畫中的功能：

- [ ] 共用上下文模式（代理程式可看見彼此的回應）
- [ ] 代理程式協調（代理程式可相互發送訊號）
- [ ] 動態代理程式選擇（根據訊息內容選擇代理程式）
- [ ] 代理程式優先順序（部分代理程式優先回應）

## 參閱

- [多代理程式配置](/zh-Hant/tools/multi-agent-sandbox-tools)
- [路由配置](/zh-Hant/channels/channel-routing)
- [會話管理](/zh-Hant/concepts/session)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
