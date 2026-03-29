---
summary: "Markdown 格式化管道，用於輸出通道"
read_when:
  - You are changing markdown formatting or chunking for outbound channels
  - You are adding a new channel formatter or style mapping
  - You are debugging formatting regressions across channels
title: "Markdown 格式化"
---

# Markdown 格式化

OpenClaw 通過將輸出 Markdown 轉換為共享中間表示 (IR) 來進行格式化，然後再渲染特定通道的輸出。IR 會保持原始文字不變，同時攜帶樣式/連結範圍，以便分塊和渲染在各通道之間保持一致。

## 目標

- **一致性：** 一次解析步驟，多個渲染器。
- **安全分塊：** 在渲染之前分割文字，使內聯格式永遠不會跨分塊斷裂。
- **通道適配：** 將相同的 IR 映射到 Slack mrkdwn、Telegram HTML 和 Signal 樣式範圍，而無需重新解析 Markdown。

## 管道

1. **解析 Markdown -> IR**
   - IR 是純文字加上樣式範圍 (粗體/斜體/刪除線/程式碼/劇透) 和連結範圍。
   - 偏移量為 UTF-16 程式碼單元，以便 Signal 樣式範圍與其 API 對齊。
   - 僅當通道選擇加入表格轉換時，才會解析表格。
2. **IR 分塊 (格式優先)**
   - 分塊發生在渲染之前的 IR 文字上。
   - 內聯格式不會跨分塊分割；範圍會按分塊切片。
3. **按通道渲染**
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

## 使用場景

- Slack、Telegram 和 Signal 輸出適配器從 IR 進行渲染。
- 其他通道 (WhatsApp、iMessage、Microsoft Teams、Discord) 仍然使用純文字或它們自己的格式規則，並在啟用時於分塊之前應用 Markdown 表格轉換。

## 表格處理

聊天客戶端對 Markdown 表格的支援並不一致。使用
`markdown.tables` 控制每個通道 (以及每個帳戶) 的轉換。

- `code`：將表格渲染為程式碼區塊 (大多數通道的預設值)。
- `bullets`：將每一列轉換為項目符號（Signal + WhatsApp 的預設值）。
- `off`：停用表格解析與轉換；原始表格文字將會直接傳遞。

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

- 分塊限制來自通道適配器/配置，並套用於 IR 文字。
- 程式碼圍欄會被保留為單一區塊並帶有結尾換行符，以便通道
  正確地呈現它們。
- 列表前綴與區塊引用前綴是 IR 文字的一部分，因此分塊
  不會從前綴中間切開。
- 內聯樣式（粗體/斜體/刪除線/內聯程式碼/劇透）絕不會
  跨分塊分割；呈現器會在每個分塊內重新開啟樣式。

如果您需要更多關於跨通道分塊行為的資訊，請參閱
[串流 + 分塊](/en/concepts/streaming)。

## 連結政策

- **Slack：** `[label](url)` -> `<url|label>`；裸 URL 保持裸露。剖析期間會停用自動連結
  以避免重複連結。
- **Telegram：** `[label](url)` -> `<a href="url">label</a>` (HTML 解析模式)。
- **Signal：** `[label](url)` -> `label (url)`，除非標籤與 URL 相符。

## 劇透

劇透標記 (`||spoiler||`) 僅針對 Signal 進行解析，在該處它們會對應到
SPOILER 樣式範圍。其他通道將其視為純文字。

## 如何新增或更新通道格式器

1. **剖析一次：** 使用共享的 `markdownToIR(...)` 輔助函式搭配適合通道的
   選項（自動連結、標題樣式、區塊引用前綴）。
2. **呈現：** 實作一個具有 `renderMarkdownWithMarkers(...)` 和
   樣式標記對應的呈現器（或 Signal 樣式範圍）。
3. **分塊：** 在呈現之前呼叫 `chunkMarkdownIR(...)`；呈現每個分塊。
4. **連接適配器：** 更新通道輸出適配器以使用新的分塊器
   和呈現器。
5. **測試：** 新增或更新格式測試，如果通道
   使用分塊，請新增輸出傳遞測試。

## 常見陷阱

- Slack 角括號記號 (`<@U123>`, `<#C123>`, `<https://...>`) 必須
  被保留；安全地跳脫原始 HTML。
- Telegram HTML 需要跳脫標籤外部的文字以避免標記損壞。
- Signal 樣式範圍取決於 UTF-16 偏移量；請勿使用程式碼點偏移量。
- 保留圍欄程式碼區塊的尾部換行符，使結束標記位於
  自己的一行上。
