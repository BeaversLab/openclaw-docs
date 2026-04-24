---
summary: "用於嵌入、媒體、音訊提示和回覆的富輸出短代碼協議"
read_when:
  - Changing assistant output rendering in the Control UI
  - Debugging `[embed ...]`, `MEDIA:`, reply, or audio presentation directives
title: "富輸出協議"
---

# 富輸出協議

助理輸出可以攜帶一組少量的傳遞/渲染指令：

- `MEDIA:` 用於附件傳遞
- `[[audio_as_voice]]` 用於音訊呈現提示
- `[[reply_to_current]]` / `[[reply_to:<id>]]` 用於回覆元數據
- `[embed ...]` 用於控制 UI 的富渲染

這些指令是分開的。`MEDIA:` 和回覆/語音標籤保持為傳遞元數據；`[embed ...]` 是僅限網頁的富渲染路徑。

## `[embed ...]`

`[embed ...]` 是控制 UI 唯一面向代理的富渲染語法。

自閉範例：

```text
[embed ref="cv_123" title="Status" /]
```

規則：

- `[view ...]` 對於新輸出不再有效。
- 嵌入短代碼僅在助理訊息表面渲染。
- 僅渲染基於 URL 的嵌入。請使用 `ref="..."` 或 `url="..."`。
- 區塊形式的行內 HTML 嵌入短代碼不會被渲染。
- 網頁 UI 會從可見文字中移除短代碼，並行內渲染嵌入。
- `MEDIA:` 不是嵌入別名，不應用於富嵌入渲染。

## 儲存的渲染形狀

正規化/儲存的助理內容區塊是一個結構化的 `canvas` 項目：

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
