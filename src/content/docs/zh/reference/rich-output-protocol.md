---
summary: "Rich output protocol for structured media, embeds, audio hints, and replies"
read_when:
  - Changing assistant output rendering in the Control UI
  - Debugging `[embed ...]`, structured media, reply, or audio presentation directives
title: "Rich output protocol"
---

助手输出可以携带一小组传递/渲染指令：

- 用于附件交付的 `mediaUrl` / `mediaUrls` 结构化字段
- 用于音频提示的 `[[audio_as_voice]]`
- 用于回复元数据的 `[[reply_to_current]]` / `[[reply_to:<id>]]`
- 用于 Control UI 富渲染的 `[embed ...]`

远程媒体附件必须是公共 `https:` URL。纯 `http:`、
loopback、link-local、private 和 internal 主机名作为附件
指令会被忽略；服务端媒体获取器仍会强制执行其自己的网络防护。

本地媒体附件可以使用绝对路径、工作区相对路径或
主目录相对 `~/` 路径。在交付之前，它们仍需通过代理文件读取策略和
媒体类型检查。

<Warning>
请勿为来自工具、插件、流式块、
浏览器输出或消息操作的附件发出文本命令。请改用结构化媒体字段。

有效的消息工具负载（payload）：

```json
{ "message": "Here is your image.", "mediaUrl": "/workspace/image.png" }
```

传统的最终助手回复文本仍可能被规范化以保持兼容性，但这
并非通用的插件/工具协议。

</Warning>

默认情况下，纯 Markdown 图片语法保持为文本。有意将
Markdown 图片回复映射为媒体附件的渠道需在其出站
适配器中选择加入；Telegram 这样做是为了使 `![alt](url)` 仍能成为媒体回复。

这些指令是独立的。结构化媒体字段和回复/语音标签是
交付元数据；`[embed ...]` 是仅限 Web 的富渲染路径。

启用分块流式传输时，媒体必须携带在结构化负载
字段上。如果同一媒体 URL 在流式块中发送并在
最终助手负载中重复出现，OpenClaw 将只投递一次附件，并从最终负载中
删除重复项。

## `[embed ...]`

`[embed ...]` 是 Control UI 唯一面向代理的富渲染语法。

自闭合示例：

```text
[embed ref="cv_123" title="Status" /]
```

规则：

- `[view ...]` 对于新的输出不再有效。
- 嵌入短代码仅在助手消息表面渲染。
- 仅渲染基于 URL 的嵌入。请使用 `ref="..."` 或 `url="..."`。
- 块形式的内联 HTML 嵌入短代码不会被渲染。
- Web UI 会从可见文本中移除短代码，并以内联方式渲染嵌入内容。
- 结构化媒体不是嵌入别名，不应用于富媒体嵌入渲染。

## 存储的渲染形状

规范化/存储的助手内容块是一个结构化的 `canvas` 项：

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

存储/渲染的富模块直接使用此 `canvas` 形状。`present_view` 不被识别。

## 相关

- [RPC 适配器](/zh/reference/rpc)
- [Typebox](/zh/concepts/typebox)
