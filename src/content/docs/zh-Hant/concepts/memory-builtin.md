---
title: "內建記憶體引擎"
summary: "預設基於 SQLite 的記憶體後端，提供關鍵字、向量及混合搜尋"
read_when:
  - You want to understand the default memory backend
  - You want to configure embedding providers or hybrid search
---

# 內建記憶體引擎

內建引擎是預設的記憶體後端。它會將您的記憶體索引儲存在
個別代理程式的 SQLite 資料庫中，且不需要額外的相依性即可開始使用。

## 它提供了什麼

- **關鍵字搜尋**，透過 FTS5 全文檢索索引 (BM25 評分)。
- **向量搜尋**，透過來自任何支援提供者的嵌入向量。
- **混合搜尋**，結合兩者以獲得最佳結果。
- **中日韓 (CJK) 支援**，透過針對中文、日文和韓文的三元組標記化。
- **sqlite-vec 加速**，用於資料庫內的向量查詢 (選用)。

## 快速入門

如果您擁有 OpenAI、Gemini、Voyage 或 Mistral 的 API 金鑰，內建
引擎會自動偵測並啟用向量搜尋。無需設定。

若要明確設定提供者：

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

如果沒有嵌入向量提供者，則僅可使用關鍵字搜尋。

## 支援的嵌入向量提供者

| 提供者  | ID        | 自動偵測  | 備註                              |
| ------- | --------- | --------- | --------------------------------- |
| OpenAI  | `openai`  | 是        | 預設值： `text-embedding-3-small` |
| Gemini  | `gemini`  | 是        | 支援多模態 (圖片 + 音訊)          |
| Voyage  | `voyage`  | 是        |                                   |
| Mistral | `mistral` | 是        |                                   |
| Ollama  | `ollama`  | 否        | 本機，需明確設定                  |
| Local   | `local`   | 是 (優先) | GGUF 模型，約 0.6 GB 下載大小     |

自動偵測會依照顯示的順序，選擇第一個可解析 API 金鑰的提供者。
請設定 `memorySearch.provider` 進行覆寫。

## 索引運作方式

OpenClaw 會將 `MEMORY.md` 和 `memory/*.md` 索引為區塊 (約 400 個權位並具有
80 個權位重疊)，並將其儲存在個別代理程式的 SQLite 資料庫中。

- **索引位置：** `~/.openclaw/memory/<agentId>.sqlite`
- **檔案監看：** 記憶體檔案的變更會觸發防抖重新索引 (1.5 秒)。
- **自動重新索引：** 當嵌入向量提供者、模型或區塊分割設定
  變更時，會自動重建整個索引。
- **隨需重新索引：** `openclaw memory index --force`

<Info>您也可以使用 `memorySearch.extraPaths` 對工作區外的 Markdown 檔案進行索引。請參閱 [配置參考](/en/reference/memory-config#additional-memory-paths)。</Info>

## 使用時機

內建引擎是大多數使用者的正確選擇：

- 開箱即用，無需額外依賴。
- 能很好地處理關鍵字和向量搜尋。
- 支援所有嵌入提供者。
- 混合搜尋結合了這兩種檢索方法的優點。

如果您需要重新排序、查詢擴充，或想要對工作區外的目錄進行索引，請考慮切換到 [QMD](/en/concepts/memory-qmd)。

如果您想要具有自動使用者建模的跨會話記憶，請考慮使用 [Honcho](/en/concepts/memory-honcho)。

## 疑難排解

**記憶搜尋已停用？** 請檢查 `openclaw memory status`。如果未偵測到提供者，請明確設定一個或新增 API 金鑰。

**結果過時？** 請執行 `openclaw memory index --force` 以重建。監看程式在少數邊緣情況下可能會遺漏變更。

**sqlite-vec 無法載入？** OpenClaw 會自動回退到程序內的餘弦相似度。請檢查日誌中的具體載入錯誤。

## 配置

有關嵌入提供者設定、混合搜尋調整（權重、MMR、時間衰減）、批次索引、多模態記憶、sqlite-vec、額外路徑以及所有其他配置選項，請參閱
[記憶配置參考](/en/reference/memory-config)。
