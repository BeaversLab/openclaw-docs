---
summary: "Tool Search：透過搜尋、描述和呼叫來整合大型 OpenClaw 工具目錄"
title: "工具搜尋"
read_when:
  - You want OpenClaw agents to use a large tool catalog without adding every tool schema to the prompt
  - You want OpenClaw tools, MCP tools, and client tools exposed through one compact runtime surface
  - You are implementing or debugging tool discovery for OpenClaw runs
---

Tool Search 是一個實驗性的 OpenClaw 代理執行時功能。它為代理提供了一種
精簡的方式來探索和呼叫大型工具目錄。當執行
有許多可用工具但模型可能只需要其中少數幾個時，這非常有用。

此頁面記錄了 OpenClaw Tool Search。它不是 Codex 原生的工具
搜尋或 dynamic-tools 介面。Codex 原生程式碼模式、工具搜尋、延遲
dynamic tools 和巢狀工具呼叫是穩定的 Codex harness 介面，且不
依賴 `tools.toolSearch`。

當為 OpenClaw 執行啟用時，模型預設會收到一個 `tool_search_code` 工具。
該工具在獨立的 Node 子行程中執行一個簡短的 JavaScript 主體，並配有
`openclaw.tools` 橋接器：

```js
const hits = await openclaw.tools.search("create a GitHub issue");
const tool = await openclaw.tools.describe(hits[0].id);
return await openclaw.tools.call(tool.id, {
  title: "Crash on startup",
  body: "Steps to reproduce...",
});
```

該目錄可以包含 OpenClaw 工具、外掛程式工具、MCP 工具和客戶端提供的工具。模型不會預先看到每個完整的 schema。相反，它會搜尋精簡的描述符，當需要確切的 schema 時描述一個選定的工具，並透過 OpenClaw 呼叫該工具。

Codex harness 執行不會收到這些實驗性的 OpenClaw 工具搜尋控制項。OpenClaw 將產品功能作為動態工具傳遞給 Codex，而 Codex 擁有穩定的原生程式碼模式、原生工具搜尋、延遲動態工具和巢狀工具呼叫。

## 回合如何執行

在規劃階段，OpenClaw 內嵌執行器會為執行建構有效的目錄：

1. 解析代理程式、設定檔、沙箱和會話的啟用工具原則。
2. 列出合格的 OpenClaw 和外掛程式工具。
3. 透過會話 MCP 執行時期列出合格的 MCP 工具。
4. 加入為當前執行提供的合格客戶端工具。
5. 為搜尋建立精簡描述符的索引。
6. 向模型公開 OpenClaw code bridge 或結構化後備工具其中之一。

在執行時，每個實際的工具呼叫都會返回 OpenClaw。獨立的 Node 執行時不會保存外掛程式實作、MCP 用戶端物件或機密。`openclaw.tools.call(...)` 穿過橋接器回到 Gateway，在那裡正常的原則、審批、掛鉤、記錄和結果處理仍然適用。

## 模式

`tools.toolSearch` 有兩種面向模型的模式：

- `code`：公開 `tool_search_code`，這是預設的精簡 JavaScript 橋樑。
- `tools`：公開 `tool_search`、`tool_describe` 和 `tool_call` 作為普通結構化工具，適用於不應接收程式碼的提供者。

這兩種模式使用相同的目錄和執行路徑。唯一的差異在於模型看到的形狀。如果目前的執行時期無法啟動獨立的 Node 程式碼模式子行程，預設的 `code` 模式會在目錄精簡之前回退到 `tools`。

這兩種模式都是實驗性的。對於小型 OpenClaw 工具
目錄，建議優先使用直接工具公開；對於 Codex harness 執行，建議優先使用 Codex 原生穩定介面。

沒有個別的來源選擇設定。當啟用 Tool Search 時，目錄會在經過一般原則篩選後，納入合格的 OpenClaw、MCP 和用戶端工具。

## 為何存在此功能

大型目錄很有用但代價高昂。將每個工具綱要傳送給模型會使請求變大、減慢規劃速度，並增加意外選擇工具的機會。

Tool Search 改變了形狀：

- 直接工具：模型會在第一個 token 之前看到每個選取的綱要
- Tool Search 程式碼模式：模型會看到一個精簡的程式碼工具和簡短的 API 契約
- Tool Search 工具模式：模型會看到三個精簡的結構化回退工具
- 在執行期間：模型僅載入它實際需要的工具綱要

對於小型目錄，直接工具暴露仍然是最適當的預設值。當一次執行可以看到許多工具時，特別是來自 MCP 伺服器或用戶端提供的應用程式工具時，Tool Search 是最佳選擇。

## API

