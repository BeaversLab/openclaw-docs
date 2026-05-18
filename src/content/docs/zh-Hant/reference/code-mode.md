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

此頁面記錄了 OpenClaw 程式碼模式。這不是 Codex 程式碼模式。Codex 程式碼模式是 Codex 編寫線束的一部分，並擁有自己的專案工作區、執行階段、工具和執行語義。Codex 程式碼模式和 Codex 原生動態工具搜尋是穩定的 Codex 線束介面。OpenClaw 程式碼模式是一個屬於 OpenClaw 的實驗性工具介面轉接器，用於一般的 OpenClaw 執行。它使用 `quickjs-wasi`、隱藏的 OpenClaw 工具目錄以及正常的 OpenClaw 工具執行器。

## 這是什麼？

OpenClaw 程式碼模式允許模型撰寫小型 JavaScript 或 TypeScript 程式，而不是直接從一長串的工具清單中進行選擇。

當程式碼模式啟用時：

- 模型可見的工具清單僅包含 `exec` 和 `wait`。
- `exec` 會在受限的 QuickJS-WASI 工作程序中評估模型產生的 JavaScript 或 TypeScript。
- 正常的 OpenClaw 工具會對模型提示隱藏，並透過 `ALL_TOOLS` 和 `tools` 在客體程式內部公開。
- 客體程式碼可以搜尋隱藏的目錄、描述工具，並透過與一般代理程式回合相同的 OpenClaw 執行路徑來呼叫工具。
- 當巢狀工具呼叫仍在擱置中時，`wait` 會恢復已暫停的程式碼模式執行。

重要的區別：程式碼模式改變了面向模型的編排介面。它並不取代 OpenClaw 工具、外掛工具、MCP 工具、驗證、核准政策、通道行為或模型選擇。

## 為什麼這很好？

程式碼模式讓大型工具目錄更容易供模型使用。

- 更小的提示詞表面：提供者接收兩個控制工具，而不是數十或數百個完整的工具架構。
- 更好的協調：模型可以在一個程式碼儲存格內使用迴圈、聯接、小型轉換、條件邏輯和平行巢狀工具呼叫。
- 提供者中立：它適用於 OpenClaw、外掛、MCP 和客戶端工具，而不依賴提供者原生的程式碼執行。
- 現有策略保持有效：巢狀工具呼叫仍需經過 OpenClaw 策略、審批、掛鉤、會話上下文和稽核路徑。
- 明確的失敗模式：當明確啟用程式碼模式且運行時不可用時，OpenClaw 將以失敗關閉，而不是退回到廣泛的直接工具暴露。

程式碼模式對於具有大量已啟用工具目錄的代理，或對於模型在產生答案之前需要重複搜尋、組合和呼叫工具的工作流程特別有用。

## 如何啟用它

將 `tools.codeMode.enabled: true` 加入到代理或運行時配置中：

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

當省略 `tools.codeMode`、設為 `false`，或是一個不包含 `enabled: true` 的物件時，程式碼模式保持關閉。

當您需要更嚴格的邊界時，請使用明確的限制：

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

