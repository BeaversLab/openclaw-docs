---
summary: "修剪舊的工具結果以保持上下文精簡並提高快取效率"
title: "Session pruning"
read_when:
  - You want to reduce context growth from tool outputs
  - You want to understand Anthropic prompt cache optimization
---

Session pruning 會在每次 LLM 呼叫前從上下文中修剪**舊的工具結果**。它可以減少累積的工具輸出（執行結果、檔案讀取、搜尋結果）所導致的上下文膨脹，而無需重寫正常的對話文字。

<Info>Pruning 僅在記憶體中進行 -- 它不會修改磁碟上的會話記錄。 您的完整歷史記錄始終會被保留。</Info>

## 為何重要

長時間的會話會累積工具輸出，導致上下文視窗膨脹。這會增加成本，並可能導致 [壓縮](/zh-Hant/concepts/compaction) 過早發生。

Pruning 對於 **Anthropic prompt caching** 尤其有價值。在快取 TTL 過期後，下一個請求會重新快取完整的提示。Pruning 減少了快取寫入的大小，直接降低了成本。

## 運作方式

1. 等待快取 TTL 過期（預設 5 分鐘）。
2. 尋找舊的工具結果進行正常修剪（對話文字保持不變）。
3. **軟修剪** 過大的結果 -- 保留頭部和尾部，插入 `...`。
4. **硬清除** 其餘部分 -- 以預留位置取代。
5. 重置 TTL，以便後續請求重用新的快取。

## 舊版圖片清理

OpenClaw 也會針對在歷史記錄中保留原始圖片區塊或 prompt-hydration 媒體標記的會話，建立一個個別的等幂重播視圖。

- 它會逐位元保留**最近 3 個已完成的回合**，以便近期後續請求的 prompt 快取字首保持穩定。
- 在重播視圖中，來自 `user` 或
  `toolResult` 歷史記錄中較舊的已處理圖片區塊可以被替換為
  `[image data removed - already processed by model]`。
- 較舊的文字媒體參考，例如 `[media attached: ...]`、
  `[Image: source: ...]` 和 `media://inbound/...`，可以被替換為
  `[media reference removed - already processed by model]`。目前回合的附件標記保持完整，以便視覺模型仍能載入新圖片。
- 原始會話記錄不會被重寫，因此歷史記錄檢視器仍然可以呈現原始訊息條目及其圖片。
- 這與一般的 cache-TTL 修剪分開。它的存在是為了防止重複的
  圖像 payload 或過期的媒體引用在後續輪次中破壞提示詞快取。

## 智慧預設值

OpenClaw 針對 Anthropic 設定檔會自動啟用修剪：

| 設定檔類型                                        | 已啟用修剪 | Heartbeat |
| ------------------------------------------------- | ---------- | --------- |
| Anthropic OAuth/token auth (包括 Claude CLI 重用) | 是         | 1 小時    |
| API 金鑰                                          | 是         | 30 分鐘   |

如果您設定了明確值，OpenClaw 將不會覆寫它們。

## 啟用或停用

對於非 Anthropic 提供者，預設情況下修剪是關閉的。若要啟用：

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

## 修剪 vs 壓縮

|                | 修剪              | 壓縮            |
| -------------- | ----------------- | --------------- |
| **內容**       | 修剪工具結果      | 總結對話        |
| **是否儲存？** | 否 (針對每個請求) | 是 (在紀錄檔中) |
| **範圍**       | 僅限工具結果      | 整個對話        |

它們互補 -- 修剪在壓縮週期之間保持工具輸出的精簡。

## 延伸閱讀

- [壓縮](/zh-Hant/concepts/compaction) -- 基於總結的上下文縮減
- [Gateway 設定](/zh-Hant/gateway/configuration) -- 所有修剪設定選項
  (`contextPruning.*`)

## 相關

- [Session 管理](/zh-Hant/concepts/session)
- [Session 工具](/zh-Hant/concepts/session-tool)
- [Context 引擎](/zh-Hant/concepts/context-engine)
