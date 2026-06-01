---
summary: "預設的基於 SQLite 的記憶體後端，提供關鍵字、向量和混合搜尋"
title: "內建記憶體引擎"
read_when:
  - You want to understand the default memory backend
  - You want to configure embedding providers or hybrid search
---

內建引擎是預設的記憶體後端。它將您的記憶體索引儲存在
每個代理程式專屬的 SQLite 資料庫中，且無需額外依賴即可開始使用。

## 提供的功能

- **關鍵字搜尋**，透過 FTS5 全文索引（BM25 評分）。
- **向量搜尋**，透過來自任何支援供應商的嵌入向量。
- **混合搜尋**，結合兩者以獲得最佳結果。
- **中日韓 (CJK) 支援**，透過針對中文、日文和韓文的三元組 分詞。
- **sqlite-vec 加速**，用於資料庫內的向量查詢（可選）。

## 開始使用

預設情況下，內建引擎使用 OpenAI 嵌入。如果您已經設定好
`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`，向量搜尋
將無需額外的記憶體配置即可運作。

若要明確設定供應商：

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai",
      },
    },
  },
}
```

如果沒有嵌入供應商，則只能使用關鍵字搜尋。

若要強制使用內建的本地嵌入提供商，請在 OpenClaw 旁邊安裝可選的
`node-llama-cpp` 執行時套件，然後將 `local.modelPath`
指向一個 GGUF 檔案：

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "local",
        fallback: "none",
        local: {
          modelPath: "~/.node-llama-cpp/models/embeddinggemma-300m-qat-Q8_0.gguf",
        },
      },
    },
  },
}
```

## 支援的嵌入向量提供者

| 提供者         | ID                  | 注意事項                          |
| -------------- | ------------------- | --------------------------------- |
| Bedrock        | `bedrock`           | 使用 AWS 憑證鏈                   |
| DeepInfra      | `deepinfra`         | 預設值： `BAAI/bge-m3`            |
| Gemini         | `gemini`            | 支援多模態 (圖片 + 音訊)          |
| GitHub Copilot | `github-copilot`    | 使用 Copilot 訂閱                 |
| Local          | `local`             | 可選的 `node-llama-cpp` 執行時    |
| Mistral        | `mistral`           |                                   |
| Ollama         | `ollama`            | 本地/自託管                       |
| OpenAI         | `openai`            | 預設值： `text-embedding-3-small` |
| OpenAI 相容    | `openai-compatible` | 通用 `/v1/embeddings` 端點        |
| Voyage         | `voyage`            |                                   |

設定 `memorySearch.provider` 以切換離開 OpenAI。

## 索引如何運作

OpenClaw 會將 `MEMORY.md` 和 `memory/*.md` 索引為區塊（約 400 個 token，具有
80 個 token 的重疊），並將其儲存在每個代理程式的 SQLite 資料庫中。

- **索引位置：** `~/.openclaw/memory/<agentId>.sqlite`
- **儲存空間維護：** SQLite WAL 側車檔案透過定期和
  關機檢查點受到限制。
- **檔案監控：** 對記憶體檔案的變更會觸發防抖動的重新索引 (1.5秒)。
- **自動重新索引：** 當嵌入提供商、模型或區塊配置
  變更時，整個索引會自動重建。
- **按需重新索引：** `openclaw memory index --force`

<Info>您也可以使用 `memorySearch.extraPaths` 索引工作區外的 Markdown 檔案。請參閱 [配置參考](/zh-Hant/reference/memory-config#additional-memory-paths)。</Info>

## 使用時機

內建引擎是大多數使用者的最佳選擇：

- 開箱即用，無需額外依賴。
- 能很好地處理關鍵字和向量搜尋。
- 支援所有嵌入提供商。
- 混合搜尋結合了這兩種檢索方法的優點。

如果您需要重新排序、查詢擴展，或是想索引工作區以外的目錄，請考慮切換到 [QMD](/zh-Hant/concepts/memory-qmd)。

如果您想要具備自動使用者建模功能的跨工作階段記憶體，請考慮 [Honcho](/zh-Hant/concepts/memory-honcho)。

## 疑難排解

**記憶體搜尋已停用？** 請檢查 `openclaw memory status`。如果未偵測到提供者，請明確設定一個或新增 API 金鑰。

**未偵測到本機提供者？** 請確認本機路徑存在並執行：

```bash
openclaw memory status --deep --agent main
openclaw memory index --force --agent main
```

獨立 CLI 指令和 Gateway 都使用相同的 `local` 提供者 ID。
當您想要本機嵌入時，請設定 `memorySearch.provider: "local"`。

**結果過時？** 請執行 `openclaw memory index --force` 來重建。監看器在極少數的邊緣情況下可能會遺漏變更。

**sqlite-vec 無法載入？** OpenClaw 會自動回退到程序內餘弦相似度。
`openclaw memory status --deep` 會分別回報本機向量儲存與嵌入提供者，因此 `Vector store: unavailable` 指向
sqlite-vec 的載入，而 `Embeddings: unavailable` 則指向提供者/驗證
或模型就緒狀態。請檢查日誌以找出具體的載入錯誤。

## 設定

有關嵌入提供者設定、混合搜尋調整（權重、MMR、時間
衰減）、批次索引、多模態記憶體、sqlite-vec、額外路徑以及所有
其他設定選項，請參閱
[記憶體設定參考](/zh-Hant/reference/memory-config)。

## 相關

- [記憶體概覽](/zh-Hant/concepts/memory)
- [記憶體搜尋](/zh-Hant/concepts/memory-search)
- [主動記憶體](/zh-Hant/concepts/active-memory)
