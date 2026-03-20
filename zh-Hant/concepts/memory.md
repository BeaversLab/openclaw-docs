---
title: "Memory"
summary: "How OpenClaw memory works (workspace files + automatic memory flush)"
read_when:
  - You want the memory file layout and workflow
  - You want to tune the automatic pre-compaction memory flush
---

# 記憶

OpenClaw 記憶是 **代理工作區中的純 Markdown**。這些檔案是唯一的真相來源；模型只會「記住」寫入磁碟的內容。

記憶搜尋工具由現用的記憶外掛程式提供（預設：
`memory-core`）。使用 `plugins.slots.memory = "none"` 停用記憶外掛程式。

## 記憶檔案 (Markdown)

預設的工作區佈局使用兩個記憶層：

- `memory/YYYY-MM-DD.md`
  - 每日日誌（僅附加）。
  - 在工作階段開始時讀取今天和昨天的內容。
- `MEMORY.md`（選用）
  - 策展的長期記憶。
  - 如果 `MEMORY.md` 和 `memory.md` 同時存在於工作區根目錄中，OpenClaw 只會載入 `MEMORY.md`。
  - 小寫的 `memory.md` 僅在 `MEMORY.md` 不存在時作為後備方案使用。
  - **僅在主要的私人工作階段中載入**（絕不在群組語境中載入）。

這些檔案位於工作區（`agents.defaults.workspace`，預設
`~/.openclaw/workspace`）下。請參閱 [Agent workspace](/zh-Hant/concepts/agent-workspace) 以了解完整的佈局。

## 記憶工具

OpenClaw 為這些 Markdown 檔案提供了兩個供代理使用的工具：

- `memory_search` — 對已索引的片段進行語意回憶。
- `memory_get` — 針對特定 Markdown 檔案/行範圍進行目標讀取。

`memory_get` 現在在檔案不存在時**會優雅降級**（例如，在第一次寫入之前的當天每日日誌）。內建管理員和 QMD
後端都會傳回 `{ text: "", path }` 而不是拋出 `ENOENT`，因此代理可以處理「尚未記錄任何內容」的情況並繼續其工作流程，而無需將工具呼叫包裹在 try/catch 邏輯中。

## 何時寫入記憶

- 決策、偏好設定和持續性事實會寫入 `MEMORY.md`。
- 日常備註和持續進行的語境會寫入 `memory/YYYY-MM-DD.md`。
- 如果有人說「記住這個」，請將其寫下來（不要將其保留在 RAM 中）。
- 此領域仍在演進中。這有助於提醒模型儲存記憶；它會知道該做什麼。
- 如果您希望某些內容被保留下來，**請要求機器人將其寫入**記憶。

## 自動記憶刷新（壓縮前 ping）

當會話**接近自動壓縮**時，OpenClaw 會觸發一個**靜默的、代理式的回合**，提醒模型在上下文被壓縮**之前**寫入持久記憶。預設提示詞明確指出模型*可能會回覆*，但通常 `NO_REPLY` 是正確的回應，因此使用者永遠不會看到這個回合。

這是由 `agents.defaults.compaction.memoryFlush` 控制的：

```json5
{
  agents: {
    defaults: {
      compaction: {
        reserveTokensFloor: 20000,
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 4000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store.",
        },
      },
    },
  },
}
```

詳情：

- **軟性閾值**：當會話 token 預估值超過 `contextWindow - reserveTokensFloor - softThresholdTokens` 時觸發刷新。
- **預設為靜默**：提示詞包含 `NO_REPLY`，因此不會傳送任何內容。
- **兩個提示詞**：一個使用者提示詞加上一個系統提示詞附加了提醒。
- **每個壓縮週期一次刷新**（在 `sessions.json` 中追蹤）。
- **工作區必須可寫入**：如果會話在 `workspaceAccess: "ro"` 或 `"none"` 的沙箱中執行，則會跳過刷新。

有關完整的壓縮生命週期，請參閱
[會話管理 + 壓縮](/zh-Hant/reference/session-management-compaction)。

## 向量記憶搜尋

OpenClaw 可以在 `MEMORY.md` 和 `memory/*.md` 上建立一個小型向量索引，因此即使措辭不同，語意查詢也能找到相關筆記。

預設值：

