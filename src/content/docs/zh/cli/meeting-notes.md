---
summary: "CLI 参考，用于 `openclaw meeting-notes`（列出、显示和定位存储的会议笔记）"
read_when:
  - You want to read stored meeting note summaries from the terminal
  - You need the path to a meeting notes markdown summary
  - You are debugging the meeting-notes plugin storage layout
title: "会议笔记 CLI"
---

# `openclaw meeting-notes`

检查由外部 `meeting-notes` 插件编写的会议笔记。此 CLI
是只读的，当该插件已安装或从源加载时可用。采集、导入和摘要由 `meeting_notes`
代理工具和配置的自动启动源管理。

当您想要查找昨天的笔记、在编辑器中打开 Markdown 文件、将文字记录输入到另一个工具，或者调试会话在磁盘上的存储位置时，请使用 CLI。它不启动或停止采集。

产物位于 OpenClaw 状态目录下：

```text
$OPENCLAW_STATE_DIR/meeting-notes/YYYY-MM-DD/<session>/
  metadata.json
  transcript.jsonl
  summary.json
  summary.md
```

默认状态目录为 `~/.openclaw`；设置 `OPENCLAW_STATE_DIR` 以使用
不同的目录。日期目录来自会话开始时间，而
会话目录是源自会话 ID 的安全文件系统段。

## 命令

```bash
openclaw meeting-notes list
openclaw meeting-notes show <session>
openclaw meeting-notes show YYYY-MM-DD/<session>
openclaw meeting-notes path <session>
openclaw meeting-notes path YYYY-MM-DD/<session>
openclaw meeting-notes path <session> --dir
openclaw meeting-notes path <session> --metadata
openclaw meeting-notes path <session> --transcript
openclaw meeting-notes list --json
openclaw meeting-notes show <session> --json
openclaw meeting-notes path <session> --json
```

- `list`：列出存储的会话、日期限定选择器、开始时间、标题和 `summary.md` 路径。
- `show <session>`：打印存储的 `summary.md`。
- `path <session>`：打印 `summary.md` 路径。
- `path <session> --dir`：打印会话目录。
- `path <session> --metadata`：打印 `metadata.json`。
- `path <session> --transcript`：打印 `transcript.jsonl`。
- `--json`：打印机器可读的输出。

当人工会话 ID 跨天重复时，请使用
`list` 中的日期限定选择器，例如 `openclaw meeting-notes show 2026-05-22/standup`。
默认会话 ID 包含时间戳和随机后缀；仅当固定会话 ID 在一天内唯一时才进行配置。

## 输出

`list` 每行打印一个会话：

```text
2026-05-22/standup  2026-05-22T09:00:00.000Z  Weekly standup  /Users/alex/.openclaw/meeting-notes/2026-05-22/standup/summary.md
```

输出采用制表符分隔。列包括选择器、开始时间、标题和摘要路径。选择器是传回给 `show` 或 `path` 的最安全值。

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

`show --json` 返回存储的会话元数据、选择器、会话目录、摘要路径和摘要 Markdown 文本。`path --json` 返回所选路径以及该文件是否存在。

## 每天多次会议

会议笔记按日期分组，然后按会话 ID 分组。一天内的十场会议将成为十个同级文件夹：

```text
~/.openclaw/meeting-notes/2026-05-22/
  meeting-2026-05-22T09-00-00-000Z-a1b2c3d4/
  meeting-2026-05-22T10-30-00-000Z-b2c3d4e5/
  standup/
```

对于大多数自动化任务，请使用默认生成的 ID。仅当同一 ID 在同一天内不会被重复使用时，才使用固定的 ID（例如 `standup`）。

## 缺少摘要

实时会话在停止时会写入 `summary.md`。导入的转录文本在导入后会立即写入 `summary.md`。当捕获处于活动状态、提供商在停止期间失败，或在任何话语到达之前已写入元数据时，会话仍可能出现在 `list` 中而没有摘要。

使用 `path <session> --transcript` 检查仅追加的转录文本，并使用 `meeting_notes` 工具操作 `summarize` 来重新生成 Markdown 摘要。

有关配置、自动启动和源提供商的详细信息，请参阅[会议笔记](/zh/plugins/meeting-notes)。
