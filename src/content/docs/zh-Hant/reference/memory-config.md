---
title: "記憶體配置參考"
summary: "OpenClaw 記憶體搜尋、嵌入提供者、QMD 後端、混合搜尋和多模態記憶體的完整配置參考"
read_when:
  - You want to configure memory search providers or embedding models
  - You want to set up the QMD backend
  - You want to tune hybrid search, MMR, or temporal decay
  - You want to enable multimodal memory indexing
---

# 記憶體配置參考

本頁涵蓋了 OpenClaw 記憶體搜尋的完整配置表面。若要
了解概念概述（檔案佈局、記憶體工具、何時寫入記憶體，以及
自動排清），請參閱 [記憶體](/zh-Hant/concepts/memory)。

## 記憶體搜尋預設值

- 預設啟用。
- 監看記憶體檔案的變更（已去彈跳）。
- 在 `agents.defaults.memorySearch` 下配置記憶體搜尋（而非頂層
  `memorySearch`）。
- 預設使用遠端嵌入。如果未設定 `memorySearch.provider`，OpenClaw 會自動選擇：
  1. 如果設定了 `memorySearch.local.modelPath` 且該檔案存在，則使用 `local`。
  2. 如果可以解析到 OpenAI 金鑰，則使用 `openai`。
  3. 如果可以解析到 Gemini 金鑰，則使用 `gemini`。
  4. 如果可以解析到 Voyage 金鑰，則使用 `voyage`。
  5. `mistral` 如果可以解析 Mistral 金鑰。
  6. 否則記憶體搜尋將保持停用狀態，直到進行設定。
- 本地模式使用 node-llama-cpp，可能需要 `pnpm approve-builds`。
- 使用 sqlite-vec（可用時）來加速 SQLite 內部的向量搜尋。
- `memorySearch.provider = "ollama"` 也支援本地/自託管的 Ollama 嵌入 (`/api/embeddings`)，但不會自動選取。

遠端嵌入**需要**來自嵌入提供者的 API 金鑰。OpenClaw 從 auth profiles、`models.providers.*.apiKey` 或環境變數中解析金鑰。Codex OAuth 僅涵蓋 chat/completions，並**不**滿足記憶體搜尋的嵌入需求。對於 Gemini，請使用 `GEMINI_API_KEY` 或 `models.providers.google.apiKey`。對於 Voyage，請使用 `VOYAGE_API_KEY` 或 `models.providers.voyage.apiKey`。對於 Mistral，請使用 `MISTRAL_API_KEY` 或 `models.providers.mistral.apiKey`。Ollama 通常不需要真正的 API 金鑰（當本地策略需要時，像 `OLLAMA_API_KEY=ollama-local` 這樣的佔位符就足夠了）。
當使用自訂的 OpenAI 相容端點時，請設定 `memorySearch.remote.apiKey`（以及可選的 `memorySearch.remote.headers`）。

## QMD 後端（實驗性）