- 預設啟用。
- 監看記憶檔案的變更（去抖動）。
- 在 `agents.defaults.memorySearch` 下設定記憶搜尋（而非頂層 `memorySearch`）。
- 預設使用遠端嵌入。如果未設定 `memorySearch.provider`，OpenClaw 會自動選擇：
  1. 如果設定了 `memorySearch.local.modelPath` 且該檔案存在，則使用 `local`。
  2. 如果可以解析 OpenAI 金鑰，則使用 `openai`。
  3. 如果可以解析 Gemini 金鑰，則使用 `gemini`。
  4. 如果可以解析 Voyage 金鑰，則使用 `voyage`。
  5. 如果可以解析 Mistral 金鑰，則使用 `mistral`。
  6. 否則，記憶搜尋將保持停用狀態，直到進行設定。
- 本機模式使用 node-llama-cpp，可能需要 `pnpm approve-builds`。
- 使用 sqlite-vec（如果可用）來加速 SQLite 內的向量搜尋。
- `memorySearch.provider = "ollama"` 也支援本機/自託管的 Ollama 嵌入 (`/api/embeddings`)，但不會自動選取。

遠端嵌入**需要**來自嵌入提供商的 API 金鑰。OpenClaw 從設定檔、`models.providers.*.apiKey` 或環境變數解析金鑰。Codex OAuth 僅涵蓋聊天/補全，且**不**滿足記憶體搜尋的嵌入需求。對於 Gemini，請使用 `GEMINI_API_KEY` 或 `models.providers.google.apiKey`。對於 Voyage，請使用 `VOYAGE_API_KEY` 或 `models.providers.voyage.apiKey`。對於 Mistral，請使用 `MISTRAL_API_KEY` 或 `models.providers.mistral.apiKey`。Ollama 通常不需要真實的 API 金鑰（當本機政策需要時，像 `OLLAMA_API_KEY=ollama-local` 這樣的預留位置就足夠了）。
當使用自訂的 OpenAI 相容端點時，請設定 `memorySearch.remote.apiKey`（以及可選的 `memorySearch.remote.headers`）。

### QMD 後端（實驗性）

