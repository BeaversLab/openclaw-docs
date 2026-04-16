# Rich Output Protocol

助手输出可以携带少量的投递/渲染指令：

- `MEDIA:` 用于附件投递
- `[[audio_as_voice]]` 用于音频呈现提示
- `[[reply_to_current]]` / `[[reply_to:<id>]]` 用于回复元数据
- `[embed ...]` 用于 Control UI 富文本渲染

这些指令是独立的。`MEDIA:` 和回复/语音标签属于投递元数据；`[embed ...]` 是仅限 Web 端的富文本渲染路径。

## `[embed ...]`

`[embed ...]` 是 Control UI 中唯一的面向 Agent 的富文本渲染语法。

自闭合示例：

```text
[embed ref="cv_123" title="Status" /]
```

规则：

- `[view ...]` 不再适用于新的输出。
- Embed 短代码仅在助手消息界面中渲染。
- 仅渲染由 URL 支持的嵌入。使用 `ref="..."` 或 `url="..."`。
- 块级内联 HTML embed 短代码不会被渲染。
- Web UI 会从可见文本中剥离短代码，并将嵌入内容内联渲染。
- `MEDIA:` 不是 embed 的别名，不应用于富文本嵌入渲染。

## 存储的渲染结构

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

存储/渲染的富文本块直接使用此 `canvas` 结构。`present_view` 不被识别。
