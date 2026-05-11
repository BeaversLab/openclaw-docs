---
summary: "OpenClaw 如何跨會話記住事物"
title: "記憶體概覽"
read_when:
  - You want to understand how memory works
  - You want to know what memory files to write
---

OpenClaw 透過在您代理人的工作區中寫入 **純 Markdown 檔案** 來記住事物。模型只會「記住」儲存到磁碟上的內容 — 不存在隱藏狀態。

## 運作方式

您的代理人擁有三個與記憶相關的檔案：

- **`MEMORY.md`** — 長期記憶。持久化的事實、偏好和決策。在每次 DM 會話開始時載入。
- **`memory/YYYY-MM-DD.md`** — 每日筆記。持續的背景和觀察。會自動載入今天和昨天的筆記。
- **`DREAMS.md`**（可選）— 夢境日記和夢境掃描摘要，供人類審查，包括有根據的歷史回溯條目。

這些檔案位於代理人的工作區中（預設為 `~/.openclaw/workspace`）。

<Tip>如果您希望代理人記住某件事，只需告訴它：「記住我偏好 TypeScript。」它會將其寫入適當的檔案。</Tip>

## 記憶工具

代理人擁有兩個用於處理記憶的工具：

- **`memory_search`** — 使用語意搜尋找出相關筆記，即使措辭與原文不同。
- **`memory_get`** — 讀取特定的記憶檔案或行範圍。

這兩個工具都是由啟用的記憶外掛所提供的（預設為：`memory-core`）。

## 記憶 Wiki 伴侶外掛

如果您希望持久記憶的運作方式更像是一個維護良好的知識庫，而不僅僅是原始筆記，請使用內建的 `memory-wiki` 外掛。

`memory-wiki` 會將持久知識編譯成具有以下特性的 Wiki 儲存庫：

- 確定性的頁面結構
- 結構化的主張和證據
- 矛盾和新鮮度追蹤
- 生成的儀表板
- 供代理人/執行時間使用的編譯摘要
- 原生的 Wiki 工具，例如 `wiki_search`、`wiki_get`、`wiki_apply` 和 `wiki_lint`

它並不取代啟用的記憶外掛。啟用的記憶外掛仍然擁有回憶、提升和夢境功能。`memory-wiki` 在其旁邊新增了一個豐富的來源知識層。

請參閱 [Memory Wiki](/zh-Hant/plugins/memory-wiki)。

## 記憶體搜尋

當配置了嵌入提供商時，`memory_search` 會使用 **混合搜尋** —— 結合向量相似度（語義含義）與關鍵字匹配（如 ID 和代碼符號等精確術語）。一旦您擁有任何受支援提供商的 API 金鑰，此功能即可開箱即用。

<Info>OpenClaw 會根據可用的 API 金鑰自動偵測您的嵌入提供商。如果您設定了 OpenAI、Gemini、Voyage 或 Mistral 金鑰，記憶體搜尋將會自動啟用。</Info>

關於搜尋運作方式、調整選項和提供商設定的詳細資訊，請參閱
[Memory Search](/zh-Hant/concepts/memory-search)。

## 記憶體後端

<CardGroup cols={3}>
  <Card title="內建（預設）" icon="database" href="/zh-Hant/concepts/memory-builtin">
    基於 SQLite。支援關鍵字搜尋、向量相似度和混合搜尋，開箱即用。無需額外依賴。
  </Card>
  <Card title="QMD" icon="search" href="/zh-Hant/concepts/memory-qmd">
    本地優先的附屬工具，具備重排序、查詢擴充功能，以及索引工作區以外目錄的能力。
  </Card>
  <Card title="Honcho" icon="brain" href="/zh-Hant/concepts/memory-honcho">
    AI 原生的跨會話記憶體，具備使用者建模、語義搜尋和多代理感知功能。需安裝外掛。
  </Card>
</CardGroup>

## 知識 wiki 層

