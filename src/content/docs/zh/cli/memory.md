---
summary: "`openclaw memory` (status/index/search) 的 CLI 参考"
read_when:
  - You want to index or search semantic memory
  - You’re debugging memory availability or indexing
title: "memory"
---

# `openclaw memory`

管理语义内存索引和搜索。
由活动内存插件提供（默认：`memory-core`；设置 `plugins.slots.memory = "none"` 以禁用）。

相关：

- 内存概念：[Memory](/en/concepts/memory)
- 插件：[Plugins](/en/tools/plugin)

## 示例

```bash
openclaw memory status
openclaw memory status --deep
openclaw memory index --force
openclaw memory search "meeting notes"
openclaw memory search --query "deployment" --max-results 20
openclaw memory status --json
openclaw memory status --deep --index
openclaw memory status --deep --index --verbose
openclaw memory status --agent main
openclaw memory index --agent main --verbose
```

## 选项

`memory status` 和 `memory index`：

- `--agent <id>`：将范围限制为单个代理。如果不使用它，这些命令将针对每个配置的代理运行；如果没有配置代理列表，它们将回退到默认代理。
- `--verbose`：在探测和索引期间发出详细日志。

`memory status`：

- `--deep`：探测向量和嵌入的可用性。
- `--index`：如果存储处于“脏”状态，则运行重新索引（隐含 `--deep`）。
- `--json`：打印 JSON 输出。

`memory index`：

- `--force`：强制完全重新索引。

`memory search`：

- 查询输入：传递位置参数 `[query]` 或 `--query <text>`。
- 如果两者都提供，则 `--query` 优先。
- 如果两者都未提供，该命令将以错误退出。
- `--agent <id>`：将范围限制为单个代理（默认：默认代理）。
- `--max-results <n>`：限制返回的结果数量。
- `--min-score <n>`：过滤掉低分匹配项。
- `--json`：打印 JSON 结果。

注意：

- `memory index --verbose` 打印每个阶段的详细信息（提供商、模型、来源、批次活动）。
- `memory status` 包括通过 `memorySearch.extraPaths` 配置的任何额外路径。
- 如果实际活动的内存远程 API 密钥字段被配置为 SecretRefs，该命令将从活动网关快照中解析这些值。如果网关不可用，该命令将快速失败。
- Gateway(网关) 网关 版本偏差说明：此命令路径需要支持 `secrets.resolve` 的 Gateway(网关) 网关；较旧的 Gateway(网关) 网关 将返回未知方法错误。
