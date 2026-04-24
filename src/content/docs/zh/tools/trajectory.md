---
summary: "导出经过编辑的轨迹包，以便调试 OpenClaw 代理会话"
read_when:
  - Debugging why an agent answered, failed, or called tools a certain way
  - Exporting a support bundle for an OpenClaw session
  - Investigating prompt context, tool calls, runtime errors, or usage metadata
  - Disabling or relocating trajectory capture
title: "轨迹包"
---

# 轨迹包

轨迹捕获是 OpenClaw 的按会话飞行记录器。它会记录每次代理运行的结构化时间轴，然后 `/export-trajectory` 将当前会话打包成经过编辑的支持包。

当您需要回答以下问题时使用它：

- 向模型发送了哪些提示词、系统提示词和工具？
- 哪些转录消息和工具调用导致了这个答案？
- 运行是超时、中止、压缩还是遇到了提供商错误？
- 激活了哪些模型、插件、技能和运行时设置？
- 提供商返回了哪些使用情况和提示词缓存元数据？

## 快速开始

在活动会话中发送此内容：

```text
/export-trajectory
```

别名：

```text
/trajectory
```

OpenClaw 将包写入工作区下的位置：

```text
.openclaw/trajectory-exports/openclaw-trajectory-<session>-<timestamp>/
```

您可以选择一个相对输出目录名称：

```text
/export-trajectory bug-1234
```

自定义路径在 `.openclaw/trajectory-exports/` 内部解析。绝对路径和 `~` 路径将被拒绝。

## 访问

轨迹导出是一个所有者命令。发送者必须通过常规命令授权检查以及渠道的所有者检查。

## 记录内容

对于 OpenClaw 代理运行，默认情况下已启用轨迹捕获。

运行时事件包括：

- `session.started`
- `trace.metadata`
- `context.compiled`
- `prompt.submitted`
- `model.completed`
- `trace.artifacts`
- `session.ended`

还会从活动会话分支重建抄本事件：

- 用户消息
- 助手消息
- 工具调用
- 工具结果
- 压缩
- 模型更改
- 标签和自定义会话条目

事件以 JSON Lines 格式写入，并带有此架构标记：

```json
{
  "traceSchema": "openclaw-trajectory",
  "schemaVersion": 1
}
```

## Bundle 文件

导出的 bundle 可以包含：

| 文件                  | 内容                                                                   |
| --------------------- | ---------------------------------------------------------------------- |
| `manifest.json`       | Bundle 架构、源文件、事件计数和生成的文件列表                          |
| `events.jsonl`        | 有序的运行时和转录时间线                                               |
| `session-branch.json` | 已编辑的活跃转录分支和会话头                                           |
| `metadata.json`       | OpenClaw 版本、操作系统/运行时、模型、配置快照、插件、技能和提示元数据 |
| `artifacts.json`      | 最终状态、错误、使用情况、提示缓存、压缩计数、助手文本和工具元数据     |
| `prompts.json`        | 提交的提示和选定的提示构建详细信息                                     |
| `system-prompt.txt`   | 最新的编译系统提示（如果已捕获）                                       |
| `tools.json`          | 发送到模型的工具定义（如果已捕获）                                     |

`manifest.json` 列出了该包中存在的文件。如果会话未捕获相应的运行时数据，某些文件将被省略。

## 捕获位置

默认情况下，运行时轨迹事件会写入会话文件旁边：

```text
<session>.trajectory.jsonl
```

OpenClaw 也会在会话旁边写入一个尽力而为的指针文件：

```text
<session>.trajectory-path.json
```

设置 `OPENCLAW_TRAJECTORY_DIR` 将运行时轨迹附带文件存储在专用目录中：

```bash
export OPENCLAW_TRAJECTORY_DIR=/var/lib/openclaw/trajectories
```

设置此变量后，OpenClaw 会为该目录中的每个会话 ID 写入一个 JSONL 文件。

## 禁用捕获

在启动 OpenClaw 之前设置 `OPENCLAW_TRAJECTORY=0`：

```bash
export OPENCLAW_TRAJECTORY=0
```

这会禁用运行时轨迹捕获。`/export-trajectory` 仍然可以导出抄本分支，但仅限运行时的文件（如编译上下文、提供商工件和提示元数据）可能会缺失。

## 隐私和限制

轨迹包专为支持和调试而设计，并非用于公开发布。在写入导出文件之前，OpenClaw 会编辑敏感值：

- 凭证和已知的类密钥负载字段
- 图像数据
- 本地状态路径
- 工作区路径，已替换为 `$WORKSPACE_DIR`
- 主目录路径（如果检测到）

导出器还会限制输入大小：

- 运行时 sidecar 文件：50 MiB
- 会话文件：50 MiB
- 运行时事件：200,000
- 导出的事件总数：250,000
- 单个运行时事件行超过 256 KiB 时会被截断

在团队外分享之前，请检查这些包。编辑功能是尽力而为的，无法知道每个特定于应用程序的密钥。

## 故障排除

如果导出中没有运行时事件：

- 确认 OpenClaw 未在 `OPENCLAW_TRAJECTORY=0` 的情况下启动
- 检查 `OPENCLAW_TRAJECTORY_DIR` 是否指向可写目录
- 在会话中运行另一条消息，然后再次导出
- 检查 `manifest.json` 中的 `runtimeEventCount`

如果命令拒绝输出路径：

- 使用相对名称，例如 `bug-1234`
- 不要传递 `/tmp/...` 或 `~/...`
- 将导出保持在 `.openclaw/trajectory-exports/` 内部

如果导出因大小错误而失败，说明会话或辅助进程超出了导出安全限制。请启动新会话或导出较小的复现版本。
