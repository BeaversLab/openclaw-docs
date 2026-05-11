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

純 Markdown 圖片語法預設保持為文字。有意將 Markdown 圖片回應映射到媒體附件的頻道，會在其出站介面器中加入；Telegram 會這樣做，以便 `![alt](url)` 仍然可以成為媒體回應。

這些指令是分開的。`MEDIA:` 和 reply/voice 標籤保持為傳遞中繼資料；`[embed ...]` 則是僅限網頁的豐富渲染路徑。
受信任的工具結果媒體在傳遞之前會使用相同的 `MEDIA:` / `[[audio_as_voice]]` 解析器，因此文字工具輸出仍然可以將音訊附件標記為語音備忘錄。

當啟用區塊串流時，`MEDIA:` 仍然是一次單次傳遞的中繼資料。
如果相同的媒體 URL 在串流區塊中發送，並在最終的助理負載中重複，OpenClaw 會傳遞附件一次，並從最終負載中移除重複的項目。

## `[embed ...]`

`[embed ...]` 是 Control UI 唯一面向助理的豐富渲染語法。

自閉範例：

```text
[embed ref="cv_123" title="Status" /]
```

規則：

- `[view ...]` 對於新的輸出不再有效。
- 嵌入簡碼僅在助理訊息介面上渲染。
- 僅渲染支援 URL 的嵌入。請使用 `ref="..."` 或 `url="..."`。
- 區塊形式的行內 HTML 嵌入簡碼不會被渲染。
- Web UI 會從可見文字中移除簡碼，並行內渲染嵌入內容。
- `MEDIA:` 不是嵌入別名，不應用於豐富嵌入渲染。

## 存儲的渲染形狀

規範化/存儲的助手內容區塊是一個結構化的 `canvas` 項目：

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

存儲/渲染的豐富區塊直接使用這種 `canvas` 形狀。無法識別 `present_view`。

## 相關

- [RPC 配接器](/zh-Hant/reference/rpc)
- [Typebox](/zh-Hant/concepts/typebox)
