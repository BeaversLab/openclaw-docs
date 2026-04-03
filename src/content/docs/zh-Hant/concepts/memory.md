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

您的代理有兩個地方可以存儲記憶：

- **`MEMORY.md`** -- 長期記憶。持久化的事實、偏好和決策。在每次 DM 會話開始時加載。
- **`memory/YYYY-MM-DD.md`** -- 每日筆記。運行的上下文和觀察。今天的和昨天的筆記會自動加載。

這些文件存儲在代理工作區中（默認為 `~/.openclaw/workspace`）。

<Tip>如果您希望您的代理記住某些事情，只需告訴它：「記住我更喜歡 TypeScript。」它會將其寫入相應的文件中。</Tip>

## 記憶體工具

代理有兩個用於處理記憶的工具：

- **`memory_search`** -- 使用語義搜索查找相關筆記，即使措辭與原文不同。
- **`memory_get`** -- 讀取特定的記憶文件或行範圍。

這兩個工具均由活動的記憶插件提供（默認：`memory-core`）。

## 記憶體搜索

當配置了嵌入提供商時，`memory_search` 使用**混合搜索**——結合向量相似性（語義含義）與關鍵詞匹配（精確術語，如 ID 和代碼符號）。一旦您擁有任何受支援提供商的 API 密鑰，這項功能即可立即使用。

<Info>OpenClaw 會根據可用的 API 密鑰自動檢測您的嵌入提供商。如果您配置了 OpenAI、Gemini、Voyage 或 Mistral 密鑰，記憶體搜索將自動啟用。</Info>

有關搜索工作原理、調整選項和提供商設置的詳細信息，請參閱[記憶體搜索](/en/concepts/memory-search)。

## 記憶體後端

<CardGroup cols={3}>
  <Card title="內建 (默認)" icon="database" href="/en/concepts/memory-builtin">
    基於 SQLite。開箱即用，支援關鍵詞搜索、向量相似性和混合搜索。無需額外依賴。
  </Card>
  <Card title="QMD" icon="search" href="/en/concepts/memory-qmd">
    具備重排序、查詢擴展以及能夠索引工作區以外目錄功能的本機優先側車。
  </Card>
  <Card title="Honcho" icon="brain" href="/en/concepts/memory-honcho">
    具備用戶建模、語義搜尋和多重代理感知功能的 AI 原生跨會話記憶。需安裝外掛。
  </Card>
</CardGroup>

## 自動記憶排空

在[壓縮] (/en/concepts/compaction) 摘要您的對話之前，OpenClaw 會執行一個靜默回合，提醒代理將重要上下文保存到記憶檔案中。此功能預設為開啟——您無需進行任何設定。

<Tip>記憶排空可防止壓縮期間的上下文丟失。如果您的代理在對話中擁有尚未寫入檔案的重要事實，它們將會在摘要生成前自動保存。</Tip>

## CLI

```bash
openclaw memory status          # Check index status and provider
openclaw memory search "query"  # Search from the command line
openclaw memory index --force   # Rebuild the index
```

## 延伸閱讀

- [內建記憶引擎](/en/concepts/memory-builtin) -- 預設的 SQLite 後端
- [QMD 記憶引擎](/en/concepts/memory-qmd) -- 進階的本地優先側車
- [Honcho 記憶](/en/concepts/memory-honcho) -- AI 原生的跨會話記憶
- [記憶搜尋](/en/concepts/memory-search) -- 搜尋管道、提供者和
  調整
- [記憶設定參考](/en/reference/memory-config) -- 所有設定選項
- [壓縮](/en/concepts/compaction) -- 壓縮如何與記憶互動
