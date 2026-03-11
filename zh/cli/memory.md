---
summary: "`openclaw memory` CLI 参考（status/index/search）"
read_when:
  - "您需要索引或搜索语义内存"
  - "您正在调试内存可用性或索引"
title: "memory"
---

# `openclaw memory`

管理语义内存索引和搜索。
由活动的内存插件提供（默认：`memory-core`；设置 `plugins.slots.memory = "none"` 以禁用）。

相关内容：

- 内存概念：[Memory](/zh/concepts/memory)
- 插件：[Plugins](/zh/plugins)

## 示例

```bash
openclaw memory status
openclaw memory status --deep
openclaw memory status --deep --index
openclaw memory status --deep --index --verbose
openclaw memory index
openclaw memory index --verbose
openclaw memory search "release checklist"
openclaw memory status --agent main
openclaw memory index --agent main --verbose
```

## 选项

通用选项：

- `--agent <id>`：限制到单个代理（默认：所有已配置的代理）。
- `--verbose`：在探测和索引期间输出详细日志。

说明：

- `memory status --deep` 探测向量和嵌入的可用性。
- `memory status --deep --index` 如果存储脏了，则运行重新索引。
- `memory index --verbose` 打印各阶段详情（提供商、模型、源、批处理活动）。
- `memory status` 包括通过 `memorySearch.extraPaths` 配置的任何额外路径。
