---
summary: "用于嵌入、媒体、音频提示和回复的富输出短代码协议"
read_when:
  - Changing assistant output rendering in the Control UI
  - Debugging `[embed ...]`, `MEDIA:`, reply, or audio presentation directives
title: "富输出协议"
---

# 富输出协议

助手输出可以携带少量传递/渲染指令：

- `MEDIA:` 用于附件传递
- `[[audio_as_voice]]` 用于音频呈现提示
- `[[reply_to_current]]` / `[[reply_to:<id>]]` 用于回复元数据
- `[embed ...]` 用于 Control UI 富渲染

这些指令是分开的。`MEDIA:` 和回复/语音标签仍属于传递元数据；`[embed ...]` 是仅 Web 的富渲染路径。

## `[embed ...]`

`[embed ...]` 是 Control UI 唯一的面向代理的富渲染语法。

自闭合示例：

```text
[embed ref="cv_123" title="Status" /]
```

规则：

- `[view ...]` 对于新的输出不再有效。
- Embed 短代码仅在助手消息界面中渲染。
- 仅渲染基于 URL 的嵌入。使用 `ref="..."` 或 `url="..."`。
- 块形式的内联 HTML 嵌入短代码不会被渲染。
- Web UI 会从可见文本中去除短代码，并内联渲染嵌入内容。
- `MEDIA:` 不是嵌入别名，不应用于富嵌入渲染。

## 存储的渲染形状

标准化/存储的助手内容块是一个结构化的 `canvas` 项：

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

存储/渲染的富块直接使用此 `canvas` 形状。`present_view` 无法被识别。
