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

- **`MEMORY.md`** — 長期記憶。持久的事實、偏好和決策。在每次 DM 會話開始時載入。
- **`memory/YYYY-MM-DD.md`** (或 **`memory/YYYY-MM-DD-<slug>.md`**) — 每日筆記。
  運行背景和觀察。今天和昨天的筆記會自動載入，並且現在也會一併選取由內建的 session-memory hook 在 `/new` 或 `/reset` 上撰寫的 slug 變體，與僅含日期的檔案放在一起。
- **`DREAMS.md`** (可選) — 夢境日記和夢境掃描摘要，
  供人類檢閱，包括有依據的歷史回填條目。

這些檔案位於代理工作區中 (預設為 `~/.openclaw/workspace`)。

## 什麼放在哪裡

`MEMORY.md` 是精簡、經過策劃的層級。用它來儲存持久的事實、
偏好、常駐決策，以及在主要私人會話開始時應可取得的簡短摘要。它並非旨在作為原始逐字稿、
每日日誌或完整的存檔。

`memory/YYYY-MM-DD.md` 檔案是工作層級。用它來記錄詳細的每日
筆記、觀察、會話摘要，以及稍後可能仍有用的原始背景。這些檔案已建立 `memory_search` 和 `memory_get` 的索引，但它們
不會在每輪對話中被注入到正常的啟動提示詞中。

隨著時間推移，代理預期會將每日筆記中的有用素材提煉到 `MEMORY.md` 中，並移除過時的長期條目。產生的工作區指令和心跳流程可以定期執行此操作；您不需要
針對每個記住的細節手動編輯 `MEMORY.md`。

如果 `MEMORY.md` 超出了啟動檔案預算，OpenClaw 會保持磁碟上的檔案完整無缺，但會截斷注入到模型語境中的副本。應將此視為一個信號，將詳細材料移回 `memory/*.md`，僅在 `MEMORY.md` 中保留持續的摘要，或者如果您明確想要花費更多的提示詞預算，則可以提高啟動限制。使用 `/context list`、`/context detail` 或 `openclaw doctor` 來查看原始大小與注入大小以及截斷狀態。

<Tip>如果您希望您的代理記住某些事情，只需告訴它：「記住我更喜歡 TypeScript。」它會將其寫入適當的檔案。</Tip>

## 動作敏感記憶

大多數記憶可以寫成普通的 Markdown 筆記。但有些記憶會影響代理稍後應該做什麼。對於這些記憶，應捕獲何時可以根據該筆記採取行動，而不僅僅是事實本身。

當筆記涉及以下情況時，請捕獲該動作邊界：

- 批准或許可要求，
- 臨時限制，
- 移交給另一個會話、執行緒或人員，
- 過期條件，
- 安全採取行動的時機，
- 來源或所有者權限，
- 避免誘惑性行動的指示。

一個有用的動作敏感記憶應清楚地表明：

- 什麼會改變未來的行為，
- 何時或在何種條件下適用，
- 何時過期，或者什麼解鎖了行動，
- 代理應避免做什麼，
- 誰是來源或所有者（如果這會影響信任或權限）。

記憶可以保留批准語境，但不執行策略。請使用 OpenClaw 批准設定、沙盒和排程任務來進行硬性操作控制。

範例：

```md
The API migration is being designed in another session. Future turns should not edit the API implementation from this thread; use findings here only as design input until the migration plan lands.
```

另一個範例：

```md
A report from an untrusted source needs review before promotion. Future turns should treat it as evidence only; do not store it as durable memory until a trusted reviewer confirms the contents.
```

對於推斷出的、短期的後續跟進，請使用 [承諾](/zh-Hant/concepts/commitments)。對於精確提醒、定時檢查和週期性工作，請使用 [排程任務](/zh-Hant/automation/cron-jobs)。記憶仍然可以概括任何一種路徑周圍的持續語境。

這並不是每個記憶的必需架構。簡單的事實可以保持簡潔。當失去時機、權限、過期或安全採取行動的語境可能導致代理稍後做錯事情時，請使用動作敏感邊界。

## 推斷承諾

有些未來的後續跟進並不是持續的事實。如果您提到明天有一個面試，有用的記憶可能是「面試後確認」，而不是「將此永久儲存在 `MEMORY.md` 中」。

[Commitments](/zh-Hant/concepts/commitments) 是針對該情況選用的短期後續記憶。OpenClaw 會在隱藏的背景流程中推斷它們，將其範圍限制在相同的代理和通道，並透過心跳傳送到期檢查。明確的提醒仍使用 [scheduled tasks](/zh-Hant/automation/cron-jobs)。

## 記憶工具

代理有兩個用於處理記憶的工具：

- **`memory_search`** — 使用語意搜尋尋找相關筆記，即使措辭與原文不同。
- **`memory_get`** — 讀取特定的記憶檔案或行範圍。

這兩個工具都是由活動記憶外掛提供的（預設：`memory-core`）。

## 記憶 Wiki 伴隨外掛

如果您希望持久記憶的行為更像是一個維護良好的知識庫，而不僅僅是原始筆記，請使用內建的 `memory-wiki` 外掛。

`memory-wiki` 會將持久知識編譯成一個具有以下特性的 Wiki 儲存庫：

- 確定性頁面結構
- 結構化的主張和證據
- 矛盾和新鮮度追蹤
- 生成的儀表板
- 針對代理/執行時間使用者的編譯摘要
- Wiki 原生工具，例如 `wiki_search`、`wiki_get`、`wiki_apply` 和 `wiki_lint`

它不會取代活動記憶外掛。活動記憶外掛仍然擁有回想、提升和夢想的功能。`memory-wiki` 在旁邊增加了一個豐富來源的知識層。

