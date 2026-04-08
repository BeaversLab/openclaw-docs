---
title: "記憶體概覽"
summary: "OpenClaw 如何跨會話記憶事物"
read_when:
  - You want to understand how memory works
  - You want to know what memory files to write
---

# 記憶體概覽

OpenClaw 通過在您代理的工作區中寫入**純 Markdown 文件**來記憶事物。模型僅「記住」保存到磁盤的內容——沒有隱藏狀態。

## 運作原理

您的代理有三個與記憶相關的檔案：

- **`MEMORY.md`** -- 長期記憶。持久化的事實、偏好和決策。在每次 DM 會話開始時加載。
- **`memory/YYYY-MM-DD.md`** -- 每日筆記。運行的上下文和觀察。今天的和昨天的筆記會自動加載。
- **`DREAMS.md`** (實驗性、選用) -- 夢中日記和夢境掃描摘要，供人類審閱。

這些檔案位於代理工作區中 (預設為 `~/.openclaw/workspace`)。

<Tip>如果您希望您的代理記住某些事情，只需直接告訴它：「記住我偏好 TypeScript。」它會將其寫入適當的檔案中。</Tip>

## 記憶工具

代理有兩種處理記憶的工具：

- **`memory_search`** -- 使用語義搜尋尋找相關筆記，即使措辭與原文不同也能找到。
- **`memory_get`** -- 讀取特定的記憶檔案或行範圍。

這兩個工具都是由現用的記憶外掛程式提供的 (預設為：`memory-core`)。

## 記憶搜尋

當設定了嵌入 提供者時，`memory_search` 會使用 **混合搜尋** -- 結合向量相似度 (語意含義) 與關鍵字比對 (精確術語，如 ID 和程式碼符號)。一旦您擁有任何支援提供者的 API 金鑰，此功能即可立即使用。

<Info>OpenClaw 會從可用的 API 金鑰自動偵測您的嵌入提供者。如果您設定了 OpenAI、Gemini、Voyage 或 Mistral 金鑰，記憶搜尋將會自動啟用。</Info>

關於搜尋運作方式、調整選項和提供者設定的詳細資訊，請參閱
[記憶搜尋](/en/concepts/memory-search)。

## 記憶後端

<CardGroup cols={3}>
  <Card title="內建 (預設)" icon="database" href="/en/concepts/memory-builtin">
    基於 SQLite。開箱即支援關鍵字搜尋、向量相似度和混合搜尋。無需額外依賴。
  </Card>
  <Card title="QMD" icon="search" href="/en/concepts/memory-qmd">
    本機優先 的附屬程式，具備重排序、查詢擴展功能，以及索引工作區以外目錄的能力。
  </Card>
  <Card title="Honcho" icon="brain" href="/en/concepts/memory-honcho">
    AI 原生的跨會話記憶，具備使用者建模、語義搜尋以及 多代理感知功能。外掛程式安裝。
  </Card>
</CardGroup>

## 自動記憶清理

在 [壓縮](/en/concepts/compaction) 總結您的對話之前，OpenClaw
會執行一個靜默輪次，提醒代理將重要上下文儲存到記憶體
檔案中。此功能預設為開啟——您無需進行任何設定。

<Tip>記憶體清理可防止壓縮期間的上下文遺失。如果您的代理在對話中擁有 尚未寫入檔案的重要事實，它們將在摘要產生前自動儲存。</Tip>

## 夢境 (實驗性)

夢境是記憶體的可選背景整合過程。它會收集
短期訊號，對候選項進行評分，並僅將合格項目提升至
長期記憶 (`MEMORY.md`)。

其設計旨在保持長期記憶的高信噪比：

- **選用**：預設停用。
- **排程**：啟用後，`memory-core` 會自動管理一個週期性的 cron 工作
  以進行完整的夢境掃描。
- **閾值限制**：提升必須通過評分、回頻率和查詢
  多樣性閘門。
- **可審閱**：階段摘要和日記條目會寫入 `DREAMS.md`
  供人類審閱。

關於階段行為、評分訊號和夢境日記的詳細資訊，請參閱
[夢境 (實驗性)](/en/concepts/dreaming)。

## CLI

```bash
openclaw memory status          # Check index status and provider
openclaw memory search "query"  # Search from the command line
openclaw memory index --force   # Rebuild the index
```

## 延伸閱讀

- [內建記憶體引擎](/en/concepts/memory-builtin) -- 預設 SQLite 後端
- [QMD 記憶體引擎](/en/concepts/memory-qmd) -- 進階的本地優先 sidecar
- [Honcho 記憶體](/en/concepts/memory-honcho) -- AI 原生跨會話記憶
- [記憶體搜尋](/en/concepts/memory-search) -- 搜尋管道、提供者及
  調整
- [夢境 (實驗性)](/en/concepts/dreaming) -- 從短期回憶到長期記憶的
  背景提升
- [記憶體組態參考](/en/reference/memory-config) -- 所有組態旋鈕
- [壓縮](/en/concepts/compaction) -- 壓縮如何與記憶體互動
