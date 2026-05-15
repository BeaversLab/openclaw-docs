---
summary: "用於嵌入、媒體、音訊提示和回覆的富輸出短代碼協議"
read_when:
  - Changing assistant output rendering in the Control UI
  - Debugging `[embed ...]`, `MEDIA:`, reply, or audio presentation directives
title: "Rich output protocol"
---

助理輸出可以攜帶少量的傳遞/渲染指令：

- `MEDIA:` 用於附件傳遞
- `[[audio_as_voice]]` 用於音訊呈現提示
- `[[reply_to_current]]` / `[[reply_to:<id>]]` 用於回覆中繼資料
- `[embed ...]` 用於 Control UI 的豐富渲染

遠端 `MEDIA:` 附件必須是公開的 `https:` URL。純文字 `http:`、
loopback、link-local、private 和 internal 主機名稱會被忽略為附件
指令；伺服器端媒體擷取器仍然會執行自己的網路防護。

本機 `MEDIA:` 附件可以使用絕對路徑、相對於工作區的路徑，或
相對於家目錄的 `~/` 路徑。在傳遞之前，它們仍需通過代理程式檔案讀取策略和
媒體類型檢查。

純 Markdown 影像語法預設保持為文字。那些有意將
Markdown 影像回覆對應到媒體附件的管道會在其輸出
配接器中選擇加入；Telegram 這樣做是為了讓 `![alt](url)` 仍能成為媒體回覆。

這些指令是分開的。`MEDIA:` 和 reply/voice 標籤保持為傳遞元數據；`[embed ...]` 是僅限網頁的豐富渲染路徑。
受信任的工具結果媒體在傳遞前使用相同的 `MEDIA:` / `[[audio_as_voice]]` 解析器，因此文字工具輸出仍可將音訊附件標記為語音訊息。

當啟用區塊串流時，`MEDIA:` 在一個回合中保持為單次傳遞元數據。
如果相同的媒體 URL 在串流區塊中發送並在最終的助手承載中重複出現，OpenClaw 將傳遞該附件一次，並從最終承載中移除重複項。

## `[embed ...]`

`[embed ...]` 是 Control UI 唯一面向代理程式的豐富渲染語法。

自閉範例：

```text
[embed ref="cv_123" title="Status" /]
```

規則：

- `[view ...]` 對於新輸出不再有效。
- Embed 簡碼僅在助手訊息介面上渲染。
- 僅渲染支援 URL 的嵌入。請使用 `ref="..."` 或 `url="..."`。
- 區塊形式的內聯 HTML 嵌入簡碼不會被渲染。
- 網頁 UI 會從可見文字中移除簡碼，並內聯渲染嵌入內容。
- `MEDIA:` 不是嵌入別名，不應用於豐富嵌入渲染。

## Stored rendering shape

正規化/儲存的助手內容區塊是一個結構化的 `canvas` 項目：

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

儲存/渲染的豐富區塊直接使用此 `canvas` 形狀。`present_view` 不被識別。

## 相關

- [RPC 配接器](/zh-Hant/reference/rpc)
- [Typebox](/zh-Hant/concepts/typebox)