若要在除錯時確認模型載荷的形狀，請使用目標日誌記錄來執行 Gateway：

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
openclaw gateway
```

啟用程式碼模式後，記錄中面向模型的工具名稱應該是 `exec` 和 `wait`。如果您需要經過編輯的提供者載荷，請為短暫的除錯階段新增 `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`。

## 技術導覽

本頁其餘部分描述了運行時合約和實作細節。它旨在供維護者、正在除錯工具暴露的外掛作者，以及驗證高風險部署的運維人員使用。

## 運行時狀態

- 運行時：[`quickjs-wasi`](https://github.com/vercel-labs/quickjs-wasi)。
- 預設狀態：已停用。
- 穩定性：實驗性的 OpenClaw 介面；Codex 程式碼模式是一個獨立的穩定 Codess 操控介面。
- 目標介面：通用 OpenClaw 代理執行。
- 安全姿態：模型程式碼具有敵意。
- 面向使用者的承諾：啟用程式碼模式從不會靜默退回到廣泛的直接工具暴露。

## 範圍

Code mode 擁有用於準備執行之模型面向協調形狀。它不擁有模型選擇、通道行為、驗證、工具政策或工具實作。

範圍內：

- 模型可見的 `exec` 和 `wait` 工具定義
- 隱藏工具目錄建構
- JavaScript 和 TypeScript 客體執行
- QuickJS-WASI worker 執行時期
- 用於目錄搜尋、schema 描述和工具呼叫的主機回呼
- 暫停客體程式的可恢復狀態
- 輸出、逾時、記憶體、待處理呼叫和快照限制
- 巢狀工具呼叫的遙測和軌跡投影

範圍外：

- 供應商原生遠端程式碼執行
- Shell 執行語意
- 變更現有工具授權
- 持續性使用者撰寫的腳本
- 客體程式碼中的套件管理器、檔案、網路或模組存取
- 直接重用 Codex Code mode 內部元件

供應商擁有的工具（例如遠端 Python 沙箱）仍為獨立工具。請參閱
[Code execution](/zh-Hant/tools/code-execution)。

## 術語

**Code mode** 是隱藏正常模型工具並僅
公開 `exec` 和 `wait` 的 OpenClaw 執行時期模式。

**Guest runtime** 是評估模型程式碼的 QuickJS-WASI JavaScript VM。

**Host bridge** 是從客體程式碼回到 OpenClaw 的狹窄 JSON 相容回呼介面。

**Catalog** 是在一般工具政策、外掛程式、MCP 和客戶端工具解析後的有效工具執行範圍清單。

**Nested tool call** 是透過主機橋接器從客體程式碼發出的工具呼叫。

**Snapshot** 是序列化的 QuickJS-WASI VM 狀態，儲存後供 `wait` 繼續
暫停的 code mode 執行。

## 設定

`tools.codeMode.enabled` 是啟用閘道。設定其他 code-mode 欄位
不會啟用該功能。

支援的欄位：

- `enabled`: boolean。預設為 `false`。僅當 `true` 時啟用 code mode。
- `runtime`: `"quickjs-wasi"`。唯一支援的執行時期。
- `mode`: `"only"`。公開 `exec` 和 `wait`，隱藏正常模型工具。
- `languages`：`"javascript"` 和 `"typescript"` 的陣列。預設包含
  兩者。
- `timeoutMs`：單次 `exec` 或 `wait` 的掛鐘上限。預設 `10000`。
  執行時限制：`100` 到 `60000`。
- `memoryLimitBytes`：QuickJS 堆積上限。預設 `67108864`。執行時限制：
  `1048576` 到 `1073741824`。
- `maxOutputBytes`：傳回的文字、JSON 和日誌上限。預設 `65536`。
  執行時限制：`1024` 到 `10485760`。
- `maxSnapshotBytes`：序列化 VM 快照上限。預設 `10485760`。
  執行時限制：`1024` 到 `268435456`。
- `maxPendingToolCalls`：並行巢狀工具呼叫上限。預設 `16`。
  執行時限制：`1` 到 `128`。
- `snapshotTtlSeconds`：已暫停的 VM 可以恢復的時間長度。預設 `900`。
  執行時限制：`1` 到 `86400`。
- `searchDefaultLimit`：預設隱藏目錄搜尋結果計數。預設 `8`。
  執行時將其限制為 `maxSearchLimit`。
- `maxSearchLimit`：最大隱藏目錄搜尋結果計數。預設 `50`。
  執行時限制：`1` 到 `50`。

如果啟用了代碼模式但 QuickJS-WASI 無法加載，OpenClaw 將在該次執行中失敗關閉。
它不會無聲地公開正常工具作為後備方案。

## 啟用

代碼模式在已知有效工具策略之後、最終模型請求組裝之前進行評估。

啟用順序：

1. 解析代理、模型、提供者、沙箱、頻道、發送者和執行策略。
2. 構建有效的 OpenClaw 工具列表。
3. 添加合格的插件、MCP 和客戶端工具。
4. 應用允許和拒絕策略。
5. 如果 `tools.codeMode.enabled` 為 false，則繼續正常的工具公開。
6. 如果已啟用且工具有效於該次執行，則在 code-mode 目錄中註冊有效工具。
7. 從模型可見的工具列表中移除所有正常工具。
8. 加入 code-mode `exec` 和 `wait`。

故意不使用工具的執行，例如原始模型呼叫、`disableTools`，或空的允許列表，即使配置中包含 `tools.codeMode.enabled: true`，也不會啟用 code-mode 介面。

Code-mode 目錄是以執行為範圍的。它絕不能洩漏來自其他 agent、session、sender 或執行的工具。

## 模型可見的工具

當啟用 code mode 時，模型只能看到這些頂層工具：

- `exec`
- `wait`

所有其他已啟用的工具將從面向模型工具列表中隱藏，並在 code-mode 目錄中註冊。

模型應使用 `exec` 進行工具協調、資料合併、迴圈、並行巢狀呼叫和結構化轉換。僅當 `exec` 返回可恢復的 `waiting` 結果時，模型才應使用 `wait`。

## `exec`

`exec` 啟動 code-mode 儲存格並返回一個結果。輸入的程式碼由模型生成，必須被視為惡意的。

輸入：

```typescript
type CodeModeExecInput = {
  code: string;
  language?: "javascript" | "typescript";
};
```

輸入規則：

- `code` 是必需的，且必須非空。
- `language` 預設為 `"javascript"`。
- 如果 `language` 是 `"typescript"`，OpenClaw 會在評估前進行轉譯。
- `exec` 在 v1 中拒絕 `import`、`require`、動態匯入和模組載入器模式。
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

當 QuickJS VM 以可恢復狀態暫停時，`exec` 返回 `waiting`。該結果包含一個用於 `wait` 的 `runId`。

`exec` 僅在客戶端 VM 沒有待處理工作，且在 OpenClaw 的輸出配接器執行後最終值與 JSON 相容時，才會傳回 `completed`。

## `wait`

`wait` 會繼續執行一個已暫停的 code-mode VM。

輸入：

```typescript
type CodeModeWaitInput = {
  runId: string;
};
```

輸出是與 `exec` 傳回的相同 `CodeModeResult` 聯集。

`wait` 的存在是因為巢狀 OpenClaw 工具可能很慢、具有互動性、需要核准閘門或串流部分更新。當主機等待外部工作時，模型不需要保持一個長時間的 `exec` 呼叫處於開啟狀態。

QuickJS-WASI 快照與還原是 v1 版本的恢復機制：

1. `exec` 會評估程式碼，直到完成、失敗或暫停為止。
2. 暫停時，OpenClaw 會對 QuickJS VM 進行快照並記錄待處理的主機工作。
3. 當待處理工作解決後，`wait` 會還原 VM 快照。
4. OpenClaw 會透過穩定的名稱重新註冊主機回呼。
5. OpenClaw 會將巢狀工具結果傳遞到已還原的 VM 中。
6. OpenClaw 會排清 QuickJS 的待處理工作。
7. `wait` 會傳回 `completed`、`failed` 或另一個 `waiting` 結果。

快照是執行時期狀態，而非使用者成品。它們有大小限制、會過期，且範圍僅限於建立它們的執行和作業階段。

`wait` 在以下情況會失敗：

- `runId` 未知。
- 快照已過期。
- 父執行或作業階段已中止。
- 呼叫者不在相同的執行/作業階段範圍內。
- QuickJS-WASI 還原失敗。
- 還原會超過設定的限制。

## 客戶端執行時期 API

客戶端執行時期公開了一個小型全域 API：

```typescript
declare const ALL_TOOLS: ToolCatalogEntry[];
declare const tools: ToolCatalog;