設定 `memory.backend = "qmd"` 以將內建的 SQLite 索引器替換為 [QMD](https://github.com/tobi/qmd)：一個結合 BM25 + 向量 + 重新排序的本機優先搜尋側車。Markdown 維持為真實來源；OpenClaw 調用 QMD 進行檢索。重點：

**先決條件**

- 預設為停用。需在設定中選擇加入 (`memory.backend = "qmd"`)。
- 單獨安裝 QMD CLI（`bun install -g https://github.com/tobi/qmd` 或下載發行版本），並確保 `qmd` 二進位檔案位於閘道的 `PATH` 中。
- QMD 需要一個允許擴充功能的 SQLite 組建（在 macOS 上為 `brew install sqlite`）。
- QMD 完全透過 Bun + `node-llama-cpp` 在本機執行，並在首次使用時從 HuggingFace 自動下載 GGUF 模型（不需要獨立的 Ollama 守護程式）。
- 透過設定 `XDG_CONFIG_HOME` 和 `XDG_CACHE_HOME`，閘道會在 `~/.openclaw/agents/<agentId>/qmd/` 下的獨立 XDG 目錄中執行 QMD。
- 作業系統支援：一旦安裝了 Bun + SQLite，macOS 和 Linux 即可立即使用。Windows 最好透過 WSL2 支援。

**側車的執行方式**

- 閘道會在 `~/.openclaw/agents/<agentId>/qmd/` 下建立一個獨立的 QMD 家目錄（包含 config + cache + sqlite DB）。
- 集合是透過 `qmd collection add` 從 `memory.qmd.paths` 建立的（加上預設的工作區記憶體檔案），然後 `qmd update` + `qmd embed` 會在啟動時和可設定的間隔（`memory.qmd.update.interval`，預設 5 分鐘）執行。
- 閘道現在會在啟動時初始化 QMD 管理器，因此即使是在第一次 `memory_search` 呼叫之前，週期性更新計時器也會被啟動。
- 啟動刷新現在預設在背景執行，因此不會阻擋聊天啟動；設定 `memory.qmd.update.waitForBootSync = true` 以保持先前的阻擋行為。
- 搜尋透過 `memory.qmd.searchMode` 執行（預設 `qmd search --json`；也支援 `vsearch` 和 `query`）。如果選定的模式在您的 QMD 組建上拒絕了 flags，OpenClaw 會使用 `qmd query` 重試。如果 QMD 失敗或缺少二進位檔，OpenClaw 會自動回退到內建的 SQLite 管理器，讓記憶體工具保持運作。
- OpenClaw 目前不公開 QMD embed batch-size 調整；batch 行為由 QMD 本身控制。
- **首次搜尋可能會很慢**：QMD 可能會在第一次執行 `qmd query` 時下載本機 GGUF 模型（reranker/query expansion）。
  - OpenClaw 在執行 QMD 時會自動設定 `XDG_CONFIG_HOME`/`XDG_CACHE_HOME`。
  - 如果您想手動預先下載模型（並預熱 OpenClaw 使用的相同索引），請使用 agent 的 XDG 目錄執行一次性查詢。

    OpenClaw 的 QMD 狀態位於您的 **state dir** 下（預設為 `~/.openclaw`）。您可以透過匯出與 OpenClaw 相同的 XDG 變數，將 `qmd` 指向完全相同的索引：

    ```bash
    # Pick the same state dir OpenClaw uses
    STATE_DIR="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"

    export XDG_CONFIG_HOME="$STATE_DIR/agents/main/qmd/xdg-config"
    export XDG_CACHE_HOME="$STATE_DIR/agents/main/qmd/xdg-cache"

    # (Optional) force an index refresh + embeddings
    qmd update
    qmd embed

    # Warm up / trigger first-time model downloads
    qmd query "test" -c memory-root --json >/dev/null 2>&1
    ```

**Config surface (`memory.qmd.*`)**

- `command` (預設 `qmd`)：覆寫可執行檔路徑。
- `searchMode` (預設 `search`)：選擇哪個 QMD 指令支援 `memory_search` (`search`, `vsearch`, `query`)。
- `includeDefaultMemory` (預設 `true`)：自動索引 `MEMORY.md` + `memory/**/*.md`。
- `paths[]`：新增額外的目錄/檔案 (`path`，選用 `pattern`，選用穩定 `name`)。
- `sessions`：選擇啟用工作階段 JSONL 索引 (`enabled`，`retentionDays`，
  `exportDir`)。
- `update`：控制重新整理頻率與維護執行：
  (`interval`，`debounceMs`，`onBoot`，`waitForBootSync`，`embedInterval`，
  `commandTimeoutMs`，`updateTimeoutMs`，`embedTimeoutMs`)。
- `limits`：限制擷取回傳的內容 (`maxResults`，`maxSnippetChars`，
  `maxInjectedChars`，`timeoutMs`)。
- `scope`：與 [`session.sendPolicy`](/zh-Hant/gateway/configuration#session) 相同的結構描述。
  預設僅限 DM (`deny` 全部，`allow` 直接聊天)；放寬限制以在群組/頻道中顯示 QMD
  命中結果。
  - `match.keyPrefix` 符合**正規化** 的工作階段金鑰 (小寫，移除任何前導 `agent:<id>:`)。範例：`discord:channel:`。
  - `match.rawKeyPrefix` 符合**原始** (raw) 工作階段金鑰 (小寫)，包括
    `agent:<id>:`。範例：`agent:main:discord:`。
  - 舊版：`match.keyPrefix: "agent:..."` 仍被視為原始金鑰前綴，
    但為了清晰起見，建議優先使用 `rawKeyPrefix`。
- 當 `scope` 拒絕搜尋時，OpenClaw 會記錄一則包含衍生
  `channel`/`chatType` 的警告，以便更容易除錯空結果。
- 來自工作區外部的片段會以 `qmd/<collection>/<relative-path>` 的形式顯示在 `memory_search` 結果中；`memory_get` 會識別該前綴，並從設定的 QMD collection root 讀取資料。
- 當 `memory.qmd.sessions.enabled = true` 時，OpenClaw 會將清理過的會話紀錄（使用者/助理對話回合）匯出到 `~/.openclaw/agents/<id>/qmd/sessions/` 下的專用 QMD 集合中，以便 `memory_search` 能夠在不存取內建 SQLite 索引的情況下回憶最近的對話。
- 當 `memory.citations` 為 `auto`/`on` 時，`memory_search` 片段現在會包含 `Source: <path#line>` 頁尾；設定 `memory.citations = "off"` 可將路徑元數據保持在內部（代理仍會接收 `memory_get` 的路徑，但片段文字會省略頁尾，且系統提示會警告代理不要引用它）。

**範例**

```json5
memory: {
  backend: "qmd",
  citations: "auto",
  qmd: {
    includeDefaultMemory: true,
    update: { interval: "5m", debounceMs: 15000 },
    limits: { maxResults: 6, timeoutMs: 4000 },
    scope: {
      default: "deny",
      rules: [
        { action: "allow", match: { chatType: "direct" } },
        // Normalized session-key prefix (strips `agent:<id>:`).
        { action: "deny", match: { keyPrefix: "discord:channel:" } },
        // Raw session-key prefix (includes `agent:<id>:`).
        { action: "deny", match: { rawKeyPrefix: "agent:main:discord:" } },
      ]
    },
    paths: [
      { name: "docs", path: "~/notes", pattern: "**/*.md" }
    ]
  }
}
```

**引用與備援**

- `memory.citations` 適用於任何後端 (`auto`/`on`/`off`)。
- 當 `qmd` 執行時，我們會標記 `status().backend = "qmd"`，以便診斷資訊顯示結果是由哪個引擎提供的。如果 QMD 子程序結束或無法解析 JSON 輸出，搜尋管理員會記錄警告並傳回內建提供者（現有的 Markdown 嵌入），直到 QMD 恢復為止。

### 額外的記憶路徑

如果您想要索引預設工作區佈局之外的 Markdown 檔案，請加入明確的路徑：

```json5
agents: {
  defaults: {
    memorySearch: {
      extraPaths: ["../team-docs", "/srv/shared-notes/overview.md"]
    }
  }
}
```

備註：

- 路徑可以是絕對路徑或相對於工作區的路徑。
- 目錄會遞迴掃描 `.md` 檔案。
- 預設情況下，只會索引 Markdown 檔案。
- 如果 `memorySearch.multimodal.enabled = true`，OpenClaw 也會僅在 `extraPaths` 之下索引支援的圖片/音訊檔案。預設的記憶根目錄 (`MEMORY.md`、`memory.md`、`memory/**/*.md`) 則維持僅限 Markdown。
- 符號連結會被忽略（檔案或目錄）。

### 多模態記憶檔案 (Gemini 圖片 + 音訊)

使用 Gemini embedding 2 時，OpenClaw 可以索引來自 `memorySearch.extraPaths` 的圖片和音訊檔案：

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "gemini",
      model: "gemini-embedding-2-preview",
      extraPaths: ["assets/reference", "voice-notes"],
      multimodal: {
        enabled: true,
        modalities: ["image", "audio"], // or ["all"]
        maxFileBytes: 10000000
      },
      remote: {
        apiKey: "YOUR_GEMINI_API_KEY"
      }
    }
  }
}
```

備註：

- 多模態記憶目前僅支援 `gemini-embedding-2-preview`。
- 多模態索引僅適用於透過 `memorySearch.extraPaths` 發現的檔案。
- 此階段支援的模態：圖片和音訊。
- 啟用多模態記憶時，`memorySearch.fallback` 必須保持 `"none"`。
- 相符的圖片/音訊檔案位元組會在索引期間上傳至設定的 Gemini embedding 端點。
- 支援的圖片副檔名：`.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`、`.heic`、`.heif`。
- 支援的音訊副檔名：`.mp3`、`.wav`、`.ogg`、`.opus`、`.m4a`、`.aac`、`.flac`。
- 搜尋查詢仍為文字，但 Gemini 可以將這些文字查詢與已索引的圖片/音訊嵌入進行比較。
- `memory_get` 仍然僅讀取 Markdown；二進位檔案可搜尋，但不會以原始檔案內容形式傳回。

### Gemini embeddings (原生)

將供應商設定為 `gemini` 以直接使用 Gemini embeddings API：

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "gemini",
      model: "gemini-embedding-001",
      remote: {
        apiKey: "YOUR_GEMINI_API_KEY"
      }
    }
  }
}
```

