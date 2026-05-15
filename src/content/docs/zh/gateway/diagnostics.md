---
summary: "创建可共享的 Gateway 诊断包以用于错误报告"
title: "诊断导出"
read_when:
  - Preparing a bug report or support request
  - Debugging Gateway crashes, restarts, memory pressure, or oversized payloads
  - Reviewing what diagnostics data is recorded or redacted
---

OpenClaw 可以创建本地诊断 zip 压缩包用于错误报告。它组合了经过清理的 Gateway(网关) 状态、健康状况、日志、配置形状以及最近的不包含有效负载的稳定性事件。

在您检查诊断包之前，请将其视为机密。它们的设计旨在省略或编辑有效负载和凭据，但它们仍然汇总了本地 Gateway(网关) 日志和主机级别的运行时状态。

## 快速开始

```bash
openclaw gateway diagnostics export
```

该命令会打印写入的 zip 路径。要选择路径：

```bash
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
```

用于自动化：

```bash
openclaw gateway diagnostics export --json
```

## 聊天命令

所有者可以在聊天中使用 `/diagnostics [note]` 来请求本地 Gateway(网关) 导出。当错误发生在真实对话中，并且您希望获得一份可复制粘贴的供支持使用的报告时，请使用此功能：

1. 在您发现问题的对话中发送 `/diagnostics`。如果有帮助，可以添加简短说明，例如 `/diagnostics bad tool choice`。
2. OpenClaw 发送诊断前言并请求一次明确的执行批准。该批准运行 `openclaw gateway diagnostics export --json`。不要通过允许所有规则来批准诊断。
3. 批准后，OpenClaw 会回复一份可粘贴的报告，其中包含本地包路径、清单摘要、隐私说明以及相关的会话 ID。

在群聊中，所有者仍然可以运行 `/diagnostics`，但 OpenClaw 不会将诊断详细信息发布回共享聊天中。它通过私人批准路线向所有者发送前言、批准提示、Gateway(网关) 导出结果以及 Codex 会话/线程细分。群聊只会收到一条简短的通知，说明诊断流程已私下发送。如果 OpenClaw 找不到私人所有者路线，该命令将失败关闭并要求所有者从私聊中运行它。

当活动 OpenClaw 会话正在使用原生 OpenAI Codex 驱动时，同一执行批准也涵盖针对 OpenAI 所知的 Codex 运行时线程进行的 OpenClaw 反馈上传。该上传与本地的 Gateway(网关) zip 压缩包是分开的，并且仅出现在 Codex 驱动会话中。在批准之前，提示会说明批准诊断也将发送 Codex 反馈，但它不会列出 Codex 会话或线程 ID。批准后，聊天回复将列出已发送到 OpenClaw 服务器的线程的渠道、OpenAI 会话 ID、Codex 线程 ID 以及本地恢复命令。如果您拒绝或忽略该批准，OpenClaw 将不会运行导出，不会发送 Codex 反馈，也不会打印 Codex ID。

