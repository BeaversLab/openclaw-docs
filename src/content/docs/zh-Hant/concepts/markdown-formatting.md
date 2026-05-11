---
summary: "Markdown 格式化管道，用於輸出通道"
read_when:
  - You are changing markdown formatting or chunking for outbound channels
  - You are adding a new channel formatter or style mapping
  - You are debugging formatting regressions across channels
title: "Markdown 格式化"
---

OpenClaw 透過將輸出 Markdown 轉換為共用的中介表示法 (IR)，然後再根據特定通道進行渲染，從而格式化輸出的 Markdown。IR 會保持原始文字不變，同時攜帶樣式/連結範圍，以便在各通道之間保持一致的分塊和渲染。

## 目標

- **一致性：** 一次解析步驟，多種渲染器。
- **安全分塊：** 在渲染之前分割文字，確保行內格式不會
  被分塊中斷。
- **通道適配：** 將相同的 IR 對應到 Slack mrkdwn、Telegram HTML 和 Signal
  樣式範圍，而無需重新解析 Markdown。

## 流程

1. **解析 Markdown -> IR**
   - IR 是純文字加上樣式範圍（粗體/斜體/刪除線/代碼/劇透）和連結範圍。
   - 偏移量是 UTF-16 代碼單元，以便 Signal 樣式範圍與其 API 對齊。
   - 僅當通道選擇加入表格轉換時，才會解析表格。
2. **對 IR 進行分塊（優先格式）**
   - 分塊發生在渲染前的 IR 文字上。
   - 行內格式不會被分塊拆分；範圍會根據每個分塊進行切片。
3. **根據通道渲染**
   - **Slack：** mrkdwn 標記 (粗體/斜體/刪除線/代碼)，連結以 `<url|label>` 顯示。
   - **Telegram：** HTML 標籤 (`<b>`、`<i>`、`<s>`、`<code>`、`<pre><code>`、`<a href>`)。
   - **Signal：** 純文字 + `text-style` 範圍；當標籤不同時，連結會變成 `label (url)`。

## IR 範例

輸入 Markdown：

```markdown
Hello **world** — see [docs](https://docs.openclaw.ai).
```

IR（示意圖）：

```json
{
  "text": "Hello world — see docs.",
  "styles": [{ "start": 6, "end": 11, "style": "bold" }],
  "links": [{ "start": 19, "end": 23, "href": "https://docs.openclaw.ai" }]
}
```

## 使用場景

- Slack、Telegram 和 Signal 的輸出適配器從 IR 進行渲染。
- 其他通道（WhatsApp、iMessage、Microsoft Teams、Discord）仍使用純文字或
  其自己的格式規則，並在啟用時於分塊前套用 Markdown 表格轉換。

## 表格處理

Markdown 表格在各聊天客戶端中並非始終獲得支援。使用
`markdown.tables` 來控制每個通道（以及每個帳號）的轉換。

- `code`：將表格渲染為代碼塊（大多數通道的預設值）。
- `bullets`：將每一行轉換為項目符號點（Signal + WhatsApp 的預設值）。
- `off`：停用表格解析與轉換；原始表格文字會直接通過。

配置鍵 (Config keys)：

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

- 分塊限制來自通道適配器/配置，並套用於 IR 文字。
- 程式碼圍欄會保留為單一區塊並帶有結尾換行符，以便通道正確渲染它們。
- 列表前綴和引用區塊前綴是 IR 文字的一部分，因此分塊不會從中間切斷前綴。
- 內聯樣式 (粗體/斜體/刪除線/內聯程式碼/劇透) 永遠不會跨越分塊拆分；渲染器會在每個分塊內重新開啟樣式。

如果您需要關於跨通道分塊行為的更多資訊，請參閱
[串流 + 分塊](/zh-Hant/concepts/streaming)。

## 連結政策

- **Slack：** `[label](url)` -> `<url|label>`；裸 URL 保持裸露。解析期間停用自動連結以避免重複連結。
- **Telegram：** `[label](url)` -> `<a href="url">label</a>` (HTML 解析模式)。
- **Signal：** `[label](url)` -> `label (url)`，除非標籤符合 URL。

## 劇透

劇透標記 (`||spoiler||`) 僅針對 Signal 解析，它們在那裡對應到
SPOILER 樣式範圍。其他通道將其視為純文字。

## 如何新增或更新通道格式化工具

1. **解析一次：** 使用共享的 `markdownToIR(...)` 輔助函式搭配適合通道的
   選項 (自動連結、標題樣式、引用區塊前綴)。
2. **渲染：** 使用 `renderMarkdownWithMarkers(...)` 實作渲染器以及
   樣式標記對應表 (或 Signal 樣式範圍)。
3. **分塊：** 在渲染前呼叫 `chunkMarkdownIR(...)`；渲染每個分塊。
4. **連接適配器：** 更新通道輸出適配器以使用新的分塊器
   和渲染器。
5. **測試：** 新增或更新格式測試，如果通道使用分塊，還需新增輸出傳遞測試。

## 常見陷阱

- Slack 角括號記號 (`<@U123>`, `<#C123>`, `<https://...>`) 必須
  保留；安全地跳脫原始 HTML。
- Telegram HTML 需要跳脫標籤外的文字以避免標記損壞。
- Signal 樣式範圍取決於 UTF-16 偏移量；請勿使用碼點 偏移量。
- 保留程式碼圍欄的結尾換行符，以便結束標記位於
  其獨自的行上。

## 相關

- [串流和分塊](/zh-Hant/concepts/streaming)
- [系統提示](/zh-Hant/concepts/system-prompt)