備註：

- `remote.baseUrl` 是選用的（預設為 Gemini API 基礎 URL）。
- 如有需要，`remote.headers` 可讓您新增額外的標頭。
- 預設模型：`gemini-embedding-001`。
- 也支援 `gemini-embedding-2-preview`：8192 token 限制和可配置的維度（768 / 1536 / 3072，預設為 3072）。

#### Gemini Embedding 2 (預覽)

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "gemini",
      model: "gemini-embedding-2-preview",
      outputDimensionality: 3072,  // optional: 768, 1536, or 3072 (default)
      remote: {
        apiKey: "YOUR_GEMINI_API_KEY"
      }
    }
  }
}
```

> **⚠️ 需要重新索引：** 從 `gemini-embedding-001` (768 維)
> 切換到 `gemini-embedding-2-preview` (3072 維) 會改變向量大小。如果您
> 在 768、1536 和 3072 之間變更 `outputDimensionality` 也是一樣。
> 當 OpenClaw 偵測到模型或維度變更時，會自動重新索引。

如果您想要使用**自訂 OpenAI 相容端點**（OpenRouter、vLLM 或 Proxy），
您可以搭配 OpenAI 提供者使用 `remote` 設定：

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "openai",
      model: "text-embedding-3-small",
      remote: {
        baseUrl: "https://api.example.com/v1/",
        apiKey: "YOUR_OPENAI_COMPAT_API_KEY",
        headers: { "X-Custom-Header": "value" }
      }
    }
  }
}
```

