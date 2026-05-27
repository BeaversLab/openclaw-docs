---
summary: "Meeting Notes 插件：从 Discord 语音和导入的会议源捕获转录，然后编写摘要"
read_when:
  - You want OpenClaw to take meeting notes
  - You are wiring Discord voice, Google Meet, Slack huddles, or another meeting source into notes
  - You need the meeting_notes tool contract
title: "Meeting Notes 插件"
---

Meeting Notes 插件是用于实时通话和导入会议转录的通用笔记层。它负责转录存储、摘要渲染以及 `meeting_notes` 工具。通道插件负责捕获、身份验证和特定于平台的会议加入。

当您希望 OpenClaw 今天捕获 Discord 语音笔记，当您想从另一个会议系统导入转录，或者当您正在构建 Google Meet、Slack huddle、Zoom 或日历拥有的源提供商时，请使用此页面。

## 源模型

会议源通过插件 SDK 注册 `meetingNotesSourceProviders`。第一个实时提供商是 `discord-voice`；内置的 `manual-transcript` 提供商导入会议后的转录。

- `live-audio`：源加入或监听通话并流式传输最终的话语。
- `live-caption`：源从浏览器或会议界面读取字幕。
- `posthoc-transcript`：源在会议后导入转录或笔记工件。
- `recording-stt`：源在导入话语之前转录录音。

这使得 Discord、Google Meet、Slack huddles 和未来的会议界面不包含在笔记引擎中。每个源提供带标签的说话者话语；Meeting Notes 编写工件和摘要。

## 安装并启用

Meeting Notes 是此仓库中的外部源插件。它不是核心 OpenClaw npm 包的一部分，并且只有在插件作为插件安装或从包含 `extensions/meeting-notes` 的源检出加载时才可用。

加载插件后，默认情况下它是启用的，除非以下设置之一阻止了它：

- `plugins.enabled: false` 禁用所有插件。
- `plugins.deny` 包含 `meeting-notes`。
- `plugins.allow` 已设置且不包含 `meeting-notes`。
- `plugins.entries.meeting-notes.enabled: false` 禁用此插件条目。
- `plugins.entries.meeting-notes.config.enabled: false` 保持插件加载状态，
  但禁用 `meeting_notes` 工具和自动启动服务。

常规用户配置文件是 `~/.openclaw/openclaw.json`。`plugins`
部分控制插件加载，嵌套的 `entries.<pluginId>.config`
对象作为特定于插件的配置传递给该插件。期望在 `meeting-notes` 下有一个单独的
`config: { ... }` 块；这是插件在不添加核心配置键的情况下接收其自身选项的方式。

当您的配置包含插件允许列表时，使用此格式：

```json5
{
  plugins: {
    allow: ["discord", "meeting-notes"],
    entries: {
      "meeting-notes": {
        enabled: true,
        config: {
          enabled: true,
          maxUtterances: 2000,
          autoStart: [],
        },
      },
    },
  },
}
```

编辑后运行配置检查：

```bash
openclaw config validate
```

Gateway(网关) 配置热重载应用插件允许列表和插件条目更改。
如果您也在更改源插件本身、安装
新插件文件或更改 Discord 语音凭据，请重启 Gateway(网关)。

## 配置

Meeting Notes 有三个插件配置字段：

- `enabled`：默认为 `true`。设置 `false` 以保持插件安装但
  禁用工具和自动启动服务。
- `maxUtterances`：默认为 `2000`。摘要生成仅从 `transcript.jsonl` 读取
  最新的 N 个话语；有效值被限制为 `1` 到
  `10000` 之间。
- `autoStart`Gateway(网关)：默认为空。每个条目在 Gateway(网关)
  启动或重新加载插件时启动一个实时笔记源。

一个 `autoStart` 条目接受：

- `providerId`：必需。对于 Discord 语音，请使用 `discord-voice`Discord。
- `enabled`：可选，默认为 `true`。设置 `false` 以保留条目而不
  启动它。
- `sessionId`OpenClaw：可选。如果省略，OpenClaw 会生成一个带时间戳的 id。
- `title`CLI：用于摘要和 CLI 输出的可选人类可读标题。
- `accountId`：当存在多个账户时的可选源账户 ID。
- `guildId`Discord：提供商特定的 Discord 服务器 ID。
- `channelId`Discord：提供商特定的 Discord 语音频道 ID。
- `meetingUrl`：用于浏览器或日历源的提供商特定会议 URL。

