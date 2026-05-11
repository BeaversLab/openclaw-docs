---
summary: "記憶搜尋如何使用嵌入和混合檢索找出相關筆記"
title: "記憶搜尋"
read_when:
  - You want to understand how memory_search works
  - You want to choose an embedding provider
  - You want to tune search quality
---

`memory_search` 會從您的記憶檔案中找出相關筆記，即使措辭與原文不同。其運作方式是將記憶索引成小區塊，並使用嵌入、關鍵字或兩者結合來進行搜尋。

## 快速開始

如果您已設定 GitHub Copilot 訂閱、OpenAI、Gemini、Voyage 或 Mistral API 金鑰，記憶搜尋會自動運作。若要明確設定提供者：

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai", // or "gemini", "local", "ollama", etc.
      },
    },
  },
}
```

若要在沒有 API 金鑰的情況下使用本地嵌入，請將選用的 `node-llama-cpp`
執行時套件安裝在 OpenClaw 旁邊，並使用 `provider: "local"`。

部分與 OpenAI 相容的嵌入端點需要不對稱標籤，例如用於搜尋的
`input_type: "query"` 和用於索引區塊的 `input_type: "document"` 或 `"passage"`。
請使用 `memorySearch.queryInputType` 和 `memorySearch.documentInputType` 進行設定；請參閱[記憶組態參考資料](/zh-Hant/reference/memory-config#provider-specific-config)。

## 支援的提供者

| 提供者         | ID               | 需要 API 金鑰 | 備註                        |
| -------------- | ---------------- | ------------- | --------------------------- |
| Bedrock        | `bedrock`        | 否            | 當 AWS 憑證鏈解析時自動偵測 |
| Gemini         | `gemini`         | 是            | 支援圖片/音訊索引           |
| GitHub Copilot | `github-copilot` | 否            | 自動偵測，使用 Copilot 訂閱 |
| 本機           | `local`          | 否            | GGUF 模型，約需下載 0.6 GB  |
| Mistral        | `mistral`        | 是            | 自動偵測                    |
| Ollama         | `ollama`         | 否            | 本地，必須明確設定          |
| OpenAI         | `openai`         | 是            | 自動偵測，快速              |
| Voyage         | `voyage`         | 是            | 自動偵測                    |

## 搜尋運作方式

OpenClaw 並行執行兩個檢索路徑並合併結果：

```mermaid
flowchart LR
    Q["Query"] --> E["Embedding"]
    Q --> T["Tokenize"]
    E --> VS["Vector Search"]
    T --> BM["BM25 Search"]
    VS --> M["Weighted Merge"]
    BM --> M
    M --> R["Top Results"]
```

- **向量搜尋** 尋找語意相似的筆記（例如「gateway host」符合
  「執行 OpenClaw 的機器」）。
- **BM25 關鍵字搜尋** 尋找精確相符項（ID、錯誤字串、設定
  金鑰）。

如果只有一個路徑可用（沒有嵌入或沒有 FTS），另一個會單獨運作。

當嵌入無法使用時，OpenClaw 仍會對 FTS 結果使用詞彙排序，而不是僅退回到原始的精確匹配排序。這種降級模式會提昇具有較強查詢詞涵蓋率和相關檔案路徑的區塊，即使沒有 `sqlite-vec` 或嵌入提供者，也能保持召回的實用性。

## 改善搜尋品質

當您有大量的筆記紀錄時，有兩個可選功能可以提供幫助：

### 時間衰減

舊筆記會逐漸降低排序權重，以便讓近期資訊優先顯示。
在預設半衰期為 30 天的情況下，上個月的筆記評分為其原始權重的 50%。像 `MEMORY.md` 這類常青檔案永遠不會被衰減。

<Tip>如果您的代理程式有數月的每日筆記，且過時資訊的排名持續高於近期 情境，請啟用時間衰減。</Tip>

### MMR (多樣性)

減少重複結果。如果有五則筆記都提及相同的路由器設定，MMR
會確保主要結果涵蓋不同的主題，而不是重複出現。

<Tip>如果 `memory_search` 持續從不同的每日筆記中傳回幾乎重複的片段，請啟用 MMR。</Tip>

### 同時啟用兩者

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        query: {
          hybrid: {
            mmr: { enabled: true },
            temporalDecay: { enabled: true },
          },
        },
      },
    },
  },
}
```

## 多模態記憶

使用 Gemini Embedding 2，您可以將圖像和音訊檔案與 Markdown 一起編入索引。搜尋查詢仍為文字，但它們會匹配視覺和音訊內容。請參閱 [記憶體配置參考](/zh-Hant/reference/memory-config) 以進行設定。

## Session memory search

您可以選擇將會話紀錄文字稿編入索引，以便 `memory_search` 能夠回憶先前的對話。這是透過 `memorySearch.experimental.sessionMemory` 進行選擇加入的。請參閱 [配置參考](/zh-Hant/reference/memory-config) 以了解詳情。

## 疑難排解

**沒有結果？** 執行 `openclaw memory status` 以檢查索引。如果是空的，請執行 `openclaw memory index --force`。

**只有關鍵字匹配？** 您的嵌入供應商可能尚未設定。請檢查 `openclaw memory status --deep`。

**本機嵌入逾時？** 預設情況下，`ollama`、`lmstudio` 和 `local` 使用較長的內聯批次逾時時間。如果主機只是速度較慢，請設定 `agents.defaults.memorySearch.sync.embeddingBatchTimeoutSeconds` 並重新執行 `openclaw memory index --force`。

**找不到 CJK 文字？** 使用 `openclaw memory index --force` 重建 FTS 索引。

## 延伸閱讀

- [Active Memory](/zh-Hant/concepts/active-memory) -- 用於互動式聊天會話的子代理程式記憶體
- [Memory](/zh-Hant/concepts/memory) -- 檔案佈局、後端、工具
- [Memory configuration reference](/zh-Hant/reference/memory-config) -- 所有配置選項

## 相關

- [記憶體概觀](/zh-Hant/concepts/memory)
- [Active memory](/zh-Hant/concepts/active-memory)
- [內建記憶體引擎](/zh-Hant/concepts/memory-builtin)