如果您不想設定 API 金鑰，請使用 `memorySearch.provider = "local"` 或設定
`memorySearch.fallback = "none"`。

後備機制：

- `memorySearch.fallback` 可以是 `openai`、`gemini`、`voyage`、`mistral`、`ollama`、`local` 或 `none`。
- 僅在主要嵌入提供者失敗時才會使用後備提供者。

批次索引（OpenAI + Gemini + Voyage）：

- 預設為停用。設定 `agents.defaults.memorySearch.remote.batch.enabled = true` 以針對大型語料庫索引（OpenAI、Gemini 和 Voyage）啟用。
- 預設行為會等待批次完成；如有需要，請調整 `remote.batch.wait`、`remote.batch.pollIntervalMs` 和 `remote.batch.timeoutMinutes`。
- 設定 `remote.batch.concurrency` 以控制我們平行提交的批次工作數量（預設：2）。
- 當設定 `memorySearch.provider = "openai"` 或 `"gemini"` 時會套用批次模式，並使用對應的 API 金鑰。
- Gemini 批次工作會使用非同步嵌入批次端點，並要求 Gemini Batch API 的可用性。

為什麼 OpenAI 批次快速又便宜：

- 對於大量補填，OpenAI 通常是我們支援的最快選項，因為我們可以在單一批次工作中提交許多嵌入請求，並讓 OpenAI 非同步處理它們。
- OpenAI 提供 Batch API 工作的折扣價格，因此大型索引執行通常比同步傳送相同請求更便宜。
- 請參閱 OpenAI Batch API 文件和定價以取得詳細資訊：
  - [https://platform.openai.com/docs/api-reference/batch](https://platform.openai.com/docs/api-reference/batch)
  - [https://platform.openai.com/pricing](https://platform.openai.com/pricing)

設定範例：

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "openai",
      model: "text-embedding-3-small",
      fallback: "openai",
      remote: {
        batch: { enabled: true, concurrency: 2 }
      },
      sync: { watch: true }
    }
  }
}
```

工具：

- `memory_search` — 傳回包含檔案 + 行數範圍的程式碼片段。
- `memory_get` — 依路徑讀取記憶檔案內容。

本機模式：

- 設定 `agents.defaults.memorySearch.provider = "local"`。
- 提供 `agents.defaults.memorySearch.local.modelPath`（GGUF 或 `hf:` URI）。
- 選用：設定 `agents.defaults.memorySearch.fallback = "none"` 以避免遠端後備。

### 記憶工具的運作方式

- `memory_search` 語義搜尋來自 `MEMORY.md` + `memory/**/*.md` 的 Markdown 區塊（目標約 400 token，80 token 重疊）。它返回片段文字（上限約 700 字元）、檔案路徑、行範圍、分數、提供者/模型，以及我們是否從本機遠端嵌入模型進行了回退。不會返回完整的檔案內容。
- `memory_get` 讀取特定的記憶體 Markdown 檔案（相對於工作區），可選從起始行開始並讀取 N 行。`MEMORY.md` / `memory/` 之外的路徑將被拒絕。
- 只有當 `memorySearch.enabled` 對該代理程式解析為 true 時，這兩個工具才會啟用。

### 什麼被索引（以及何時）

- 檔案類型：僅限 Markdown（`MEMORY.md`、`memory/**/*.md`）。
- 索引儲存：位於 `~/.openclaw/memory/<agentId>.sqlite` 的各代理程式 SQLite 資料庫（可透過 `agents.defaults.memorySearch.store.path` 配置，支援 `{agentId}` token）。
- 新鮮度：監視 `MEMORY.md` + `memory/` 的監視器會將索引標記為髒（去彈跳 1.5 秒）。同步會在會話開始時、搜尋時或定期排程並非同步執行。會話記錄使用增量閾值來觸發背景同步。
- 重新索引觸發條件：索引儲存了嵌入 **提供者/模型 + 端點指紋 + 分塊參數**。如果其中任何一項發生變更，OpenClaw 會自動重置並重新索引整個儲存庫。

### 混合搜尋（BM25 + 向量）

啟用後，OpenClaw 結合：

- **向量相似度**（語義匹配，措辭可能不同）
- **BM25 關鍵字相關性**（精確 token，如 ID、環境變數、程式碼符號）

如果您平台上的全文搜尋不可用，OpenClaw 會回退到僅向量搜尋。

#### 為什麼要混合？

向量搜尋擅長「意義相同」的情況：

- 「Mac Studio gateway host」與「the machine running the gateway」
- 「debounce file updates」與「avoid indexing on every write」

但對於精確、高信號的 token 可能較弱：

- ID（`a828e60`、`b3b9895a…`）
- 程式碼符號（`memorySearch.query.hybrid`）
- 錯誤字串（"sqlite-vec unavailable"）

BM25（全文檢索）則相反：精準 token 匹配強，但處理改寫時較弱。
混合搜尋則是務實的中庸之道：**同時使用兩種檢索訊號**，讓您無論是針對「自然語言」查詢還是「大海撈針」式查詢，都能獲得良好的結果。

#### 我們如何合併結果（目前的設計）

實作概要：

1. 從雙方檢索候選池：

- **向量**：依餘弦相似度取前 `maxResults * candidateMultiplier` 名。
- **BM25**：依 FTS5 BM25 排名取前 `maxResults * candidateMultiplier` 名（越低越好）。

2. 將 BM25 排名轉換為 0 到 1 左右的分數：

- `textScore = 1 / (1 + max(0, bm25Rank))`

3. 透過 chunk id 合併候選並計算加權分數：

- `finalScore = vectorWeight * vectorScore + textWeight * textScore`

備註：

- `vectorWeight` + `textWeight` 在配置解析時會正規化為 1.0，因此權重表現為百分比。
- 如果嵌入不可用（或提供者傳回零向量），我們仍會執行 BM25 並傳回關鍵字相符項目。
- 如果無法建立 FTS5，我們將保留僅向量搜尋（不會產生嚴重錯誤）。

這算不上「IR 理論完美」，但簡單、快速，且傾向於提升真實筆記的召回率與精確率。
若日後想要更花俏，常見的下一步是在混合前採用倒數排名融合（RRF）或分數正規化
（最小/最大或 z-score）。

#### 後處理管線

合併向量與關鍵字分數後，在結果清單傳送至代理之前，有兩個可選的後處理階段
會對其進行精煉：

```
Vector + Keyword → Weighted Merge → Temporal Decay → Sort → MMR → Top-K Results
```

這兩個階段預設皆**關閉**，且可獨立啟用。

#### MMR 重新排序（多樣性）

當混合搜尋傳回結果時，多個區塊可能包含相似或重疊的內容。
舉例來說，搜尋「家用網路設定」可能會傳回五個幾乎完全相同的片段，
來自不同的每日筆記，且都提及相同的路由器設定。

**MMR（最大邊際相關性）** 會重新排列結果，以平衡相關性與多樣性，
確保頂部結果涵蓋查詢的不同面向，而不是重複相同的資訊。

運作方式：

1. 結果會根據其原始相關性（向量 + BM25 加權分數）進行評分。
2. MMR 會反覆選取能最大化以下數值的結果：`λ × relevance − (1−λ) × max_similarity_to_selected`。
3. 結果之間的相似度是使用 token 化內容上的 Jaccard 文字相似度來衡量。

`lambda` 參數控制了這種權衡：

- `lambda = 1.0` → 純相關性（無多樣性懲罰）
- `lambda = 0.0` → 最大多樣性（忽略相關性）
- 預設值：`0.7`（平衡，略微偏向相關性）

**範例 — 查詢：「home network setup」**

給定這些記憶檔案：

```
memory/2026-02-10.md  → "Configured Omada router, set VLAN 10 for IoT devices"
memory/2026-02-08.md  → "Configured Omada router, moved IoT to VLAN 10"
memory/2026-02-05.md  → "Set up AdGuard DNS on 192.168.10.2"
memory/network.md     → "Router: Omada ER605, AdGuard: 192.168.10.2, VLAN 10: IoT"
```

不使用 MMR — 前 3 個結果：

```
1. memory/2026-02-10.md  (score: 0.92)  ← router + VLAN
2. memory/2026-02-08.md  (score: 0.89)  ← router + VLAN (near-duplicate!)
3. memory/network.md     (score: 0.85)  ← reference doc
```

使用 MMR (λ=0.7) — 前 3 個結果：

```
1. memory/2026-02-10.md  (score: 0.92)  ← router + VLAN
2. memory/network.md     (score: 0.85)  ← reference doc (diverse!)
3. memory/2026-02-05.md  (score: 0.78)  ← AdGuard DNS (diverse!)
```

2 月 8 日近乎重複的內容被排除，代理程式取得了三個不同的資訊片段。

**啟用時機：** 如果您發現 `memory_search` 回傳了重複或近乎重複的摘要，
特別是當每日筆記經常在不同天數重複類似資訊時。

#### 時間衰減（近況加權）

擁有每日筆記的代理程式隨著時間會累積數百個帶有日期的檔案。若無衰減機制，
六個月前措辭良好的筆記可能會超越昨天關於同一主題的更新。

**時間衰減** 會根據每個結果的時間對分數套用指數乘數，
因此近期的記憶自然排名較高，而舊記憶會逐漸淡化：

```
decayedScore = score × e^(-λ × ageInDays)
```

其中 `λ = ln(2) / halfLifeDays`。

預設半衰期為 30 天時：

- 今天的筆記：原始分數的 **100%**
- 7 天前：**約 84%**
- 30 天前：**50%**
- 90 天前：**12.5%**
- 180 天前：**約 1.6%**

**常青檔案永不衰減：**

- `MEMORY.md`（根記憶檔案）
- `memory/` 中無日期的檔案（例如 `memory/projects.md`、`memory/network.md`）
- 這些檔案包含應始終正常排名的持久參考資訊。

**帶日期的每日檔案** (`memory/YYYY-MM-DD.md`) 使用從檔名中提取的日期。
其他來源（例如會話記錄）則退回使用檔案修改時間 (`mtime`)。

**範例 — 查詢：「what's Rod's work schedule?」**

給定這些記憶檔案（今天是 2 月 10 日）：

```
memory/2025-09-15.md  → "Rod works Mon-Fri, standup at 10am, pairing at 2pm"  (148 days old)
memory/2026-02-10.md  → "Rod has standup at 14:15, 1:1 with Zeb at 14:45"    (today)
memory/2026-02-03.md  → "Rod started new team, standup moved to 14:15"        (7 days old)
```

不使用衰減：

```
1. memory/2025-09-15.md  (score: 0.91)  ← best semantic match, but stale!
2. memory/2026-02-10.md  (score: 0.82)
3. memory/2026-02-03.md  (score: 0.80)
```

使用衰減 (halfLife=30)：

```
1. memory/2026-02-10.md  (score: 0.82 × 1.00 = 0.82)  ← today, no decay
2. memory/2026-02-03.md  (score: 0.80 × 0.85 = 0.68)  ← 7 days, mild decay
3. memory/2025-09-15.md  (score: 0.91 × 0.03 = 0.03)  ← 148 days, nearly gone
```

過時的 9 月筆記儘管擁有最佳原始語意匹配，但仍降至底部。

**何時啟用：** 如果您的 Agent 有數月的日記並且發現舊的、過時的資訊排名高於最近的語境。對於重度依賴日記的工作流程，30 天的半衰期效果良好；如果您經常參考較舊的筆記，則延長它（例如 90 天）。

#### 設定

這兩項功能皆在 `memorySearch.query.hybrid` 下設定：

```json5
agents: {
  defaults: {
    memorySearch: {
      query: {
        hybrid: {
          enabled: true,
          vectorWeight: 0.7,
          textWeight: 0.3,
          candidateMultiplier: 4,
          // Diversity: reduce redundant results
          mmr: {
            enabled: true,    // default: false
            lambda: 0.7       // 0 = max diversity, 1 = max relevance
          },
          // Recency: boost newer memories
          temporalDecay: {
            enabled: true,    // default: false
            halfLifeDays: 30  // score halves every 30 days
          }
        }
      }
    }
  }
}
```

您可以獨立啟用任一功能：

- **僅 MMR** — 當您有許多類似的筆記但時間不重要時很有用。
- **僅時間衰減** — 當時間新舊很重要但您的結果已經多樣化時很有用。
- **兩者皆啟用** — 推薦用於擁有大量、長期運行的日記歷史的 Agent。

### 嵌入快取

OpenClaw 可以在 SQLite 中快取 **區塊嵌入 (chunk embeddings)**，因此重新索引和頻繁更新（特別是會話逐字稿）不會重新嵌入未變更的文字。

設定：

```json5
agents: {
  defaults: {
    memorySearch: {
      cache: {
        enabled: true,
        maxEntries: 50000
      }
    }
  }
}
```

### 會話記憶搜尋（實驗性）

您可以選擇索引 **會話逐字稿** 並透過 `memory_search` 顯示它們。
這受限於實驗性標誌。

```json5
agents: {
  defaults: {
    memorySearch: {
      experimental: { sessionMemory: true },
      sources: ["memory", "sessions"]
    }
  }
}
```

注意事項：

- 會話索引為 **選用加入**（預設關閉）。
- 會話更新會被防抖 (debounced) 並在超過增量閾值後**非同步索引**（盡力而為）。
- `memory_search` 永遠不會因索引而阻塞；在背景同步完成之前，結果可能會稍微過時。
- 結果仍僅包含片段；`memory_get` 仍僅限於記憶檔案。
- 會話索引是按 Agent 隔離的（僅索引該 Agent 的會話日誌）。
- 會話日誌存在於磁碟上 (`~/.openclaw/agents/<agentId>/sessions/*.jsonl`)。任何具有檔案系統存取權限的處理程序/使用者都可以讀取它們，因此將磁碟存取視為信任邊界。若要更嚴格地隔離，請在不同的 OS 使用者或主機下執行 Agent。

增量閾值（顯示預設值）：

```json5
agents: {
  defaults: {
    memorySearch: {
      sync: {
        sessions: {
          deltaBytes: 100000,   // ~100 KB
          deltaMessages: 50     // JSONL lines
        }
      }
    }
  }
}
```

### SQLite 向量加速 (sqlite-vec)

當 sqlite-vec 擴充功能可用時，OpenClaw 會將嵌入儲存在
SQLite 虛擬資料表 (`vec0`) 中，並在
資料庫中執行向量距離查詢。這樣可以在不將每個嵌入載入到 JS 的情況下保持搜尋快速。

設定（選用）：

```json5
agents: {
  defaults: {
    memorySearch: {
      store: {
        vector: {
          enabled: true,
          extensionPath: "/path/to/sqlite-vec"
        }
      }
    }
  }
}
```

注意事項：

- `enabled` 預設為 true；停用時，搜尋會回退到針對儲存嵌入的
  程序內餘弦相似度計算。
- 如果 sqlite-vec 擴充功能缺失或載入失敗，OpenClaw 會記錄錯誤並繼續使用 JS 後備方案（無向量表）。
- `extensionPath` 會覆寫內建的 sqlite-vec 路徑（適用於自訂建置或非標準安裝位置）。

### 本地嵌入自動下載

- 預設的本地嵌入模型：`hf:ggml-org/embeddinggemma-300m-qat-q8_0-GGUF/embeddinggemma-300m-qat-Q8_0.gguf`（約 0.6 GB）。
- 當 `memorySearch.provider = "local"` 時，`node-llama-cpp` 會解析 `modelPath`；如果 GGUF 檔案缺失，它會**自動下載**到快取（如果設定則為 `local.modelCacheDir`），然後載入它。下載會在重試時繼續。
- 原生建置需求：執行 `pnpm approve-builds`，選擇 `node-llama-cpp`，然後 `pnpm rebuild node-llama-cpp`。
- 後備方案：如果本地設定失敗且 `memorySearch.fallback = "openai"`，我們會自動切換到遠端嵌入（除非覆寫，否則為 `openai/text-embedding-3-small`）並記錄原因。

### 自訂 OpenAI 相容端點範例

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "openai",
      model: "text-embedding-3-small",
      remote: {
        baseUrl: "https://api.example.com/v1/",
        apiKey: "YOUR_REMOTE_API_KEY",
        headers: {
          "X-Organization": "org-id",
          "X-Project": "project-id"
        }
      }
    }
  }
}
```

注意：

- `remote.*` 的優先順序高於 `models.providers.openai.*`。
- `remote.headers` 會與 OpenAI 標頭合併；發生金鑰衝突時以遠端為準。省略 `remote.headers` 以使用 OpenAI 預設值。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