設定 `memory.backend = "qmd"` 即可將內建的 SQLite 索引器替換為 [QMD](https://github.com/tobi/qmd)：一個結合了 BM25 + 向量 + 重排序的本地優先搜尋 sidecar。Markdown 仍為唯一的真實來源；OpenClaw 會呼叫 QMD 進行檢索。重點：

### 先決條件

- 預設為停用。需在組態中選擇加入 (`memory.backend = "qmd"`)。
- 單獨安裝 QMD CLI (`bun install -g https://github.com/tobi/qmd` 或下載
  發行版本)，並確保 `qmd` 二進位檔位於 gateway 的 `PATH` 中。
- QMD 需要一個允許擴充功能的 SQLite 組建 (在 macOS 上為
  `brew install sqlite`)。
- QMD 透過 Bun + `node-llama-cpp` 完全在本地運行，並在首次使用時自動從 HuggingFace 下載 GGUF 模型 (無需獨立的 Ollama 守護程序)。
- 閘道透過設定 `XDG_CONFIG_HOME` 和
  `XDG_CACHE_HOME`，在 `~/.openclaw/agents/<agentId>/qmd/` 下的一個獨立 XDG home 中執行 QMD。
- 作業系統支援：一旦安裝了 Bun + SQLite，macOS 和 Linux 即可直接運作。Windows 最好透過 WSL2 來獲得支援。

### Sidecar 的運作方式

- 閘道會在 `~/.openclaw/agents/<agentId>/qmd/` 下寫入一個獨立的 QMD home（設定 + 快取 + sqlite DB）。
- 集合是透過來自 `memory.qmd.paths` 的 `qmd collection add` 建立的
  （加上預設的工作區記憶體檔案），然後 `qmd update` + `qmd embed` 會在
  啟動時和可設定的間隔時間執行（`memory.qmd.update.interval`，
  預設 5 分鐘）。
- 閘道現在會在啟動時初始化 QMD 管理器，因此定期更新計時器
  會在第一次 `memory_search` 呼叫之前就已啟動。
- Boot refresh 現在預設於後台執行，因此不會阻擋聊天啟動；設定 `memory.qmd.update.waitForBootSync = true` 以保持先前的阻擋行為。
- 搜尋透過 `memory.qmd.searchMode` 執行（預設 `qmd search --json`；亦支援 `vsearch` 與 `query`）。如果您 QMD 建構版本選用的模式不支援某些旗標，OpenClaw 會重試使用 `qmd query`。如果 QMD 失敗或找不到二進位檔，OpenClaw 會自動回退到內建 SQLite 管理員，讓記憶體工具持續運作。
- OpenClaw 目前未開放 QMD embed batch-size 的調整；批次行為由 QMD 本身控制。
- **首次搜尋可能較慢**：QMD 可能會在首次執行 `qmd query` 時下載本機 GGUF 模型（reranker/query expansion）。
  - OpenClaw 在執行 QMD 時會自動設定 `XDG_CONFIG_HOME`/`XDG_CACHE_HOME`。
  - 如果您想手動預先下載模型（並預熱 OpenClaw 使用的相同索引），請使用代理程式的 XDG 目錄執行一次性查詢。

    OpenClaw 的 QMD 狀態位於您的 **state dir** 下（預設為 `~/.openclaw`）。您可以透過匯出 OpenClaw 使用的相同 XDG 變數，將 `qmd` 指向完全相同的索引：

    ```exec
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

### 設定介面 (`memory.qmd.*`)

- `command`（預設 `qmd`）：覆寫可執行檔路徑。
- `searchMode`（預設 `search`）：選擇哪個 QMD 指令支援
  `memory_search`（`search`、`vsearch`、`query`）。
- `includeDefaultMemory` (預設 `true`): 自動索引 `MEMORY.md` + `memory/**/*.md`。
- `paths[]`: 新增額外的目錄/檔案 (`path`, 選用 `pattern`, 選用
  穩定版 `name`)。
- `sessions`: 選擇啟用工作階段 JSONL 索引 (`enabled`, `retentionDays`,
  `exportDir`)。
- `update`：控制重新整理頻率與維護執行：
  (`interval`, `debounceMs`, `onBoot`, `waitForBootSync`, `embedInterval`,
  `commandTimeoutMs`, `updateTimeoutMs`, `embedTimeoutMs`)。
- `limits`：限制回傳內容 (`maxResults`, `maxSnippetChars`,
  `maxInjectedChars`, `timeoutMs`)。
- `scope`：與 [`session.sendPolicy`](/zh-Hant/gateway/configuration-reference#session) 相同的架構。
  預設僅限私訊 (`deny` 全部，`allow` 直接聊天)；若要讓 QMD
  命中結果顯示於群組/頻道中，請放寬此設定。
  - `match.keyPrefix` 符合**標準化**的 session key（小寫，並移除任何前導 `agent:<id>:`）。範例：`discord:channel:`。
  - `match.rawKeyPrefix` 符合**原始** session key（小寫），包括 `agent:<id>:`。範例：`agent:main:discord:`。
  - 舊版：`match.keyPrefix: "agent:..."` 仍被視為原始金鑰前綴，但為了清晰起見，建議使用 `rawKeyPrefix`。
- 當 `scope` 拒絕搜尋時，OpenClaw 會記錄一個包含衍生 `channel`/`chatType` 的警告，以便更容易調試空結果。
- 來源於工作區外部的片段會顯示為
  `qmd/<collection>/<relative-path>` 在 `memory_search` 結果中；`memory_get`
  會理解該前綴，並從配置的 QMD 集合根目錄讀取。
- 當 `memory.qmd.sessions.enabled = true` 時，OpenClaw 會將清理後的會話
  轉錄（User/Assistant 輪次）匯出到 `~/.openclaw/agents/<id>/qmd/sessions/` 下的專用 QMD 集合中，以便 `memory_search` 能夠回憶最近的
  對話，而無需接觸內建的 SQLite 索引。
- 當 `memory.citations` 為 `auto`/`on` 時，`memory_search` 片段現在包含 `Source: <path#line>` 頁尾；設定 `memory.citations = "off"` 可將路徑中繼資料保持在內部（代理仍會接收 `memory_get` 的路徑，但片段文字會省略頁尾，且系統提示會警告代理不要引用它）。

### QMD 範例

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

### 引用與後援

- `memory.citations` 無論後端為何皆適用 (`auto`/`on`/`off`)。
- 當 `qmd` 執行時，我們會標記 `status().backend = "qmd"`，以便診斷資訊顯示哪個引擎提供了結果。如果 QMD 子程序退出或無法解析 JSON 輸出，搜尋管理器會記錄警告並返回內建提供者（現有的 Markdown 嵌入），直到 QMD 恢復。

## 額外的記憶路徑

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

注意事項：

- 路徑可以是絕對路徑或相對於工作區的路徑。
- 目錄會以遞迴方式掃描 `.md` 檔案。
- 預設情況下，僅索引 Markdown 檔案。
- 如果 `memorySearch.multimodal.enabled = true`，OpenClaw 也會僅在 `extraPaths` 下索引支援的圖片/音訊檔案。預設記憶根目錄（`MEMORY.md`、`memory.md`、`memory/**/*.md`）保持僅限 Markdown。
- 符號連結會被忽略（檔案或目錄）。

## 多模態記憶檔案（Gemini 圖片 + 音訊）

使用 Gemini embedding 2 時，OpenClaw 可以從 `memorySearch.extraPaths` 索引圖片和音訊檔案：

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

注意：

- 多模態記憶目前僅支援 `gemini-embedding-2-preview`。
- 多模態索引僅適用於透過 `memorySearch.extraPaths` 發現的檔案。
- 此階段支援的模態：圖片和音訊。
- 啟用多模態記憶時，`memorySearch.fallback` 必須保持 `"none"`。
- 相符的圖片/音訊檔案位元組會在索引期間上傳至設定的 Gemini 端點。
- 支援的圖片副檔名：`.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`、`.heic`、`.heif`。
- 支援的音訊副檔名：`.mp3`、`.wav`、`.ogg`、`.opus`、`.m4a`、`.aac`、`.flac`。
- 搜尋查詢仍為文字，但 Gemini 可以將這些文字查詢與已建立的索引圖片/音訊嵌入進行比較。
- `memory_get` 仍然僅讀取 Markdown；二進位檔案可被搜尋，但不會以原始檔案內容形式傳回。

## Gemini 嵌入（原生）

將提供者設定為 `gemini` 以直接使用 Gemini embeddings API：

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

註記：

- `remote.baseUrl` 是選用的（預設為 Gemini API 基礎 URL）。
- `remote.headers` 讓您可以在需要時加入額外的標頭。
- 預設模型：`gemini-embedding-001`。
- 也支援 `gemini-embedding-2-preview`：8192 token 限制和可設定的維度（768 / 1536 / 3072，預設為 3072）。

### Gemini Embedding 2 (preview)

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

> **需要重新索引：** 從 `gemini-embedding-001`（768 維度）
> 切換到 `gemini-embedding-2-preview`（3072 維度）會改變向量大小。如果您
> 在 768、1536 和 3072 之間變更 `outputDimensionality` 也是如此。
> OpenClaw 在偵測到模型或維度變更時會自動重新索引。

## 自訂 OpenAI 相容端點

如果您想使用自訂的 OpenAI 相容端點（OpenRouter、vLLM 或代理），您可以搭配 OpenAI 提供者使用 `remote` 組態：

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

### 後援

- `memorySearch.fallback` 可以是 `openai`、`gemini`、`voyage`、`mistral`、`ollama`、`local` 或 `none`。
- 後援提供者僅在主要嵌入提供者失敗時使用。

### 批次索引（OpenAI + Gemini + Voyage）

- 預設為停用。設定 `agents.defaults.memorySearch.remote.batch.enabled = true` 以啟用大型語料庫索引（OpenAI、Gemini 和 Voyage）。
- 預設行為會等待批次完成；如有需要，請調整 `remote.batch.wait`、`remote.batch.pollIntervalMs` 和 `remote.batch.timeoutMinutes`。
- 設定 `remote.batch.concurrency` 以控制我們並行提交的批次工作數量（預設值：2）。
- 當設定 `memorySearch.provider = "openai"` 或 `"gemini"` 時會套用批次模式，並使用對應的 API 金鑰。
- Gemini 批次工作使用非同步嵌入批次端點，並需要 Gemini Batch API 的可用性。

為什麼 OpenAI 批次既快速又便宜：

- 對於大量的回填，OpenAI 通常是我們支援中最快的選項，因為我們可以在單一批次工作中提交多個嵌入請求，並讓 OpenAI 非同步處理它們。
- OpenAI 為 Batch API 工作提供折扣價格，因此大型索引執行通常比同步傳送相同請求更便宜。
- 詳情請參閱 OpenAI Batch API 文件與定價：
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

## 記憶工具如何運作

- `memory_search` 從 `MEMORY.md` + `memory/**/*.md` 語意搜尋 Markdown 區塊（目標約 400 token，重疊 80 token）。它會傳回片段文字（上限約 700 字元）、檔案路徑、行數範圍、分數、提供者/模型，以及我們是否從本地嵌入回退到遠端嵌入。不會傳回完整的檔案內容。
- `memory_get` 讀取特定的記憶 Markdown 檔案（相對於工作區），可選擇從起始行開始讀取 N 行。`MEMORY.md` / `memory/` 之外的路徑會被拒絕。
- 僅當 `memorySearch.enabled` 對該代理程式解析為 true 時，才會啟用這兩個工具。

## 什麼會被建立索引（以及何時）

- 檔案類型：僅限 Markdown (`MEMORY.md`, `memory/**/*.md`)。
- 索引儲存：在 `~/.openclaw/memory/<agentId>.sqlite` 的每個代理 SQLite (可透過 `agents.defaults.memorySearch.store.path` 設定，支援 `{agentId}` token)。
- 新鮮度：`MEMORY.md` + `memory/` 上的監視器會將索引標記為髒 (debounce 1.5s)。同步會在會話開始時、搜尋時或定期排程並非同步執行。會話紀錄使用差異閾值來觸發背景同步。
- 重新索引觸發條件：索引會儲存嵌入 **提供商/模型 + 端點指紋 + 分塊參數**。如果其中任何一項發生變更，OpenClaw 會自動重設並重新索引整個儲存庫。

## 混合搜尋 (BM25 + 向量)

啟用後，OpenClaw 結合了：

- **向量相似度** (語意匹配，措辭可以不同)
- **BM25 關鍵字相關性**（精確的 token，如 ID、環境變數、程式碼符號）

如果在您的平台上無法使用全文搜尋，OpenClaw 將回退到僅向量搜尋。

### 為何使用混合搜尋

向量搜尋非常擅長處理「含義相同」的情況：

- 「Mac Studio gateway host」與「the machine running the gateway」
- 「debounce file updates」與「avoid indexing on every write」

但在處理精確、高訊號的 token 時可能表現較弱：

- ID (`a828e60`, `b3b9895a...`)
- 程式碼符號 (`memorySearch.query.hybrid`)
- 錯誤字串（「sqlite-vec unavailable」）

BM25（全文）則相反：擅長處理精確 token，但在處理同義句時較弱。
混合搜尋是務實的中間方案：**同時使用這兩種檢索訊號**，讓您可以
針對「自然語言」查詢和「大海撈針」式查詢都能獲得良好的結果。

### 我們如何合併結果（目前的設計）

實作概略：

1. 從兩側檢索候選池：

- **向量 (Vector)**：根據餘弦相似度排名前 `maxResults * candidateMultiplier` 的結果。
- **BM25**：根據 FTS5 BM25 排名（越低越好）排名前 `maxResults * candidateMultiplier` 的結果。

2. 將 BM25 排名轉換為 0..1 左右的分數：

- `textScore = 1 / (1 + max(0, bm25Rank))`

3. 透過區塊 ID 合併候選並計算加權分數：

- `finalScore = vectorWeight * vectorScore + textWeight * textScore`

注意事項：

- `vectorWeight` + `textWeight` 在配置解析時會被正規化為 1.0，因此權重的行為如同百分比。
- 如果無法使用嵌入（或者提供者傳回零向量），我們仍然執行 BM25 並傳回關鍵字相符項。
- 如果無法建立 FTS5，我們會僅保留向量搜尋（不會導致嚴重失敗）。

這並非「資訊檢索（IR）理論上的完美」，但它簡單、快速，且傾向於提高真實筆記的召回率/精確度。
如果我們日後想要更精緻的作法，常見的下一步是在混合前進行倒數排名融合（RRF）或分數正規化
（最小值/最大值或 z-score）。

### 後處理管線

在合併向量和關鍵字分數後，有兩個可選的後處理階段
會在結果列表到達代理之前進行精煉：

```
Vector + Keyword -> Weighted Merge -> Temporal Decay -> Sort -> MMR -> Top-K Results
```

這兩個階段**預設關閉**，且可以獨立啟用。

### MMR 重新排序（多樣性）

當混合搜尋返回結果時，多個區塊可能包含相似或重疊的內容。
例如，搜尋「家用網路設定」可能會從不同的每日筆記中
返回五幾乎相同的片段，且都提到了相同的路由器設定。

**MMR (最大邊際相關性)** 會對結果重新排序，以平衡相關性與多樣性，確保排名靠前的結果涵蓋查詢的不同面向，而不是重複相同的資訊。

運作方式：

1. 結果會根據其原始相關性（向量 + BM25 加權分數）進行評分。
2. MMR 會反覆選取能最大化以下數值的結果：`lambda x relevance - (1-lambda) x max_similarity_to_selected`。
3. 結果之間的相似度是使用標記化內容上的 Jaccard 文字相似度來測量的。

`lambda` 參數控制權衡：

- `lambda = 1.0` -- 純相關性（無多樣性懲罰）
- `lambda = 0.0` -- 最大多樣性（忽略相關性）
- 預設值：`0.7`（平衡，略微偏向相關性）

**範例 -- 查詢：「家用網路設定」**

給定這些記憶體檔案：

```
memory/2026-02-10.md  -> "Configured Omada router, set VLAN 10 for IoT devices"
memory/2026-02-08.md  -> "Configured Omada router, moved IoT to VLAN 10"
memory/2026-02-05.md  -> "Set up AdGuard DNS on 192.168.10.2"
memory/network.md     -> "Router: Omada ER605, AdGuard: 192.168.10.2, VLAN 10: IoT"
```

未使用 MMR -- 前 3 筆結果：

```
1. memory/2026-02-10.md  (score: 0.92)  <- router + VLAN
2. memory/2026-02-08.md  (score: 0.89)  <- router + VLAN (near-duplicate!)
3. memory/network.md     (score: 0.85)  <- reference doc
```

使用 MMR (lambda=0.7) -- 前 3 筆結果：

```
1. memory/2026-02-10.md  (score: 0.92)  <- router + VLAN
2. memory/network.md     (score: 0.85)  <- reference doc (diverse!)
3. memory/2026-02-05.md  (score: 0.78)  <- AdGuard DNS (diverse!)
```

來自 2 月 8 日的近乎重複項被排除，Agent 獲得了三條不同的資訊。

**啟用時機：** 如果您注意到 `memory_search` 傳回了多餘或近乎重複的片段，
特別是當每日筆記經常跨天重複類似資訊時。

### 時間衰減 (近期權重提升)

擁有每日筆記的 Agent 隨著時間推移會累積數百個帶有日期的檔案。如果沒有衰減，
六個月前的一篇措辭良好的筆記，其排名可能高於昨天關於同一主題的更新。

**時間衰減** 會根據每個結果的年齡對分數應用指數乘數，
因此最近的記憶自然排名更高，而舊記憶則會逐漸淡化：

```
decayedScore = score x e^(-lambda x ageInDays)
```

其中 `lambda = ln(2) / halfLifeDays`。

使用預設的半衰期 30 天：

- 今天的筆記：原始分數的 **100%**
- 7 天前：**~84%**
- 30 天前：**50%**
- 90 天前：**12.5%**
- 180 天前：**~1.6%**

**常青文件永不衰減：**

- `MEMORY.md`（根記憶檔案）
- `memory/` 中的非日期檔案（例如，`memory/projects.md`、`memory/network.md`）
- 這些包含持久性參考資訊，應始終正常排序。

**帶日期的每日檔案**（`memory/YYYY-MM-DD.md`）使用從檔案名稱中提取的日期。
其他來源（例如，會話記錄）回退到檔案修改時間（`mtime`）。

**示例 -- 查詢：「Rod 的工作時間表是什麼？」**

鑑於這些記憶檔案（今天是 2 月 10 日）：

```
memory/2025-09-15.md  -> "Rod works Mon-Fri, standup at 10am, pairing at 2pm"  (148 days old)
memory/2026-02-10.md  -> "Rod has standup at 14:15, 1:1 with Zeb at 14:45"    (today)
memory/2026-02-03.md  -> "Rod started new team, standup moved to 14:15"        (7 days old)
```

不帶衰減：

```
1. memory/2025-09-15.md  (score: 0.91)  <- best semantic match, but stale!
2. memory/2026-02-10.md  (score: 0.82)
3. memory/2026-02-03.md  (score: 0.80)
```

帶衰減（halfLife=30）：

```
1. memory/2026-02-10.md  (score: 0.82 x 1.00 = 0.82)  <- today, no decay
2. memory/2026-02-03.md  (score: 0.80 x 0.85 = 0.68)  <- 7 days, mild decay
3. memory/2025-09-15.md  (score: 0.91 x 0.03 = 0.03)  <- 148 days, nearly gone
```

儘管陳舊的九月筆記具有最佳的原始語義匹配度，但仍會降至底部。

**啟用時機：** 如果您的代理有數月的每日記錄，且發現陳舊資訊的排名高於近期語境。對於重度依賴每日記錄的工作流程，30 天的半衰期效果良好；如果您經常引用較舊的筆記，請增加該數值（例如 90 天）。

### 混合式搜尋組態

這兩項功能均在 `memorySearch.query.hybrid` 下進行組態：

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

- **僅使用 MMR** -- 當您有許多類似的筆記但時間長短不重要時很有用。
- **僅使用時間衰減** -- 當新近程度很重要但您的搜尋結果已經夠多樣時很有用。
- **兩者皆用** -- 建議用於具有龐大且長期運行的每日記錄歷史的代理。

## 嵌入快取

OpenClaw 可以在 SQLite 中快取 **區塊嵌入 (chunk embeddings)**，因此重新建立索引和頻繁更新（尤其是會話逐字稿）不會對未變更的文字重新進行嵌入。

組態：

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

## 會話記憶搜尋（實驗性）

您可以選擇索引 **session transcripts** 並透過 `memory_search` 來顯示它們。
這功能目前處於實驗性旗標後方。

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

備註：

- Session 索引功能為 **選用 (opt-in)**（預設為關閉）。
- Session 更新會進行去抖動，並在超過變化閾值後**以非同步方式建立索引**（盡力而為）。
- `memory_search` 永遠不會因建立索引而阻塞；在背景同步完成之前，結果可能會略顯舊。
- 結果仍然僅包含程式碼片段；`memory_get` 仍僅限於記憶體檔案。
- Session 索引是依每個 agent 隔離的（僅會索引該 agent 的 session 記錄）。
- Session 記錄存在於磁碟上（`~/.openclaw/agents/<agentId>/sessions/*.jsonl`）。任何擁有檔案系統存取權限的處理程序/使用者都可以讀取它們，因此請將磁碟存取視為信任邊界。若要實施更嚴格的隔離，請在個別的 OS 使用者或主機下執行 agents。

變化閾值（顯示預設值）：

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

## SQLite 向量加速 (sqlite-vec)

當 sqlite-vec 擴充功能可用時，OpenClaw 會將嵌入儲存在
SQLite 虛擬表 (`vec0`) 中，並在資料庫中執行向量距離查詢。
這能保持搜尋快速，無需將所有嵌入載入到 JS 中。

設定 (選用)：

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

備註：

- `enabled` 預設為 true；停用時，搜尋會回退到對已儲存嵌入進行
  程序內餘弦相似度計算。
- 如果 sqlite-vec 擴充功能缺失或載入失敗，OpenClaw 會記錄
  錯誤並繼續使用 JS 回退機制 (無向量表)。
- `extensionPath` 會覆寫隨附的 sqlite-vec 路徑 (適用於自訂建置
  或非標準安裝位置)。

## 本地嵌入自動下載

- 預設本地嵌入模型：`hf:ggml-org/embeddinggemma-300m-qat-q8_0-GGUF/embeddinggemma-300m-qat-Q8_0.gguf` (~0.6 GB)。
- 當 `memorySearch.provider = "local"` 時，`node-llama-cpp` 會解析 `modelPath`；如果缺少 GGUF，它會**自動下載**到快取（如果設定了 `local.modelCacheDir`，則下載到該處），然後載入它。下載會在重試時繼續。
- 原生構建要求：執行 `pnpm approve-builds`，選擇 `node-llama-cpp`，然後 `pnpm rebuild node-llama-cpp`。
- 後備：如果本地設定失敗且 `memorySearch.fallback = "openai"`，我們會自動切換到遠端嵌入（除非被覆寫，否則為 `openai/text-embedding-3-small`）並記錄原因。

## 自訂 OpenAI 相容端點範例

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

備註：

- `remote.*` 優先於 `models.providers.openai.*`。
- `remote.headers` 與 OpenAI 標頭合併；當金鑰衝突時，遠端優先。省略 `remote.headers` 以使用 OpenAI 預設值。
