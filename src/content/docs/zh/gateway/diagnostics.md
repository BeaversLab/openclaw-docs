---
summary: "创建可共享的 Gateway 诊断包以用于错误报告"
title: "诊断导出"
read_when:
  - Preparing a bug report or support request
  - Debugging Gateway crashes, restarts, memory pressure, or oversized payloads
  - Reviewing what diagnostics data is recorded or redacted
---

OpenClaw 可以创建本地诊断 zip 文件，该文件可以安全地附加到错误报告中。它结合了经过清理的 Gateway 状态、健康状况、日志、配置形状以及最近的、无负载的稳定性事件。

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

## 导出包含的内容

该 zip 包含：

- `summary.md`：供支持人员使用的人类可读概述。
- `diagnostics.json`：配置、日志、状态、健康状况和稳定性数据的机器可读摘要。
- `manifest.json`：导出元数据和文件列表。
- 经过清理的配置形状和非机密配置详细信息。
- 经过清理的日志摘要和最近的编辑过的日志行。
- 尽力而为的 Gateway 状态和健康状况快照。
- `stability/latest.json`：最新的持久化稳定性包（如果可用）。

即使 Gateway 处于不健康状态，导出也很有用。如果 Gateway 无法响应状态或健康状况请求，本地日志、配置形状和最新的稳定性包在可用时仍会被收集。

## 隐私模型

诊断旨在可共享。导出保留有助于调试的运营数据，例如：

- 子系统名称、插件 ID、提供商 ID、渠道 ID 和配置的模型
- 状态代码、持续时间、字节数、队列状态和内存读数
- 经过清理的日志元数据和编辑过的运营消息
- 配置形状和非机密功能设置

导出会省略或编辑：

- 聊天文本、提示词、指令、Webhook 主体和工具输出
- 凭据、API 密钥、令牌、Cookie 和机密值
- 原始请求或响应主体
- 账户 ID、消息 ID、原始会话 ID、主机名和本地用户名

当日志消息看起来像用户、聊天、提示词或工具负载文本时，导出仅保留消息已被省略的记录和字节数。

## 稳定性记录器

默认情况下，当启用诊断时，Gateway 会记录一个有界的、无负载的稳定性流。它是用于运营事实，而非内容。

检查实时记录器：

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --json
```

在发生致命退出、关闭超时或重启启动失败后，检查最新的持久化稳定性包：

```bash
openclaw gateway stability --bundle latest
```

从最新的持久化包创建诊断 zip 文件：

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

- `--output <path>`：写入特定的 zip 路径。
- `--log-lines <count>`：包含的最大已清理日志行数。
- `--log-bytes <bytes>`：检查的最大日志字节数。
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

禁用诊断会减少错误报告的详细信息。它不会影响正常的 Gateway(网关) 日志记录。

## 相关

- [健康检查](/zh/gateway/health)
- [Gateway(网关) CLI](/zh/cli/gateway#gateway-diagnostics-export)
- [Gateway(网关) 协议](/zh/gateway/protocol#system-and-identity)
- [日志记录](/zh/logging)
- [OpenTelemetry 导出](/zh/gateway/opentelemetry) — 将诊断流式传输到收集器的单独流程
