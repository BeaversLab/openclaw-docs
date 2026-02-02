---
title: "Image and Media Support"
summary: "发送、gateway 与 agent 回复的图片/媒体处理规则"
read_when:
  - 你在修改媒体管线或附件处理
---
# 图片和多媒体支持 — 2025-12-05

WhatsApp 频道通过 **Baileys Web** 运行。本文记录当前的发送、gateway 与 agent 回复的媒体处理规则。

## 目标
- 使用 `openclaw message send --media` 发送媒体并可选标题。
- 允许 Web 收件箱自动回复携带媒体 + 文本。
- 保持各类型限制清晰且可预测。

## CLI Surface
- `openclaw message send --media <path-or-url> [--message <caption>]`
  - `--media` 可选；若只发媒体可省略 caption。
  - `--dry-run` 输出解析后的 payload；`--json` 输出 `{ channel, to, messageId, mediaUrl, caption }`。

## WhatsApp Web 频道行为
- 输入：本地文件路径 **或** HTTP(S) URL。
- 流程：加载到 Buffer，检测媒体类型并构造正确 payload：
  - **图片**：缩放并重压为 JPEG（最长边 2048px），目标大小 `agents.defaults.mediaMaxMb`（默认 5 MB），上限 6 MB。
  - **音频/语音/视频**：直通，最大 16 MB；音频会作为语音消息发送（`ptt: true`）。
  - **文档**：其它类型，最大 100 MB，若可用则保留文件名。
- WhatsApp GIF 样式播放：发送 MP4 并设置 `gifPlayback: true`（CLI：`--gif-playback`），使移动端内联循环播放。
- MIME 检测优先：魔数 → 头部 → 文件扩展名。
- Caption 来自 `--message` 或 `reply.text`；可为空。
- 日志：非 verbose 显示 `↩️`/`✅`；verbose 会包含大小与来源路径/URL。

## Auto-Reply Pipeline
- `getReplyFromConfig` 返回 `{ text?, mediaUrl?, mediaUrls? }`。
- 当有媒体时，web sender 使用与 `openclaw message send` 相同的管线解析本地路径或 URL。
- 若提供多个媒体条目，会按顺序发送。

## 入站媒体到命令（Pi）
- 当入站 web 消息包含媒体时，OpenClaw 会下载到临时文件，并暴露模板变量：
  - `{{MediaUrl}}`：入站媒体的伪 URL。
  - `{{MediaPath}}`：运行命令前写入的本地临时路径。
- 当启用每会话 Docker sandbox 时，入站媒体会复制到 sandbox workspace，并将 `MediaPath`/`MediaUrl` 重写为类似 `media/inbound/<filename>` 的相对路径。
- 媒体理解（通过 `tools.media.*` 或共享 `tools.media.models` 配置）在模板化之前运行，可插入 `[Image]`、`[Audio]`、`[Video]` 块到 `Body`。
  - 音频会设置 `{{Transcript}}`，并使用转写结果进行命令解析，从而保证 slash commands 可用。
  - 视频与图片描述会保留任何 caption 文本用于命令解析。
- 默认仅处理第一条匹配的 image/audio/video 附件；设置 `tools.media.<cap>.attachments` 可处理多附件。

## 限制与错误
**出站发送限制（WhatsApp web send）**
- 图片：重压后约 6 MB 上限。
- 音频/语音/视频：16 MB 上限；文档：100 MB 上限。
- 超限或不可读媒体 → 日志给出清晰错误，并跳过该回复。

**媒体理解限制（转写/描述）**
- 图片默认：10 MB（`tools.media.image.maxBytes`）。
- 音频默认：20 MB（`tools.media.audio.maxBytes`）。
- 视频默认：50 MB（`tools.media.video.maxBytes`）。
- 超限会跳过理解，但回复仍会以原始正文发送。

## 测试备注
- 覆盖 image/audio/document 的发送 + 回复流程。
- 验证图片重压（大小上限）与音频语音消息标记。
- 确保多媒体回复按顺序发送。
