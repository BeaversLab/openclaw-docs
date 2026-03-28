---
summary: "外頻道的 Markdown 格式化管道"
read_when:
  - You are changing markdown formatting or chunking for outbound channels
  - You are adding a new channel formatter or style mapping
  - You are debugging formatting regressions across channels
title: "Markdown 格式化"
---

# Markdown 格式化

OpenClaw 通過將輸出 Markdown 轉換為共享的中間表示（IR），然後再渲染特定頻道的輸出，從而對其進行格式化。IR 會保留原始文本不變，同時攜帶樣式/連結範圍，以便在各頻道之間保持分塊和渲染的一致性。

## 目標

- **一致性：** 一個解析步驟，多個渲染器。
- **安全分塊：** 在渲染前分割文本，以確保內聯格式從不會在分塊之間中斷。
- **頻道適配：** 將相同的 IR 映射到 Slack mrkdwn、Telegram HTML 和 Signal 樣式範圍，而無需重新解析 Markdown。

## 管道

1. **解析 Markdown -> IR**
   - IR 是純文本加上樣式範圍（粗體/斜體/刪除線/程式碼/劇透）和連結範圍。
   - 位移是 UTF-16 代碼單元，因此 Signal 樣式範圍與其 API 對齊。
   - 只有在管道選擇啟用表格轉換時，才會解析表格。
2. **區塊 IR（格式優先）**
   - 區塊劃分在渲染之前的 IR 文字上進行。
   - 內聯格式不會跨區塊分割；範圍會根據每個區塊進行切片。
3. **依管道渲染**
   - **Slack：** mrkdwn 標記（粗體/斜體/刪除線/程式碼），連結顯示為 `<url|label>`。
   - **Telegram：** HTML 標籤（`<b>`、`<i>`、`<s>`、`<code>`、`<pre><code>`、`<a href>`）。
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

## 使用位置

- Slack、Telegram 和 Signal 的輸出適配器會從 IR 進行渲染。
- 其他頻道（WhatsApp、iMessage、Microsoft Teams、Discord）仍然使用純文字或
  其自己的格式規則，並在啟用時於分塊前套用 Markdown 表格轉換。

## 表格處理

Markdown 表格在聊天客戶端中的支援並不一致。請使用
`markdown.tables` 來控制每個頻道（以及每個帳號）的轉換。

- `code`：將表格渲染為程式碼區塊（大多數頻道的預設值）。
- `bullets`：將每一列轉換為項目符號（Signal + WhatsApp 的預設值）。
- `off`：停用表格解析和轉換；原始表格文字將會直接通過。

設定鍵：

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

- 分塊限制來自頻道適配器/設定，並套用於 IR 文字。
- 程式碼區塊會保留為單一區塊，並帶有結尾的換行符，以便頻道正確渲染它們。
- 清單前綴和區塊引用前綴是 IR 文字的一部分，因此分塊不會在前綴中間分割。
- 行內樣式（粗體/斜體/刪除線/行內程式碼/劇透）絕不會跨區塊分割；渲染器會在每個區塊內重新開啟樣式。

如果您需要更多關於跨頻道分塊行為的資訊，請參閱
[串流 + 分塊](/zh-Hant/concepts/streaming)。

## 連結政策

- **Slack：** `[label](url)` -> `<url|label>`；純 URL 保持原樣。在解析期間會停用自動連結功能，以避免重複連結。
- **Telegram：** `[label](url)` -> `<a href="url">label</a>`（HTML 解析模式）。
- **Signal：** `[label](url)` -> `label (url)`，除非標籤與 URL 相符。

## 劇透

劇透標記 (`||spoiler||`) 僅針對 Signal 解析，它們對應到
SPOILER 樣式範圍。其他頻道將其視為純文字。

## 如何新增或更新頻道格式化器

1. **解析一次：** 使用共享的 `markdownToIR(...)` 輔助函式搭配適合頻道的
   選項 (autolink、heading style、blockquote prefix)。
2. **渲染：** 使用 `renderMarkdownWithMarkers(...)` 實作一個渲染器，並搭配
   樣式標記對應表 (或 Signal 樣式範圍)。
3. **分塊：** 在渲染前呼叫 `chunkMarkdownIR(...)`；渲染每個塊。
4. **接接器：** 更新頻道輸出接接器以使用新的分塊器
   和渲染器。
5. **測試：** 新增或更新格式測試，如果該
   頻道使用分塊，則新增或更新輸出傳遞測試。

## 常見陷阱

- Slack 角括號記號 (`<@U123>`, `<#C123>`, `<https://...>`) 必須被保留；安全地轉義原始 HTML。
- Telegram HTML 需要轉義標籤外的文字以避免標記毀損。
- Signal 樣式範圍取決於 UTF-16 偏移量；請勿使用字碼點偏移量。
- 為圍欄程式碼區塊保留結尾換行符，使結束記號位於獨自的一行。