当 OpenClaw 应该在网关启动时自动开始笔记捕获时，请使用 `autoStart`OpenClaw：

```json5
{
  plugins: {
    entries: {
      "meeting-notes": {
        config: {
          autoStart: [
            {
              providerId: "discord-voice",
              guildId: "123",
              channelId: "456",
              title: "Weekly planning",
            },
          ],
        },
      },
    },
  },
}
```

自动启动会重试启动失败最多 12 次，每次间隔 5 秒。这允许笔记服务等待 Discord 等渠道插件完成初始化。当插件服务正常停止时，由自动启动启动的会话将被停止并生成摘要。

Discord 语音捕获仍然需要正常的 Discord 语音设置和权限。请参阅 [Discord 语音](DiscordDiscordDiscord/en/channels/discord#voice-mode)。

## Discord 语音

Discord 是第一个实时源。Discord 插件拥有语音连接、说话人检测、音频解码和转录功能。Meeting Notes 接收最终的带说话人标签的话语并将其持久化。

对于 Discord 实时捕获：

- 首先启用并配置 Discord 插件。
- 配置 Discord 语音模式，以便 OpenClaw 可以加入目标语音频道。
- 使用 `providerId: "discord-voice"`。
- 提供 `guildId` 和 `channelId`。
- 仅当您运行多个 Discord 账户时才添加 `accountId`Discord。

转录模型不由 Meeting Notes 选择。在 Discord `stt-tts` 语音模式下，STT 使用 `tools.media.audio`；`voice.model` 控制的是代理回复模型，而非转录。在实时语音模式下，转录遵循已配置的实时提供商和模型。有关当前的 Discord 语音模型和提供商控制选项，请参阅 [Discord voice](/zh/channels/discord#voice-mode)。

## Google Meet、Slack huddles 和其他来源

Meeting Notes 故意设计为与来源无关。Google Meet、Slack huddles、Zoom、日历录制或浏览器字幕捕获应该是独立的源提供商，向插件 SDK 注册。

推荐的来源选择：

- Google Meet 实时浏览器/字幕支持：实现一个 `live-caption` 提供商，它接受 `meetingUrl` 并发出最终字幕语音。
- Google Meet 录制或下载的转录本：实现 `posthoc-transcript` 或使用 `manual-transcript`，直到存在提供商为止。
- 目前的 Slack huddles：导入会议后的 huddle 笔记或转录本产物。Slack 不公开通用的机器人加入实时 huddle 音频 API。
- 未来的 Slack huddles：保持 Slack 拥有的源提供商负责 Slack 身份验证、产物查找和转录本标准化。

笔记引擎不应包含平台加入、浏览器自动化、Slack API 轮询或 Discord 语音逻辑。这些属于所属的源插件。

## Tool

将 `meeting_notes` 与 `action` 一起使用：

- `status`：列出已注册的提供商和活动会话。
- `start`：启动实时笔记会话。
- `stop`：停止实时会话并写入 `summary.md`。
- `import`：导入转录内容并写入 `summary.md`。
- `summarize`：为现有会话重新生成摘要。

Discord 实时笔记需要 Discord`providerId: "discord-voice"`，以及 `guildId` 和
`channelId`。当仅有一个 Discord 账户处于活动状态时，`accountId`Discord 是可选的。

```json
{
  "action": "start",
  "providerId": "discord-voice",
  "guildId": "123",
  "channelId": "456",
  "title": "Weekly planning"
}
```

通过会话 ID 停止：

```json
{
  "action": "stop",
  "sessionId": "meeting-2026-05-22T10-00-00-000Z-a1b2c3d4"
}
```

导入转录内容：

```json
{
  "action": "import",
  "providerId": "manual-transcript",
  "title": "Design review",
  "transcript": "Alex: We decided to ship the Discord source first.\nSam: Action item: add Slack huddle import later."
}
```

`manual-transcript`Slack 将纯文本转录内容分割为话语。将其用于
复制的 Google Meet 笔记、Slack huddle 摘要、日历转录内容，或任何
已生成文本的来源。

## 存储布局

工件存储在 OpenClaw 状态目录下：

```text
$OPENCLAW_STATE_DIR/meeting-notes/YYYY-MM-DD/<session>/
  metadata.json
  transcript.jsonl
  summary.json
  summary.md
```

如果未设置 `OPENCLAW_STATE_DIR`，默认状态目录为
`~/.openclaw`。因此，常规本地安装会将笔记写入
`~/.openclaw/meeting-notes/...` 下。

每个文件有一项用途：

- `metadata.json`：会话 ID、来源提供商、标题、开始时间、停止时间
  以及提供商元数据。
- `transcript.jsonl`：仅追加的发言者话语。每行是一个 JSON
  对象，包含话语文本和会话 ID。
- `summary.json`：供工具使用的结构化摘要数据，包括用于
  生成摘要的带发言者标签的转录窗口。
- `summary.md`：供终端、编辑器和文档
  工作流使用的人类可读笔记，包括带发言者标签的转录部分。

日期目录来源于会话开始时间，因此每天多次会议
保持分组。如果人工会话 ID 在几天内重复，请使用来自
`openclaw meeting-notes list` 的日期限定选择器，例如
`2026-05-22/standup`。

默认情况下，OpenClaw 会生成带时间戳的会话 ID：

```text
meeting-2026-05-22T10-00-00-000Z-a1b2c3d4
```

这意味着同一天的十次会议将变成十个同级目录：

```text
~/.openclaw/meeting-notes/2026-05-22/
  meeting-2026-05-22T09-00-00-000Z-a1b2c3d4/
  meeting-2026-05-22T10-30-00-000Z-b2c3d4e5/
  meeting-2026-05-22T13-00-00-000Z-c3d4e5f6/
```

仅当该 id 在当天是唯一时，才配置 `sessionId`。对于每天一次的定期会议，类似 `standup`CLI 的人类可读 id 是可以的。如果同一 id 出现在多天中，请使用 CLI 中带有日期限定的选择器。

## CLI 访问

使用只读 CLI 查找或打印存储的摘要：

```bash
openclaw meeting-notes list
openclaw meeting-notes show <session>
openclaw meeting-notes path <session>
openclaw meeting-notes path <session> --transcript
```

完整的命令参考请参阅 [Meeting Notes CLI](/zh/cli/meeting-notes)。

## 长会议

对于长会议，话语会在到达时追加到 `transcript.jsonl` 中。
摘要生成读取由 `plugins.entries.meeting-notes.config.maxUtterances` 控制的有界窗口（默认值：`2000`），因此
多小时的通话不需要无限制的摘要内存。

这意味着转录记录可以在磁盘上不断增长，而摘要生成
保持在有界范围内。当您需要在生成的摘要和
带有发言者标签的转录记录部分中包含更多多小时的会议内容时，请增加 `maxUtterances`。
当摘要生成太慢或太大时，请减小它。

当前摘要会在会话停止、导入之后或运行
`summarize` 操作时生成。它们不会针对每条
话语持续重写。

## 故障排除

### `meeting_notes` 缺失

检查插件是否已安装或已从源代码加载，以及插件加载
未排除它：

```bash
openclaw config validate
openclaw meeting-notes list
```

如果设置了 `plugins.allow`，则必须包含 `meeting-notes`。如果 `plugins.deny`
包含 `meeting-notes`，请将其删除。

### 自动启动不加入 Discord

确认 `autoStart` 条目使用 `providerId: "discord-voice"` 并包含
`guildId` 和 `channelId`。如果您运行多个 Discord 账户，请包含
`accountId`。此外，通过 Discord 语音命令加入相同的语音渠道，
验证 Discord 语音在 Meeting Notes 之外是否正常工作。

### 摘要缺失

实时会话在停止时会写入 `summary.md`。使用 `meeting_notes` 操作 `stop` 停止会话，然后检查它：

```bash
openclaw meeting-notes list
openclaw meeting-notes path <session>
```

使用 `meeting_notes` 操作 `summarize` 为现有存储的会话重新生成 `summary.md`。

### 选择器有歧义

如果您重用了人工会话 ID（例如 `standup`），请使用 `openclaw meeting-notes list` 显示的日期限定选择器：

```bash
openclaw meeting-notes show 2026-05-22/standup
```

## 相关

- [会议笔记 CLI](/zh/cli/meeting-notes)
- [Discord 语音](/zh/channels/discord#voice-mode)
- [插件管理](/zh/tools/plugin)
- [插件架构](/zh/plugins/architecture)
