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

- **`MEMORY.md`** -- 長期記憶。持久的事實、偏好和
  決策。在每次 DM 會話開始時載入。
- **`memory/YYYY-MM-DD.md`** -- 每日筆記。運行中的語境和觀察。
  今天和昨天的筆記會自動載入。
- **`DREAMS.md`** （實驗性，可選）-- 夢境日記和夢境掃掠
  摘要，供人類審查。

這些檔案位於代理工作區中（預設為 `~/.openclaw/workspace`）。

<Tip>如果您希望您的代理記住某些事情，只需直接告訴它：「記住我偏好 TypeScript。」它會將其寫入適當的檔案中。</Tip>

## 記憶工具

代理有兩種處理記憶的工具：

- **`memory_search`** -- 使用語義搜尋尋找相關筆記，即使措辭
  與原文不同。
- **`memory_get`** -- 讀取特定的記憶檔案或行範圍。

這兩個工具均由現用的記憶外掛程式提供（預設：`memory-core`）。

## 記憶 Wiki 伴隨外掛程式

如果您希望持久記憶的行為更像一個維護良好的知識庫，而不僅僅是
原始筆記，請使用隨附的 `memory-wiki` 外掛程式。

`memory-wiki` 將持久知識編譯為具有以下功能的 wiki 儲存庫：

- 確定性頁面結構
- 結構化的主張與證據
- 矛盾與新鮮度追蹤
- 生成的儀表板
- 供代理/執行時間消費者使用的編譯摘要
- 原生 wiki 工具，如 `wiki_search`、`wiki_get`、`wiki_apply` 和 `wiki_lint`

它並不取代現用的記憶外掛程式。現用的記憶外掛程式仍然
擁有回溯、提升和夢境功能。`memory-wiki` 在其旁邊
新增了一個豐富的出處知識層。

參閱 [記憶 Wiki](/en/plugins/memory-wiki)。

## 記憶搜尋

當配置了嵌入提供者時，`memory_search` 會使用**混合
搜尋** —— 結合向量相似性（語義含義）與關鍵字比對
（如 ID 和程式碼符號等精確術語）。一旦您擁有
任何受支援提供者的 API 金鑰，此功能即可開箱即用。

<Info>OpenClaw 會從可用的 API 金鑰自動偵測您的嵌入提供者。如果您 設定了 OpenAI、Gemini、Voyage 或 Mistral 金鑰，記憶搜尋 將會自動啟用。</Info>

有關搜尋運作方式、調整選項和提供者設定的詳細資訊，請參閱
[記憶搜尋](/en/concepts/memory-search)。

## 記憶體後端

<CardGroup cols={3}>
  <Card title="內建 (預設)" icon="database" href="/en/concepts/memory-builtin">
    基於 SQLite。開箱即用，支援關鍵字搜尋、向量相似度和混合搜尋。無需額外依賴。
  </Card>
  <Card title="QMD" icon="search" href="/en/concepts/memory-qmd">
    以本機為主的 sidecar，具備重排序、查詢擴展以及索引工作區目錄之外資料夾的能力。
  </Card>
  <Card title="Honcho" icon="brain" href="/en/concepts/memory-honcho">
    AI 原生的跨會話記憶，具備使用者建模、語意搜尋和多代理感知功能。需安裝外掛程式。
  </Card>
</CardGroup>

## 知識 Wiki 層

<CardGroup cols={1}>
  <Card title="Memory Wiki" icon="book" href="/en/plugins/memory-wiki">
    將持久記憶編譯成具有豐富出處的 Wiki 儲存庫，包含聲明、儀表板、橋接模式以及相容 Obsidian 的工作流程。
  </Card>
</CardGroup>

## 自動記憶體沖刷

在 [壓縮](/en/concepts/compaction) 總結您的對話之前，OpenClaw 會執行一個靜默輪次，提醒代理將重要上下文儲存到記憶體檔案中。此功能預設為開啟——您無需進行任何設定。

<Tip>記憶體沖刷可防止壓縮期間的上下文遺失。如果您的代理在對話中擁有尚未寫入檔案的重要事實，它們將在總結發生之前自動儲存。</Tip>

## 夢境（實驗性）

「夢境」是一個可選的記憶體背景整合過程。它會收集短期訊號，對候選項進行評分，並僅將合格的項目提升到長期記憶 (`MEMORY.md`) 中。

其設計旨在保持長期記憶的高信號比：

- **選用**：預設停用。
- **排程**：啟用後，`memory-core` 會自動管理一個定期執行的 cron 工作，以進行完整的夢境掃描。
- **閾值篩選**：提升項目必須通過分數、回顧頻率和查詢多樣性的閘門。
- **可審閱**：階段摘要和日記條目會寫入 `DREAMS.md`
  以供人工審閱。

關於階段行為、評分信號和夢境日記的詳細資訊，請參閱
[夢境（實驗性）](/en/concepts/dreaming)。

## CLI

```bash
openclaw memory status          # Check index status and provider
openclaw memory search "query"  # Search from the command line
openclaw memory index --force   # Rebuild the index
```

## 延伸閱讀

- [內建記憶引擎](/en/concepts/memory-builtin) -- 預設的 SQLite 後端
- [QMD 記憶引擎](/en/concepts/memory-qmd) -- 進階的本機優先 sidecar
- [Honcho Memory](/en/concepts/memory-honcho) -- AI 原生的跨會話記憶
- [記憶 Wiki](/en/plugins/memory-wiki) -- 編譯的知識庫和 Wiki 原生工具
- [記憶搜尋](/en/concepts/memory-search) -- 搜尋管道、提供者和
  調整
- [夢境（實驗性）](/en/concepts/dreaming) -- 從短期回憶到長期記憶的
  背景提升
- [記憶設定參考](/en/reference/memory-config) -- 所有設定選項
- [壓縮](/en/concepts/compaction) -- 壓縮如何與記憶互動
