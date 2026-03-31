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

本頁面涵蓋了 OpenClaw 記憶體搜尋的完整配置表面。若要了解概念概述（檔案佈局、記憶體工具、何時寫入記憶體以及自動排清），請參閱 [Memory](/en/concepts/memory)。

## 記憶體搜尋預設值

- 預設啟用。
- 監看記憶體檔案的變更（已防抖）。
- 在 `agents.defaults.memorySearch` 下設定記憶體搜尋（非頂層
  `memorySearch`）。
- `memorySearch.provider` 和 `memorySearch.fallback` 接受由活動記憶體外掛註冊的 **adapter ids**。
- 預設的 `memory-core` 外掛註冊了這些內建的 adapter ids：`local`、`openai`、`gemini`、`voyage`、`mistral` 和 `ollama`。
- 使用預設的 `memory-core` 外掛時，如果未設定 `memorySearch.provider`，OpenClaw 會自動選擇：
  1. 如果設定 `memorySearch.local.modelPath` 且檔案存在，則為 `local`。
  2. `openai` 如果可解析到 OpenAI 金鑰。
  3. `gemini` 如果可解析到 Gemini 金鑰。
  4. `voyage` 如果可解析到 Voyage 金鑰。
  5. `mistral` 如果可解析到 Mistral 金鑰。
  6. 否則，記憶體搜尋將保持停用狀態，直到進行設定。
- 本地模式使用 node-llama-cpp，並且可能需要 `pnpm approve-builds`。
- 使用 sqlite-vec（如果可用）來加速 SQLite 內的向量搜尋。
- 使用預設的 `memory-core` 外掛程式時，也支援針對本地/自託管的 Ollama 嵌入 (`/api/embeddings`) 使用 `memorySearch.provider = "ollama"`，但不會自動選取。

遠端嵌入**需要**來自嵌入供應商的 API 金鑰。OpenClaw 從驗證設定檔、`models.providers.*.apiKey` 或環境變數中解析金鑰。Codex OAuth 僅涵蓋聊天/完成功能，且**不**滿足記憶體搜尋的嵌入需求。對於 Gemini，請使用 `GEMINI_API_KEY` 或 `models.providers.google.apiKey`。對於 Voyage，請使用 `VOYAGE_API_KEY` 或 `models.providers.voyage.apiKey`。對於 Mistral，請使用 `MISTRAL_API_KEY` 或 `models.providers.mistral.apiKey`。Ollama 通常不需要真實的 API 金鑰（當本地政策需要時，像 `OLLAMA_API_KEY=ollama-local` 這樣的預留位置就足夠了）。
使用自訂 OpenAI 相容端點時，請設定 `memorySearch.remote.apiKey`（以及可選的 `memorySearch.remote.headers`）。

## QMD 後端（實驗性）

