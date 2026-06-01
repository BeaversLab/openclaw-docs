---
summary: "OpenClaw 程式碼模式：由 QuickJS-WASI 和隱藏的執行範圍工具目錄支援的選用式 exec/wait 工具介面"
title: "程式碼模式"
sidebarTitle: "程式碼模式"
read_when:
  - You want to enable OpenClaw code mode for an agent run
  - You need to explain why code mode is different from Codex Code mode
  - You are reviewing the exec/wait contract, QuickJS-WASI sandbox, TypeScript transform, or hidden tool-catalog bridge
---

程式碼模式是一個實驗性的 OpenClaw 代理程式執行階段功能。預設為關閉。當您啟用它時，OpenClaw 會改變模型在單次執行中看到的內容：模型不會直接看到每個已啟用的工具架構，而是只能看到 `exec` 和 `wait`。

本頁文件記載了 OpenClaw 程式碼模式。這不是 Codex Code 模式。這兩項功能共用一個名稱，但它們由不同的執行時期實作，且公開不同的 `exec` 契約：

- 除非受限的工具政策停用了原生程式碼模式，否則 Codex Code 模式會對 Codex 應用伺服器執行緒啟用。它運作於 Codex 編寫配接器中，模型在此透過 `exec.command` 契約撰寫 shell 指令。
- 除非已設定 `tools.codeMode.enabled: true`，否則 OpenClaw 程式碼模式為停用狀態。它運作於 OpenClaw 通用代理程式執行時期中，模型在此透過 `exec.code` 契約撰寫 JavaScript 或 TypeScript 程式。

Codex Code 模式與 Codex 原生動態工具搜尋是穩定的 Codex 配接器介面。OpenClaw 程式碼模式則是針對通用 OpenClaw 執行、由 OpenClaw 擁有的實驗性工具介面轉接器。它使用 `quickjs-wasi`（一個隱藏的 OpenClaw 工具目錄）以及標準的 OpenClaw 工具執行器。

## 這是什麼？

OpenClaw 程式碼模式讓模型撰寫一小段 JavaScript 或 TypeScript 程式，而不是從冗長的工具清單中直接選擇。

當程式碼模式啟用時：

- 模型可見的工具清單僅包含 `exec` 和 `wait`。
- `exec` 會在受限的 QuickJS-WASI worker 中評估模型產生的 JavaScript 或 TypeScript。
- 標準的 OpenClaw 工具會從模型提示中隱藏，並透過 `ALL_TOOLS` 和 `tools` 在客體程式內部公開。
- 客體程式碼可以搜尋隱藏的目錄、描述工具，並透過與一般代理程式回合相同的 OpenClaw 執行路徑來呼叫工具。
- 當巢狀工具呼叫仍在擱置中時，`wait` 會恢復已暫停的程式碼模式執行。

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

當省略 `tools.codeMode`、設置為 `false`，或為不包含 `enabled: true` 的對象時，代碼模式保持關閉狀態。

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

啟用代碼模式後，記錄的面向模型的工具名稱應為 `exec` 和 `wait`。如果您需要經過編輯的提供商負載，請添加 `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted` 以進行短時間的調試。

## 技術概覽

本頁其餘部分描述運行時契約和實現細節。它旨在供維護者、調試工具暴露的插件作者以及驗證高風險部署的操作員使用。

## 運行時狀態

