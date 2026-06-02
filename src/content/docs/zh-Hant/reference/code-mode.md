---
summary: "OpenClaw 程式碼模式：一個由 QuickJS-WASI 支援的選用 exec/wait 工具介面，以及一個隱藏的執行範圍工具目錄"
title: "程式碼模式"
sidebarTitle: "程式碼模式"
read_when:
  - You want to enable OpenClaw code mode for an agent run
  - You need to explain why code mode is different from Codex Code mode
  - You are reviewing the exec/wait contract, QuickJS-WASI sandbox, TypeScript transform, or hidden tool-catalog bridge
  - You are adding or reviewing an internal code-mode namespace registry integration
---

程式碼模式是一個實驗性的 OpenClaw 代理程式執行時功能。預設為關閉。當您啟用它時，OpenClaw 會改變模型在單次執行中所看到的內容：模型不會直接看到每個已啟用的工具架構，而是只會看到 `exec` 和 `wait`。

本頁面記錄了 OpenClaw 程式碼模式。它不是 Codex 程式碼模式。這兩個功能共用一個名稱，但它們是由不同的執行時實作的，並暴露不同的 `exec` 契約：

- Codex 程式碼模式預設為 Codex 應用程式伺服器執行緒啟用，除非受限制的工具政策停用了原生程式碼模式。它在 Codex 編寫工具中執行，模型透過 `exec.command` 契約撰寫 Shell 指令。
- 除非設定 `tools.codeMode.enabled: true`，否則 OpenClaw 程式碼模式為停用狀態。它在 OpenClaw 通用代理程式執行時中執行，模型透過 `exec.code` 契約撰寫 JavaScript 或 TypeScript 程式。

Codex 程式碼模式和 Codex 原生動態工具搜尋是穩定的 Codex 工具介面。OpenClaw 程式碼模式是一個 OpenClaw 擁有的實驗性工具介面轉接器，用於通用的 OpenClaw 執行。它使用 `quickjs-wasi`、一個隱藏的 OpenClaw 工具目錄以及正常的 OpenClaw 工具執行器。

## 這是什麼？

OpenClaw 程式碼模式讓模型撰寫一小段 JavaScript 或 TypeScript 程式，而不是從冗長的工具清單中直接選擇。

當程式碼模式啟用時：

- 模型可見的工具列表僅包含 `exec` 和 `wait`。
- `exec` 在受限的 QuickJS-WASI Worker 中評估模型產生的 JavaScript 或 TypeScript。
- 正常的 OpenClaw 工具會對模型提示隱藏，並透過 `ALL_TOOLS` 和 `tools` 在客體程式內部暴露。
- 客體程式碼可以搜尋隱藏的目錄、描述工具，並透過與一般代理程式回合相同的 OpenClaw 執行路徑來呼叫工具。
- 當巢狀工具呼叫仍在待處理時，`wait` 會恢復暫停的程式碼模式執行。

重要的區別：程式碼模式改變的是面向模型的協調介面。它並不取代 OpenClaw 工具、外掛工具、MCP 工具、驗證、核准政策、頻道行為或模型選擇。

## 為什麼這很好？

程式碼模式讓大型工具目錄更容易供模型使用。

- 更小的提示介面：提供者接收的是兩個控制工具，而非數十或數百個完整的工具 schema。
- 更好的協作：模型可以在一個代碼單元格內使用循環、聯接、小型轉換、條件邏輯和平行嵌套工具調用。
- 提供商中立：它適用於 OpenClaw、插件、MCP 和客戶端工具，而不依賴於提供商原生的代碼執行。
- 現有策略保持有效：嵌套工具調用仍需經過 OpenClaw 策略、審批、掛鉤、會話上下文和審計路徑。
- 明確的失敗模式：當明確啟用代碼模式但運行時不可用時，OpenClaw 會失敗關閉，而不是退回到廣泛的直接工具暴露。

代碼模式對於擁有大量已啟用工具目錄的代理，或在產生答案之前需要反覆搜索、組合和調用工具的工作流程，特別有用。

## 如何啟用它

將 `tools.codeMode.enabled: true` 新增至代理程式或執行時設定：

```json5
{
  tools: {
    codeMode: {
      enabled: true,
    },
  },
}
```

也接受簡寫形式：

```json5
{
  tools: {
    codeMode: true,
  },
}
```

當省略 `tools.codeMode`、設為 `false` 或是沒有 `enabled: true` 的物件時，代碼模式保持關閉。

當您需要更嚴格的限制時，請使用明確的限制：

