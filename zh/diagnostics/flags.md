---
summary: "用于定向调试日志的 Diagnostics flags"
title: "诊断标志"
read_when:
  - 需要定向日志而不提高全局日志级别
  - 需要捕获子系统日志用于支持
---

# Diagnostics Flags

Diagnostics flags 允许开启定向调试日志，而无需全局开启 verbose。Flags 需显式开启，且只有子系统检查到它们时才生效。

## 工作方式

- Flags 是字符串（不区分大小写）。
- 可在配置或通过环境变量启用。
- 支持通配符：
  - `telegram.*` 匹配 `telegram.http`
  - `*` 启用全部 flags

## 通过配置启用

```json
{
  "diagnostics": {
    "flags": ["telegram.http"]
  }
}
```

多个 flags：

```json
{
  "diagnostics": {
    "flags": ["telegram.http", "gateway.*"]
  }
}
```

修改后重启 gateway。

## 环境变量覆盖（一次性）

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload
```

禁用全部 flags：

```bash
OPENCLAW_DIAGNOSTICS=0
```

## 日志输出位置

Flags 会写入标准 diagnostics 日志文件。默认：

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

若设置了 `logging.file`，则使用该路径。日志为 JSONL（每行一个 JSON 对象）。仍会按 `logging.redactSensitive` 做脱敏。

## 提取日志

选取最新日志文件：

```bash
ls -t /tmp/openclaw/openclaw-*.log | head -n 1
```

过滤 Telegram HTTP 诊断：

```bash
rg "telegram http error" /tmp/openclaw/openclaw-*.log
```

或边复现边 tail：

```bash
tail -f /tmp/openclaw/openclaw-$(date +%F).log | rg "telegram http error"
```

远程 gateway 也可用 `openclaw logs --follow`（见 [/cli/logs](/zh/cli/logs)）。

## 注

- 若 `logging.level` 高于 `warn`，这些日志可能被抑制。默认 `info` 没问题。
- Flags 可长期开启，只影响对应子系统的日志量。
- 使用 [/logging](/zh/logging) 修改日志路径、级别与脱敏。
