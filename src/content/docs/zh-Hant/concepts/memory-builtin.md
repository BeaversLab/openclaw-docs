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

如果您擁有 OpenAI、Gemini、Voyage 或 Mistral 的 API 金鑰，內建引擎
會自動偵測並啟用向量搜尋。無需進行設定。

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

若要強制使用內建的本機嵌入供應商，請在 OpenClaw 旁安裝可選的
`node-llama-cpp` 執行套件，然後將 `local.modelPath`
指向 GGUF 檔案：

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

| 提供者  | ID        | 自動偵測  | 備註                              |
| ------- | --------- | --------- | --------------------------------- |
| OpenAI  | `openai`  | 是        | 預設值： `text-embedding-3-small` |
| Gemini  | `gemini`  | 是        | 支援多模態 (圖片 + 音訊)          |
| Voyage  | `voyage`  | 是        |                                   |
| Mistral | `mistral` | 是        |                                   |
| Ollama  | `ollama`  | 否        | 本機，需明確設定                  |
| Local   | `local`   | 是 (優先) | 可選的 `node-llama-cpp` 執行環境  |

自動偵測會依照顯示的順序，選擇第一個可解析 API 金鑰的供應商。
請設定 `memorySearch.provider` 進行覆寫。

## 索引運作方式

OpenClaw 會將 `MEMORY.md` 和 `memory/*.md` 索引為區塊（約 400 個 token，
並具有 80 個 token 的重疊），並將其儲存在每個代理程式專屬的 SQLite 資料庫中。

- **索引位置：** `~/.openclaw/memory/<agentId>.sqlite`
- **儲存維護：** SQLite WAL 附屬檔案會透過定期
  和關機檢查點 進行限制。
- **檔案監控：** 記憶體檔案的變更會觸發去抖動 的重新索引（1.5 秒）。
- **自動重新索引：** 當嵌入供應商、模型或區塊分割設定
  變更時，整個索引會自動重建。
- **按需重新索引：** `openclaw memory index --force`

<Info>您也可以使用 `memorySearch.extraPaths` 索引工作區之外的 Markdown 檔案。請參閱 [配置參考](/zh-Hant/reference/memory-config#additional-memory-paths)。</Info>

## 何時使用

內建引擎是大多數使用者的正確選擇：

- 開箱即用，無需額外依賴。
- 能很好地處理關鍵字和向量搜尋。
- 支援所有嵌入提供者。
- 混合搜尋結合了這兩種檢索方法的優點。

如果您需要重排序、查詢擴展，或是想要索引工作區以外的目錄，請考慮切換到 [QMD](/zh-Hant/concepts/memory-qmd)。

如果您需要具備自動使用者建模功能的跨工作階段記憶體，請考慮使用 [Honcho](/zh-Hant/concepts/memory-honcho)。

## 疑難排解

**記憶體搜尋已停用？** 請檢查 `openclaw memory status`。如果未偵測到提供者，請明確設定一個或新增 API 金鑰。

**未偵測到本地提供者？** 請確認本地路徑存在並執行：

```bash
openclaw memory status --deep --agent main
openclaw memory index --force --agent main
```

獨立的 CLI 指令和 Gateway 都使用相同的 `local` 提供者 ID。
如果提供者設定為 `auto`，則僅當 `memorySearch.local.modelPath` 指向現有的本地檔案時，才會優先考慮本地嵌入。

**結果過時？** 請執行 `openclaw memory index --force` 以重建。監視器在極少數邊緣情況下可能會遺漏變更。

**sqlite-vec 無法載入？** OpenClaw 會自動回退到行程內餘弦相似度計算。請檢查日誌以瞭解具體的載入錯誤。

## 配置

有關嵌入提供者設定、混合搜尋調整（權重、MMR、時間衰減）、批次索引、多模態記憶體、sqlite-vec、額外路徑以及所有其他配置選項，請參閱
[記憶體配置參考](/zh-Hant/reference/memory-config)。

## 相關內容

- [記憶體概覽](/zh-Hant/concepts/memory)
- [記憶體搜尋](/zh-Hant/concepts/memory-search)
- [主動記憶體](/zh-Hant/concepts/active-memory)
