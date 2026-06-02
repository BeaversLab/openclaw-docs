---
summary: "Rich output protocol for structured media, embeds, audio hints, and replies"
read_when:
  - Changing assistant output rendering in the Control UI
  - Debugging `[embed ...]`, structured media, reply, or audio presentation directives
title: "Rich output protocol"
---

助理輸出可以攜帶少量的傳遞/渲染指令：

- 用於附件傳遞的結構化 `mediaUrl` / `mediaUrls` 欄位
- 用於音訊呈現提示的 `[[audio_as_voice]]`
- 用於回覆元資料的 `[[reply_to_current]]` / `[[reply_to:<id>]]`
- 用於 Control UI 豐富渲染的 `[embed ...]`

遠端媒體附件必須是公開的 `https:` URL。純 `http:`、
loopback、link-local、private 和 internal 主機名稱會被忽略為附件
指令；伺服器端媒體擷取器仍會執行其自身的網路防護。

本地媒體附件可以使用絕對路徑、工作區相對路徑，或
家目錄相對 `~/` 路徑。在傳遞之前，它們仍需通過代理程式檔案讀取策略和
媒體類型檢查。

<Warning>
請不要針對來自工具、外掛程式、串流區塊、
瀏覽器輸出或訊息動作的附件發出文字指令。請改用結構化媒體欄位。

有效的 message-tool payload：

```json
{ "message": "Here is your image.", "mediaUrl": "/workspace/image.png" }
```

舊版的最終助理回覆文字可能仍會為了相容性而被正規化，但
這並非通用的外掛程式/工具通訊協定。

</Warning>

純 Markdown 圖片語法預設保持為文字。有意將
Markdown 圖片回覆對應至媒體附件的頻道，會在其輸出
介面卡中選擇加入；Telegram 這樣做是為了讓 `![alt](url)` 仍可成為媒體回覆。

這些指令是分開的。結構化媒體欄位和回覆/語音標籤是
傳遞元資料；`[embed ...]` 僅用於網頁豐富渲染路徑。

啟用區塊串流時，媒體必須透過結構化 payload
欄位傳送。如果相同的媒體 URL 在串流區塊中發送，並在最終
助理 payload 中重複出現，OpenClaw 會傳遞附件一次並從最終
payload 中移除重複項目。

## `[embed ...]`

`[embed ...]` 是 Control UI 唯一面向代理程式的豐富渲染語法。

自閉範例：

```text
[embed ref="cv_123" title="Status" /]
```

規則：

- `[view ...]` 不再適用於新的輸出。
- 嵌入短代碼僅在助手訊息表面渲染。
- 僅渲染基於 URL 的嵌入內容。請使用 `ref="..."` 或 `url="..."`。
- 區塊形式的行內 HTML 嵌入短代碼不會被渲染。
- 網頁 UI 會從可見文字中移除短代碼，並行內渲染嵌入內容。
- 結構化媒體不是嵌入別名，不應用於富嵌入渲染。

## 儲存的渲染形狀

正規化/儲存的助手內容區塊是結構化的 `canvas` 項目：

```json
{
  "type": "canvas",
  "preview": {
    "kind": "canvas",
    "surface": "assistant_message",
    "render": "url",
    "viewId": "cv_123",
    "url": "/__openclaw__/canvas/documents/cv_123/index.html",
    "title": "Status",
    "preferredHeight": 320
  }
}
```

儲存/渲染的富區塊直接使用此 `canvas` 形狀。`present_view` 不被識別。

## 相關

- [RPC 配接器](/zh-Hant/reference/rpc)
- [Typebox](/zh-Hant/concepts/typebox)