declare function text(value: unknown): void;
declare function json(value: unknown): void;
declare function yield_control(reason?: string): Promise<void>;
```

`ALL_TOOLS` 是執行範圍目錄的精簡中繼資料。預設情況下，它不包含完整的結構描述。

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

完整的結構描述僅根據需求載入：

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

便利工具函數僅針對明確且安全的名稱安裝：

```typescript
const files = await tools.search("read local file");
const fileRead = await tools.describe(files[0].id);
const content = await tools.call(fileRead.id, { path: "README.md" });

// If the hidden catalog has an unambiguous `web_search` entry:
const hits = await tools.web_search({ query: "OpenClaw code mode" });
```

客戶端執行時期絕不能直接公開主機物件。輸入和輸出會以具有明確大小上限的 JSON 相容值跨越橋接器。

## 輸出 API

`text(value)` 將人類可讀的輸出附加到 `output` 陣列。

`json(value)` 在進行 JSON 相容序列化後附加結構化輸出項目。

客戶程式碼的最終傳回值會成為 `completed` 結果中的 `value`。

輸出項目：

```typescript
type CodeModeOutput = { type: "text"; text: string } | { type: "json"; value: unknown };
```

輸出規則：

- 輸出順序符合客戶端呼叫
- 輸出受到 `maxOutputBytes` 限制
- 無法序列化的值會轉換為純字串或錯誤
- v1 版本不支援二進位值
- 影像和檔案透過一般的 OpenClaw 工具傳輸，而非透過
  code-mode 橋接器

## 工具目錄

隱藏目錄包含經過有效原則過濾後的工具：

1. OpenClaw 核心工具。
2. 配套的外掛工具。
3. 外部外掛工具。
4. MCP 工具。
5. 用戶端為目前執行提供的工具。

目錄 ID 在單次執行中保持穩定，且在等效工具集之間盡可能保持確定性。

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

目錄會省略 code-mode 控制工具：

- `exec`
- `wait`
- `tool_search_code`
- `tool_search`
- `tool_describe`
- `tool_call`

這能防止遞迴，並讓模型面對的合約保持精簡。

## Tool Search 互動

Code mode 會取代處於啟用狀態執行中的 PI Tool Search 模型介面。

當 `tools.codeMode.enabled` 為 true 且 code mode 啟用時：

- OpenClaw 不會將 `tool_search_code`、`tool_search`、`tool_describe`
  或 `tool_call` 作為模型可見的工具公開。
- 相同的目錄編列概念會移入客戶執行時期內部。
- 客戶執行時期會收到精簡的 `ALL_TOOLS` 中繼資料，以及搜尋、描述
  和呼叫輔助程式。
- 巢狀呼叫會透過 Tool Search 使用的同一個 OpenClaw 執行器路徑分派。

現有的 [Tool Search](/zh-Hant/tools/tool-search) 頁面描述了 PI 精簡
目錄橋接器。Code mode 是適用於可使用
`exec` 和 `wait` 之執行的通用 OpenClaw 替代方案。

## 工具名稱與衝突

模型可見的 `exec` 工具是程式碼模式工具。如果啟用了正常的 OpenClaw
殼層 `exec` 工具，它將對模型隱藏，並像任何其他工具一樣被編目。

在客體執行時內部：

- 如果策略允許，`tools.call("openclaw:core:exec", input)` 可以呼叫殼層 exec 工具。
- 僅當殼層 exec 編目條目具有明確的安全名稱時，才會安裝
  `tools.exec(...)`。
- 程式碼模式 `exec` 工具永遠不會透過 `tools` 遞迴可用。

如果兩個工具標準化為相同的安全便攜名稱，OpenClaw 將省略
便攜函數並要求使用 `tools.call(id, input)`。

## 巢狀工具執行

每次巢狀工具呼叫都會跨越主機橋接並重新進入 OpenClaw。

巢狀執行會保留：

- 作用中的代理程式 ID
- 工作階段 ID 和工作階段金鑰
- 發送者和通道上下文
- 沙盒策略
- 核准策略
- 外掛程式 `before_tool_call` 掛鉤
- 中止訊號
- 可用的串流更新
- 軌跡和稽核事件

巢狀呼叫會以真實工具呼叫的形式投射到逐字稿中，以便支援套件
能顯示發生了什麼。該投影會識別父程式碼模式工具呼叫
和巢狀工具 ID。

最多允許 `maxPendingToolCalls` 個並行巢狀呼叫。

## 執行時狀態

每個程式碼模式執行都有一個狀態機：

- `running`：VM 正在執行或巢狀呼叫正在進行中。
- `waiting`：VM 快照存在，並且可以使用 `wait` 恢復。
- `completed`：已傳回最終值；快照已刪除。
- `failed`：已傳回錯誤；快照已刪除。
- `expired`：快照或擱置狀態超過保留期限；無法恢復。
- `aborted`：父執行/工作階段已取消；快照已刪除。

狀態按代理程式執行、工作階段和工具呼叫 ID 限定範圍。來自不同
執行或工作階段的 `wait` 呼叫會失敗。

快照儲存是有界的：

- 每次執行的最大快照位元組數
- 每個程序的最大即時快照數
- 快照 TTL
- 執行結束時清理
- 在不支援持續性的 Gateway 關閉時清理

## QuickJS-WASI 執行時

OpenClaw 會將 `quickjs-wasi` 作為直接相依性載入到擁有者套件中。執行時不依賴為 proxy、PAC 或其他不相關相依性安裝的傳遞副本。

執行時職責：

- 編譯或載入 QuickJS-WASI WebAssembly 模組
- 為每次 code-mode 執行或恢復建立一個隔離的 VM
- 以穩定的名稱註冊主機回呼
- 設定記憶體和中斷限制
- 評估 JavaScript
- 排清待處理的工作
- 對已暫止的 VM 狀態進行快照
- 還原 `wait` 的快照
- 在終止狀態後釋放 VM 控制碼和快照

執行時在 worker 中於 OpenClaw 的主要事件迴圈之外執行。來賓無限迴圈不得無限期地阻擋 Gateway 程序。

## TypeScript

TypeScript 支援僅限於來源轉換：

- 接受的輸入：一個 TypeScript 程式碼字串
- 輸出：由 QuickJS-WASI 評估的 JavaScript 字串
- 沒有型別檢查
- 沒有模組解析
- v1 中沒有 `import` 或 `require`
- 診斷結果會以 `failed` 結果的形式傳回

TypeScript 編譯器僅針對 TypeScript 儲存格延遲載入。純 JavaScript 儲存格和停用的 code mode 不會載入編譯器。

轉換應在可行的情況下保留有用的行號。

## 安全邊界

模型程式碼具有敵意。執行時使用深度防禦：

- 在主要事件迴圈之外執行 QuickJS-WASI
- 將 `quickjs-wasi` 作為直接相依性載入，而不是透過 Codex 或傳遞套件
- 來賓中沒有檔案系統、網路、子程序、模組匯入、環境變數或主機全域物件
- 使用 QuickJS 記憶體和中斷限制
- 強制執行父程序牆鐘逾時
- 強制執行輸出、快照、日誌和待處理呼叫的上限
- 透過狹窄的 JSON 轉接器序列化主機橋接器值
- 將主機錯誤轉換為純來賓錯誤，絕不使用主機領域物件
- 在逾時、中止、會話結束或到期時捨棄快照
- 拒絕對 `exec`、`wait` 和工具搜尋控制工具的遞迴存取
- 防止便利名稱衝突遮蔽目錄輔助程式

沙箱僅是一個安全層。對於高風險部署，操作員仍然可能需要作業系統層級的強化。

## 錯誤代碼

```typescript
type CodeModeErrorCode = "runtime_unavailable" | "invalid_config" | "invalid_input" | "unsupported_language" | "typescript_transform_failed" | "module_access_denied" | "timeout" | "memory_limit_exceeded" | "output_limit_exceeded" | "snapshot_limit_exceeded" | "snapshot_expired" | "snapshot_restore_failed" | "too_many_pending_tool_calls" | "nested_tool_failed" | "aborted" | "internal_error";
```

傳回給客體 (guest) 的錯誤是純資料。主機 (Host) `Error` 實例、堆疊物件、原型和主機函式不會傳入 QuickJS。

## 遙測

程式碼模式會回報：

- 傳送至模型的可见工具名稱
- 隱藏目錄的大小和來源細分
- `exec` 和 `wait` 的計數
- 巢狀搜尋、描述和呼叫計數
- 被呼叫的巢狀工具 ID
- 逾時、記憶體、快照和輸出上限失敗
- 快照生命週期事件

除了現有的 OpenClaw 軌跡策略外，遙測不得包含機密、原始環境值或未編修的工具輸入。

## 偵錯

當程式碼模式的行為與正常工具執行不同時，請使用目標模型傳輸記錄：

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
OPENCLAW_DEBUG_SSE=events \
openclaw gateway
```

