---
summary: "外送通道的 Markdown 格式化流程"
read_when:
  - 您正在更改外送通道的 Markdown 格式化或分塊
  - 您正在新增新的通道格式化器或樣式對應
  - 您正在調試跨通道的格式化迴歸
title: "Markdown 格式化"
---

# Markdown 格式化

OpenClaw 在渲染特定通道輸出之前，通過將外送 Markdown 轉換為共享的中間表示法 (IR) 來進行格式化。IR 保持源文本完整，同時攜帶樣式/連結範圍，以便分塊和渲染可以在跨通道時保持一致。

## 目標

- **一致性：** 一次解析步驟，多個渲染器。
- **安全分塊：** 在渲染之前分割文本，使行內格式從不會在分塊之間斷開。
- **通道適配：** 將相同的 IR 對應到 Slack mrkdwn、Telegram HTML 和 Signal 樣式範圍，而無需重新解析 Markdown。

## 流程

1. **解析 Markdown -> IR**
   - IR 是純文本加上樣式範圍 (粗體/斜體/刪除線/代碼/劇透) 和連結範圍。
   - 偏移量是 UTF-16 代碼單元，以便 Signal 樣式範圍與其 API 對齊。
   - 僅當通道選擇加入表格轉換時，才會解析表格。
2. **分塊 IR (格式優先)**
   - 分塊發生在渲染之前的 IR 文本上。
   - 行內格式不會在分塊之間拆分；範圍會按分塊進行切片。
3. **按通道渲染**
   - **Slack：** mrkdwn 標記 (粗體/斜體/刪除線/代碼)，連結以 `<url|label>` 表示。
   - **Telegram：** HTML 標籤 (`<b>`, `<i>`, `<s>`, `<code>`, `<pre><code>`, `<a href>`)。
   - **Signal：** 純文本 + `text-style` 範圍；當標籤不同時，連結會變成 `label (url)`。

## IR 範例

輸入 Markdown：

```markdown
Hello **world** — see [docs](https://docs.openclaw.ai).
```

IR (示意圖)：

```json
{
  "text": "Hello world — see docs.",
  "styles": [{ "start": 6, "end": 11, "style": "bold" }],
  "links": [{ "start": 19, "end": 23, "href": "https://docs.openclaw.ai" }]
}
```

## 使用位置

- Slack、Telegram 和 Signal 外送適配器從 IR 進行渲染。
- 其他通道 (WhatsApp、iMessage、MS Teams、Discord) 仍使用純文本或其自己的格式化規則，當啟用時，會在分塊之前應用 Markdown 表格轉換。

## 表格處理

聊天客戶端並未一致支援 Markdown 表格。請使用 `markdown.tables` 控制每個通道 (及每個帳戶) 的轉換。

- `code`：將表格渲染為程式碼區塊（大多數頻道的預設值）。
- `bullets`：將每一列轉換為項目符號（Signal + WhatsApp 的預設值）。
- `off`：停用表格解析與轉換；原始表格文字會直接保留。

設定鍵 (Config keys)：

```yaml
channels:
  discord:
    markdown:
      tables: code
    accounts:
      work:
        markdown:
          tables: off
```

## 分塊規則

- 分塊限制來自頻道轉接器/設定，並應用於 IR 文字。
- 程式碼圍欄會保留為單一區塊，並帶有尾隨換行符，以便頻道正確渲染它們。
- 清單前綴和引用區塊前綴是 IR 文字的一部分，因此分塊不會在前綴中間分割。
- 內聯樣式（粗體/斜體/刪除線/內聯程式碼/劇透）永遠不會跨分塊分割；渲染器會在每個分塊內重新開啟樣式。

如果您需要更多關於跨頻道分塊行為的資訊，請參閱[串流 + 分塊](/zh-Hant/concepts/streaming)。

## 連結政策

- **Slack：** `[label](url)` -> `<url|label>`；純網址保持原樣。解析期間會停用自動連結，以避免重複連結。
- **Telegram：** `[label](url)` -> `<a href="url">label</a>` (HTML 解析模式)。
- **Signal：** `[label](url)` -> `label (url)`，除非標籤與網址相符。

## 劇透

劇透標記 (`||spoiler||`) 僅針對 Signal 進行解析，在那裡它們對應到 SPOILER 樣式範圍。其他頻道會將其視為純文字。

## 如何新增或更新頻道格式器

1. **解析一次：** 使用共用的 `markdownToIR(...)` 輔助函式，並搭配適合頻道的選項（自動連結、標題樣式、引用區塊前綴）。
2. **渲染：** 實作一個具有 `renderMarkdownWithMarkers(...)` 和樣式標記映射（或 Signal 樣式範圍）的渲染器。
3. **分塊：** 在渲染前呼叫 `chunkMarkdownIR(...)`；渲染每個分塊。
4. **連接轉接器：** 更新頻道輸出轉接器以使用新的分塊器和渲染器。
5. **測試：** 新增或更新格式測試，如果該頻道使用分塊，則新增或更新輸出傳送測試。

## 常見陷阱

- Slack 角括號記號 (`<@U123>`, `<#C123>`, `<https://...>`) 必須保留；安全地逸出原始 HTML。
- Telegram HTML 需要轉義標籤外的文字以避免標記損壞。
- Signal 樣式範圍取決於 UTF-16 偏移量；請勿使用字碼點偏移量。
- 請保留圍籬程式碼區塊的尾隨換行符，以便結束標記位於獨自的行上。

import en from "/components/footer/en.mdx";

<en />