这使得常见的 Codex 调试循环变得简短：在 Telegram、Discord 或其他渠道中注意到异常行为，运行 `/diagnostics`，批准一次，将报告分享给支持人员，然后如果您想亲自检查原生 Codex 线程，请在本地运行打印出的 `codex resume <thread-id>` 命令。有关该检查工作流，请参阅 [Codex 驱动](/zh/plugins/codex-harness#inspect-codex-threads-locally)。

## 导出包含的内容

该 zip 包包括：

- `summary.md`：供支持人员使用的人类可读概述。
- `diagnostics.json`：配置、日志、状态、健康
  和稳定性数据的机器可读摘要。
- `manifest.json`：导出元数据和文件列表。
- 经过清理的配置结构和非机密配置详细信息。
- 经过清理的日志摘要和最近的编辑日志行。
- 尽力而为的 Gateway(网关) 状态和健康快照。
- `stability/latest.json`：最新的持久化稳定性包（如果有）。

即使 Gateway(网关) 状态不佳，该导出仍然有用。如果 Gateway(网关) 无法回答状态或健康请求，在可用的情况下仍会收集本地日志、配置结构和最新的稳定性包。

## 隐私模型

诊断数据的设计旨在使其可共享。导出保留了有助于调试的运营数据，例如：

- 子系统名称、插件 ID、提供商 ID、渠道 ID 和配置模式
- 状态代码、持续时间、字节计数、队列状态和内存读数
- 经过清理的日志元数据和已编辑的操作消息
- 配置形状和非机密功能设置

导出会省略或编辑：

- 聊天文本、提示词、指令、Webhook 主体和工具输出
- 凭据、API 密钥、令牌、Cookie 和机密值
- 原始请求或响应主体
- 账户 ID、消息 ID、原始会话 ID、主机名和本地用户名

当日志消息看起来像用户、聊天、提示词或工具负载文本时，
导出仅保留消息被省略的信息和字节计数。

## 稳定性记录器

当启用诊断功能时，Gateway(网关) 默认会记录一个有界的、无负载的稳定性流。这是用于操作事实，而非内容。

当 Gateway(网关) 继续运行但 Node.js 事件循环或 CPU 看起来饱和时，同样的诊断心跳会记录活动性样本。这些
`diagnostic.liveness.warning` 事件包括事件循环延迟、事件循环
利用率、CPU 核心比率、活动/等待/排队中的会话计数、当前
启动/运行阶段（如果已知）、最近的阶段跨度，以及有界的活动/排队
工作标签。空闲样本在 `info` 级别保留在遥测中。仅当工作正在等待或排队，或者活动工作
与持续的事件循环延迟重叠时，活动性样本才会变成 Gateway(网关) 警告。在
其他健康的后台工作期间，瞬态的最大延迟尖峰会保留在调试日志中。它们不会自行
重启 Gateway(网关)。

启动阶段还会发出带有挂钟和
CPU 计时的 `diagnostic.phase.completed` 事件。停滞的嵌入式运行诊断会标记 `terminalProgressStale=true`
当最后的桥接进度看起来是终止性的，例如原始响应项或
响应完成事件，但 Gateway(网关) 仍认为嵌入式运行
处于活动状态时。

检查实时记录器：

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --json
```

在致命退出、关闭
超时或重启启动失败后，检查最新持久化的稳定性包：

```bash
openclaw gateway stability --bundle latest
```

从最新持久化的包创建诊断 zip 文件：

```bash
openclaw gateway stability --bundle latest --export
```

当事件存在时，持久化包位于 `~/.openclaw/logs/stability/` 下。

## 有用选项

```bash
openclaw gateway diagnostics export \
  --output openclaw-diagnostics.zip \
  --log-lines 5000 \
  --log-bytes 1000000
```

- `--output <path>`：写入指定的 zip 路径。
- `--log-lines <count>`：要包含的最大清理日志行数。
- `--log-bytes <bytes>`：要检查的最大日志字节数。
- `--url <url>`：用于状态和健康快照的 Gateway(网关) WebSocket URL。
- `--token <token>`：用于状态和健康快照的 Gateway(网关) 令牌。
- `--password <password>`：用于状态和健康快照的 Gateway(网关) 密码。
- `--timeout <ms>`：状态和健康快照超时。
- `--no-stability-bundle`：跳过持久化稳定性包查找。
- `--json`：打印机器可读的导出元数据。

## 禁用诊断

默认情况下启用诊断。要禁用稳定性记录器和诊断事件收集：

```json5
{
  diagnostics: {
    enabled: false,
  },
}
```

禁用诊断会减少错误报告的详细信息。它不影响正常的 Gateway(网关) 日志记录。

## 相关

- [健康检查](/zh/gateway/health)
- [Gateway(网关) CLI](/zh/cli/gateway#gateway-diagnostics-export)
- [Gateway(网关) 协议](/zh/gateway/protocol#system-and-identity)
- [日志记录](/zh/logging)
- [OpenTelemetry 导出](/zh/gateway/opentelemetry) — 将诊断流式传输到收集器的单独流程
