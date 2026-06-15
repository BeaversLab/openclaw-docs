---
summary: "OpenClaw 程式碼模式：一個選用的 exec/wait 工具介面，由 QuickJS-WASI 和隱藏的執行範圍工具目錄支援"
title: "程式碼模式"
sidebarTitle: "程式碼模式"
read_when:
  - You want to enable OpenClaw code mode for an agent run
  - You need to explain why code mode is different from Codex Code mode
  - You are reviewing the exec/wait contract, QuickJS-WASI sandbox, TypeScript transform, or hidden tool-catalog bridge
  - You are adding or reviewing an internal code-mode namespace registry integration
---

程式碼模式是一個實驗性的 OpenClaw 代理執行時功能。它預設為關閉。當您啟用它時，OpenClaw 會改變模型在一次執行中看到的內容：模型不會直接看到每個已啟用的工具架構，而是只會看到
`exec` 和 `wait`。

此頁面記錄了 OpenClaw 程式碼模式。它不是 Codex 程式碼模式。這兩個功能共用一個名稱，但它們是由不同的執行時實作的，並公開不同的 `exec` 合約：

- 除非受限的工具策略停用了原生程式碼模式，否則 Codex 程式碼模式會針對 Codex 應用伺服器執行緒啟用。它運作於 Codex 編程線束 中，模型透過 `exec.command` 合約撰寫 shell 指令。
- 除非設定 `tools.codeMode.enabled: true`，否則 OpenClaw 程式碼模式為停用狀態。它運作於 OpenClaw 通用代理執行時中，模型透過 `exec.code` 合約撰寫 JavaScript 或 TypeScript 程式。

Codex 程式碼模式和 Codex 原生動態工具搜尋是穩定的 Codex 線束介面。OpenClaw 程式碼模式是一個 OpenClaw 擁有的實驗性工具介面轉接器，用於通用 OpenClaw 執行。它使用 `quickjs-wasi`、一個隱藏的 OpenClaw 工具目錄，以及正常的 OpenClaw 工具執行器。

## 這是什麼？

OpenClaw 程式碼模式讓模型撰寫一小段 JavaScript 或 TypeScript 程式，而不是從冗長的工具清單中直接選擇。

當程式碼模式啟用時：

- 模型可見的工具列表完全包含 `exec` 和 `wait`。
- `exec` 在受限制的 QuickJS-WASI worker 中評估模型生成的 JavaScript 或 TypeScript。
- 正常的 OpenClaw 工具會對模型提示隱藏，並透過 `ALL_TOOLS` 和 `tools` 在客體程式內公開。
- 客體程式碼可以搜尋隱藏的目錄、描述工具，並透過與一般代理程式回合相同的 OpenClaw 執行路徑來呼叫工具。
- MCP 工具被分組在 `MCP` 命名空間下。在程式碼模式中，此命名空間是呼叫 MCP 工具唯一支援的方式。
- 當巢狀工具呼叫仍待處理時，`wait` 會恢復已暫停的程式碼模式執行。

重要的區別在於：代碼模式改變了面向模型的編排表面。它並不取代 OpenClaw 工具、插件工具、MCP 工具、身份驗證、審批策略、通道行為或模型選擇。

## 為什麼這很好？

代碼模式使大型工具目錄更易於模型使用。

- 更小的提示表面：提供者收到兩個控制工具，而不是幾十個或數百個完整的工具架構。
- 更好的編排：模型可以在一個代碼單元內使用循環、連接、小型轉換、條件邏輯和並行嵌套工具調用。
- 與提供者無關：它適用於 OpenClaw、插件、MCP 和客戶端工具，而不依賴於提供者原生的代碼執行。
- 現有策略保持有效：嵌套工具調用仍然會經過 OpenClaw 策略、審批、鉤子、會話上下文和審計路徑。
- 明確的失敗模式：當顯式啟用代碼模式且運行時不可用時，OpenClaw 會失敗關閉，而不是回退到廣泛的直接工具暴露。

代碼模式對於擁有大量已啟用工具目錄的代理特別有用，或者對於模型在生成答案之前需要反覆搜索、組合和調用工具的工作流程特別有用。

## 如何啟用它

將 `tools.codeMode.enabled: true` 添加到代理或運行時配置中：

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

當省略 `tools.codeMode`、設置為 `false` 或對象不包含 `enabled: true` 時，代碼模式保持關閉。

