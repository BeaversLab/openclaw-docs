---
summary: "用于嵌入、媒体、音频提示和回复的富输出短代码协议"
read_when:
  - Changing assistant output rendering in the Control UI
  - Debugging `[embed ...]`, `MEDIA:`, reply, or audio presentation directives
title: "富输出协议"
---

助手输出可以携带一小组传递/渲染指令：

- `MEDIA:` 用于附件投递
- `[[audio_as_voice]]` 用于音频展示提示
- `[[reply_to_current]]` / `[[reply_to:<id>]]` 用于回复元数据
- `[embed ...]` 用于控制 UI 富渲染

远程 `MEDIA:` 附件必须是公共 `https:` URL。纯 `http:`、
loopback、link-local、private 和 internal 主机名会被作为附件
指令忽略；服务端媒体获取器仍会强制执行它们自己的网络防护。

本地 `MEDIA:` 附件可以使用绝对路径、工作区相对路径或
home 相对 `~/` 路径。它们在投递前仍需通过代理文件读取策略和
媒体类型检查。

<Warning>
`MEDIA:` 仅作为纯文本解析。将指令包含在 Markdown
格式（加粗、行内代码、围栏代码块）中会阻止解析器
识别它，附件将被静默地从投递中丢弃。

有效：

```text
MEDIA:/workspace/image.png
```

无效（被解析为散文，不投递附件）：

```text
**MEDIA:/workspace/image.png**
`MEDIA:/workspace/image.png`
Here is your image: MEDIA:/workspace/image.png
```

请将 `MEDIA:` 单独放在一行，作为纯文本，不要包含周围的格式。

</Warning>

普通 Markdown 图像语法默认保持为文本。有意将
Markdown 图像回复映射到媒体附件的频道需在其出站
适配器中选择加入；Telegram 这样做是为了让 `![alt](url)` 仍能成为媒体回复。

这些指令是独立的。`MEDIA:` 和 reply/voice 标签保留为投递元数据；`[embed ...]` 是仅限 Web 的富渲染路径。
受信任的工具结果媒体在投递前使用相同的 `MEDIA:` / `[[audio_as_voice]]` 解析器，因此文本工具输出仍可将音频附件标记为语音笔记。

当启用分块流式传输时，`MEDIA:`OpenClaw 仍为单次传递的元数据，用于一个轮次。如果相同的媒体 URL 在流块中发送，并在最终的助手负载中重复出现，OpenClaw 将仅传递一次附件，并从最终负载中删除重复项。

## `[embed ...]`

`[embed ...]` 是 Control UI 中唯一面向代理的富渲染语法。

自闭合示例：

```text
[embed ref="cv_123" title="Status" /]
```

规则：

- `[view ...]` 对于新输出不再有效。
- 嵌入短代码仅在助手消息表面渲染。
- 仅支持基于 URL 的嵌入。请使用 `ref="..."` 或 `url="..."`。
- 块形式的内联 HTML 嵌入短代码不会被渲染。
- Web UI 会从可见文本中移除短代码，并以内联方式渲染嵌入内容。
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

已存储/已渲染的富块直接使用此 `canvas` 形状。`present_view` 不被识别。

## 相关

- [RPC 适配器](RPC/en/reference/rpc)
- [Typebox](/zh/concepts/typebox)