若要偵錯載荷形狀 (payload-shape)，請使用 `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`。
這會記錄模型請求的截斷、已編修 JSON 快照；應僅在偵錯期間使用，因為提示詞和訊息文字仍可能會出現。

若要進行串流偵錯，請使用 `OPENCLAW_DEBUG_SSE=peek` 來記錄前五個
已編修 SSE 事件。如果最終提供者載荷在程式碼模式介面啟動後
未剛好包含 `exec` 和 `wait`，程式碼模式也會以封閉方式失敗。

## 實作佈局

實作單元：

- 設定合約：`tools.codeMode`
- 目錄建構器：將有效工具轉換為精簡項目和 ID 對應
- 模型介面介接卡：將可見工具替換為 `exec` 和 `wait`
- QuickJS-WASI 執行時介接卡：載入、評估、快照、還原、處置
- 工作者監督器：逾時、中止、當機隔離
- 橋接介接卡：JSON 安全的主機回呼和結果傳遞
- TypeScript 轉換介接卡
- 快照儲存：TTL、大小上限、執行/工作階段範圍
- 巢狀工具呼叫的軌跡投影
- 遙測計數器和診斷

此實作重用了「工具搜尋」中的目錄和執行器概念，但
不使用 `node:vm` 子進程作為沙盒。