<CardGroup cols={1}>
  <Card title="Memory Wiki" icon="book" href="/zh-Hant/plugins/memory-wiki">
    將持續性記憶體編譯成具有來源豐富的 wiki 資料庫，包含主張、儀表板、橋接模式和 Obsidian 友善的工作流程。
  </Card>
</CardGroup>

## 自動記憶體排空

在 [壓縮](/zh-Hant/concepts/compaction) 總結您的對話之前，OpenClaw
會執行一個靜默輪次，提醒代理將重要上下文儲存到記憶體檔案中。此功能預設為開啟 —— 您無需進行任何配置。

<Tip>記憶沖刷（memory flush）可防止在壓縮過程中遺失上下文。如果您的主程 在對話中擁有尚未寫入檔案的重要事實，它們將在摘要發生前自動儲存。</Tip>

## 夢境（Dreaming）

夢境是記憶的可選背景整合過程。它收集短期訊號，對候選項進行評分，並僅將合格的項目提升至長期記憶（`MEMORY.md`）。

其設計旨在保持長期記憶的高訊號品質：

- **選用**：預設停用。
- **排程**：啟用後，`memory-core` 會自動管理一個遞迴的 cron 任務
  以執行完整的夢境掃描。
- **閾值控制**：提升項目必須通過評分、回顧頻率和查詢
  多樣性閘門。
- **可審閱**：階段摘要和日記條目會寫入 `DREAMS.md`
  供人類審閱。

關於階段行為、評分訊號和夢境日記的詳細資訊，請參閱
[夢境（Dreaming）](/zh-Hant/concepts/dreaming)。

## 扎根回填與即時提升

夢境系統現在有兩個緊密相關的審閱通道：

- **即時夢境（Live dreaming）** 從 `memory/.dreams/` 下的短期夢境儲存庫運作，這也是正常的深度階段在決定哪些內容可以晉升為 `MEMORY.md` 時所使用的機制。
- **扎根回填（Grounded backfill）** 將歷史 `memory/YYYY-MM-DD.md` 筆記讀取為
  獨立的日期檔案，並將結構化的審閱輸出寫入 `DREAMS.md`。

當您想要重播較舊的筆記並檢查系統認為持久的內容而不需手動編輯 `MEMORY.md` 時，扎根回填非常有用。

當您使用時：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

扎根的持久候選項不會直接被提升。它們會被暫存到
正常的深度階段已使用的同一個短期夢境儲存庫中。這
意味著：

- `DREAMS.md` 仍然是人類審閱的介面。
- 短期儲存庫仍然是機器端排名的介面。
- `MEMORY.md` 仍然僅由深度提升過程寫入。

如果您決定重播沒有幫助，您可以移除已暫存的產物
而不會影響普通的日記條目或正常的回顧狀態：

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

- [內建記憶引擎（Builtin memory engine）](/zh-Hant/concepts/memory-builtin)：預設的 SQLite 後端。
- [QMD 記憶引擎](/zh-Hant/concepts/memory-qmd)：進階的本地優先側車。
- [Honcho 記憶](/zh-Hant/concepts/memory-honcho)：AI 原生的跨會話記憶。
- [記憶 Wiki](/zh-Hant/plugins/memory-wiki)：編譯的知識庫與 Wiki 原生工具。
- [記憶搜尋](/zh-Hant/concepts/memory-search)：搜尋管線、提供者與調整。
- [夢境處理](/zh-Hant/concepts/dreaming)：從短期回憶提升至長期記憶的背景推廣。
- [記憶配置參考](/zh-Hant/reference/memory-config)：所有配置選項。
- [壓縮](/zh-Hant/concepts/compaction)：壓縮如何與記憶互動。

## 相關

- [主動記憶](/zh-Hant/concepts/active-memory)
- [記憶搜尋](/zh-Hant/concepts/memory-search)
- [內建記憶引擎](/zh-Hant/concepts/memory-builtin)
- [Honcho 記憶](/zh-Hant/concepts/memory-honcho)
