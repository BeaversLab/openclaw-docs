---
summary: "针对目标调试日志的诊断标志"
read_when:
  - You need targeted debug logs without raising global logging levels
  - You need to capture subsystem-specific logs for support
title: "诊断标志"
---

# 诊断标志

诊断标志允许您启用针对特定目标的调试日志，而无需到处开启详细日志记录。标志是可选项，除非子系统检查它们，否则不会生效。

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
    "flags": ["telegram.http", "gateway.*"]
  }
}
```

更改标志后请重启网关。

## 环境变量覆盖（一次性）

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload
```

禁用所有标志：

```bash
OPENCLAW_DIAGNOSTICS=0
```

## 日志位置

标志会将日志输出到标准诊断日志文件中。默认情况下：

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

如果您设置了 `logging.file`，则改为使用该路径。日志采用 JSONL 格式（每行一个 JSON 对象）。根据 `logging.redactSensitive` 进行的编辑仍会生效。

## 提取日志

选择最新的日志文件：

```bash
ls -t /tmp/openclaw/openclaw-*.log | head -n 1
```

筛选 Telegram HTTP 诊断信息：

```bash
rg "telegram http error" /tmp/openclaw/openclaw-*.log
```

或者在重现问题时跟踪日志：

```bash
tail -f /tmp/openclaw/openclaw-$(date +%F).log | rg "telegram http error"
```

对于远程网关，您也可以使用 `openclaw logs --follow`（请参阅 [/cli/logs](/en/cli/logs)）。

## 注意事项

- 如果 `logging.level` 设置得高于 `warn`，这些日志可能会被抑制。默认的 `info` 即可。
- 保持标志启用是安全的；它们仅影响特定子系统的日志量。
- 使用 [/logging](/en/logging) 来更改日志目标、级别和编辑。

import zh from "/components/footer/zh.mdx";

<zh />