```json5
{
  tools: {
    codeMode: {
      enabled: true,
      timeoutMs: 10000,
      memoryLimitBytes: 67108864,
      maxOutputBytes: 65536,
      maxSnapshotBytes: 10485760,
      maxPendingToolCalls: 16,
      snapshotTtlSeconds: 900,
      searchDefaultLimit: 8,
      maxSearchLimit: 50,
    },
  },
}
```

要在調試時確認模型負載形狀，請使用目標日誌記錄運行網關：

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
openclaw gateway
```

啟用代碼模式後，記錄的模型可見工具名稱應為 `exec` 和 `wait`。如果您需要經過編輯的提供者負載，請加入 `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted` 以進行短暫的除錯會話。

## 技術概覽

本頁其餘部分描述運行時契約和實現細節。它旨在供維護者、調試工具暴露的插件作者以及驗證高風險部署的操作員使用。

## 運行時狀態

- 執行階段：[`quickjs-wasi`](https://github.com/vercel-labs/quickjs-wasi)。
- 默認狀態：已禁用。
- 穩定性：實驗性 OpenClaw 表面；Codex 代碼模式是一個獨立的穩定 Codess 表面。
- 目標表面：通用 OpenClaw 代理運行。
- 安全姿態：模型代碼是敵對的。
- 面向用戶的承諾：啟用代碼模式絕不會無聲地退回到廣泛的直接工具暴露。

## 範圍

代碼模式擁有準備運行的面向模型的協作形狀。它不擁有模型選擇、通道行為、身份驗證、工具策略或工具實現。

範圍內：

- 模型可見的 `exec` 和 `wait` 工具定義
- 隱藏工具目錄建構
- JavaScript 和 TypeScript 執行體執行
- QuickJS-WASI Worker 運行時
- 用於目錄搜尋、Schema 描述和工具呼叫的主機回呼
- 暫停之執行體程式的可恢復狀態
- 輸出、逾時、記憶體、暫止呼叫和快照限制
- 巢狀工具呼叫的遙測和軌跡投影

超出範圍：

- 提供者原生的遠端程式碼執行
- Shell 執行語意
- 變更現有工具授權
- 持久化的使用者撰寫腳本
- 執行體程式碼中的套件管理員、檔案、網路或模組存取
- 直接重複使用 Codex Code 模式內部元件

提供者擁有的工具（例如遠端 Python 沙箱）保持為獨立工具。請參閱[代碼執行](/zh-Hant/tools/code-execution)。

## 術語

**代碼模式** 是一種 OpenClaw 執行階段模式，它會隱藏一般的模型工具，並僅公開 `exec` 和 `wait`。

**Guest runtime**（執行體運行時）是用來評估模型程式碼的 QuickJS-WASI JavaScript VM。

**Host bridge**（主機橋接器）是從執行體程式碼
回傳至 OpenClaw 的狹窄 JSON 相容回呼介面。

**Catalog**（目錄）是經過一般工具政策、外掛程式、MCP 和用戶端工具解析後，執行範圍內的有效工具清單。

**Nested tool call**（巢狀工具呼叫）是透過主機橋接器從執行體程式碼發出的工具呼叫。

**快照** 是已序列化的 QuickJS-WASI VM 狀態，儲存後可讓 `wait` 繼續執行暫停的代碼模式執行。

## 組態

`tools.codeMode.enabled` 是啟用閘道。設定其他代碼模式欄位並不會啟用此功能。

支援的欄位：

- `enabled`：布林值。預設值為 `false`。僅在 `true` 時啟用代碼模式。
- `runtime`：`"quickjs-wasi"`。唯一支援的執行階段。
- `mode`：`"only"`。公開 `exec` 和 `wait`，並隱藏一般的模型工具。
- `languages`：`"javascript"` 和 `"typescript"` 的陣列。預設包含兩者。
- `timeoutMs`：單一 `exec` 或 `wait` 的牆鐘上限。預設值為 `10000`。執行階段限制：`100` 到 `60000`。
- `memoryLimitBytes`：QuickJS 堆積上限。預設值為 `67108864`。執行階段限制：`1048576` 到 `1073741824`。
- `maxOutputBytes`：傳回的文字、JSON 和日誌的大小上限。預設為 `65536`。
  執行時限制：`1024` 到 `10485760`。
- `maxSnapshotBytes`：序列化 VM 快照的大小上限。預設為 `10485760`。
  執行時限制：`1024` 到 `268435456`。
- `maxPendingToolCalls`：並行巢狀工具呼叫的數量上限。預設為 `16`。
  執行時限制：`1` 到 `128`。
- `snapshotTtlSeconds`：已暫停的 VM 可以被恢復的時間長度。預設為 `900`。
  執行時限制：`1` 到 `86400`。
- `searchDefaultLimit`：預設的隱藏目錄搜尋結果數量。預設為 `8`。
  執行時會將其限制為 `maxSearchLimit`。
- `maxSearchLimit`：最大的隱藏目錄搜尋結果數量。預設為 `50`。
  執行時限制：`1` 到 `50`。

如果啟用了代碼模式但 QuickJS-WASI 無法載入，OpenClaw 將對該次執行採取封閉失敗策略。它不會以靜默方式將一般工具作為後備方案暴露出來。

## 啟用

代碼模式是在確定有效工具政策之後，且在組裝最終模型請求之前進行評估的。

啟用順序：

1. 解析代理、模型、提供者、沙箱、通道、發送者和執行政策。
2. 建置有效的 OpenClaw 工具列表。
3. 新增合格的插件、MCP 和客戶端工具。
4. 套用允許和拒絕政策。
5. 如果 `tools.codeMode.enabled` 為 false，則繼續正常的工具公開。
6. 如果已啟用且工具在執行期間處於啟用狀態，則在程式碼模式目錄中註冊有效工具。
7. 從模型可見的工具清單中移除所有一般工具。
8. 新增 code-mode `exec` 和 `wait`。

故意沒有工具的執行，例如原始模型呼叫、`disableTools` 或空的允許清單，即使設定中包含 `tools.codeMode.enabled: true`，也不會啟動 code-mode 介面。

程式碼模式目錄的範圍是單次執行。它不得洩漏來自其他代理、工作階段、發送者或執行的工具。

## 模型可見的工具

當程式碼模式啟用時，模型將只能看到這些頂層工具：

- `exec`
- `wait`

所有其他已啟用的工具將從面向模型的工作清單中隱藏，並註冊在程式碼模式目錄中。

模型應使用 `exec` 進行工具編排、資料連接、迴圈、並行巢狀呼叫和結構化轉換。只有當 `exec` 傳回可恢復的 `waiting` 結果時，模型才應使用 `wait`。

## `exec`

`exec` 啟動一個 code-mode 儲存格並傳回一個結果。輸入的程式碼是由模型生成的，必須將其視為惡意程式碼。

輸入：

```typescript
type CodeModeExecInput = {
  code?: string;
  command?: string;
  language?: "javascript" | "typescript";
};
```

輸入規則：

- `code` 或 `command` 其中之一必須不為空。
- `code` 是記載於文件中供模型使用的欄位。
- `command` 被接受為 hook 原則和受信任重寫的 exec 相容別名；當兩者同時存在時，值必須相符。
- 外部 code-mode `exec` hook 事件包含 `toolKind: "code_mode_exec"`，且當輸入語言已知時包含 `toolInputKind: "javascript" | "typescript"`，因此原則可以區分 code-mode 儲存格與共用相同工具名稱的 shell 風格 `exec` 呼叫。
- `language` 預設為 `"javascript"`。
- 如果 `language` 是 `"typescript"`，OpenClaw 會在評估前進行轉譯。
- `exec` 在 v1 中拒絕 `import`、`require`、動態匯入和模組載入器模式。
- `exec` 不會遞迴地暴露正常 shell `exec` 實作。

結果：

```typescript
type CodeModeResult = CodeModeCompletedResult | CodeModeWaitingResult | CodeModeFailedResult;