## 驗證檢查清單

程式碼模式的覆蓋範圍應證明：

- 停用的設定會讓現有工具暴露保持不變
- 不含 `enabled: true` 的物件設定會讓程式碼模式保持停用
- 啟用的配置僅向模型公開 `exec` 和 `wait`，當工具在
  執行期間處於啟用狀態時
- 原始無工具執行、`disableTools` 和空許可清單不會觸發代碼模式
  負載強制執行
- 所有有效工具都出現在 `ALL_TOOLS` 中
- 被拒絕的工具不會出現在 `ALL_TOOLS` 中
- `tools.search`、`tools.describe` 和 `tools.call` 適用於 OpenClaw 工具
- 工具搜尋控制工具會從模型介面和隱藏目錄中隱藏
- 巢狀呼叫會保留審批和掛鉤行為
- shell `exec` 對模型隱藏，但在允許時可透過目錄 ID 呼叫
- 遞迴代碼模式 `exec` 和 `wait` 無法從客體代碼呼叫
- TypeScript 輸入會被轉換並評估，而不會在停用或僅 JavaScript 路徑上載入 TypeScript
- `import`、`require`、檔案系統、網路和環境存取會失敗
- 無限迴圈會逾時且無法阻擋閘道
- 記憶體上限失敗會終止客體 VM
- 輸出和快照上限會針對已完成和已暫停的呼叫強制執行
- `wait` 會恢復已暫停的快照並傳回最終值
- 已過期、已中止、錯誤階段和未知的 `runId` 值會失敗
- 文字記錄重播和持久化會保留代碼模式控制呼叫
- 文字記錄和遙測會清楚地顯示巢狀工具呼叫

