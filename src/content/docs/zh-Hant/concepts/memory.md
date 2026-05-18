---
summary: "OpenClaw 如何跨會話記住事物"
title: "記憶概覽"
read_when:
  - You want to understand how memory works
  - You want to know what memory files to write
---

OpenClaw 透過在您代理人的工作區中寫入 **純 Markdown 檔案** 來記住事物。模型只會「記住」儲存到磁碟上的內容 — 不存在隱藏狀態。

## 運作方式

您的代理人擁有三個與記憶相關的檔案：

- **`MEMORY.md`** — 長期記憶。持續性的事實、偏好和
  決策。在每次 DM 會話開始時載入。
- **`memory/YYYY-MM-DD.md`**（或 **`memory/YYYY-MM-DD-<slug>.md`**）——每日笔记。
  運行上下文和觀察。今天和昨天的筆記會自動加載，現在也會一併擷取在 `/new` 或 `/reset` 上由內建 session-memory hook 所寫入的 slug 變體，以及僅包含日期的檔案。
- **`DREAMS.md`**（可選）——供人類審閱的夢境日記與夢境掃描摘要，包含有根據的歷史回填條目。

這些檔案位於 Agent 的工作區中（預設為 `~/.openclaw/workspace`）。

## 什麼放在哪裡

`MEMORY.md` 是精簡的經策劃層級。將其用於持久性事實、
偏好設定、長期決策，以及在主要私人會話開始時應可用的簡短摘要。它並非旨在作為原始逐字稿、
每日日誌或詳盡的檔案庫。

`memory/YYYY-MM-DD.md` 檔案是運作層級。將它們用於詳細的每日
筆記、觀察、會話摘要，以及後續可能仍有用的原始上下文。這些檔案會為 `memory_search` 和 `memory_get` 建立索引，但在每一輪中
並不會被注入到正常的啟動提示中。

隨著時間推移，預期 Agent 會從每日筆記中提煉有用素材至
`MEMORY.md`，並移除陳舊的長期條目。產生的工作區指令和心跳流程可以定期執行此操作；您不需要
針對每個記住的細節手動編輯 `MEMORY.md`。

如果 `MEMORY.md` 超過啟動檔案預算，OpenClaw 會將磁碟上的
檔案保持完整，但會截斷注入至模型上下文的副本。請將此視為一個訊號，將詳細素材移回 `memory/*.md`，僅將
持久的摘要保留在 `MEMORY.md` 中，或者如果您明確
想要花費更多的提示預算，則可以提高啟動限制。使用 `/context list`、`/context detail` 或
`openclaw doctor` 來查看原始與注入的大小及截斷狀態。

<Tip>如果您希望您的代理記住某些事情，只需告訴它：「記住我更喜歡 TypeScript。」它會將其寫入適當的檔案。</Tip>

## 推斷承諾

有些未來的後續追蹤並非持久性事實。如果您提到明天有面試，有用的記憶可能是「面試後檢查」，而不是「將其永久儲存在 `MEMORY.md` 中」。

[承諾](/zh-Hant/concepts/commitments) 是選用性的、短期的後續追蹤記憶，專為此情況設計。OpenClaw 會在隱藏的背景程序中推斷這些承諾，將其範圍限制在相同的代理和頻道，並透過心跳傳送到期應檢查的項目。明確提醒仍使用 [預定任務](/zh-Hant/automation/cron-jobs)。

## 記憶工具

代理有兩個用於處理記憶的工具：

- **`memory_search`** — 使用語意搜尋尋找相關筆記，即使措辭與原文不同也行。
- **`memory_get`** — 讀取特定的記憶檔案或行範圍。

這兩個工具都是由現用的記憶外掛程式提供（預設為：`memory-core`）。

## 記憶 Wiki 伴隨外掛

如果您希望持久性記憶的運作更像維護良好的知識庫，而不僅僅是原始筆記，請使用隨附的 `memory-wiki` 外掛程式。

`memory-wiki` 會將持久性知識編譯成具有以下功能的 Wiki 儲存庫：

- 確定性頁面結構
- 結構化的主張與證據
- 矛盾與新鮮度追蹤
- 生成的儀表板
- 供代理/執行時使用者的編譯摘要
- Wiki 原生工具，例如 `wiki_search`、`wiki_get`、`wiki_apply` 和 `wiki_lint`

它不會取代現用的記憶外掛程式。現用的記憶外掛程式仍然擁有回憶、晉升和夢境功能。`memory-wiki` 在其旁邊新增了一個豐富來源的知識層級。

請參閱 [記憶 Wiki](/zh-Hant/plugins/memory-wiki)。

## 記憶搜尋

當設定好嵌入供應商時，`memory_search` 會使用 **混合搜尋** — 結合向量相似度（語意含義）與關鍵字匹配（確切字詞，例如 ID 和程式碼符號）。一旦您擁有任何支援供應商的 API 金鑰，這項功能即可立即運作。

<Info>OpenClaw 會根據可用的 API 金鑰自動偵測您的嵌入提供商。如果您設定有 OpenAI、Gemini、Voyage 或 Mistral 金鑰，記憶體搜尋就會自動啟用。</Info>

關於搜尋運作方式、調整選項和供應商設定的詳細資訊，請參閱 [記憶搜尋](/zh-Hant/concepts/memory-search)。

## 記憶體後端