`openclaw.tools.search(query, options?)`

搜尋目前執行的有效目錄。結果是精簡且安全的，可以放回提示詞情境中。

```js
const hits = await openclaw.tools.search("calendar event", { limit: 5 });
```

`openclaw.tools.describe(id)`

載入一個搜尋結果的完整中繼資料，包括確切的輸入綱要。

```js
const calendarCreate = await openclaw.tools.describe("mcp:calendar:create_event");
```

`openclaw.tools.call(id, args)`

透過 OpenClaw 呼叫選取的工具。

```js
await openclaw.tools.call(calendarCreate.id, {
  summary: "Planning",
  start: "2026-05-09T14:00:00Z",
});
```

結構化回退模式會將相同的作業以工具形式公開：

- `tool_search`
- `tool_describe`
- `tool_call`

## 執行時期邊界

程式碼橋接器在短暫的 Node 子程序中運行。子程序啟動時啟用 Node 權限模式，擁有空環境、沒有檔案系統或網路權限，也沒有子程序或 worker 權限。OpenClaw 會執行父程序壁鐘逾時，並在逾時時終止子程序，包括在非同步延續之後。

執行環境僅公開：

- `console.log`、`console.warn` 和 `console.error`
- `openclaw.tools.search`
- `openclaw.tools.describe`
- `openclaw.tools.call`

正常的 OpenClaw 行為仍適用於最終呼叫：

- 工具允許和拒絕策略
- 個別代理程式和個別沙箱工具限制
- 通道/運行時工具原則
- 核准掛鉤
- 外掛程式 `before_tool_call` 掛鉤
- 工作階段身分識別、記錄和遙測

## 組態

為 OpenClaw 執行啟用預設 code bridge 的 Tool Search：

```bash
openclaw config set tools.toolSearch true
```

等效 JSON：

```json5
{
  tools: {
    toolSearch: true,
  },
}
```

改為在 OpenClaw 執行中使用結構化後備工具：

```json5
{
  tools: {
    toolSearch: {
      mode: "tools",
    },
  },
}
```

調整程式碼模式逾時和搜尋結果限制：

```json5
{
  tools: {
    toolSearch: {
      mode: "code",
      codeTimeoutMs: 10000,
      searchDefaultLimit: 8,
      maxSearchLimit: 20,
    },
  },
}
```

停用它：

```json5
{
  tools: {
    toolSearch: false,
  },
}
```

## 提示和遙測

工具搜尋會記錄足夠的遙測資料，以便與直接工具公開進行比較：

- 傳送到線具的序列化工具和提示位元組總數
- 目錄大小和來源細分
- 搜尋、描述和呼叫計數
- 透過 OpenClaw 執行的最終工具呼叫
- 選取的工具 ID 和來源

工作階段記錄應該能夠回答：

- 模型最初看到了多少個工具結構描述
- 它執行了多少次搜尋和描述操作
- 呼叫了哪個最終工具
- 結果是來自 OpenClaw、MCP 還是用戶端工具

## E2E 驗證

Gateway E2E 執行器使用 OpenClaw 執行時驗證了這兩種路徑：

```bash
node --import tsx scripts/tool-search-gateway-e2e.ts
```

它會建立一個具有大型工具目錄的暫時性假外掛程式，啟動模擬 OpenAI 提供者，啟動一次直接模式的閘道並啟動一次啟用工具搜尋的閘道，然後比較提供者要求承載和工作階段記錄。

回歸測試證明：

1. 直接模式可以呼叫假外掛程式工具。
2. 工具搜尋可以呼叫相同的假外掛程式工具。
3. 直接模式會將假外掛程式工具結構描述直接公開給提供者。
4. 工具搜尋僅公開緊湊的橋接器。
5. 對於大型假目錄，工具搜尋要求承載較小。
6. 工作階段記錄顯示預期的工具呼叫計數和橋接呼叫遙測。

## 失敗行為

Tool Search 應該失敗關閉：

- 如果工具不在有效策略中，搜尋不應該傳回它
- 如果選取的工具變成無法使用，`tool_call` 應該失敗
- 如果策略或審核阻擋了執行，呼叫結果應該回報該阻擋，而不是繞過它
- 如果 code bridge 無法建立隔離執行時，請使用 `mode: "tools"` 或針對該部署停用 Tool Search

## 相關

- [工具和外掛程式](/zh-Hant/tools)
- [多代理沙箱與工具](/zh-Hant/tools/multi-agent-sandbox-tools)
- [Exec 工具](/zh-Hant/tools/exec)
- [ACP 代理設定](/zh-Hant/tools/acp-agents-setup)
- [建置外掛程式](/zh-Hant/plugins/building-plugins)