當您使用配置了 MCP 服務器的沙盒代理時，還要確保沙盒工具策略允許捆綁的 MCP 插件，例如使用 `tools.sandbox.tools.alsoAllow: ["bundle-mcp"]`。請參閱[Configuration - tools and custom providers](/zh-Hant/gateway/config-tools#mcp-and-plugin-tools-inside-sandbox-tool-policy)。

當您需要更嚴格的界限時，請使用顯式限制：

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

要在調試時確認模型負載的形狀，請使用針對性日誌記錄運行 Gateway：

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
openclaw gateway
```

啟用代碼模式後，記錄的面向模型的工具名稱應為 `exec` 和 `wait`。如果您需要經過編輯的提供者負載，請添加 `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted` 以進行短時間的調試會話。

## 技術導覽

本頁其餘部分描述了執行時合約和實作細節。
其目標讀者為維護者、正在調試工具公開的插件作者，以及
正在驗證高風險部署的操作員。

## 執行時狀態

- 執行時：[`quickjs-wasi`](https://github.com/vercel-labs/quickjs-wasi)。
- 預設狀態：停用。
- 穩定性：實驗性的 OpenClaw 介面；Codex Code 模式是一個獨立的穩定
  Codess 套件介面。
- 目標介面：通用 OpenClaw agent 執行。
- 安全姿態：模型程式碼為惡意的。
- 面向使用者的承諾：啟用程式碼模式絕不會無聲地回退到寬泛的
  直接工具公開。

## 範圍

程式碼模式負責已準備執行中面向模型的協調形狀。它不
負責模型選擇、通道行為、身份驗證、工具策略或工具
實作。

範圍內：

- 模型可見的 `exec` 和 `wait` 工具定義
- 隱藏工具目錄建構
- JavaScript 和 TypeScript 客端執行
- QuickJS-WASI worker 執行時
- 用於目錄搜尋、Schema 描述和工具呼叫的主機回呼
- 已暫停客端程式的可恢復狀態
- 輸出、逾時、記憶體、待處理呼叫和快照限制
- 巢狀工具呼叫的遙測和軌跡投影

範圍外：

- 提供者原生的遠端程式碼執行
- Shell 執行語意
- 變更現有工具授權
- 持久的使用者撰寫腳本
- 客端程式碼中的套件管理員、檔案、網路或模組存取
- 直接重用 Codex Code 模式內部

提供者擁有的工具（例如遠端 Python 沙箱）仍為獨立工具。請參閱
[Code execution](/zh-Hant/tools/code-execution)。

## 術語

**程式碼模式** 是隱藏正常模型工具並
僅公開 `exec` 和 `wait` 的 OpenClaw 執行時模式。

**客端執行時** 是評估模型程式碼的 QuickJS-WASI JavaScript VM。

**主機橋接器** 是從客端程式碼
回到 OpenClaw 的狹窄 JSON 相容回呼介面。

**目錄** 是在經過正常工具策略、
插件、MCP 和客戶端工具解析後的執行範圍有效工具清單。

**巢狀工具呼叫** 是透過主機橋接器從客端程式碼發出的工具呼叫。

**Snapshot** 是已序列化的 QuickJS-WASI VM 狀態，已儲存以便 `wait` 能夠繼續
暫停的程式碼模式執行。

## 組態

`tools.codeMode.enabled` 是啟用閘道。設定其他程式碼模式欄位
並不會啟用此功能。

支援的欄位：

- `enabled`: boolean。預設值 `false`。僅當 `true` 時啟用程式碼模式。
- `runtime`: `"quickjs-wasi"`。唯一支援的執行時期。
- `mode`: `"only"`。公開 `exec` 和 `wait`，隱藏正常的模型工具。
- `languages`: `"javascript"` 和 `"typescript"` 的陣列。預設值包含
  兩者。
- `timeoutMs`: 單一 `exec` 或 `wait` 的時鐘上限。預設值 `10000`。
  執行時期限制：`100` 到 `60000`。
- `memoryLimitBytes`: QuickJS 堆積上限。預設值 `67108864`。執行時期限制：
  `1048576` 到 `1073741824`。
- `maxOutputBytes`: 傳回的文字、JSON 和日誌上限。預設值 `65536`。
  執行時期限制：`1024` 到 `10485760`。
- `maxSnapshotBytes`: 已序列化 VM 快照上限。預設值 `10485760`。
  執行時期限制：`1024` 到 `268435456`。
- `maxPendingToolCalls`: 並行巢狀工具呼叫上限。預設值 `16`。
  執行時期限制：`1` 到 `128`。
- `snapshotTtlSeconds`: 暫停的 VM 可以恢復的時間長度。預設值 `900`。
  執行時期限制：`1` 到 `86400`。
- `searchDefaultLimit`: 預設隱藏目錄搜尋結果計數。預設值 `8`。
  執行時會將此值限制為 `maxSearchLimit`。
- `maxSearchLimit`: 最大隱藏目錄搜尋結果計數。預設值 `50`。
  執行時限制：`1` 到 `50`。

如果啟用了代碼模式但無法載入 QuickJS-WASI，OpenClaw 將在該次執行中以失敗關閉。它不會以靜默方式將正常工具作為後備方案公開。

## 啟用

代碼模式在已知有效工具策略之後、組裝最終模型請求之前進行評估。

啟用順序：

1. 解析代理、模型、提供商、沙箱、頻道、發送者和執行策略。
2. 建立有效的 OpenClaw 工具列表。
3. 新增合格的插件、MCP 和客戶端工具。
4. 應用允許和拒絕策略。
5. 如果 `tools.codeMode.enabled` 為 false，則繼續正常公開工具。
6. 如果已啟用且工具在該次執行中處於活躍狀態，則將有效工具註冊到
   代碼模式目錄中。
7. 從模型可見的工具列表中移除所有正常工具。
8. 新增代碼模式 `exec` 和 `wait`。

故意沒有工具的執行，例如原始模型呼叫、`disableTools`，
或空的允許列表，即使配置中包含 `tools.codeMode.enabled: true`，也不會啟用代碼模式介面。

代碼模式目錄的作用域為單次執行。它不得洩漏來自其他代理、
會話、發送者或執行的工具。

## 模型可見工具

當代碼模式處於活躍狀態時，模型將僅看到這些頂層工具：

- `exec`
- `wait`

所有其他已啟用的工具將從面向模型的工具列表中隱藏，並註冊
在代碼模式目錄中。

模型應使用 `exec` 進行工具協調、資料連接、迴圈、
並行巢狀呼叫和結構化轉換。模型應僅在 `exec`
返回可恢復的 `waiting` 結果時使用 `wait`。

## `exec`

`exec` 啟動一個程式碼模式儲存格並回傳一個結果。輸入的程式碼是由模型生成的，必須將其視為惡意程式碼處理。

輸入：

```typescript
type CodeModeExecInput = {
  code?: string;
  command?: string;
  language?: "javascript" | "typescript";
};
```

輸入規則：

- `code` 或 `command` 其中之一必須非空。
- `code` 是已記載的模型面向欄位。
- `command` 被接受為 hook 策略和受信任重寫的 exec 相容別名；當兩者都存在時，其值必須相符。
- 外層程式碼模式 `exec` hook 事件包含 `toolKind: "code_mode_exec"`，並在輸入語言已知時包含 `toolInputKind: "javascript" | "typescript"`，因此策略可以區分程式碼模式儲存格與共用相同工具名稱的 Shell 樣式 `exec` 呼叫。
- `language` 預設為 `"javascript"`。
- 如果 `language` 是 `"typescript"`，OpenClaw 會在評估前進行轉譯。
- `exec` 在 v1 版本中拒絕 `import`、`require`、動態匯入和模組載入器模式。
- `exec` 不會遞迴地公開正常的 Shell `exec` 實作。

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

當 QuickJS VM 以可恢復狀態暫停且仍需要模型可見的延續時，`exec` 會回傳 `waiting`。結果包含 `wait` 的 `runId`。命名空間橋接呼叫，包括 MCP 命名空間呼叫，會在它們就緒時於同一個 `exec`/`wait` 呼叫內自動排空，因此緊湊的程式碼區塊可以檢查 `$api()` 並呼叫 MCP 工具，而無需強制每次命名空間等待進行一次模型工具呼叫。

`exec` 僅在客體 VM 沒有待處理工作且最終值在 OpenClaw 的輸出配接器執行後與 JSON 相容時，才會回傳 `completed`。

## `wait`

`wait` 繼續一個已暫停的程式碼模式 VM。

輸入：

```typescript
type CodeModeWaitInput = {
  runId: string;
};
```

輸出是與 `exec` 回傳的相同 `CodeModeResult` 聯集。

`wait` 的存在是因為巢狀 OpenClaw 工具可能很慢、具有互動性、需經批准閘道，或串流部分更新。當主機等待外部工作時，模型不需要讓一個長時間的 `exec` 呼叫保持開啟。

QuickJS-WASI 快照與還原是 v1 版本的恢復機制：

1. `exec` 會評估程式碼直到完成、失敗或暫停。
2. 暫停時，OpenClaw 會對 QuickJS VM 建立快照並記錄待處理的主機工作。
3. 當待處理工作解決後，`wait` 會還原 VM 快照。
4. OpenClaw 會依穩定名稱重新註冊主機回呼。
5. OpenClaw 會將巢狀工具結果傳遞至已還原的 VM。
6. OpenClaw 會排清 QuickJS 待處理的工作。
7. `wait` 會回傳 `completed`、`failed` 或另一個 `waiting` 結果。

快照是執行時期狀態，而非使用者成果。它們有大小限制、會過期，且範圍限於建立它們的執行和會話。

當發生以下情況時，`wait` 會失敗：

- `runId` 未知。
- 快照已過期。
- 父執行或會話已中止。
- 呼叫者不在相同的執行/會話範圍內。
- QuickJS-WASI 還原失敗。
- 還原會超過設定的限制。

## Guest 執行時期 API

Guest 執行時期公開了一個小型全域 API：

```typescript
declare const ALL_TOOLS: ToolCatalogEntry[];
declare const tools: ToolCatalog;
declare const MCP: Record<string, unknown>;
declare const namespaces: Record<string, unknown>;

declare function text(value: unknown): void;
declare function json(value: unknown): void;
declare function yield_control(reason?: string): Promise<void>;
```

`ALL_TOOLS` 是執行範圍目錄的精簡中繼資料。預設情況下，它不包含完整的綱要。

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

完整綱要僅在需求時載入：

```typescript
type ToolCatalogEntryWithSchema = ToolCatalogEntry & {
  parameters: unknown;
};
```

目錄輔助程式：

```typescript
type ToolCatalog = {
  search(query: string, options?: { limit?: number }): Promise<ToolCatalogEntry[]>;
  describe(id: string): Promise<ToolCatalogEntryWithSchema>;
  call(id: string, input?: unknown): Promise<unknown>;
  [safeToolName: string]: unknown;
};
```

便利工具函數僅針對無歧義的安全名稱安裝：

```typescript
const files = await tools.search("read local file");
const fileRead = await tools.describe(files[0].id);
const content = await tools.call(fileRead.id, { path: "README.md" });

// If the hidden catalog has an unambiguous `web_search` entry:
const hits = await tools.web_search({ query: "OpenClaw code mode" });
```

在程式碼模式下，MCP 目錄項目無法透過 `tools.call(...)` 或便利函數呼叫。它們僅透過生成的 `MCP` 命名空間公開。TypeScript 風格的宣告檔案可透過唯讀的 `API` 虛擬檔案介面取得，因此代理程式可以檢查 MCP 簽章，而無需將 MCP 綱要新增至提示詞：

```typescript
const files = await API.list("mcp");
const githubApi = await API.read("mcp/github.d.ts");

const issue = await MCP.github.createIssue({
  owner: "openclaw",
  repo: "openclaw",
  title: "Investigate gateway logs",
});

const snapshot = await MCP.chromeDevtools.takeSnapshot({ output: "markdown" });
const resource = await MCP.docs.resources.read({ uri: "memo://one" });
const prompt = await MCP.docs.prompts.get({
  name: "brief",
  arguments: { topic: "release" },
});
```

`API.read("mcp/<server>.d.ts")` 會回傳從 MCP 工具中繼資料推斷出的精簡宣告：

```typescript
type McpToolResult = {
  content?: unknown[];
  structuredContent?: unknown;
  isError?: boolean;
  [key: string]: unknown;
};

declare namespace MCP.github {
  /** Return this TypeScript-style API header. */
  function $api(toolName?: string, options?: { schema?: boolean }): Promise<McpApiHeader>;

  /**
   * Create a GitHub issue.
   * @param owner Repository owner
   * @param repo Repository name
   * @param title Issue title
   */
  function createIssue(input: { owner: string; repo: string; title: string; body?: string }): Promise<McpToolResult>;
}
```

聲明檔案是虛擬的，不是寫入工作區或狀態目錄下的檔案。對於每次程式碼模式 `exec` 呼叫，OpenClaw 會建立執行範圍的工具目錄，保留可見的 MCP 條目，渲染 `mcp/index.d.ts` 加上每個可見伺服器的一個 `mcp/<server>.d.ts` 聲明，並將這個小型唯讀表格注入 QuickJS worker。客體程式碼只能看到 `API` 物件：`API.list(prefix?)` 傳回檔案元資料，而 `API.read(path)` 傳回選定的聲明內容。未知的路徑以及 `.` / `..` 片段會被拒絕。

這可以將大型 MCP 結構排除在模型提示詞之外。代理從 `exec` 工具描述中得知虛擬 API 的存在，僅讀取所需的聲明檔案，然後以一個物件引數呼叫 `MCP.<server>.<tool>()`。當代理在程式內需要單一工具結構回應時，`MCP.<server>.$api()` 仍可作為內嵌的備選方案使用。

客體執行環境絕不能直接暴露主機物件。輸入和輸出必須以具有明確大小上限的 JSON 相容值形式通過橋接器。

## 內部命名空間

內部命名空間為程式碼模式提供了簡潔的領域 API，而無需增加更多模型可見的工具。載入器擁有的整合可以註冊一個命名空間，例如 `Issues`、`Fictions` 或 `Calendar`；然後客體程式碼可以在 QuickJS 程式內呼叫該命名空間，而 OpenClaw 仍僅向模型顯示 `exec` 和 `wait`。

命名空間目前為內部功能。沒有公開的外掛 SDK 命名空間 API：外部外掛命名空間需要載入器擁有的合約，以免外掛身分、已安裝的清單、驗證狀態和快取的目錄描述符與支援該命名空間的外掛工具產生落差。核心程式碼模式僅擁有沙箱、序列化、目錄閘控和橋接器分派。

客體程式碼可以使用直接的全域變數或 `namespaces` 映射：

```javascript
const open = await Issues.list({ state: "open" });
const alsoOpen = await namespaces.Issues.list({ state: "open" });
return { count: open.length, alsoCount: alsoOpen.length };
```

### 登錄生命週期

命名空間註冊表是程序本地的，並以命名空間 ID 為鍵。典型的執行路徑如下：

1. 一個受信任的載入器呼叫 `registerCodeModeNamespaceForPlugin(pluginId, registration)`。
2. 程式碼模式為該次執行建立隱藏的 `ToolSearchRuntime` 並讀取其執行範圍的目錄。
3. `createCodeModeNamespaceRuntime(ctx, catalog)` 僅保留那些所有 `requiredToolNames` 均可見且屬於同一 `pluginId` 的註冊項。
4. 每個可見的命名空間會為當前執行呼叫 `createScope(ctx)`。該範圍會接收執行上下文，例如 `agentId`、`sessionKey`、`sessionId`、`runId`、配置和中止狀態。
5. 範圍資料會被序列化為一個簡單的描述符，並作為直接的全域變數和 `namespaces.<globalName>` 注入到 QuickJS 中。
6. 來自客體的呼叫透過 Worker 橋接器掛起，在主機上解析命名空間路徑，將該呼叫對應到已宣告的外掛擁有目錄工具，並透過 `ToolSearchRuntime.call` 執行該工具。
7. OpenClaw 會在活動的 `exec`/`wait` 工具呼叫內部自動排空已就緒的命名空間橋接呼叫。如果命名空間工作在超時時仍處於擱置狀態，或者客體明確讓出控制權，`wait` 稍後會恢復相同的命名空間執行時。
8. 外掛回滾或解除安裝會呼叫 `clearCodeModeNamespacesForPlugin(pluginId)`，以免過時的全域變數在外掛載入失敗後繼續存在。

重要不變性：命名空間呼叫即目錄工具呼叫。它們使用與 `tools.call(...)` 相同的策略掛勾、核准、中止處理、遙測、文字記錄投影以及掛起/恢復行為。

### 註冊結構

從擁有支援工具的整合中註冊命名空間。保持範圍較小，並僅公開對應到已宣告目錄工具的領域動詞。

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

`createCodeModeNamespaceTool(toolName, inputMapper)` 將範圍成員標記為可呼叫的命名空間函數。可選的 `inputMapper` 接收客體參數並返回支援目錄工具的輸入物件。如果沒有輸入對映器，則使用第一個客體參數；若省略則使用 `{}`。

原始主機函數會在客體程式碼執行之前被拒絕：

```typescript
createScope: () => ({
  // Wrong: this bypasses the catalog tool lifecycle and will be rejected.
  list: async () => githubClient.listIssues(),
});
```

### 所有權與可見性

命名空間所有權繫結於註冊呼叫者的 `pluginId`。
`requiredToolNames` 既是可見性閘門，也是所有權檢查：

- 每個所需的工具必須存在於執行目錄中
- 每個所需的工具必須具有 `sourceName === pluginId`
- 當任何所需的工具缺失或由另一個外掛程式擁有時，該命名空間會被隱藏
- 每個可呼叫路徑僅能以 `requiredToolNames` 中命名的工具為目標

這可以防止其他外掛程式透過註冊同名工具來暴露命名空間。這也讓命名空間與一般代理程式政策保持一致：如果執行環境無法看到支援工具，它就無法看到命名空間。

例如，GitHub 命名空間應置於一個擁有 GitHub 驗證、REST 或 GraphQL 用戶端、速率限制、寫入核准和測試的 GitHub 擁有擴充功能之後。核心程式碼模式不應內嵌 GitHub 特定的 API、權杖處理或提供者政策。

### 範圍序列化規則

`createScope(ctx)` 可以返回一個包含 JSON 相容值、陣列、巢狀物件和 `createCodeModeNamespaceTool(...)` 呼叫標記的純物件。
主機物件永遠不會直接進入 QuickJS。

序列化程式會拒絕：

- 原始函式
- 循環物件圖
- 不安全的路徑區段：`__proto__`、`constructor`、`prototype`、空金鑰，或
  包含內部路徑分隔符的金鑰
- 不是 JavaScript 識別碼的 `globalName` 值
- 與內建程式碼模式全域變數（例如 `tools`、
  `namespaces`、`text`、`json`、`yield_control` 或 `__openclaw*`）發生衝突的 `globalName`

無法進行 JSON 序列化的值會在跨越橋接器之前轉換為 JSON 安全的後備值。二進位資料、控制代碼、通訊端、用戶端和類別實例應保留在一般目錄工具之後。

### 提示

命名空間 `description` 和可選的 `prompt` 僅在該次執行中命名空間可見時，才會附加到模型可見的 `exec` 架構中。利用它們來教導最小且有用的介面：

```typescript
{
  description: "Fiction production service helpers.",
  prompt:
    "Use Fictions.riskAudit(), Fictions.promoteIfReady(id, status), and Fictions.unpaidOver(amount).",
}
```

提示內容應集中在命名空間合約上，而非認證設定、實作歷史或不相關的外掛行為。

### 清理

命名空間是程序本地的註冊項。當擁有該命名空間的外掛被停用、解除安裝或回溯時，應將其移除：

```typescript
clearCodeModeNamespacesForPlugin(pluginId);
```

僅在移除一個已知的命名空間時使用 `unregisterCodeModeNamespace(namespaceId)`。測試可以呼叫 `clearCodeModeNamespacesForTest()` 以避免在不同測試案例間洩漏註冊項。

### 測試檢查清單

命名空間的變更應涵蓋安全性邊界和客體行為：

- 命名空間提示文字僅在支援工具可見時出現
- 來自另一個 `sourceName` 的同名工具不會暴露該命名空間
- 原始範圍函數會被拒絕
- 偽造的命名空間 ID 和偽造的路徑會被拒絕
- 可呼叫路徑無法以未宣告的工具為目標
- 巢狀物件和共享參照能正確序列化
- 命名空間呼叫透過目錄工具執行並傳回 JSON 安全的細節
- 失敗可以被客體程式碼捕獲
- 暫停的命名空間呼叫透過 `wait` 恢復
- 外掛回溯會清除擁有者的命名空間註冊

命名空間補充了通用的 `tools.search` / `tools.call` 目錄。使用該目錄來處理任意已啟用的 OpenClaw、外掛和客戶端工具；使用 `MCP` 來處理 MCP 工具；使用其他命名空間來處理由外掛擁有且有文件記錄的領域 API，在這些情況下，簡潔的程式碼比重複的架構查詢更可靠。

## 輸出 API

`text(value)` 將人類可讀的輸出附加到 `output` 陣列。

`json(value)` 在進行 JSON 相容序列化後附加一個結構化輸出項目。

客體程式碼的最終傳回值會成為 `completed` 結果中的 `value`。

輸出項目：

```typescript
type CodeModeOutput = { type: "text"; text: string } | { type: "json"; value: unknown };
```

輸出規則：

- 輸出順序符合客體呼叫順序
- 輸出受 `maxOutputBytes` 限制
- 無法序列化的值會轉換為純字串或錯誤
- v1 不支援二進位值
- 影像和檔案透過一般的 OpenClaw 工具傳輸，而非透過 code-mode 橋接器

## 工具目錄

隱藏目錄包含經過有效策略過濾後的工具：

1. OpenClaw 核心工具。
2. 內建外掛工具。
3. 外部外掛工具。
4. MCP 工具。
5. 客戶端針對當前執行提供的工具。

目錄 ID 在單次執行內保持穩定，且在同等工具集合間盡可能具確定性。

建議的 ID 形式：

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

該目錄會省略 code-mode 控制工具：

- `exec`
- `wait`
- `tool_search_code`
- `tool_search`
- `tool_describe`
- `tool_call`

這可防止遞迴並保持面向模型的合約狹窄。

MCP 項目保留在執行範圍目錄中，因此策略、核准、掛鉤、遙測、記錄投影和精確工具 ID 與一般工具執行共用。面向客戶端的 `ALL_TOOLS`、`tools.search(...)`、`tools.describe(...)` 和 `tools.call(...)` 檢視會省略 MCP 項目。生成的 `MCP.<server>.<tool>({ ...input })` 命名空間會解析回精確的目錄 ID，然後透過相同的執行器路徑進行分派。

## 工具搜尋互動

對於處於啟用狀態的執行，Code mode 會取代 OpenClaw 工具搜尋模型表面。

當 `tools.codeMode.enabled` 為 true 且 code mode 啟用時：

- OpenClaw 不會將 `tool_search_code`、`tool_search`、`tool_describe` 或 `tool_call` 作為模型可見工具公開。
- 相同的目錄化概念移入客戶端執行時期內部。
- 客戶端執行時期會接收精簡的 `ALL_TOOLS` 元資料以及非 MCP 工具的搜尋、描述和呼叫輔助函式。
- MCP 呼叫會使用生成的 `MCP` 命名空間及其 `$api()` 標頭，而非 `tools.call(...)`。
- 巢狀呼叫會透過工具搜尋所使用的同一個 OpenClaw 執行器路徑進行分派。

現有的 [Tool Search](/zh-Hant/tools/tool-search) 頁面描述了 OpenClaw 緊湊型目錄橋接器。Code mode 是針對可使用 `exec` 和 `wait` 之執行的通用 OpenClaw 替代方案。

## 工具名稱與衝突

模型可見的 `exec` 工具是 code-mode 工具。如果啟用了正常的 OpenClaw shell `exec` 工具，它將會對模型隱藏，並像其他工具一樣被編目。

在客體執行時內部：

- 如果策略允許，`tools.call("openclaw:core:exec", input)` 可以呼叫 shell exec 工具。
- 只有在 shell exec 目錄項目具有明確的安全名稱時，才會安裝 `tools.exec(...)`。
- code-mode `exec` 工具絕不會透過 `tools` 遞迴地提供。

如果兩個工具正規化為相同的安全便利名稱，OpenClaw 將省略便利函數並要求使用 `tools.call(id, input)`。

## 巢狀工具執行

每個巢狀工具呼叫都會跨越主機橋接器並重新進入 OpenClaw。

巢狀執行會保留：

- 啟用的代理程式 ID
- 工作階段 ID 和工作階段金鑰
- 傳送者和頻道上下文
- 沙箱策略
- 核准策略
- 外掛程式 `before_tool_call` 掛鉤
- 中止訊號
- 可用的串流更新
- 軌跡和稽核事件

巢狀呼叫會投影為真實的工具呼叫並顯示在逐字稿中，以便支援套件可以顯示發生了什麼。該投影會識別父 code-mode 工具呼叫和巢狀工具 ID。

允許最多 `maxPendingToolCalls` 個並行巢狀呼叫。

## 執行時狀態

每次 code-mode 執行都有一個狀態機：

- `running`：VM 正在執行或巢狀呼叫正在進行中。
- `waiting`：VM 快照存在並可使用 `wait` 恢復。
- `completed`：已傳回最終值；已刪除快照。
- `failed`：已傳回錯誤；已刪除快照。
- `expired`：快照或待處理狀態超過保留期限；無法恢復。
- `aborted`：父執行/工作階段已取消；已刪除快照。

State is scoped by agent run, session, and tool call id. A `wait` call from a
different run or session fails.

Snapshot storage is bounded:

- maximum snapshot bytes per run
- maximum live snapshots per process
- snapshot TTL
- cleanup on run end
- cleanup on Gateway shutdown where persistence is not supported

## QuickJS-WASI runtime

OpenClaw loads `quickjs-wasi` as a direct dependency in the owning package. The
runtime does not rely on a transitive copy installed for proxy, PAC, or other
unrelated dependencies.

Runtime responsibilities:

- compile or load the QuickJS-WASI WebAssembly module
- create one isolated VM per code-mode run or resume
- register host callbacks by stable names
- set memory and interrupt limits
- evaluate JavaScript
- drain pending jobs
- snapshot suspended VM state
- restore snapshots for `wait`
- dispose VM handles and snapshots after terminal states

The runtime executes outside OpenClaw's main event loop in a worker. A guest
infinite loop must not block the Gateway process indefinitely.

## TypeScript

TypeScript support is a source transform only:

- accepted input: one TypeScript code string
- output: JavaScript string evaluated by QuickJS-WASI
- no typechecking
- no module resolution
- no `import` or `require` in v1
- diagnostics are returned as `failed` results

The TypeScript compiler is loaded lazily only for TypeScript cells. Plain
JavaScript cells and disabled code mode do not load the compiler.

The transform should preserve useful line numbers where feasible.

## Security boundary

Model code is hostile. The runtime uses defense in depth:

- run QuickJS-WASI outside the main event loop
- load `quickjs-wasi` as a direct dependency, not through Codex or a transitive
  package
- no filesystem, network, subprocess, module import, environment variables, or
  host global objects in the guest
- use QuickJS memory and interrupt limits
- enforce parent-process wall-clock timeout
- enforce output, snapshot, log, and pending-call caps
- serialize host bridge values through a narrow JSON adapter
- convert host errors into plain guest errors, never host realm objects
- 在逾時、中止、會話結束或過期時丟棄快照
- 拒絕對 `exec`、`wait` 和工具搜尋控制工具的遞迴存取
- 防止便利名稱衝突遮蔽目錄輔助程式

沙箱僅是其中一層安全防護。對於高風險部署，操作員仍需進行作業系統層級的強化防護。

## 錯誤代碼

```typescript
type CodeModeErrorCode = "runtime_unavailable" | "invalid_config" | "invalid_input" | "unsupported_language" | "typescript_transform_failed" | "module_access_denied" | "timeout" | "memory_limit_exceeded" | "output_limit_exceeded" | "snapshot_limit_exceeded" | "snapshot_expired" | "snapshot_restore_failed" | "too_many_pending_tool_calls" | "nested_tool_failed" | "aborted" | "internal_error";
```

傳回給客戶端的錯誤是純資料。主機 `Error` 執行個體、堆疊物件、原型和主機函式不會傳入 QuickJS。

## 遙測

程式碼模式會回報：

- 傳送至模型的可見工具名稱
- 隱藏目錄大小與來源細分
- `exec` 和 `wait` 計數
- 巢狀搜尋、描述和呼叫計數
- 被呼叫的巢狀工具 ID
- 逾時、記憶體、快照和輸出上限失敗
- 快照生命週期事件

遙測不得包含機密、原始環境值，或超出現有 OpenClaw 軌跡策略的未遮蔽工具輸入。

## 偵錯

當程式碼模式的行為與一般工具執行不同時，請使用目標模型傳輸記錄：

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
OPENCLAW_DEBUG_SSE=events \
openclaw gateway
```

若要進行承載形狀偵錯，請使用 `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`。這會記錄模型請求的經上限處理與遮蔽的 JSON 快照；應僅在偵錯期間使用，因為提示詞和訊息文字仍可能出現。

若要進行串流偵錯，請使用 `OPENCLAW_DEBUG_SSE=peek` 記錄前五個經遮蔽的 SSE 事件。如果最終的提供者承載在程式碼模式介面啟動後未精確包含 `exec` 和 `wait`，程式碼模式也會以失敗封閉方式運作。

## 實作配置

實作單元：

- 設定合約：`tools.codeMode`
- 目錄建構器：將有效工具轉換為精簡項目與 ID 對應
- 模型介面卡：將可見工具替換為 `exec` 和 `wait`
- QuickJS-WASI 執行階段介面卡：載入、評估、快照、還原、處置
- Worker 監督器：逾時、中止、當機隔離
- 橋接器介面卡：JSON 安全的主機回呼與結果傳遞
- TypeScript 轉換介面卡
- 快照存放區：TTL、大小上限、執行/會話範圍
- 巢狀工具呼叫的軌跡投影
- 遙測計數器與診斷

該實作重用了 Tool Search 中的目錄和執行器概念，但並未將 `node:vm` 子項用作沙箱。

## 驗證檢查清單

Code mode 的覆蓋範圍應證明：

- 停用的配置會保留現有的工具公開設定不變
- 不包含 `enabled: true` 的物件配置會使 Code mode 保持停用
- 啟用的配置會在執行期間啟用工具時，僅向模型公開 `exec` 和 `wait`
- 原始無工具執行、`disableTools` 和空許可清單不會觸發 code-mode 負載強制執行
- 所有有效的非 MCP 工具都會出現在 `ALL_TOOLS` 中
- 被拒絕的工具不會出現在 `ALL_TOOLS` 中
- `tools.search`、`tools.describe` 和 `tools.call` 適用於 OpenClaw 工具
- `API.list("mcp")` 和 `API.read("mcp/<server>.d.ts")` 會公開 TypeScript 風格的 MCP 宣告，而無需橋接器/工具呼叫
- MCP 命名空間 `$api()` 仍然可用作架構的內聯後備方案
- MCP 命名空間呼叫適用於具有單一物件輸入的可見 MCP 工具，而直接的 MCP 目錄項目不存在於 `tools.*` 中
- Tool Search 控制工具會從模型表面和隱藏目錄中隱藏
- 巢狀呼叫會保留核准和掛鉤行為
- shell `exec` 會對模型隱藏，但在允許時可透過目錄 ID 呼叫
- 遞迴 code-mode `exec` 和 `wait` 無法從客體程式碼中呼叫
- TypeScript 輸入會經過轉換和評估，而不會在停用或僅 JavaScript 路徑上載入 TypeScript
- `import`、`require`、檔案系統、網路和環境存取都會失敗
- 無限迴圈會逾時，且無法封鎖閘道
- 記憶體上限失敗會終止客體 VM
- 會對已完成和暫停的呼叫執行輸出和快照上限
- `wait` 會恢復暫停的快照並傳回最終值
- 已過期、已中止、錯誤會話和未知的 `runId` 值都會失敗
- 對話重放和持久化會保留 code-mode 控制呼叫
- 對話和遙測資料會清楚地顯示巢狀工具呼叫

## E2E 測試計畫

變更執行時（runtime）時，請將這些作為整合或端到端測試來執行：

1. 使用 `tools.codeMode.enabled: false` 啟動 Gateway。
2. 發送一個包含小型直接工具集的 agent turn。
3. 斷言模型可見的工具保持不變。
4. 使用 `tools.codeMode.enabled: true` 重新啟動。
5. 發送一個包含 OpenClaw、plugin、MCP 和 client 測試工具的 agent turn。
6. 斷言模型可見的工具列表確切為 `exec`、`wait`。
7. 在 `exec` 中，讀取 `ALL_TOOLS` 並斷言有效的測試工具存在。
8. 在 `exec` 中，透過 `tools.search`、
   `tools.describe` 和 `tools.call` 呼叫 OpenClaw/plugin/client 工具。
9. 在 `exec` 中，呼叫 `API.list("mcp")` 和 `API.read("mcp/<server>.d.ts")` 並
   斷言宣告檔案描述了可見的 MCP 工具。
10. 在 `exec` 中，透過 `MCP.<server>.<tool>({ ...input })` 呼叫 MCP 工具並
    斷言 `ALL_TOOLS` 和 `tools.*` 中沒有直接的 MCP 目錄項目。
11. 斷言被拒絕的工具不存在，且無法透過猜測的 ID 呼叫。
12. 啟動一個巢狀工具呼叫，該呼叫在 `exec` 傳回 `waiting` 後解析。
13. 呼叫 `wait` 並斷言還原的 VM 接收到工具結果。
14. 斷言最終答案包含還原後產生的輸出。
15. 斷言逾時、中止和快照過期會清理執行時狀態。
16. 匯出軌跡並斷言巢狀呼叫在父級 code-mode 呼叫下可見。

此頁面的僅文件變更仍應執行 `pnpm check:docs`。

## 相關

- [工具搜尋](/zh-Hant/tools/tool-search)
- [Agent 執行時](/zh-Hant/concepts/agent-runtimes)
- [Exec 工具](/zh-Hant/tools/exec)
- [程式碼執行](/zh-Hant/tools/code-execution)
