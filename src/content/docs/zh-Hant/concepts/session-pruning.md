---
title: "Session Pruning"
summary: "修剪舊的工具結果以保持上下文精簡並提高快取效率"
read_when:
  - You want to reduce context growth from tool outputs
  - You want to understand Anthropic prompt cache optimization
---

# Session Pruning

Session pruning 會在每次 LLM 呼叫前從上下文中修剪**舊的工具結果**。它可以減少累積工具輸出（執行結果、檔案讀取、搜尋結果）造成的上下文膨脹，而不會影響您的對話訊息。

<Info>Pruning 僅在記憶體中進行——它不會修改磁碟上的會話記錄。 您的完整歷史記錄始終會被保留。</Info>

## 為何重要

長時間的會話會累積工具輸出，從而膨脹上下文視窗。
這會增加成本，並可能迫使 [compaction](/en/concepts/compaction) 過早發生。

Pruning 對於 **Anthropic prompt caching** 尤其有價值。在快取 TTL 過期後，下一個請求會重新快取完整的 prompt。Pruning 減少了快取寫入的大小，從而直接降低了成本。

## 運作方式

1. 等待快取 TTL 過期（預設為 5 分鐘）。
2. 尋找舊的工具結果（絕不會觸及使用者與助理的訊息）。
3. **軟修剪** 過大的結果——保留頭部和尾部，插入 `...`。
4. **硬清除** 其餘部分——以預留位置取代。
5. 重置 TTL，以便後續請求重用新的快取。

## 智慧預設值

OpenClaw 會針對 Anthropic 設定檔自動啟用 pruning：

| 設定檔類型           | 已啟用 Pruning | Heartbeat |
| -------------------- | -------------- | --------- |
| OAuth 或 setup-token | 是             | 1 小時    |
| API 金鑰             | 是             | 30 分鐘   |

如果您設定了明確的值，OpenClaw 將不會覆寫它們。

## 啟用或停用

對於非 Anthropic 提供者，Pruning 預設為關閉。若要啟用：

```json5
{
  agents: {
    defaults: {
      contextPruning: { mode: "cache-ttl", ttl: "5m" },
    },
  },
}
```

若要停用：設定 `mode: "off"`。

## Pruning 與 compaction 的比較

|                | Pruning        | Compaction     |
| -------------- | -------------- | -------------- |
| **是什麼**     | 修剪工具結果   | 摘要對話內容   |
| **是否儲存？** | 否（每次請求） | 是（在記錄中） |
| **範圍**       | 僅限工具結果   | 整個對話       |

它們互為補充——pruning 在 compaction 循環之間保持工具輸出的精簡。

## 延伸閱讀

- [Compaction](/en/concepts/compaction) —— 基於摘要的上下文減少
- [Gateway Configuration](/en/gateway/configuration) —— 所有的 pruning 設定選項
  (`contextPruning.*`)