type CodeModeCompletedResult = {
  status: "completed";
  value: unknown;
  output?: CodeModeOutput[];
  telemetry: CodeModeTelemetry;
};

type CodeModeWaitingResult = {
  status: "waiting";
  runId: string;
  reason: "pending_tools" | "yield";
  pendingToolCalls?: CodeModePendingToolCall[];
  output?: CodeModeOutput[];
  telemetry: CodeModeTelemetry;
};

type CodeModeFailedResult = {
  status: "failed";
  error: string;
  code?: CodeModeErrorCode;
  output?: CodeModeOutput[];
  telemetry: CodeModeTelemetry;
};
```

當 QuickJS VM 以可恢復狀態暫停時，`exec` 會傳回 `waiting`。結果包含一個用於 `wait` 的 `runId`。

`exec` 僅在 guest VM 沒有待處理工作且最終值在 OpenClaw 的輸出配接器執行後與 JSON 相容時，才傳回 `completed`。

## `wait`

`wait` 繼續一個已暫停的 code-mode VM。

輸入：

```typescript
type CodeModeWaitInput = {
  runId: string;
};
```

輸出與 `exec` 傳回的 `CodeModeResult` 聯集相同。

`wait` 的存在是因為巢狀 OpenClaw 工具可能會很慢、需要互動、需要核准閘道，或是串流部分更新。模型不需要在主機等待外部工作時保持一個長時間的 `exec` 呼叫處於開啟狀態。

QuickJS-WASI 快照與還原是 v1 的恢復機制：

1. `exec` 評估程式碼直到完成、失敗或暫停。
2. 暫停時，OpenClaw 會對 QuickJS VM 建立快照並記錄待處理的主機工作。
3. 當待處理工作安定下來後，`wait` 會還原 VM 快照。
4. OpenClaw 會透過穩定名稱重新註冊主機回呼。
5. OpenClaw 將巢狀工具結果傳遞至還原的 VM 中。
6. OpenClaw 會排清 QuickJS 的待處理工作。
7. `wait` 回傳 `completed`、`failed` 或另一個 `waiting` 結果。

快照屬於執行時狀態，而非使用者產出成果。它們有大小限制、會過期，且範圍限定在建立它們的執行和會話。

當發生以下情況時，`wait` 會失敗：

- `runId` 未知。
- 快照已過期。
- 父執行或會話已中止。
- 呼叫者不在相同的執行/會話範圍內。
- QuickJS-WASI 還原失敗。
- 還原將超過設定的限制。

## Guest runtime API

Guest runtime 會公開一個小型全域 API：

```typescript
declare const ALL_TOOLS: ToolCatalogEntry[];
declare const tools: ToolCatalog;
declare const namespaces: Record<string, unknown>;

