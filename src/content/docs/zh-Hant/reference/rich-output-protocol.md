---
summary: "用於嵌入、媒體、音訊提示和回覆的 Rich output shortcode 協議"
read_when:
  - Changing assistant output rendering in the Control UI
  - Debugging `[embed ...]`, `MEDIA:`, reply, or audio presentation directives
title: "Rich output 協議"
---

助理輸出可以攜帶少量的傳遞/渲染指令：

- `MEDIA:` 用於附件傳遞
- `[[audio_as_voice]]` 用於音訊呈現提示
- `[[reply_to_current]]` / `[[reply_to:<id>]]` 用於回覆元資料
- `[embed ...]` 用於 Control UI 的 Rich 渲染

遠端 `MEDIA:` 附件必須是公開的 `https:` URL。純文字 `http:`、loopback、link-local、private 和 internal 主機名稱會被忽略，視為附件指令；伺服器端的媒體擷取器仍會執行自身的網路防護。

本機 `MEDIA:` 附件可以使用絕對路徑、工作區相對路徑，或使用者家目錄相對路徑 `~/`。在傳遞之前，它們仍會通過代理程式的檔案讀取政策和媒體類型檢查。

<Warning>
`MEDIA:` 僅被解析為純文字。如果將該指令包覆在 Markdown 格式（粗體、行內程式碼、圍欄程式碼）中，會導致解析器無法識別它，且該附件會在傳遞時被靜默捨棄。

有效：

```text
MEDIA:/workspace/image.png
```

無效（被解析為散文，不會傳遞附件）：

```text
**MEDIA:/workspace/image.png**
`MEDIA:/workspace/image.png`
Here is your image: MEDIA:/workspace/image.png
```

請將 `MEDIA:` 保持在獨立的一行，以純文字呈現，且周圍沒有任何格式。

</Warning>

標準 Markdown 圖片語法預設保持為文字。有意將 Markdown 圖片回應對應到媒體附件的頻道，會在其輸出配接器中選擇加入；Telegram 會這樣做，以便 `![alt](url)` 仍能成為媒體回覆。

這些指令是分開的。`MEDIA:` 和 reply/voice 標籤仍是傳遞元資料；`[embed ...]` 則是僅限網頁的 Rich 渲染路徑。
受信任的工具結果媒體在傳遞前會使用相同的 `MEDIA:` / `[[audio_as_voice]]` 解析器，因此文字工具輸出仍可將音訊附件標記為語音訊息。

啟用區塊串流時，`MEDIA:` 仍為單次傳遞的元資料。若相同的媒體 URL 在串流區塊中發送，並在最終的助手酬載中重複出現，OpenClaw 將只傳遞一次附件，並從最終酬載中移除重複項。

## `[embed ...]`

`[embed ...]` 是 Control UI 中唯一面向代理的富渲染語法。

自閉範例：

```text
[embed ref="cv_123" title="Status" /]
```

規則：

- `[view ...]` 對新的輸出不再有效。
- 嵌入短代碼僅在助手訊息表面渲染。
- 僅渲染基於 URL 的嵌入。請使用 `ref="..."` 或 `url="..."`。
- 區塊形式的行內 HTML 嵌入短代碼不會被渲染。
- 網頁 UI 會從可見文字中移除短代碼，並行內渲染嵌入內容。
- `MEDIA:` 不是嵌入別名，不應用於富嵌入渲染。

## 儲存的渲染形狀

標準化/儲存的助手內容區塊是一個結構化的 `canvas` 項目：

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

- [RPC 介接卡](/zh-Hant/reference/rpc)
- [Typebox](/zh-Hant/concepts/typebox)