## 端對端測試計畫

變更執行時，請將這些作為整合或端對端測試來執行：

1. 使用 `tools.codeMode.enabled: false` 啟動閘道。
2. 傳送一個包含小型直接工具集的代理程式輪次。
3. 斷言模型可見的工具未變更。
4. 使用 `tools.codeMode.enabled: true` 重新啟動。
5. 傳送一個包含 OpenClaw、外掛程式、MCP 和用戶端測試工具的代理程式輪次。
6. 斷言模型可見的工具清單剛好是 `exec`、`wait`。
7. 在 `exec` 中，讀取 `ALL_TOOLS` 並斷言有效的測試工具存在。
8. 在 `exec` 中，呼叫 `tools.search`、`tools.describe` 和 `tools.call`。
9. 斷言被拒絕的工具不存在，且無法透過猜測的 ID 呼叫。
10. 啟動一個巢狀工具呼叫，該呼叫會在 `exec` 傳回 `waiting` 後解析。
11. 呼叫 `wait` 並斷言還原的 VM 接收到工具結果。
12. 斷言最終答案包含還原後產生的輸出。
13. 斷言逾時、中止和快照過期會清除執行時狀態。
14. 匯出軌跡並斷言巢狀呼叫可在父 code-mode 呼叫下看到。

對此頁面進行僅文件變更仍應執行 `pnpm check:docs`。

## 相關

- [工具搜尋](/zh-Hant/tools/tool-search)
- [Agent 執行時](/zh-Hant/concepts/agent-runtimes)
- [Exec 工具](/zh-Hant/tools/exec)
- [程式碼執行](/zh-Hant/tools/code-execution)