declare function text(value: unknown): void;
declare function json(value: unknown): void;
declare function yield_control(reason?: string): Promise<void>;
```

`ALL_TOOLS` 是執行範圍目錄的精簡元數據。預設情況下，它不包含完整的架構。

```typescript
type ToolCatalogEntry = {
  id: string;
  name: string;
  label?: string;
  description: string;
  source: "openclaw" | "plugin" | "mcp" | "client";
  sourceName?: string;
};
```

只有在需要時才會載入完整的 schema：

```typescript
type ToolCatalogEntryWithSchema = ToolCatalogEntry & {
  parameters: unknown;
};
```

Catalog 輔助函式：

```typescript
type ToolCatalog = {
  search(query: string, options?: { limit?: number }): Promise<ToolCatalogEntry[]>;
  describe(id: string): Promise<ToolCatalogEntryWithSchema>;
  call(id: string, input?: unknown): Promise<unknown>;
  [safeToolName: string]: unknown;
};
```

只有在明確且安全的名稱下，才會安裝便利的工具函式：

```typescript
const files = await tools.search("read local file");
const fileRead = await tools.describe(files[0].id);
const content = await tools.call(fileRead.id, { path: "README.md" });

// If the hidden catalog has an unambiguous `web_search` entry:
const hits = await tools.web_search({ query: "OpenClaw code mode" });
```

Guest runtime 絕不能直接公開 host 物件。輸入和輸出會以具有明確大小上限的 JSON 相容值形式通過橋接器。

## 內部命名空間

內部命名空間為代碼模式提供了簡潔的領域 API，而無需增加更多模型可見的工具。載入器擁有的集成可以註冊一個命名空間，例如 `Issues`、`Fictions` 或 `Calendar`；然後客戶端代碼可以在 QuickJS 程序內調用該命名空間，而 OpenClaw 向模型仍然只顯示 `exec` 和 `wait`。

命名空間目前是內部的。沒有公開的插件 SDK 命名空間 API：外部插件命名空間需要載入器擁有的契約，以防止插件身分、已安裝清單、授權狀態和緩存的目錄描述符與支持該命名空間的插件工具不同步。核心代碼模式僅擁有沙箱、序列化、目錄門控和橋接調度。

然後客戶端代碼可以使用直接全局變量或 `namespaces` 映射：

```javascript
const open = await Issues.list({ state: "open" });
const alsoOpen = await namespaces.Issues.list({ state: "open" });
return { count: open.length, alsoCount: alsoOpen.length };
```

### 註冊表生命週期

命名空間註冊表是進程本地的，並以命名空間 ID 為鍵。典型的執行路徑如下：

1. 受信任的載入器調用 `registerCodeModeNamespaceForPlugin(pluginId, registration)`。
2. 代碼模式為該次執行創建隱藏的 `ToolSearchRuntime` 並讀取其執行範圍目錄。
3. `createCodeModeNamespaceRuntime(ctx, catalog)` 僅保留那些其 `requiredToolNames` 均可見且屬於同一 `pluginId` 的註冊項。
4. 每個可見的命名空間都會為當前執行調用 `createScope(ctx)`。該範圍會接收執行上下文，例如 `agentId`、`sessionKey`、`sessionId`、`runId`、配置和中止狀態。
5. 範圍數據被序列化為一個簡單的描述符，並作為直接全局變量和 `namespaces.<globalName>` 注入到 QuickJS 中。
6. 來源呼叫透過 worker 橋接暫停，在主機上解析命名空間路徑，將呼叫映射到已聲明的 plugin 擁有的 catalog 工具，並透過 `ToolSearchRuntime.call` 執行該工具。
7. 當 code-mode 執行因巢狀工具工作而暫停時，`wait` 會恢復相同的命名空間執行時期。
8. Plugin 回復或解除安裝會呼叫 `clearCodeModeNamespacesForPlugin(pluginId)`，以免過時的全域變數在 plugin 載入失敗後殘留。

重要不變性：命名空間呼叫即是 catalog 工具呼叫。它們使用與 `tools.call(...)` 相同的政策掛鉤、核准、中止處理、遙測、文字記錄投影，以及暫停/恢復行為。

### 註冊形狀

從擁有後備工具的整合註冊命名空間。保持範圍狹小，且僅公開映射到已聲明 catalog 工具的網域動詞。

```typescript
import { createCodeModeNamespaceTool, registerCodeModeNamespaceForPlugin } from "../agents/code-mode-namespaces.js";

