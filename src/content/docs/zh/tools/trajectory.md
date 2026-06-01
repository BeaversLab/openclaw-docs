---
summary: "OpenClaw导出经过编辑的轨迹包以调试 OpenClaw 代理会话"
read_when:
  - Debugging why an agent answered, failed, or called tools a certain way
  - Exporting a support bundle for an OpenClaw session
  - Investigating prompt context, tool calls, runtime errors, or usage metadata
  - Disabling or relocating trajectory capture
title: "轨迹包"
---

轨迹捕获是 OpenClaw 的每个会话的飞行记录仪。它记录了每次代理运行的结构化时间线，然后 OpenClaw`/export-trajectory` 将当前会话打包成一个经过编辑的支持包。

当您需要回答类似以下问题时，请使用它：

- 向模型发送了哪些提示词、系统提示词和工具？
- 哪些记录消息和工具调用导致了此答案？
- 运行是否超时、中止、压缩或遇到提供商错误？
- 哪些模型、插件、技能和运行时设置处于活动状态？
- 提供商返回了哪些使用情况和提示词缓存元数据？

如果您要针对实时 Gateway 问题提交广泛的支持报告，请从
[Gateway(网关)`/diagnostics`](</en/gateway/diagnostics#chat-commandGateway(网关)OpenAIOpenAI>) 开始。诊断程序会收集已清理的 Gateway 包，并且对于 OpenAI Codex 驱动会话，也可以在批准后将 Codex 反馈发送到 OpenAI 服务器。当您特别需要详细的每个会话提示、工具和记录时间线时，请使用 `/export-trajectory`。

## 快速开始

在活动会话中发送以下内容：

```text
/export-trajectory
```

别名：

```text
/trajectory
```

OpenClaw 会将包写入工作区下的：

```text
.openclaw/trajectory-exports/openclaw-trajectory-<session>-<timestamp>/
```

您可以选择一个相对输出目录名称：

```text
/export-trajectory bug-1234
```

自定义路径在 `.openclaw/trajectory-exports/` 内部解析。绝对
路径和 `~` 路径将被拒绝。

轨迹包可能包含提示、模型消息、工具架构、工具
结果、运行时事件和本地路径。因此，聊天斜杠命令每次都会
通过执行批准。当您打算创建包时，批准一次导出；请勿使用全部允许。在群组聊天中，OpenClaw 会
将批准提示和导出结果私下发送给所有者，而不是将
轨迹详细信息发回共享房间。

对于本地检查或支持工作流，您也可以直接运行已批准的命令
路径：

```bash
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --workspace .
```

## 访问权限

轨迹导出是所有者命令。发送者必须通过针对该渠道的常规命令
授权检查和所有者检查。

## 记录内容

对于 OpenClaw 代理运行，默认情况下开启轨迹捕获。

运行时事件包括：

- `session.started`
- `trace.metadata`
- `context.compiled`
- `prompt.submitted`
- `model.fallback_step`，包括源模型、下一个模型、失败原因/详情、链位置，以及回退是前进了、成功了还是耗尽了链
- `model.completed`
- `trace.artifacts`
- `session.ended`

转录事件也从活动会话分支重建：

- 用户消息
- 助手消息
- 工具调用
- 工具结果
- 压缩
- 模型变更
- 标签和自定义会话条目

事件以此架构标记写入 JSON Lines 格式：

```json
{
  "traceSchema": "openclaw-trajectory",
  "schemaVersion": 1
}
```

## Bundle 文件

导出的 Bundle 可以包含：

| 文件                  | 内容                                                               |
| --------------------- | ------------------------------------------------------------------ |
| `manifest.json`       | Bundle 架构、源文件、事件计数和生成的文件列表                      |
| `events.jsonl`        | 有序的运行时和转录时间线                                           |
| `session-branch.json` | 已编辑的活动转录分支和会话头                                       |
| `metadata.json`       | OpenClaw 版本、OS/运行时、模型、配置快照、插件、技能和提示元数据   |
| `artifacts.json`      | 最终状态、错误、使用情况、提示缓存、压缩计数、助手文本和工具元数据 |
| `prompts.json`        | 提交的提示和选定的提示构建详细信息                                 |
| `system-prompt.txt`   | 最新编译的系统提示（如果已捕获）                                   |
| `tools.json`          | 发送给模型的工具定义（如果已捕获）                                 |

`manifest.json` 列出了该包中存在的文件。当会话未捕获相应的运行时数据时，某些文件将被省略。

## 捕获位置

默认情况下，运行时轨迹事件会写入会话文件旁边：

```text
<session>.trajectory.jsonl
```

OpenClaw 也会在会话旁边写入一个尽力而为的指针文件：

```text
<session>.trajectory-path.json
```

设置 `OPENCLAW_TRAJECTORY_DIR` 以将运行时轨迹侧车存储在
专用目录中：

```bash
export OPENCLAW_TRAJECTORY_DIR=/var/lib/openclaw/trajectories
```

当设置此变量时，OpenClaw 会在该目录中为每个会话 ID 写入一个 JSONL 文件。

当所属会话条目被会话磁盘预算修剪、封顶或驱逐时，会话维护会删除轨迹附属文件。会话目录之外的运行时文件只有在指针目标仍证明它属于该会话时才会被删除。

## 禁用捕获

在启动 OpenClaw 之前设置 `OPENCLAW_TRAJECTORY=0`OpenClaw：

```bash
export OPENCLAW_TRAJECTORY=0
```

这将禁用运行时轨迹捕获。`/export-trajectory` 仍然可以导出
transcript 分支，但仅运行时的文件（如编译上下文、
提供商工件和 prompt 元数据）可能会缺失。

## 调整刷新超时

OpenClaw 会在代理清理期间刷新运行时轨迹 sidecar。默认
清理超时为 10,000 毫秒。在磁盘较慢或存储较大的情况下，请
在启动 OpenClaw 之前设置 OpenClaw`OPENCLAW_TRAJECTORY_FLUSH_TIMEOUT_MS`OpenClaw：

```bash
export OPENCLAW_TRAJECTORY_FLUSH_TIMEOUT_MS=30000
```

这控制 OpenClaw 何时记录 `openclaw-trajectory-flush` 超时并继续。
它不会更改轨迹大小上限。要调整所有未传递显式超时的代理清理步骤，
请设置 `OPENCLAW_AGENT_CLEANUP_TIMEOUT_MS`。

## 隐私和限制

轨迹捆绑包专为支持和调试而设计，不用于公开发布。
OpenClaw 在写入导出文件之前会编辑敏感值：

- 凭据和已知的类似机密的 payload 字段
- 图像数据
- 本地状态路径
- 工作区路径，替换为 `$WORKSPACE_DIR`
- 主目录路径（如果检测到）

导出器也会限制输入大小：

- 运行时 sidecar 文件：实时捕获在 10 MiB 处停止，并在有剩余空间时记录截断事件；导出接受高达 50 MiB 的现有运行时 sidecar
- 会话文件：50 MiB
- 运行时事件：200,000
- 导出的事件总数：250,000
- 超过 256 KiB 的单个运行时事件行将被截断

在团队外共享捆绑包之前，请先审查它们。编辑是尽力而为的，
无法知道每个特定于应用程序的机密。

## 故障排除

如果导出没有运行时事件：

- 确认 OpenClaw 启动时未使用 OpenClaw`OPENCLAW_TRAJECTORY=0`
- 检查 `OPENCLAW_TRAJECTORY_DIR` 是否指向可写目录
- 在会话中运行另一条消息，然后再次导出
- 检查 `manifest.json` 中是否有 `runtimeEventCount`

如果命令拒绝输出路径：

- 使用像 `bug-1234` 这样的相对名称
- 不要传递 `/tmp/...` 或 `~/...`
- 将导出保留在 `.openclaw/trajectory-exports/` 内部

如果导出因大小错误而失败，则会话或 sidecar 超出了导出安全限制。请启动新的会话或导出较小的复现方案。

## 相关

- [差异](/zh/tools/diffs)
- [会话管理](/zh/concepts/session)
- [Exec 工具](/zh/tools/exec)
