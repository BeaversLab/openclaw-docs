---
title: "記憶概覽"
summary: "OpenClaw 如何在跨會話時記住事物"
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
- **`memory/YYYY-MM-DD.md`** -- 每日筆記。運行上下文和觀察記錄。
  今天和昨天的筆記會自動載入。
- **`DREAMS.md`** (選用) -- 夢日記與夢境掃描
  摘要供人類檢閱，包括基於歷史背景的回填條目。

這些檔案位於代理工作區中 (預設為 `~/.openclaw/workspace`)。

<Tip>如果您希望您的代理記住某些事情，只需直接告訴它：「記住我偏好 TypeScript。」它會將其寫入適當的檔案中。</Tip>

## 記憶工具

代理有兩種處理記憶的工具：

- **`memory_search`** -- 使用語義搜尋尋找相關筆記，即使措辭
  與原文不同也能找到。
- **`memory_get`** -- 讀取特定的記憶檔案或行範圍。

這兩個工具都是由當前的記憶插件提供的 (預設：`memory-core`)。

## 記憶 Wiki 伴隨外掛程式

如果您希望持久記憶的行為更像是一個維護良好的知識庫，而不僅僅是原始筆記，
請使用隨附的 `memory-wiki` 插件。

`memory-wiki` 將持久知識編譯成一個具有以下功能的 wiki 儲存庫：

- 確定性頁面結構
- 結構化的主張與證據
- 矛盾與新鮮度追蹤
- 生成的儀表板
- 供代理/執行時間消費者使用的編譯摘要
- 原生的 wiki 工具，例如 `wiki_search`、`wiki_get`、`wiki_apply` 和 `wiki_lint`

它不會取代當前的記憶插件。當前的記憶插件仍然負責回憶、晉升和做夢。
`memory-wiki` 在其旁邊增加了一個具豐富來源記錄的知識層。

請參閱 [記憶 Wiki](/zh-Hant/plugins/memory-wiki)。

## 記憶搜尋

當配置了嵌入 提供者時，`memory_search` 使用 **混合
搜尋** -- 將向量相似性 (語義含義) 與關鍵字匹配
(確切的術語，如 ID 和代碼符號) 結合起來。一旦您擁有
任何受支援提供者的 API 金鑰，這即可開箱即用。

<Info>OpenClaw 會從可用的 API 金鑰自動偵測您的嵌入提供者。如果您 設定了 OpenAI、Gemini、Voyage 或 Mistral 金鑰，記憶搜尋 將會自動啟用。</Info>

有關搜尋運作方式、調整選項和提供者設定的詳細資訊，請參閱
[記憶搜尋](/zh-Hant/concepts/memory-search)。

## 記憶體後端

<CardGroup cols={3}>
  <Card title="內建（預設）" icon="database" href="/zh-Hant/concepts/memory-builtin">
    基於 SQLite。開箱即用，支援關鍵字搜尋、向量相似度和混合搜尋。無需額外依賴。
  </Card>
  <Card title="QMD" icon="search" href="/zh-Hant/concepts/memory-qmd">
    本機優先的側車程式，具備重排序、查詢擴充以及索引工作區外目錄的能力。
  </Card>
  <Card title="Honcho" icon="brain" href="/zh-Hant/concepts/memory-honcho">
    AI 原生的跨會話記憶，具備使用者建模、語意搜尋和多代理感知功能。需安裝外掛程式。
  </Card>
</CardGroup>

## 知識 Wiki 層

<CardGroup cols={1}>
  <Card title="記憶 Wiki" icon="book" href="/zh-Hant/plugins/memory-wiki">
    將持久化記憶編譯為具有來源豐富的 Wiki 儲存庫，包含主張、儀表板、橋接模式和相容 Obsidian 的工作流程。
  </Card>
</CardGroup>

## 自動記憶體沖刷

在 [壓縮](/zh-Hant/concepts/compaction) 總結您的對話之前，OpenClaw 會執行一個靜默回合，提醒代理程式將重要上下文儲存到記憶檔案中。此功能預設開啟 —— 您無需進行任何設定。

<Tip>記憶體沖刷可防止壓縮期間的上下文遺失。如果您的代理在對話中擁有尚未寫入檔案的重要事實，它們將在總結發生之前自動儲存。</Tip>

## 夢境 (Dreaming)

夢境是一個可選的後台記憶整合過程。它會收集短期訊號、對候選項進行評分，並僅將合格項目提升至長期記憶 (`MEMORY.md`)。

其設計旨在保持長期記憶的高信號比：

- **選用**：預設停用。
- **排程**：啟用後，`memory-core` 會自動管理一個週期性的 cron 工作以進行完整的夢境掃描。
- **閾值篩選**：提升項目必須通過分數、回顧頻率和查詢多樣性的閘門。
- **可審查**：階段總結和日記條目會被寫入 `DREAMS.md` 以供人工審查。

關於階段行為、評分信號與夢日記的詳情，請參閱
[夢境](/zh-Hant/concepts/dreaming)。

## 基於事實的回填與即時提升

夢境系統現在有兩個密切相關的審查通道：

- **即時夢想**（Live dreaming）在 `memory/.dreams/` 下的短期夢想儲存中運作，這也是正常的深度階段在決定什麼可以晉升到 `MEMORY.md` 時所使用的機制。
- **有基礎的回填**（Grounded backfill）會將歷史的 `memory/YYYY-MM-DD.md` 筆記讀取為獨立的日期檔案，並將結構化的審查輸出寫入 `DREAMS.md`。

當您想要重播較舊的筆記並檢查系統認為什麼是持久的內容，而無需手動編輯 `MEMORY.md` 時，有基礎的回填非常有用。

當您使用：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

有基礎的持久候選者不會直接晉升。它們會被暫存到正常深度階段已經使用的同一個短期夢想儲存中。這意味著：

- `DREAMS.md` 仍然是人工審查的介面。
- 短期儲存仍然是面向機器的排序介面。
- `MEMORY.md` 仍然只能由深度晉升寫入。

如果您決定重播沒有用處，您可以刪除暫存的工件，而無需觸及普通的日記條目或正常的回憶狀態：

```bash
openclaw memory rem-backfill --rollback
openclaw memory rem-backfill --rollback-short-term
```

## CLI

```bash
openclaw memory status          # Check index status and provider
openclaw memory search "query"  # Search from the command line
openclaw memory index --force   # Rebuild the index
```

## 延伸閱讀

- [內建記憶引擎](/zh-Hant/concepts/memory-builtin) -- 預設的 SQLite 後端
- [QMD 記憶引擎](/zh-Hant/concepts/memory-qmd) -- 進階的本機優先側車
- [Honcho Memory](/zh-Hant/concepts/memory-honcho) -- AI 原生的跨會話記憶
- [Memory Wiki](/zh-Hant/plugins/memory-wiki) -- 編譯的知識保存庫和 Wiki 原生工具
- [Memory Search](/zh-Hant/concepts/memory-search) -- 搜尋管道、提供者和調整
- [夢境](/zh-Hant/concepts/dreaming) -- 從短期回憶到長期記憶的
  背景提昇
- [記憶配置參考](/zh-Hant/reference/memory-config) -- 所有配置選項
- [壓縮](/zh-Hant/concepts/compaction) -- 壓縮如何與記憶互動