<CardGroup cols={3}>
  <Card title="內建（預設）" icon="database" href="/zh-Hant/concepts/memory-builtin">
    基於 SQLite。開箱即用，支援關鍵字搜尋、向量相似度和混合搜尋。無需額外依賴。
  </Card>
  <Card title="QMD" icon="search" href="/zh-Hant/concepts/memory-qmd">
    本地優先的側車程式，具備重排序、查詢擴展以及索引工作區以外目錄的能力。
  </Card>
  <Card title="Honcho" icon="brain" href="/zh-Hant/concepts/memory-honcho">
    AI 原生的跨會話記憶體，具備使用者建模、語意搜尋和多代理感知。需安裝外掛程式。
  </Card>
  <Card title="LanceDB" icon="layers" href="/zh-Hant/plugins/memory-lancedb">
    內建的 LanceDB 支援記憶體，具備 OpenAI 相容的嵌入、自動回顧、自動擷取以及本機 Ollama 嵌入支援。
  </Card>
</CardGroup>

## 知識 wiki 層

<CardGroup cols={1}>
  <Card title="記憶體 Wiki" icon="book" href="/zh-Hant/plugins/memory-wiki">
    將持久記憶體編譯成富含出處的 wiki 儲存庫，具備宣告、儀表板、橋接模式和 Obsidian 友善的工作流程。
  </Card>
</CardGroup>

## 自動記憶體整理

在 [壓縮](/zh-Hant/concepts/compaction) 總結您的對話之前，OpenClaw 會執行一個靜默輪次，提醒代理將重要的上下文儲存到記憶檔案中。此功能預設為開啟 — 您不需要進行任何設定。

若要讓該維護輪次在本機模型上執行，請設定一個精確的記憶體整理模型覆寫：

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "memoryFlush": {
          "model": "ollama/qwen3:8b"
        }
      }
    }
  }
}
```

覆蓋僅適用於記憶刷新輪次，並且不繼承作用中的會話回退鏈。

<Tip>記憶刷新可防止在壓縮期間遺失上下文。如果您的代理在對話中有尚未寫入檔案的重要事實，它們將會在摘要發生前自動儲存。</Tip>

## 夢境運算

夢想是記憶的可選背景整合過程。它會收集短期訊號，對候選項進行評分，並僅將合格的項目提升至長期記憶 (`MEMORY.md`)。

其設計目的是保持長期記憶的高訊號品質：

- **選用**：預設為停用。
- **已排程**：啟用後，`memory-core` 會自動管理一個週期性的 cron 工作
  以執行完整的夢想掃描。
- **設有閾值**：提升必須通過評分、回顧頻率和查詢
  多樣性門檻。
- **可審閱**：階段摘要和日記條目會寫入 `DREAMS.md`
  供人類審閱。

關於階段行為、評分訊號和夢想日記的詳細資訊，請參閱
[夢想](/zh-Hant/concepts/dreaming)。

## 落地回填與即時提升

夢境運算系統現在有兩個密切相關的審查通道：

- **即時夢想** 來自 `memory/.dreams/` 下的短期夢想儲存，
  這是正常的深度階段在決定哪些內容可以晉升至 `MEMORY.md` 時所使用的依據。
- **基礎回填** 會將歷史 `memory/YYYY-MM-DD.md` 註記作為獨立的日期檔案讀取，
  並將結構化的審閱輸出寫入 `DREAMS.md`。

當您想要重播較舊的註記並檢視系統認為可持久的內容，而不需手動編輯 `MEMORY.md` 時，基礎回填非常有用。

當您使用：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

落地持久候選項不會被直接提升。它們會被暫存到
正常的深度階段已經使用的同一個短期夢境運算儲存庫中。這
意味著：

- `DREAMS.md` 依然是人類審閱的介面。
- 短期儲存庫保持作為機器端排序介面。
- `MEMORY.md` 仍然僅由深度晉升寫入。

如果您決定重放沒有用，您可以移除暫存的產物
而不需觸及普通的日記條目或正常的回顧狀態：

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

- [內建記憶引擎](/zh-Hant/concepts/memory-builtin)：預設的 SQLite 後端。
- [QMD 記憶引擎](/zh-Hant/concepts/memory-qmd)：進階的本機優先側車。
- [Honcho 記憶](/zh-Hant/concepts/memory-honcho)：AI 原生的跨會話記憶。
- [Memory LanceDB](/zh-Hant/plugins/memory-lancedb)：具有 OpenAI 相容嵌入的 LanceDB 支援外掛。
- [Memory Wiki](/zh-Hant/plugins/memory-wiki)：編譯的知識庫和 Wiki 原生工具。
- [記憶搜尋](/zh-Hant/concepts/memory-search)：搜尋管線、提供者和調整。
- [夢想](/zh-Hant/concepts/dreaming)：從短期回憶到長期記憶的背景晉升。
- [記憶組態參考](/zh-Hant/reference/memory-config)：所有組態旋鈕。
- [壓縮](/zh-Hant/concepts/compaction)：壓縮如何與記憶互動。

## 相關

- [主動記憶](/zh-Hant/concepts/active-memory)
- [記憶搜尋](/zh-Hant/concepts/memory-search)
- [內建記憶引擎](/zh-Hant/concepts/memory-builtin)
- [Honcho 記憶](/zh-Hant/concepts/memory-honcho)
- [Memory LanceDB](/zh-Hant/plugins/memory-lancedb)
- [承諾](/zh-Hant/concepts/commitments)
