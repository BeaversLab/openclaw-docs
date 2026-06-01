---
summary: "CLICLI 参考用于 `openclaw transcripts`（列出、显示和定位存储的记录）"
read_when:
  - You want to read stored transcript summaries from the terminal
  - You need the path to a transcripts markdown summary
  - You are debugging the core transcripts storage layout
title: "CLI记录 CLI"
---

# `openclaw transcripts`

检查由 OpenClaw 核心 OpenClaw`transcripts`CLI 工具编写的记录。此 CLI 是
只读的；捕获、导入和摘要归代理工具和
配置的自动启动源所有。

当您想查找昨天的笔记、在编辑器中打开 Markdown 文件、
将记录提供给另一个工具，或调试会话在磁盘上的存储位置时，请使用 CLI。
它不会启动或停止捕获。

构建产物位于 OpenClaw 状态目录下：

```text
$OPENCLAW_STATE_DIR/transcripts/YYYY-MM-DD/<session>/
  metadata.json
  transcript.jsonl
  summary.json
  summary.md
```

默认状态目录为 `~/.openclaw`；设置 `OPENCLAW_STATE_DIR` 以使用
不同的目录。日期目录来自会话开始时间，而
会话目录是从会话 ID 派生的安全文件系统段。

## 命令

```bash
openclaw transcripts list
openclaw transcripts show <session>
openclaw transcripts show YYYY-MM-DD/<session>
openclaw transcripts path <session>
openclaw transcripts path YYYY-MM-DD/<session>
openclaw transcripts path <session> --dir
openclaw transcripts path <session> --metadata
openclaw transcripts path <session> --transcript
openclaw transcripts list --json
openclaw transcripts show <session> --json
openclaw transcripts path <session> --json
```

- `list`：列出存储的会话、日期限定选择器、开始时间、标题和 `summary.md` 路径。
- `show <session>`：打印存储的 `summary.md`。
- `path <session>`：打印 `summary.md` 路径。
- `path <session> --dir`：打印会话目录。
- `path <session> --metadata`：打印 `metadata.json`。
- `path <session> --transcript`：打印 `transcript.jsonl`。
- `--json`：打印机器可读输出。

当一个人类可读的会话 ID 在多天重复出现时，请使用 `list` 中的
日期限定选择器，例如 `openclaw transcripts show 2026-05-22/standup`。
默认会话 ID 包含时间戳和随机后缀；仅当固定
会话 ID 在当天唯一时才对其进行配置。

## 输出

`list` 每行打印一个会话：

```text
2026-05-22/standup  2026-05-22T09:00:00.000Z  Weekly standup  /Users/alex/.openclaw/transcripts/2026-05-22/standup/summary.md
```

输出以制表符分隔。列包括选择器、开始时间、标题和
摘要路径。选择器是传回给 `show` 或 `path` 的最安全的值。

`list --json` 打印具有以下内容的对象：

- `sessionId`
- `selector`
- `date`
- `title`
- `startedAt`
- `stoppedAt`
- `source`
- `path`
- `summaryPath`
- `hasSummary`

`show --json` 返回存储的会话元数据、选择器、会话目录、
摘要路径和摘要 Markdown 文本。`path --json` 返回所选路径
以及该文件是否存在。

## 每天多次会议

Transcripts 按日期分组会话，然后按会话 ID 分组。一天内的十次会议
将成为十个同级文件夹：

```text
~/.openclaw/transcripts/2026-05-22/
  transcript-2026-05-22T09-00-00-000Z-a1b2c3d4/
  transcript-2026-05-22T10-30-00-000Z-b2c3d4e5/
  standup/
```

对于大多数自动化，请使用默认生成的 ID。仅当同一 ID 在同一天内
不会被使用两次时，才使用固定 ID（例如 `standup`）。

## 缺少摘要

实时会话在停止时写入 `summary.md`。导入的转录
在导入后立即写入 `summary.md`。当捕获处于活动状态、提供商在停止期间失败，
或在任何话语到达之前写入了元数据时，会话仍可能出现在
`list` 中而没有摘要。

使用 `path <session> --transcript` 检查仅追加转录，并使用
`transcripts` 工具操作 `summarize` 重新生成 Markdown 摘要。

## 配置

转录捕获是可选加入的，因为实时源可以加入并录制会议
音频。通过顶层 `transcripts.enabled` 启用该工具：

```json
{
  "transcripts": {
    "enabled": true,
    "maxUtterances": 2000
  }
}
```

在 `openclaw.json` 中使用 `transcripts.autoStart` 配置自动启动源。
每个条目通过其存在来启用；省略条目以禁用该源。

```json
{
  "transcripts": {
    "enabled": true,
    "autoStart": [
      {
        "providerId": "discord-voice",
        "guildId": "1234567890",
        "channelId": "2345678901"
      },
      {
        "providerId": "slack-huddle",
        "accountId": "workspace",
        "channelId": "C123"
      }
    ]
  }
}
```
