---
summary: "輸出通道的 Markdown 格式化管道"
read_when:
  - You are changing markdown formatting or chunking for outbound channels
  - You are adding a new channel formatter or style mapping
  - You are debugging formatting regressions across channels
title: "Markdown 格式化"
---

# Markdown 格式化

OpenClaw 透過將輸出的 Markdown 轉換為共享的中間表示法 (IR)，然後再針對特定通道進行渲染，來格式化輸出的 Markdown。IR 會保留原始文字不變，同時攜帶樣式/連結範圍，以便分塊 和渲染在各通道之間保持一致。

## 目標

- **一致性：** 一次解析步驟，多個渲染器。
- **安全分塊：** 在渲染之前分割文字，確保內聯格式絕不會跨分塊中斷。
- **通道適配：** 將相同的 IR 對應到 Slack mrkdwn、Telegram HTML 和 Signal 樣式範圍，而無需重新解析 Markdown。

## 管道

1. **解析 Markdown -> IR**
   - IR 是純文字加上樣式範圍 (粗體/斜體/刪除線/程式碼/劇透) 和連結範圍。
   - 位移採用 UTF-16 程式碼單元，以便 Signal 樣式範圍與其 API 對齊。
   - 僅當通道選擇啟用表格轉換時，才會解析表格。
2. **分塊 IR (格式優先)**
   - 分塊發生在渲染之前的 IR 文字上。
   - 內聯格式不會跨分塊分割；範圍會根據每個分塊進行切片。
3. **依通道渲染**
   - **Slack：** mrkdwn 標記 (粗體/斜體/刪除線/程式碼)，連結為 `<url|label>`。
   - **Telegram：** HTML 標籤 (`<b>`、`<i>`、`<s>`、`<code>`、`<pre><code>`、`<a href>`)。
   - **Signal：** 純文字 + `text-style` 範圍；當標籤不同時，連結會變成 `label (url)`。

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

## 使用情境

- Slack、Telegram 和 Signal 輸出適配器從 IR 進行渲染。
- 其他通道 (WhatsApp、iMessage、MS Teams、Discord) 仍使用純文字或其自己的格式規則，並在啟用時於分塊之前套用 Markdown 表格轉換。

## 表格處理

Markdown 表格在聊天客戶端之間的支援並不一致。使用 `markdown.tables` 來控制每個通道 (以及每個帳戶) 的轉換。

- `code`：將表格渲染為程式碼區塊 (大多數通道的預設值)。
- `bullets`：將每一列轉換為項目符號（Signal + WhatsApp 的預設值）。
- `off`：停用表格解析與轉換；原始表格文字將直接通過。

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

- 分塊限制來自頻道介面卡/配置，並應用於 IR 文字。
- 程式碼區塊會作為單一區塊保留並帶有尾隨換行符，以便頻道正確呈現。
- 清單前綴和引用塊前綴是 IR 文字的一部分，因此分塊不會在前綴中間分割。
- 行內樣式（粗體/斜體/刪除線/行內程式碼/劇透）絕不會跨分塊分割；呈現器會在每個分塊內重新開啟樣式。

如果您需要更多關於跨頻道分塊行為的資訊，請參閱[串流 + 分塊](/zh-Hant/concepts/streaming)。

## 連結政策

- **Slack：** `[label](url)` -> `<url|label>`；裸露的 URL 保持原樣。解析期間停用自動連結以避免重複連結。
- **Telegram：** `[label](url)` -> `<a href="url">label</a>` (HTML 解析模式)。
- **Signal：** `[label](url)` -> `label (url)`，除非標籤符合 URL。

## 劇透

劇透標記（`||spoiler||`）僅針對 Signal 解析，其中它們對應到 SPOILER 樣式範圍。其他頻道將其視為純文字。

## 如何新增或更新頻道格式化器

1. **解析一次：** 使用共用的 `markdownToIR(...)` 輔助程式搭配適合頻道的選項（自動連結、標題樣式、引用塊前綴）。
2. **呈現：** 實作一個帶有 `renderMarkdownWithMarkers(...)` 的呈現器和樣式標記對應（或 Signal 樣式範圍）。
3. **分塊：** 在呈現之前呼叫 `chunkMarkdownIR(...)`；呈現每個分塊。
4. **連線介面卡：** 更新頻道輸出介面卡以使用新的分塊器和呈現器。
5. **測試：** 新增或更新格式測試和輸出傳遞測試（如果頻道使用分塊）。

## 常見陷阱

- Slack 角括號標記（`<@U123>`、`<#C123>`、`<https://...>`）必須保留；安全地跳脫原始 HTML。
- Telegram HTML 需要跳脫標籤外的文字，以避免標記損壞。
- Signal 樣式範圍依賴 UTF-16 偏移量；請勿使用程式碼點偏移量。
- Preserve trailing newlines for fenced code blocks so closing markers land on
  their own line.

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