請參閱 [Memory Wiki](/zh-Hant/plugins/memory-wiki)。

## 記憶搜尋

當設定了嵌入提供者時，`memory_search` 會使用 **混合搜尋** —— 結合向量相似度（語意含義）與關鍵字比對（確切術語，如 ID 和代碼符號）。一旦您擁有任何支援提供者的 API 金鑰，此功能即可立即運作。

<Info>OpenClaw 會從可用的 API 金鑰自動偵測您的嵌入提供者。如果您設定了 OpenAI、Gemini、Voyage 或 Mistral 金鑰，記憶搜尋將會自動啟用。</Info>

有關搜尋運作方式、調整選項和提供者設定的詳細資訊，請參閱
[Memory Search](/zh-Hant/concepts/memory-search)。

## 記憶後端

<CardGroup cols={3}>
  <Card title="內建 (預設)" icon="資料庫" href="/zh-Hant/concepts/memory-builtin">
    基於 SQLite。開箱即用，支援關鍵字搜尋、向量相似度和混合搜尋。無需額外依賴。
  </Card>
  <Card title="QMD" icon="搜尋" href="/zh-Hant/concepts/memory-qmd">
    本機優先的側車程式，具備重排序、查詢擴充以及索引工作區以外目錄的能力。
  </Card>
  <Card title="Honcho" icon="大腦" href="/zh-Hant/concepts/memory-honcho">
    AI 原生的跨會話記憶，具備使用者建模、語意搜尋和多代理感知。需安裝外掛。
  </Card>
  <Card title="LanceDB" icon="層級" href="/zh-Hant/plugins/memory-lancedb">
    內建 LanceDB 支援的記憶，具備相容 OpenAI 的嵌入、自動回憶、自動擷取以及本機 Ollama 嵌入支援。
  </Card>
</CardGroup>

## 知識 Wiki 層級

<CardGroup cols={1}>
  <Card title="Memory Wiki" icon="書籍" href="/zh-Hant/plugins/memory-wiki">
    將持續性記憶編譯成具有豐富出處的 Wiki 儲存庫，包含主張、儀表板、橋接模式以及相容 Obsidian 的工作流程。
  </Card>
</CardGroup>

## 自動記憶排空

在[壓縮](/zh-Hant/concepts/compaction)總結您的對話之前，OpenClaw 會執行一個靜默的回合，提醒代理將重要內容儲存到記憶檔案中。此功能預設為開啟 — 您不需要進行任何設定。

若要在本機模型上保留該維護回合，請設定精確的記憶排空模型覆寫：

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

該覆寫僅適用於記憶排空回合，並不會繼承作用中會話的後援鏈。

<Tip>記憶排空可防止壓縮期間的內容遺失。如果您的代理在對話中有尚未寫入檔案的重要事實，它們將會在總結發生前自動儲存。</Tip>

## 做夢

夢想是一個可選的記憶背景合併過程。它收集短期信號，對候選項進行評分，並僅將合格的項目提升至長期記憶 (`MEMORY.md`)。

其設計目的是保持長期記憶的高信號：

- **選用**：預設為停用。
- **已排程**：啟用後，`memory-core` 會自動管理一個循環的 cron 工作
  以執行完整的夢想掃描。
- **設有閾值**：提升項目必須通過分數、召回頻率和查詢
  多樣性的門檻。
- **可供審閱**：階段摘要和日記條目會寫入 `DREAMS.md`
  以供人工審閱。

關於階段行為、評分信號和夢中日記的詳細資訊，請參閱
[夢想](/zh-Hant/concepts/dreaming)。

## 基礎回填與即時提升

夢想系統現在有兩個密切相關的審閱通道：

- **即時夢想** 從 `memory/.dreams/` 下的短期夢想儲存庫運作，
  這是正常深度階段在決定哪些內容可以升級至 `MEMORY.md` 時所使用的機制。
- **基礎回填** 將歷史 `memory/YYYY-MM-DD.md` 註記讀取為
  獨立的日期檔案，並將結構化的審閱輸出寫入 `DREAMS.md`。

當您想要重新播放舊註記並檢視系統認為哪些內容具有持久性，而無需手動編輯 `MEMORY.md` 時，基礎回填非常有用。

當您使用時：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

基礎持久候選項不會被直接提升。它們會被暫存至
正常深度階段已使用的同一個短期夢想儲存庫。這
意味著：

- `DREAMS.md` 保持為人工審閱介面。
- 短期儲存庫保持為機器端排名介面。
- `MEMORY.md` 仍僅由深度提升寫入。

如果您決定重新播放沒有用處，您可以移除暫存的成品
而不會影響一般的日記條目或正常的召回狀態：

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
- [Memory LanceDB](/zh-Hant/plugins/memory-lancedb)：使用 LanceDB 支援且相容 OpenAI 嵌入的外掛程式。
- [Memory Wiki](/zh-Hant/plugins/memory-wiki)：編譯的知識庫和 Wiki 原生工具。
- [Memory search](/zh-Hant/concepts/memory-search)：搜尋管道、提供者和調整。
- [Dreaming](/zh-Hant/concepts/dreaming)：從短期回憶到長期記憶的背景提升。
- [Memory configuration reference](/zh-Hant/reference/memory-config)：所有設定選項。
- [Compaction](/zh-Hant/concepts/compaction)：壓縮如何與記憶互動。

## 相關

- [Active memory](/zh-Hant/concepts/active-memory)
- [Memory search](/zh-Hant/concepts/memory-search)
- [Builtin memory engine](/zh-Hant/concepts/memory-builtin)
- [Honcho memory](/zh-Hant/concepts/memory-honcho)
- [Memory LanceDB](/zh-Hant/plugins/memory-lancedb)
- [Commitments](/zh-Hant/concepts/commitments)