const pluginId = "github";

registerCodeModeNamespaceForPlugin(pluginId, {
  id: "github-issues",
  globalName: "Issues",
  description: "GitHub issue helpers for the current repository.",
  requiredToolNames: ["github_list_issues", "github_update_issue"],
  prompt: "Use Issues.list(params) and Issues.update(number, patch).",
  createScope: (ctx) => ({
    repository: ctx.config,
    list: createCodeModeNamespaceTool("github_list_issues", ([params]) => params ?? {}),
    update: createCodeModeNamespaceTool("github_update_issue", ([number, patch]) => ({
      number,
      patch,
    })),
  }),
});
```

`createCodeModeNamespaceTool(toolName, inputMapper)` 將範圍成員標記為可呼叫的命名空間函數。選用的 `inputMapper` 會接收來源引數並傳回後備 catalog 工具的輸入物件。若沒有輸入對應器，則使用第一個來源引數；若省略則使用 `{}`。

原始主機函數會在來源程式碼執行前被拒絕：

```typescript
createScope: () => ({
  // Wrong: this bypasses the catalog tool lifecycle and will be rejected.
  list: async () => githubClient.listIssues(),
});
```

### 擁有權與可見性

命名空間擁有權綁定至註冊呼叫者的 `pluginId`。`requiredToolNames` 既是可見性閘道，也是擁有權檢查：

- 每個必要工具都必須存在於執行 catalog 中
- 每個必要工具都必須擁有 `sourceName === pluginId`
- 當任何必要工具不存在或由另一個 plugin 擁有時，該命名空間會被隱藏
- 每個可呼叫路徑只能以 `requiredToolNames` 中命名的工具為目標

這可防止另一個 plugin 透過註冊同名工具來公開命名空間。這也能讓命名空間與一般 agent 政策保持一致：如果執行無法看到後備工具，就無法看到該命名空間。

例如，GitHub 命名空間應位於 GitHub 擁有的擴充功能之後，該擴充功能擁有 GitHub 驗證、REST 或 GraphQL 用戶端、速率限制、寫入核准和測試。核心 code mode 不應內嵌 GitHub 特定的 API、權杖處理或提供者政策。

### 範圍序列化規則

`createScope(ctx)` 可能會返回一個包含 JSON 相容值的普通物件，
陣列、巢狀物件和 `createCodeModeNamespaceTool(...)` 呼叫標記。
Host 物件從不直接進入 QuickJS。

序列化程式會拒絕：

- 原始函式
- 循環物件圖
- 不安全的路徑區段：`__proto__`、`constructor`、`prototype`、空鍵，或
  包含內部路徑分隔符的鍵
- 不是 JavaScript 識別元的 `globalName` 值
- 與內建程式碼模式全域變數發生衝突的 `globalName`，例如 `tools`、
  `namespaces`、`text`、`json`、`yield_control` 或 `__openclaw*`

無法進行 JSON 序列化的值在跨越橋接之前會被轉換為 JSON 安全的後備值。
二進位資料、控制代碼、 sockets、客戶端和類別實例應保留在普通目錄工具後面。

### 提示

命名空間 `description` 和可選的 `prompt` 只有在該執行中命名空間可見時
才會附加到模型可見的 `exec` schema 中。使用它們來教授
最小且有用的表面：

```typescript
{
  description: "Fiction production service helpers.",
  prompt:
    "Use Fictions.riskAudit(), Fictions.promoteIfReady(id, status), and Fictions.unpaidOver(amount).",
}
```

提示應保持與命名空間合約相關，而非授權設定、實作歷史或無關的外掛行為。

### 清理

命名空間是程序本機註冊項。當擁有該命名空間的外掛被停用、解除安裝或回滾時，請將其移除：

```typescript
clearCodeModeNamespacesForPlugin(pluginId);
```

僅在移除一個已知命名空間時使用 `unregisterCodeModeNamespace(namespaceId)`。測試可以呼叫
`clearCodeModeNamespacesForTest()` 以避免在測試案例之間洩漏註冊項。

### 測試檢查清單

命名空間變更應涵蓋安全邊界和客體行為：

- 命名空間提示文字僅在支援工具可見時出現
- 來自另一個 `sourceName` 的同名工具不會公開命名空間
- 原始範圍函式會被拒絕
- 偽造的命名空間 ID 和偽造的路徑會被拒絕
- 可呼叫路徑無法以未宣告的工具為目標
- 巢狀物件和共享參照能正確序列化
- 命名空間呼叫透過目錄工具執行並返回 JSON 安全的詳細資訊
- 失敗可以由客戶端代碼捕獲
- 暫停的命名空間呼叫通過 `wait` 恢復
- 外掛程式回滾會清除擁有命名空間的註冊

命名空間是通用 `tools.search` / `tools.call` 目錄的補充。請使用目錄來處理任意已啟用的工具；對於外掛程式擁有、具有文件說明的領域 API，請使用命名空間，因為在這種情況下，簡潔的代碼比重複的 Schema 查詢更可靠。

## 輸出 API

`text(value)` 將人類可讀的輸出附加到 `output` 陣列。

`json(value)` 在 JSON 相容序列化之後附加一個結構化輸出項目。

客戶端代碼的最終返回值會成為 `completed` 結果中的 `value`。

輸出項目：

```typescript
type CodeModeOutput = { type: "text"; text: string } | { type: "json"; value: unknown };
```

輸出規則：

- 輸出順序與客戶端呼叫相符
- 輸出受 `maxOutputBytes` 限制
- 不可序列化的值會轉換為純字串或錯誤
- v1 版本不支援二進位值
- 圖像和檔案透過普通的 OpenClaw 工具傳輸，而不透過
  代碼模式橋接器

## 工具目錄

隱藏目錄包含在有效策略篩選之後的工具：

1. OpenClaw 核心工具。
2. 捆綁的外掛程式工具。
3. 外部外掛程式工具。
4. MCP 工具。
5. 用戶端為當前執行提供的工具。

目錄 ID 在單次執行內是穩定的，且在等效工具集之間盡可能具有確定性。

建議的 ID 形狀：

```text
<source>:<owner>:<tool-name>
```

範例：

```text
openclaw:core:message
plugin:browser:browser_request
mcp:github:create_issue
client:app:select_file
```

目錄省略了代碼模式控制工具：

- `exec`
- `wait`
- `tool_search_code`
- `tool_search`
- `tool_describe`
- `tool_call`

這防止了遞迴，並保持面向模型的合約狹窄。

## 工具搜尋互動

對於啟用的執行，代碼模式取代了 OpenClaw 工具搜尋模型表面。

當 `tools.codeMode.enabled` 為 true 且代碼模式啟用時：

- OpenClaw 不會將 `tool_search_code`、`tool_search`、`tool_describe`
  或 `tool_call` 作為模型可見的工具公開。
- 相同的目錄概念移至客戶端執行環境內部。
- 客體執行時接收緊湊的 `ALL_TOOLS` 元資料以及搜尋、描述和呼叫輔助程式。
- 巢狀呼叫透過與工具搜尋相同的 OpenClaw 執行器路徑進行調度。

現有的 [工具搜尋](/zh-Hant/tools/tool-search) 頁面描述了 OpenClaw 的緊湊目錄橋接。程式碼模式是可使用 `exec` 和 `wait` 的執行作業的通用 OpenClaw 替代方案。

## 工具名稱與衝突

模型可見的 `exec` 工具是程式碼模式工具。如果啟用了正常的 OpenClaw shell `exec` 工具，它會對模型隱藏，並像其他工具一樣被編目。

在客體執行時內部：

- 如果策略允許，`tools.call("openclaw:core:exec", input)` 可以呼叫 shell exec 工具。
- 僅當 shell exec 目錄條目具有明確的安全名稱時，才會安裝 `tools.exec(...)`。
- 程式碼模式 `exec` 工具絕不會透過 `tools` 遞迴提供。

如果兩個工具正規化為相同的安全便利名稱，OpenClaw 將省略便利函式並要求使用 `tools.call(id, input)`。

## 巢狀工具執行

每個巢狀工具呼叫都會跨越主機橋接並重新進入 OpenClaw。

巢狀執行會保留：

- 作用中的代理程式 ID
- 工作階段 ID 和工作階段金鑰
- 發送者和通道上下文
- 沙箱策略
- 核准策略
- 外掛程式 `before_tool_call` 掛鉤
- 中止訊號
- 可用的串流更新
- 軌跡和稽核事件

巢狀呼叫會在記錄中投影為真實的工具呼叫，以便支援套件可以顯示發生了什麼。投影會識別父層程式碼模式工具呼叫和巢狀工具 ID。

允許最多 `maxPendingToolCalls` 個並行巢狀呼叫。

## 執行時狀態

每個程式碼模式執行都有一個狀態機：

- `running`：VM 正在執行或巢狀呼叫正在進行中。
- `waiting`：VM 快照存在，且可使用 `wait` 恢復。
- `completed`：已傳回最終值；已刪除快照。
- `failed`：已傳回錯誤；已刪除快照。
- `expired`：快照或擱置狀態超過保留期限；無法恢復。
- `aborted`：父執行/會話已取消；快照已刪除。

狀態的範圍由代理執行、會話和工具呼叫 ID 決定。來自不同執行或會話的 `wait` 呼叫將會失敗。

快照儲存空間受限於：

- 每次執行的最大快照位元組數
- 每個程序的最大即時快照數
- 快照 TTL
- 執行結束時清理
- 當不支援持久化時，在 Gateway 關閉時清理

## QuickJS-WASI 執行時

OpenClaw 在所屬套件中將 `quickjs-wasi` 作為直接依賴載入。該執行時不依賴為 proxy、PAC 或其他不相關依賴安裝的傳遞副本。

執行時職責：

- 編譯或載入 QuickJS-WASI WebAssembly 模組
- 為每次程式碼模式執行或恢復建立一個隔離的 VM
- 以穩定的名稱註冊主機回呼
- 設定記憶體和中斷限制
- 執行 JavaScript
- 排空待處理的工作
- 對暫停的 VM 狀態進行快照
- 為 `wait` 恢復快照
- 在終止狀態後釋放 VM 控制代碼和快照

執行時在工作執行緒中於 OpenClaw 主事件迴圈之外執行。客體無限迴圈不得無限期阻擋 Gateway 程序。

## TypeScript

TypeScript 支援僅為來源轉換：

- 接受的輸入：一個 TypeScript 程式碼字串
- 輸出：由 QuickJS-WASI 執行的 JavaScript 字串
- 無類型檢查
- 無模組解析
- v1 中無 `import` 或 `require`
- 診斷資訊作為 `failed` 結果回傳

TypeScript 編譯器僅針對 TypeScript 儲存格延遲載入。純 JavaScript 儲存格和停用的程式碼模式不會載入編譯器。

轉換應在可行的情況下保留有用的行號。

## 安全邊界

模型程式碼具有潛在惡意。執行時採用縱深防禦：

- 在主事件迴圈之外執行 QuickJS-WASI
- 將 `quickjs-wasi` 作為直接依賴載入，而非透過 Codex 或傳遞套件
- 客體中沒有檔案系統、網路、子程序、模組匯入、環境變數或主機全域物件
- 使用 QuickJS 記憶體和中斷限制
- 強制執行父程序實際執行時間逾時
- 執行輸出、快照、日誌和待處理呼叫上限
- 透過狹隘的 JSON 配接器序列化主機橋接器值
- 將主機錯誤轉換為純客體錯誤，絕不使用主機領域物件
- 在逾時、中止、工作階段結束或到期時捨棄快照
- 拒絕對 `exec`、`wait` 和工具搜尋控制工具的遞迴存取
- 防止便利名稱衝突遮蔽目錄輔助程式

沙箱僅是其中一層安全性防護。對於高風險部署，操作員仍可能需要作業系統層級的強化措施。

## 錯誤代碼

```typescript
type CodeModeErrorCode = "runtime_unavailable" | "invalid_config" | "invalid_input" | "unsupported_language" | "typescript_transform_failed" | "module_access_denied" | "timeout" | "memory_limit_exceeded" | "output_limit_exceeded" | "snapshot_limit_exceeded" | "snapshot_expired" | "snapshot_restore_failed" | "too_many_pending_tool_calls" | "nested_tool_failed" | "aborted" | "internal_error";
```

傳回給客體的錯誤是純資料。主機 `Error` 實例、堆疊物件、原型和主機函式不會進入 QuickJS。

## 遙測

程式碼模式會回報：

- 傳送給模型的可見工具名稱
- 隱藏目錄大小和來源細項
- `exec` 和 `wait` 計數
- 巢狀搜尋、描述和呼叫計數
- 已呼叫的巢狀工具 ID
- 逾時、記憶體、快照和輸出上限失敗
- 快照生命週期事件

除了現有的 OpenClaw 軌跡策略外，遙測不得包含機密、原始環境值或未編修的工具輸入。

## 除錯

當程式碼模式的行為與一般工具執行不同時，請使用指定的模型傳輸日誌記錄：

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
OPENCLAW_DEBUG_SSE=events \
openclaw gateway
```