- 運行時：[`quickjs-wasi`](https://github.com/vercel-labs/quickjs-wasi)。
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

提供者擁有的工具（例如遠端 Python 沙箱）仍是獨立的工具。請參閱
[Code execution](/zh-Hant/tools/code-execution)。

## 術語

**Code mode**（程式碼模式）是隱藏一般模型工具並僅
揭露 `exec` 和 `wait` 的 OpenClaw 運行時模式。

**Guest runtime**（執行體運行時）是用來評估模型程式碼的 QuickJS-WASI JavaScript VM。

**Host bridge**（主機橋接器）是從執行體程式碼
回傳至 OpenClaw 的狹窄 JSON 相容回呼介面。

**Catalog**（目錄）是經過一般工具政策、外掛程式、MCP 和用戶端工具解析後，執行範圍內的有效工具清單。

**Nested tool call**（巢狀工具呼叫）是透過主機橋接器從執行體程式碼發出的工具呼叫。

**Snapshot**（快照）是已序列化的 QuickJS-WASI VM 狀態，儲存後可讓 `wait` 繼續
已暫停的程式碼模式執行。

## 組態

`tools.codeMode.enabled` 是啟動閘道。設定其他程式碼模式欄位
不會啟用此功能。

支援的欄位：

- `enabled`：布林值。預設為 `false`。僅在 `true` 時啟用程式碼模式。
- `runtime`：`"quickjs-wasi"`。唯一支援的運行時。
- `mode`：`"only"`。揭露 `exec` 和 `wait`，並隱藏一般模型工具。
- `languages`：`"javascript"` 和 `"typescript"` 的陣列。預設值包含
  兩者。
- `timeoutMs`：單次 `exec` 或 `wait` 的牆鐘時間上限。預設值為 `10000`。
  執行時強制範圍：`100` 至 `60000`。
- `memoryLimitBytes`：QuickJS 堆積上限。預設值為 `67108864`。執行時強制範圍：
  `1048576` 至 `1073741824`。
- `maxOutputBytes`：傳回的文字、JSON 和日誌上限。預設值為 `65536`。
  執行時強制範圍：`1024` 至 `10485760`。
- `maxSnapshotBytes`：序列化 VM 快照上限。預設值為 `10485760`。
  執行時強制範圍：`1024` 至 `268435456`。
- `maxPendingToolCalls`：並發巢狀工具呼叫上限。預設值為 `16`。
  執行時強制範圍：`1` 至 `128`。
- `snapshotTtlSeconds`：已暫停的 VM 可以恢復執行的時間長度。預設值為 `900`。
  執行時強制範圍：`1` 至 `86400`。
- `searchDefaultLimit`：預設的隱藏型錄搜尋結果數量。預設值為 `8`。
  執行時會將此值強制限制為 `maxSearchLimit`。
- `maxSearchLimit`：最大的隱藏型錄搜尋結果數量。預設值為 `50`。
  執行時強制範圍：`1` 至 `50`。

如果啟用了代碼模式但 QuickJS-WASI 無法載入，OpenClaw 將對該次執行採取封閉失敗策略。它不會以靜默方式將一般工具作為後備方案暴露出來。

## 啟用

代碼模式是在確定有效工具政策之後，且在組裝最終模型請求之前進行評估的。

啟用順序：

1. 解析代理、模型、提供者、沙箱、通道、發送者和執行政策。
2. 建置有效的 OpenClaw 工具列表。
3. 新增合格的插件、MCP 和客戶端工具。
4. 套用允許和拒絕政策。
5. 如果 `tools.codeMode.enabled` 為 false，則繼續以一般方式暴露工具。
6. 如果已啟用且工具在執行期間處於啟用狀態，則在程式碼模式目錄中註冊有效工具。
7. 從模型可見的工具清單中移除所有一般工具。
8. 新增程式碼模式的 `exec` 和 `wait`。

故意沒有工具的執行（例如原始模型呼叫 `disableTools` 或空白的允許清單）不會啟用程式碼模式介面，即使設定包含 `tools.codeMode.enabled: true`。

程式碼模式目錄的範圍是單次執行。它不得洩漏來自其他代理、工作階段、發送者或執行的工具。

## 模型可見的工具

當程式碼模式啟用時，模型將只能看到這些頂層工具：

- `exec`
- `wait`

所有其他已啟用的工具將從面向模型的工作清單中隱藏，並註冊在程式碼模式目錄中。

模型應將 `exec` 用於工具協調、資料合併、迴圈、並行巢狀呼叫和結構化轉換。僅當 `exec` 返回可恢復的 `waiting` 結果時，模型才應使用 `wait`。

## `exec`

`exec` 啟動程式碼模式儲存格並返回一個結果。輸入程式碼是由模型生成的，必須將其視為惡意內容對待。

輸入：

```typescript
type CodeModeExecInput = {
  code?: string;
  command?: string;
  language?: "javascript" | "typescript";
};
```

輸入規則：

- `code` 或 `command` 中必須有一個非空。
- `code` 是記載於文件的面向模型的欄位。
- `command` 被接受為掛鉤策略和受信任重寫的 exec 相容別名；當兩者同時存在時，值必須相符。
- 外層程式碼模式的 `exec` 掛鉤事件包含 `toolKind: "code_mode_exec"`，且當輸入語言已知時包含 `toolInputKind: "javascript" | "typescript"`，因此策略可以區分程式碼模式儲存格與共用相同工具名稱的 shell 風格 `exec` 呼叫。
- `language` 預設為 `"javascript"`。
- 如果 `language` 是 `"typescript"`，OpenClaw 將在評估前進行轉譯。
- `exec` 在 v1 中拒絕 `import`、`require`、動態匯入以及 module-loader 模式。
- `exec` 不會遞迴地公開正常的 shell `exec` 實作。

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

當 QuickJS VM 以可恢復狀態暫停時，`exec` 會傳回 `waiting`。結果包含一個針對 `wait` 的 `runId`。

`exec` 只有在 guest VM 沒有待處理工作，且在 OpenClaw 的輸出介面卡執行後最終值與 JSON 相容時，才會傳回 `completed`。

## `wait`

`wait` 繼續執行已暫停的 code-mode VM。

輸入：

```typescript
type CodeModeWaitInput = {
  runId: string;
};
```

輸出與 `exec` 傳回的 `CodeModeResult` 聯集相同。

`wait` 的存在是因為巢狀 OpenClaw 工具可能很慢、具互動性、需要核准閘門，或是串流部分更新。當主機等待外部工作時，模型不需要保持一個長時間開啟的 `exec` 呼叫。

QuickJS-WASI 快照與還原是 v1 的恢復機制：

1. `exec` 評估程式碼直到完成、失敗或暫停。
2. 暫停時，OpenClaw 會對 QuickJS VM 建立快照並記錄待處理的主機工作。
3. 當待處理工作完成時，`wait` 會還原 VM 快照。
4. OpenClaw 會透過穩定名稱重新註冊主機回呼。
5. OpenClaw 將巢狀工具結果傳遞至還原的 VM 中。
6. OpenClaw 會排清 QuickJS 的待處理工作。
7. `wait` 會傳回 `completed`、`failed` 或另一個 `waiting` 結果。

快照屬於執行時狀態，而非使用者產出成果。它們有大小限制、會過期，且範圍限定在建立它們的執行和會話。

`wait` 在以下情況會失敗：

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

declare function text(value: unknown): void;
declare function json(value: unknown): void;
declare function yield_control(reason?: string): Promise<void>;
```

`ALL_TOOLS` 是針對 run-scoped catalog 的精簡中繼資料。它預設不包含完整的 schema。

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

## 輸出 API

`text(value)` 會將人類可讀的輸出附加到 `output` 陣列。

`json(value)` 會在經過 JSON 相容序列化之後附加一個結構化輸出項目。

Guest 程式碼的最終傳回值會變成 `completed` 結果中的 `value`。

輸出項目：

```typescript
type CodeModeOutput = { type: "text"; text: string } | { type: "json"; value: unknown };
```

輸出規則：

- 輸出順序符合呼叫 guest 的順序
- 輸出會受到 `maxOutputBytes` 的上限限制
- 無法序列化的值會轉換為純字串或錯誤
- v1 版本不支援二進位值
- 圖片和檔案是透過一般 OpenClaw 工具傳輸，而非透過 code-mode bridge

## 工具目錄

隱藏目錄包含經過有效策略篩選後的工具：

1. OpenClaw 核心工具。
2. 內建的插件工具。
3. 外部插件工具。
4. MCP 工具。
5. 用戶端針對目前執行提供的工具。

目錄 ID 在單次執行中是穩定的，且在可行的情況下，對於等價的工具集合具有確定性。

建議的 ID 格式：

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

這可防止遞迴並保持面向模型的合約簡潔。

## Tool Search 互動

代碼模式會取代在啟用該模式的執行過程中的 OpenClaw Tool Search 模型介面。

當 `tools.codeMode.enabled` 為 true 且啟動 code mode 時：

- OpenClaw 不會將 `tool_search_code`、`tool_search`、`tool_describe` 或 `tool_call` 作為模型可見的工具公開。
- 相同的編目概念會移入 guest runtime 內部。
- 客體運行時接收精簡的 `ALL_TOOLS` 元數據以及搜尋、描述和呼叫輔助函式。
- 巢狀呼叫會透過與 Tool Search 相同的 OpenClaw 執行器路徑進行分派。

現有的 [Tool Search](/zh-Hant/tools/tool-search) 頁面描述了 OpenClaw 緊湊型目錄橋接器。代碼模式是能夠使用 `exec` 和 `wait` 的執行過程的通用 OpenClaw 替代方案。

## 工具名稱與衝突

模型可見的 `exec` 工具即是程式碼模式工具。如果啟用了正常的 OpenClaw shell `exec` 工具，它會對模型隱藏，並像其他工具一樣被編目。

在客體運行時內部：

- 如果策略允許，`tools.call("openclaw:core:exec", input)` 可以呼叫 shell exec 工具。
- 只有在 shell exec 目錄項目具有明確的安全名稱時，才會安裝 `tools.exec(...)`。
- 程式碼模式的 `exec` 工具絕不會透過 `tools` 遞迴提供使用。

如果兩個工具正規化為相同的安全便捷名稱，OpenClaw 將省略便捷函式，並要求使用 `tools.call(id, input)`。

## 巢狀工具執行

每個巢狀工具呼叫都會跨越主機橋接器並重新進入 OpenClaw。

巢狀執行會保留：

- 作用中的代理程式 ID
- 階段 ID 和階段金鑰
- 發送者和頻道上下文
- 沙箱策略
- 核准策略
- 外掛程式 `before_tool_call` 掛鉤
- 中止訊號
- 可用的串流更新
- 軌跡和稽核事件

巢狀呼叫會投射到紀錄中作為真實的工具呼叫，以便支援套件顯示發生了什麼。此投射會識別父層程式碼模式工具呼叫和巢狀工具 ID。

允許平行巢狀呼叫，最多 `maxPendingToolCalls` 個。

## 執行時狀態

每次程式碼模式執行都有一個狀態機：

- `running`：VM 正在執行或巢狀呼叫正在進行中。
- `waiting`：VM 快照存在，且可以使用 `wait` 恢復。
- `completed`：已傳回最終值；已刪除快照。
- `failed`：已傳回錯誤；已刪除快照。
- `expired`：快照或擱置狀態超過保留期限；無法繼續。
- `aborted`：父層執行/工作階段已取消；快照已刪除。

狀態是根據代理執行、工作階段和工具呼叫 ID 劃定範圍。來自不同執行或工作階段的 `wait` 呼叫會失敗。

快照儲存空間是受限的：

- 每次執行的最大快照位元組數
- 每個行程的最大即時快照數
- 快照 TTL
- 執行結束時清理
- 在不支援持久化的情況下關閉 Gateway 時進行清理

## QuickJS-WASI 執行時期

OpenClaw 會在擁有的套件中將 `quickjs-wasi` 載入為直接相依性。該執行時期不依賴為 proxy、PAC 或其他無關相依性安裝的傳遞性副本。

執行時期職責：

- 編譯或載入 QuickJS-WASI WebAssembly 模組
- 為每次 code-mode 執行或繼續建立一個獨立的 VM
- 以穩定的名稱註冊主機回呼
- 設定記憶體和中斷限制
- 評估 JavaScript
- 排清待處理的工作
- 為已暫停的 VM 狀態建立快照
- 為 `wait` 還原快照
- 在達到終止狀態後釋放 VM 控制代碼和快照

執行時期在 worker 中於 OpenClaw 的主要事件迴圈之外執行。客體無限迴圈不得無限期地封鎖 Gateway 行程。

## TypeScript

TypeScript 支援僅限於來源轉換：

- 接受的輸入：一個 TypeScript 程式碼字串
- 輸出：由 QuickJS-WASI 評估的 JavaScript 字串
- 無類型檢查
- 無模組解析
- v1 中無 `import` 或 `require`
- 診斷資訊會以 `failed` 結果的形式傳回

TypeScript 編譯器僅針對 TypeScript 儲存格進行惰性載入。純 JavaScript 儲存格和已停用的 code mode 不會載入編譯器。

轉換應在可行的情況下保留有用的行號。

## 安全邊界

模型程式碼具有惡意。執行時期使用縱深防禦：

- 在主要事件迴圈之外執行 QuickJS-WASI
- 將 `quickjs-wasi` 載入為直接相依性，而非透過 Codex 或傳遞套件
- 客體中沒有檔案系統、網路、子行程、模組匯入、環境變數或主機全域物件
- 使用 QuickJS 記憶體和中斷限制
- 強制執行父行程的牆鐘逾時
- 執行輸出、快照、日誌和待處理呼叫的上限
- 透過狹窄的 JSON 配接器序列化主機橋接器值
- 將主機錯誤轉換為純客體錯誤，絕不包含主機領域物件
- 在逾時、中止、階段結束或過期時捨棄快照
- 拒絕對 `exec`、`wait` 和工具搜尋控制工具的遞迴存取
- 防止便利名稱衝突遮蔽目錄輔助程式

沙盒是一個安全層級。對於高風險部署，操作員仍然需要作業系統層級的加固。

## 錯誤代碼

```typescript
type CodeModeErrorCode = "runtime_unavailable" | "invalid_config" | "invalid_input" | "unsupported_language" | "typescript_transform_failed" | "module_access_denied" | "timeout" | "memory_limit_exceeded" | "output_limit_exceeded" | "snapshot_limit_exceeded" | "snapshot_expired" | "snapshot_restore_failed" | "too_many_pending_tool_calls" | "nested_tool_failed" | "aborted" | "internal_error";
```

傳回給客體的錯誤是純資料。主機 `Error` 實例、堆疊物件、原型和主機函式不會傳入 QuickJS。

## 遙測

程式碼模式會回報：

- 傳送給模型的可見工具名稱
- 隱藏目錄的大小和來源細分
- `exec` 和 `wait` 計數
- 巢狀搜尋、描述和呼叫計數
- 被呼叫的巢狀工具 ID
- 逾時、記憶體、快照和輸出上限失敗
- 快照生命週期事件

除了現有的 OpenClaw 軌跡原則外，遙測不得包含機密、原始環境值或未遮蔽的工具輸入。

## 除錯

當程式碼模式的行為與正常工具執行不同時，請使用目標模型傳輸日誌記錄：

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
OPENCLAW_DEBUG_SSE=events \
openclaw gateway
```

對於承載形狀的除錯，請使用 `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`。這會記錄模型請求的受限、已遮蔽 JSON 快照；應僅在除錯時使用，因為提示和訊息文字可能仍會出現。

對於串流除錯，請使用 `OPENCLAW_DEBUG_SSE=peek` 來記錄前五個已遮蔽的 SSE 事件。如果在程式碼模式介面啟動後，最終的提供者承載未精確包含 `exec` 和 `wait`，程式碼模式也會以封閉式失敗處理。

## 實作佈局

實作單元：

- 設定合約：`tools.codeMode`
- 目錄建構器：將有效工具轉換為精簡項目和 ID 對應
- 模型介面配接器：將可見工具替換為 `exec` 和 `wait`
- QuickJS-WASI 執行時配接器：載入、求值、快照、還原、處置
- 工作程式監督器：逾時、中止、崩潰隔離
- 橋接器配接器：JSON 安全的主機回呼和結果傳遞
- TypeScript 轉換配接器
- 快照儲存：TTL、大小上限、執行/會話範圍設定
- 巢狀工具呼叫的軌跡投影
- 遙測計數器和診斷

該實作重複使用了 Tool Search 中的目錄和執行器概念，但並未將 `node:vm` 子進程作為沙盒使用。

## 驗證檢查清單

程式碼模式的覆蓋範圍應證明：

- 停用配置使現有工具暴露保持不變
- 不帶 `enabled: true` 的物件配置會使程式碼模式保持停用狀態
- 啟用配置在工具為執行啟用時，僅向模型暴露 `exec` 和 `wait`
- 原始無工具執行、`disableTools` 和空允許清單不會觸發程式碼模式強制執行
- 所有有效工具都會出現在 `ALL_TOOLS` 中
- 被拒絕的工具不會出現在 `ALL_TOOLS` 中
- `tools.search`、`tools.describe` 和 `tools.call` 適用於 OpenClaw 工具
- Tool Search 控制工具同時對模型層和隱藏目錄隱藏
- 巢狀呼叫保留審批和掛鉤行為
- shell `exec` 對模型隱藏，但在允許時可透過目錄 ID 呼叫
- 遞迴程式碼模式 `exec` 和 `wait` 無法從客體程式碼中呼叫
- TypeScript 輸入在停用或僅 JavaScript 路徑上經過轉換和求值，而不需載入 TypeScript
- `import`、`require`、檔案系統、網路和環境存取均會失敗
- 無限迴圈會超時並且無法阻塞閘道
- 記憶體上限失敗會終止客體 VM
- 對已完成和暫停的呼叫執行輸出和快照上限
- `wait` 恢復暫停的快照並傳回最終值
- 已過期、已中止、錯誤會話和未知的 `runId` 值均會失敗
- 逐字稿重放和持久化保留程式碼模式控制呼叫
- 逐字稿和遙測清楚地顯示巢狀工具呼叫

## E2E 測試計畫

當變更執行時時，請將這些作為整合或端對端測試執行：

1. 使用 `tools.codeMode.enabled: false` 啟動 Gateway。
2. 發送一個包含小型直接工具集的 agent 週期。
3. 斷言模型可見的工具保持不變。
4. 使用 `tools.codeMode.enabled: true` 重新啟動。
5. 發送一個包含 OpenClaw、plugin、MCP 和 client 測試工具的 agent 週期。
6. 斷言模型可見的工具列表確切為 `exec`、`wait`。
7. 在 `exec` 中，讀取 `ALL_TOOLS` 並斷言有效的測試工具存在。
8. 在 `exec` 中，呼叫 `tools.search`、`tools.describe` 和 `tools.call`。
9. 斷言被拒絕的工具不存在，且無法透過猜測 ID 進行呼叫。
10. 啟動一個巢狀工具呼叫，該呼叫在 `exec` 返回 `waiting` 後解析。
11. 呼叫 `wait` 並斷言還原的 VM 接收到工具結果。
12. 斷言最終答案包含還原後產生的輸出。
13. 斷言逾時、中止和快照過期會清理運行時狀態。
14. 匯出軌跡並斷言巢狀呼叫在父級 code-mode 呼叫下可見。

僅針對此頁面的文件變更仍應執行 `pnpm check:docs`。

## 相關

- [工具搜尋](/zh-Hant/tools/tool-search)
- [Agent 執行環境](/zh-Hant/concepts/agent-runtimes)
- [Exec 工具](/zh-Hant/tools/exec)
- [程式碼執行](/zh-Hant/tools/code-execution)