設定 `memory.backend = "qmd"` 即可將內建的 SQLite 索引器替換為
[QMD](https://github.com/tobi/qmd)：一個結合 BM25 + 向量 + 重排序的本地優先搜尋 sidecar。Markdown
仍然是真實來源；OpenClaw 會外部呼叫 QMD 進行檢索。重點：

### 先決條件

- 預設為停用。需在設定中選擇加入 (`memory.backend = "qmd"`)。
- 單獨安裝 QMD CLI (`bun install -g https://github.com/tobi/qmd` 或下載
  一個發行版本)，並確保 `qmd` 二進位檔案位於 gateway 的 `PATH` 中。
- QMD 需要一個允許擴充功能的 SQLite 編譯版本 (在 macOS
  上為 `brew install sqlite`)。
- QMD 完全透過 Bun + `node-llama-cpp` 在本機運行，並會在首次使用時從 HuggingFace 自動下載 GGUF
  模型 (不需要獨立的 Ollama daemon)。
- 閘道會透過設定 `XDG_CONFIG_HOME` 和
  `XDG_CACHE_HOME`，在 `~/.openclaw/agents/<agentId>/qmd/` 下的獨立 XDG
  主目錄中執行 QMD。
- 作業系統支援：一旦安裝 Bun + SQLite，macOS 和 Linux
  即可直接使用。Windows 建議透過 WSL2 取得最佳支援。

### Sidecar 的執行方式

- 閘道會在 `~/.openclaw/agents/<agentId>/qmd/` 下寫入獨立的 QMD 主目錄
  （設定 + 快取 + sqlite DB）。
- 集合是透過 `qmd collection add` 從 `memory.qmd.paths` 建立的
  （加上預設的工作區記憶體檔案），然後 `qmd update` + `qmd embed` 會
  在開機時和可設定的間隔執行（`memory.qmd.update.interval`，
  預設 5 分鐘）。
- 閘道現在會在啟動時初始化 QMD 管理器，因此即使是在第一次
  `memory_search` 呼叫之前，定期更新計時器也會被啟動。
- 啟動重新整理現在預設會在背景執行，因此不會阻擋聊天啟動；設定 `memory.qmd.update.waitForBootSync = true` 以保持先前的阻擋行為。
- 搜尋透過 `memory.qmd.searchMode` 執行（預設 `qmd search --json`；也支援 `vsearch` 和 `query`）。如果選取的模式在您的 QMD 建置上拒絕標誌，OpenClaw 會以 `qmd query` 重試。如果 QMD 失敗或缺少二進位檔，OpenClaw 會自動回退到內建 SQLite 管理員，因此記憶體工具會繼續運作。
- OpenClaw 目前未公開 QMD 嵌入批次大小調整；批次行為由 QMD 本身控制。
- **首次搜尋可能很慢**：QMD 可能會在第一次 `qmd query` 執行時下載本機 GGUF 模型（reranker/查詢擴充）。
  - OpenClaw 會在執行 QMD 時自動設定 `XDG_CONFIG_HOME`/`XDG_CACHE_HOME`。
  - 如果您想手動預先下載模型（並預熱 OpenClaw 使用的相同索引），請使用代理程式的 XDG 目錄執行一次性查詢。

    OpenClaw 的 QMD 狀態位於您的 **state dir** 下（預設為 `~/.openclaw`）。
    您可以透過匯出 OpenClaw 使用的相同 XDG 變數，將 `qmd` 指向完全相同的索引：

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

### Config surface (`memory.qmd.*`)

- `command` （預設 `qmd`）：覆寫可執行檔路徑。
- `searchMode` （預設 `search`）：選擇哪個 QMD 指令作為
  `memory_search` 的後端（`search`、`vsearch`、`query`）。
- `includeDefaultMemory` (預設 `true`): 自動索引 `MEMORY.md` + `memory/**/*.md`。
- `paths[]`: 新增額外的目錄/檔案 (`path`，選用 `pattern`，選用
  穩定 `name`)。
- `sessions`: 啟用工作階段 JSONL 索引 (`enabled`, `retentionDays`,
  `exportDir`)。
- `update`: 控制重新整理頻率與維護作業的執行：
  (`interval`、`debounceMs`、`onBoot`、`waitForBootSync`、`embedInterval`、
  `commandTimeoutMs`、`updateTimeoutMs`、`embedTimeoutMs`)。
- `limits`: 限制回傳內容 (`maxResults`、`maxSnippetChars`、
  `maxInjectedChars`、`timeoutMs`)。
- `scope`: 與 [`session.sendPolicy`](/en/gateway/configuration-reference#session) 的架構相同。
  預設僅限於私訊 (`deny` 全部，`allow` 直接聊天)；請放寬限制以在群組/頻道中顯示 QMD
  命中結果。
  - `match.keyPrefix` 符合 **經標準化** 的會話金鑰（小寫，並移除任何
    前導 `agent:<id>:`）。範例：`discord:channel:`。
  - `match.rawKeyPrefix` 符合 **原始** 會話金鑰（小寫），包含
    `agent:<id>:`。範例：`agent:main:discord:`。
  - 舊版：`match.keyPrefix: "agent:..."` 仍被視為原始金鑰前綴，
    但為了清晰起見，建議使用 `rawKeyPrefix`。
- 當 `scope` 拒絕搜尋時，OpenClaw 會記錄一則警告，包含衍生出的
  `channel`/`chatType`，以便更輕鬆地除錯空結果。
- 來自工作區外部的程式碼片段會顯示為 `qmd/<collection>/<relative-path>` 於 `memory_search` 結果中；`memory_get`
  能理解該前綴，並從設定的 QMD 集合根目錄讀取。
- 當 `memory.qmd.sessions.enabled = true` 時，OpenClaw 會將清理後的會話
  轉錄（使用者/助手對話回合）匯出到 `~/.openclaw/agents/<id>/qmd/sessions/` 下的專用 QMD 集合，
  因此 `memory_search` 可以回想起最近的
  對話而無需存取內建 SQLite 索引。
- 當 `memory.citations` 為 `auto`/`on` 時，`memory_search` 片段現在會包含一個 `Source: <path#line>` 頁尾；設定 `memory.citations = "off"` 以將路徑中繼資料保留在內部（代理程式仍會收到 `memory_get` 的路徑，但片段文字會省略頁尾，且系統提示會警告代理程式不要引用它）。

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

### 引用與後備機制

- 無論後端為何（`auto`/`on`/`off`），`memory.citations` 均適用。
- 當 `qmd` 執行時，我們會標記 `status().backend = "qmd"`，以便診斷資訊顯示哪個引擎提供了結果。如果 QMD 子程式退出或無法解析 JSON 輸出，搜尋管理器會記錄警告並返回內建提供者（現有的 Markdown 嵌入），直到 QMD 恢復。

## 其他記憶體路徑

如果您想要索引預設工作區佈局之外的 Markdown 檔案，請新增明確的路徑：

```json5
agents: {
  defaults: {
    memorySearch: {
      extraPaths: ["../team-docs", "/srv/shared-notes/overview.md"]
    }
  }
}
```

注意：

- 路徑可以是絕對路徑或相對於工作區的路徑。
- 目錄會以遞迴方式掃描 `.md` 檔案。
- 預設情況下，只會索引 Markdown 檔案。
- 如果 `memorySearch.multimodal.enabled = true`，OpenClaw 也會僅在 `extraPaths` 之下索引支援的影像/音訊檔案。預設記憶體根目錄（`MEMORY.md`、`memory.md`、`memory/**/*.md`）保持僅限 Markdown。
- 會忽略符號連結（檔案或目錄）。

## 多模態記憶體檔案（Gemini 圖像 + 音訊）

使用 Gemini embedding 2 時，OpenClaw 可以索引來自 `memorySearch.extraPaths` 的圖像和音訊檔案：

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

- 多模態記憶體目前僅支援 `gemini-embedding-2-preview`。
- 多模態索引僅適用於透過 `memorySearch.extraPaths` 發現的檔案。
- 此階段支援的模態：圖像和音訊。
- 啟用多模態記憶體時，`memorySearch.fallback` 必須保持 `"none"`。
- 在索引期間，相符的圖像/音訊檔案位元組會上傳至已設定的 Gemini embedding 端點。
- 支援的圖片副檔名：`.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`、`.heic`、`.heif`。
- 支援的音訊副檔名：`.mp3`、`.wav`、`.ogg`、`.opus`、`.m4a`、`.aac`、`.flac`。
- 搜尋查詢仍維持為文字，但 Gemini 可以將這些文字查詢與已建立索引的圖片/音訊嵌入進行比較。
- `memory_get` 仍然僅讀取 Markdown；二進位檔案可被搜尋，但不會以原始檔案內容形式傳回。

## Gemini 嵌入（原生）

將提供者設定為 `gemini` 即可直接使用 Gemini embeddings API：

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

注意：

- `remote.baseUrl` 為選填（預設為 Gemini API base URL）。
- `remote.headers` 讓您視需要新增額外的標頭。
- 預設模型：`gemini-embedding-001`。
- 也支援 `gemini-embedding-2-preview`：8192 token 限制與可配置的維度（768 / 1536 / 3072，預設 3072）。

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

> **需要重新建立索引：** 從 `gemini-embedding-001`（768 維度）
> 切換到 `gemini-embedding-2-preview`（3072 維度）會變更向量大小。如果您在 768、1536 和 3072 之間
> 變更 `outputDimensionality`，情況也是如此。
> 當 OpenClaw 偵測到模型或維度變更時，會自動重新建立索引。

## 自訂 OpenAI 相容端點

如果您想使用自訂的 OpenAI 相容端點（OpenRouter、vLLM 或代理伺服器），您可以搭配 OpenAI 提供者使用 `remote` 配置：

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

### 後備機制

- `memorySearch.fallback` 可以是任何已註冊的記憶體嵌入適配器 ID，或 `none`。
- 使用預設的 `memory-core` 外掛程式時，有效的內建後備 ID 為 `openai`、`gemini`、`voyage`、`mistral`、`ollama` 和 `local`。
- 後備提供者僅在主要嵌入提供者失敗時使用。

### 批次索引

- 預設停用。設定 `agents.defaults.memorySearch.remote.batch.enabled = true` 以為其配接器公開批次支援的供應商啟用批次索引。
- 預設行為會等待批次完成；如有需要，請調整 `remote.batch.wait`、`remote.batch.pollIntervalMs` 和 `remote.batch.timeoutMinutes`。
- 設定 `remote.batch.concurrency` 以控制我們並行提交的批次工作數量（預設值：2）。
- 透過預設的 `memory-core` 外掛程式，`openai`、`gemini` 和 `voyage` 可使用批次索引。
- Gemini 批次工作使用非同步嵌入批次端點，並需要 Gemini Batch API 的可用性。

為何 OpenAI 批次既快速又便宜：

- 對於大量回填，OpenAI 通常是我們支援最快的選項，因為我們可以在單一批次工作中提交許多嵌入請求，並讓 OpenAI 異步處理它們。
- OpenAI 為 Batch API 工作負載提供折扣價格，因此大型索引執行通常比同步發送相同請求更便宜。
- 有關詳細資訊，請參閱 OpenAI Batch API 文件和價格：
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

## 記憶體工具如何運作

- `memory_search` 從 `MEMORY.md` + `memory/**/*.md` 語義搜尋 Markdown 區塊（目標約 400 token，80 token 重疊）。它傳回片段文字（上限約 700 個字元）、檔案路徑、行範圍、分數、提供者/模型，以及我們是否從本機嵌入回退到遠端嵌入。不會傳回完整的檔案內容。
- `memory_get` 讀�取特定的記憶體 Markdown 檔案（相對於工作區），可選地從起始行開始讀取 N 行。`MEMORY.md` / `memory/` 之外的路徑會被拒絕。
- 僅當 `memorySearch.enabled` 對代理解析為 true 時，這兩個工具才會啟用。

## 索引內容（與時機）

- 檔案類型：僅限 Markdown（`MEMORY.md`，`memory/**/*.md`）。
- 索引儲存：位於 `~/.openclaw/memory/<agentId>.sqlite` 的個別代理 SQLite 資料庫（可透過 `agents.defaults.memorySearch.store.path` 設定，支援 `{agentId}` token）。
- 新鮮度：監視 `MEMORY.md` + `memory/` 的監視器會將索引標記為髒（防抖 1.5 秒）。同步操作會在會話開始、搜尋或定時間隔時排程，並異步執行。會話逐字稿使用增量閾值來觸發背景同步。
- 重新索引觸發器：索引存儲了嵌入 **提供者/模型 + 端點指紋 + 分塊參數**。如果其中任何一項發生變化，OpenClaw 會自動重置並重新索引整個存儲。

## 混合搜尋 (BM25 + 向量)

啟用後，OpenClaw 會結合：

- **向量相似度**（語義匹配，措辭可以不同）
- **BM25 關鍵字相關性**（精確 token，如 ID、環境變數、代碼符號）

如果您的平台上無法使用全文搜尋，OpenClaw 將回退到僅向量的搜尋。

### 為什麼選擇混合搜尋

向量搜尋擅長處理「意思相同」的情況：

- "Mac Studio gateway host" vs "the machine running the gateway"
- 「debounce file updates」vs「avoid indexing on every write」

但對於精確、高訊號的 token，它可能顯得薄弱：

- IDs (`a828e60`, `b3b9895a...`)
- code symbols (`memorySearch.query.hybrid`)
- error strings ("sqlite-vec unavailable")

BM25 (全文) 則相反：擅長處理精確 token，但在處理改寫句時較弱。
混合搜尋則是務實的中間方案：**同時使用兩種檢索訊號**，讓您在「自然語言」查詢和「大海撈針」式查詢中都能獲得良好的結果。

### 我們如何合併結果（目前的設計）

實作概略：

1. 從雙方檢索候選池：

- **向量**：根據餘弦相似度選取前 `maxResults * candidateMultiplier` 筆。
- **BM25**：根據 FTS5 BM25 排名選取前 `maxResults * candidateMultiplier` 筆（分數越低越好）。

2. 將 BM25 排名轉換為 0..1 左右的分數：

- `textScore = 1 / (1 + max(0, bm25Rank))`

3. 依區塊 ID 聯合候選項並計算加權分數：

- `finalScore = vectorWeight * vectorScore + textWeight * textScore`

備註：

- `vectorWeight` + `textWeight` 在配置解析中會正規化為 1.0，因此權重表現為百分比。
- 如果嵌入不可用（或提供者傳回零向量），我們仍會執行 BM25 並傳回關鍵字相符項。
- 如果無法建立 FTS5，我們會保持僅向量搜尋（不會發生硬錯誤）。

這並非「IR 理論完美」，但它簡單、快速，且傾向於改善真實筆記的召回/精確率。
如果我們稍後想要更花哨，常見的下一步是倒數排名融合 (RRF) 或在混合前進行分數正規化
（最小/最大值或 z 分數）。

### 後處理管線

合併向量和關鍵字分數後，兩個可選的後處理階段
會在結果列表到達代理之前進行細化：

```
Vector + Keyword -> Weighted Merge -> Temporal Decay -> Sort -> MMR -> Top-K Results
```

這兩個階段皆**預設關閉**，且可獨立啟用。

### MMR 重新排序（多樣性）

當混合搜尋傳回結果時，多個區塊可能包含相似或重疊的內容。
例如，搜尋「家用網路設定」可能會從不同的每日筆記中傳回五幾乎相同的片段，
而這些筆記都提到了相同的路由器設定。

**MMR (Maximal Marginal Relevance)** 會對結果進行重新排序，以平衡相關性與多樣性，
確保頂部結果涵蓋查詢的不同面向，而不是重複相同的資訊。

運作方式：

1. 結果會根據其原始相關性（向量 + BM25 加權分數）進行評分。
2. MMR 會迭代選擇能最大化以下公式的結果：`lambda x relevance - (1-lambda) x max_similarity_to_selected`。
3. 結果之間的相似度是透過對標記化內容使用 Jaccard 文字相似度來測量的。

`lambda` 參數控制取捨：

- `lambda = 1.0` -- 純相關性（無多樣性懲罰）
- `lambda = 0.0` -- 最大多樣性（忽略相關性）
- 預設值：`0.7`（平衡，輕微偏向相關性）

**範例 -- 查詢：「home network setup」**

假設有以下記憶檔案：

```
memory/2026-02-10.md  -> "Configured Omada router, set VLAN 10 for IoT devices"
memory/2026-02-08.md  -> "Configured Omada router, moved IoT to VLAN 10"
memory/2026-02-05.md  -> "Set up AdGuard DNS on 192.168.10.2"
memory/network.md     -> "Router: Omada ER605, AdGuard: 192.168.10.2, VLAN 10: IoT"
```

不使用 MMR -- 前 3 筆結果：

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

2 月 8 日的近似重複項被排除，代理程式獲得了三條不同的資訊。

**何時啟用：** 如果您發現 `memory_search` 傳回冗餘或近似重複的摘要片段，
特別是在經常跨天重複類似資訊的每日筆記中。

### 時間衰減（近期性提升）

使用每日筆記的代理程式隨著時間推移會累積數百個帶有日期的檔案。如果沒有衰減，
半年前措辭良好的筆記可能在排名上超過昨天關於同一主題的更新。

**時間衰減** 會根據每個結果的年代對分數套用指數乘數，因此最近的記憶自然排名較高，而舊記憶則會逐漸淡出：

```
decayedScore = score x e^(-lambda x ageInDays)
```

其中 `lambda = ln(2) / halfLifeDays`。

若使用預設的半衰期 30 天：

- 今天的筆記：原始分數的 **100%**
- 7 天前：**~84%**
- 30 天前：**50%**
- 90 天前：**12.5%**
- 180 天前：**~1.6%**

**常青檔案永遠不會衰減：**

- `MEMORY.md` (根記憶檔案)
- `memory/` 中非日期的檔案 (例如 `memory/projects.md`、`memory/network.md`)
- 這些包含持久的參考資訊，應始終正常排名。

**帶有日期的每日檔案** (`memory/YYYY-MM-DD.md`) 會使用從檔名提取的日期。
其他來源 (例如會話記錄) 則會退回到檔案修改時間 (`mtime`)。

**範例 -- 查詢："Rod 的工作時間表是什麼？"**

鑑於這些記憶檔案（今天是 2 月 10 日）：

```
memory/2025-09-15.md  -> "Rod works Mon-Fri, standup at 10am, pairing at 2pm"  (148 days old)
memory/2026-02-10.md  -> "Rod has standup at 14:15, 1:1 with Zeb at 14:45"    (today)
memory/2026-02-03.md  -> "Rod started new team, standup moved to 14:15"        (7 days old)
```

不使用衰減：

```
1. memory/2025-09-15.md  (score: 0.91)  <- best semantic match, but stale!
2. memory/2026-02-10.md  (score: 0.82)
3. memory/2026-02-03.md  (score: 0.80)
```

使用衰減 (halfLife=30)：

```
1. memory/2026-02-10.md  (score: 0.82 x 1.00 = 0.82)  <- today, no decay
2. memory/2026-02-03.md  (score: 0.80 x 0.85 = 0.68)  <- 7 days, mild decay
3. memory/2025-09-15.md  (score: 0.91 x 0.03 = 0.03)  <- 148 days, nearly gone
```

儘管陳舊的九月筆記具有最佳的原始語意匹配度，它仍被降到底部。

**何時啟用：** 如果您的代理擁有數月的每日筆記，且您發現舊的、陳舊的資訊排名高於最近的語境。半衰期為 30 天適用於重度依賴每日筆記的工作流程；如果您經常參考較舊的筆記，請增加它（例如 90 天）。

### 混合搜尋設定

這兩項功能皆在 `memorySearch.query.hybrid` 下進行設定：

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

您可以獨立啟用任一項功能：

- **僅使用 MMR** -- 當您有許多類似的筆記但時間長短不重要時很有用。
- **僅使用時間衰減** -- 當新近度很重要但您的搜尋結果已經夠多元時很有用。
- **同時使用** -- 推薦用於具有龐大、長期運行的每日筆記歷史記錄的代理。

## 嵌入快取

OpenClaw 可以在 SQLite 中快取 **區塊嵌入 (chunk embeddings)**，因此重新索引和頻繁更新（尤其是會話紀錄）不會對未變更的文本重新進行嵌入。

Config：

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

您可以選擇索引 **會話紀錄** 並透過 `memory_search` 顯示它們。
這項功能目前位於實驗性旗標之後。

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

- 會話索引為 **選用功能**（預設關閉）。
- 會話更新會進行去抖動，並在超過增量閾值時 **以非同步方式建立索引**（盡力而為）。
- `memory_search` 永遠不會因索引而阻塞；在背景同步完成之前，結果可能會稍微過時。
- 結果仍然僅包含摘要； `memory_get` 仍然僅限於記憶檔案。
- 會話索引是按代理隔離的（僅索引該代理的會話紀錄）。
- 工作階段記錄儲存在磁碟上 (`~/.openclaw/agents/<agentId>/sessions/*.jsonl`)。任何具有檔案系統存取權限的處理程序/使用者都可以讀取它們，因此請將磁碟存取視為信任邊界。為了更嚴格的隔離，請在不同的 OS 使用者或主機下執行代理程式。

Delta 閾值（顯示預設值）：

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
SQLite 虛擬資料表 (`vec0`) 中，並在
資料庫中執行向量距離查詢。這樣可以保持搜尋快速，而無需將每個嵌入載入到 JS 中。

組態（選用）：

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

注意：

- `enabled` 預設為 true；停用時，搜尋會退回到針對已儲存嵌入的
  程序內餘弦相似度。
- 如果 sqlite-vec 擴充功能遺失或載入失敗，OpenClaw 會記錄
  錯誤並繼續使用 JS 後備方案（無向量資料表）。
- `extensionPath` 會覆寫內建的 sqlite-vec 路徑（適用於自訂建置或非標準安裝位置）。

## 本地嵌入自動下載

- 預設的本地嵌入模型：`hf:ggml-org/embeddinggemma-300m-qat-q8_0-GGUF/embeddinggemma-300m-qat-Q8_0.gguf`（約 0.6 GB）。
- 當 `memorySearch.provider = "local"` 時，`node-llama-cpp` 會解析 `modelPath`；如果缺少 GGUF 檔案，它會 **自動下載** 到快取（如果已設定，則為 `local.modelCacheDir`），然後載入它。下載會在重試時恢復。
- 原生建置需求：執行 `pnpm approve-builds`，選擇 `node-llama-cpp`，然後 `pnpm rebuild node-llama-cpp`。
- 後備機制：如果本地設定失敗且 `memorySearch.fallback = "openai"`，我們會自動切換到遠端嵌入（除非另有覆寫，否則為 `openai/text-embedding-3-small`），並記錄原因。

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
- `remote.headers` 與 OpenAI 標頭合併；發生鍵衝突時以遠端為準。省略 `remote.headers` 以使用 OpenAI 預設值。