若要針對載荷形狀進行除錯，請使用 `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`。這會記錄模型要求的上限及已編修 JSON 快照；因為提示詞和訊息文字仍可能出現，所以應僅在除錯時使用。

若要針對串流進行除錯，請使用 `OPENCLAW_DEBUG_SSE=peek` 來記錄前五個已編修 SSE 事件。如果在啟用程式碼模式介面後，最終的提供者載荷未精確包含 `exec` 和 `wait`，程式碼模式也會以封閉失敗處理。

## 實作佈局

實作單元：

- 設定合約：`tools.codeMode`
- 目錄建構器：有效工具轉換為精簡項目和 ID 對應
- 模型介面配接器：將可見工具替換為 `exec` 和 `wait`
- QuickJS-WASI 執行時配接器：載入、評估、快照、還原、處置
- 工作器監督器：逾時、中止、當機隔離
- 橋接器配接器：JSON 安全的主機回呼和結果傳遞
- TypeScript 轉換配接器
- 快照儲存：TTL、大小上限、執行/會話範圍
- 巢狀工具呼叫的軌跡投影
- 遙測計數器和診斷

此實作重複使用來自 Tool Search 的目錄 和執行器 概念，但不使用 `node:vm` 子項作為沙盒。

## 驗證檢查清單

