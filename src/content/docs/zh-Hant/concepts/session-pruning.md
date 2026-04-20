---
title: "Session Pruning"
summary: "修剪舊的工具結果以保持上下文精簡並提高快取效率"
read_when:
  - You want to reduce context growth from tool outputs
  - You want to understand Anthropic prompt cache optimization
---

# Session Pruning

Session pruning 會在每次 LLM 呼叫前，從上下文中修剪掉**舊的工具結果**。它減少了累積的工具輸出（執行結果、檔案讀取、搜尋結果）所導致的上下文膨脹，而不會重寫一般的對話文字。

<Info>Pruning 僅在記憶體中進行——它不會修改磁碟上的會話記錄。 您的完整歷史記錄始終會被保留。</Info>

## 為何重要

長時間的對話會累積工具輸出，從而膨脹上下文視窗。這會增加成本，並可能比必要更早地強制執行 [壓縮](/zh-Hant/concepts/compaction)。

Pruning 對於 **Anthropic prompt caching** 尤其有價值。在快取 TTL 過期後，下一個請求會重新快取完整的 prompt。Pruning 減少了快取寫入的大小，從而直接降低了成本。

## 運作方式

1. 等待快取 TTL 過期（預設為 5 分鐘）。
2. 尋找舊的工具結果以進行常規修剪（對話文字保持不變）。
3. **軟修剪** 過大的結果——保留頭部和尾部，插入 `...`。
4. **硬清除** 其餘部分——以預留位置取代。
5. 重置 TTL，以便後續請求重用新的快取。

## 舊版映像檔清理

OpenClaw 也會針對較舊的舊版對話執行一個獨立的冪等清理，這些對話在歷史記錄中保存了原始的映像檔區塊。

- 它會逐位元組地保留**最近 3 個已完成的回合**，以便最近後續對話的提示詞快取前綴保持穩定。
- `user` 或 `toolResult` 歷史記錄中較舊的已處理映像檔區塊可以被替換為 `[image data removed - already processed by model]`。
- 這與正常的快取 TTL 修剪是分開的。它的存在是為了防止重複的映像檔 Payload 在後續回合中破壞提示詞快取。

## 智慧型預設值

OpenClaw 會為 Anthropic 設定檔自動啟用修剪：

| 設定檔類型                                            | 已啟用修剪 | Heartbeat |
| ----------------------------------------------------- | ---------- | --------- |
| Anthropic OAuth/token 驗證（包括重複使用 Claude CLI） | 是         | 1 小時    |
| API 金鑰                                              | 是         | 30 分鐘   |

如果您設定了明確的數值，OpenClaw 將不會覆蓋它們。

## 啟用或停用

對於非 Anthropic 提供者，預設情況下修剪功能是關閉的。若要啟用：

```json5
{
  agents: {
    defaults: {
      contextPruning: { mode: "cache-ttl", ttl: "5m" },
    },
  },
}
```

若要停用：請設定 `mode: "off"`。

## 修剪與壓縮

|                | 修剪           | 壓縮               |
| -------------- | -------------- | ------------------ |
| **內容**       | 修剪工具結果   | 摘要對話內容       |
| **是否儲存？** | 否（每次請求） | 是（在對話記錄中） |
| **範圍**       | 僅限工具結果   | 整段對話           |

它們互為補充——修剪可在壓縮週期之間保持工具輸出的精簡。

## 延伸閱讀

- [壓縮](/zh-Hant/concepts/compaction) -- 基於摘要的上下文縮減
- [Gateway 設定](/zh-Hant/gateway/configuration) -- 所有修剪設定選項
  (`contextPruning.*`)
