---
summary: "`openclaw logs` 的 CLI 参考（通过 RPC 追踪 gateway 日志）"
read_when:
  - 需要远程追踪 Gateway 日志（无需 SSH）
  - 希望输出 JSON 日志行以供工具处理
title: "logs"
---

# `openclaw logs`

通过 RPC 追踪 Gateway 文件日志（支持远程模式）。

相关：

- 日志概览：[Logging](/zh/logging)

## 示例

```bash
openclaw logs
openclaw logs --follow
openclaw logs --json
openclaw logs --limit 500
```