代碼模式覆蓋率應證明：

- 停用的配置會讓現有工具的暴露保持不變
- 沒有 `enabled: true` 的物件配置會讓代碼模式維持停用
- 啟用的配置僅會向模型公開 `exec` 和 `wait`，當工具對執行有效時
- 原始無工具執行、`disableTools` 和空的允許清單不會觸發代碼模式強制執行
- 所有有效工具都會出現在 `ALL_TOOLS` 中
- 被拒絕的工具不會出現在 `ALL_TOOLS` 中
- `tools.search`、`tools.describe` 和 `tools.call` 適用於 OpenClaw 工具
- Tool Search 控制工具會對模型表面和隱藏目錄隱藏
- 巢狀呼叫會保留批准和掛鉤 行為
- shell `exec` 會對模型隱藏，但在允許時可透過目錄 ID 呼叫
- 遞迴代碼模式 `exec` 和 `wait` 無法從客體代碼呼叫
- TypeScript 輸入會被轉換並評估，而不會在停用或僅 JavaScript 路徑上載入 TypeScript
- `import`、`require`、檔案系統、網路和環境存取都會失敗
- 無限迴圈會逾時，並且無法阻擋 Gateway
- 記憶體上限失敗會終止客體 VM
- 輸出和快照上限會對已完成和已暫停的呼叫執行
- `wait` 會恢復已暫停的快照並傳回最終值
- 已過期、已中止、錯誤會話 和未知的 `runId` 值都會失敗
- 文字記錄重播 和持久性會保留代碼模式控制呼叫
- 文字記錄和遙測會清楚顯示巢狀工具呼叫

