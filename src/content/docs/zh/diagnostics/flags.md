---
summary: "用于定向调试日志的诊断标志"
read_when:
  - You need targeted debug logs without raising global logging levels
  - You need to capture subsystem-specific logs for support
title: "诊断标志"
---

诊断标志允许您启用有针对性的调试日志，而无需到处开启详细日志记录。标志是可选加入的，除非子系统检查它们，否则没有任何效果。

## 工作原理

- 标志是字符串（不区分大小写）。
- 您可以在配置中或通过环境变量覆盖来启用标志。
- 支持通配符：
  - `telegram.*` 匹配 `telegram.http`
  - `*` 启用所有标志

## 通过配置启用

```json
{
  "diagnostics": {
    "flags": ["telegram.http"]
  }
}
```

多个标志：

```json
{
  "diagnostics": {
    "flags": ["telegram.http", "brave.http", "gateway.*"]
  }
}
```

更改标志后重启网关。

## 环境变量覆盖（一次性）

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload
```

禁用所有标志：

```bash
OPENCLAW_DIAGNOSTICS=0
```

## 时间线产物

`timeline` 标志会为外部 QA 工具写入结构化的启动和运行时事件：

```bash
OPENCLAW_DIAGNOSTICS=timeline \
OPENCLAW_DIAGNOSTICS_TIMELINE_PATH=/tmp/openclaw-timeline.jsonl \
openclaw gateway run
```

您也可以在配置中启用它：

```json
{
  "diagnostics": {
    "flags": ["timeline"]
  }
}
```

时间线文件路径仍然来自
`OPENCLAW_DIAGNOSTICS_TIMELINE_PATH`。当 `timeline` 仅从配置启用时，
最早的配置加载跨度（span）不会发出，因为 OpenClaw 尚
未读取配置；随后的启动跨度使用配置标志。

`OPENCLAW_DIAGNOSTICS=1`、`OPENCLAW_DIAGNOSTICS=all` 和
`OPENCLAW_DIAGNOSTICS=*` 也会启用时间线，因为它们启用了每个
诊断标志。如果您只想要 JSONL 计时
产物，请首选 `timeline`。

时间线记录使用 `openclaw.diagnostics.v1` 包络。事件可以包括
进程 ID、阶段名称、跨度名称、持续时间、插件 ID、依赖项计数、
事件循环延迟样本、提供商操作名称、子进程退出状态
以及启动错误名称/消息。请将时间线文件视为本地诊断
产物；在机器外部共享之前请先检查它们。

## 日志去向

标志将日志输出到标准诊断日志文件中。默认情况下：

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

如果您设置了 `logging.file`，请改用该路径。日志为 JSONL 格式（每行一个 JSON 对象）。基于 `logging.redactSensitive` 的编辑仍然适用。

## 提取日志

选择最新的日志文件：

```bash
ls -t /tmp/openclaw/openclaw-*.log | head -n 1
```

过滤 Telegram HTTP 诊断信息：

```bash
rg "telegram http error" /tmp/openclaw/openclaw-*.log
```

过滤 Brave Search HTTP 诊断信息：

```bash
rg "brave http" /tmp/openclaw/openclaw-*.log
```

或在复现时使用 tail 命令跟踪：

```bash
tail -f /tmp/openclaw/openclaw-$(date +%F).log | rg "telegram http error"
```

对于远程网关，您也可以使用 `openclaw logs --follow`（请参阅 [/cli/logs](/zh/cli/logs)）。

## 注意事项

- 如果 `logging.level` 设置得高于 `warn`，这些日志可能会被抑制。默认的 `info` 即可。
- `brave.http` 记录 Brave 搜索请求 URL/查询参数、响应状态/计时以及缓存命中/未命中/写入事件。它不记录 API 密钥或响应正文，但搜索查询可能包含敏感信息。
- 可以安全地保持启用这些标志；它们仅影响特定子系统的日志量。
- 使用 [/logging](/zh/logging) 更改日志目标、级别和编辑。

## 相关

- [Gateway(网关) 诊断](/zh/gateway/diagnostics)
- [Gateway(网关) 故障排除](/zh/gateway/troubleshooting)
