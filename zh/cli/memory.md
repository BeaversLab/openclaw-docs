---
summary: "`openclaw memory` 的 CLI 参考（status/index/search）"
read_when:
  - 需要索引或搜索语义记忆
  - 需要排查记忆可用性或索引问题
title: "memory"
---

# `openclaw memory`

管理语义记忆的索引与搜索。
由当前启用的 memory 插件提供（默认：`memory-core`；设置 `plugins.slots.memory = "none"` 可禁用）。

相关：

- Memory 概念：[Memory](/zh/concepts/memory)
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

通用：

- `--agent <id>`：限定到单个 agent（默认：所有已配置 agent）。
- `--verbose`：在探测与索引期间输出详细日志。

备注：

- `memory status --deep` 会探测向量与 embedding 可用性。
- `memory status --deep --index` 在存储为 dirty 时执行重索引。
- `memory index --verbose` 输出各阶段细节（provider、model、sources、batch activity）。
- `memory status` 会包含通过 `memorySearch.extraPaths` 配置的额外路径。