## E2E 測試計畫

在變更執行時期時，將這些作為整合或端對端測試執行：

1. 使用 `tools.codeMode.enabled: false` 啟動 Gateway。
2. 發送一個帶有小型直接工具集的 agent 週期。
3. 斷言模型可見的工具保持不變。
4. 使用 `tools.codeMode.enabled: true` 重新啟動。
5. 發送一個包含 OpenClaw、plugin、MCP 和 client 測試工具的 agent 週期。
6. 斷言模型可見的工具列表確切為 `exec`、`wait`。
7. 在 `exec` 中，讀取 `ALL_TOOLS` 並斷言有效的測試工具存在。
8. 在 `exec` 中，呼叫 `tools.search`、`tools.describe` 和 `tools.call`。
9. 斷言被拒絕的工具不存在，且無法通過猜測的 id 呼叫。
10. 啟動一個巢狀工具呼叫，該呼叫在 `exec` 返回 `waiting` 後解析。
11. 呼叫 `wait` 並斷言還原的 VM 接收到工具結果。
12. 斷言最終答案包含還原後產生的輸出。
13. 斷言逾時、中止和快照到期會清理運行時狀態。
14. 匯出軌跡並斷言巢狀呼叫在父代 code-mode 呼叫下可見。

僅文檔變更至本頁面仍應執行 `pnpm check:docs`。

## 相關

- [工具搜尋](/zh-Hant/tools/tool-search)
- [Agent 執行時](/zh-Hant/concepts/agent-runtimes)
- [Exec 工具](/zh-Hant/tools/exec)
- [程式碼執行](/zh-Hant/tools/code-execution)
