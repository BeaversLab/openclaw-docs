---
summary: "用于发送、网关和代理回复的图像与媒体处理规则"
read_when:
  - Modifying media pipeline or attachments
title: "图像与媒体支持"
---

# 图像与媒体支持 — 2025-12-05

WhatsApp 渠道通过 **Baileys Web** 运行。本文档记录了目前针对发送、网关和代理回复的媒体处理规则。

## 目标

- 通过 `openclaw message send --media` 发送带有可选字幕的媒体。
- 允许来自网页收件箱的自动回复包含媒体以及文本。
- 保持每种类型的限制合理且可预测。

## CLI 界面

- `openclaw message send --media <path-or-url> [--message <caption>]`
  - `--media` 可选；对于仅发送媒体的情况，字幕可以为空。
  - `--dry-run` 打印解析后的有效载荷；`--json` 发出 `{ channel, to, messageId, mediaUrl, caption }`。

## WhatsApp Web 渠道行为

- 输入：本地文件路径 **或** HTTP(S) URL。
- 流程：加载到 Buffer 中，检测媒体类型，并构建正确的有效载荷：
  - **图片：** 调整大小并重新压缩为 JPEG（最大边长 2048px），目标是 `agents.defaults.mediaMaxMb`（默认 5 MB），上限为 6 MB。
  - **音频/语音/视频：** 直通最大 16 MB；音频作为语音消息发送（`ptt: true`）。
  - **文档：** 其他任何内容，最大 100 MB，并在可用时保留文件名。
- WhatsApp GIF 风格播放：发送带有 `gifPlayback: true`（CLI：`--gif-playback`）的 MP4，以便移动客户端内联循环播放。
- MIME 检测优先使用魔数，然后是头部，最后是文件扩展名。
- 字幕来自 `--message` 或 `reply.text`；允许使用空字幕。
- 日志记录：非详细模式显示 `↩️`/`✅`；详细模式包含大小和源路径/URL。

## 自动回复管道

- `getReplyFromConfig` 返回 `{ text?, mediaUrl?, mediaUrls? }`。
- 当存在媒体时，Web 发送方使用与 `openclaw message send` 相同的管道来解析本地路径或 URL。
- 如果提供了多个媒体条目，将按顺序发送。

## 入站媒体转命令 (Pi)

- 当入站网页消息包含媒体时，OpenClaw 会将其下载到临时文件并公开模板变量：
  - `{{MediaUrl}}` 入站媒体的伪 URL。
  - `{{MediaPath}}` 运行命令之前写入的本地临时路径。
- 当启用每会话 Docker 沙箱时，入站媒体会被复制到沙箱工作区中，并且 `MediaPath`/`MediaUrl` 会被重写为类似 `media/inbound/<filename>` 的相对路径。
- 媒体理解（如果通过 `tools.media.*` 或共享的 `tools.media.models` 配置）在模板化之前运行，并且可以将 `[Image]`、`[Audio]` 和 `[Video]` 块插入到 `Body` 中。
  - 音频设置 `{{Transcript}}` 并使用转录文本进行命令解析，因此斜杠命令仍然有效。
  - 视频和图像描述保留任何标题文本用于命令解析。
- 默认情况下，仅处理第一个匹配的图像/音频/视频附件；设置 `tools.media.<cap>.attachments` 以处理多个附件。

## 限制与错误

**出站发送上限（WhatsApp web 发送）**

- 图像：重新压缩后的上限约为 6 MB。
- 音频/语音/视频：16 MB 上限；文档：100 MB 上限。
- 超大或无法读取的媒体 → 日志中显示明确错误，并且跳过回复。

**媒体理解上限（转录/描述）**

- 图像默认值：10 MB（`tools.media.image.maxBytes`）。
- 音频默认值：20 MB（`tools.media.audio.maxBytes`）。
- 视频默认值：50 MB（`tools.media.video.maxBytes`）。
- 超大媒体跳过理解，但回复仍会通过原始正文发出。

## 测试注意事项

- 覆盖图像/音频/文档情况的发送 + 回复流程。
- 验证图像的重新压缩（大小限制）和音频的语音备注标记。
- 确保多媒体回复作为顺序发送分发。

import zh from '/components/footer/zh.mdx';

<zh />
